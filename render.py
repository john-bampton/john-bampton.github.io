#!/usr/bin/env python3

import datetime
import json
import logging
import os
import re
from typing import Any, Dict, List

from jinja2 import Environment, FileSystemLoader

SITE_DIR = "./docs"
CACHE_FILE = os.path.join(SITE_DIR, "users.json")
LAYOUTS_DIR = "./layouts"
DEPLOY_BASEURL = "https://john-bampton.github.io"

jinja_env = Environment(loader=FileSystemLoader(LAYOUTS_DIR), autoescape=True)


def setup_logger() -> logging.Logger:
    """Initialize and configure logger for HTML rendering."""
    log = logging.getLogger("GithubFaces.HTML")
    log.setLevel(logging.INFO)
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    formatter = logging.Formatter(
        "[%(asctime)s] %(levelname)s: %(message)s", "%Y-%m-%d %H:%M:%S"
    )
    ch.setFormatter(formatter)
    if not log.handlers:
        log.addHandler(ch)
    return log


logger = setup_logger()


def generate_sitemap_xml(urls: list, output_path: str) -> None:
    """Generate a simple sitemap.xml for search engines."""
    urlset = "\n".join(
        f"    <url>\n        <loc>{url}</loc>\n    </url>" for url in urls
    )
    sitemap = f"""<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n{urlset}\n</urlset>\n"""
    minified = minify_xml(sitemap)
    safe_output_path = safe_path(output_path)
    with open(safe_output_path, "w", encoding="utf-8") as f:
        f.write(minified)
    logger.info("Sitemap generated at %s", output_path)


def safe_path(path: str, base_dir: str = SITE_DIR) -> str:
    """Ensure the path is within the allowed base directory."""
    abs_path = os.path.abspath(path)
    abs_base = os.path.abspath(base_dir)
    if not abs_path.startswith(abs_base):
        raise ValueError(f"Unsafe file path detected: {path}")
    return abs_path


def ensure_dir(path: str) -> None:
    """Create directory if it doesn't exist."""
    if not os.path.exists(path):
        os.makedirs(path)
        logger.info("Created directory: %s", path)


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
    safe_cache_file = safe_path(cache_file)
    if not os.path.exists(safe_cache_file):
        logger.error("Cache file not found: %s", safe_cache_file)
        logger.error("Please run fetch_users.py first to fetch and cache user data.")
        return []

    try:
        with open(safe_cache_file, "r", encoding="utf-8") as f:
            users = json.load(f)
        logger.info("Loaded %d users from cache", len(users))
        return users
    except Exception as e:
        logger.error("Failed to load cache: %s", e)
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

    def minify_script_tag(match):
        full_tag = match.group(0)
        attrs = match.group(1)
        content = match.group(2)

        if re.search(
            r'\bsrc\s*=\s*(?:["\"][^"\"]*["\"]|\'[^"]*\'|[^\s>]+)', attrs, re.IGNORECASE
        ):
            return full_tag

        open_tag = f"<script{attrs}>"
        close_tag = "</script>"
        return f"{open_tag}{minify_js(content)}{close_tag}"

    html = re.sub(
        r"(?is)<script(\b[^>]*)>(.*?)</script>",
        minify_script_tag,
        html,
    )
    html = re.sub(
        r"(?is)<style\b[^>]*>(.*?)</style\s*>",
        lambda m: "<style>" + minify_css(m.group(1)) + "</style>",
        html,
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


def minify_xml(xml: str) -> str:
    """Minify XML: remove comments, collapse whitespace between tags, remove redundant spaces."""
    xml = re.sub(r"<!--.*?-->", "", xml, flags=re.DOTALL)
    xml = re.sub(r">\s+<", "><", xml)
    xml = re.sub(r"\s{2,}", " ", xml)
    return xml.strip()


def minify_css(code: str) -> str:
    """Minify inline CSS: remove comments, collapse whitespace, remove unnecessary spaces."""
    code = re.sub(r"/\*[\s\S]*?\*/", "", code)
    code = re.sub(r"\s+", " ", code)
    code = re.sub(r"\s*([{}:;,>+~])\s*", r"\1", code)
    return code.strip()


def generate_rss_feed(
    title: str, link: str, description: str, items: list, output_path: str
) -> None:
    """Generate a basic RSS feed for the site with multiple items."""
    rss_items = ""
    for item in items:
        item_title = item.get("title", title)
        item_link = item.get("link", link)
        item_description = item.get("description", description)
        item_pubDate = item.get("pubDate") or datetime.datetime.utcnow().strftime(
            "%a, %d %b %Y %H:%M:%S GMT"
        )
        item_guid = item.get("guid", item_link)
        rss_items += f"""
            <item>
                <title>{item_title}</title>
                <link>{item_link}</link>
                <description>{item_description}</description>
                <pubDate>{item_pubDate}</pubDate>
                <guid>{item_guid}</guid>
            </item>
        """
    rss = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
    <channel>
        <title>{title}</title>
        <link>{link}</link>
        <description>{description}</description>
{rss_items}
    </channel>
</rss>
"""
    minified_rss = minify_xml(rss)
    safe_output_path = safe_path(output_path)
    with open(safe_output_path, "w", encoding="utf-8") as f:
        f.write(minified_rss)
    logger.info("RSS feed generated at %s", safe_output_path)


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
        safe_output_file = safe_path(output_file)
        with open(safe_output_file, "w", encoding="utf-8") as f:
            f.write(html_content)
        logger.info(
            "HTML shell saved successfully. Total users available: %d",
            len(users),
        )

        rss_path = os.path.join(SITE_DIR, "feed.xml")
        main_url = DEPLOY_BASEURL + "/"
        rss_items = [
            {
                "title": "John Bampton Faces",
                "link": main_url,
                "description": "GitHub Faces - curated list of GitHub users.",
                "pubDate": datetime.datetime.now(datetime.timezone.utc).strftime(
                    "%a, %d %b %Y %H:%M:%S GMT"
                ),
                "guid": main_url,
            },
        ]
        generate_rss_feed(
            title="John Bampton Faces",
            link=main_url,
            description="GitHub Faces - curated list of GitHub users.",
            items=rss_items,
            output_path=rss_path,
        )

        sitemap_filename = "sitemap.xml"
        sitemap_urls = list({item.get("guid", item.get("link", main_url)) for item in rss_items})
        sitemap_urls.append(DEPLOY_BASEURL + "/feed.xml")
        generate_sitemap_xml(sitemap_urls, sitemap_filename)
    except Exception as e:
        logger.error("Failed to save HTML page or RSS feed: %s", e)


if __name__ == "__main__":
    run()
