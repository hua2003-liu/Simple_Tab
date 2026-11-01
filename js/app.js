import { MAX_HISTORY_ITEMS, NAVIGATION_DELAY_MS } from "./config/constants.js";
import { initBookmarks } from "./features/bookmarks.js";
import { initProfile } from "./features/profile.js";
import { createSearchHistoryController } from "./features/search-history-controller.js";
import { createSearchHistoryStore } from "./features/search-history-store.js";
import { initSearch } from "./features/search.js";
import { initSettings } from "./features/settings.js";
import { createThemeController } from "./features/theme.js";
import { initWallpaper } from "./features/wallpaper.js";
import { navigateWithTransition } from "./lib/navigation.js";
import { createBookmarksApi } from "./lib/chrome-bookmarks.js";
import { createPackageWallpaperSource } from "./lib/chrome-wallpapers.js";
import { ensureInitialData, storageGet, storageSet } from "./lib/storage.js";
import { getElements } from "./ui/elements.js";
import { animateBookmarkEnter, animatePageEnter } from "./lib/animations.js";
import {
  renderHistoryList,
  setHistoryVisibility,
  syncActiveHistoryItem,
  updateSearchPresentation
} from "./ui/search-ui.js";
import {
  closeSettingsPanel,
  openSettingsPanel
} from "./ui/settings-ui.js";

// 模块脚本从导航开始到执行完成的耗时（含 vendor gsap 下载），与 bootstrap 内部耗时分开量
const MODULE_LOAD_MS = Math.round(performance.now());

async function bootstrap() {
  const t0 = performance.now();
  // 临时诊断：新标签页冷启动时控制台不在场，把计时存进 localStorage 供事后查看
  const times = [`modules ready: ${MODULE_LOAD_MS}ms`];
  const mark = (label) => {
    const at = Math.round(performance.now() - t0);
    times.push(`${label}: +${at}ms`);
    try {
      localStorage.setItem("__bootTimes", JSON.stringify(times));
    } catch {
      // ignore
    }
  };
  mark("start");

  const elements = getElements();
  const storageApi = {
    storageGet,
    storageSet
  };
  const navigationApi = {
    navigateWithTransition
  };
  const bookmarksApi = createBookmarksApi();
  const searchUi = {
    renderHistoryList,
    setHistoryVisibility,
    syncActiveHistoryItem,
    updateSearchPresentation
  };
  const settingsUi = {
    closeSettingsPanel,
    openSettingsPanel
  };
  const searchHistoryStore = createSearchHistoryStore({
    storageApi,
    maxHistoryItems: MAX_HISTORY_ITEMS
  });
  const searchHistoryController = createSearchHistoryController({
    historyContainer: elements.historyContainer,
    searchInput: elements.searchInput,
    searchUi
  });
  const themeController = createThemeController({
    greetingElement: elements.greeting
  });

  const wallpaperPromise = initWallpaper({
    storageApi,
    wallpaperSource: createPackageWallpaperSource(),
    pinButton: elements.wallpaperPinToggle
  }).then(() => mark("wallpaper done")).catch((error) => {
    console.warn("Wallpaper loading failed; using the fallback background.", error);
  });

  await ensureInitialData();
  mark("ensureInitialData done");
  themeController.applyTheme();

  // 书签要读整棵书签树并渲染大量卡片，不阻塞加载画面的撤销
  initBookmarks({
    elements,
    bookmarksApi,
    navigationApi,
    delayMs: NAVIGATION_DELAY_MS
  }).then(() => mark("bookmarks done")).catch((error) => {
    console.warn("Bookmarks init failed.", error);
  });

  await Promise.all([
    initProfile({
      displayNameInput: elements.displayNameInput,
      storageApi,
      onDisplayNameChange: (displayName) => {
        themeController.updateDisplayName(displayName);
      }
    }),
    initSearch({
      elements,
      storageApi,
      navigationApi,
      searchUi,
      searchHistoryStore,
      searchHistoryController,
      constants: {
        maxHistoryItems: MAX_HISTORY_ITEMS,
        navigationDelayMs: NAVIGATION_DELAY_MS
      }
    }),
    initSettings({
      elements,
      storageApi,
      settingsUi,
      searchPresentationUpdater: updateSearchPresentation
    })
  ]);

  document.body.classList.remove("app-loading");
  mark("app-loading removed");
  // 书签入场动画在 bootstrap 期间被 app-loading 分支搁置，这里补播
  animateBookmarkEnter(Array.from(elements.bookmarkContainer?.querySelectorAll(".bookmark-item") || []));
  animatePageEnter({
    greeting: elements.greeting,
    searchModule: elements.searchInput?.closest(".search-module"),
    // Bookmark items own their entrance timeline; do not animate the outer module.
    bookmarkModule: null,
    toolbar: document.querySelector(".toolbar")
  });

  void wallpaperPromise;
}

document.addEventListener("DOMContentLoaded", () => {
  void bootstrap().catch((error) => {
    console.error("App bootstrap failed.", error);
    document.body.classList.remove("app-loading");
  });
});
