import { STORAGE_KEYS } from "../config/constants.js";

export async function initSettings({
  elements,
  storageApi,
  settingsUi,
  themeController,
  searchPresentationUpdater
}) {
  const {
    themePreviewControls,
    searchEngineSelect,
    settingsClose,
    settingsPanel,
    settingsToggle
  } = elements;
  const { closeSettingsPanel, openSettingsPanel, updateThemePreviewControls } = settingsUi;
  const storedData = await storageApi.storageGet([STORAGE_KEYS.searchEngine]);
  const currentSearchEngine = storedData[STORAGE_KEYS.searchEngine] || "bing";
  const closePanel = () => {
    closeSettingsPanel(settingsPanel, settingsToggle);
  };

  if (searchEngineSelect) {
    searchEngineSelect.value = currentSearchEngine;
  }
  searchPresentationUpdater(currentSearchEngine, elements);
  updateThemePreviewControls(themeController.getActivePreview(), themePreviewControls);

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

  searchEngineSelect?.addEventListener("change", async () => {
    await storageApi.storageSet({ [STORAGE_KEYS.searchEngine]: searchEngineSelect.value });
    searchPresentationUpdater(searchEngineSelect.value, elements);
  });

  themePreviewControls?.addEventListener("click", (event) => {
    const previewButton = event.target.closest(".theme-preview-btn");

    if (!previewButton) {
      return;
    }

    themeController.previewTheme(previewButton.dataset.themePreview || "auto");
    updateThemePreviewControls(themeController.getActivePreview(), themePreviewControls);
  });

  document.addEventListener("click", (event) => {
    if (!settingsPanel || !settingsToggle || settingsPanel.hidden) {
      return;
    }

    if (!settingsPanel.contains(event.target) && event.target !== settingsToggle) {
      closePanel();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePanel();
    }
  });
}
