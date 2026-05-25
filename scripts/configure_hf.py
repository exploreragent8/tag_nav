#!/usr/bin/env python3
"""Set Hugging Face dataset meta tags in public/index.html from env HF_DATASET."""

from __future__ import annotations

import os
import re
from pathlib import Path

INDEX = Path(__file__).resolve().parent.parent / "public" / "index.html"


def main() -> None:
    hf = os.environ.get("HF_DATASET", "").strip()
    revision = os.environ.get("HF_REVISION", "main").strip() or "main"
    html = INDEX.read_text()

    html = re.sub(
        r'(<meta name="hf-dataset" content=")[^"]*(")',
        rf'\1{hf}\2',
        html,
        count=1,
    )
    html = re.sub(
        r'(<meta name="hf-revision" content=")[^"]*(")',
        rf'\1{revision}\2',
        html,
        count=1,
    )
    INDEX.write_text(html)
    if hf:
        print(f"Set hf-dataset={hf} (revision={revision})")
    else:
        print("Cleared hf-dataset (using local dataset/ paths)")


if __name__ == "__main__":
    main()
