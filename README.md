# The 400 Faces - Scrape Your GitHub Avatars

[![License: MIT](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)
[![GitHub contributors](https://img.shields.io/github/contributors/john-bampton/john-bampton.github.io.svg)](https://github.com/john-bampton/john-bampton.github.io/graphs/contributors)

A Python script to fetch and display the top 400 GitHub user avatars in a sleek, interactive grid. Perfect for exploring the faces behind popular GitHub profiles.

---

## Features

- Fetches GitHub users dynamically via the GitHub API.
- Downloads avatars for offline use.
- Builds a responsive HTML page showcasing all avatars.
- Filters only real users (`type: User`) to ensure authentic profiles.
- Automatically updates avatars when new versions are available.
- Clean and modern card design using Bootstrap.

---

## Preview

Check out the live preview: [https://john-bampton.github.io/](https://john-bampton.github.io/)

---

## Installation

1. Clone the repository:

```bash
git clone https://github.com/john-bampton/john-bampton.github.io.git
cd faces
````

2. Install dependencies:

```bash
pip install -e .
```

3. Run the script:

```bash
python github_faces.py
```

4. Open the generated HTML page in your browser:

```bash
docs/index.html
```

---

## Configuration

* **TARGET_USERS**: Number of GitHub users to fetch (default: 400).
* **MAX_EXTRA_PAGES**: Extra pages to fetch if not enough users are found (default: 2).

You can modify these directly in `github_faces.py`.

---

## Screenshots

![Sample Faces](docs/images/other/screenshot-1280.png)

---

## Powered by

[![Python Powered](docs/images/other/python-logo.png)](https://www.python.org/)
[![PyCharm Powered](docs/images/other/pycharm-logo.png)](https://www.jetbrains.com/pycharm/)

---

## Contributing

We welcome contributions! Feel free to:

* Submit issues for bugs or feature requests.
* Fork the repository and open pull requests.
* Suggest new ways to improve the avatar grid or functionality.
* Spread the word by adding a ⭐ to this repository.

---

## Acknowledgements

Inspired by the GitHub community and the creativity of open-source developers.
Special thanks to all contributors and avatar owners included in this project.

---

## License

This project is licensed under the MIT License.

© 2025 John Bampton, and Seyyed Ali Mohammadiyeh (Max Base).

---

> "Explore the faces behind GitHub. Discover the people shaping open-source."
