const DRAG_BOOKMARK_TYPE = "text/x-bookmark-id";
const DRAG_GROUP_TYPE = "text/x-group-id";

export function createBookmarkDragController({
  container,
  onBookmarkDrop,
  onGroupDrop,
  requestFrame = (callback) => window.requestAnimationFrame(callback),
  cancelFrame = (frame) => window.cancelAnimationFrame(frame)
}) {
  let activeDrag = null;
  let activeDropState = null;
  let autoScrollFrame = null;

  const cancelAutoScroll = () => {
    if (autoScrollFrame === null) return;
    cancelFrame(autoScrollFrame);
    autoScrollFrame = null;
  };

  const clearDropState = () => {
    if (!activeDropState) return;
    activeDropState.target.classList.remove(...activeDropState.classes);
    activeDropState = null;
  };

  const setDropState = (target, ...classes) => {
    if (!target) {
      clearDropState();
      return;
    }
    if (activeDropState?.target === target
      && classes.length === activeDropState.classes.length
      && classes.every((className, index) => className === activeDropState.classes[index])) return;

    clearDropState();
    target.classList.add(...classes);
    activeDropState = { target, classes };
  };

  const stop = () => {
    cancelAutoScroll();
    activeDrag = null;
    clearDropState();
  };

  const updateDropFeedback = (target, clientX) => {
    if (!target || !container.contains(target)) {
      clearDropState();
      return;
    }

    const item = target.closest(".bookmark-item");
    const section = target.closest(".bookmark-section");
    if (activeDrag?.type === "bookmark" && item && section) {
      const rect = item.getBoundingClientRect();
      setDropState(item, clientX < rect.left + rect.width / 2 ? "drop-before" : "drop-after");
    } else if (activeDrag?.type === "bookmark" && section) {
      setDropState(section, "drag-over");
    } else if (activeDrag?.type === "bookmark" && target.classList.contains("bookmark-empty-drop-target")) {
      setDropState(target, "drag-over");
    } else if (activeDrag?.type === "bookmark" && target.closest(".bookmark-cards")) {
      setDropState(target.closest(".bookmark-cards"), "inbox-drop-active");
    } else if (activeDrag?.type === "bookmark" && target === container) {
      setDropState(container, "inbox-drop-active");
    } else if (activeDrag?.type === "group" && section?.dataset.groupId
      && activeDrag.id !== section.dataset.groupId) {
      setDropState(section, "swap-target");
    } else {
      clearDropState();
    }
  };

  const autoScroll = () => {
    autoScrollFrame = null;
    if (!activeDrag) return;
    const rect = container.getBoundingClientRect();
    const { x, y } = activeDrag;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      clearDropState();
      return;
    }

    const edgeSize = Math.min(56, rect.height * 0.2);
    let delta = 0;
    if (y < rect.top + edgeSize) {
      delta = -Math.ceil(14 * (1 - Math.max(0, y - rect.top) / edgeSize));
    } else if (y > rect.bottom - edgeSize) {
      delta = Math.ceil(14 * (1 - Math.max(0, rect.bottom - y) / edgeSize));
    }
    if (!delta) return;

    const previousScrollTop = container.scrollTop;
    container.scrollTop += delta;
    if (container.scrollTop !== previousScrollTop) {
      updateDropFeedback(document.elementFromPoint?.(x, y), x);
      autoScrollFrame = requestFrame(autoScroll);
    }
  };

  const updateAutoScroll = (event) => {
    if (!activeDrag) return;
    activeDrag.x = event.clientX;
    activeDrag.y = event.clientY;
    const rect = container.getBoundingClientRect();
    const edgeSize = Math.min(56, rect.height * 0.2);
    const nearEdge = event.clientY < rect.top + edgeSize || event.clientY > rect.bottom - edgeSize;
    if (!nearEdge) {
      cancelAutoScroll();
      return;
    }
    if (autoScrollFrame === null) autoScrollFrame = requestFrame(autoScroll);
  };

  const start = (type, id, event) => {
    activeDrag = { type, id, x: event.clientX, y: event.clientY };
  };

  const wireBookmark = (link, bookmarkId) => {
    link.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData(DRAG_BOOKMARK_TYPE, bookmarkId);
      event.dataTransfer.effectAllowed = "move";
      start("bookmark", bookmarkId, event);
    });
    link.addEventListener("dragend", stop);
  };

  const wireGroupTitle = (title, group, section) => {
    title.draggable = true;
    title.setAttribute("draggable", "true");
    title.dataset.groupId = group.id;
    title.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData(DRAG_GROUP_TYPE, group.id);
      event.dataTransfer.effectAllowed = "move";
      start("group", group.id, event);
      if (event.dataTransfer.setDragImage) {
        event.dataTransfer.setDragImage(section, section.offsetWidth / 2, Math.min(section.offsetHeight / 2, 32));
      }
      section.classList.add("is-dragging");
    });
    title.addEventListener("dragend", () => {
      section.classList.remove("is-dragging");
      stop();
    });
  };

  const wireDropTarget = (section, { parentId, group }) => {
    section.addEventListener("dragover", (event) => {
      if (!activeDrag) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      updateDropFeedback(event.target, event.clientX);
    });
    section.addEventListener("dragleave", (event) => {
      if (section.contains(event.relatedTarget)) return;
      if (activeDropState?.target === section || section.contains(activeDropState?.target)) clearDropState();
    });
    section.addEventListener("drop", async (event) => {
      if (!activeDrag) return;
      event.preventDefault();
      const bookmarkId = event.dataTransfer.getData(DRAG_BOOKMARK_TYPE);
      const groupId = event.dataTransfer.getData(DRAG_GROUP_TYPE);
      const targetItem = event.target.closest?.(".bookmark-item");
      clearDropState();
      if (bookmarkId) {
        await onBookmarkDrop(bookmarkId, event, parentId, targetItem);
      } else if (groupId && group && groupId !== group.id) {
        onGroupDrop(groupId, group.id);
        stop();
      }
    });
  };

  const wireInboxBackground = (cards, barId) => {
    const isCardBackground = (target) => !target.closest?.(".bookmark-section");
    cards.addEventListener("dragover", (event) => {
      if (activeDrag?.type !== "bookmark" || !isCardBackground(event.target)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      updateDropFeedback(event.target, event.clientX);
    });
    cards.addEventListener("dragleave", (event) => {
      if (cards.contains(event.relatedTarget)) return;
      if (activeDropState?.target === cards) clearDropState();
    });
    cards.addEventListener("drop", async (event) => {
      if (activeDrag?.type !== "bookmark" || !isCardBackground(event.target)) return;
      event.preventDefault();
      await onBookmarkDrop(event.dataTransfer.getData(DRAG_BOOKMARK_TYPE), event, barId);
    });
  };

  container.addEventListener("dragover", (event) => {
    if (!activeDrag) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (activeDrag.type === "bookmark" && !event.target.closest?.(".bookmark-section")
      && !event.target.closest?.(".bookmark-cards")) {
      setDropState(container, "inbox-drop-active");
    }
    updateAutoScroll(event);
  });
  container.addEventListener("drop", async (event) => {
    if (activeDrag?.type !== "bookmark" || event.target.closest?.(".bookmark-section")) return;
    event.preventDefault();
    await onBookmarkDrop(event.dataTransfer.getData(DRAG_BOOKMARK_TYPE), event, null);
  });
  container.addEventListener("dragleave", (event) => {
    const rect = container.getBoundingClientRect();
    const outside = event.clientX < rect.left || event.clientX > rect.right
      || event.clientY < rect.top || event.clientY > rect.bottom;
    if (!outside) return;
    cancelAutoScroll();
    clearDropState();
  });
  document.addEventListener("dragover", (event) => {
    if (!activeDrag || container.contains(event.target)) return;
    event.preventDefault();
    cancelAutoScroll();
    clearDropState();
  }, true);
  document.addEventListener("drop", (event) => {
    if (!activeDrag || container.contains(event.target)) return;
    event.preventDefault();
    stop();
  }, true);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
  });

  return { stop, wireBookmark, wireGroupTitle, wireDropTarget, wireInboxBackground };
}
