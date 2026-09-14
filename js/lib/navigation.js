import { animatePageLeave } from "./animations.js";

export function navigateWithTransition({ mainContainer, url, delayMs }) {
  animatePageLeave(mainContainer, url, delayMs);
}
