import { STORAGE_KEYS } from "../config/constants.js";

export async function ensureInitialData({ storageApi }) {
  const storedData = await storageApi.storageGet([
    STORAGE_KEYS.searchHistory
  ]);
  const updates = {};

  if (!Array.isArray(storedData[STORAGE_KEYS.searchHistory])) {
    updates[STORAGE_KEYS.searchHistory] = [];
  }

  if (Object.keys(updates).length > 0) {
    await storageApi.storageSet(updates);
  }
}
