#!/usr/bin/env python3
"""Local dev server for the DestBench showcase (static site only)."""

from __future__ import annotations

import json
import os
import random
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / "public"
MANIFEST = PUBLIC / "data" / "manifest.json"
HF_DATASET = os.environ.get("HF_DATASET", "exploreragent8/DestBench")

ALLOWED_APPS = frozenset(
    {"settings", "clock", "youtube", "google_maps", "calendar", "amazon"}
)


class ShowcaseHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC), **kwargs)

    def do_HEAD(self) -> None:
        self.do_GET(send_body=False)

    def do_GET(self, send_body: bool = True) -> None:
        parsed = urlparse(self.path)
        path = unquote(parsed.path)

        if path == "/api/manifest":
            return self._send_json(self._load_manifest(), send_body=send_body)

        if path == "/api/trajectory/random":
            manifest = self._load_manifest()
            trajectories = manifest.get("trajectories", [])
            if not trajectories:
                return self._send_json({"error": "no trajectories"}, status=404, send_body=send_body)
            pick = random.choice(trajectories)
            return self._send_json(pick, send_body=send_body)

        if path.startswith("/api/trajectory/"):
            tid = path[len("/api/trajectory/") :]
            manifest = self._load_manifest()
            for t in manifest.get("trajectories", []):
                if t["id"] == tid:
                    return self._send_json(t, send_body=send_body)
            return self._send_json({"error": "not found"}, status=404, send_body=send_body)

        return super().do_GET()

    def _load_manifest(self) -> dict:
        if not MANIFEST.exists():
            return {"apps": [], "trajectories": []}
        manifest = json.loads(MANIFEST.read_text())
        return self._filter_manifest(manifest)

    def _filter_manifest(self, manifest: dict) -> dict:
        apps = [a for a in manifest.get("apps", []) if a.get("app") in ALLOWED_APPS]
        trajectories = [
            t for t in manifest.get("trajectories", []) if t.get("app") in ALLOWED_APPS
        ]
        return {
            **manifest,
            "apps": apps,
            "trajectories": trajectories,
            "totalApps": len(apps),
            "totalTasks": len(trajectories),
        }

    def _send_json(self, payload: dict, status: int = 200, send_body: bool = True) -> None:
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        if send_body:
            self.wfile.write(body)


def main() -> None:
    base_port = int(os.environ.get("PORT", "8080"))
    last_err: OSError | None = None

    for port in range(base_port, base_port + 10):
        try:
            server = ThreadingHTTPServer(("127.0.0.1", port), ShowcaseHandler)
            server.allow_reuse_address = True
            break
        except OSError as e:
            if e.errno != 98:
                raise
            last_err = e
    else:
        raise SystemExit(
            f"No free port in {base_port}–{base_port + 9}. "
            f"Stop the existing server (e.g. lsof -i :{base_port}) or set PORT."
        ) from last_err

    if port != base_port:
        print(f"Port {base_port} in use, using {port} instead.")
    print(f"Serving at http://127.0.0.1:{port}")
    print(f"Dataset (screenshots): https://huggingface.co/datasets/{HF_DATASET}")
    server.serve_forever()


if __name__ == "__main__":
    main()
