import { afterEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "../js/config/constants.js";
import { ensureInitialData } from "../js/lib/initial-data.js";

function createFakeStorageApi(initialData = {}) {
  const stored = { ...initialData };
  return {
    stored,
    storageGet: vi.fn(async (keys) => Object.fromEntries(keys.filter((key) => key in stored).map((key) => [key, stored[key]]))),
    storageSet: vi.fn(async (items) => Object.assign(stored, items)),
    storageRemove: vi.fn(async (keys) => keys.forEach((key) => delete stored[key]))
  };
}

describe("initial data", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes a default search history without changing the search engine", async () => {
    const storageApi = createFakeStorageApi({ search_history: "invalid", search_engine: "unknown" });

    await ensureInitialData({ storageApi });

    expect(storageApi.stored[STORAGE_KEYS.searchHistory]).toEqual([]);
    expect(storageApi.stored[STORAGE_KEYS.searchEngine]).toBe("unknown");
  });

  it("writes a default history when search settings are missing", async () => {
    const storageApi = createFakeStorageApi();

    await ensureInitialData({ storageApi });

    expect(storageApi.stored[STORAGE_KEYS.searchHistory]).toEqual([]);
    expect(storageApi.stored[STORAGE_KEYS.searchEngine]).toBeUndefined();
  });

});
