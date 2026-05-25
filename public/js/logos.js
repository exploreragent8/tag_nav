/** App logo URLs — local SVGs for reliable branding. */

import { SITE_BASE } from "./config.js";

const LOCAL_LOGOS = {
  amazon: "amazon",
  linkedin: "linkedin",
  walmart: "walmart",
  outlook: "outlook",
  clock: "clock",
};

const CDN_SLUGS = {
  airbnb: "airbnb",
  calendar: "googlecalendar",
  chrome: "googlechrome",
  ebay: "ebay",
  google_maps: "googlemaps",
  instagram: "instagram",
  settings: "android",
  spotify: "spotify",
  starbucks: "starbucks",
  target: "target",
  tiktok: "tiktok",
  uber: "uber",
  uber_eats: "ubereats",
  yelp: "yelp",
  youtube: "youtube",
};

export function getLogoUrl(app) {
  if (LOCAL_LOGOS[app]) return `${SITE_BASE}logos/${LOCAL_LOGOS[app]}.svg`;
  const slug = CDN_SLUGS[app] || app;
  return `https://cdn.simpleicons.org/${slug}`;
}

export function applyLogo(imgEl, fallbackEl, app, appDisplay) {
  if (!app || !imgEl) return;

  const url = getLogoUrl(app);
  const showFallback = () => {
    imgEl.hidden = true;
    if (fallbackEl) {
      fallbackEl.textContent = (appDisplay || app).charAt(0);
      fallbackEl.hidden = false;
    }
  };
  const showImage = () => {
    imgEl.hidden = false;
    if (fallbackEl) fallbackEl.hidden = true;
  };

  imgEl.onerror = showFallback;
  imgEl.onload = showImage;
  imgEl.src = url;
  imgEl.alt = appDisplay || app;

  if (imgEl.complete && imgEl.naturalWidth > 0) {
    showImage();
  } else {
    imgEl.hidden = true;
    if (fallbackEl) fallbackEl.hidden = true;
  }
}

export function clearLogo(imgEl, fallbackEl) {
  if (imgEl) {
    imgEl.removeAttribute("src");
    imgEl.hidden = true;
    imgEl.onerror = null;
    imgEl.onload = null;
  }
  if (fallbackEl) fallbackEl.hidden = true;
}
