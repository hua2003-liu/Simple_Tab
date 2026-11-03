import { SEARCH_ENGINES, STORAGE_KEYS } from "../config/constants.js";

export function createSearchPreference({ storageApi }) {
  let currentEngine;
  let loadPromise;
  let saveQueue = Promise.resolve();

  const loadCurrent = () => {
    if (!loadPromise) {
      loadPromise = storageApi.storageGet([STORAGE_KEYS.searchEngine]).then(async (storedData) => {
        const storedEngine = storedData[STORAGE_KEYS.searchEngine];
        const engine = SEARCH_ENGINES[storedEngine] ? storedEngine : "bing";

        if (engine !== storedEngine) {
          await storageApi.storageSet({ [STORAGE_KEYS.searchEngine]: engine });
        }

        currentEngine = engine;
        return engine;
      }).catch((error) => {
        loadPromise = undefined;
        throw error;
      });
    }

    return loadPromise;
  };

  return {
    getCurrent() {
      return currentEngine ? Promise.resolve(currentEngine) : loadCurrent();
    },

    setCurrent(engine) {
      if (!SEARCH_ENGINES[engine]) {
        return Promise.reject(new Error(`Invalid search engine: ${engine}`));
      }

      const save = saveQueue.then(async () => {
        await loadCurrent();
        await storageApi.storageSet({ [STORAGE_KEYS.searchEngine]: engine });
        currentEngine = engine;
        return engine;
      });
      saveQueue = save.catch(() => {});
      return save;
    }
  };
}
