import { STORAGE_KEYS, defaultBookmarks, BOOKMARKS_VERSION } from "../config/constants.js";

const FALLBACK_ICON = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><rect width='24' height='24' fill='%23ccc'/></svg>";

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

  bookmarkContainer.innerHTML = "";
  bookmarks.forEach((bookmark, index) => {
    const link = document.createElement("a");
    link.href = bookmark.url;
    link.className = "bookmark-item animate__animated animate__fadeInUp";
    link.style.setProperty("--bookmark-delay", `${0.2 + index * 0.07}s`);

    const iconWrap = document.createElement("span");
    iconWrap.className = "bookmark-icon-wrap";

    const image = document.createElement("img");
    image.src = bookmark.icon;
    image.onerror = () => {
      image.src = FALLBACK_ICON;
    };

    const title = document.createElement("span");
    title.textContent = bookmark.title;

    iconWrap.appendChild(image);
    link.appendChild(iconWrap);
    link.appendChild(title);

    link.addEventListener("click", (event) => {
      event.preventDefault();
      navigationApi.navigateWithTransition({
        mainContainer,
        url: bookmark.url,
        delayMs
      });
    });

    bookmarkContainer.appendChild(link);
  });
}
