export function getElements() {
  return {
    mainContainer: document.querySelector(".main-container"),
    greeting: document.getElementById("greeting"),
    searchInput: document.getElementById("search-input"),
    searchForm: document.getElementById("search-form"),
    historyContainer: document.getElementById("search-history"),
    searchEngineTag: document.getElementById("search-engine-tag"),
    bookmarkContainer: document.getElementById("bookmark-list"),
    settingsToggle: document.getElementById("settings-toggle"),
    settingsPanel: document.getElementById("settings-panel"),
    settingsClose: document.getElementById("settings-close"),
    searchEngineSelect: document.getElementById("search-engine-select"),
    displayNameInput: document.getElementById("display-name-input"),
    themePreviewControls: document.getElementById("theme-preview-controls")
  };
}
