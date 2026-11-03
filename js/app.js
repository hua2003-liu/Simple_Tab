import { MAX_HISTORY_ITEMS, NAVIGATION_DELAY_MS } from "./config/constants.js";
import { initBookmarks } from "./features/bookmarks.js";
import { initProfile } from "./features/profile.js";
import { createSearchHistoryController } from "./features/search-history-controller.js";
import { createSearchHistoryStore } from "./features/search-history-store.js";
import { initSearch } from "./features/search.js";
import { createSearchPreference } from "./lib/search-preference.js";
import { initSettings } from "./features/settings.js";
import { createThemeController } from "./features/theme.js";
import { initWallpaper } from "./features/wallpaper.js";
import { runAppLifecycle } from "./app-lifecycle.js";
import { navigateWithTransition } from "./lib/navigation.js";
import { createBookmarksApi } from "./lib/chrome-bookmarks.js";
import { createPackageWallpaperSource } from "./lib/chrome-wallpapers.js";
import { createStorageApi } from "./lib/storage.js";
import { ensureInitialData } from "./lib/initial-data.js";
import { getElements } from "./ui/elements.js";
import { createDialogs } from "./lib/dialogs.js";
import { animateBookmarkGroups, animatePageEnter } from "./lib/animations.js";
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

function bootstrap() {
  const elements = getElements();
  const storageApi = createStorageApi(chrome.storage.local, chrome.runtime);
  const searchPreference = createSearchPreference({ storageApi });
  const navigationApi = {
    navigateWithTransition
  };
  const bookmarksApi = createBookmarksApi();
  const dialogs = createDialogs();
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

  const tasks = {
    startWallpaper: () => initWallpaper({
      storageApi,
      wallpaperSource: createPackageWallpaperSource(),
      pinButton: elements.wallpaperPinToggle
    }).catch((error) => {
      console.warn("Wallpaper loading failed; using the fallback background.", error);
    }),
    startBookmarks: () => initBookmarks({
      elements,
      bookmarksApi,
      storageApi,
      navigationApi,
      dialogs,
      delayMs: NAVIGATION_DELAY_MS,
      initialLoadTimeoutMs: 5000
    }).catch((error) => {
      console.warn("Bookmarks init failed.", error);
      return "error";
    }),
    removeLegacyData: () => storageApi.storageRemove(["bookmarks", "bookmarks_version"]),
    ensureInitialData: () => ensureInitialData({ storageApi }),
    applyTheme: () => themeController.applyTheme(),
    startProfile: () => initProfile({
      displayNameInput: elements.displayNameInput,
      storageApi,
      onDisplayNameChange: (displayName) => {
        themeController.updateDisplayName(displayName);
      }
    }),
    startSearch: () => initSearch({
      elements,
      searchPreference,
      navigationApi,
      searchHistoryStore,
      searchHistoryController,
      constants: {
        maxHistoryItems: MAX_HISTORY_ITEMS,
        navigationDelayMs: NAVIGATION_DELAY_MS
      }
    }),
    startSettings: () => initSettings({
      elements,
      storageApi,
      searchPreference,
      settingsUi,
      searchPresentationUpdater: updateSearchPresentation
    }),
    animate: () => {
      animateBookmarkGroups(Array.from(elements.bookmarkContainer?.querySelectorAll(".bookmark-section") || []));
      animatePageEnter({
        greeting: elements.greeting,
        searchModule: elements.searchInput?.closest(".search-module"),
        // Bookmark items own their entrance timeline; do not animate the outer module.
        bookmarkModule: null,
        toolbar: document.querySelector(".toolbar")
      });
    }
  };

  return runAppLifecycle({
    tasks,
    elements: {
      ...elements,
      body: document.body
    },
    clock: {
      now: () => performance.now(),
      wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms))
    },
    recordError: (message, error) => {
      if (message === "App bootstrap failed.") {
        console.error(message, error);
      } else {
        console.warn(message, error);
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  void bootstrap();
});
