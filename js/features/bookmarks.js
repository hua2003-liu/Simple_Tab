import { STORAGE_KEYS, defaultBookmarks, BOOKMARKS_VERSION } from "../config/constants.js";
import {
  animateBookmarkEnter,
  animateBookmarkExit,
  animateBookmarkInteraction,
  animateBookmarkNavigation
} from "../lib/animations.js";

const FALLBACK_ICON = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><rect width='24' height='24' fill='%23ccc'/></svg>";
const PAGE_SIZE = 5;
const FAVICON_SERVICE = "https://www.google.com/s2/favicons";

function getRemoteFavicon(url) {
  try {
    const hostname = new URL(url).hostname;
    return `${FAVICON_SERVICE}?domain=${encodeURIComponent(hostname)}&sz=128`;
  } catch {
    return "";
  }
}

function migrateKnownLocalIcon(bookmark) {
  if (!bookmark?.url || !/^https?:/.test(bookmark.icon || "")) {
    return bookmark;
  }

  let hostname;
  try {
    hostname = new URL(bookmark.url).hostname;
  } catch {
    return bookmark;
  }

  const localIcon = {
    "google.com": "assets/icons/google.png",
    "chatgpt.com": "assets/icons/chatgpt.png",
    "x.com": "assets/icons/x.png",
    "youtube.com": "assets/icons/youtube.png",
    "fanyi.baidu.com": "assets/icons/baidu-translate.png",
    "github.com": "assets/icons/github.png",
    "bigmodel.cn": "assets/icons/bigmodel.png",
    "hellogithub.com": "assets/icons/hellogithub.png",
    "skills.sh": "assets/icons/skills-sh.png",
    "skillsmp.com": "assets/icons/skillsmp.png"
  }[hostname];

  return localIcon ? { ...bookmark, icon: localIcon } : bookmark;
}

function migrateDefaultBookmark(bookmark, index, storedVersion) {
  const isOldDefault = index === 0
    && storedVersion < BOOKMARKS_VERSION
    && bookmark?.title === "Google"
    && /^https?:\/\/(www\.)?google\.com\/?$/.test(bookmark.url || "");

  return isOldDefault ? defaultBookmarks[0] : migrateKnownLocalIcon(bookmark);
}

export async function initBookmarks({ elements, storageApi, navigationApi, delayMs }) {
  const { bookmarkContainer, mainContainer } = elements;
  const storedData = await storageApi.storageGet([STORAGE_KEYS.bookmarks, STORAGE_KEYS.bookmarksVersion]);
  const storedVersion = storedData[STORAGE_KEYS.bookmarksVersion];
  const storedBookmarks = storedData[STORAGE_KEYS.bookmarks];

  const needsDefaults = !Array.isArray(storedBookmarks) || storedBookmarks.length === 0;
  const bookmarks = needsDefaults
    ? defaultBookmarks
    : storedBookmarks.map((bookmark, index) => migrateDefaultBookmark(bookmark, index, storedVersion));

  if (needsDefaults || storedVersion !== BOOKMARKS_VERSION) {
    await storageApi.storageSet({
      [STORAGE_KEYS.bookmarks]: bookmarks,
      [STORAGE_KEYS.bookmarksVersion]: BOOKMARKS_VERSION
    });
  }

  if (!bookmarkContainer) return;

  let page = 0;
  let transitioning = false;
  const totalPages = Math.ceil(bookmarks.length / PAGE_SIZE);

  const wrapper = document.createElement("div");
  wrapper.className = "bookmark-wrapper";
  wrapper.style.display = "flex";
  wrapper.style.alignItems = "center";
  wrapper.style.gap = "12px";

  const createNavButton = (direction, onClick) => {
    const btn = document.createElement("button");
    btn.className = `bookmark-nav-btn bookmark-nav-${direction}`;
    btn.ariaLabel = direction === "prev" ? "Previous" : "Next";
    btn.innerHTML = direction === "prev" ? "&#8249;" : "&#8250;";
    btn.style.flexShrink = "0";
    btn.addEventListener("mouseenter", () => animateBookmarkNavigation(btn, direction === "next" ? 1 : -1));
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      onClick();
    });
    return btn;
  };

  const createBookmarkEl = (bookmark) => {
    const link = document.createElement("a");
    link.href = bookmark.url;
    link.className = "bookmark-item";

    const iconWrap = document.createElement("span");
    iconWrap.className = "bookmark-icon-wrap";

    const image = document.createElement("img");
    image.width = 32;
    image.height = 32;
    image.decoding = "async";
    image.dataset.src = bookmark.icon;
    image.dataset.requested = "false";
    const isBundledIcon = /^assets\//i.test(bookmark.icon || "");
    const remoteIcon = isBundledIcon ? "" : getRemoteFavicon(bookmark.url);
    let networkFallbackTried = isBundledIcon || /^https?:/i.test(bookmark.icon || "");
    image.onerror = () => {
      if (!networkFallbackTried && remoteIcon) {
        networkFallbackTried = true;
        image.src = remoteIcon;
        return;
      }
      image.onerror = null;
      image.src = FALLBACK_ICON;
    };

    const title = document.createElement("span");
    title.className = "bookmark-label";
    title.textContent = bookmark.title;

    const motion = document.createElement("span");
    motion.className = "bookmark-motion";
    iconWrap.appendChild(image);
    motion.appendChild(iconWrap);
    motion.appendChild(title);
    link.appendChild(motion);

    link.addEventListener("click", (event) => {
      event.preventDefault();
      navigationApi.navigateWithTransition({ mainContainer, url: bookmark.url, delayMs });
    });
    link.addEventListener("mouseenter", () => animateBookmarkInteraction(link, true));
    link.addEventListener("mouseleave", () => animateBookmarkInteraction(link, false));
    link.addEventListener("focusin", () => animateBookmarkInteraction(link, true));
    link.addEventListener("focusout", () => animateBookmarkInteraction(link, false));

    return link;
  };

  const loadPageIcons = (items) => {
    items.forEach((item) => {
      const image = item.querySelector("img");
      if (image && image.dataset.requested !== "true") {
        image.dataset.requested = "true";
        image.src = image.dataset.src;
      }
    });
  };

  const pageStates = Array.from({ length: totalPages }, (_, pageIndex) => {
    const pageNode = document.createElement("div");
    pageNode.className = "bookmark-page";
    pageNode.hidden = pageIndex !== 0;

    const items = bookmarks
      .slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE)
      .map(createBookmarkEl);
    items.forEach((item) => pageNode.appendChild(item));

    return { node: pageNode, items };
  });

  const updateNavigation = () => {
    prevBtn.style.visibility = page === 0 ? "hidden" : "visible";
    nextBtn.style.visibility = page >= totalPages - 1 ? "hidden" : "visible";
  };

  const showPage = (nextPage, animate = true) => {
    page = nextPage;
    pageStates.forEach((state, index) => {
      state.node.hidden = index !== page;
    });
    const activeState = pageStates[page];
    loadPageIcons(activeState.items);
    if (animate) animateBookmarkEnter(activeState.items);
    updateNavigation();
  };

  const flipPage = (direction) => {
    if (transitioning) return;
    const newPage = page + direction;
    if (newPage < 0 || newPage >= totalPages) return;

    transitioning = true;
    const currentState = pageStates[page];
    const nextState = pageStates[newPage];
    animateBookmarkExit(currentState.items, direction, () => {
      currentState.node.hidden = true;
      nextState.node.hidden = false;
      page = newPage;
      loadPageIcons(nextState.items);
      animateBookmarkEnter(nextState.items);
      updateNavigation();
      transitioning = false;
    });
  };

  const prevBtn = createNavButton("prev", () => flipPage(-1));
  const nextBtn = createNavButton("next", () => flipPage(1));

  const parent = bookmarkContainer.parentNode;
  parent.replaceChild(wrapper, bookmarkContainer);
  wrapper.appendChild(prevBtn);
  wrapper.appendChild(bookmarkContainer);
  wrapper.appendChild(nextBtn);
  bookmarkContainer.replaceChildren(...pageStates.map((state) => state.node));

  showPage(0);

  document.addEventListener("keydown", (event) => {
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (event.key === "ArrowLeft") flipPage(-1);
    else if (event.key === "ArrowRight") flipPage(1);
  });
}
