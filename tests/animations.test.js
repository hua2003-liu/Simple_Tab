import { afterEach, describe, expect, it, vi } from "vitest";

function createGsapMock(calls, reducedMotion = false) {
  return {
    registerPlugin: vi.fn(),
    matchMedia: () => ({
      add: (_query, callback) => {
        if (reducedMotion) callback();
      }
    }),
    set: vi.fn((...args) => calls.set.push(args)),
    killTweensOf: vi.fn(),
    quickTo: vi.fn((target, property, vars) => {
      const setter = vi.fn((value) => calls.quickToSets.push({ target, property, value }));
      calls.quickTo.push({ target, property, vars, setter });
      return setter;
    }),
    fromTo: vi.fn((...args) => calls.fromTo.push(args)),
    timeline: vi.fn((vars = {}) => {
      const timeline = {
        to: vi.fn((...args) => {
          calls.to.push(args);
          return timeline;
        }),
        fromTo: vi.fn((...args) => {
          calls.fromTo.push(args);
          return timeline;
        })
      };
      calls.timelines.push({ vars, timeline });
      return timeline;
    })
  };
}

async function loadAnimations({ reducedMotion = false } = {}) {
  vi.resetModules();
  const calls = { fromTo: [], quickTo: [], quickToSets: [], set: [], to: [], timelines: [] };
  vi.stubGlobal("gsap", createGsapMock(calls, reducedMotion));
  vi.stubGlobal("CustomEase", undefined);
  const animations = await import("../js/lib/animations.js");
  return { animations, calls };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  document.body.innerHTML = "";
});

describe("page animations", () => {
  it("updates each wallpaper layer independently for pointer motion", async () => {
    const { animations, calls } = await loadAnimations();
    const { layers } = animations.createWallpaperStage();

    expect(calls.quickTo.map(({ target, property }) => [target, property])).toEqual([
      [layers[0], "x"],
      [layers[1], "x"],
      [layers[0], "y"],
      [layers[1], "y"]
    ]);

    const event = new Event("pointermove");
    Object.defineProperties(event, {
      clientX: { value: window.innerWidth },
      clientY: { value: window.innerHeight }
    });
    window.dispatchEvent(event);

    expect(calls.quickToSets.map(({ target, property }) => [target, property])).toEqual([
      [layers[0], "x"],
      [layers[1], "x"],
      [layers[0], "y"],
      [layers[1], "y"]
    ]);
  });

  it("gives bookmark groups stable, subtly different entrance paths", async () => {
    const { animations, calls } = await loadAnimations();
    const groups = [document.createElement("section"), document.createElement("section")];
    groups[0].dataset.groupId = "a";
    groups[1].dataset.groupId = "b";

    animations.animateBookmarkGroups(groups);

    expect(calls.fromTo).toHaveLength(1);
    expect(calls.fromTo[0][0]).toEqual(groups);
    const from = calls.fromTo[0][1];
    expect(from.autoAlpha).toBe(0);
    expect(from.x(0, groups[0])).not.toBe(from.x(1, groups[1]));
    expect(from.x(0, groups[0])).toBe(from.x(0, groups[0]));
    expect(calls.fromTo[0][2]).toMatchObject({
      autoAlpha: 1,
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      ease: "power2.out"
    });
    expect(typeof calls.fromTo[0][2].stagger).toBe("function");
  });

  it("animates bookmark layout changes from their measured previous positions", async () => {
    const { animations, calls } = await loadAnimations();
    const group = document.createElement("section");
    group.dataset.layoutKey = "group-a";
    group.getBoundingClientRect = () => ({ left: 45, top: 70 });

    animations.animateBookmarkLayout(new Map([["group-a", { left: 20, top: 30 }]]), [group]);

    expect(calls.fromTo).toHaveLength(1);
    expect(calls.fromTo[0][0]).toBe(group);
    expect(calls.fromTo[0][1]).toEqual({ x: -25, y: -40 });
    expect(calls.fromTo[0][2]).toMatchObject({ x: 0, y: 0, duration: 0.32, clearProps: "transform" });
  });

  it("skips bookmark animations when reduced motion is preferred", async () => {
    const { animations, calls } = await loadAnimations({ reducedMotion: true });

    animations.animateBookmarkGroups([document.createElement("section")]);
    animations.animateBookmarkLayout(new Map(), [document.createElement("section")]);

    expect(calls.fromTo).toHaveLength(0);
    expect(calls.set[0][1]).toMatchObject({ autoAlpha: 1, x: 0, y: 0, rotation: 0, scale: 1 });
  });

  it("uses a gentle layered page entrance", async () => {
    const { animations, calls } = await loadAnimations();

    animations.animatePageEnter({
      greeting: document.createElement("h1"),
      searchModule: document.createElement("form"),
      bookmarkModule: null,
      toolbar: document.createElement("nav")
    });

    expect(calls.timelines).toHaveLength(1);
    expect(calls.fromTo).toHaveLength(3);
    expect(calls.fromTo[0][1]).toMatchObject({ autoAlpha: 0, y: 16, scale: 0.97 });
    expect(calls.fromTo[1][3]).toBe("-=0.34");
    expect(calls.fromTo[2][1]).toMatchObject({ autoAlpha: 0, y: -10, scale: 0.97 });
  });

  it("fades the page and toolbar without a full-page blur before navigating", async () => {
    const { animations, calls } = await loadAnimations();
    const fakeWindow = { location: { href: "" } };
    vi.stubGlobal("window", fakeWindow);
    const main = document.createElement("main");
    const toolbar = document.createElement("nav");
    toolbar.className = "toolbar";
    document.body.append(main, toolbar);

    animations.animatePageLeave(main, "https://example.test", 400);

    expect(calls.to).toHaveLength(2);
    expect(calls.to[0][0]).toBe(main);
    expect(calls.to[0][1]).toMatchObject({ y: -14, scale: 0.985, rotationX: -1.5 });
    expect(calls.to[0][1]).not.toHaveProperty("filter");
    expect(calls.to[1][0]).toBe(toolbar);
    calls.timelines[0].vars.onComplete();
    expect(fakeWindow.location.href).toBe("https://example.test");
  });

  it("navigates immediately when reduced motion is preferred", async () => {
    const { animations, calls } = await loadAnimations({ reducedMotion: true });
    const fakeWindow = { location: { href: "" } };
    vi.stubGlobal("window", fakeWindow);

    animations.animatePageLeave(document.createElement("main"), "https://example.test", 400);

    expect(fakeWindow.location.href).toBe("https://example.test");
    expect(calls.timelines).toHaveLength(0);
  });
});
