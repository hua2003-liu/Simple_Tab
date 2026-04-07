import { getWallpapers, loadWallpapers } from "../config/wallpapers.js";

export function getRandomLocalWallpaper() {
  const randomIndex = Math.floor(Math.random() * getWallpapers().length);
  return `wallpapers/${getWallpapers()[randomIndex]}`;
}

export function applyWallpaper(imageUrl) {
  document.body.style.backgroundImage = `url("${imageUrl}")`;
}

export async function initWallpaper() {
  await loadWallpapers();
  applyWallpaper(getRandomLocalWallpaper());
}
