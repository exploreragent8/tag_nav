/** Site base path for assets (trailing slash). Works on GitHub Pages project sites. */
function detectBase() {
  const meta = document.querySelector('meta[name="site-base"]');
  if (meta?.content) {
    const configured = meta.content.trim();
    const base = configured.endsWith("/") ? configured : `${configured}/`;
    const path = window.location.pathname;
    const prefix = base.replace(/\/$/, "");
    // Use Pages base only when the app is actually served under that path.
    if (path === base || path === prefix || path.startsWith(`${prefix}/`)) {
      return base;
    }
  }
  if (window.location.hostname.endsWith("github.io")) {
    const seg = window.location.pathname.split("/").filter(Boolean)[0];
    if (seg && !/\.[a-z]+$/i.test(seg)) return `/${seg}/`;
  }
  return "/";
}

const DEFAULT_HF_DATASET = "exploreragent8/DestBench";

function detectHuggingFaceDataset() {
  const meta = document.querySelector('meta[name="hf-dataset"]');
  const raw = (meta?.content?.trim() || DEFAULT_HF_DATASET).trim();

  if (raw.startsWith("http")) {
    return raw.endsWith("/") ? raw : `${raw}/`;
  }

  const revision =
    document.querySelector('meta[name="hf-revision"]')?.content?.trim() || "main";
  const [user, repo] = raw.split("/").filter(Boolean);
  if (!user || !repo) {
    const [u, r] = DEFAULT_HF_DATASET.split("/");
    return `https://huggingface.co/datasets/${u}/${r}/resolve/main/`;
  }

  return `https://huggingface.co/datasets/${user}/${repo}/resolve/${revision}/`;
}

export const SITE_BASE = detectBase();
export const MANIFEST_URL = `${SITE_BASE}data/manifest.json`;
export const HF_DATASET_BASE = detectHuggingFaceDataset();

/** Screenshot URL on Hugging Face Hub (always). */
export function datasetUrl(trajectoryId, frameName) {
  return `${HF_DATASET_BASE}${trajectoryId}/${frameName}`;
}
