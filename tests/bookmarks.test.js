import { afterEach, describe, expect, it, vi } from "vitest";
import {
  organizeBookmarkBar,
  initBookmarks,
  createBookmarkActions
} from "../js/features/bookmarks.js";

let nextId = 0;
let clock = 0;
const bm = (title, url, dateAdded = ++clock * 10) => ({ id: String(++nextId), title, url, dateAdded });
const folder = (title, children, dateAdded = ++clock * 10) => ({ id: String(++nextId), title, children, dateAdded });
const bar = (children) => {
  const root = { id: "1", title: "Bookmarks bar", children };
  const assignParents = (node) => (node.children || []).forEach((child) => {
    child.parentId = node.id;
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
    expect(inbox).toEqual([{ id: inbox[0].id, title: "A", url: "https://a" }]);
    expect(groups[0]).toMatchObject({ id: groups[0].id, title: "工作", parentId: "1", bookmarks: [{ title: "W1" }] });
    expect(typeof groups[0].childIndex).toBe("number");
  });
  it("returns empty inbox and groups for an empty bar", () => {
    expect(organizeBookmarkBar(bar([]))).toEqual({ barId: "1", inbox: [], groups: [] });
  });

  it("puts top-level bookmarks into the inbox, newest first", () => {
    const a = bm("A", "https://a", 100);
    const b = bm("B", "https://b", 300);
    const c = bm("C", "https://c", 200);

    const { inbox, groups } = organizeBookmarkBar(bar([a, b, c]));

    expect(inbox.map((item) => item.title)).toEqual(["B", "C", "A"]);
    expect(groups).toEqual([]);
  });

  it("turns folders into groups with bookmarks newest first", () => {
    const { inbox, groups } = organizeBookmarkBar(
      bar([
        folder("工作", [bm("W1", "https://w1", 100), bm("W2", "https://w2", 400)]),
        folder("学习", [bm("S1", "https://s1", 50)])
      ])
    );

    expect(inbox).toEqual([]);
    expect(groups.map((group) => group.title)).toEqual(["工作", "学习"]);
    expect(groups[0].bookmarks.map((item) => item.title)).toEqual(["W2", "W1"]);
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

  return {
    getBookmarksBar: vi.fn(async () => current),
    addChangeListener: vi.fn((cb) => listeners.add(cb)),
    createFolder: vi.fn(async () => ({ id: `new-folder-${++created}` })),
    rename: vi.fn(async () => {}),
    removeFolder: vi.fn(async () => {}),
    removeBookmark: vi.fn(async () => {}),
    move: vi.fn(async () => {}),
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
  document.body.appendChild(bookmarkContainer);

  return { bookmarkContainer, mainContainer: document.createElement("div") };
}

function createInitOptions(children, overrides = {}) {
  return {
    elements: createElements(),
    bookmarksApi: createFakeBookmarksApi(children),
    navigationApi: { navigateWithTransition: vi.fn() },
    delayMs: 0,
    ...overrides
  };
}

const links = (container) => Array.from(container.querySelectorAll("a.bookmark-item"));
const labels = (container) => links(container).map((a) => a.querySelector(".bookmark-label").textContent);
const titles = (container) => Array.from(container.querySelectorAll(".bookmark-group-title"))
  .map((el) => el.textContent);

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
    expect(labels(container)).toEqual(["新书签", "旧书签", "W2", "W1"]);
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

  it("re-renders when the browser bookmarks change", async () => {
    const options = createInitOptions([bm("A", "https://a")]);

    await initBookmarks(options);
    const container = options.elements.bookmarkContainer;
    expect(labels(container)).toEqual(["A"]);

    options.bookmarksApi.setChildren([bm("A", "https://a"), bm("B", "https://b")]);
    await options.bookmarksApi.emitChange();
    // 变更监听是去抖刷新
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(labels(container)).toEqual(["B", "A"]);
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
    const bookmarksApi = createFakeBookmarksApi([]);
    confirmDialog.mockReturnValue(true);
    const group = { id: "f1", title: "工作", parentId: "1", childIndex: 2, bookmarks: [{ id: "b1", title: "W", url: "https://w" }] };
    const actions = createActions(bookmarksApi);

    await actions.deleteGroup(group);

    expect(confirmDialog).toHaveBeenCalled();
    expect(bookmarksApi.move).toHaveBeenCalledWith("b1", { parentId: "1" });
    expect(bookmarksApi.removeFolder).toHaveBeenCalledWith("f1");
  });

  it("keeps the group when deletion is not confirmed", async () => {
    const bookmarksApi = createFakeBookmarksApi([]);
    confirmDialog.mockReturnValue(false);
    const group = { id: "f1", title: "工作", parentId: "1", childIndex: 0, bookmarks: [] };
    const actions = createActions(bookmarksApi);

    await actions.deleteGroup(group);

    expect(bookmarksApi.removeFolder).not.toHaveBeenCalled();
  });

  it("adds a bookmark into the target section", async () => {
    const bookmarksApi = createFakeBookmarksApi([]);
    askText.mockResolvedValueOnce("https://example.com").mockResolvedValueOnce("例子");
    const actions = createActions(bookmarksApi);

    await actions.addBookmark({ parentId: "1" });

    expect(bookmarksApi.createBookmark).toHaveBeenCalledWith({ title: "例子", url: "https://example.com", parentId: "1" });
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

    await actions.moveBookmark("b1", "f9");

    expect(bookmarksApi.move).toHaveBeenCalledWith("b1", { parentId: "f9" });
  });

  it("reorders a group before a later target, compensating for the removal shift", async () => {
    const bookmarksApi = createFakeBookmarksApi([]);
    const actions = createActions(bookmarksApi);

    await actions.moveGroupBefore({ id: "f1", parentId: "1", childIndex: 1 }, { id: "f2", parentId: "1", childIndex: 3 });

    expect(bookmarksApi.move).toHaveBeenCalledWith("f1", { parentId: "1", index: 2 });
  });

  it("reorders a group before an earlier target without shift", async () => {
    const bookmarksApi = createFakeBookmarksApi([]);
    const actions = createActions(bookmarksApi);

    await actions.moveGroupBefore({ id: "f3", parentId: "1", childIndex: 3 }, { id: "f1", parentId: "1", childIndex: 0 });

    expect(bookmarksApi.move).toHaveBeenCalledWith("f3", { parentId: "1", index: 0 });
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
