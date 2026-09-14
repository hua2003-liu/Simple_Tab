import { SEARCH_ENGINES } from "../config/constants.js";

export function updateSearchPresentation(searchEngineKey, elements) {
  const currentEngine = SEARCH_ENGINES[searchEngineKey] ? searchEngineKey : "bing";
  const engineLabel = SEARCH_ENGINES[currentEngine].label;

  if (elements.searchEngineTag) {
    elements.searchEngineTag.textContent = engineLabel;
  }

  if (elements.searchInput) {
    elements.searchInput.placeholder = `使用 ${engineLabel} 搜索`;
  }
}

export function setHistoryVisibility(historyContainer, visible) {
  if (!historyContainer) {
    return;
  }

  if (!visible) {
    historyContainer.classList.remove("open");
    historyContainer.style.display = "none";
    return;
  }

  historyContainer.style.display = "block";
  requestAnimationFrame(() => {
    historyContainer.classList.add("open");
  });
}

export function renderHistoryList({
  historyContainer,
  items,
  onSelect,
  onDelete,
  onHover
}) {
  if (!historyContainer) {
    return;
  }

  historyContainer.innerHTML = "";

  items.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.setAttribute("role", "option");
    div.setAttribute("aria-selected", "false");

    const textSpan = document.createElement("span");
    textSpan.textContent = item;
    textSpan.className = "history-text";
    textSpan.onclick = async () => {
      await onSelect(item);
    };

    const delSpan = document.createElement("span");
    delSpan.textContent = "×";
    delSpan.className = "history-del";
    delSpan.onclick = async (event) => {
      event.stopPropagation();
      await onDelete(item);
    };

    div.addEventListener("mouseenter", () => {
      onHover(index);
    });

    div.appendChild(textSpan);
    div.appendChild(delSpan);
    historyContainer.appendChild(div);
  });
}

export function syncActiveHistoryItem({
  historyContainer,
  searchInput,
  items,
  activeIndex
}) {
  if (!historyContainer) {
    return;
  }

  Array.from(historyContainer.children).forEach((node, nodeIndex) => {
    const isActive = nodeIndex === activeIndex;
    node.classList.toggle("active", isActive);
    node.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  if (activeIndex < 0 || !items[activeIndex]) {
    return;
  }

  if (searchInput) {
    searchInput.value = items[activeIndex];
  }

  historyContainer.children[activeIndex]?.scrollIntoView({
    block: "nearest"
  });
}
