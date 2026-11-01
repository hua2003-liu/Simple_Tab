import { STORAGE_KEYS, SEARCH_ENGINES } from "../config/constants.js";

const storage = chrome.storage.local;

// 书签镜像化（ADR-0001）后遗留的旧键，启动时顺手清掉
const LEGACY_BOOKMARK_KEYS = ["bookmarks", "bookmarks_version"];

function storageRemove(keys) {
  return new Promise((resolve) => {
    storage.remove(keys, () => resolve());
  });
}

export function storageGet(keys) {
  return new Promise((resolve, reject) => {
    storage.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve(result);
    });
  });
}

export function storageSet(items) {
  return new Promise((resolve, reject) => {
    storage.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve();
    });
  });
}

export async function ensureInitialData() {
  void storageRemove(LEGACY_BOOKMARK_KEYS);

  const storedData = await storageGet([
    STORAGE_KEYS.displayName,
    STORAGE_KEYS.searchEngine,
    STORAGE_KEYS.searchHistory
  ]);
  const updates = {};

  if (!Array.isArray(storedData[STORAGE_KEYS.searchHistory])) {
    updates[STORAGE_KEYS.searchHistory] = [];
  }

  if (!SEARCH_ENGINES[storedData[STORAGE_KEYS.searchEngine]]) {
    updates[STORAGE_KEYS.searchEngine] = "bing";
  }

  if (Object.keys(updates).length > 0) {
    await storageSet(updates);
  }
}
