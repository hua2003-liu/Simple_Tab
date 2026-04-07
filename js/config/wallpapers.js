let wallpapers = [];

export async function loadWallpapers() {
  if (wallpapers.length > 0) return wallpapers;
  const response = await fetch('./wallpapers.json');
  wallpapers = await response.json();
  return wallpapers;
}

export function getWallpapers() {
  return wallpapers;
}
