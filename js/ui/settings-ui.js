import { animateSettingsPanel } from "../lib/animations.js";

export function closeSettingsPanel(settingsPanel, settingsToggle) {
  if (!settingsPanel || !settingsToggle) {
    return;
  }

  animateSettingsPanel(settingsPanel, false);
  settingsToggle.setAttribute("aria-expanded", "false");
}

export function openSettingsPanel(settingsPanel, settingsToggle) {
  if (!settingsPanel || !settingsToggle) {
    return;
  }

  animateSettingsPanel(settingsPanel, true);
  settingsToggle.setAttribute("aria-expanded", "true");
}
