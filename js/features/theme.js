export function getTimeTheme(date = new Date()) {
  const hour = date.getHours();

  if (hour >= 9 && hour < 12) {
    return "morning";
  }

  if (hour >= 12 && hour < 15) {
    return "noon";
  }

  if (hour >= 15 && hour < 19) {
    return "afternoon";
  }

  return "night";
}

export function createThemeController({ greetingElement }) {
  let activeThemePreview = "auto";
  let displayName = "";

  const getThemeName = (date = new Date()) => {
    return activeThemePreview === "auto" ? getTimeTheme(date) : activeThemePreview;
  };

  const applyTheme = (date = new Date()) => {
    const themeName = getThemeName(date);
    document.body.classList.remove(
      "theme-morning",
      "theme-noon",
      "theme-afternoon",
      "theme-night"
    );
    document.body.classList.add(`theme-${themeName}`);
    return themeName;
  };

  const renderGreeting = () => {
    if (!greetingElement) {
      return;
    }

    const themeName = getThemeName();
    let greeting = "你好";

    if (themeName === "morning") {
      greeting = "Good morning";
    } else if (themeName === "noon") {
      greeting = "Good day";
    } else if (themeName === "afternoon") {
      greeting = "Good afternoon";
    } else {
      greeting = "Good evening";
    }

    if (displayName) {
      greeting = `${greeting}, ${displayName}`;
    }

    greetingElement.textContent = greeting;
  };

  return {
    applyTheme,
    renderGreeting,
    getActivePreview() {
      return activeThemePreview;
    },
    previewTheme(nextPreview) {
      activeThemePreview = nextPreview || "auto";
      applyTheme();
      renderGreeting();
    },
    updateDisplayName(nextDisplayName) {
      displayName = nextDisplayName.trim();
      renderGreeting();
    }
  };
}
