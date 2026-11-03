export function createStorageApi(storage, runtime) {
  return {
    storageGet(keys) {
      return new Promise((resolve, reject) => {
        storage.get(keys, (result) => {
          if (runtime.lastError) {
            reject(runtime.lastError);
            return;
          }

          resolve(result);
        });
      });
    },
    storageSet(items) {
      return new Promise((resolve, reject) => {
        storage.set(items, () => {
          if (runtime.lastError) {
            reject(runtime.lastError);
            return;
          }

          resolve();
        });
      });
    },
    storageRemove(keys) {
      return new Promise((resolve, reject) => {
        storage.remove(keys, () => {
          if (runtime.lastError) {
            reject(runtime.lastError);
            return;
          }

          resolve();
        });
      });
    }
  };
}
