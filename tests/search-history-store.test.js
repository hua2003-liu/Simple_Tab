import { describe, expect, it, vi } from "vitest";
import { createSearchHistoryStore } from "../js/features/search-history-store.js";

const HISTORY_KEY = "search_history";

function createFakeStorageApi(initialData = {}) {
  let data = { ...initialData };

  return {
    storageGet: vi.fn(async (keys) => Object.fromEntries(keys.map((key) => [key, data[key]]))),
    storageSet: vi.fn(async (items) => {
      data = { ...data, ...items };
    })
  };
}

function createStore(initialData, maxHistoryItems = 3) {
  return createSearchHistoryStore({
    storageApi: createFakeStorageApi(initialData),
    maxHistoryItems
  });
}

describe("search history store", () => {
  it("returns the stored history as a list", async () => {
    const store = createStore({ [HISTORY_KEY]: ["a", "b"] });

    await expect(store.list()).resolves.toEqual(["a", "b"]);
  });

  it("returns an empty list when nothing is stored", async () => {
    const store = createStore();

    await expect(store.list()).resolves.toEqual([]);
  });

  it("trims the keyword and saves it to the front", async () => {
    const store = createStore();

    await expect(store.save("  vue  ")).resolves.toBe("vue");
    await expect(store.list()).resolves.toEqual(["vue"]);
  });

  it("rejects blank keywords without writing", async () => {
    const store = createStore({ [HISTORY_KEY]: ["a"] });

    await expect(store.save("   ")).resolves.toBe("");
    await expect(store.list()).resolves.toEqual(["a"]);
  });

  it("moves a duplicate keyword to the front instead of duplicating it", async () => {
    const store = createStore({ [HISTORY_KEY]: ["a", "b", "c"] });

    await store.save("b");

    await expect(store.list()).resolves.toEqual(["b", "a", "c"]);
  });

  it("caps the history at the configured maximum, dropping the oldest", async () => {
    const store = createStore({ [HISTORY_KEY]: ["a", "b", "c"] });

    await store.save("d");

    await expect(store.list()).resolves.toEqual(["d", "a", "b"]);
  });

  it("removes a keyword and returns the remaining list", async () => {
    const store = createStore({ [HISTORY_KEY]: ["a", "b", "c"] });

    await expect(store.remove("b")).resolves.toEqual(["a", "c"]);
    await expect(store.list()).resolves.toEqual(["a", "c"]);
  });

  it("removing a missing keyword leaves the list unchanged", async () => {
    const store = createStore({ [HISTORY_KEY]: ["a"] });

    await expect(store.remove("x")).resolves.toEqual(["a"]);
  });
});
