import { describe, expect, it, vi } from "vitest";
import { createStorageApi } from "../js/lib/storage.js";

describe("Chrome storage adapter", () => {
  it("wraps successful callback operations in promises", async () => {
    const data = { search_history: [] };
    const chromeStorage = {
      get: vi.fn((_keys, callback) => callback(data)),
      set: vi.fn((_items, callback) => callback()),
      remove: vi.fn((_keys, callback) => callback())
    };
    const runtime = { lastError: null };
    const storageApi = createStorageApi(chromeStorage, runtime);

    await expect(storageApi.storageGet(["search_history"])).resolves.toEqual(data);
    await expect(storageApi.storageSet({ search_history: [] })).resolves.toBeUndefined();
    await expect(storageApi.storageRemove(["bookmarks"])).resolves.toBeUndefined();
    expect(chromeStorage.remove).toHaveBeenCalledWith(["bookmarks"], expect.any(Function));
  });

  it.each(["get", "set", "remove"])("rejects %s when runtime.lastError is set", async (method) => {
    const runtime = { lastError: null };
    const chromeStorage = Object.fromEntries(["get", "set", "remove"].map((name) => [
      name,
      vi.fn((_value, callback) => {
        runtime.lastError = new Error(`${name} failed`);
        callback(name === "get" ? {} : undefined);
        runtime.lastError = null;
      })
    ]));
    const storageApi = createStorageApi(chromeStorage, runtime);
    const operation = {
      get: () => storageApi.storageGet(["search_history"]),
      set: () => storageApi.storageSet({ search_history: [] }),
      remove: () => storageApi.storageRemove(["bookmarks"])
    }[method];

    await expect(operation()).rejects.toThrow(`${method} failed`);
  });
});
