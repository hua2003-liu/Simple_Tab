import { SEARCH_ENGINES, STORAGE_KEYS } from "../config/constants.js";

export async function initSearch({
  elements,
  storageApi,
  navigationApi,
  searchUi,
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
  const { storageGet } = storageApi;
  const { updateSearchPresentation } = searchUi;

  const storedData = await storageGet([STORAGE_KEYS.searchEngine]);
  updateSearchPresentation(storedData[STORAGE_KEYS.searchEngine], elements);

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
        await performSearch(item);
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
    const normalizedKeyword = await searchHistoryStore.save(keyword);

    if (!normalizedKeyword) {
      return;
    }

    const nextData = await storageGet([STORAGE_KEYS.searchEngine]);
    const selectedEngine = nextData[STORAGE_KEYS.searchEngine];
    const searchEngineUrl = SEARCH_ENGINES[selectedEngine]
      ? SEARCH_ENGINES[selectedEngine].url
      : SEARCH_ENGINES.bing.url;

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
    const history = await searchHistoryStore.list();
    if (history.length > 0) {
      await renderHistory();
    }
  });

  searchInput?.addEventListener("blur", () => {
    setTimeout(() => {
      searchHistoryController.hide();
    }, 200);
  });

  searchInput?.addEventListener("keydown", async (event) => {
    const historyVisible = searchHistoryController.isVisible();

    if (event.key === "Escape") {
      searchHistoryController.hide();
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
      await performSearch(selectedItem);
    }
  });
}
