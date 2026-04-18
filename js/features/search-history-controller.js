export function createSearchHistoryController({
  historyContainer,
  searchInput,
  searchUi
}) {
  const {
    renderHistoryList,
    setHistoryVisibility,
    syncActiveHistoryItem
  } = searchUi;

  let items = [];
  let activeIndex = -1;
  let originalText = "";

  const syncActiveState = () => {
    syncActiveHistoryItem({
      historyContainer,
      searchInput,
      items,
      activeIndex
    });
  };

  const setItems = (nextItems) => {
    items = nextItems;
    activeIndex = -1;
    syncActiveState();
  };

  const setActiveIndex = (nextIndex) => {
    activeIndex = nextIndex;
    syncActiveState();
  };

  return {
    setItems,
    setActiveIndex,

    getItems() {
      return items;
    },

    show() {
      originalText = searchInput?.value || "";
      setHistoryVisibility(historyContainer, true);
    },

    hide() {
      activeIndex = -1;
      syncActiveState();
      setHistoryVisibility(historyContainer, false);
    },

    restoreOriginal() {
      if (searchInput) searchInput.value = originalText;
      this.hide();
    },

    isVisible() {
      return historyContainer?.style.display === "block";
    },

    hasItems() {
      return items.length > 0;
    },

    moveNext() {
      if (items.length === 0) {
        return;
      }

      const nextIndex = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
      setActiveIndex(nextIndex);
    },

    movePrevious() {
      if (items.length === 0) {
        return;
      }

      if (activeIndex <= 0) {
        activeIndex = -1;
        if (searchInput) searchInput.value = originalText;
        syncActiveState();
        return;
      }

      setActiveIndex(activeIndex - 1);
    },

    getSelectedItem() {
      return activeIndex >= 0 ? items[activeIndex] : "";
    },

    render({ onSelect, onDelete }) {
      renderHistoryList({
        historyContainer,
        items,
        onSelect,
        onDelete,
        onHover: (index) => {
          setActiveIndex(index);
        }
      });
      syncActiveState();
      this.show();
    }
  };
}
