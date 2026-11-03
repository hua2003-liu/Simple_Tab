import { afterEach, describe, expect, it, vi } from "vitest";

const { animateBookmarkGroups, animateBookmarkInteraction, animateBookmarkLayout } = vi.hoisted(() => ({
  animateBookmarkGroups: vi.fn(),
  animateBookmarkInteraction: vi.fn(),
  animateBookmarkLayout: vi.fn()
}));

vi.mock("../js/lib/animations.js", () => ({
  animateBookmarkGroups,
  animateBookmarkInteraction,
  animateBookmarkLayout
}));

import { createDialogs } from "../js/lib/dialogs.js";
import { createBookmarkActions } from "../js/features/bookmark-actions.js";
import { getBookmarkDropDestination, organizeBookmarkBar } from "../js/features/bookmark-rules.js";
import { initBookmarks } from "../js/features/bookmarks.js";
import { STORAGE_KEYS } from "../js/config/constants.js";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

let nextId = 1;
let clock = 0;
const bm = (title, url, dateAdded = ++clock * 10) => ({ id: String(++nextId), title, url, dateAdded });
const folder = (title, children, dateAdded = ++clock * 10) => ({ id: String(++nextId), title, children, dateAdded });
const bar = (children) => {
  const root = { id: "1", title: "Bookmarks bar", children };
  const assignParents = (node) => (node.children || []).forEach((child, index) => {
    child.parentId = node.id;
    child.index = index;
    assignParents(child);
  });
  assignParents(root);
  return root;
};

describe("organizeBookmarkBar", () => {
  it("exposes the bar id, inbox items and groups with node identity", () => {
    const tree = bar([
      bm("A", "https://a"),
      folder("工作", [bm("W1", "https://w1")])
    ]);

    const { barId, inbox, groups } = organizeBookmarkBar(tree);

    expect(barId).toBe("1");
    expect(inbox).toEqual([{ id: inbox[0].id, title: "A", url: "https://a", parentId: "1", index: 0 }]);
    expect(groups[0]).toMatchObject({
      id: groups[0].id,
      title: "工作",
      parentId: "1",
      bookmarks: [{ title: "W1", parentId: groups[0].id, index: 0 }]
    });
    expect(typeof groups[0].childIndex).toBe("number");
  });
  it("returns empty inbox and groups for an empty bar", () => {
    expect(organizeBookmarkBar(bar([]))).toEqual({
      barId: "1",
      inbox: [],
      groups: [],
      childIdsByParent: { "1": [] }
    });
  });

  it("preserves Chrome child order for top-level bookmarks regardless of add date", () => {
    const a = bm("A", "https://a", 100);
    const b = bm("B", "https://b", 300);
    const c = bm("C", "https://c", 200);

    const { inbox, groups } = organizeBookmarkBar(bar([a, b, c]));

    expect(inbox.map((item) => item.title)).toEqual(["A", "B", "C"]);
    expect(groups).toEqual([]);
  });

  it("preserves Chrome child order for group bookmarks regardless of add date", () => {
    const { inbox, groups } = organizeBookmarkBar(
      bar([
        folder("工作", [bm("W1", "https://w1", 100), bm("W2", "https://w2", 400)]),
        folder("学习", [bm("S1", "https://s1", 50)])
      ])
    );

    expect(inbox).toEqual([]);
    expect(groups.map((group) => group.title)).toEqual(["工作", "学习"]);
    expect(groups[0].bookmarks.map((item) => item.title)).toEqual(["W1", "W2"]);
    expect(groups[0].bookmarks.map((item) => item.index)).toEqual([0, 1]);
    expect(groups[0].childIndex).toBe(0);
    expect(groups[0].parentId).toBe("1");
    expect(groups[0].bookmarks.every((item) => item.parentId === groups[0].id)).toBe(true);
    expect(groups[0].bookmarks.every((item) => item.url)).toBe(true);
    const mixed = organizeBookmarkBar(bar([
      folder("混合", [bm("M1", "https://m1", 1), folder("子文件夹", []), bm("M2", "https://m2", 2)])
    ]));
    expect(mixed.groups[0].bookmarks.map((item) => item.index)).toEqual([0, 2]);
    expect(mixed.childIdsByParent[mixed.groups[0].id]).toEqual([
      mixed.groups[0].bookmarks[0].id,
      expect.any(String),
      mixed.groups[0].bookmarks[1].id
    ]);
  });

  it("keeps folder pre-order for groups and collects nested folders as their own groups", () => {
    const { groups } = organizeBookmarkBar(
      bar([
        folder("外", [
          bm("O1", "https://o1", 10),
          folder("内", [bm("N1", "https://n1", 20)])
        ]),
        folder("尾", [bm("T1", "https://t1", 30)])
      ])
    );

    expect(groups.map((group) => group.title)).toEqual(["外", "内", "尾"]);
    expect(groups[0].bookmarks.map((item) => item.title)).toEqual(["O1"]);
    expect(groups[1].bookmarks.map((item) => item.title)).toEqual(["N1"]);
  });

  it("keeps freshly created empty folders as empty groups", () => {
    const { groups } = organizeBookmarkBar(bar([folder("空", [])]));

    expect(groups).toHaveLength(1);
    expect(groups[0].bookmarks).toEqual([]);
  });
});

function createFakeBookmarksApi(initialChildren) {
  let current = bar(initialChildren);
  const listeners = new Set();
  let created = 0;

  const findNode = (node, id) => {
    if (node.id === id) return node;
    for (const child of node.children || []) {
      const found = findNode(child, id);
      if (found) return found;
    }
    return null;
  };
  const updateIndices = (node) => (node.children || []).forEach((child, index) => {
    child.parentId = node.id;
    child.index = index;
    updateIndices(child);
  });

  return {
    getBookmarksBar: vi.fn(async () => current),
    addChangeListener: vi.fn((cb) => listeners.add(cb)),
    createFolder: vi.fn(async () => ({ id: `new-folder-${++created}` })),
    rename: vi.fn(async () => {}),
    removeFolder: vi.fn(async (id) => {
      const node = findNode(current, id);
      const parent = findNode(current, node?.parentId);
      if (!parent?.children) return;
      parent.children.splice(parent.children.indexOf(node), 1);
      updateIndices(current);
    }),
    removeBookmark: vi.fn(async () => {}),
    move: vi.fn(async (id, destination) => {
      const source = findNode(current, id);
      const targetParent = findNode(current, destination.parentId);
      if (!source || !targetParent?.children) return;
      const oldParent = findNode(current, source.parentId);
      if (!oldParent?.children) return;
      oldParent.children.splice(oldParent.children.indexOf(source), 1);
      const index = Number.isInteger(destination.index)
        ? Math.max(0, Math.min(destination.index, targetParent.children.length))
        : targetParent.children.length;
      targetParent.children.splice(index, 0, source);
      updateIndices(current);
    }),
    createBookmark: vi.fn(async () => ({ id: `new-bm-${++created}` })),
    setChildren: (children) => {
      current = bar(children);
    },
    emitChange: async () => Promise.all(Array.from(listeners, (cb) => cb()))
  };
}

function createElements() {
  const bookmarkContainer = document.createElement("div");
  bookmarkContainer.id = "bookmark-list";
  bookmarkContainer.className = "bookmark-list is-loading";
  const skeleton = document.createElement("div");
  skeleton.className = "bookmark-skeleton";
  bookmarkContainer.appendChild(skeleton);
  document.body.appendChild(bookmarkContainer);

  return { bookmarkContainer, mainContainer: document.createElement("div") };
}

function createFakeStorage(initial = {}) {
  const stored = { ...initial };
  return {
    stored,
    storageGet: vi.fn(async (keys) => Object.fromEntries(keys
      .filter((key) => Object.hasOwn(stored, key))
      .map((key) => [key, stored[key]]))),
    storageSet: vi.fn(async (items) => Object.assign(stored, items))
  };
}

function createInitOptions(children, overrides = {}) {
  return {
    elements: createElements(),
    bookmarksApi: createFakeBookmarksApi(children),
    storageApi: createFakeStorage(),
    navigationApi: { navigateWithTransition: vi.fn() },
    dialogs: createDialogs(),
    delayMs: 0,
    ...overrides
  };
}

const links = (container) => Array.from(container.querySelectorAll("a.bookmark-item"));
const labels = (container) => links(container).map((a) => a.querySelector(".bookmark-label").textContent);
const titles = (container) => Array.from(container.querySelectorAll(".bookmark-group-title"))
  .map((el) => el.textContent);

function createDragEvent(type, transfer, { clientX = 0, clientY = 0 } = {}) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    dataTransfer: { value: transfer },
    clientX: { value: clientX },
    clientY: { value: clientY }
  });
  return event;
}

function createDataTransfer() {
  return {
    values: {},
    setData(type, value) { this.values[type] = value; },
    getData(type) { return this.values[type] || ""; },
    setDragImage: vi.fn()
  };
}

describe("getBookmarkDropDestination", () => {
  it("computes same-parent insertions around targets after removing the source", () => {
    const data = organizeBookmarkBar(bar([
      bm("A", "https://a"),
      bm("B", "https://b"),
      folder("内层", []),
      bm("C", "https://c")
    ]));
    const [a, b, c] = data.inbox;

    expect(getBookmarkDropDestination(data, a.id, data.barId, c.id, false))
      .toEqual({ parentId: data.barId, index: 3 });
    expect(getBookmarkDropDestination(data, c.id, data.barId, b.id, true))
      .toEqual({ parentId: data.barId, index: 1 });
    expect(getBookmarkDropDestination(data, b.id, data.barId, b.id, true)).toBeNull();
  });

  it("counts folders when inserting into another parent or appending", () => {
    const data = organizeBookmarkBar(bar([
      bm("顶层", "https://top"),
      folder("目标组", [bm("B1", "https://b1"), folder("子文件夹", []), bm("B2", "https://b2")])
    ]));
    const source = data.inbox[0];
    const targetGroup = data.groups[0];
    const [first, second] = targetGroup.bookmarks;

    expect(getBookmarkDropDestination(data, source.id, targetGroup.id, second.id, false))
      .toEqual({ parentId: targetGroup.id, index: 3 });
    expect(getBookmarkDropDestination(data, source.id, targetGroup.id))
      .toEqual({ parentId: targetGroup.id, index: 3 });
    expect(getBookmarkDropDestination(data, second.id, targetGroup.id, first.id, true))
      .toEqual({ parentId: targetGroup.id, index: 0 });
  });
});

describe("initBookmarks (grid surface)", () => {
  it("renders an inbox section followed by group sections in a grid", async () => {
    const options = createInitOptions([
      bm("旧书签", "https://old", 100),
      folder("工作", [bm("W1", "https://w1", 200), bm("W2", "https://w2", 300)]),
      bm("新书签", "https://new", 500)
    ]);

    await initBookmarks(options);

    const container = options.elements.bookmarkContainer;
    expect(container.querySelector(".bookmark-grid")).toBeTruthy();
    expect(container.querySelector(".bookmark-nav-btn")).toBeNull();
    expect(container.querySelector(".bookmark-page")).toBeNull();
    expect(titles(container)).toEqual(["未整理", "工作"]);
    expect(labels(container)).toEqual(["旧书签", "新书签", "W1", "W2"]);
  });

  it("uses the saved visual order and drops stale or duplicate ids", async () => {
    const work = folder("工作", []);
    const study = folder("学习", []);
    const storageApi = createFakeStorage({
      [STORAGE_KEYS.bookmarkGroupOrder]: [study.id, "removed", study.id]
    });
    const options = createInitOptions([work, study], { storageApi });

    await initBookmarks(options);
    await Promise.resolve();

    expect(titles(options.elements.bookmarkContainer)).toEqual(["学习", "工作"]);
    expect(storageApi.stored[STORAGE_KEYS.bookmarkGroupOrder]).toEqual([study.id, work.id]);
  });

  it("appends new groups without disturbing the user's saved order", async () => {
    const work = folder("工作", []);
    const study = folder("学习", []);
    const tools = folder("工具", []);
    const storageApi = createFakeStorage({ [STORAGE_KEYS.bookmarkGroupOrder]: [study.id, work.id] });
    const options = createInitOptions([work, study], { storageApi });

    await initBookmarks(options);
    options.bookmarksApi.setChildren([work, study, tools]);
    await options.bookmarksApi.emitChange();
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(titles(options.elements.bookmarkContainer)).toEqual(["学习", "工作", "工具"]);
  });

  it("shows no inbox header when there are no groups", async () => {
    const options = createInitOptions([bm("A", "https://a"), bm("B", "https://b")]);

    await initBookmarks(options);

    const container = options.elements.bookmarkContainer;
    expect(titles(container)).toEqual([]);
    expect(links(container)).toHaveLength(2);
    expect(container.querySelector(".bookmark-grid")).toBeTruthy();
  });

  it("shows an empty state when the bookmarks bar is empty", async () => {
    const options = createInitOptions([]);

    await initBookmarks(options);

    const container = options.elements.bookmarkContainer;
    expect(container.querySelector(".bookmark-empty")).toBeTruthy();
    expect(links(container)).toHaveLength(0);
  });

  it("keeps the skeleton node while replacing it with the first result", async () => {
    const options = createInitOptions([bm("A", "https://a")]);
    const skeleton = options.elements.bookmarkContainer.querySelector(".bookmark-skeleton");

    const status = await initBookmarks(options);

    expect(status).toBe("loaded");
    expect(options.elements.bookmarkContainer.querySelector(".bookmark-skeleton")).toBe(skeleton);
    expect(labels(options.elements.bookmarkContainer)).toEqual(["A"]);
  });

  it("keeps the skeleton visible until the first bookmark result is ready", async () => {
    const options = createInitOptions([bm("A", "https://a")]);
    let resolveRead;
    options.bookmarksApi.getBookmarksBar.mockImplementation(() => new Promise((resolve) => {
      resolveRead = resolve;
    }));

    const ready = initBookmarks(options);
    expect(options.elements.bookmarkContainer.classList.contains("is-loading")).toBe(true);
    expect(options.elements.bookmarkContainer.classList.contains("is-ready")).toBe(false);

    resolveRead(bar([bm("A", "https://a")]));
    await expect(ready).resolves.toBe("loaded");

    expect(options.elements.bookmarkContainer.classList.contains("is-loading")).toBe(false);
    expect(options.elements.bookmarkContainer.classList.contains("is-ready")).toBe(true);
  });

  it("shows a retryable error when the initial bookmark read fails", async () => {
    const options = createInitOptions([]);
    options.bookmarksApi.getBookmarksBar.mockRejectedValueOnce(new Error("unavailable"));

    const status = await initBookmarks(options);
    const retryButton = options.elements.bookmarkContainer.querySelector(".bookmark-retry");

    expect(status).toBe("error");
    expect(options.elements.bookmarkContainer.querySelector(".bookmark-load-error")).toBeTruthy();
    expect(retryButton).toBeTruthy();

    options.bookmarksApi.setChildren([bm("恢复", "https://restored")]);
    retryButton.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(labels(options.elements.bookmarkContainer)).toEqual(["恢复"]);
  });

  it("ends the initial loading state on timeout and ignores late results", async () => {
    vi.useFakeTimers();
    const options = createInitOptions([bm("迟到", "https://late")]);
    let resolveRead;
    options.bookmarksApi.getBookmarksBar.mockImplementation(() => new Promise((resolve) => {
      resolveRead = resolve;
    }));

    const ready = initBookmarks({ ...options, initialLoadTimeoutMs: 100 });
    await vi.advanceTimersByTimeAsync(100);

    await expect(ready).resolves.toBe("timeout");
    expect(options.elements.bookmarkContainer.querySelector(".bookmark-load-error").textContent).toContain("超时");

    resolveRead(bar([bm("迟到", "https://late")]));
    await Promise.resolve();
    await Promise.resolve();
    expect(links(options.elements.bookmarkContainer)).toHaveLength(0);
    vi.useRealTimers();
  });

  it("re-renders when the browser bookmarks change without replaying entrance", async () => {
    animateBookmarkGroups.mockClear();
    const options = createInitOptions([bm("A", "https://a")]);

    await initBookmarks(options);
    const container = options.elements.bookmarkContainer;
    expect(labels(container)).toEqual(["A"]);
    expect(animateBookmarkGroups).toHaveBeenCalledTimes(1);

    options.bookmarksApi.setChildren([bm("A", "https://a"), bm("B", "https://b")]);
    await options.bookmarksApi.emitChange();
    // 变更监听是去抖刷新
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(labels(container)).toEqual(["A", "B"]);
    expect(animateBookmarkGroups).toHaveBeenCalledTimes(1);
    expect(animateBookmarkLayout).toHaveBeenCalled();
  });

  it("swaps group cards with the drop target, including across columns", async () => {
    const first = folder("第一组", []);
    const second = folder("第二组", []);
    const third = folder("第三组", []);
    const options = createInitOptions([first, second, third]);
    await initBookmarks(options);

    const getSection = (id) => Array.from(options.elements.bookmarkContainer.querySelectorAll(".bookmark-section"))
      .find((section) => section.dataset.groupId === id);
    const dragGroup = (dragId, targetId, clientY, targetLeft = 0) => {
      const transfer = {
        values: {},
        setData(type, value) { this.values[type] = value; },
        getData(type) { return this.values[type] || ""; }
      };
      const sourceTitle = getSection(dragId).querySelector(".bookmark-group-title");
      const dragStart = new Event("dragstart", { bubbles: true });
      Object.defineProperty(dragStart, "dataTransfer", { value: transfer });
      sourceTitle.dispatchEvent(dragStart);

      const target = getSection(targetId);
      Object.defineProperty(target, "getBoundingClientRect", {
        configurable: true,
        value: () => ({ top: 100, left: targetLeft, width: 240, height: 100 })
      });
      const drop = new Event("drop", { bubbles: true, cancelable: true });
      Object.defineProperties(drop, {
        dataTransfer: { value: transfer },
        clientY: { value: clientY }
      });
      target.dispatchEvent(drop);
    };

    dragGroup(third.id, first.id, 120);
    expect(titles(options.elements.bookmarkContainer)).toEqual(["第三组", "第二组", "第一组"]);
    expect(options.bookmarksApi.move).not.toHaveBeenCalled();

    // 落在目标卡下半部、且目标位于另一列，仍是互换而非插入。
    dragGroup(first.id, second.id, 180, 300);
    expect(titles(options.elements.bookmarkContainer)).toEqual(["第三组", "第一组", "第二组"]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(options.storageApi.stored[STORAGE_KEYS.bookmarkGroupOrder])
      .toEqual([third.id, first.id, second.id]);
    expect(animateBookmarkLayout).toHaveBeenCalledTimes(2);
    expect(options.bookmarksApi.move).not.toHaveBeenCalled();

    options.bookmarksApi.setChildren([first, second, third]);
    await options.bookmarksApi.emitChange();
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(titles(options.elements.bookmarkContainer)).toEqual(["第三组", "第一组", "第二组"]);
  });

  it("does not reorder groups when dropped on itself or outside a group card", async () => {
    const first = folder("第一组", []);
    const second = folder("第二组", []);
    const options = createInitOptions([first, second]);
    await initBookmarks(options);
    options.storageApi.storageSet.mockClear();
    animateBookmarkLayout.mockClear();

    const getSection = (id) => Array.from(options.elements.bookmarkContainer.querySelectorAll(".bookmark-section"))
      .find((section) => section.dataset.groupId === id);
    const startDrag = (id) => {
      const transfer = createDataTransfer();
      const sourceTitle = getSection(id).querySelector(".bookmark-group-title");
      sourceTitle.dispatchEvent(createDragEvent("dragstart", transfer));
      return { sourceTitle, transfer };
    };
    const dropOn = (target, transfer) => target.dispatchEvent(createDragEvent("drop", transfer));

    let drag = startDrag(first.id);
    dropOn(getSection(first.id), drag.transfer);
    expect(titles(options.elements.bookmarkContainer)).toEqual(["第一组", "第二组"]);

    drag = startDrag(first.id);
    dropOn(document.body, drag.transfer);
    drag.sourceTitle.dispatchEvent(createDragEvent("dragend", drag.transfer));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(options.storageApi.storageSet).not.toHaveBeenCalled();
    expect(animateBookmarkLayout).not.toHaveBeenCalled();
    expect(titles(options.elements.bookmarkContainer)).toEqual(["第一组", "第二组"]);
  });

  it("highlights the whole swap target and clears it after dragend", async () => {
    const first = folder("第一组", []);
    const second = folder("第二组", []);
    const options = createInitOptions([first, second]);
    await initBookmarks(options);

    const getSection = (id) => Array.from(options.elements.bookmarkContainer.querySelectorAll(".bookmark-section"))
      .find((section) => section.dataset.groupId === id);
    const sourceTitle = getSection(first.id).querySelector(".bookmark-group-title");
    const target = getSection(second.id);
    const transfer = createDataTransfer();
    sourceTitle.dispatchEvent(createDragEvent("dragstart", transfer));
    target.dispatchEvent(createDragEvent("dragover", transfer, { clientY: 150 }));

    expect(target.classList.contains("swap-target")).toBe(true);
    expect(target.classList.contains("drop-before")).toBe(false);
    expect(target.classList.contains("drop-after")).toBe(false);
    expect(getSection(first.id).classList.contains("swap-target")).toBe(false);

    sourceTitle.dispatchEvent(createDragEvent("dragend", transfer));
    expect(target.classList.contains("swap-target")).toBe(false);
  });

  it("moves a bookmark within a group to the before/after target index", async () => {
    const group = folder("工作", [bm("A", "https://a"), bm("B", "https://b"), bm("C", "https://c")]);
    const options = createInitOptions([group]);
    await initBookmarks(options);

    const items = options.elements.bookmarkContainer.querySelectorAll(".bookmark-item");
    const source = items[2];
    const target = items[0];
    target.getBoundingClientRect = () => ({ left: 100, right: 160, top: 0, bottom: 60, width: 60, height: 60 });
    const transfer = createDataTransfer();
    source.dispatchEvent(createDragEvent("dragstart", transfer));
    expect(transfer.values["text/x-bookmark-id"]).toBe(source.dataset.bookmarkId);
    const dropEvent = createDragEvent("drop", transfer, { clientX: 110 });
    target.dispatchEvent(dropEvent);
    expect(dropEvent.defaultPrevented).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(options.bookmarksApi.move).toHaveBeenCalledWith(source.dataset.bookmarkId, {
      parentId: group.id,
      index: 0
    });
    expect(labels(options.elements.bookmarkContainer)).toEqual(["C", "A", "B"]);
  });

  it("moves a bookmark across groups to the right side of a target item", async () => {
    const sourceGroup = folder("工作", [bm("来源", "https://source")]);
    const targetGroup = folder("学习", [bm("目标一", "https://target1"), bm("目标二", "https://target2")]);
    const options = createInitOptions([sourceGroup, targetGroup]);
    await initBookmarks(options);

    const sections = Array.from(options.elements.bookmarkContainer.querySelectorAll(".bookmark-section"));
    const source = sections[0].querySelector(".bookmark-item");
    const target = sections[1].querySelectorAll(".bookmark-item")[1];
    target.getBoundingClientRect = () => ({ left: 100, right: 160, top: 0, bottom: 60, width: 60, height: 60 });
    const transfer = createDataTransfer();
    source.dispatchEvent(createDragEvent("dragstart", transfer));
    target.dispatchEvent(createDragEvent("drop", transfer, { clientX: 150 }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(options.bookmarksApi.move).toHaveBeenCalledWith(source.dataset.bookmarkId, {
      parentId: targetGroup.id,
      index: 2
    });
    expect(labels(options.elements.bookmarkContainer)).toEqual(["目标一", "目标二", "来源"]);
  });

  it("appends a bookmark to the group when dropping on card whitespace", async () => {
    const group = folder("工作", [bm("首项", "https://first"), bm("待移", "https://move")]);
    const options = createInitOptions([group]);
    await initBookmarks(options);

    const section = options.elements.bookmarkContainer.querySelector(".bookmark-section");
    const source = section.querySelectorAll(".bookmark-item")[0];
    const transfer = createDataTransfer();
    source.dispatchEvent(createDragEvent("dragstart", transfer));
    section.dispatchEvent(createDragEvent("drop", transfer));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(options.bookmarksApi.move).toHaveBeenCalledWith(source.dataset.bookmarkId, {
      parentId: group.id,
      index: 1
    });
    expect(labels(options.elements.bookmarkContainer)).toEqual(["待移", "首项"]);
  });

  it("allows dropping into an empty inbox without rendering an empty inbox card", async () => {
    const group = folder("工作", [bm("待归组", "https://bookmark")]);
    const options = createInitOptions([group]);
    await initBookmarks(options);

    const container = options.elements.bookmarkContainer;
    expect(titles(container)).toEqual(["工作"]);
    const source = container.querySelector(".bookmark-item");
    const cards = container.querySelector(".bookmark-cards");
    const transfer = createDataTransfer();
    source.dispatchEvent(createDragEvent("dragstart", transfer));
    cards.dispatchEvent(createDragEvent("drop", transfer));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(options.bookmarksApi.move).toHaveBeenCalledWith(source.dataset.bookmarkId, {
      parentId: "1",
      index: 1
    });
    expect(labels(container)).toEqual(["待归组"]);
  });

  it("updates drag feedback without rescanning every bookmark on each dragover", async () => {
    const options = createInitOptions([folder("工作", [bm("拖动", "https://drag")])]);
    await initBookmarks(options);

    const container = options.elements.bookmarkContainer;
    const source = container.querySelector(".bookmark-item");
    const section = container.querySelector(".bookmark-section");
    const transfer = createDataTransfer();
    source.dispatchEvent(createDragEvent("dragstart", transfer));
    const queryAll = vi.spyOn(container, "querySelectorAll");

    source.dispatchEvent(createDragEvent("dragover", transfer, { clientX: 20, clientY: 50 }));

    expect(queryAll).not.toHaveBeenCalled();
    expect(source.classList.contains("drop-before") || source.classList.contains("drop-after")).toBe(true);
    source.dispatchEvent(createDragEvent("dragend", transfer));
    expect(source.classList.contains("drop-before")).toBe(false);
    expect(source.classList.contains("drop-after")).toBe(false);
    expect(section.classList.contains("drag-over")).toBe(false);
  });

  it("auto-scrolls only the bookmark list during drag and cancels on drop", async () => {
    const group = folder("工作", [bm("首项", "https://first"), bm("末项", "https://last")]);
    const options = createInitOptions([group]);
    const frames = [];
    let frameId = 0;
    const requestFrame = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.push({ id: ++frameId, callback });
      return frameId;
    });
    const cancelFrame = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    await initBookmarks(options);

    const list = options.elements.bookmarkContainer;
    list.getBoundingClientRect = () => ({ left: 0, right: 300, top: 0, bottom: 100, width: 300, height: 100 });
    Object.defineProperties(list, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 300 }
    });
    list.scrollTop = 0;
    const source = list.querySelectorAll(".bookmark-item")[0];
    const section = list.querySelector(".bookmark-section");
    const transfer = createDataTransfer();
    source.dispatchEvent(createDragEvent("dragstart", transfer, { clientX: 20, clientY: 95 }));
    section.dispatchEvent(createDragEvent("dragover", transfer, { clientX: 20, clientY: 95 }));

    expect(requestFrame).toHaveBeenCalledTimes(1);
    frames.shift().callback();
    expect(list.scrollTop).toBeGreaterThan(0);
    expect(frames).toHaveLength(1);

    section.dispatchEvent(createDragEvent("drop", transfer, { clientX: 20, clientY: 95 }));
    expect(cancelFrame).toHaveBeenCalledWith(frameId);
    expect(requestFrame).toHaveBeenCalledTimes(2);
  });

  it("loads favicon for bookmarks without local icons", async () => {
    const options = createInitOptions([bm("Example", "https://example.com/page")]);

    await initBookmarks(options);

    const image = options.elements.bookmarkContainer.querySelector("a.bookmark-item img");
    expect(image.dataset.src).toContain("example.com");
  });

  it("falls back to the hostname as label when the title is empty", async () => {
    const options = createInitOptions([bm("  ", "https://example.com/page")]);

    await initBookmarks(options);

    expect(labels(options.elements.bookmarkContainer)).toEqual(["example.com"]);
  });

  it("swaps in a letter icon when the favicon fails to load", async () => {
    const options = createInitOptions([bm("Example", "https://example.com/page")]);

    await initBookmarks(options);

    const image = options.elements.bookmarkContainer.querySelector("a.bookmark-item img");
    image.dispatchEvent(new Event("error"));

    const letter = options.elements.bookmarkContainer.querySelector(".bookmark-letter-icon");
    expect(letter).toBeTruthy();
    expect(letter.textContent).toBe("E");
  });

  it("wires management affordances into the surface", async () => {
    const options = createInitOptions([
      bm("A", "https://a"),
      folder("工作", [bm("W1", "https://w1")])
    ]);
    const addGroupButton = document.createElement("button");
    addGroupButton.id = "bookmark-add-group";
    document.body.appendChild(addGroupButton);
    options.elements.bookmarkAddGroup = addGroupButton;

    await initBookmarks(options);

    const container = options.elements.bookmarkContainer;
    expect(container.querySelector('a.bookmark-item[draggable="true"]')).toBeTruthy();
    expect(container.querySelector('.bookmark-group-title[draggable="true"]')).toBeTruthy();
    expect(container.querySelector(".bookmark-section-header").hasAttribute("draggable")).toBe(false);
    expect(container.querySelector(".bookmark-add-group")).toBeNull();
    const sections = Array.from(container.querySelectorAll(".bookmark-section"));
    expect(sections.map((s) => s.dataset.parentId)).toEqual(["1", sections[1].dataset.parentId]);
    expect(sections[1].querySelector(".bookmark-group-rename")).toBeTruthy();
    expect(sections[1].querySelector(".bookmark-group-delete")).toBeTruthy();
    expect(sections[1].querySelector(".bookmark-add-bookmark")).toBeTruthy();
  });
});

describe("bookmark management actions", () => {
  const askText = vi.fn();
  const confirmDialog = vi.fn();

  afterEach(() => {
    vi.restoreAllMocks();
    askText.mockReset();
    confirmDialog.mockReset();
  });

  const createActions = (bookmarksApi, refresh = vi.fn()) =>
    createBookmarkActions({ bookmarksApi, refresh, askText, confirmDialog });

  it("creates a group in the bookmarks bar", async () => {
    const bookmarksApi = createFakeBookmarksApi([]);
    askText.mockResolvedValue("  工作  ");
    const refresh = vi.fn();
    const actions = createActions(bookmarksApi, refresh);

    await actions.createGroup();

    expect(bookmarksApi.createFolder).toHaveBeenCalledWith("工作", "1");
    expect(refresh).toHaveBeenCalled();
  });

  it("does nothing when the group name dialog is cancelled", async () => {
    const bookmarksApi = createFakeBookmarksApi([]);
    askText.mockResolvedValue(null);
    const actions = createActions(bookmarksApi);

    await actions.createGroup();

    expect(bookmarksApi.createFolder).not.toHaveBeenCalled();
  });

  it("renames a group", async () => {
    const bookmarksApi = createFakeBookmarksApi([]);
    askText.mockResolvedValue("新名字");
    const actions = createActions(bookmarksApi);

    await actions.renameGroup({ id: "f1", title: "旧名字" });

    expect(bookmarksApi.rename).toHaveBeenCalledWith("f1", "新名字");
  });

  it("deletes a group only after confirmation, moving its bookmarks out first", async () => {
    const bookmarksApi = createFakeBookmarksApi([folder("工作", [bm("W", "https://w")])]);
    const tree = await bookmarksApi.getBookmarksBar();
    const group = organizeBookmarkBar(tree).groups[0];
    confirmDialog.mockReturnValue(true);
    const actions = createActions(bookmarksApi);

    await actions.deleteGroup(group);

    expect(confirmDialog).toHaveBeenCalled();
    expect(bookmarksApi.move).toHaveBeenCalledWith(group.bookmarks[0].id, { parentId: "1" });
    expect(bookmarksApi.removeFolder).toHaveBeenCalledWith(group.id);
  });

  it("keeps nested folders and their bookmarks when deleting a group", async () => {
    const children = [
      folder("工作", [
        bm("直接书签", "https://direct.example"),
        folder("子文件夹", [
          bm("子书签", "https://child.example"),
          folder("更深一层", [bm("深层书签", "https://deep.example")])
        ])
      ]),
      bm("同级书签", "https://sibling.example")
    ];
    const bookmarksApi = createFakeBookmarksApi(children);
    const initialTree = await bookmarksApi.getBookmarksBar();
    const group = organizeBookmarkBar(initialTree).groups.find((item) => item.title === "工作");
    expect(group.bookmarks.map((bookmark) => bookmark.title)).toEqual(["直接书签"]);
    const actions = createActions(bookmarksApi);
    confirmDialog.mockReturnValue(true);

    await actions.deleteGroup(group);

    const finalTree = await bookmarksApi.getBookmarksBar();
    const directBookmark = finalTree.children.find((node) => node.title === "直接书签");
    const childFolder = finalTree.children.find((node) => node.title === "子文件夹");
    const deepFolder = childFolder?.children.find((node) => node.title === "更深一层");

    expect(finalTree.children.map((node) => node.title)).not.toContain("工作");
    expect(directBookmark?.parentId).toBe(finalTree.id);
    expect(childFolder?.parentId).toBe(finalTree.id);
    expect(childFolder?.children.map((node) => node.title)).toEqual(["子书签", "更深一层"]);
    expect(deepFolder?.children.map((node) => node.title)).toEqual(["深层书签"]);
    expect(finalTree.children.map((node) => node.title)).toContain("同级书签");
  });

  it("keeps the group when deletion is not confirmed", async () => {
    const bookmarksApi = createFakeBookmarksApi([]);
    confirmDialog.mockResolvedValue(false);
    const group = { id: "f1", title: "工作", parentId: "1", childIndex: 0, bookmarks: [] };
    const refresh = vi.fn();
    const actions = createActions(bookmarksApi, refresh);

    await actions.deleteGroup(group);

    expect(bookmarksApi.removeFolder).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("adds a bookmark into the target section", async () => {
    const bookmarksApi = createFakeBookmarksApi([]);
    askText.mockResolvedValueOnce("https://example.com").mockResolvedValueOnce("例子");
    const actions = createActions(bookmarksApi);

    await actions.addBookmark({ parentId: "1" });

    expect(bookmarksApi.createBookmark).toHaveBeenCalledWith({ title: "例子", url: "https://example.com", parentId: "1" });
  });

  it("does not add a bookmark when the name dialog is cancelled", async () => {
    const bookmarksApi = createFakeBookmarksApi([]);
    askText.mockResolvedValueOnce("https://example.com").mockResolvedValueOnce(null);
    const refresh = vi.fn();
    const actions = createActions(bookmarksApi, refresh);

    await actions.addBookmark({ parentId: "f3" });

    expect(bookmarksApi.createBookmark).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("falls back to the url as title when the name dialog is left empty", async () => {
    const bookmarksApi = createFakeBookmarksApi([]);
    askText.mockResolvedValueOnce("https://example.com").mockResolvedValueOnce("");
    const actions = createActions(bookmarksApi);

    await actions.addBookmark({ parentId: "f3" });

    expect(bookmarksApi.createBookmark).toHaveBeenCalledWith({ title: "https://example.com", url: "https://example.com", parentId: "f3" });
  });

  it("deletes a bookmark after confirmation", async () => {
    const bookmarksApi = createFakeBookmarksApi([]);
    confirmDialog.mockReturnValue(true);
    const actions = createActions(bookmarksApi);

    await actions.deleteBookmark({ id: "b1", title: "例子" });

    expect(bookmarksApi.removeBookmark).toHaveBeenCalledWith("b1");
  });

  it("moves a bookmark into a group", async () => {
    const bookmarksApi = createFakeBookmarksApi([]);
    const actions = createActions(bookmarksApi);

    await actions.moveBookmark("b1", { parentId: "f9", index: 3 });

    expect(bookmarksApi.move).toHaveBeenCalledWith("b1", { parentId: "f9", index: 3 });
  });

  it("opens the deletion confirmation without navigating from the bookmark link", async () => {
    const dialogs = { askText: vi.fn(), confirm: vi.fn().mockResolvedValue(false) };
    const options = createInitOptions([bm("A", "https://a")], { dialogs });
    await initBookmarks(options);

    options.elements.bookmarkContainer.querySelector(".bookmark-item-delete").click();
    await Promise.resolve();

    expect(options.navigationApi.navigateWithTransition).not.toHaveBeenCalled();
    expect(dialogs.confirm).toHaveBeenCalledWith("删除书签「A」？", { confirmText: "删除", danger: true });
  });

  it("re-renders the surface when the settings add-group button is clicked", async () => {
    const options = createInitOptions([bm("A", "https://a")]);
    const addGroupButton = document.createElement("button");
    addGroupButton.id = "bookmark-add-group";
    document.body.appendChild(addGroupButton);
    options.elements.bookmarkAddGroup = addGroupButton;

    await initBookmarks(options);

    // 页内对话框：填入名称并确定
    addGroupButton.click();
    const input = document.querySelector(".bookmark-dialog-input");
    expect(input).toBeTruthy();
    input.value = "新组";
    document.querySelector(".bookmark-dialog-btn.primary").click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(options.bookmarksApi.createFolder).toHaveBeenCalledWith("新组", "1");
  });
});
