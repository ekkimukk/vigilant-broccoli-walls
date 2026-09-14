# Wallpaper Gallery

Static wallpaper gallery for GitHub Pages.

## Features

You do not need to update `index.html` manually. On every page load, `script.js` queries the GitHub API, reads the repository tree recursively, and automatically finds all image files:

- JPG / JPEG
- PNG
- GIF
- WebP
- AVIF
- BMP

Simply add a new image to the repository and run `git push`.

## GitHub Pages

1. Положите `index.html`, `style.css` и `script.js` в корень репозитория с обоями.
2. GitHub → **Settings → Pages**.
3. В **Build and deployment** выберите:
   - Source: `Deploy from a branch`
   - Branch: `main` (или ваша основная ветка)
   - Folder: `/ (root)`
4. Сохраните настройки.

Через некоторое время сайт будет доступен по адресу:

`https://USERNAME.github.io/REPOSITORY/`

### Important

The repository must be public because the browser accesses the GitHub API without a token.

The GitHub API limits anonymous requests, so the site makes only one API request when the page loads.
