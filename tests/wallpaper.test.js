import { describe, expect, it, vi } from "vitest";
import {
  initWallpaper,
  pickRandomWallpaper,
  sequentialPick
} from "../js/features/wallpaper.js";
import { STORAGE_KEYS } from "../js/config/constants.js";

function createFakeStorage(initialData = {}) {
  let data = { ...initialData };

  return {
    storageGet: vi.fn(async (keys) => Object.fromEntries(keys.map((key) => [key, data[key]]))),
    storageSet: vi.fn(async (items) => {
      data = { ...data, ...items };
    })
  };
}

const fakeSource = (names) => ({ list: vi.fn(async () => names) });

function pinButton() {
  const btn = document.createElement("button");
  document.body.appendChild(btn);
  return btn;
}

async function init(options) {
  return initWallpaper({ pinButton: pinButton(), ...options });
}

const appliedWallpaper = () => {
  const layers = Array.from(document.querySelectorAll(".wallpaper-stage .wallpaper-layer"));
  const active = layers.find((layer) => layer.style.opacity === "1") || layers[layers.length - 1];
  return active?.style.backgroundImage || "";
};

const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("wallpaper selection logic", () => {
  it("picks a member of the list at random", () => {
    const list = ["wallpapers/a.png", "wallpapers/b.png"];
    const picks = Array.from({ length: 20 }, () => pickRandomWallpaper(list));

    expect(picks.every((pick) => list.includes(pick))).toBe(true);
  });

  it("returns null when the list is empty", () => {
    expect(pickRandomWallpaper([])).toBeNull();
  });

  it("picks sequentially by index and wraps around", () => {
    const list = ["wallpapers/a.png", "wallpapers/b.png", "wallpapers/c.png"];

    expect(sequentialPick(list, 0)).toBe("wallpapers/a.png");
    expect(sequentialPick(list, 2)).toBe("wallpapers/c.png");
    expect(sequentialPick(list, 3)).toBe("wallpapers/a.png");
    expect(sequentialPick([], 5)).toBeNull();
  });
});

describe("initWallpaper (directory source)", () => {
  it("applies a wallpaper from the directory in random mode", async () => {
    await init({ storageApi: createFakeStorage(), wallpaperSource: fakeSource(["a.png", "b.png"]) });

    const applied = appliedWallpaper();
    expect(applied).toMatch(/^url\("wallpapers\//);
    expect(applied === 'url("wallpapers/a.png")' || applied === 'url("wallpapers/b.png")').toBe(true);
  });

  it("advances sequentially and persists the next index", async () => {
    const storageApi = createFakeStorage({ [STORAGE_KEYS.wallpaperMode]: "sequential", [STORAGE_KEYS.wallpaperIndex]: 2 });

    await init({ storageApi, wallpaperSource: fakeSource(["a.png", "b.png", "c.png"]) });

    expect(appliedWallpaper()).toBe('url("wallpapers/c.png")');
    expect(storageApi.storageSet).toHaveBeenCalledWith({ [STORAGE_KEYS.wallpaperIndex]: 0 });
  });

  it("honours a pinned wallpaper over the mode", async () => {
    const storageApi = createFakeStorage({
      [STORAGE_KEYS.wallpaper]: "wallpapers/b.png",
      [STORAGE_KEYS.wallpaperMode]: "sequential"
    });

    await init({ storageApi, wallpaperSource: fakeSource(["a.png", "b.png"]) });

    expect(appliedWallpaper()).toBe('url("wallpapers/b.png")');
    // Pin 时不推进顺序索引（列表缓存写入除外）
    expect(storageApi.storageSet).not.toHaveBeenCalledWith(
      expect.objectContaining({ [STORAGE_KEYS.wallpaperIndex]: expect.anything() })
    );
  });

  it("falls back to the bundled cover when the directory is empty", async () => {
    await init({ storageApi: createFakeStorage(), wallpaperSource: fakeSource([]) });

    expect(appliedWallpaper()).toBe('url("wallpapers/cover.png")');
  });

  it("applies instantly from the cached list and refreshes the cache in the background", async () => {
    const storageApi = createFakeStorage({ [STORAGE_KEYS.wallpaperListCache]: ["old.png"] });
    const source = fakeSource(["old.png"]);

    await init({ storageApi, wallpaperSource: source });

    expect(appliedWallpaper()).toBe('url("wallpapers/old.png")');
    expect(source.list).toHaveBeenCalled();
    expect(storageApi.storageSet).not.toHaveBeenCalledWith({ [STORAGE_KEYS.wallpaperListCache]: ["old.png"] });
  });

  it("re-applies when the live directory listing differs from the cache", async () => {
    const storageApi = createFakeStorage({ [STORAGE_KEYS.wallpaperListCache]: ["old.png"] });

    await init({ storageApi, wallpaperSource: fakeSource(["old.png", "new.png"]) });

    expect(storageApi.storageSet).toHaveBeenCalledWith({ [STORAGE_KEYS.wallpaperListCache]: ["old.png", "new.png"] });
    const applied = appliedWallpaper();
    expect(applied === 'url("wallpapers/old.png")' || applied === 'url("wallpapers/new.png")').toBe(true);
  });

  it("toggles pin state through storage", async () => {
    const storageApi = createFakeStorage();
    const button = pinButton();

    await initWallpaper({ storageApi, pinButton: button, wallpaperSource: fakeSource(["a.png"]) });
    button.click();
    await flushAsync();
    expect(button.getAttribute("aria-pressed")).toBe("true");

    button.click();
    await flushAsync();
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });
});
