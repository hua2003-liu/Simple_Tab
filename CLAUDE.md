# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome new tab extension with wallpapers, search, and bookmarks. Uses vanilla JS with ES modules.

## Commands

```bash
# Lint
npm run lint

# Run unit tests
npm test

# Build/watch Tailwind styles
npm run build:styles
npm run watch:styles
```

## Architecture

```
js/
├── app.js           # Bootstrap, wires all modules together via DI
├── config/
│   └── constants.js # Engines, storage keys
├── features/        # Feature init functions (bookmarks, search, settings, theme, wallpaper)
├── lib/             # Shared utilities (storage, navigation)
└── ui/              # DOM element getters, render functions
```

- **Bootstrap pattern**: `app.js` creates APIs (storageApi, navigationApi, etc.) and passes them to feature init functions
- **Theme system**: Time-based (morning/noon/afternoon/night) with manual preview override
- **Storage**: Chrome extension storage API wrapped in promises (`lib/storage.js`)
- **Wallpaper source**: runtime enumeration of the `wallpapers/` directory via package directory API (`lib/chrome-wallpapers.js`), no prebuilt manifest

## Key Patterns

- Feature modules export `init*` functions that receive dependencies via options object
- UI modules export pure render/state functions, no side effects on import
- All async initialization in `bootstrap()` called on DOMContentLoaded

## Agent skills

### Issue tracker

Issues live in GitHub Issues (`hua2003-liu/Simple_Tab`), operated via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: root `CONTEXT.md` + `docs/adr/`, created lazily. See `docs/agents/domain.md`.
