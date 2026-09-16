import { getWallpapers, loadWallpapers } from "../config/wallpapers.js";
import { STORAGE_KEYS } from "../config/constants.js";
import { animateWallpaper, createWallpaperStage } from "../lib/animations.js";

let wallpaperStage;
let currentWallpaper;

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
  currentWallpaper = imageUrl;
  animateWallpaper(wallpaperStage, imageUrl);
}

function updatePinButton(pinButton, isPinned) {
  if (!pinButton) return;

  pinButton.textContent = isPinned ? "Pinned" : "Pin";
  pinButton.setAttribute("aria-label", isPinned ? "Unpin wallpaper" : "Pin wallpaper");
  pinButton.setAttribute("aria-pressed", String(isPinned));
  pinButton.classList.toggle("is-pinned", isPinned);
}

export async function initWallpaper({ storageApi, pinButton } = {}) {
  wallpaperStage ||= createWallpaperStage();
  await loadWallpapers();

  const storedData = storageApi
    ? await storageApi.storageGet([STORAGE_KEYS.wallpaper])
    : {};
  const storedWallpaper = storedData[STORAGE_KEYS.wallpaper];
  const hasPinnedWallpaper = typeof storedWallpaper === "string" && Boolean(storedWallpaper);
  const initialWallpaper = hasPinnedWallpaper
    ? storedWallpaper
    : getRandomLocalWallpaper();

  applyWallpaper(initialWallpaper);
  updatePinButton(pinButton, hasPinnedWallpaper);

  pinButton?.addEventListener("click", async () => {
    const isPinned = pinButton.getAttribute("aria-pressed") === "true";

    if (isPinned) {
      await storageApi?.storageSet({ [STORAGE_KEYS.wallpaper]: null });
      updatePinButton(pinButton, false);
      return;
    }

    await storageApi?.storageSet({ [STORAGE_KEYS.wallpaper]: currentWallpaper });
    updatePinButton(pinButton, true);
  });
}
