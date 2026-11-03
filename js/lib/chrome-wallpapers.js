const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

function isImage(name) {
  const dot = name.lastIndexOf(".");
  return dot >= 0 && IMAGE_EXTENSIONS.has(name.slice(dot).toLowerCase());
}

function readAllFileNames(reader) {
  return new Promise((resolve, reject) => {
    const names = [];

    const step = () => {
      // readEntries 每次最多返回 100 条，读到空数组才算枚举完
      reader.readEntries((entries) => {
        if (entries.length === 0) {
          resolve(names);
          return;
        }
        entries.filter((entry) => entry.isFile && isImage(entry.name))
          .forEach((entry) => names.push(entry.name));
        step();
      }, reject);
    };

    step();
  });
}

export function createPackageWallpaperSource(directory = "wallpapers") {
  return {
    list: () => new Promise((resolve) => {
      const fail = () => resolve([]);

      // 回调式 API 返回 undefined，不能用返回值判断可用性
      if (!chrome.runtime.getPackageDirectoryEntry) {
        fail();
        return;
      }

      try {
        chrome.runtime.getPackageDirectoryEntry((root) => {
          if (!root) {
            fail();
            return;
          }
          root.getDirectory(directory, {}, (dir) => {
            readAllFileNames(dir.createReader()).then(
              (names) => resolve(names.sort((a, b) => a.localeCompare(b, "zh-Hans-CN", { numeric: true, sensitivity: "base" }))),
              fail
            );
          }, fail);
        });
      } catch {
        fail();
      }
    })
  };
}
