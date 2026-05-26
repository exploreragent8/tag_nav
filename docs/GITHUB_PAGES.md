# Host DestBench showcase on GitHub Pages

Your site is static (`public/`). Screenshots load from [exploreragent8/DestBench](https://huggingface.co/datasets/exploreragent8/DestBench) on Hugging Face.

## Prerequisites

- GitHub account
- [Git](https://git-scm.com/) installed
- Project folder: `frontend_dataset_paper`

## Step 1 — Create a GitHub repository

1. Open [github.com/new](https://github.com/new).
2. Repository name, e.g. `destbench` or `destbench-showcase`.
3. Choose **Public** (required for free GitHub Pages).
4. Do **not** add README, .gitignore, or license (you already have files locally).
5. Click **Create repository**.

Note your URL shape:

- `https://github.com/YOUR_USER/REPO_NAME`

## Step 2 — Initialize Git and push

In a terminal:

```bash
cd path

git init
git add .
git commit -m "DestBench showcase website"
git branch -M main
git remote add origin https://github.com/YOUR_USER/REPO_NAME.git
git push -u origin main
```

Replace `YOUR_USER` and `REPO_NAME` with your values.

If GitHub asks for auth, use a [Personal Access Token](https://github.com/settings/tokens) or SSH:

```bash
git remote add origin git@github.com:YOUR_USER/REPO_NAME.git
```

## Step 3 — Enable GitHub Pages (Actions)

1. Open your repo on GitHub.
2. **Settings** → **Pages** (left sidebar).
3. Under **Build and deployment** → **Source**, select **GitHub Actions**.
4. Go to the **Actions** tab.
5. Open the workflow **Deploy GitHub Pages** (runs on push to `main`).
6. Wait until it shows a green checkmark (~1–3 minutes).

The workflow file is already at `.github/workflows/deploy-pages.yml`. It:

- Builds `manifest.json` from Hugging Face
- Deploys the `public/` folder

## Step 4 — Open your live site

After a successful deploy:

1. **Settings** → **Pages** shows the site URL, usually:

   `https://YOUR_USER.github.io/REPO_NAME/`

2. Open that URL in a browser.

## Step 5 — Fix asset paths (project sites only)

If the page loads but images/CSS are broken, set the repo name in HTML.

Edit `public/index.html` inside `<head>`:

```html
<meta name="site-base" content="/REPO_NAME/" />
```

Example: repo `tag_nav` → `content="/tag_nav/"` → `https://exploreragent8.github.io/tag_nav/`

Commit and push:

```bash
git add public/index.html
git commit -m "Set GitHub Pages base path"
git push
```

Skip this if you use a user site repo named `YOUR_USER.github.io` (root URL).

## Step 6 — Update the site later

```bash
# edit files locally, then:
git add .
git commit -m "Describe your change"
git push
```

GitHub Actions redeploys automatically.

## Optional — Repository variables

**Settings** → **Secrets and variables** → **Actions** → **Variables**:

| Name | Value |
|------|--------|
| `HF_DATASET` | `exploreragent8/DestBench` |
| `HF_REVISION` | `main` |

Defaults already match; only change if you move the dataset.

## What gets deployed

| Included | Not in repo |
|----------|-------------|
| `public/index.html`, CSS, JS | Screenshot PNGs |
| `public/images/tag_nav_overview.png` | `public/dataset/` |
| `public/data/manifest.json` | `server.py` (dev only) |
| `public/logos/` | Local `DATA/` folder |

Screenshots are fetched from Hugging Face in the browser.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Actions workflow failed | Open the failed run → read logs; ensure `pip install huggingface_hub` step succeeds |
| 404 on Pages | Confirm **Source** is **GitHub Actions**, not “Deploy from branch” without a workflow |
| Trajectories don’t load images | Check `hf-dataset` meta is `exploreragent8/DestBench`; test a [resolve URL](https://huggingface.co/datasets/exploreragent8/DestBench/tree/main) |
| Broken layout / no CSS | Add `site-base` meta (Step 5) |
| Old app list | Push latest `public/data/manifest.json` or let CI rebuild manifest |

## Custom domain (optional)

**Settings** → **Pages** → **Custom domain** → follow GitHub DNS instructions.
