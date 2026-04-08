# DASA Choir Songs — Deployment Guide

A complete step-by-step guide to deploy this app to production.

---

## Prerequisites

- A free [GitHub](https://github.com) account
- A free [Netlify](https://netlify.com) account
- The project files (this folder)

---

## STEP 1 — Create a GitHub Repository

1. Go to https://github.com/new
2. Fill in:
   - **Repository name**: `dasa-choir-songs` (or any name you like)
   - **Visibility**: **Public** ← *Required for free Git Gateway to work*
   - Leave "Initialize with README" **unchecked**
3. Click **Create repository**
4. Copy the repo URL shown (e.g. `https://github.com/YOUR_USERNAME/dasa-choir-songs.git`)

---

## STEP 2 — Upload Project Files to GitHub

### Option A — GitHub Web UI (no Git required)

1. Open your new empty repo on GitHub
2. Click **uploading an existing file** (small link under "Quick setup")
3. Drag and drop **all project files and folders** into the upload area:
   ```
   index.html
   song.html
   style.css
   app.js
   netlify.toml
   admin/
   data/
   assets/
   ```
4. Scroll down → **Commit changes** → Click the green button

### Option B — Git CLI

```bash
cd dasa-choir-songs   # your project folder
git init
git add .
git commit -m "Initial commit: DASA Choir Songs app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/dasa-choir-songs.git
git push -u origin main
```

---

## STEP 3 — Connect to Netlify

1. Log in at https://app.netlify.com
2. Click **Add new site** → **Import an existing project**
3. Choose **GitHub**
4. Authorize Netlify to access GitHub when prompted
5. Find and select your `dasa-choir-songs` repository
6. Configure build settings:
   - **Branch to deploy**: `main`
   - **Build command**: *(leave completely empty)*
   - **Publish directory**: `.`
7. Click **Deploy site**
8. Wait ~30 seconds. Your site is live! 🎉
9. Optionally, go to **Site settings → Domain management** to set a custom domain or rename the default `.netlify.app` URL.

---

## STEP 4 — Enable Netlify Identity

1. In your Netlify dashboard, open your site
2. Go to **Site configuration → Identity**
3. Click **Enable Identity**
4. Under **Registration preferences**, select **Invite only**
   *(This prevents random people from registering as admins)*
5. Under **External providers**, you can optionally enable Google login
6. Click **Save**

---

## STEP 5 — Enable Git Gateway

1. Still in **Site configuration → Identity**
2. Scroll down to **Services → Git Gateway**
3. Click **Enable Git Gateway**
4. This links Netlify Identity to your GitHub repo so the CMS can commit changes

---

## STEP 6 — Invite Yourself as Admin

1. Go to **Site configuration → Identity → Users**
2. Click **Invite users**
3. Enter your email address
4. Check your email → Click the **Accept the invite** link
5. Set a password when prompted
6. You are now an admin ✓

---

## STEP 7 — Access the Admin Panel

1. Visit: `https://your-site-name.netlify.app/admin/`
2. Click **Login with Netlify Identity**
3. Enter the email and password you set in Step 6
4. The Decap CMS admin panel loads

---

## STEP 8 — Add Songs

1. In the admin panel, click **🎵 Songs** in the left sidebar
2. Click **Song List**
3. Click **Add Songs +** to add a new song entry
4. Fill in:
   - **Song Title**: e.g. `Amazing Grace`
   - **Lyrics**: Paste the full lyrics (line breaks are preserved)
5. Click **Save** (top right)
6. Wait a few seconds for Netlify to rebuild and deploy
7. Refresh your site — the song appears immediately!

---

## STEP 9 — Upload Slideshow Images

1. In the admin panel, click **🖼️ Slideshow Images**
2. Click **Slideshow Images**
3. Click **Add Images +**
4. Click the image widget → **Choose an image** → **Upload**
5. Select your image file (JPG/PNG/WebP, recommended 1920×1080px)
6. Optionally add a **Caption**
7. Click **Save**
8. The hero slideshow on the homepage will show the image after deploy

---

## STEP 10 — Make Future Updates

### Adding a new song:
1. Go to `/admin/` → Songs → Song List → Add Songs

### Removing a song:
1. Go to `/admin/` → Songs → Song List → find the song → click the **×** delete button

### Updating lyrics:
1. Go to `/admin/` → Songs → Song List → click the song title → edit → Save

### Adding/removing slideshow images:
1. Go to `/admin/` → Slideshow Images → Slideshow Images → edit list → Save

Every Save triggers a GitHub commit, which Netlify auto-deploys in ~30 seconds.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `/admin/` shows blank page | Check browser console; ensure Netlify Identity is enabled |
| Login works but CMS shows error | Verify Git Gateway is enabled (Step 5) |
| Songs not showing on site | Check `data/songs.json` in your GitHub repo; ensure format is correct |
| Images not showing in slideshow | Verify `data/slideshow.json` has `"image"` paths starting with `/assets/images/` |
| Changes not live after saving | Wait 60–90 seconds for Netlify to deploy; check Netlify dashboard for build status |
| CMS config error | Verify `admin/config.yml` is valid YAML (no tabs, correct indentation) |

---

## Project File Structure Reference

```
dasa-choir-songs/
├── index.html          ← Homepage (hero, slideshow, songs grid, search)
├── song.html           ← Individual song lyrics page
├── style.css           ← All styles (design system, responsive, animations)
├── app.js              ← All frontend JavaScript (router, slideshow, search)
├── netlify.toml        ← Netlify config (headers, caching)
├── admin/
│   ├── index.html      ← Decap CMS entry point
│   └── config.yml      ← CMS collections configuration
├── data/
│   ├── songs.json      ← Song data (managed by CMS)
│   └── slideshow.json  ← Slideshow image list (managed by CMS)
└── assets/
    └── images/         ← Uploaded slideshow images (managed by CMS)
```

---

*DASA Choir Songs — JAMstack app built with Vanilla JS, Decap CMS, GitHub, and Netlify.*
