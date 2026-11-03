import { describe, expect, it, vi } from "vitest";
import { createSearchPreference } from "../js/lib/search-preference.js";

function createFakeStorageApi(initialData = {}) {
  const stored = { ...initialData };
  return {
    stored,
    storageGet: vi.fn(async (keys) => Object.fromEntries(keys.filter((key) => key in stored).map((key) => [key, stored[key]]))),
    storageSet: vi.fn(async (items) => Object.assign(stored, items))
  };
}

describe("search preference", () => {
  it.each([
    ["google", "google"],
    [undefined, "bing"],
    ["invalid", "bing"]
  ])("loads %s as %s", async (storedEngine, expectedEngine) => {
    const storageApi = createFakeStorageApi(storedEngine === undefined ? {} : { search_engine: storedEngine });
    const preference = createSearchPreference({ storageApi });

    await expect(preference.getCurrent()).resolves.toBe(expectedEngine);
  });

  it("reads once and persists the Bing fallback for missing or invalid values", async () => {
    const storageApi = createFakeStorageApi({ search_engine: "invalid" });
    const preference = createSearchPreference({ storageApi });

    await expect(preference.getCurrent()).resolves.toBe("bing");
    await expect(preference.getCurrent()).resolves.toBe("bing");

    expect(storageApi.storageGet).toHaveBeenCalledTimes(1);
    expect(storageApi.storageSet).toHaveBeenCalledWith({ search_engine: "bing" });
  });

  it("persists Bing when the stored engine is missing", async () => {
    const storageApi = createFakeStorageApi();
    const preference = createSearchPreference({ storageApi });

    await expect(preference.getCurrent()).resolves.toBe("bing");

    expect(storageApi.storageSet).toHaveBeenCalledWith({ search_engine: "bing" });
  });

  it("uses a successfully saved engine for later reads", async () => {
    const storageApi = createFakeStorageApi({ search_engine: "bing" });
    const preference = createSearchPreference({ storageApi });

    await preference.getCurrent();
    await preference.setCurrent("google");

    await expect(preference.getCurrent()).resolves.toBe("google");
    expect(storageApi.storageGet).toHaveBeenCalledTimes(1);
  });

  it("rejects an unsupported engine without writing it", async () => {
    const storageApi = createFakeStorageApi({ search_engine: "bing" });
    const preference = createSearchPreference({ storageApi });

    await expect(preference.setCurrent("not-an-engine")).rejects.toThrow("Invalid search engine");
    expect(storageApi.storageSet).not.toHaveBeenCalled();
  });

  it("rejects when storage reads fail", async () => {
    const storageApi = createFakeStorageApi();
    storageApi.storageGet.mockRejectedValue(new Error("read failed"));
    const preference = createSearchPreference({ storageApi });

    await expect(preference.getCurrent()).rejects.toThrow("read failed");
  });

  it("rejects failed saves without changing the cached engine", async () => {
    const storageApi = createFakeStorageApi({ search_engine: "bing" });
    storageApi.storageSet.mockRejectedValue(new Error("write failed"));
    const preference = createSearchPreference({ storageApi });

    await preference.getCurrent();
    await expect(preference.setCurrent("google")).rejects.toThrow("write failed");
    await expect(preference.getCurrent()).resolves.toBe("bing");
  });
});
