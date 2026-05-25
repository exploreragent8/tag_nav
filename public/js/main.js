import { TrajectoryPlayer } from "./trajectory-player.js";
import { initStatsCharts } from "./stats-chart.js";
import { applyLogo, clearLogo, getLogoUrl } from "./logos.js";
import { MANIFEST_URL } from "./config.js";

const ALLOWED_APPS = new Set([
  "settings",
  "clock",
  "youtube",
  "google_maps",
  "calendar",
  "amazon",
]);

let manifest = null;
let player = null;
let selectedTrajectory = null;
let trajectoriesByAppDir = new Map();

function filterManifest(data) {
  const apps = data.apps.filter((a) => ALLOWED_APPS.has(a.app));
  const trajectories = data.trajectories.filter((t) => ALLOWED_APPS.has(t.app));
  return {
    ...data,
    apps,
    trajectories,
    totalApps: apps.length,
    totalTasks: trajectories.length,
  };
}

async function loadManifest() {
  const res = await fetch(MANIFEST_URL);
  manifest = filterManifest(await res.json());
  trajectoriesByAppDir = new Map();
  for (const t of manifest.trajectories) {
    const dir = t.id.split("/")[0];
    if (!trajectoriesByAppDir.has(dir)) trajectoriesByAppDir.set(dir, []);
    trajectoriesByAppDir.get(dir).push(t);
  }
  return manifest;
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function pickRandomTrajectory() {
  const pool = manifest.trajectories.filter((t) => ALLOWED_APPS.has(t.app));
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function renderAppGrid(apps) {
  const grid = document.getElementById("app-grid");
  grid.innerHTML = apps
    .map((app) => {
      const initial = app.appDisplay.charAt(0);
      const logoUrl = getLogoUrl(app.app);
      return `
        <button type="button" class="app-card" data-app-dir="${escapeHtml(app.id)}" data-app="${escapeHtml(app.app)}" aria-pressed="false">
          <div class="logo-slot">
            <img src="${logoUrl}" alt="${escapeHtml(app.appDisplay)}"
                 onerror="this.hidden=true;this.nextElementSibling.hidden=false">
            <span class="fallback-logo" hidden>${initial}</span>
          </div>
          <h3>${escapeHtml(app.appDisplay)}</h3>
          <p class="app-version">v${escapeHtml(app.version)}</p>
          <p class="app-task-count">${app.taskCount} tasks</p>
        </button>`;
    })
    .join("");

  grid.querySelectorAll(".app-card").forEach((card) => {
    card.addEventListener("click", () => selectApp(card.dataset.appDir, card.dataset.app));
  });
}

function resetTaskPanel() {
  const panelLogo = document.getElementById("panel-app-logo");
  const panelFallback = document.getElementById("panel-app-logo-fallback");
  const placeholder = document.getElementById("panel-placeholder-icon");

  document.getElementById("task-panel-title").textContent = "Tasks";
  document.getElementById("task-panel-hint").textContent =
    "Select an application to browse tasks";
  document.getElementById("task-list").innerHTML = "";
  clearLogo(panelLogo, panelFallback);
  if (placeholder) placeholder.hidden = false;
}

function selectApp(appDir, appKey) {
  document.querySelectorAll(".app-card").forEach((c) => {
    const on = c.dataset.appDir === appDir;
    c.classList.toggle("selected", on);
    c.setAttribute("aria-pressed", on ? "true" : "false");
  });

  const app = manifest.apps.find((a) => a.id === appDir);
  const tasks = trajectoriesByAppDir.get(appDir) || [];
  const list = document.getElementById("task-list");
  const title = document.getElementById("task-panel-title");
  const panelLogo = document.getElementById("panel-app-logo");
  const panelFallback = document.getElementById("panel-app-logo-fallback");
  const placeholder = document.getElementById("panel-placeholder-icon");

  title.textContent = app?.appDisplay || appKey;
  document.getElementById("task-panel-hint").textContent = "Select a task to play";
  if (placeholder) placeholder.hidden = true;
  applyLogo(panelLogo, panelFallback, appKey, app?.appDisplay);

  list.innerHTML = tasks
    .map((t) => {
      const label = t.prompt || t.prompts?.[0] || "Navigation task";
      const active = selectedTrajectory?.id === t.id ? " active" : "";
      return `<li><button type="button" class="task-item${active}" data-trajectory-id="${escapeHtml(t.id)}">${escapeHtml(label)}</button></li>`;
    })
    .join("");

  list.querySelectorAll(".task-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const traj = tasks.find((t) => t.id === btn.dataset.trajectoryId);
      if (traj) selectAndPlayTrajectory(traj);
    });
  });
}

async function selectAndPlayTrajectory(trajectory) {
  selectedTrajectory = trajectory;
  document.querySelectorAll(".task-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.trajectoryId === trajectory.id);
  });
  document.getElementById("demo").scrollIntoView({ behavior: "smooth", block: "start" });
  await playTrajectory(trajectory);
}

async function playRandom() {
  const trajectory = pickRandomTrajectory();
  if (!trajectory) return;
  selectedTrajectory = trajectory;
  document.querySelectorAll(".task-item").forEach((el) => el.classList.remove("active"));
  await playTrajectory(trajectory);
}

async function playTrajectory(trajectory = selectedTrajectory) {
  const btn = document.getElementById("btn-play");
  if (!trajectory) return;

  btn.disabled = true;
  player.stop();
  await player.play(trajectory);
  btn.disabled = false;
}

function updateHeroStats(manifest) {
  document.getElementById("stat-apps").textContent = manifest.totalApps;
  document.getElementById("stat-tasks").textContent = manifest.totalTasks;
  const totalFrames = manifest.trajectories.reduce((s, t) => s + t.frames.length, 0);
  document.getElementById("stat-frames").textContent = totalFrames.toLocaleString();
}

function setupCharts(apps) {
  const barCanvas = document.getElementById("chart-bar");
  const pieCanvas = document.getElementById("chart-pie");
  initStatsCharts(apps, barCanvas, pieCanvas);

  document.getElementById("toggle-bar").addEventListener("click", () => {
    document.getElementById("chart-bar-wrap").style.display = "block";
    document.getElementById("chart-pie-wrap").style.display = "none";
    document.getElementById("toggle-bar").classList.add("active");
    document.getElementById("toggle-pie").classList.remove("active");
  });

  document.getElementById("toggle-pie").addEventListener("click", () => {
    document.getElementById("chart-bar-wrap").style.display = "none";
    document.getElementById("chart-pie-wrap").style.display = "block";
    document.getElementById("toggle-pie").classList.add("active");
    document.getElementById("toggle-bar").classList.remove("active");
  });
}

async function init() {
  const data = await loadManifest();
  renderAppGrid(data.apps);
  updateHeroStats(data);
  setupCharts(data.apps);
  resetTaskPanel();

  player = new TrajectoryPlayer({
    instruction: document.getElementById("instruction"),
    actionLabel: document.getElementById("action-label"),
    strip: document.getElementById("trajectory-strip"),
    appName: document.getElementById("demo-app-name"),
    appVersion: document.getElementById("demo-app-version"),
    appLogo: document.getElementById("demo-app-logo"),
    appLogoFallback: document.getElementById("demo-app-logo-fallback"),
    onIdle: () => {},
  });

  document.getElementById("btn-play").addEventListener("click", () => playRandom());
  setTimeout(playRandom, 600);
}

init().catch((err) => {
  console.error(err);
  document.getElementById("instruction").textContent =
    "Failed to load dataset manifest. Run: python scripts/build_manifest.py && python server.py";
});
