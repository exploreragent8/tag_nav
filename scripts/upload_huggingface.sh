#!/usr/bin/env bash
# Upload AgentNavigator DATA folder to a Hugging Face dataset repository.
#
# Usage:
#   export HF_DATASET=your-username/destbench
#   export AGENT_NAV_DATA=/path/to/DATA
#   bash scripts/upload_huggingface.sh
#
# Requires: pip install huggingface_hub && huggingface-cli login

set -euo pipefail

if ! command -v huggingface-cli &>/dev/null; then
  echo "Install: pip install -U huggingface_hub"
  exit 1
fi

echo "Creating dataset repo (if needed): $HF_DATASET"
huggingface-cli repo create "${HF_DATASET#*/}" --type dataset 2>/dev/null || true

echo "Uploading $DATA -> hf://datasets/$HF_DATASET"
huggingface-cli upload "$HF_DATASET" "$DATA" . --repo-type dataset

echo ""
echo "Done. Set in public/index.html:"
echo '  <meta name="hf-dataset" content="'"$HF_DATASET"'" />'
echo ""
echo "Or run: HF_DATASET=$HF_DATASET python scripts/configure_hf.py"
