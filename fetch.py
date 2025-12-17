import json
import logging
import os
import time
from calendar import timegm
from urllib.request import urlretrieve
import requests
from typing import List, Dict, Any, Tuple

CACHE_DIR = './docs'
FACES_DIR = './docs/images/faces'
GITHUB_USER_SEARCH_URL = 'https://api.github.com/search/users?q=followers:1..10000000&per_page=100&page='
GITHUB_USER_DETAIL_URL = 'https://api.github.com/users/{}'
GITHUB_USER_REPOS_URL = 'https://api.github.com/users/{}/repos?type=owner&per_page=100&sort=updated'
GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql'

TARGET_USERS = 400
# TARGET_USERS = 20
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
    base = {'Accept': 'application/vnd.github+json'}
    return ({**base, 'Authorization': f'Bearer {token}'} if token else base)

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
    user['avatar_updated_at'] = detail.get('updated_at', '')

    lang_totals, total_stars, last_repo_push_at = fetch_user_repo_summary(user['login'])
    user['top_languages'] = summarize_top_languages(lang_totals)
    user['total_stars'] = total_stars
    user['last_repo_pushed_at'] = last_repo_push_at
    user['last_public_commit_at'] = fetch_last_public_commit_at(user['login'])
    
    logger.info(f"[{idx}/{total} - {progress:.1f}%] Fetched details for {user['login']}")
    time.sleep(0.15)

def enrich_all_users(users: List[Dict[str, Any]]) -> None:
    """Enrich all users with detailed information from GitHub API."""
    total = len(users)
    for idx, user in enumerate(users, 1):
        enrich_user_with_details(user, idx, total)

def fetch_user_repo_summary(login: str, max_repos: int = 200) -> Tuple[Dict[str, int], int, str]:
    """Fetch aggregate language sizes, total stars, and latest repo push date for a user.

    Prefers GraphQL for efficiency. Falls back to REST if no token or GraphQL fails.

    Returns: (language_totals_map, total_stars, last_repo_pushed_at)
    """
    token = os.environ.get('GITHUB_TOKEN')
    if token:
        try:
            return fetch_user_repo_summary_graphql(login, max_repos)
        except Exception as e:
            logger.warning(f"GraphQL summary failed for {login}, falling back to REST: {e}")
    return fetch_user_repo_summary_rest(login, max_repos)

def fetch_user_repo_summary_graphql(login: str, max_repos: int = 200) -> Tuple[Dict[str, int], int, str]:
    """Fetch repo summary via GraphQL with language byte sizes, stars, and last push date.
    
    Returns: (language_bytes_map, total_stars, last_repo_pushed_at)
    """
    headers = get_github_headers()
    lang_totals: Dict[str, int] = {}
    total_stars = 0
    last_push = ''
    fetched = 0
    after_cursor = None

    query = """
    query($login: String!, $first: Int!, $after: String) {
      user(login: $login) {
        repositories(first: $first, after: $after, privacy: PUBLIC, ownerAffiliations: OWNER, orderBy: {field: UPDATED_AT, direction: DESC}) {
          pageInfo { hasNextPage endCursor }
          nodes {
            stargazerCount
            pushedAt
            isFork
            languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
              edges { size node { name } }
            }
          }
        }
      }
    }
    """

    while fetched < max_repos:
        page_size = min(50, max_repos - fetched)
        resp = requests.post(
            GITHUB_GRAPHQL_URL,
            headers=headers,
            json={
                'query': query,
                'variables': { 'login': login, 'first': page_size, 'after': after_cursor }
            },
            timeout=20
        )
        resp.raise_for_status()
        data = resp.json()
        nodes = (((data.get('data') or {}).get('user') or {}).get('repositories') or {}).get('nodes') or []
        page_info = (((data.get('data') or {}).get('user') or {}).get('repositories') or {}).get('pageInfo') or {}

        for repo in nodes:
            fetched += 1
            total_stars += int(repo.get('stargazerCount') or 0)
            pushed_at = repo.get('pushedAt') or ''
            if pushed_at and pushed_at > last_push:
                last_push = pushed_at
            langs = (((repo.get('languages') or {}).get('edges')) or [])
            for edge in langs:
                name = ((edge.get('node') or {}).get('name') or '').strip()
                size = int(edge.get('size') or 0)
                if name:
                    lang_totals[name] = lang_totals.get(name, 0) + size

        if page_info.get('hasNextPage') and page_info.get('endCursor'):
            after_cursor = page_info['endCursor']
        else:
            break

    return lang_totals, total_stars, last_push

def fetch_user_repo_summary_rest(login: str, max_repos: int = 200) -> Tuple[Dict[str, int], int, str]:
    """Fallback using REST: sums stars and approximates languages by primary language count.
    Note: primary language count is a rough proxy (no byte sizes).
    """
    headers = get_github_headers()
    total_stars = 0
    lang_counts: Dict[str, int] = {}
    last_push = ''
    page = 1
    fetched = 0

    while fetched < max_repos:
        url = GITHUB_USER_REPOS_URL.format(login) + f"&page={page}"
        resp = requests.get(url, headers=headers, timeout=15)
        if resp.status_code == 404:
            break
        resp.raise_for_status()
        repos = resp.json()
        if not repos:
            break
        for r in repos:
            if r.get('private'):
                continue
            fetched += 1
            total_stars += int(r.get('stargazers_count') or 0)
            primary = r.get('language')
            if primary:
                lang_counts[primary] = lang_counts.get(primary, 0) + 1
            pushed_at = r.get('pushed_at') or ''
            if pushed_at and pushed_at > last_push:
                last_push = pushed_at
            if fetched >= max_repos:
                break
        page += 1

    return lang_counts, total_stars, last_push

def summarize_top_languages(lang_totals: Dict[str, int], top_n: int = 5) -> List[Dict[str, Any]]:
    """Convert language totals to sorted list with percentages.
    
    Returns: List of top N languages with name, bytes, and percent.
    """
    total = sum(lang_totals.values()) or 1
    top = sorted(lang_totals.items(), key=lambda kv: kv[1], reverse=True)[:top_n]
    return [
        { 'name': name, 'bytes': size, 'percent': round((size / total) * 100, 1) }
        for name, size in top
    ]

def fetch_last_public_commit_at(login: str) -> str:
    """Get last public commit time via user public events (PushEvent)."""
    headers = get_github_headers()
    try:
        resp = requests.get(f"https://api.github.com/users/{login}/events/public", headers=headers, timeout=10)
        if resp.status_code == 404:
            return ''
        resp.raise_for_status()
        events = resp.json() or []
        for ev in events:
            if ev.get('type') == 'PushEvent':
                return ev.get('created_at', '')
        return events[0].get('created_at', '') if events else ''
    except Exception as e:
        logger.warning(f"Failed to fetch last public commit for {login}: {e}")
        return ''

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
            json.dump(users, f, indent=(2 if os.environ.get('APP_ENV') == 'development' else None), ensure_ascii=False)
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
