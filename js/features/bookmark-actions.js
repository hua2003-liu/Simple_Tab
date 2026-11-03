export function createBookmarkActions({ bookmarksApi, refresh, askText, confirmDialog }) {
  return {
    async createGroup() {
      const title = (await askText("新分组名称"))?.trim();
      if (!title) return;
      const bar = await bookmarksApi.getBookmarksBar();
      await bookmarksApi.createFolder(title, bar.id);
      await refresh();
    },

    async renameGroup(group) {
      const title = (await askText("重命名分组", group.title))?.trim();
      if (!title || title === group.title) return;
      await bookmarksApi.rename(group.id, title);
      await refresh();
    },

    // 删除分组前先将所有直接子项移回上级，避免嵌套文件夹及其内容随树一起消失
    async deleteGroup(group) {
      if (!await confirmDialog(`删除分组「${group.title}」？组内书签将移回上一层。`, { confirmText: "删除", danger: true })) return;
      const findNode = (node) => {
        if (!node) return null;
        if (node.id === group.id) return node;
        for (const child of node.children || []) {
          const found = findNode(child);
          if (found) return found;
        }
        return null;
      };
      const folder = findNode(await bookmarksApi.getBookmarksBar());
      if (!folder) {
        await refresh();
        return;
      }
      for (const child of [...(folder.children || [])]) {
        await bookmarksApi.move(child.id, { parentId: folder.parentId });
      }
      await bookmarksApi.removeFolder(folder.id);
      await refresh();
    },

    async addBookmark(section) {
      const url = await askText("书签 URL");
      if (!url) return;
      const requestedTitle = await askText("书签名称（留空则用 URL）");
      if (requestedTitle === null) return;
      const title = requestedTitle || url;
      await bookmarksApi.createBookmark({ title, url, parentId: section.parentId });
      await refresh();
    },

    async deleteBookmark(bookmark) {
      if (!await confirmDialog(`删除书签「${bookmark.title}」？`, { confirmText: "删除", danger: true })) return;
      await bookmarksApi.removeBookmark(bookmark.id);
      await refresh();
    },

    async moveBookmark(bookmarkId, destination) {
      await bookmarksApi.move(bookmarkId, destination);
      await refresh();
    }
  };
}
