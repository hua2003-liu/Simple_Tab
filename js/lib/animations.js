const gsap = globalThis.gsap;
const CustomEase = globalThis.CustomEase;
const ScrambleTextPlugin = globalThis.ScrambleTextPlugin;
let reducedMotion = false;

if (gsap) {
  const plugins = [CustomEase, ScrambleTextPlugin].filter(Boolean);
  if (plugins.length) gsap.registerPlugin(...plugins);

  const media = gsap.matchMedia();
  media.add("(prefers-reduced-motion: reduce)", () => {
    reducedMotion = true;
    return () => { reducedMotion = false; };
  });
}

if (CustomEase && typeof CustomEase.create === "function") {
  CustomEase.create("tabSnap", "M0,0 C0.12,0 0.2,0.22 0.32,0.68 0.42,1.08 0.56,1.02 0.68,1 0.82,1 0.92,1 1,1");
}

const ease = CustomEase ? "tabSnap" : "power3.out";
const duration = (normalDuration) => (reducedMotion ? 0 : normalDuration);
const stagger = (normalStagger) => (reducedMotion ? 0 : normalStagger);

export function createWallpaperStage() {
  const stage = document.createElement("div");
  stage.className = "wallpaper-stage";
  stage.setAttribute("aria-hidden", "true");

  const layers = [0, 1].map(() => {
    const layer = document.createElement("div");
    layer.className = "wallpaper-layer";
    stage.appendChild(layer);
    return layer;
  });

  document.body.prepend(stage);

  if (gsap) {
    const quickX = gsap.quickTo(layers, "x", { duration: 1.1, ease: "power3.out" });
    const quickY = gsap.quickTo(layers, "y", { duration: 1.1, ease: "power3.out" });
    window.addEventListener("pointermove", (event) => {
      if (reducedMotion) return;
      const x = (event.clientX / window.innerWidth - 0.5) * -14;
      const y = (event.clientY / window.innerHeight - 0.5) * -10;
      quickX(x);
      quickY(y);
    }, { passive: true });
  }

  return { activeIndex: -1, layers };
}

export function animateWallpaper(stageState, backgroundImage) {
  if (!stageState) return;

  const nextIndex = stageState.activeIndex === 0 ? 1 : 0;
  const nextLayer = stageState.layers[nextIndex];
  const currentLayer = stageState.layers[stageState.activeIndex];
  const isInitial = stageState.activeIndex === -1;
  nextLayer.style.backgroundImage = backgroundImage;

  if (!gsap) {
    nextLayer.style.opacity = "1";
    if (currentLayer) currentLayer.style.opacity = "0";
    stageState.activeIndex = nextIndex;
    return;
  }

  gsap.killTweensOf(stageState.layers);
  gsap.set(nextLayer, {
    autoAlpha: 0,
    scale: isInitial ? 1.18 : 1.12,
    x: isInitial ? 0 : 38,
    y: isInitial ? 0 : 10,
    rotation: isInitial ? 0 : 0.5,
    clipPath: isInitial ? "inset(0 0 0 0)" : "inset(0 0 0 100%)"
  });
  gsap.to(nextLayer, {
    autoAlpha: 1,
    scale: 1,
    x: 0,
    y: 0,
    rotation: 0,
    clipPath: "inset(0 0 0 0)",
    duration: duration(isInitial ? 0.7 : 0.5),
    ease: isInitial ? "power3.out" : ease,
    overwrite: "auto"
  });

  if (currentLayer) {
    gsap.to(currentLayer, {
      autoAlpha: 0,
      scale: 1.06,
      x: -28,
      duration: duration(0.5),
      ease: "power2.inOut",
      overwrite: "auto"
    });
  }

  stageState.activeIndex = nextIndex;
}

function setGreetingText(element, text) {
  element.textContent = text;
  element.dataset.greeting = text;
}

export function animateGreeting(greetingElement, nextText, { immediate = false } = {}) {
  if (!greetingElement) return;
  const previousText = greetingElement.dataset.greeting || greetingElement.textContent || "";

  if (!gsap || immediate || reducedMotion) {
    setGreetingText(greetingElement, nextText);
    if (gsap) gsap.set(greetingElement, { autoAlpha: 1, y: 0, rotationX: 0, filter: "blur(0px)" });
    return;
  }

  if (previousText === nextText) return;
  gsap.killTweensOf(greetingElement);
  const timeline = gsap.timeline({ defaults: { overwrite: "auto" } });
  timeline.to(greetingElement, {
    autoAlpha: 0,
    y: -18,
    rotationX: -55,
    filter: "blur(10px)",
    duration: 0.24,
    ease: "power4.in"
  });
  if (ScrambleTextPlugin) {
    timeline.set(greetingElement, { y: 16, rotationX: 45, filter: "blur(7px)", autoAlpha: 0 });
    timeline.to(greetingElement, {
      autoAlpha: 1,
      y: 0,
      rotationX: 0,
      filter: "blur(0px)",
      duration: 0.7,
      ease,
      scrambleText: { text: nextText, chars: "upperAndLowerCase", revealDelay: 0.08, speed: 0.45 }
    });
  } else {
    timeline.call(() => setGreetingText(greetingElement, nextText));
    timeline.fromTo(greetingElement,
      { autoAlpha: 0, y: 18, rotationX: 45, filter: "blur(7px)" },
      { autoAlpha: 1, y: 0, rotationX: 0, filter: "blur(0px)", duration: 0.62, ease }
    );
  }
  greetingElement.dataset.greeting = nextText;
}

export function animateSearchFocus(searchForm, focused) {
  if (!searchForm || !gsap) return;
  searchForm.classList.toggle("is-focused", focused);
  const tag = searchForm.querySelector(".search-engine-tag");
  const button = searchForm.querySelector("#search-btn");
  gsap.to(searchForm, {
    y: focused ? -5 : 0,
    scale: focused ? 1.025 : 1,
    duration: duration(0.4),
    ease,
    overwrite: "auto"
  });
  if (tag) gsap.to(tag, { x: focused ? 2 : 0, rotation: focused ? -2 : 0, duration: duration(0.3), ease, overwrite: "auto" });
  if (button) gsap.to(button, { rotation: focused ? 90 : 0, scale: focused ? 1.05 : 1, duration: duration(0.34), ease, overwrite: "auto" });
}

export function animateSearchSubmit(searchButton, searchForm = searchButton?.closest("form")) {
  if (!searchButton || !gsap || reducedMotion) return;
  const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
  tl.to(searchButton, { scale: 0.72, rotation: 130, duration: 0.12, ease: "power4.in" })
    .to(searchButton, { scale: 1.18, rotation: 210, duration: 0.3, ease: "back.out(2.8)" })
    .to(searchButton, { scale: 1, rotation: 360, duration: 0.24, ease: "power2.out" });
  if (searchForm) {
    searchForm.classList.add("is-submitting");
    gsap.to(searchForm, {
      x: 3,
      duration: 0.12,
      yoyo: true,
      repeat: 1,
      ease: "power2.inOut",
      overwrite: "auto",
      onComplete: () => searchForm.classList.remove("is-submitting")
    });
  }
}

export function animateSearchEngineTag(tag) {
  if (!tag || !gsap || reducedMotion) return;
  gsap.fromTo(tag,
    { autoAlpha: 0, y: 10, x: -8, rotation: -8, scale: 0.78 },
    { autoAlpha: 1, y: 0, x: 0, rotation: 0, scale: 1, duration: 0.5, ease, overwrite: "auto" }
  );
}

export function animateHistoryItemState(item, active) {
  if (!item || !gsap) return;
  gsap.to(item, { x: active ? 8 : 0, scale: active ? 1.012 : 1, duration: duration(0.2), ease, overwrite: "auto" });
}

export function animateBookmarkInteraction(item, active) {
  if (!item || !gsap) return;
  const motion = item.querySelector(".bookmark-motion") || item;
  const icon = item.querySelector("img");
  const halo = item.querySelector(".bookmark-icon-wrap");

  // Keep hover motion on the inner layer so pointer tilt can own the outer card.
  gsap.killTweensOf(motion);
  gsap.to(motion, {
    y: active ? -8 : 0,
    scale: active ? 1.045 : 1,
    duration: duration(0.34),
    ease: active ? "back.out(1.8)" : "power3.out",
    overwrite: "auto"
  });
  if (icon) gsap.to(icon, { y: active ? -4 : 0, scale: active ? 1.16 : 1, rotation: active ? 5 : 0, duration: duration(0.34), ease, overwrite: "auto" });
  if (halo) gsap.to(halo, { rotation: active ? 18 : 0, scale: active ? 1.08 : 1, duration: duration(0.42), ease, overwrite: "auto" });
}


export function animatePageEnter({ greeting, searchModule, bookmarkModule, toolbar }) {
  if (!gsap) return;
  gsap.set([greeting, searchModule, bookmarkModule, toolbar].filter(Boolean), { transformOrigin: "50% 50%" });
  // 入场不用 blur：冷启动时全屏模糊栅格化会把首帧拖后几百毫秒，opacity+位移+3D 观感相当
  const tl = gsap.timeline({ defaults: { ease } });

  tl.fromTo(greeting,
    { autoAlpha: 0, y: 42, rotationX: -75 },
    { autoAlpha: 1, y: 0, rotationX: 0, duration: duration(0.35) }
  )
    .fromTo(searchModule,
      { autoAlpha: 0, y: 28, scaleX: 0.84 },
      { autoAlpha: 1, y: 0, scaleX: 1, duration: duration(0.35) },
      "-=0.2"
    );

  if (bookmarkModule) {
    tl.fromTo(bookmarkModule,
      { autoAlpha: 0, y: 46, rotationX: 35 },
      { autoAlpha: 1, y: 0, rotationX: 0, duration: duration(0.82) },
      "-=0.5"
    );
  }

  tl.fromTo(toolbar,
    { autoAlpha: 0, x: 26, rotation: 8 },
    { autoAlpha: 1, x: 0, rotation: 0, duration: duration(0.3), ease: "back.out(1.6)" },
    "-=0.25"
  );
}

export function animateBookmarkEnter(items) {
  if (!gsap || !items?.length) return;

  const offsets = [-24, 18, -14, 22, -18];
  const motions = items.map((item) => item.querySelector(".bookmark-motion") || item);

  if (document.body.classList.contains("app-loading")) {
    // 入场不用 blur：几十个书签卡同时模糊栅格化会拖垮冷启动首帧
    gsap.set(motions, { autoAlpha: 0, y: 30, scale: 0.68 });
    return;
  }

  gsap.killTweensOf(motions);

  // 超大数量才退到整体入场；常态一律逐个错开（观感活泼）
  if (items.length > 60) {
    const container = items[0]?.closest(".bookmark-cards") || items[0]?.parentElement;
    gsap.set(motions, { autoAlpha: 1, x: 0, y: 0, scale: 1 });
    if (container) {
      gsap.killTweensOf(container);
      gsap.fromTo(container,
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: duration(0.28), ease: "power2.out", clearProps: "transform" }
      );
    }
    return;
  }

  const timeline = gsap.timeline({ defaults: { overwrite: "auto" } });

  items.forEach((item, index) => {
    const motion = motions[index];
    // 只补间 motion 外层（图标标题是子节点，跟随移动）：
    // 不用 3D 翻转、不单独补间图标和标题——节点数与属性成本降到最低，保住丝滑
    timeline.fromTo(motion,
      { autoAlpha: 0, x: offsets[index % offsets.length], y: 26, scale: 0.94 },
      { autoAlpha: 1, x: 0, y: 0, scale: 1, duration: duration(0.3), ease: "power3.out" },
      index * Math.min(0.05, 0.5 / Math.max(items.length, 1))
    );
  });
}

export function animateHistoryVisibility(historyContainer, visible) {
  if (!historyContainer) return;
  if (!gsap) {
    historyContainer.style.display = visible ? "block" : "none";
    historyContainer.style.opacity = visible ? "1" : "0";
    return;
  }
  gsap.killTweensOf(historyContainer);
  const items = historyContainer.querySelectorAll(".history-item");
  if (visible) {
    historyContainer.style.display = "block";
    gsap.fromTo(historyContainer,
      { autoAlpha: 0, y: -14, scaleY: 0.86, transformOrigin: "50% 0%" },
      { autoAlpha: 1, y: 0, scaleY: 1, duration: duration(0.34), ease, overwrite: "auto" }
    );
    gsap.fromTo(items,
      { autoAlpha: 0, x: -14, clipPath: "inset(0 0 0 18%)" },
      { autoAlpha: 1, x: 0, clipPath: "inset(0 0 0 0%)", duration: duration(0.28), stagger: stagger(0.045), ease, overwrite: "auto" }
    );
    return;
  }
  gsap.to(historyContainer, {
    autoAlpha: 0,
    y: -10,
    scaleY: 0.9,
    duration: duration(0.22),
    ease: "power3.in",
    overwrite: "auto",
    onComplete: () => { historyContainer.style.display = "none"; }
  });
}

export function animateSettingsPanel(settingsPanel, visible) {
  if (!settingsPanel) return;
  if (!gsap) { settingsPanel.hidden = !visible; return; }
  gsap.killTweensOf(settingsPanel);
  if (visible) {
    settingsPanel.hidden = false;
    gsap.fromTo(settingsPanel,
      { autoAlpha: 0, y: -18, x: 18, scale: 0.9, rotation: 2 },
      { autoAlpha: 1, y: 0, x: 0, scale: 1, rotation: 0, duration: duration(0.38), ease: "back.out(1.45)" }
    );
    return;
  }
  gsap.to(settingsPanel, {
    autoAlpha: 0,
    y: -12,
    x: 12,
    scale: 0.94,
    duration: duration(0.2),
    ease: "power3.in",
    onComplete: () => { settingsPanel.hidden = true; }
  });
}

export function animatePageLeave(mainContainer, url, delayMs) {
  if (!mainContainer || !gsap) {
    setTimeout(() => { window.location.href = url; }, reducedMotion ? 0 : delayMs);
    return;
  }
  gsap.timeline({ onComplete: () => { window.location.href = url; } })
    .to(mainContainer, { autoAlpha: 0, y: -30, scale: 0.96, filter: "blur(10px)", duration: duration(0.36), ease: "power4.in" })
    .to(document.body, { "--page-exit": 1, duration: duration(0.12) }, "-=0.16");
}
