import os
import json
import time
from calendar import timegm
from urllib.request import urlretrieve
import requests
import logging
from typing import List, Dict, Any

CACHE_DIR = './temp/cache'
FACES_DIR = './docs/images/faces'
GITHUB_USER_SEARCH_URL = 'https://api.github.com/search/users?q=followers:1..10000000&per_page=100&page='
GITHUB_USER_DETAIL_URL = 'https://api.github.com/users/{}'
GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql'

TARGET_USERS = 400
MAX_EXTRA_PAGES = 2

def setup_logger() -> logging.Logger:
    """Initialize and configure logger for GitHub user fetching."""
    logger = logging.getLogger("GithubFaces.Fetch")
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

def get_github_headers() -> Dict[str, str]:
    """Get GitHub API headers with authentication token if available."""
    token = os.environ.get('GITHUB_TOKEN')
    return {'Authorization': f'token {token}'} if token else {}

def safe_filename(name: str) -> str:
    """Convert username to safe lowercase filename format."""
    return name.lower()

def ensure_dir(path: str) -> None:
    """Create directory if it doesn't exist."""
    if not os.path.exists(path):
        os.makedirs(path)
        logger.info(f"Created directory: {path}")

def get_remote_timestamp(url: str) -> float:
    """Get Last-Modified timestamp from remote file header."""
    try:
        resp = requests.head(url, allow_redirects=True, timeout=5)
        last_modified = resp.headers.get('Last-Modified')
        if last_modified:
            return timegm(time.strptime(last_modified, '%a, %d %b %Y %H:%M:%S GMT'))
    except Exception as e:
        logger.warning(f"Failed to get timestamp for {url}: {e}")
    return float('inf')

def should_download(local_file: str, remote_url: str) -> bool:
    """Check if remote file is newer than local copy."""
    if not os.path.exists(local_file):
        return True
    local_time = os.path.getmtime(local_file)
    remote_time = get_remote_timestamp(remote_url)
    return local_time < remote_time

def download_single_avatar(user: Dict[str, Any], faces_dir: str) -> None:
    """Download or update avatar image for a single user."""
    login_safe = safe_filename(user['login'])
    file_path = os.path.join(faces_dir, f"{login_safe}.png")
    
    if should_download(file_path, user['avatar_url']):
        try:
            urlretrieve(user['avatar_url'], file_path)
            logger.info(f"Downloaded/Updated avatar: {user['login']}")
        except Exception as e:
            logger.error(f"Failed to download avatar for {user['login']}: {e}")
    else:
        logger.info(f"Local avatar up-to-date: {user['login']}")

def download_avatars(users: List[Dict[str, Any]], faces_dir: str) -> None:
    """Download all avatars with progress tracking."""
    ensure_dir(faces_dir)
    total = len(users)
    for idx, user in enumerate(users, 1):
        progress = (idx / total) * 100
        logger.info(f"[{idx}/{total} - {progress:.1f}%] Processing avatar...")
        download_single_avatar(user, faces_dir)

def clean_old_avatars(current_logins: List[str], faces_dir: str) -> None:
    """Remove avatars for users no longer in the current list."""
    if not os.path.exists(faces_dir):
        return
    current_logins = [safe_filename(login) for login in current_logins]
    for filename in os.listdir(faces_dir):
        if filename.endswith('.png'):
            login = filename.rsplit('.', 1)[0].lower()
            if login not in current_logins:
                os.remove(os.path.join(faces_dir, filename))
                logger.info(f"Removed old avatar: {filename}")

def handle_rate_limit(resp: requests.Response) -> int:
    """Handle GitHub API rate limit and return sleep duration."""
    reset_ts = int(resp.headers.get('X-RateLimit-Reset', time.time() + 60))
    sleep_for = max(reset_ts - int(time.time()), 10)
    logger.warning(f"Rate limit exceeded, waiting {sleep_for}s")
    return sleep_for

def handle_429_error(retry_after: str, attempt: int) -> int:
    """Handle HTTP 429 Too Many Requests and return sleep duration."""
    retry_secs = int(retry_after)
    logger.warning(f"429 Too Many Requests, sleeping {retry_secs}s (attempt {attempt+1})")
    return retry_secs

def fetch_sponsorship_info(login: str) -> Dict[str, Any]:
    """Fetch sponsor and sponsoring counts via GraphQL API."""
    if not os.environ.get('GITHUB_TOKEN'):
        return {'sponsors_count': 'N/A', 'sponsoring_count': 'N/A'}
    
    query = """
    query($login: String!) {
      user(login: $login) {
        sponsors(first: 0) { totalCount }
        sponsoring(first: 0) { totalCount }
      }
    }
    """
    
    try:
        headers = get_github_headers()
        resp = requests.post(
            GITHUB_GRAPHQL_URL,
            json={'query': query, 'variables': {'login': login}},
            headers=headers,
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            if 'data' in data and data['data'].get('user'):
                user_data = data['data']['user']
                return {
                    'sponsors_count': user_data.get('sponsors', {}).get('totalCount', 'N/A'),
                    'sponsoring_count': user_data.get('sponsoring', {}).get('totalCount', 'N/A')
                }
    except Exception as e:
        logger.warning(f"Failed to fetch sponsorship for {login}: {e}")
    return {'sponsors_count': 'N/A', 'sponsoring_count': 'N/A'}

def fetch_user_detail_with_retry(login: str, max_retries: int = 5) -> Dict[str, Any]:
    """Fetch user details with automatic retry on rate limits or errors."""
    headers = get_github_headers()
    
    for attempt in range(max_retries):
        try:
            detail_url = GITHUB_USER_DETAIL_URL.format(login)
            resp = requests.get(detail_url, headers=headers, timeout=10)
            
            if resp.status_code == 404:
                logger.warning(f"User not found: {login}")
                return {}
            
            if resp.status_code == 403 and "rate limit" in resp.text.lower():
                sleep_for = handle_rate_limit(resp)
                time.sleep(sleep_for + 3)
                continue
            
            if resp.status_code == 429:
                retry_after = resp.headers.get('Retry-After', '5')
                sleep_for = handle_429_error(retry_after, attempt)
                time.sleep(sleep_for)
                continue
            
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.warning(f"Error fetching {login} (attempt {attempt+1}): {e}")
            time.sleep(2 ** attempt)
    
    logger.warning(f"Failed to fetch {login} after {max_retries} attempts")
    return {}

def enrich_user_with_details(user: Dict[str, Any], idx: int, total: int) -> None:
    """Add detailed information (followers, repos, sponsors) to user dict."""
    detail = fetch_user_detail_with_retry(user['login'])
    if not detail:
        return
    
    progress = (idx / total) * 100
    sponsorship = fetch_sponsorship_info(user['login'])
    
    user['followers'] = detail.get('followers', 'N/A')
    user['following'] = detail.get('following', 'N/A')
    user['location'] = detail.get('location', '')
    user['name'] = detail.get('name')
    user['public_repos'] = detail.get('public_repos', 'N/A')
    user['public_gists'] = detail.get('public_gists', 'N/A')
    user['sponsors_count'] = sponsorship['sponsors_count']
    user['sponsoring_count'] = sponsorship['sponsoring_count']
    user['avatar_updated_at'] = detail.get('avatar_url', '')
    
    logger.info(f"[{idx}/{total} - {progress:.1f}%] Fetched details for {user['login']}")
    time.sleep(0.15)

def enrich_all_users(users: List[Dict[str, Any]]) -> None:
    """Enrich all users with detailed information from GitHub API."""
    total = len(users)
    for idx, user in enumerate(users, 1):
        enrich_user_with_details(user, idx, total)

def fetch_search_page(page_num: int, headers: Dict[str, str]) -> List[Dict[str, Any]]:
    """Fetch single search results page from GitHub API."""
    try:
        resp = requests.get(GITHUB_USER_SEARCH_URL + str(page_num), headers=headers, timeout=10)
        resp.raise_for_status()
        page_users = resp.json().get('items', [])
        return [u for u in page_users if u.get('type') == 'User']
    except Exception as e:
        logger.error(f"Failed to fetch page {page_num}: {e}")
        return []

def fetch_users_from_search(target: int = TARGET_USERS) -> List[Dict[str, Any]]:
    """Fetch users from GitHub search API across multiple pages."""
    users = []
    headers = get_github_headers()
    max_pages = target // 100 + MAX_EXTRA_PAGES
    
    for page_num in range(1, max_pages + 1):
        page_users = fetch_search_page(page_num, headers)
        users.extend(page_users)
        progress = (len(users) / target) * 100
        logger.info(f"Page {page_num}: {len(page_users)} users | Total: {len(users)}/{target} ({progress:.1f}%)")
        
        if len(users) >= target:
            return users[:target]
    
    return users

def save_cache(users: List[Dict[str, Any]]) -> None:
    """Save user data to JSON cache file."""
    ensure_dir(CACHE_DIR)
    cache_file = os.path.join(CACHE_DIR, 'users.json')
    try:
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(users, f, indent=2, ensure_ascii=False)
        logger.info(f"Cache saved ({len(users)} users)")
    except Exception as e:
        logger.error(f"Failed to save cache: {e}")

def print_section(title: str) -> None:
    """Print formatted section header with title."""
    logger.info("=" * 60)
    logger.info(title)
    logger.info("=" * 60)

def run() -> None:
    """Main entry point: fetch, enrich, download avatars, and cache users."""
    print_section("Starting GitHub Users Fetch Process")
    logger.info(f"Target users: {TARGET_USERS}")
    logger.info("")
    
    users = fetch_users_from_search(TARGET_USERS)
    
    if not users:
        logger.error("No valid users fetched. Exiting.")
        return
    
    print_section(f"Fetched {len(users)} users successfully")
    logger.info("Fetching extra details (followers, following, location)...")
    logger.info("")
    
    enrich_all_users(users)
    
    print_section("Downloading/updating avatars...")
    download_avatars(users, FACES_DIR)
    
    print_section("Cleaning old avatars...")
    current_logins = [user['login'] for user in users]
    clean_old_avatars(current_logins, FACES_DIR)
    
    print_section("Saving user data to cache...")
    save_cache(users)
    
    print_section(f"✅ FETCH COMPLETE! {len(users)} users cached.")

if __name__ == '__main__':
    run()
