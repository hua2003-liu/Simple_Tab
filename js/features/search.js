import { SEARCH_ENGINES } from "../config/constants.js";
import { animateSearchFocus, animateSearchSubmit } from "../lib/animations.js";

export async function initSearch({
  elements,
  searchPreference,
  navigationApi,
  searchHistoryStore,
  searchHistoryController,
  constants
}) {
  const {
    mainContainer,
    searchForm,
    searchInput
  } = elements;
  const {
    navigationDelayMs
  } = constants;

  const renderHistory = async () => {
    const historyItems = await searchHistoryStore.list();
    searchHistoryController.setItems(historyItems);

    if (!searchHistoryController.hasItems()) {
      searchHistoryController.hide();
      return;
    }

    searchHistoryController.render({
      onSelect: async (item) => {
        if (searchInput) {
          searchInput.value = item;
        }
        await performSearch(searchInput?.value || "");
      },
      onDelete: async (item) => {
        await deleteHistory(item);
      }
    });
  };

  const deleteHistory = async (keyword) => {
    const history = await searchHistoryStore.remove(keyword);
    await renderHistory();

    if (history.length > 0) {
      searchInput?.focus();
    }
  };

  const performSearch = async (keyword) => {
    animateSearchSubmit(elements.searchButton, searchForm);
    const normalizedKeyword = await searchHistoryStore.save(keyword);

    if (!normalizedKeyword) {
      return;
    }

    const selectedEngine = await searchPreference.getCurrent();
    const searchEngineUrl = SEARCH_ENGINES[selectedEngine].url;

    navigationApi.navigateWithTransition({
      mainContainer,
      url: searchEngineUrl + encodeURIComponent(normalizedKeyword),
      delayMs: navigationDelayMs
    });
  };

  searchForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await performSearch(searchInput?.value || "");
  });

  searchInput?.addEventListener("focus", async () => {
    animateSearchFocus(searchForm, true);
    const history = await searchHistoryStore.list();
    if (history.length > 0) {
      await renderHistory();
    }
  });

  searchInput?.addEventListener("input", () => {
    searchHistoryController.setActiveIndex(-1);
  });

  searchInput?.addEventListener("blur", () => {
    animateSearchFocus(searchForm, false);
    setTimeout(() => {
      searchHistoryController.hide();
    }, 200);
  });

  searchInput?.addEventListener("keydown", async (event) => {
    const historyVisible = searchHistoryController.isVisible();

    if (event.key === "Escape") {
      searchHistoryController.restoreOriginal();
      return;
    }

    if (event.key === "ArrowDown") {
      if (!historyVisible) {
        await renderHistory();
      }

      if (!searchHistoryController.hasItems()) {
        return;
      }

      event.preventDefault();
      searchHistoryController.moveNext();
      return;
    }

    if (event.key === "ArrowUp") {
      if (!historyVisible) {
        await renderHistory();
      }

      if (!searchHistoryController.hasItems()) {
        return;
      }

      event.preventDefault();
      searchHistoryController.movePrevious();
      return;
    }

    const selectedItem = searchHistoryController.getSelectedItem();
    if (event.key === "Enter" && historyVisible && selectedItem) {
      event.preventDefault();
      const inputValue = searchInput?.value || "";
      await performSearch(inputValue);
      return;
    }
  });
}
