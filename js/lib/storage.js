import { defaultBookmarks, SEARCH_ENGINES, STORAGE_KEYS } from "../config/constants.js";

const storage = chrome.storage.local;

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
  const storedData = await storageGet([
    STORAGE_KEYS.bookmarks,
    STORAGE_KEYS.displayName,
    STORAGE_KEYS.searchEngine,
    STORAGE_KEYS.searchHistory
  ]);
  const updates = {};

  if (!Array.isArray(storedData[STORAGE_KEYS.bookmarks])) {
    updates[STORAGE_KEYS.bookmarks] = defaultBookmarks;
  }

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
