# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome new tab extension with wallpapers, search, and bookmarks. Uses vanilla JS with ES modules.

## Commands

```bash
# Sync wallpapers directory to constants.js
npm run sync:wallpapers

# Watch mode - auto-sync when wallpapers change
npm run watch:wallpapers
```

## Architecture

```
js/
├── app.js           # Bootstrap, wires all modules together via DI
├── config/
│   └── constants.js # Wallpapers, bookmarks, engines, storage keys
├── features/        # Feature init functions (bookmarks, search, settings, theme, wallpaper)
├── lib/             # Shared utilities (storage, navigation)
└── ui/              # DOM element getters, render functions
```

- **Bootstrap pattern**: `app.js` creates APIs (storageApi, navigationApi, etc.) and passes them to feature init functions
- **Theme system**: Time-based (morning/noon/afternoon/night) with manual preview override
- **Storage**: Chrome extension storage API wrapped in promises (`lib/storage.js`)
- **Wallpaper sync**: `scripts/sync-wallpapers.mjs` reads `wallpapers/` dir and updates `constants.js`

## Key Patterns

- Feature modules export `init*` functions that receive dependencies via options object
- UI modules export pure render/state functions, no side effects on import
- All async initialization in `bootstrap()` called on DOMContentLoaded
