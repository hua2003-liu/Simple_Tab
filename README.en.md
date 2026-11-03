# Simple Tab

> A Chrome and Microsoft Edge new-tab extension for bookmarks, wallpapers, and search.

[简体中文](README.md)

## Features

- **Bookmark management:** View the browser bookmarks bar and its folders. Add, delete, and move bookmarks; create, rename, and delete groups. Deleting a group moves its bookmarks to the parent folder.
- **Drag-and-drop organization:** Move bookmarks between groups and the unsorted area, reorder bookmarks, and rearrange groups. Group display order is saved by the extension; bookmark edits are written back to the browser.
- **Wallpapers:** Place PNG, JPG, JPEG, WEBP, or GIF images in `wallpapers/`. New tabs discover them automatically. Random, sequential, and pinned modes are supported.
- **Search:** Choose Bing, Google, or Baidu, with recent search history.
- **Personalization:** Set a display name, time-based theme, and wallpaper mode.
- **Loading recovery:** A placeholder appears while bookmarks load; retry is available if reading fails or times out.

## Installation

1. Download or clone this repository.
2. Open `chrome://extensions/` in Chrome or `edge://extensions/` in Microsoft Edge.
3. Enable Developer mode and select **Load unpacked**.
4. Choose the repository root containing `manifest.json`.
5. Open a new tab.

The extension replaces the browser's new-tab page and requests the `storage`, `bookmarks`, and `favicon` permissions.

## Add wallpapers

Place supported images in `wallpapers/`; they are discovered when a new tab opens. No sync script is needed.

## Development

Requires Node.js and npm.

```bash
npm install
npm run lint
npm test
```

## Project structure

```text
css/            Page and dialog styles
js/app.js       Application startup and dependency wiring
js/features/    Bookmark, search, settings, theme, and wallpaper features
js/lib/         Browser adapters, storage, dialogs, preferences, and animations
js/ui/          DOM and presentation helpers
tests/          Vitest and happy-dom tests
docs/           Architecture decisions and agent documentation
```

## License

Licensed under the [MIT License](LICENSE).
