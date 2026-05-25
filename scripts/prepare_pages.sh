#!/usr/bin/env bash
# Build manifest from Hugging Face (screenshots always served from HF Hub).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export HF_DATASET="${HF_DATASET:-exploreragent8/DestBench}"
export HF_REVISION="${HF_REVISION:-main}"

python3 "$ROOT/scripts/build_manifest.py"
echo "Done. Screenshots: https://huggingface.co/datasets/$HF_DATASET"
