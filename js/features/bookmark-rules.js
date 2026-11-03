function toBookmark(node, index) {
  return {
    id: node.id,
    title: node.title,
    url: node.url,
    parentId: node.parentId,
    index: Number.isInteger(node.index) ? node.index : index
  };
}

export function organizeBookmarkBar(barNode) {
  const children = barNode?.children || [];
  const isBookmark = (node) => Boolean(node.url);
  const isFolder = (node) => !node.url && Array.isArray(node.children);
  const childIdsByParent = {};
  const inbox = children.flatMap((node, index) => isBookmark(node) ? [toBookmark(node, index)] : []);
  const groups = [];

  if (barNode?.id) childIdsByParent[barNode.id] = children.map((node) => node.id);

  const walk = (nodes) => {
    nodes.forEach((node, childIndex) => {
      if (!isFolder(node)) return;
      childIdsByParent[node.id] = node.children.map((child) => child.id);
      groups.push({
        id: node.id,
        title: node.title,
        parentId: node.parentId,
        childIndex: Number.isInteger(node.index) ? node.index : childIndex,
        bookmarks: node.children.flatMap((bookmark, index) => isBookmark(bookmark) ? [toBookmark(bookmark, index)] : [])
      });
      walk(node.children);
    });
  };
  walk(children);

  return { barId: barNode?.id || null, inbox, groups, childIdsByParent };
}

export function sameOrder(first, second) {
  return first.length === second.length && first.every((id, index) => id === second[index]);
}

export function getBookmarkDropDestination(data, bookmarkId, targetParentId, targetBookmarkId = null, beforeTarget = true) {
  const source = data.inbox.find((bookmark) => bookmark.id === bookmarkId)
    || data.groups.flatMap((group) => group.bookmarks).find((bookmark) => bookmark.id === bookmarkId);
  if (!source || (targetBookmarkId && targetBookmarkId === bookmarkId)) return null;

  const sourceParentId = source.parentId;
  const sourceChildren = data.childIdsByParent?.[sourceParentId] || [];
  const sameParent = sourceParentId === targetParentId;
  const destinationChildren = [...(data.childIdsByParent?.[targetParentId] || [])]
    .filter((id) => !(sameParent && id === bookmarkId));
  let index = destinationChildren.length;

  if (targetBookmarkId) {
    const targetIndex = destinationChildren.indexOf(targetBookmarkId);
    if (targetIndex < 0) return null;
    index = targetIndex + (beforeTarget ? 0 : 1);
  }

  if (sameParent) {
    const nextChildren = [...destinationChildren];
    nextChildren.splice(index, 0, bookmarkId);
    if (sameOrder(sourceChildren, nextChildren)) return null;
  }

  return { parentId: targetParentId, index };
}
