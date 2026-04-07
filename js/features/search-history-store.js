import { STORAGE_KEYS } from "../config/constants.js";

export function createSearchHistoryStore({ storageApi, maxHistoryItems }) {
  const { storageGet, storageSet } = storageApi;

  return {
    async list() {
      const storedData = await storageGet([STORAGE_KEYS.searchHistory]);
      return Array.isArray(storedData[STORAGE_KEYS.searchHistory])
        ? storedData[STORAGE_KEYS.searchHistory]
        : [];
    },

    async save(keyword) {
      const normalizedKeyword = keyword.trim();

      if (!normalizedKeyword) {
        return "";
      }

      const history = await this.list();
      const nextHistory = history
        .filter((item) => item !== normalizedKeyword)
        .slice(0, maxHistoryItems - 1);

      nextHistory.unshift(normalizedKeyword);
      await storageSet({ [STORAGE_KEYS.searchHistory]: nextHistory });
      return normalizedKeyword;
    },

    async remove(keyword) {
      const history = await this.list();
      const nextHistory = history.filter((item) => item !== keyword);
      await storageSet({ [STORAGE_KEYS.searchHistory]: nextHistory });
      return nextHistory;
    }
  };
}
