export function closeSettingsPanel(settingsPanel, settingsToggle) {
  if (!settingsPanel || !settingsToggle) {
    return;
  }

  settingsPanel.hidden = true;
  settingsToggle.setAttribute("aria-expanded", "false");
}

export function openSettingsPanel(settingsPanel, settingsToggle) {
  if (!settingsPanel || !settingsToggle) {
    return;
  }

  settingsPanel.hidden = false;
  settingsToggle.setAttribute("aria-expanded", "true");
}

export function updateThemePreviewControls(activePreview, controlsContainer) {
  if (!controlsContainer) {
    return;
  }

  Array.from(controlsContainer.querySelectorAll(".theme-preview-btn")).forEach((button) => {
    const isActive = button.dataset.themePreview === activePreview;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}
