import { getWallpapers, loadWallpapers } from "../config/wallpapers.js";

export function getRandomLocalWallpaper() {
  const list = getWallpapers();
  const randomIndex = Math.floor(Math.random() * list.length);
  return `wallpapers/${list[randomIndex]}`;
}

export function applyWallpaper(imageUrl) {
  document.body.style.backgroundImage = `url("${imageUrl}")`;
}

export async function initWallpaper() {
  await loadWallpapers();
  applyWallpaper(getRandomLocalWallpaper());
}
