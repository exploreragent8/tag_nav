# DestBench Dataset Showcase

Showcase website for the DestBench mobile navigation dataset ([Hugging Face](https://huggingface.co/datasets/exploreragent8/DestBench)).

## Features

- **Paper overview** — title, framework figure, Hugging Face dataset link
- **Live trajectory playback** — typewriter instruction, tap/scroll overlays
- **App grid** — logos and task picker
- **Statistics** — tasks per application

All **screenshots** are loaded from Hugging Face (`exploreragent8/DestBench`). Task metadata lives in `public/data/manifest.json` (built from the same Hub repo). The showcase includes six apps: Settings, Clock, YouTube, Google Maps, Calendar, and Amazon.

## Quick start

```bash
cd path/frontend_dataset_paper

# Refresh manifest from Hugging Face (optional; `public/data/manifest.json` is included)
python scripts/build_manifest.py
# Faster if stuck: pip install huggingface_hub
# Force refresh: python scripts/build_manifest.py --force

python server.py
# Open http://127.0.0.1:8080
```

## Environment

| Variable | Default |
|----------|---------|
| `HF_DATASET` | `exploreragent8/DestBench` |
| `HF_REVISION` | `main` |
| `PORT` | `8080` |

## Host on GitHub Pages

Step-by-step guide: **[docs/GITHUB_PAGES.md](docs/GITHUB_PAGES.md)**

Quick summary: create a GitHub repo → `git push` → **Settings → Pages → Source: GitHub Actions** → open `https://exploreragent8.github.io/tag_nav/`.

Screenshots stay on Hugging Face; no `public/dataset/` in git.

See **[docs/HUGGINGFACE.md](docs/HUGGINGFACE.md)** for the dataset on the Hub.
