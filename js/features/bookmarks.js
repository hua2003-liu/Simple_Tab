import {
  animateBookmarkGroups,
  animateBookmarkInteraction,
  animateBookmarkLayout
} from "../lib/animations.js";
import { STORAGE_KEYS } from "../config/constants.js";
import { createBookmarkActions } from "./bookmark-actions.js";
import { getBookmarkDropDestination, organizeBookmarkBar, sameOrder } from "./bookmark-rules.js";
import { createBookmarkDragController } from "./bookmark-drag-controller.js";

const FAVICON_SERVICE = "https://www.google.com/s2/favicons";
const INBOX_TITLE = "未整理";
// 全部书签都未分组时不渲染「未整理」标题——单区无需标注，保持页面简洁

function getRemoteFavicon(url) {
  // 优先用浏览器自己的 favicon 缓存（需要 manifest 的 favicon 权限），
  // 与收藏栏上看到的图标一致；无 chrome 环境时退回在线服务
  try {
    if (chrome.runtime?.getURL) {
      return chrome.runtime.getURL(`/_favicon/?pageUrl=${encodeURIComponent(url)}&size=32`);
    }
  } catch {
    // fall through
  }
  return getOnlineFavicon(url);
}

// 在线高清源：缓存里的低清小图的升级备选（网络不通时静默保持缓存图）
function getOnlineFavicon(url) {
  try {
    const hostname = new URL(url).hostname;
    return `${FAVICON_SERVICE}?domain=${encodeURIComponent(hostname)}&sz=128`;
  } catch {
    return "";
  }
}

function upgradeLowResFavicon(image, url) {
  if (image.dataset.upgraded) return;
  if (!image.naturalWidth || image.naturalWidth > 16) return;

  const online = getOnlineFavicon(url);
  if (!online || online === image.src) return;

  image.dataset.upgraded = "true";
  const probe = new Image();
  probe.onload = () => {
    image.src = online;
  };
  probe.src = online;
}

function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

// favicon 也拿不到时的兜底：首字母 + 按域名哈希的底色
function createLetterIcon(bookmark, hostname) {
  const letter = (bookmark.title || hostname || "?").trim().charAt(0).toUpperCase();
  const seed = hostname || bookmark.title || "?";
  const hue = Array.from(seed).reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 360;
  const icon = document.createElement("span");
  icon.className = "bookmark-letter-icon";
  icon.style.background = `hsl(${hue}, 42%, 40%)`;
  icon.textContent = letter;
  return icon;
}

function mergeGroupOrder(savedOrder, groups) {
  const availableIds = new Set(groups.map((group) => group.id));
  const nextOrder = [];
  const seen = new Set();

  if (Array.isArray(savedOrder)) {
    savedOrder.forEach((id) => {
      if (typeof id !== "string" || !availableIds.has(id) || seen.has(id)) return;
      seen.add(id);
      nextOrder.push(id);
    });
  }

  groups.forEach(({ id }) => {
    if (seen.has(id)) return;
    seen.add(id);
    nextOrder.push(id);
  });

  return nextOrder;
}

function groupsInOrder(groups, order) {
  const groupsById = new Map(groups.map((group) => [group.id, group]));
  return order.map((id) => groupsById.get(id)).filter(Boolean);
}

export async function initBookmarks({ elements, bookmarksApi, storageApi, navigationApi, dialogs, delayMs, initialLoadTimeoutMs = 5000 }) {
  const { bookmarkContainer, mainContainer } = elements;

  if (!bookmarkContainer) return;

  const skeleton = bookmarkContainer.querySelector(".bookmark-skeleton");
  let current = null;
  let hasRendered = false;
  let latestRefreshId = 0;
  let groupOrder = [];
  let orderWritePromise = Promise.resolve();
  const groupOrderReady = (async () => {
    try {
      const stored = await storageApi?.storageGet?.([STORAGE_KEYS.bookmarkGroupOrder]);
      groupOrder = stored?.[STORAGE_KEYS.bookmarkGroupOrder];
      if (!Array.isArray(groupOrder)) groupOrder = [];
    } catch (error) {
      console.warn("Failed to read bookmark group order.", error);
      groupOrder = [];
    }
  })();
  const persistGroupOrder = (nextOrder) => {
    groupOrder = [...nextOrder];
    if (!storageApi?.storageSet) return Promise.resolve();

    const orderToSave = [...groupOrder];
    orderWritePromise = orderWritePromise
      .catch(() => {})
      .then(() => storageApi.storageSet({ [STORAGE_KEYS.bookmarkGroupOrder]: orderToSave }))
      .catch((error) => console.warn("Failed to save bookmark group order.", error));
    return orderWritePromise;
  };
  let initialLoadTimeoutId = null;
  let initialLoadResolved = false;
  let resolveInitialLoad;
  const initialLoadPromise = new Promise((resolve) => {
    resolveInitialLoad = resolve;
  });
  const finishInitialLoad = (status) => {
    if (initialLoadResolved) return;
    initialLoadResolved = true;
    clearTimeout(initialLoadTimeoutId);
    bookmarkContainer.classList.remove("is-loading");
    bookmarkContainer.classList.add("is-ready");
    resolveInitialLoad(status);
  };
  const replaceBookmarkContent = (content) => {
    bookmarkContainer.replaceChildren(...[skeleton, content].filter(Boolean));
  };
  const findGroup = (data, groupId) => data.groups.find((group) => group.id === groupId) || null;
  const captureBookmarkLayout = () => {
    const positions = new Map();
    bookmarkContainer.querySelectorAll(".bookmark-section[data-layout-key]").forEach((section) => {
      const rect = section.getBoundingClientRect();
      positions.set(section.dataset.layoutKey, { left: rect.left, top: rect.top });
    });
    return positions;
  };
  const getRenderedSections = () => Array.from(bookmarkContainer.querySelectorAll(".bookmark-section"));
  let dragController;
  const reorderGroup = (draggedId, targetId) => {
    const draggedIndex = groupOrder.indexOf(draggedId);
    const targetIndex = groupOrder.indexOf(targetId);
    if (draggedIndex < 0 || targetIndex < 0 || draggedIndex === targetIndex) return;

    const nextOrder = [...groupOrder];
    [nextOrder[draggedIndex], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[draggedIndex]];

    const previousPositions = captureBookmarkLayout();
    const cards = bookmarkContainer.querySelector(".bookmark-cards");
    if (!cards) return;
    const sectionsById = new Map(getRenderedSections()
      .filter((section) => section.dataset.groupId)
      .map((section) => [section.dataset.groupId, section]));

    groupOrder = nextOrder;
    nextOrder.forEach((id) => {
      const section = sectionsById.get(id);
      if (section) cards.appendChild(section);
    });
    animateBookmarkLayout(previousPositions, getRenderedSections());
    void persistGroupOrder(nextOrder);
  };

  const renderLoadError = (message) => {
    const error = document.createElement("div");
    error.className = "bookmark-empty bookmark-load-error";
    error.setAttribute("role", "status");
    error.setAttribute("aria-live", "polite");

    const text = document.createElement("span");
    text.textContent = message;

    const retryButton = document.createElement("button");
    retryButton.type = "button";
    retryButton.className = "bookmark-retry";
    retryButton.textContent = "重试";
    retryButton.addEventListener("click", () => {
      void refresh();
    });

    error.append(text, retryButton);
    replaceBookmarkContent(error);
  };

  const refresh = async () => {
    const refreshId = ++latestRefreshId;
    try {
      const [barNode] = await Promise.all([
        bookmarksApi.getBookmarksBar(),
        groupOrderReady
      ]);
      if (refreshId !== latestRefreshId) return "stale";
      render(organizeBookmarkBar(barNode));
      finishInitialLoad("loaded");
      return "loaded";
    } catch (error) {
      if (refreshId !== latestRefreshId) return "stale";
      console.warn("Failed to read the bookmarks bar.", error);
      if (!hasRendered) {
        renderLoadError("书签暂时无法加载。");
        finishInitialLoad("error");
      }
      return "error";
    }
  };

  const actions = createBookmarkActions({
    bookmarksApi,
    refresh,
    askText: dialogs.askText,
    confirmDialog: dialogs.confirm
  });

  const createGroupTitle = (title) => {
    const heading = document.createElement("span");
    heading.className = "bookmark-group-title";
    heading.textContent = title;
    return heading;
  };

  const createHeaderButton = (className, text, title, onClick) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `bookmark-header-btn ${className}`;
    btn.textContent = text;
    btn.title = title;
    btn.setAttribute("aria-label", title);
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
    return btn;
  };

  const createBookmarkEl = (bookmark) => {
    const link = document.createElement("a");
    link.href = bookmark.url;
    link.className = "bookmark-item";
    link.dataset.bookmarkId = bookmark.id;
    link.setAttribute("draggable", "true");

    const hostname = getHostname(bookmark.url);
    const iconWrap = document.createElement("span");
    iconWrap.className = "bookmark-icon-wrap";

    const image = document.createElement("img");
    image.width = 32;
    image.height = 32;
    image.decoding = "async";
    image.dataset.src = getRemoteFavicon(bookmark.url);
    image.dataset.requested = "false";
    if (!image.dataset.src) {
      // 无任何图标来源：直接用首字母色块
      image.replaceWith(createLetterIcon(bookmark, hostname));
    }
    image.onerror = () => {
      image.onerror = null;
      // 连浏览器缓存都没有时，退到首字母色块
      image.replaceWith(createLetterIcon(bookmark, hostname));
    };
    image.addEventListener("load", () => upgradeLowResFavicon(image, bookmark.url));

    const title = document.createElement("span");
    title.className = "bookmark-label";
    title.textContent = bookmark.title?.trim() || hostname || bookmark.url;

    const deleteBtn = createHeaderButton("bookmark-item-delete", "✕", "删除书签", () => actions.deleteBookmark(bookmark));

    const motion = document.createElement("span");
    motion.className = "bookmark-motion";
    iconWrap.appendChild(image);
    motion.appendChild(iconWrap);
    motion.appendChild(title);
    link.appendChild(motion);
    link.appendChild(deleteBtn);

    link.addEventListener("click", (event) => {
      event.preventDefault();
      navigationApi.navigateWithTransition({ mainContainer, url: bookmark.url, delayMs });
    });
    dragController.wireBookmark(link, bookmark.id);
    link.addEventListener("mouseenter", () => animateBookmarkInteraction(link, true));
    link.addEventListener("mouseleave", () => animateBookmarkInteraction(link, false));
    link.addEventListener("focusin", () => animateBookmarkInteraction(link, true));
    link.addEventListener("focusout", () => animateBookmarkInteraction(link, false));

    return link;
  };

  const loadIcons = (root) => {
    root.querySelectorAll("img").forEach((image) => {
      if (image.dataset.requested !== "true") {
        image.dataset.requested = "true";
        image.src = image.dataset.src;
      }
    });
  };

  const moveDroppedBookmark = async (bookmarkId, event, parentId, targetItem = null) => {
    const rect = targetItem?.getBoundingClientRect();
    const beforeTarget = !rect || event.clientX < rect.left + rect.width / 2;
    const destination = getBookmarkDropDestination(
      current,
      bookmarkId,
      parentId,
      targetItem?.dataset.bookmarkId || null,
      beforeTarget
    );
    dragController.stop();
    if (destination) await actions.moveBookmark(bookmarkId, destination);
  };
  dragController = createBookmarkDragController({
    container: bookmarkContainer,
    requestFrame: window.requestAnimationFrame?.bind(window)
      || ((callback) => window.setTimeout(callback, 16)),
    cancelFrame: window.cancelAnimationFrame?.bind(window)
      || ((frame) => window.clearTimeout(frame)),
    onBookmarkDrop: (bookmarkId, event, parentId, targetItem) => moveDroppedBookmark(bookmarkId, event, parentId || current.barId, targetItem),
    onGroupDrop: (draggedId, targetId) => {
      if (findGroup(current, draggedId) && findGroup(current, targetId)) reorderGroup(draggedId, targetId);
    }
  });

  const createSection = (title, bookmarks, { parentId, group = null, showHeader = true } = {}) => {
    const section = document.createElement("div");
    section.className = "bookmark-section";
    section.dataset.parentId = parentId || "";
    section.dataset.layoutKey = group ? group.id : "inbox";
    if (group) section.dataset.groupId = group.id;

    if (showHeader) {
      const header = document.createElement("div");
      header.className = "bookmark-section-header";
      if (title) {
        const groupTitle = createGroupTitle(title);
        if (group) {
          dragController.wireGroupTitle(groupTitle, group, section);
        }
        header.appendChild(groupTitle);
      }

      const headerButtons = document.createElement("span");
      headerButtons.className = "bookmark-header-actions";
      headerButtons.appendChild(createHeaderButton("bookmark-add-bookmark", "＋", "添加书签", () => actions.addBookmark({ parentId })));

      if (group) {
        headerButtons.appendChild(createHeaderButton("bookmark-group-rename", "✎", "重命名分组", () => actions.renameGroup(group)));
        headerButtons.appendChild(createHeaderButton("bookmark-group-delete", "✕", "删除分组", () => actions.deleteGroup(group)));
      }

      header.appendChild(headerButtons);
      section.appendChild(header);
    }

    const grid = document.createElement("div");
    grid.className = "bookmark-grid";
    bookmarks.map(createBookmarkEl).forEach((item) => grid.appendChild(item));
    section.appendChild(grid);

    dragController.wireDropTarget(section, { parentId, group });

    return section;
  };

  const render = ({ barId, inbox, groups, childIdsByParent }) => {
    const isInitialRender = !hasRendered;
    const previousPositions = hasRendered ? captureBookmarkLayout() : null;
    const nextOrder = mergeGroupOrder(groupOrder, groups);
    if (!sameOrder(groupOrder, nextOrder)) void persistGroupOrder(nextOrder);
    else groupOrder = nextOrder;
    current = { barId, inbox, groups, childIdsByParent };

    if (inbox.length === 0 && groups.length === 0) {
      const emptyNode = document.createElement("div");
      emptyNode.className = "bookmark-empty bookmark-empty-drop-target";
      emptyNode.textContent = "书签栏的书签会显示在这里，在浏览器中打开书签管理器即可添加";
      dragController.wireDropTarget(emptyNode, { parentId: barId, group: null });
      replaceBookmarkContent(emptyNode);
      hasRendered = true;
      return;
    }

    // DeskBox 式格子：每个分组一张卡片，卡片内是小图标网格
    const cards = document.createElement("div");
    cards.className = "bookmark-cards";

    if (inbox.length > 0) {
      cards.appendChild(createSection(groups.length > 0 ? INBOX_TITLE : null, inbox, { parentId: barId, showHeader: true }));
    }
    groupsInOrder(groups, groupOrder).forEach((group) => {
      cards.appendChild(createSection(group.title, group.bookmarks, { parentId: group.id, group }));
    });
    if (inbox.length === 0 && groups.length > 0) dragController.wireInboxBackground(cards, barId);

    replaceBookmarkContent(cards);
    loadIcons(bookmarkContainer);
    const sections = Array.from(cards.querySelectorAll(".bookmark-section"));
    if (isInitialRender) animateBookmarkGroups(sections);
    else animateBookmarkLayout(previousPositions, sections);
    hasRendered = true;
  };

  // 浏览器变更事件（含我们自己写操作触发的）批量到达时只刷一次
  let refreshTimer = null;
  const scheduleRefresh = () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => void refresh(), 120);
  };

  bookmarksApi.addChangeListener(scheduleRefresh);

  // 「新建分组」入口在设置面板里
  elements.bookmarkAddGroup?.addEventListener("click", () => actions.createGroup());

  initialLoadTimeoutId = setTimeout(() => {
    latestRefreshId += 1;
    renderLoadError("书签加载超时，请重试。");
    finishInitialLoad("timeout");
  }, initialLoadTimeoutMs);
  void refresh();
  return initialLoadPromise;
}
