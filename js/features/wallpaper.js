import { getWallpapers, loadWallpapers } from "../config/wallpapers.js";
import { animateWallpaper, createWallpaperStage } from "../lib/animations.js";

let wallpaperStage;

export function getRandomLocalWallpaper() {
  const list = getWallpapers();
  if (list.length === 0) {
    return "wallpapers/cover.png";
  }
  const randomIndex = Math.floor(Math.random() * list.length);
  return `wallpapers/${list[randomIndex]}`;
}

export function applyWallpaper(imageUrl) {
  wallpaperStage ||= createWallpaperStage();
  animateWallpaper(wallpaperStage, imageUrl);
}

export async function initWallpaper() {
  wallpaperStage ||= createWallpaperStage();
  await loadWallpapers();
  applyWallpaper(getRandomLocalWallpaper());
}
