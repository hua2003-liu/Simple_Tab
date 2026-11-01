import { afterEach, describe, expect, it } from "vitest";
import { createPackageWallpaperSource } from "../js/lib/chrome-wallpapers.js";

function createFakeChrome(fileNames, { withApi = true } = {}) {
  return {
    runtime: {
      getPackageDirectoryEntry: withApi
        ? (callback) => {
          setTimeout(() => callback({
            getDirectory(name, _opts, ok) {
              setTimeout(() => ok({
                createReader() {
                  let drained = false;
                  return {
                    readEntries(onEntries) {
                      if (drained) {
                        onEntries([]);
                        return;
                      }
                      drained = true;
                      onEntries(fileNames.map((fileName) => ({ isFile: true, name: fileName })));
                    }
                  };
                }
              }), 0);
            }
          }), 0);
        }
        : undefined
    }
  };
}

describe("package wallpaper source", () => {
  const originalChrome = globalThis.chrome;

  afterEach(() => {
    Object.defineProperty(globalThis, "chrome", {
      value: originalChrome,
      configurable: true,
      writable: true
    });
  });

  const setChrome = (fake) => {
    Object.defineProperty(globalThis, "chrome", {
      value: fake,
      configurable: true,
      writable: true
    });
  };

  it("lists files from the package directory", async () => {
    setChrome(createFakeChrome(["b.png", "a.jpg"]).runtime ? createFakeChrome(["b.png", "a.jpg"]) : {});

    const names = await createPackageWallpaperSource("wallpapers").list();

    expect(names).toEqual(["a.jpg", "b.png"]);
  });

  it("resolves an empty list instead of hanging when the API is missing", async () => {
    setChrome(createFakeChrome(["a.png"], { withApi: false }));

    const names = await createPackageWallpaperSource("wallpapers").list();

    expect(names).toEqual([]);
  });
});
