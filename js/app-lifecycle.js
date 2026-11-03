export async function runAppLifecycle({ tasks, elements, recordError }) {
  try {
    const wallpaperPromise = tasks.startWallpaper();
    void tasks.startBookmarks();
    try {
      void Promise.resolve(tasks.removeLegacyData()).catch((error) => {
        recordError("Legacy bookmark data cleanup failed.", error);
      });
    } catch (error) {
      recordError("Legacy bookmark data cleanup failed.", error);
    }

    await tasks.ensureInitialData();
    tasks.applyTheme();

    await Promise.all([
      tasks.startProfile(),
      tasks.startSearch(),
      tasks.startSettings()
    ]);

    elements.body.classList.remove("app-loading");
    tasks.animate();
    void wallpaperPromise;
  } catch (error) {
    recordError("App bootstrap failed.", error);
    elements.bookmarkContainer?.classList.remove("is-loading");
    elements.bookmarkContainer?.classList.add("is-ready");
    elements.body.classList.remove("app-loading");
  }
}
