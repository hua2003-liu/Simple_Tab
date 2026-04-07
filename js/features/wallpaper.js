import { wallpapers } from "../config/constants.js";

export function getRandomLocalWallpaper() {
  const randomIndex = Math.floor(Math.random() * wallpapers.length);
  return `wallpapers/${wallpapers[randomIndex]}`;
}

export function applyWallpaper(imageUrl) {
  document.body.style.backgroundImage = `url("${imageUrl}")`;
}

export async function initWallpaper() {
  applyWallpaper(getRandomLocalWallpaper());
}
