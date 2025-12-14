import os
import json
import logging
import re
from typing import List, Dict, Any
from jinja2 import Environment, FileSystemLoader

SITE_DIR = './docs'
CACHE_DIR = './temp/cache'
CACHE_FILE = os.path.join(CACHE_DIR, 'users.json')
LAYOUTS_DIR = './layouts'

jinja_env = Environment(loader=FileSystemLoader(LAYOUTS_DIR))

def setup_logger() -> logging.Logger:
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
    if not os.path.exists(path):
        os.makedirs(path)
        logger.info(f"Created directory: {path}")

def format_number(num: Any) -> str:
    if num == 'N/A' or num is None:
        return 'N/A'
    try:
        return f"{int(num):,}"
    except (ValueError, TypeError):
        return str(num)

def prepare_users(users: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    prepared = []
    for user in users:
        followers = user.get('followers', 'N/A')
        following = user.get('following', 'N/A')
        public_repos = user.get('public_repos', 'N/A')
        public_gists = user.get('public_gists', 'N/A')
        sponsors_count = user.get('sponsors_count', 'N/A')
        sponsoring_count = user.get('sponsoring_count', 'N/A')
        
        prepared.append({
            **user,
            'followers_display': format_number(followers),
            'following_display': format_number(following),
            'repos_display': format_number(public_repos),
            'gists_display': format_number(public_gists),
            'sponsors_display': format_number(sponsors_count),
            'sponsoring_display': format_number(sponsoring_count),
        })
    return prepared

def load_cache(cache_file: str = CACHE_FILE) -> List[Dict[str, Any]]:
    if not os.path.exists(cache_file):
        logger.error(f"Cache file not found: {cache_file}")
        logger.error("Please run fetch_users.py first to fetch and cache user data.")
        return []
    
    try:
        with open(cache_file, 'r', encoding='utf-8') as f:
            users = json.load(f)
        logger.info(f"Loaded {len(users)} users from cache")
        return users
    except Exception as e:
        logger.error(f"Failed to load cache: {e}")
        return []

def build_html(users: List[Dict[str, Any]]) -> str:
    header_template = jinja_env.get_template('header.html')
    footer_template = jinja_env.get_template('footer.html')
    cards_template = jinja_env.get_template('card.html')
    
    prepared_users = prepare_users(users)
    
    header = header_template.render()
    cards = cards_template.render(users=prepared_users)
    footer = footer_template.render()
    
    grid = f'<div class="grid" id="grid">{cards}</div>'
    
    return header + grid + footer


def minify_html(html: str) -> str:
    """Lightweight HTML minifier to trim whitespace between tags."""
    html = re.sub(r'>\s+<', '><', html)
    return html.strip()

def run() -> None:
    ensure_dir(SITE_DIR)
    
    logger.info("Loading user data from cache...")
    users = load_cache()
    
    if not users:
        logger.error("No users found in cache. Please run fetch_users.py first.")
        return
    
    logger.info("Building HTML page...")
    html_content = minify_html(build_html(users))
    
    try:
        output_file = os.path.join(SITE_DIR, 'index.html')
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        logger.info(f"HTML page saved successfully. Total users: {len(users)}")
    except Exception as e:
        logger.error(f"Failed to save HTML page: {e}")

if __name__ == '__main__':
    run()
