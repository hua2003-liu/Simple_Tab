import {
  animateBookmarkEnter,
  animateBookmarkInteraction
} from "../lib/animations.js";

const FAVICON_SERVICE = "https://www.google.com/s2/favicons";
const INBOX_TITLE = "未整理";
// 全部书签都未分组时不渲染「未整理」标题——单区无需标注，保持页面简洁

const DRAG_BOOKMARK_TYPE = "text/x-bookmark-id";
const DRAG_GROUP_TYPE = "text/x-group-id";

function createDialogButton(text, onClick, modifier = "") {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `bookmark-dialog-btn ${modifier}`.trim();
  btn.textContent = text;
  btn.addEventListener("click", onClick);
  return btn;
}

// 扩展页面禁用 window.prompt，用页内输入对话框代替；返回 Promise<string|null>
export function createTextDialog() {
  return (label, initialValue = "") => new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "bookmark-dialog-overlay";

    const box = document.createElement("div");
    box.className = "bookmark-dialog";

    const labelEl = document.createElement("div");
    labelEl.className = "bookmark-dialog-label";
    labelEl.textContent = label;

    const input = document.createElement("input");
    input.type = "text";
    input.className = "bookmark-dialog-input";
    input.value = initialValue;

    const finish = (value) => {
      overlay.remove();
      resolve(value);
    };

    const buttons = document.createElement("div");
    buttons.className = "bookmark-dialog-buttons";
    buttons.appendChild(createDialogButton("取消", () => finish(null)));
    buttons.appendChild(createDialogButton("确定", () => finish(input.value.trim()), "primary"));

    box.appendChild(labelEl);
    box.appendChild(input);
    box.appendChild(buttons);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") finish(input.value.trim());
      if (event.key === "Escape") finish(null);
    });
    input.focus();
    input.select();
  });
}

function toBookmark(node) {
  return { id: node.id, title: node.title, url: node.url };
}

function byRecencyDesc(a, b) {
  return (b.dateAdded || 0) - (a.dateAdded || 0);
}

export function organizeBookmarkBar(barNode) {
  const children = barNode?.children || [];
  const isBookmark = (node) => Boolean(node.url);
  const isFolder = (node) => !node.url && Array.isArray(node.children);

  const inbox = children.filter(isBookmark).sort(byRecencyDesc).map(toBookmark);
  const groups = [];

  const walk = (nodes) => {
    nodes.forEach((node, childIndex) => {
      if (!isFolder(node)) return;
      groups.push({
        id: node.id,
        title: node.title,
        parentId: node.parentId,
        childIndex,
        bookmarks: node.children.filter(isBookmark).sort(byRecencyDesc).map(toBookmark)
      });
      walk(node.children);
    });
  };
  walk(children);

  return { barId: barNode?.id || null, inbox, groups };
}

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

export function createBookmarkActions({
  bookmarksApi,
  refresh,
  askText = createTextDialog(),
  confirmDialog = (message) => window.confirm(message)
}) {
  return {
    async createGroup() {
      const title = (await askText("新分组名称"))?.trim();
      if (!title) return;
      const bar = await bookmarksApi.getBookmarksBar();
      await bookmarksApi.createFolder(title, bar.id);
      await refresh();
    },

    async renameGroup(group) {
      const title = (await askText("重命名分组", group.title))?.trim();
      if (!title || title === group.title) return;
      await bookmarksApi.rename(group.id, title);
      await refresh();
    },

    // 保守策略：删除分组前先把组内书签移回该分组所在的上级，避免随树一起消失
    async deleteGroup(group) {
      if (!confirmDialog(`删除分组「${group.title}」？组内书签将移回上一层。`)) return;
      for (const bookmark of group.bookmarks) {
        await bookmarksApi.move(bookmark.id, { parentId: group.parentId });
      }
      await bookmarksApi.removeFolder(group.id);
      await refresh();
    },

    async addBookmark(section) {
      const url = await askText("书签 URL");
      if (!url) return;
      const title = (await askText("书签名称（留空则用 URL）")) || url;
      await bookmarksApi.createBookmark({ title, url, parentId: section.parentId });
      await refresh();
    },

    async deleteBookmark(bookmark) {
      if (!confirmDialog(`删除书签「${bookmark.title}」？`)) return;
      await bookmarksApi.removeBookmark(bookmark.id);
      await refresh();
    },

    async moveBookmark(bookmarkId, targetParentId) {
      await bookmarksApi.move(bookmarkId, { parentId: targetParentId });
      await refresh();
    },

    // Chrome 的 move index 以「移除被拖项之后」的 children 计算：
    // 向前（索引更小处）拖时目标位需要左移一位
    async moveGroupBefore(group, targetGroup) {
      if (group.id === targetGroup.id) return;
      const sameParent = group.parentId === targetGroup.parentId;
      const targetIndex = sameParent && group.childIndex < targetGroup.childIndex
        ? targetGroup.childIndex - 1
        : targetGroup.childIndex;
      await bookmarksApi.move(group.id, { parentId: targetGroup.parentId, index: targetIndex });
      await refresh();
    }
  };
}

export async function initBookmarks({ elements, bookmarksApi, navigationApi, delayMs }) {
  const { bookmarkContainer, mainContainer } = elements;

  if (!bookmarkContainer) return;

  // 最近一次渲染的组织结果，供 drop 处理查找书签所属区与被拖分组
  let current = null;
  const findBookmarkParentId = (data, bookmarkId) => {
    if (data.inbox.some((item) => item.id === bookmarkId)) return data.barId;
    return data.groups.find((group) => group.bookmarks.some((item) => item.id === bookmarkId))?.id || null;
  };
  const findGroup = (data, groupId) => data.groups.find((group) => group.id === groupId) || null;

  const refresh = async () => {
    let barNode;
    try {
      barNode = await bookmarksApi.getBookmarksBar();
    } catch (error) {
      console.warn("Failed to read the bookmarks bar.", error);
      barNode = null;
    }
    render(organizeBookmarkBar(barNode));
  };

  const actions = createBookmarkActions({ bookmarksApi, refresh });

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
      event.stopPropagation();
      onClick();
    });
    return btn;
  };

  const createBookmarkEl = (bookmark) => {
    const link = document.createElement("a");
    link.href = bookmark.url;
    link.className = "bookmark-item";
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
    link.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData(DRAG_BOOKMARK_TYPE, bookmark.id);
      event.dataTransfer.effectAllowed = "move";
    });
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

  const wireDropTarget = (section, { parentId, group }) => {
    section.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      section.classList.add("drag-over");
    });
    section.addEventListener("dragleave", () => {
      section.classList.remove("drag-over");
    });
    section.addEventListener("drop", async (event) => {
      event.preventDefault();
      section.classList.remove("drag-over");
      const bookmarkId = event.dataTransfer.getData(DRAG_BOOKMARK_TYPE);
      const groupId = event.dataTransfer.getData(DRAG_GROUP_TYPE);
      if (bookmarkId) {
        // 拖回原区不做任何事（move 到末尾会无意义地改变顺序）
        if (current && findBookmarkParentId(current, bookmarkId) === parentId) return;
        await actions.moveBookmark(bookmarkId, parentId);
      } else if (groupId && group && current) {
        const dragged = findGroup(current, groupId);
        if (!dragged) return;
        await actions.moveGroupBefore(dragged, group);
      }
    });
  };

  const createSection = (title, bookmarks, { parentId, group = null, showHeader = true } = {}) => {
    const section = document.createElement("div");
    section.className = "bookmark-section";
    section.dataset.parentId = parentId || "";

    if (showHeader) {
      const header = document.createElement("div");
      header.className = "bookmark-section-header";
      if (title) header.appendChild(createGroupTitle(title));

      const headerButtons = document.createElement("span");
      headerButtons.className = "bookmark-header-actions";
      headerButtons.appendChild(createHeaderButton("bookmark-add-bookmark", "＋", "添加书签", () => actions.addBookmark({ parentId })));

      if (group) {
        header.draggable = true;
        header.addEventListener("dragstart", (event) => {
          event.dataTransfer.setData(DRAG_GROUP_TYPE, group.id);
          event.dataTransfer.effectAllowed = "move";
        });
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

    wireDropTarget(section, { parentId, group });

    return section;
  };

  const render = ({ barId, inbox, groups }) => {
    current = { barId, inbox, groups };

    if (inbox.length === 0 && groups.length === 0) {
      const emptyNode = document.createElement("div");
      emptyNode.className = "bookmark-empty";
      emptyNode.textContent = "书签栏的书签会显示在这里，在浏览器中打开书签管理器即可添加";
      bookmarkContainer.replaceChildren(emptyNode);
      return;
    }

    // DeskBox 式格子：每个分组一张卡片，卡片内是小图标网格
    const cards = document.createElement("div");
    cards.className = "bookmark-cards";

    if (inbox.length > 0) {
      cards.appendChild(createSection(groups.length > 0 ? INBOX_TITLE : null, inbox, { parentId: barId, showHeader: true }));
    }
    groups.forEach((group) => {
      cards.appendChild(createSection(group.title, group.bookmarks, { parentId: group.id, group }));
    });

    bookmarkContainer.replaceChildren(cards);
    loadIcons(bookmarkContainer);
    animateBookmarkEnter(Array.from(bookmarkContainer.querySelectorAll(".bookmark-item")));
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

  await refresh();
}
