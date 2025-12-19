import json
import logging
import os
import re
from typing import Any, Dict, List

from jinja2 import Environment, FileSystemLoader

SITE_DIR = "./docs"
CACHE_FILE = os.path.join(SITE_DIR, "users.json")
LAYOUTS_DIR = "./layouts"

jinja_env = Environment(loader=FileSystemLoader(LAYOUTS_DIR))


def setup_logger() -> logging.Logger:
    """Initialize and configure logger for HTML rendering."""
    logger = logging.getLogger("GithubFaces.HTML")
    logger.setLevel(logging.INFO)
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    formatter = logging.Formatter(
        "[%(asctime)s] %(levelname)s: %(message)s", "%Y-%m-%d %H:%M:%S"
    )
    ch.setFormatter(formatter)
    if not logger.handlers:
        logger.addHandler(ch)
    return logger


logger = setup_logger()


def ensure_dir(path: str) -> None:
    """Create directory if it doesn't exist."""
    if not os.path.exists(path):
        os.makedirs(path)
        logger.info(f"Created directory: {path}")


def format_number(num: Any) -> str:
    """Format number with comma separators or return 'N/A' for invalid values."""
    if num == "N/A" or num is None:
        return "N/A"
    try:
        return f"{int(num):,}"
    except (ValueError, TypeError):
        return str(num)


def prepare_users(users: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Add formatted display fields to user data for template rendering."""
    prepared = []
    for user in users:
        followers = user.get("followers", "N/A")
        following = user.get("following", "N/A")
        public_repos = user.get("public_repos", "N/A")
        public_gists = user.get("public_gists", "N/A")
        sponsors_count = user.get("sponsors_count", "N/A")
        sponsoring_count = user.get("sponsoring_count", "N/A")

        prepared.append(
            {
                **user,
                "followers_display": format_number(followers),
                "following_display": format_number(following),
                "repos_display": format_number(public_repos),
                "gists_display": format_number(public_gists),
                "sponsors_display": format_number(sponsors_count),
                "sponsoring_display": format_number(sponsoring_count),
            }
        )
    return prepared


def load_cache(cache_file: str = CACHE_FILE) -> List[Dict[str, Any]]:
    """Load user data from JSON cache file."""
    if not os.path.exists(cache_file):
        logger.error(f"Cache file not found: {cache_file}")
        logger.error("Please run fetch_users.py first to fetch and cache user data.")
        return []

    try:
        with open(cache_file, "r", encoding="utf-8") as f:
            users = json.load(f)
        logger.info(f"Loaded {len(users)} users from cache")
        return users
    except Exception as e:
        logger.error(f"Failed to load cache: {e}")
        return []


def build_html() -> str:
    """Build the HTML layout using Jinja2 templates."""
    layout_template = jinja_env.get_template("layout.html")
    layout = layout_template.render()

    return layout


def minify_html(html: str) -> str:
    """Aggressive HTML minifier: remove comments, collapse whitespace, minify inline code."""
    html = html.replace("\r", "")
    html = html.replace("\n", "\n")
    html = re.sub(r"\n+", " ", html)
    html = re.sub(r"<!--[\s\S]*?-->", "", html)
    html = re.sub(r">\s+<", "><", html)
    html = re.sub(r"\s{2,}", " ", html)
    html = re.sub(
        r"<script>(.*?)</script>",
        lambda m: "<script>" + minify_js(m.group(1)) + "</script>",
        html,
        flags=re.DOTALL,
    )
    html = re.sub(
        r"<style>(.*?)</style>",
        lambda m: "<style>" + minify_css(m.group(1)) + "</style>",
        html,
        flags=re.DOTALL,
    )
    return html.strip()


def minify_js(code: str) -> str:
    """Minify inline JavaScript: remove comments, unnecessary whitespace."""
    code = re.sub(r"//(?!.*:).*?$", "", code, flags=re.MULTILINE)
    code = re.sub(r"/\*[\s\S]*?\*/", "", code)
    code = re.sub(r"\s+", " ", code)
    code = re.sub(r"\s*([{}();,])\s*", r"\1", code)
    code = re.sub(r"\s+", " ", code)
    return code.strip()


def minify_css(code: str) -> str:
    """Minify inline CSS: remove comments, collapse whitespace, remove unnecessary spaces."""
    code = re.sub(r"/\*[\s\S]*?\*/", "", code)
    code = re.sub(r"\s+", " ", code)
    code = re.sub(r"\s*([{}:;,>+~])\s*", r"\1", code)
    return code.strip()


def run() -> None:
    """Main entry point: load cache, export JSON, and generate minified HTML shell."""
    ensure_dir(SITE_DIR)

    logger.info("Loading user data from cache...")
    users = load_cache()

    if not users:
        logger.error("No users found in cache. Please run fetch_users.py first.")
        return

    logger.info("Building HTML shell (header + footer + empty grid)...")
    html_content = minify_html(build_html())

    try:
        output_file = os.path.join(SITE_DIR, "index.html")
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(html_content)
        logger.info(
            f"HTML shell saved successfully. Total users available: {len(users)}"
        )
    except Exception as e:
        logger.error(f"Failed to save HTML page: {e}")


if __name__ == "__main__":
    run()
