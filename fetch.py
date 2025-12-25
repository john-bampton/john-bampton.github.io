#!/usr/bin/env python3

import json
import logging
import os
import time
from calendar import timegm
from typing import Any, Dict, List, Tuple
from urllib.parse import urlparse

import requests

SITE_DIR = "./docs"
FACES_DIR = "./docs/images/faces"
GITHUB_USER_SEARCH_URL = (
    "https://api.github.com/search/users?q=followers:1..10000000&per_page=100&page="
)
GITHUB_USER_DETAIL_URL = "https://api.github.com/users/{}"
GITHUB_USER_REPOS_URL = (
    "https://api.github.com/users/{}/repos?type=owner&per_page=100&sort=updated"
)
GITHUB_GRAPHQL_URL = "https://api.github.com/graphql"

APP_ENV = os.environ.get("APP_ENV", "production")
TARGET_USERS = 20 if APP_ENV == "test" else 400
MAX_EXTRA_PAGES = 2

HOUR_SECONDS = 60 * 60 * 1000
DAY_SECONDS = 24 * HOUR_SECONDS
WEEK_SECONDS = 7 * DAY_SECONDS


def safe_path(path: str, base_dir: str = SITE_DIR) -> str:
    """Ensure the path is within the allowed base directory."""
    abs_path = os.path.abspath(path)
    abs_base = os.path.abspath(base_dir)
    if not abs_path.startswith(abs_base):
        raise ValueError(f"Unsafe file path detected: {path}")
    return abs_path


def download_file_http(url: str, dest_path: str, timeout: int = 10) -> None:
    """
    Securely download a file using HTTP(S) only.
    - No urllib
    - No redirects
    - Explicit scheme and host validation
    """

    parsed = urlparse(url)

    if parsed.scheme not in ("http", "https"):
        raise ValueError(f"Unsafe URL scheme: {parsed.scheme}")

    if not parsed.netloc:
        raise ValueError("URL must contain a valid host")

    response = requests.get(
        url,
        stream=True,
        timeout=timeout,
        allow_redirects=False,
        headers={"User-Agent": "avatar-downloader/1.0"},
    )

    response.raise_for_status()

    safe_dest_path = safe_path(dest_path)
    os.makedirs(os.path.dirname(safe_dest_path), exist_ok=True)

    with open(safe_dest_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                f.write(chunk)


def load_previous_users(path: str = "./docs/users.json") -> Dict[str, Dict[str, Any]]:
    """Load previous user data from a JSON file and index it by login.
    This is used to calculate follower growth for the trending feature.
    """
    safe_file = safe_path(path)
    if not os.path.exists(safe_file):
        return {}
    try:
        with open(safe_file, "r", encoding="utf-8") as f:
            users = json.load(f)
        if not isinstance(users, list):
            logger.warning(f"Data in {safe_file} is not a list, returning empty dict.")
            return {}
        return {u["login"]: u for u in users if isinstance(u, dict) and "login" in u}
    except (IOError, json.JSONDecodeError) as e:
        logger.warning(f"Failed to load or parse previous users from {safe_file}: {e}")
        return {}


def setup_logger() -> logging.Logger:
    """Initialize and configure logger for HTML rendering."""
    log = logging.getLogger("GithubFaces.Fetch")
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


def get_github_headers() -> Dict[str, str]:
    """Get GitHub API headers with authentication token if available."""
    token = os.environ.get("GITHUB_TOKEN")
    base = {"Accept": "application/vnd.github+json"}
    return {**base, "Authorization": f"Bearer {token}"} if token else base


def safe_filename(name: str) -> str:
    """Convert username to safe lowercase filename format."""
    return name.lower()


def ensure_dir(path: str) -> None:
    """Create directory if it doesn't exist."""
    if not os.path.exists(path):
        os.makedirs(path)
        logger.info("Created directory: %s", path)


def get_remote_timestamp(url: str) -> float:
    """Get Last-Modified timestamp from remote file header."""
    try:
        resp = requests.head(url, allow_redirects=True, timeout=5)
        last_modified = resp.headers.get("Last-Modified")
        if last_modified:
            return timegm(time.strptime(last_modified, "%a, %d %b %Y %H:%M:%S GMT"))
    except Exception as e:
        logger.warning("Failed to get timestamp for %s: %s", url, e)
    return float("inf")


def should_download(local_file: str, remote_url: str) -> bool:
    """Check if remote file is newer than local copy."""
    if not os.path.exists(local_file):
        return True
    local_time = os.path.getmtime(local_file)
    remote_time = get_remote_timestamp(remote_url)
    return local_time < remote_time


def download_single_avatar(user: Dict[str, Any], faces_dir: str) -> None:
    """Download or update avatar image for a single user."""
    login_safe = safe_filename(user["login"])
    file_path = os.path.join(faces_dir, f"{login_safe}.png")

    if should_download(file_path, user["avatar_url"]):
        try:
            download_file_http(user["avatar_url"], file_path)
            logger.info("Downloaded/Updated avatar: %s", user["login"])
        except Exception as e:
            logger.error("Failed to download avatar for %s: %s", user["login"], e)
    else:
        logger.info("Local avatar up-to-date: %s", user["login"])


def download_avatars(users: List[Dict[str, Any]], faces_dir: str) -> None:
    """Download all avatars with progress tracking."""
    ensure_dir(faces_dir)
    total = len(users)
    for idx, user in enumerate(users, 1):
        progress = (idx / total) * 100
        logger.info("[%d/%d - %.1f%%] Processing avatar...", idx, total, progress)
        download_single_avatar(user, faces_dir)


def clean_old_avatars(current_logins: List[str], faces_dir: str) -> None:
    """Remove avatars for users no longer in the current list."""
    if not os.path.exists(faces_dir):
        return
    current_logins = [safe_filename(login) for login in current_logins]
    for filename in os.listdir(faces_dir):
        if filename.endswith(".png"):
            login = filename.rsplit(".", 1)[0].lower()
            if login not in current_logins:
                file_path = safe_path(os.path.join(faces_dir, filename), faces_dir)
                os.remove(file_path)
                logger.info("Removed old avatar: %s", filename)


def handle_rate_limit(resp: requests.Response) -> int:
    """Handle GitHub API rate limit and return sleep duration."""
    reset_ts = int(resp.headers.get("X-RateLimit-Reset", time.time() + 60))
    sleep_for = max(reset_ts - int(time.time()), 10)
    logger.warning("Rate limit exceeded, waiting %ss", sleep_for)
    return sleep_for


def handle_429_error(retry_after: str, attempt: int) -> int:
    """Handle HTTP 429 Too Many Requests and return sleep duration."""
    retry_secs = int(retry_after)
    logger.warning(
        "429 Too Many Requests, sleeping %ss (attempt %d)", retry_secs, attempt + 1
    )
    return retry_secs


def fetch_sponsorship_info(login: str) -> Dict[str, Any]:
    """Fetch sponsor and sponsoring counts via GraphQL API."""
    if not os.environ.get("GITHUB_TOKEN"):
        return {"sponsors_count": "N/A", "sponsoring_count": "N/A"}

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
            json={"query": query, "variables": {"login": login}},
            headers=headers,
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            if "data" in data and data["data"].get("user"):
                user_data = data["data"]["user"]
                return {
                    "sponsors_count": user_data.get("sponsors", {}).get(
                        "totalCount", "N/A"
                    ),
                    "sponsoring_count": user_data.get("sponsoring", {}).get(
                        "totalCount", "N/A"
                    ),
                }
    except Exception as e:
        logger.warning("Failed to fetch sponsorship for %s: %s", login, e)
    return {"sponsors_count": "N/A", "sponsoring_count": "N/A"}


def fetch_user_detail_with_retry(login: str, max_retries: int = 5) -> Dict[str, Any]:
    """Fetch user details with automatic retry on rate limits or errors."""
    headers = get_github_headers()

    for attempt in range(max_retries):
        try:
            detail_url = GITHUB_USER_DETAIL_URL.format(login)
            resp = requests.get(detail_url, headers=headers, timeout=10)

            if resp.status_code == 404:
                logger.warning("User not found: %s", login)
                return {}

            if resp.status_code == 403 and "rate limit" in resp.text.lower():
                sleep_for = handle_rate_limit(resp)
                time.sleep(sleep_for + 3)
                continue

            if resp.status_code == 429:
                retry_after = resp.headers.get("Retry-After", "5")
                sleep_for = handle_429_error(retry_after, attempt)
                time.sleep(sleep_for)
                continue

            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.warning("Error fetching %s (attempt %d): %s", login, attempt + 1, e)
            time.sleep(2**attempt)

    logger.warning("Failed to fetch %s after %d attempts", login, max_retries)
    return {}


def compute_follower_growth(
    login: str, current_followers: Any, previous_users: Dict[str, Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Trending feature: compute follower growth data, including snapshot timestamp.
    """
    prev_user_data = previous_users.get(login, {})
    prev_followers = prev_user_data.get("followers")
    prev_snapshot_at = prev_user_data.get("followers_snapshot_at")

    if not isinstance(prev_followers, int) or not isinstance(prev_snapshot_at, int):
        return {
            "followers_previous": None,
            "followers_growth_pct": None,
            "followers_snapshot_at": int(time.time()),
        }

    if time.time() - prev_snapshot_at < WEEK_SECONDS:
        return {
            "followers_previous": prev_followers,
            "followers_growth_pct": prev_user_data.get("followers_growth_pct"),
            "followers_snapshot_at": prev_snapshot_at,
        }

    if not isinstance(current_followers, int) or prev_followers <= 0:
        return {
            "followers_previous": prev_followers,
            "followers_growth_pct": None,
            "followers_snapshot_at": int(time.time()),
        }

    growth_pct = ((current_followers - prev_followers) / prev_followers) * 100

    return {
        "followers_previous": prev_followers,
        "followers_growth_pct": round(growth_pct, 2),
        "followers_snapshot_at": int(time.time()),
    }


def enrich_user_with_details(
    user: Dict[str, Any],
    idx: int,
    total: int,
    previous_users: Dict[str, Dict[str, Any]],
) -> None:
    """Add detailed information (followers, repos, sponsors) to user dict."""
    detail = fetch_user_detail_with_retry(user["login"])
    if not detail:
        return

    progress = (idx / total) * 100
    sponsorship = fetch_sponsorship_info(user["login"])

    user["followers"] = detail.get("followers", "N/A")
    user["following"] = detail.get("following", "N/A")
    user["location"] = detail.get("location", "")
    user["name"] = detail.get("name")
    user["public_repos"] = detail.get("public_repos", "N/A")
    user["public_gists"] = detail.get("public_gists", "N/A")
    user["sponsors_count"] = sponsorship["sponsors_count"]
    user["sponsoring_count"] = sponsorship["sponsoring_count"]
    user["avatar_updated_at"] = detail.get("updated_at", "")

    growth = compute_follower_growth(
        login=user["login"],
        current_followers=user["followers"],
        previous_users=previous_users,
    )
    user.update(growth)

    lang_totals, total_stars, last_repo_push_at = fetch_user_repo_summary(user["login"])
    user["top_languages"] = summarize_top_languages(lang_totals)
    user["total_stars"] = total_stars
    user["last_repo_pushed_at"] = last_repo_push_at
    user["last_public_commit_at"] = fetch_last_public_commit_at(user["login"])

    logger.info(
        "[%d/%d - %.1f%%] Fetched details for %s",
        idx,
        total,
        progress,
        user["login"],
    )
    time.sleep(0.15)


def enrich_all_users(
    users: List[Dict[str, Any]], previous_users: Dict[str, Dict[str, Any]]
) -> None:
    """Enrich all users with detailed information from GitHub API."""
    total = len(users)
    for idx, user in enumerate(users, 1):
        enrich_user_with_details(user, idx, total, previous_users)


def fetch_user_repo_summary(
    login: str, max_repos: int = 200
) -> Tuple[Dict[str, int], int, str]:
    """Fetch aggregate language sizes, total stars, and latest repo push date for a user.

    Prefers GraphQL for efficiency. Falls back to REST if no token or GraphQL fails.

    Returns: (language_totals_map, total_stars, last_repo_pushed_at)
    """
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        try:
            return fetch_user_repo_summary_graphql(login, max_repos)
        except Exception as e:
            logger.warning(
                "GraphQL summary failed for %s, falling back to REST: %s",
                login,
                e,
            )
    return fetch_user_repo_summary_rest(login, max_repos)


def fetch_user_repo_summary_graphql(
    login: str, max_repos: int = 200
) -> Tuple[Dict[str, int], int, str]:
    """Fetch repo summary via GraphQL with language byte sizes, stars, and last push date.

    Returns: (language_bytes_map, total_stars, last_repo_pushed_at)
    """
    headers = get_github_headers()
    lang_totals: Dict[str, int] = {}
    total_stars = 0
    last_push = ""
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
                "query": query,
                "variables": {
                    "login": login,
                    "first": page_size,
                    "after": after_cursor,
                },
            },
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
        nodes = (
            ((data.get("data") or {}).get("user") or {}).get("repositories") or {}
        ).get("nodes") or []
        page_info = (
            ((data.get("data") or {}).get("user") or {}).get("repositories") or {}
        ).get("pageInfo") or {}

        for repo in nodes:
            fetched += 1
            total_stars += int(repo.get("stargazerCount") or 0)
            pushed_at = repo.get("pushedAt") or ""
            if pushed_at and pushed_at > last_push:
                last_push = pushed_at
            langs = ((repo.get("languages") or {}).get("edges")) or []
            for edge in langs:
                name = ((edge.get("node") or {}).get("name") or "").strip()
                size = int(edge.get("size") or 0)
                if name:
                    lang_totals[name] = lang_totals.get(name, 0) + size

        if page_info.get("hasNextPage") and page_info.get("endCursor"):
            after_cursor = page_info["endCursor"]
        else:
            break

    return lang_totals, total_stars, last_push


def fetch_user_repo_summary_rest(
    login: str, max_repos: int = 200
) -> Tuple[Dict[str, int], int, str]:
    """Fallback using REST: sums stars and approximates languages by primary language count.
    Note: primary language count is a rough proxy (no byte sizes).
    """
    headers = get_github_headers()
    total_stars = 0
    lang_counts: Dict[str, int] = {}
    last_push = ""
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
            if r.get("private"):
                continue
            fetched += 1
            total_stars += int(r.get("stargazers_count") or 0)
            primary = r.get("language")
            if primary:
                lang_counts[primary] = lang_counts.get(primary, 0) + 1
            pushed_at = r.get("pushed_at") or ""
            if pushed_at and pushed_at > last_push:
                last_push = pushed_at
            if fetched >= max_repos:
                break
        page += 1

    return lang_counts, total_stars, last_push


def summarize_top_languages(
    lang_totals: Dict[str, int], top_n: int = 5
) -> List[Dict[str, Any]]:
    """Convert language totals to sorted list with percentages.

    Returns: List of top N languages with name, bytes, and percent.
    """
    total = sum(lang_totals.values()) or 1
    top = sorted(lang_totals.items(), key=lambda kv: kv[1], reverse=True)[:top_n]
    return [
        {"name": name, "bytes": size, "percent": round((size / total) * 100, 1)}
        for name, size in top
    ]


def fetch_last_public_commit_at(login: str) -> str:
    """Get last public commit time via user public events (PushEvent)."""
    headers = get_github_headers()
    try:
        resp = requests.get(
            f"https://api.github.com/users/{login}/events/public",
            headers=headers,
            timeout=10,
        )
        if resp.status_code == 404:
            return ""
        resp.raise_for_status()
        events = resp.json() or []
        for ev in events:
            if ev.get("type") == "PushEvent":
                return ev.get("created_at", "")
        return events[0].get("created_at", "") if events else ""
    except Exception as e:
        logger.warning("Failed to fetch last public commit for %s: %s", login, e)
        return ""


def fetch_search_page(page_num: int, headers: Dict[str, str]) -> List[Dict[str, Any]]:
    """Fetch single search results page from GitHub API."""
    try:
        resp = requests.get(
            GITHUB_USER_SEARCH_URL + str(page_num), headers=headers, timeout=10
        )
        resp.raise_for_status()
        page_users = resp.json().get("items", [])
        return [u for u in page_users if u.get("type") == "User"]
    except Exception as e:
        logger.error("Failed to fetch page %d: %s", page_num, e)
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
        logger.info(
            "Page %d: %d users | Total: %d/%d (%.1f%%)",
            page_num,
            len(page_users),
            len(users),
            target,
            progress,
        )

        if len(users) >= target:
            return users[:target]

    return users


def save_cache(users: List[Dict[str, Any]]) -> None:
    """Save user data to JSON cache file."""
    ensure_dir(SITE_DIR)
    cache_file = os.path.join(SITE_DIR, "users.json")
    safe_cache_file = safe_path(cache_file)
    try:
        with open(safe_cache_file, "w", encoding="utf-8") as f:
            json.dump(
                users,
                f,
                indent=(2 if os.environ.get("APP_ENV") == "development" else None),
                ensure_ascii=False,
            )
        logger.info("Cache saved (%d users)", len(users))
    except Exception as e:
        logger.error("Failed to save cache: %s", e)


def print_section(title: str) -> None:
    """Print formatted section header with title."""
    logger.info("=" * 60)
    logger.info(title)
    logger.info("=" * 60)


def run() -> None:
    """Main entry point: fetch, enrich, download avatars, and cache users."""
    print_section("Starting GitHub Users Fetch Process")
    logger.info("Target users: %d", TARGET_USERS)
    logger.info("")

    previous_users = load_previous_users()

    users = fetch_users_from_search(TARGET_USERS)

    if not users:
        logger.error("No valid users fetched. Exiting.")
        return

    print_section(f"Fetched {len(users)} users successfully")
    logger.info("Fetching extra details (followers, following, location)...")
    logger.info("")

    enrich_all_users(users, previous_users)

    print_section("Downloading/updating avatars...")
    download_avatars(users, FACES_DIR)

    print_section("Cleaning old avatars...")
    current_logins = [user["login"] for user in users]
    clean_old_avatars(current_logins, FACES_DIR)

    print_section("Saving user data to cache...")
    save_cache(users)

    print_section(f"✅ FETCH COMPLETE! {len(users)} users cached.")


if __name__ == "__main__":
    run()
