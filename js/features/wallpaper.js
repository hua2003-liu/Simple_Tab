import { STORAGE_KEYS } from "../config/constants.js";
import { animateWallpaper, createWallpaperStage } from "../lib/animations.js";

const FALLBACK_WALLPAPER = "wallpapers/cover.png";
// 垫底图宽度：48px 全屏拉伸糊得像「没加载完」，480px 已接近成片，数据量仍在每张几十 KB
const THUMB_WIDTH = 480;

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

function isCurrentThumb(entry) {
  return Boolean(entry) && typeof entry === "object" && entry.width === THUMB_WIDTH && typeof entry.src === "string";
}

function thumbSrcOf(entry) {
  if (typeof entry === "string") return entry; // 旧版 48px 缩略图，仍可垫底
  return isCurrentThumb(entry) ? entry.src : null;
}

function storeThumb(name, img, bitmap) {
  if (!thumbStorageApi || isCurrentThumb(thumbCache[name])) return;
  try {
    const ratio = (img.naturalHeight / img.naturalWidth) || 270 / THUMB_WIDTH;
    const height = Math.max(1, Math.round(ratio * THUMB_WIDTH));
    const canvas = document.createElement("canvas");
    canvas.width = THUMB_WIDTH;
    canvas.height = height;
    if (bitmap) {
      canvas.getContext("2d").drawImage(bitmap, 0, 0, THUMB_WIDTH, height);
      bitmap.close();
    } else {
      canvas.getContext("2d").drawImage(img, 0, 0, THUMB_WIDTH, height);
    }
    thumbCache[name] = { src: canvas.toDataURL("image/jpeg", 0.6), width: THUMB_WIDTH };
    void thumbStorageApi.storageSet({ [STORAGE_KEYS.wallpaperThumbs]: thumbCache });
  } catch {
    // 画布失败不影响主流程
  }
}

export function applyWallpaper(imageUrl) {
  wallpaperStage ||= createWallpaperStage();
  currentWallpaper = imageUrl;

  const name = thumbNameOf(imageUrl);
  const thumb = name ? thumbSrcOf(thumbCache[name]) : null;
  performance.mark("wallpaper:bg-set");

  if (!thumb) {
    // 无垫底图：先让骨架屏那帧出去，再挂 4K 大图——首个合成帧若带着大图光栅化，会把首绘卡住几百毫秒
    requestAnimationFrame(() => requestAnimationFrame(() => {
      animateWallpaper(wallpaperStage, `url("${imageUrl}")`);
    }));
    return;
  }

  // 先铺小图立刻出画面；大图解码完成后在同一图层无感替换（垫底图当第二层背景兜底）
  animateWallpaper(wallpaperStage, `url("${thumb}")`);

  const probe = new Image();
  probe.onload = () => {
    performance.mark("wallpaper:full-loaded");
    const swap = () => {
      const activeLayer = wallpaperStage.layers[wallpaperStage.activeIndex];
      if (activeLayer && currentWallpaper === imageUrl) {
        activeLayer.style.backgroundImage = `url("${imageUrl}"), url("${thumb}")`;
      }
    };
    const decoded = probe.decode?.();
    if (decoded) decoded.then(swap, swap);
    else swap();

    // 缩略图缓存务必完全避开启动窗口：解码放 worker 线程（createImageBitmap），
    // 且延迟到首绘/入场动画结束之后，避免挤占首帧的内存带宽
    setTimeout(() => {
      const height = Math.max(1, Math.round(((probe.naturalHeight / probe.naturalWidth) || 270 / THUMB_WIDTH) * THUMB_WIDTH));
      if (typeof createImageBitmap === "function") {
        createImageBitmap(probe, {
          resizeWidth: THUMB_WIDTH,
          resizeHeight: height,
          resizeQuality: "medium"
        }).then((bitmap) => storeThumb(name, probe, bitmap), () => storeThumb(name, probe));
      } else {
        storeThumb(name, probe);
      }
    }, 3500);
  };
  probe.src = imageUrl;
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
