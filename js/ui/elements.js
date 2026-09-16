export function getElements() {
  return {
    mainContainer: document.querySelector(".main-container"),
    greeting: document.getElementById("greeting"),
    searchInput: document.getElementById("search-input"),
    searchForm: document.getElementById("search-form"),
    searchButton: document.getElementById("search-btn"),
    historyContainer: document.getElementById("search-history"),
    searchEngineTag: document.getElementById("search-engine-tag"),
    bookmarkContainer: document.getElementById("bookmark-list"),
    wallpaperPinToggle: document.getElementById("wallpaper-pin-toggle"),
    settingsToggle: document.getElementById("settings-toggle"),
    settingsPanel: document.getElementById("settings-panel"),
    settingsClose: document.getElementById("settings-close"),
    searchEngineSelect: document.getElementById("search-engine-select"),
    searchEngineTrigger: document.getElementById("search-engine-trigger"),
    searchEngineOptions: document.getElementById("search-engine-options"),
    wallpaperModeSelect: document.getElementById("wallpaper-mode-select"),
    wallpaperModeTrigger: document.getElementById("wallpaper-mode-trigger"),
    wallpaperModeOptions: document.getElementById("wallpaper-mode-options"),
    displayNameInput: document.getElementById("display-name-input")
  };
}
