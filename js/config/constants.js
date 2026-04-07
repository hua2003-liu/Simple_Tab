import wallpapers from "./wallpapers.json" assert { type: "json" };

export const defaultBookmarks = [
  { title: "Grok", url: "https://grok.com", icon: "https://www.google.com/s2/favicons?domain=grok.com&sz=128" },
  { title: "ChatGPT", url: "https://chatgpt.com", icon: "https://www.google.com/s2/favicons?domain=chatgpt.com&sz=128" },
  { title: "X", url: "https://x.com", icon: "https://www.google.com/s2/favicons?domain=x.com&sz=128" },
  { title: "百度翻译", url: "https://fanyi.baidu.com", icon: "https://www.google.com/s2/favicons?domain=fanyi.baidu.com&sz=128" },
  { title: "GitHub", url: "https://github.com", icon: "https://www.google.com/s2/favicons?domain=github.com&sz=128" }
];

export const SEARCH_ENGINES = {
  bing: {
    label: "Bing",
    url: "https://www.bing.com/search?q="
  },
  google: {
    label: "Google",
    url: "https://www.google.com/search?q="
  },
  baidu: {
    label: "Baidu",
    url: "https://www.baidu.com/s?wd="
  }
};

export const STORAGE_KEYS = {
  bookmarks: "bookmarks",
  searchEngine: "search_engine",
  searchHistory: "search_history",
  displayName: "display_name"
};

export const NAVIGATION_DELAY_MS = 400;
export const MAX_HISTORY_ITEMS = 8;
