import { STORAGE_KEYS } from "../config/constants.js";

export async function initSettings({
  elements,
  storageApi,
  searchPreference,
  settingsUi,
  searchPresentationUpdater
}) {
  const {
    searchEngineSelect,
    searchEngineTrigger,
    searchEngineOptions,
    wallpaperModeSelect,
    wallpaperModeTrigger,
    wallpaperModeOptions,
    settingsClose,
    settingsPanel,
    settingsToggle
  } = elements;
  const { closeSettingsPanel, openSettingsPanel } = settingsUi;
  const [currentSearchEngine, storedData] = await Promise.all([
    searchPreference.getCurrent(),
    storageApi.storageGet([STORAGE_KEYS.wallpaperMode])
  ]);
  const currentWallpaperMode = storedData[STORAGE_KEYS.wallpaperMode] === "sequential"
    ? "sequential"
    : "random";
  const closePanel = () => {
    closeSettingsPanel(settingsPanel, settingsToggle);
  };

  if (searchEngineSelect) {
    searchEngineSelect.value = currentSearchEngine;
  }
  const currentSearchOption = searchEngineOptions?.querySelector(`[data-value="${currentSearchEngine}"]`);
  if (currentSearchOption && searchEngineTrigger) {
    searchEngineTrigger.textContent = currentSearchOption.textContent;
    currentSearchOption.setAttribute("aria-selected", "true");
  }
  searchPresentationUpdater(currentSearchEngine, elements);

  if (wallpaperModeSelect) {
    wallpaperModeSelect.value = currentWallpaperMode;
  }
  const currentWallpaperModeOption = wallpaperModeOptions?.querySelector(`[data-value="${currentWallpaperMode}"]`);
  if (currentWallpaperModeOption && wallpaperModeTrigger) {
    wallpaperModeTrigger.textContent = currentWallpaperModeOption.textContent;
    currentWallpaperModeOption.setAttribute("aria-selected", "true");
  }

  settingsToggle?.addEventListener("click", (event) => {
    event.stopPropagation();

    if (settingsPanel?.hidden) {
      openSettingsPanel(settingsPanel, settingsToggle);
      return;
    }

    closePanel();
  });

  settingsClose?.addEventListener("click", () => {
    closePanel();
  });

  const closeSearchEngineOptions = () => {
    if (!searchEngineTrigger || !searchEngineOptions) return;
    searchEngineOptions.hidden = true;
    searchEngineTrigger.setAttribute("aria-expanded", "false");
  };

  searchEngineTrigger?.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = !searchEngineOptions?.hidden;
    if (!searchEngineOptions) return;
    searchEngineOptions.hidden = isOpen;
    searchEngineTrigger.setAttribute("aria-expanded", String(!isOpen));
  });

  searchEngineOptions?.addEventListener("click", async (event) => {
    const option = event.target.closest(".settings-select-option");
    if (!option || !searchEngineSelect) return;

    const nextSearchEngine = option.dataset.value;
    await searchPreference.setCurrent(nextSearchEngine);
    searchEngineSelect.value = nextSearchEngine;
    searchEngineTrigger.textContent = option.textContent;
    searchEngineOptions.querySelectorAll(".settings-select-option").forEach((item) => {
      item.setAttribute("aria-selected", String(item === option));
    });
    closeSearchEngineOptions();
    searchPresentationUpdater(nextSearchEngine, elements);
  });

  const closeWallpaperModeOptions = () => {
    if (!wallpaperModeTrigger || !wallpaperModeOptions) return;
    wallpaperModeOptions.hidden = true;
    wallpaperModeTrigger.setAttribute("aria-expanded", "false");
  };

  wallpaperModeTrigger?.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = !wallpaperModeOptions?.hidden;
    if (!wallpaperModeOptions) return;
    wallpaperModeOptions.hidden = isOpen;
    wallpaperModeTrigger.setAttribute("aria-expanded", String(!isOpen));
  });

  wallpaperModeOptions?.addEventListener("click", async (event) => {
    const option = event.target.closest(".settings-select-option");
    if (!option || !wallpaperModeSelect) return;

    const nextWallpaperMode = option.dataset.value;
    wallpaperModeSelect.value = nextWallpaperMode;
    wallpaperModeTrigger.textContent = option.textContent;
    wallpaperModeOptions.querySelectorAll(".settings-select-option").forEach((item) => {
      item.setAttribute("aria-selected", String(item === option));
    });
    closeWallpaperModeOptions();
    await storageApi.storageSet({ [STORAGE_KEYS.wallpaperMode]: nextWallpaperMode });
  });

  document.addEventListener("click", (event) => {
    if (!settingsPanel || !settingsToggle || settingsPanel.hidden) {
      return;
    }

    if (!settingsPanel.contains(event.target) && event.target !== settingsToggle) {
      closeSearchEngineOptions();
      closeWallpaperModeOptions();
      closePanel();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePanel();
    }
  });
}
