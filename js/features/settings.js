import { STORAGE_KEYS } from "../config/constants.js";

export async function initSettings({
  elements,
  storageApi,
  settingsUi,
  searchPresentationUpdater
}) {
  const {
    searchEngineSelect,
    searchEngineTrigger,
    searchEngineOptions,
    settingsClose,
    settingsPanel,
    settingsToggle
  } = elements;
  const { closeSettingsPanel, openSettingsPanel } = settingsUi;
  const storedData = await storageApi.storageGet([STORAGE_KEYS.searchEngine]);
  const currentSearchEngine = storedData[STORAGE_KEYS.searchEngine] || "bing";
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
    searchEngineSelect.value = nextSearchEngine;
    searchEngineTrigger.textContent = option.textContent;
    searchEngineOptions.querySelectorAll(".settings-select-option").forEach((item) => {
      item.setAttribute("aria-selected", String(item === option));
    });
    closeSearchEngineOptions();
    await storageApi.storageSet({ [STORAGE_KEYS.searchEngine]: nextSearchEngine });
    searchPresentationUpdater(nextSearchEngine, elements);
  });

  document.addEventListener("click", (event) => {
    if (!settingsPanel || !settingsToggle || settingsPanel.hidden) {
      return;
    }

    if (!settingsPanel.contains(event.target) && event.target !== settingsToggle) {
      closeSearchEngineOptions();
      closePanel();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePanel();
    }
  });
}
