export function navigateWithTransition({ mainContainer, url, delayMs }) {
  if (mainContainer) {
    mainContainer.classList.add("leave");
  }

  setTimeout(() => {
    window.location.href = url;
  }, delayMs);
}
