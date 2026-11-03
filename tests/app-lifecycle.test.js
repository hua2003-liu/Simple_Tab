import { describe, expect, it, vi } from "vitest";
import { runAppLifecycle } from "../js/app-lifecycle.js";

function createHarness({ elapsed = 200 } = {}) {
  const events = [];
  let now = 0;
  const elements = {
    body: { classList: { remove: vi.fn(() => events.push("body-ready")) } },
    bookmarkContainer: {
      classList: {
        remove: vi.fn(() => events.push("bookmarks-unloading")),
        add: vi.fn(() => events.push("bookmarks-ready"))
      },
      querySelectorAll: vi.fn(() => [])
    }
  };
  const tasks = {
    startWallpaper: vi.fn(() => { events.push("wallpaper"); return Promise.resolve(); }),
    startBookmarks: vi.fn(() => { events.push("bookmarks"); return Promise.resolve(); }),
    removeLegacyData: vi.fn(() => { events.push("cleanup"); return Promise.resolve(); }),
    ensureInitialData: vi.fn(async () => { events.push("initial-data"); }),
    applyTheme: vi.fn(() => { events.push("theme"); }),
    startProfile: vi.fn(async () => { events.push("profile"); }),
    startSearch: vi.fn(async () => { events.push("search"); }),
    startSettings: vi.fn(async () => { events.push("settings"); }),
    animate: vi.fn(() => events.push("animate"))
  };
  return {
    events,
    elements,
    tasks,
    recordError: vi.fn((...args) => events.push(["error", ...args])),
    clock: {
      now: () => now,
      wait: vi.fn(async (ms) => { events.push(["wait", ms]); now += elapsed; })
    }
  };
}

describe("app lifecycle", () => {
  it("starts wallpaper and bookmarks together while legacy cleanup runs without blocking", async () => {
    const harness = createHarness();
    let resolveCleanup;
    harness.tasks.removeLegacyData.mockImplementation(() => {
      harness.events.push("cleanup");
      return new Promise((resolve) => { resolveCleanup = resolve; });
    });

    const running = runAppLifecycle(harness);
    await Promise.resolve();
    expect(harness.events.slice(0, 3)).toEqual(["wallpaper", "bookmarks", "cleanup"]);
    await running;
    expect(harness.tasks.ensureInitialData).toHaveBeenCalled();
    resolveCleanup();
  });

  it("leaves bookmark skeleton readiness to the Bookmark Surface", async () => {
    const harness = createHarness();

    await runAppLifecycle(harness);

    expect(harness.elements.bookmarkContainer.classList.remove).not.toHaveBeenCalled();
    expect(harness.elements.bookmarkContainer.classList.add).not.toHaveBeenCalled();
  });

  it("does not block loading readiness on the bookmarks surface", async () => {
    const harness = createHarness();
    harness.tasks.startBookmarks.mockImplementation(() => new Promise(() => {}));

    const running = runAppLifecycle(harness);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(harness.clock.wait).toHaveBeenCalledWith(200);
    expect(harness.elements.body.classList.remove).toHaveBeenCalledWith("app-loading");
    await running;
  });

  it("waits for initial data and all features before ready, with a 200ms minimum", async () => {
    const harness = createHarness({ elapsed: 200 });
    let resolveSettings;
    harness.tasks.startSettings.mockImplementation(() => new Promise((resolve) => {
      harness.events.push("settings");
      resolveSettings = resolve;
    }));

    const running = runAppLifecycle(harness);
    await Promise.resolve();
    await Promise.resolve();
    expect(harness.elements.body.classList.remove).not.toHaveBeenCalled();
    resolveSettings();
    await running;

    expect(harness.events.indexOf("initial-data")).toBeLessThan(harness.events.indexOf("theme"));
    expect(harness.events.indexOf("theme")).toBeLessThan(harness.events.indexOf("profile"));
    expect(harness.events.indexOf("settings")).toBeLessThan(harness.events.indexOf("body-ready"));
    expect(harness.clock.wait).toHaveBeenCalledWith(200);
    expect(harness.events.slice(-4)).toEqual(["settings", ["wait", 200], "body-ready", "animate"]);
  });

  it("does not wait for cleanup and records its failure", async () => {
    const harness = createHarness();
    harness.tasks.removeLegacyData.mockRejectedValue(new Error("cleanup failed"));

    await expect(runAppLifecycle(harness)).resolves.toBeUndefined();

    expect(harness.recordError).toHaveBeenCalledWith("Legacy bookmark data cleanup failed.", expect.any(Error));
  });

  it("records startup failures and clears loading states", async () => {
    const harness = createHarness();
    harness.tasks.ensureInitialData.mockRejectedValue(new Error("startup failed"));

    await expect(runAppLifecycle(harness)).resolves.toBeUndefined();

    expect(harness.recordError).toHaveBeenCalledWith("App bootstrap failed.", expect.any(Error));
    expect(harness.elements.bookmarkContainer.classList.remove).toHaveBeenCalledWith("is-loading");
    expect(harness.elements.bookmarkContainer.classList.add).toHaveBeenCalledWith("is-ready");
    expect(harness.elements.body.classList.remove).toHaveBeenCalledWith("app-loading");
  });
});
