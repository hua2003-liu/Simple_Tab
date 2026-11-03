# Simple Tab

> A Chrome and Microsoft Edge new-tab extension for bookmarks, wallpapers, and search.

[English](#english) · [中文](#中文)

---

## English

### Features

- **Bookmark management** — Display the browser bookmarks bar and its folders. Add, delete, and move bookmarks; create, rename, and delete groups. Bookmark edits are written back to the browser. Group display order is saved by the extension. Deleting a group moves its bookmarks to the parent folder.
- **Wallpapers** — Add PNG, JPG, JPEG, WEBP, or GIF files to `wallpapers/`. The extension discovers them on new tabs and supports random, sequential, and pinned wallpapers.
- **Search** — Choose Bing, Google, or Baidu; recent searches are available from the search box.
- **Personalization** — Set a display name and choose a time-based theme.
- **Resilient loading** — Bookmark loading shows a placeholder and offers retry if the browser API fails or times out.

### Install (unpacked extension)

1. Download or clone this repository.
2. Open `chrome://extensions/` in Chrome or `edge://extensions/` in Microsoft Edge.
3. Turn on **Developer mode**.
4. Select **Load unpacked**.
5. Choose the repository folder containing `manifest.json`.
6. Open a new tab.

The extension replaces the browser's new-tab page. It requests storage, bookmarks, and favicon permissions.

### Add wallpapers

Place supported image files in `wallpapers/`; they are discovered when a new tab opens. No wallpaper-sync script is required.

### Development

Requirements: Node.js and npm.

```bash
npm install
npm run lint
npm test
```

### Project structure

```text
css/            Page and dialog styles
js/app.js       Application startup and dependency wiring
js/features/    Bookmark, search, settings, theme, and wallpaper features
js/lib/         Browser adapters, storage, dialogs, preferences, and animations
js/ui/          DOM and presentation helpers
tests/          Vitest and happy-dom tests
docs/           Architecture decisions and agent documentation
```

### License

MIT © 2026 hua2003-liu

---

## 中文

### 功能

- **书签管理** — 展示浏览器书签栏及其文件夹；可添加、删除和移动书签，也可新建、重命名、删除分组。书签编辑会写回浏览器；分组显示顺序由扩展保存。删除分组时，组内书签会移回上级文件夹。
- **壁纸** — 将 PNG、JPG、JPEG、WEBP 或 GIF 放入 `wallpapers/`；新标签页会自动发现，支持随机、顺序和固定壁纸。
- **搜索** — 可选择 Bing、Google 或百度；搜索框提供最近搜索记录。
- **个性化** — 可设置显示名称，并选择按时段切换的主题。
- **加载恢复** — 书签加载时显示占位效果；浏览器接口失败或超时后可重试。

### 安装（加载未打包扩展）

1. 下载或克隆本仓库。
2. 在 Chrome 打开 `chrome://extensions/`，或在 Microsoft Edge 打开 `edge://extensions/`。
3. 开启**开发者模式**。
4. 点击**加载已解压的扩展程序**。
5. 选择包含 `manifest.json` 的仓库文件夹。
6. 打开新标签页。

扩展会替换浏览器的新标签页，并申请 storage、bookmarks 和 favicon 权限。

### 添加壁纸

把支持的图片放进 `wallpapers/`，新开标签页即可发现；不需要运行壁纸同步脚本。

### 开发

需要 Node.js 和 npm。

```bash
npm install
npm run lint
npm test
```

### 项目结构

```text
css/            页面和弹窗样式
js/app.js       应用启动与依赖组装
js/features/    书签、搜索、设置、主题和壁纸功能
js/lib/         浏览器适配、存储、弹窗、偏好和动画
js/ui/          DOM 与展示辅助模块
tests/          Vitest 和 happy-dom 测试
docs/           架构决策与 Agent 文档
```

### 开源协议

MIT © 2026 hua2003-liu
