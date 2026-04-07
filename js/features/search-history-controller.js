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

    getItems() {
      return items;
    },

    show() {
      setHistoryVisibility(historyContainer, true);
    },

    hide() {
      activeIndex = -1;
      syncActiveState();
      setHistoryVisibility(historyContainer, false);
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

      const nextIndex = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
      setActiveIndex(nextIndex);
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
