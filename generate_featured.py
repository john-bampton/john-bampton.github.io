#!/usr/bin/env python3
"""Standalone script to regenerate featured user from existing users.json."""

import json
import os
import sys

# Import from fetch module
sys.path.insert(0, os.path.dirname(__file__))
from fetch import calculate_engagement_score, safe_path, select_featured_user

SITE_DIR = "./docs"


def main():
    """Load users and regenerate featured user."""
    users_path = safe_path(os.path.join(SITE_DIR, "users.json"))

    if not os.path.exists(users_path):
        print("Error: users.json not found. Run fetch.py first.")
        sys.exit(1)

    with open(users_path, encoding="utf-8") as f:
        users = json.load(f)

    print(f"Loaded {len(users)} users from cache")

    featured_user = select_featured_user(users)

    if featured_user:
        from datetime import datetime

        featured_data = {
            "user": featured_user,
            "selected_at": datetime.now().isoformat(),
            "month": datetime.now().strftime("%B %Y"),
        }

        featured_path = safe_path(os.path.join(SITE_DIR, "featured.json"))
        with open(featured_path, "w", encoding="utf-8") as f:
            json.dump(featured_data, f, separators=(",", ":"))

        print(
            f"✅ Featured user: {featured_user['login']} (score: {calculate_engagement_score(featured_user):.2f})"
        )
    else:
        print("❌ No featured user selected")


if __name__ == "__main__":
    main()
