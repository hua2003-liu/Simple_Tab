import { STORAGE_KEYS, defaultBookmarks, BOOKMARKS_VERSION } from "../config/constants.js";

const FALLBACK_ICON = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><rect width='24' height='24' fill='%23ccc'/></svg>";
const PAGE_SIZE = 5;

export async function initBookmarks({ elements, storageApi, navigationApi, delayMs }) {
  const { bookmarkContainer, mainContainer } = elements;
  const storedData = await storageApi.storageGet([STORAGE_KEYS.bookmarks, STORAGE_KEYS.bookmarksVersion]);
  const storedVersion = storedData[STORAGE_KEYS.bookmarksVersion];
  const storedBookmarks = storedData[STORAGE_KEYS.bookmarks];

  const needsUpdate = !Array.isArray(storedBookmarks) || storedBookmarks.length === 0 || storedVersion !== BOOKMARKS_VERSION;
  const bookmarks = needsUpdate ? defaultBookmarks : storedBookmarks;

  if (needsUpdate) {
    await storageApi.storageSet({ [STORAGE_KEYS.bookmarks]: defaultBookmarks, [STORAGE_KEYS.bookmarksVersion]: BOOKMARKS_VERSION });
  }

  if (!bookmarkContainer) {
    return;
  }

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
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      onClick();
    });
    return btn;
  };

  const createBookmarkEl = (bookmark, index) => {
    const link = document.createElement("a");
    link.href = bookmark.url;
    link.className = "bookmark-item";
    link.style.setProperty("--bookmark-delay", `${index * 0.06}s`);

    const iconWrap = document.createElement("span");
    iconWrap.className = "bookmark-icon-wrap";

    const image = document.createElement("img");
    image.src = bookmark.icon;
    image.onerror = () => { image.src = FALLBACK_ICON; };

    const title = document.createElement("span");
    title.textContent = bookmark.title;

    iconWrap.appendChild(image);
    link.appendChild(iconWrap);
    link.appendChild(title);

    link.addEventListener("click", (event) => {
      event.preventDefault();
      navigationApi.navigateWithTransition({ mainContainer, url: bookmark.url, delayMs });
    });

    return link;
  };

  const renderPage = () => {
    bookmarkContainer.innerHTML = "";
    const start = page * PAGE_SIZE;
    const items = bookmarks.slice(start, start + PAGE_SIZE);

    items.forEach((bookmark, i) => {
      const el = createBookmarkEl(bookmark, i);
      el.classList.add("bookmark-page-enter");
      bookmarkContainer.appendChild(el);
    });

    prevBtn.style.visibility = page === 0 ? "hidden" : "visible";
    nextBtn.style.visibility = page >= totalPages - 1 ? "hidden" : "visible";
  };

  const flipPage = (direction) => {
    if (transitioning) return;
    const newPage = page + direction;
    if (newPage < 0 || newPage >= totalPages) return;

    transitioning = true;
    const exitClass = direction > 0 ? "bookmark-page-exit-left" : "bookmark-page-exit-right";

    const items = bookmarkContainer.querySelectorAll(".bookmark-item");
    items.forEach(el => el.classList.add(exitClass));

    setTimeout(() => {
      page = newPage;
      renderPage();
      transitioning = false;
    }, 280);
  };

  const prevBtn = createNavButton("prev", () => flipPage(-1));
  const nextBtn = createNavButton("next", () => flipPage(1));

  const parent = bookmarkContainer.parentNode;
  parent.replaceChild(wrapper, bookmarkContainer);
  wrapper.appendChild(prevBtn);
  wrapper.appendChild(bookmarkContainer);
  wrapper.appendChild(nextBtn);

  renderPage();

  document.addEventListener("keydown", (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.key === "ArrowLeft") flipPage(-1);
    else if (e.key === "ArrowRight") flipPage(1);
  });
}
