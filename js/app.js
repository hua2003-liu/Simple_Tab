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
import { ensureInitialData, storageGet, storageSet } from "./lib/storage.js";
import { getElements } from "./ui/elements.js";
import {
  renderHistoryList,
  setHistoryVisibility,
  syncActiveHistoryItem,
  updateSearchPresentation
} from "./ui/search-ui.js";
import {
  closeSettingsPanel,
  openSettingsPanel,
  updateThemePreviewControls
} from "./ui/settings-ui.js";

async function bootstrap() {
  const elements = getElements();
  const storageApi = {
    storageGet,
    storageSet
  };
  const navigationApi = {
    navigateWithTransition
  };
  const searchUi = {
    renderHistoryList,
    setHistoryVisibility,
    syncActiveHistoryItem,
    updateSearchPresentation
  };
  const settingsUi = {
    closeSettingsPanel,
    openSettingsPanel,
    updateThemePreviewControls
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

  await ensureInitialData();
  await initWallpaper();
  themeController.applyTheme();
  await initProfile({
    displayNameInput: elements.displayNameInput,
    storageApi,
    onDisplayNameChange: (displayName) => {
      themeController.updateDisplayName(displayName);
    }
  });
  await initSearch({
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
  });
  await initBookmarks({
    elements,
    storageApi,
    navigationApi,
    delayMs: NAVIGATION_DELAY_MS
  });
  await initSettings({
    elements,
    storageApi,
    settingsUi,
    themeController,
    searchPresentationUpdater: updateSearchPresentation
  });
}

document.addEventListener("DOMContentLoaded", () => {
  void bootstrap().catch((error) => {
    console.error("App bootstrap failed.", error);
  });
});
