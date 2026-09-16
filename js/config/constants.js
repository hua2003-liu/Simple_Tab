export const defaultBookmarks = [
  { title: "Google", url: "https://google.com", icon: "assets/icons/google.png" },
  { title: "ChatGPT", url: "https://chatgpt.com", icon: "assets/icons/chatgpt.png" },
  { title: "X", url: "https://x.com", icon: "assets/icons/x.png" },
  { title: "YouTube", url: "https://youtube.com", icon: "assets/icons/youtube.png" },
  { title: "百度翻译", url: "https://fanyi.baidu.com", icon: "assets/icons/baidu-translate.png" },
  { title: "GitHub", url: "https://github.com", icon: "assets/icons/github.png" },
  { title: "智谱Coding", url: "https://bigmodel.cn/coding-plan/personal/overview", icon: "assets/icons/bigmodel.png" },
  { title: "HelloGitHub", url: "https://hellogithub.com", icon: "assets/icons/hellogithub.png" },
  { title: "Skills.sh", url: "https://skills.sh", icon: "assets/icons/skills-sh.png" },
  { title: "SkillsMP", url: "https://skillsmp.com/zh", icon: "assets/icons/skillsmp.png" }
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

export const BOOKMARKS_VERSION = 9;

export const STORAGE_KEYS = {
  bookmarks: "bookmarks",
  searchEngine: "search_engine",
  searchHistory: "search_history",
  displayName: "display_name",
  wallpaper: "wallpaper",
  wallpaperMode: "wallpaper_mode",
  wallpaperIndex: "wallpaper_index",
  bookmarksVersion: "bookmarks_version"
};

export const NAVIGATION_DELAY_MS = 400;
export const MAX_HISTORY_ITEMS = 8;
