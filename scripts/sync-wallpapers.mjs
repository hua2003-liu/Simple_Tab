import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const wallpapersDir = path.join(rootDir, "wallpapers");
const jsonConfigFile = path.join(rootDir, "js", "config", "wallpapers.json");
const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const isWatchMode = process.argv.includes("--watch");

function listWallpaperFiles() {
  return fs.readdirSync(wallpapersDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => imageExtensions.has(path.extname(fileName).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, "zh-Hans-CN", { numeric: true, sensitivity: "base" }));
}

function write_WALLPAPERS_JSON(files) {
  const content = JSON.stringify(files, null, 2) + "\n";
  fs.writeFileSync(jsonConfigFile, content, "utf8");
  console.log(`[sync-wallpapers] Updated wallpapers.json with ${files.length} wallpapers.`);
}

function syncWallpapers() {
  if (!fs.existsSync(wallpapersDir)) {
    throw new Error(`Wallpaper directory not found: ${wallpapersDir}`);
  }

  if (!fs.existsSync(jsonConfigFile)) {
    throw new Error(`Wallpapers config file not found: ${jsonConfigFile}`);
  }

  const files = listWallpaperFiles();
  write_WALLPAPERS_JSON(files);
}

function startWatchMode() {
  let debounceTimer = null;

  const runSync = () => {
    try {
      syncWallpapers();
    } catch (error) {
      console.error("[sync-wallpapers] Sync failed:", error.message);
    }
  };

  runSync();
  console.log(`[sync-wallpapers] Watching ${wallpapersDir}`);

  const watcher = fs.watch(wallpapersDir, () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runSync, 150);
  });

  const stopWatcher = () => {
    watcher.close();
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    console.log("[sync-wallpapers] Watch stopped.");
    process.exit(0);
  };

  process.on("SIGINT", stopWatcher);
  process.on("SIGTERM", stopWatcher);
}

if (isWatchMode) {
  startWatchMode();
} else {
  syncWallpapers();
}
