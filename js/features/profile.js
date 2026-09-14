import { STORAGE_KEYS } from "../config/constants.js";

export async function initProfile({ displayNameInput, storageApi, onDisplayNameChange }) {
  const storedData = await storageApi.storageGet([STORAGE_KEYS.displayName]);
  const displayName = typeof storedData[STORAGE_KEYS.displayName] === "string"
    ? storedData[STORAGE_KEYS.displayName].trim()
    : "";

  if (displayNameInput) {
    displayNameInput.value = displayName;
    displayNameInput.addEventListener("input", async () => {
      const nextName = displayNameInput.value.trim();
      await storageApi.storageSet({ [STORAGE_KEYS.displayName]: nextName });
      onDisplayNameChange(nextName);
    });
  }

  onDisplayNameChange(displayName);
}
