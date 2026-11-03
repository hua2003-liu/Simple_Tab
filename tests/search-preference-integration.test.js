import { afterEach, describe, expect, it, vi } from "vitest";

const { animateSearchFocus, animateSearchSubmit } = vi.hoisted(() => ({
  animateSearchFocus: vi.fn(),
  animateSearchSubmit: vi.fn()
}));
vi.mock("../js/lib/animations.js", () => ({ animateSearchFocus, animateSearchSubmit }));

import { initSearch } from "../js/features/search.js";
import { initSettings } from "../js/features/settings.js";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

function createElement(tag = "div") {
  const element = document.createElement(tag);
  document.body.appendChild(element);
  return element;
}

describe("search feature preference integration", () => {
  it("uses the shared preference to navigate without reading the engine from storage", async () => {
    const searchForm = createElement("form");
    const searchInput = createElement("input");
    searchInput.value = "kittens";
    const storageGet = vi.fn(async () => { throw new Error("search submit must not read storage"); });
    const navigateWithTransition = vi.fn();
    const searchPreference = { getCurrent: vi.fn(async () => "google") };
    const searchHistoryStore = {
      save: vi.fn(async (keyword) => keyword.trim()),
      list: vi.fn(async () => []),
      remove: vi.fn(async () => [])
    };

    await initSearch({
      elements: { searchForm, searchInput },
      storageApi: { storageGet },
      searchPreference,
      navigationApi: { navigateWithTransition },
      searchUi: { updateSearchPresentation: vi.fn() },
      searchHistoryStore,
      searchHistoryController: {
        setItems: vi.fn(), hasItems: vi.fn(() => false), hide: vi.fn(), render: vi.fn(),
        setActiveIndex: vi.fn(), isVisible: vi.fn(() => false), restoreOriginal: vi.fn()
      },
      constants: { navigationDelayMs: 400 }
    });

    searchForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(searchPreference.getCurrent).toHaveBeenCalledOnce();
    expect(storageGet).not.toHaveBeenCalled();
    expect(navigateWithTransition).toHaveBeenCalledWith(expect.objectContaining({
      url: "https://www.google.com/search?q=kittens"
    }));
  });

  it("initializes settings from the shared preference and updates it on selection", async () => {
    const searchEngineSelect = createElement("select");
    searchEngineSelect.innerHTML = '<option value="google">Google</option><option value="bing">Bing</option>';
    const googleOption = document.createElement("div");
    googleOption.className = "settings-select-option";
    googleOption.dataset.value = "google";
    googleOption.textContent = "Google";
    const bingOption = document.createElement("div");
    bingOption.className = "settings-select-option";
    bingOption.dataset.value = "bing";
    bingOption.textContent = "Bing";
    const searchEngineOptions = createElement();
    searchEngineOptions.append(googleOption, bingOption);
    const searchEngineTrigger = createElement("button");
    const searchPreference = {
      getCurrent: vi.fn(async () => "google"),
      setCurrent: vi.fn(async () => {})
    };
    const storageGet = vi.fn(async () => ({}));
    const storageSet = vi.fn(async () => {});
    const searchPresentationUpdater = vi.fn();

    await initSettings({
      elements: { searchEngineSelect, searchEngineOptions, searchEngineTrigger },
      storageApi: { storageGet, storageSet },
      searchPreference,
      settingsUi: { closeSettingsPanel: vi.fn(), openSettingsPanel: vi.fn() },
      searchPresentationUpdater
    });

    expect(searchEngineSelect.value).toBe("google");
    expect(searchPresentationUpdater).toHaveBeenCalledWith("google", expect.any(Object));
    expect(storageGet).toHaveBeenCalledWith(["wallpaper_mode"]);
    expect(storageGet).not.toHaveBeenCalledWith(expect.arrayContaining(["search_engine"]));

    bingOption.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();
    expect(searchPreference.setCurrent).toHaveBeenCalledWith("bing");
    expect(searchPresentationUpdater).toHaveBeenCalledWith("bing", expect.any(Object));
  });
});
