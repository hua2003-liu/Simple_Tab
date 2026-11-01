import { STORAGE_KEYS } from "../config/constants.js";
import { animateWallpaper, createWallpaperStage } from "../lib/animations.js";

const FALLBACK_WALLPAPER = "wallpapers/cover.png";

export function pickRandomWallpaper(list) {
  if (list.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * list.length);
  return list[randomIndex];
}

export function sequentialPick(list, index) {
  if (list.length === 0) return null;
  return list[Math.abs(index) % list.length];
}

let wallpaperStage;
let currentWallpaper;
// 壁纸缩略图（name → dataURL）：新标签页先用小图瞬间铺满，大图解码完再无感替换
let thumbCache = {};
let thumbStorageApi;

function thumbNameOf(imageUrl) {
  const match = /^wallpapers\/(.+)$/.exec(imageUrl || "");
  return match ? match[1] : null;
}

function storeThumb(name, img) {
  if (!thumbStorageApi || thumbCache[name]) return;
  try {
    const width = 48;
    const height = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * width)) || 27;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(img, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    thumbCache[name] = dataUrl;
    void thumbStorageApi.storageSet({ [STORAGE_KEYS.wallpaperThumbs]: thumbCache });
  } catch {
    // 画布失败不影响主流程
  }
}

export function applyWallpaper(imageUrl) {
  wallpaperStage ||= createWallpaperStage();
  currentWallpaper = imageUrl;

  const name = thumbNameOf(imageUrl);
  const thumb = name ? thumbCache[name] : null;
  // 大图立即开始渐进渲染；小图垫底，在大图像素铺满前充当画面
  const background = thumb
    ? `url("${imageUrl}"), url("${thumb}")`
    : `url("${imageUrl}")`;
  animateWallpaper(wallpaperStage, background);

  if (name) {
    // 后台补存缩略图，供下次冷启动垫底
    const probe = new Image();
    probe.onload = () => storeThumb(name, probe);
    probe.src = imageUrl;
  }
}

function updatePinButton(pinButton, isPinned) {
  if (!pinButton) return;

  pinButton.textContent = isPinned ? "Pinned" : "Pin";
  pinButton.setAttribute("aria-label", isPinned ? "Unpin wallpaper" : "Pin wallpaper");
  pinButton.setAttribute("aria-pressed", String(isPinned));
  pinButton.classList.toggle("is-pinned", isPinned);
}

export async function initWallpaper({ storageApi, pinButton, wallpaperSource } = {}) {
  wallpaperStage ||= createWallpaperStage();
  thumbStorageApi = storageApi;

  const storedData = storageApi
    ? await storageApi.storageGet([
      STORAGE_KEYS.wallpaper,
      STORAGE_KEYS.wallpaperMode,
      STORAGE_KEYS.wallpaperIndex,
      STORAGE_KEYS.wallpaperListCache,
      STORAGE_KEYS.wallpaperThumbs
    ])
    : {};
  thumbCache = storedData[STORAGE_KEYS.wallpaperThumbs] || {};
  const storedWallpaper = storedData[STORAGE_KEYS.wallpaper];
  const wallpaperMode = storedData[STORAGE_KEYS.wallpaperMode] === "sequential"
    ? "sequential"
    : "random";
  const hasPinnedWallpaper = typeof storedWallpaper === "string" && Boolean(storedWallpaper);
  const storedIndex = Number.isInteger(storedData[STORAGE_KEYS.wallpaperIndex])
    ? storedData[STORAGE_KEYS.wallpaperIndex]
    : 0;

  // 上次枚举的列表直接从缓存取，启动瞬间就能上墙；目录实时枚举放后台
  const cachedNames = storedData[STORAGE_KEYS.wallpaperListCache];

  const applyFromNames = (names) => {
    const wallpapers = names.map((name) => `wallpapers/${name}`);
    const initialWallpaper = hasPinnedWallpaper
      ? storedWallpaper
      : wallpaperMode === "sequential"
        ? (sequentialPick(wallpapers, storedIndex) || FALLBACK_WALLPAPER)
        : (pickRandomWallpaper(wallpapers) || FALLBACK_WALLPAPER);

    if (!hasPinnedWallpaper && wallpaperMode === "sequential" && wallpapers.length > 0) {
      void storageApi?.storageSet({
        [STORAGE_KEYS.wallpaperIndex]: (Math.abs(storedIndex) + 1) % wallpapers.length
      });
    }

    applyWallpaper(initialWallpaper);
  };

  if (Array.isArray(cachedNames) && cachedNames.length > 0) {
    applyFromNames(cachedNames);
    updatePinButton(pinButton, hasPinnedWallpaper);
  }

  const names = wallpaperSource ? await wallpaperSource.list() : [];

  // 实时列表与缓存不一致（首次使用 / 目录有增减）才更新缓存并换图
  const listChanged = JSON.stringify(names) !== JSON.stringify(cachedNames);
  if (listChanged) {
    await storageApi?.storageSet({ [STORAGE_KEYS.wallpaperListCache]: names });
  }

  if (!Array.isArray(cachedNames) || cachedNames.length === 0) {
    applyFromNames(names);
    updatePinButton(pinButton, hasPinnedWallpaper);
  } else if (listChanged && !hasPinnedWallpaper) {
    applyFromNames(names);
  }

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
