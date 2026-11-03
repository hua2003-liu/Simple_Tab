function getTree() {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.getTree((nodes) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(nodes?.[0] || null);
    });
  });
}

export function createBookmarksApi() {
  if (!chrome.bookmarks) {
    return {
      getBookmarksBar: async () => null,
      addChangeListener: () => {},
      createFolder: async () => null,
      rename: async () => {},
      removeFolder: async () => {},
      removeBookmark: async () => {},
      move: async () => {},
      createBookmark: async () => null
    };
  }

  return {
    // 根的第一个子节点即书签栏（Chromium 固定顺序：书签栏、其他书签、移动设备书签）
    getBookmarksBar: async () => (await getTree())?.children?.[0] || null,
    addChangeListener: (cb) => {
      chrome.bookmarks.onCreated.addListener(cb);
      chrome.bookmarks.onRemoved.addListener(cb);
      chrome.bookmarks.onChanged.addListener(cb);
      chrome.bookmarks.onMoved.addListener(cb);
    },
    createFolder: (title, parentId) => chrome.bookmarks.create({ title, parentId }),
    createBookmark: ({ title, url, parentId }) => chrome.bookmarks.create({ title, url, parentId }),
    rename: (id, title) => chrome.bookmarks.update(id, { title }),
    removeFolder: (id) => chrome.bookmarks.removeTree(id),
    removeBookmark: (id) => chrome.bookmarks.remove(id),
    move: (id, destination) => chrome.bookmarks.move(id, destination)
  };
}
