# GitHub Faces: Curated Avatars & Profiles

[![License: MIT](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)
[![GitHub contributors](https://img.shields.io/github/contributors/john-bampton/john-bampton.github.io.svg)](https://github.com/john-bampton/john-bampton.github.io/graphs/contributors)

> "Explore the faces behind GitHub. Discover the people shaping open-source."

Explore and showcase the top GitHub user avatars in a modern, interactive grid. This project fetches, caches, and displays real GitHub profiles with up-to-date avatars and stats.

---

## 🚀 Features

- Dynamic fetching of GitHub users via the API
- Secure avatar downloads and cache management
- Responsive HTML grid with Bootstrap
- Real user filtering (`type: User`)
- Automatic avatar updates
- RSS feed for new faces
- Modern, clean design
- Pre-commit hooks for code quality (black, isort)
- XSS-safe Jinja2 templates

---

## 🌐 Live Preview

[View the site](https://john-bampton.github.io/)

---

## ⚡ Quickstart

1. **Clone the repo:**

   ```bash
   git clone https://github.com/john-bampton/john-bampton.github.io.git
   cd john-bampton.github.io
   ```

2. **Install dependencies:**

   ```bash
   pip install -e .
   ```

3. **Run the fetcher:**

   ```bash
   APP_ENV=test python fetch.py
   ```

   <br>
   <sup>
   <b>Tip:</b> Setting <code>APP_ENV=test</code> will fetch only <b>20 users</b> for fast testing. Omit this variable to fetch <b>400 users</b> (default, production mode).
   </sup>

4. **Open the grid:**
   ```bash
   docs/index.html
   ```

---

## ⚙️ Configuration

- `TARGET_USERS`: Number of GitHub users to fetch (default: 400, or 20 in test mode)
- `MAX_EXTRA_PAGES`: Extra pages to fetch if needed (default: 2)
- Set `APP_ENV=test` for test mode (fetches 20 users)

---

## 🖼️ Screenshots

![Sample Faces](docs/images/other/screenshot-1280.png)

---

## 🛠️ Development & Quality

- Code formatted with [black](https://github.com/psf/black) and [isort](https://github.com/pycqa/isort)
- Pre-commit hooks: see `.pre-commit-config.yaml`
- Configs in `pyproject.toml`
- Linting: flake8, pylint, yamllint, isort, black

---

## 📦 RSS Feed & Sitemap

- RSS feed generated at [docs/feed.xml](https://john-bampton.github.io/feed.xml)
- Sitemap generated at [docs/sitemap.xml](https://john-bampton.github.io/sitemap.xml)
- Both are auto-generated when you run `render.py`
- RSS feed follows RSS 2.0 format and is loaded in your HTML via:
  `<link rel="alternate" type="application/rss+xml" title="John Bampton RSS Feed" href="/feed.xml">`
- Sitemap follows the standard XML sitemap protocol for search engines and is referenced in `robots.txt`:
  ```
  Sitemap: https://john-bampton.github.io/sitemap.xml
  ```
- Subscribe for new updates and enjoy better SEO!

---

## 🤝 Contributing

We welcome PRs, issues, and suggestions! Add a ⭐, fork, or help improve the grid and features.

**Code Quality Reminder:**

- Always run `pre-commit run --all-files` before pushing or opening a pull request. This ensures your code is auto-formatted and passes all checks.
- If you don't have pre-commit installed, run:
  ```bash
  pip install pre-commit
  pre-commit install
  ```
  This sets up the hooks for your local repo.

---

## Powered by

[<img src="docs/images/other/python-logo.png" alt="Python Powered" style="height:80px;">](https://www.python.org/)
[<img src="docs/images/other/pycharm-logo.png" alt="PyCharm Powered" style="height:80px;">](https://www.jetbrains.com/pycharm/)

---

## 📝 License

MIT License © 2025 John Bampton & Seyyed Ali Mohammadiyeh (Max Base)
