#!/usr/bin/env python3
"""Build manifest.json from the DestBench dataset on Hugging Face Hub."""

from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

HF_DATASET = os.environ.get("HF_DATASET", "exploreragent8/DestBench")

ALLOWED_APPS = frozenset(
    {"settings", "clock", "youtube", "google_maps", "calendar", "amazon"}
)
HF_REVISION = os.environ.get("HF_REVISION", "main")
OUT_PATH = Path(__file__).resolve().parent.parent / "public" / "data" / "manifest.json"
CACHE_DIR = Path(__file__).resolve().parent.parent / ".cache"
CACHE_FILES = CACHE_DIR / f"hf_files_{HF_DATASET.replace('/', '_')}.json"
FRAME_RE = re.compile(r"^frame_\d+.*\.png$", re.IGNORECASE)
WORKERS = int(os.environ.get("MANIFEST_WORKERS", "12"))

LOGO_SLUGS = {
    "airbnb": "airbnb",
    "amazon": "amazon",
    "calendar": "googlecalendar",
    "chrome": "googlechrome",
    "clock": "google",
    "ebay": "ebay",
    "google_maps": "googlemaps",
    "instagram": "instagram",
    "linkedin": "linkedin",
    "outlook": "microsoftoutlook",
    "settings": "android",
    "spotify": "spotify",
    "starbucks": "starbucks",
    "target": "target",
    "tiktok": "tiktok",
    "uber": "uber",
    "uber_eats": "ubereats",
    "walmart": "walmart",
    "yelp": "yelp",
    "youtube": "youtube",
}

HF_USER, HF_REPO = HF_DATASET.split("/", 1)
HF_BASE = f"https://huggingface.co/datasets/{HF_USER}/{HF_REPO}"
HF_RESOLVE = f"{HF_BASE}/resolve/{HF_REVISION}"
HF_API_TREE = f"https://huggingface.co/api/datasets/{HF_USER}/{HF_REPO}/tree"

# Fallback when app_versions.json is not on the Hub (match longest app key first).
DEFAULT_VERSIONS: dict[str, str] = {
    "yelp": "26.6.0-28260602",
    "google_maps": "26.06.01.863982022",
    "calendar": "2026.05.0-864040481-release",
    "airbnb": "26.06",
    "amazon": "32.3.0.100",
    "ebay": "6.242.0.2",
    "target": "2026.4.0",
    "uber": "4.616.10004",
    "uber_eats": "6.308.10000",
    "youtube": "21.05.264",
    "clock": "8.5",
    "outlook": "5.2604.1",
    "spotify": "9.1.20.1452",
    "starbucks": "6.114",
    "walmart": "26.3.1",
    "settings": "16",
    "linkedin": "4.1.1168",
    "instagram": "416.0.0.47.66",
    "tiktok": "43.8.3",
    "chrome": "144.0.7559.132",
}


def log(msg: str) -> None:
    print(msg, flush=True)


def hf_request(url: str, timeout: int = 120) -> bytes:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "destbench-manifest-build/1.0"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def hf_get_json(path: str) -> dict | list:
    encoded = "/".join(urllib.parse.quote(part, safe="") for part in path.split("/"))
    url = f"{HF_RESOLVE}/{encoded}"
    return json.loads(hf_request(url, timeout=60).decode())


def list_tree(path: str = "") -> list[dict]:
    """List one folder (non-recursive) from HF API."""
    segment = urllib.parse.quote(path, safe="") if path else ""
    url = f"{HF_API_TREE}/{HF_REVISION}/{segment}" if segment else f"{HF_API_TREE}/{HF_REVISION}"
    data = json.loads(hf_request(url, timeout=90).decode())
    return data if isinstance(data, list) else []


def list_repo_files_huggingface_hub() -> list[str] | None:
    try:
        from huggingface_hub import HfApi

        log("Using huggingface_hub to list files …")
        api = HfApi()
        paths = api.list_repo_files(
            repo_id=HF_DATASET,
            repo_type="dataset",
            revision=HF_REVISION,
        )
        return list(paths)
    except ImportError:
        return None
    except Exception as e:
        log(f"huggingface_hub failed ({e}), falling back to HTTP API …")
        return None


def list_repo_files_per_app() -> list[str]:
    """List files app-by-app (smaller requests, visible progress)."""
    log("Listing top-level apps from Hugging Face …")
    root = list_tree("")
    app_dirs = sorted(
        e["path"] for e in root if e.get("type") == "directory" and not e["path"].startswith(".")
    )
    log(f"Found {len(app_dirs)} app folders")

    all_files: list[str] = []
    for i, app in enumerate(app_dirs, 1):
        log(f"  [{i}/{len(app_dirs)}] {app} …")
        try:
            entries = list_tree(app)
        except urllib.error.HTTPError as e:
            log(f"    warning: skipped ({e.code})")
            continue

        for e in entries:
            name = e["path"]
            if e.get("type") == "file":
                all_files.append(f"{app}/{name}")
                continue
            if e.get("type") != "directory":
                continue
            task_path = f"{app}/{name}"
            try:
                task_entries = list_tree(task_path)
            except urllib.error.HTTPError:
                continue
            for te in task_entries:
                if te.get("type") == "file":
                    all_files.append(f"{task_path}/{te['path']}")

    return all_files


def list_repo_files_cached(force: bool = False) -> list[str]:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    max_age = int(os.environ.get("MANIFEST_CACHE_HOURS", "24")) * 3600

    if not force and CACHE_FILES.exists():
        age = time.time() - CACHE_FILES.stat().st_mtime
        if age < max_age:
            log(f"Using cached file list ({CACHE_FILES.name}, {age / 3600:.1f}h old)")
            return json.loads(CACHE_FILES.read_text())

    files = list_repo_files_huggingface_hub()
    if files is None:
        log("Listing task files per app (slower but shows progress) …")
        files = list_repo_files_per_app()

    CACHE_FILES.write_text(json.dumps(files))
    log(f"Cached {len(files)} file paths → {CACHE_FILES}")
    return files


def parse_app_dir(name: str, versions: dict[str, str]) -> tuple[str, str]:
    for app in sorted(versions, key=len, reverse=True):
        prefix = f"{app}_"
        if name.startswith(prefix):
            return app, name[len(prefix) :]
    if "_" in name:
        app, version = name.split("_", 1)
        return app, version
    return name, ""


def display_name(app: str) -> str:
    return app.replace("_", " ").title()


def load_task_meta(task_key: str, files_set: set[str]) -> dict | None:
    try:
        meta = hf_get_json(f"{task_key}/meta.json")
    except urllib.error.HTTPError:
        return None

    prompts = meta.get("prompts", [])
    prompts_path = f"{task_key}/prompts.json"
    if prompts_path in files_set:
        try:
            prompts = hf_get_json(prompts_path).get("prompts", prompts)
        except urllib.error.HTTPError:
            pass
    meta["_prompts_resolved"] = prompts
    return meta


def main() -> None:
    force = "--force" in sys.argv
    log(f"Building manifest from {HF_BASE} …")

    t0 = time.time()
    files = list_repo_files_cached(force=force)
    log(f"File listing done in {time.time() - t0:.1f}s ({len(files)} files)")

    files_set = set(files)

    versions: dict[str, str] = dict(DEFAULT_VERSIONS)
    if "app_versions.json" in files_set:
        try:
            versions = hf_get_json("app_versions.json")
        except urllib.error.HTTPError:
            log("  using built-in app_versions (app_versions.json not on Hub)")
    else:
        log("  using built-in app_versions (upload app_versions.json to Hub to override)")

    frames_by_task: dict[str, list[str]] = defaultdict(list)
    task_has_meta: set[str] = set()

    for f in files:
        parts = f.split("/")
        if len(parts) < 3:
            continue
        task_key = f"{parts[0]}/{parts[1]}"
        name = parts[-1]
        if name == "meta.json":
            task_has_meta.add(task_key)
        elif FRAME_RE.match(name):
            frames_by_task[task_key].append(name)

    tasks = sorted(t for t in task_has_meta if t in frames_by_task)
    log(f"Fetching meta.json for {len(tasks)} tasks ({WORKERS} workers) …")

    meta_by_task: dict[str, dict] = {}
    done = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = {pool.submit(load_task_meta, t, files_set): t for t in tasks}
        for fut in as_completed(futures):
            task_key = futures[fut]
            done += 1
            if done % 25 == 0 or done == len(tasks):
                log(f"  meta.json {done}/{len(tasks)}")
            meta = fut.result()
            if meta:
                meta_by_task[task_key] = meta

    trajectories: list[dict] = []
    apps_seen: dict[str, dict] = {}

    for task_key in tasks:
        meta = meta_by_task.get(task_key)
        if not meta:
            continue

        app_dir, task_dir = task_key.split("/", 1)
        app_name, version = parse_app_dir(app_dir, versions)
        if app_name not in ALLOWED_APPS:
            continue
        prompts = meta.get("_prompts_resolved", meta.get("prompts", []))
        frames = sorted(frames_by_task[task_key])

        trajectories.append(
            {
                "id": task_key,
                "app": app_name,
                "appDisplay": display_name(app_name),
                "version": version,
                "task": task_dir,
                "prompt": meta.get("prompt") or (prompts[0] if prompts else ""),
                "prompts": prompts,
                "frames": frames,
                "actions": meta.get("actions", []),
                "imageWidth": 960,
                "imageHeight": 2142,
            }
        )

        if app_dir not in apps_seen:
            apps_seen[app_dir] = {
                "id": app_dir,
                "app": app_name,
                "appDisplay": display_name(app_name),
                "version": version,
                "taskCount": 0,
                "logoSlug": LOGO_SLUGS.get(app_name, app_name),
            }
        apps_seen[app_dir]["taskCount"] += 1

    apps = sorted(apps_seen.values(), key=lambda a: a["id"])

    manifest = {
        "dataRoot": HF_BASE,
        "hfDataset": HF_DATASET,
        "hfRevision": HF_REVISION,
        "totalTasks": len(trajectories),
        "totalApps": len(apps),
        "apps": apps,
        "trajectories": trajectories,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(manifest, indent=2))
    log(f"Wrote {OUT_PATH} ({len(apps)} apps, {len(trajectories)} trajectories) in {time.time() - t0:.1f}s total")


if __name__ == "__main__":
    main()
