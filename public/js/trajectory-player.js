/**
 * Live trajectory playback: typewriter prompt, tap/scroll overlays, frame strip.
 */

import { applyLogo } from "./logos.js";
import { datasetUrl } from "./config.js";

const TAP_CURSOR_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M5 3l14 9-6.5 1.5L11 21l-6-18z"/></svg>`;

const SCROLL_DOWN_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 13l7 7 7-7"/></svg>`;

const SCROLL_UP_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 11l7-7 7 7"/></svg>`;

export class TrajectoryPlayer {
  constructor(elements) {
    this.instructionEl = elements.instruction;
    this.actionLabelEl = elements.actionLabel;
    this.stripEl = elements.strip;
    this.appNameEl = elements.appName;
    this.appVersionEl = elements.appVersion;
    this.appLogoEl = elements.appLogo;
    this.appLogoFallbackEl = elements.appLogoFallback;
    this.onIdle = elements.onIdle;
    this.running = false;
    this.abort = false;
  }

  stop() {
    this.abort = true;
    this.running = false;
  }

  async play(trajectory) {
    this.stop();
    this.abort = false;
    this.running = true;
    this.stripEl.innerHTML = "";
    this._setAppHeader(trajectory);

    const prompt = trajectory.prompt || trajectory.prompts?.[0] || "Follow the navigation task.";
    await this._typewriter(prompt);
    if (this.abort) return;

    const frames = trajectory.frames || [];
    const actions = trajectory.actions || [];
    const iw = trajectory.imageWidth || 960;
    const ih = trajectory.imageHeight || 2142;

    let prevCard = null;
    for (let i = 0; i < frames.length; i++) {
      if (this.abort) return;

      const card = this._createFrameCard(trajectory.id, frames[i], i);
      this.stripEl.appendChild(card);

      if (prevCard) {
        const arrow = document.createElement("div");
        arrow.className = "arrow-connector";
        arrow.innerHTML = "→";
        this.stripEl.insertBefore(arrow, card);
        requestAnimationFrame(() => arrow.classList.add("visible"));
      }

      requestAnimationFrame(() => card.classList.add("visible"));
      this._scrollStripToEnd();
      await this._sleep(600);

      if (i < actions.length) {
        const action = actions[i];
        await this._performAction(card, action, iw, ih);
        if (this.abort) return;
        await this._sleep(400);
      }

      prevCard = card;
      document.querySelectorAll(".frame-card.active").forEach((el) => el.classList.remove("active"));
      card.classList.add("active");
    }

    this.running = false;
    this.onIdle?.();
  }

  _setAppHeader(trajectory) {
    this.appNameEl.textContent = trajectory.appDisplay || trajectory.app;
    this.appVersionEl.textContent = trajectory.version ? `v${trajectory.version}` : "";
    applyLogo(
      this.appLogoEl,
      this.appLogoFallbackEl,
      trajectory.app,
      trajectory.appDisplay
    );
  }

  _createFrameCard(trajId, frameName, index) {
    const card = document.createElement("div");
    card.className = "frame-card";

    const phone = document.createElement("div");
    phone.className = "phone-frame";

    const screen = document.createElement("div");
    screen.className = "phone-screen";

    const img = document.createElement("img");
    img.src = datasetUrl(trajId, frameName);
    img.alt = `Frame ${index}`;
    img.loading = "eager";

    const tapCursor = document.createElement("div");
    tapCursor.className = "tap-cursor";
    tapCursor.innerHTML = `<div class="ring"></div>${TAP_CURSOR_SVG}`;

    const scrollInd = document.createElement("div");
    scrollInd.className = "scroll-indicator down";
    scrollInd.innerHTML = `${SCROLL_DOWN_SVG}<span>Scroll</span>`;

    screen.appendChild(img);
    screen.appendChild(tapCursor);
    screen.appendChild(scrollInd);
    phone.appendChild(screen);

    const step = document.createElement("div");
    step.className = "frame-step";
    step.textContent = index === 0 ? "Start" : `Step ${index}`;

    card.appendChild(phone);
    card.appendChild(step);
    card._tapCursor = tapCursor;
    card._scrollInd = scrollInd;
    card._screen = screen;
    return card;
  }

  async _performAction(card, action, iw, ih) {
    const type = action.action || "wait";
    const label = this._actionLabel(type);
    this._showActionLabel(label);

    if (type === "tap" && action.x != null && action.y != null) {
      const screen = card._screen;
      const img = screen.querySelector("img");
      await this._waitForImage(img);
      const rect = img.getBoundingClientRect();
      const scaleX = img.clientWidth / iw;
      const scaleY = img.clientHeight / ih;
      const x = action.x * scaleX;
      const y = action.y * scaleY;
      const cursor = card._tapCursor;
      cursor.style.left = `${x}px`;
      cursor.style.top = `${y}px`;
      cursor.classList.add("show");
      await this._sleep(700);
      cursor.classList.remove("show");
    } else if (type === "scroll_down" || type === "scroll_up") {
      const scrollInd = card._scrollInd;
      scrollInd.className = `scroll-indicator show ${type === "scroll_up" ? "up" : "down"}`;
      scrollInd.innerHTML =
        type === "scroll_up"
          ? `${SCROLL_UP_SVG}<span>Scroll up</span>`
          : `${SCROLL_DOWN_SVG}<span>Scroll down</span>`;
      const img = card._screen.querySelector("img");
      img.style.transition = "transform 0.5s ease";
      img.style.transform = type === "scroll_down" ? "translateY(-8%)" : "translateY(8%)";
      await this._sleep(800);
      img.style.transform = "";
      scrollInd.classList.remove("show");
    } else {
      await this._sleep(500);
    }
  }

  _actionLabel(type) {
    const map = {
      tap: "Tap",
      scroll_down: "Scroll down",
      scroll_up: "Scroll up",
      wait: "Wait",
    };
    return map[type] || type;
  }

  _showActionLabel(text) {
    if (!this.actionLabelEl) return;
    this.actionLabelEl.textContent = `▶ ${text}`;
    this.actionLabelEl.classList.add("visible");
    setTimeout(() => this.actionLabelEl.classList.remove("visible"), 1200);
  }

  async _typewriter(text) {
    this.instructionEl.innerHTML = "";
    const cursor = document.createElement("span");
    cursor.className = "cursor-blink";
    for (let i = 0; i <= text.length; i++) {
      if (this.abort) return;
      this.instructionEl.textContent = text.slice(0, i);
      this.instructionEl.appendChild(cursor);
      await this._sleep(28 + Math.random() * 18);
    }
    await this._sleep(500);
  }

  _scrollStripToEnd() {
    const viewport = this.stripEl.parentElement;
    if (viewport) {
      viewport.scrollTo({ left: viewport.scrollWidth, behavior: "smooth" });
    }
  }

  _waitForImage(img) {
    if (img.complete) return Promise.resolve();
    return new Promise((res) => {
      img.onload = res;
      img.onerror = res;
    });
  }

  _sleep(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }
}
