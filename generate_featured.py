#!/usr/bin/env python3
"""Quick script to generate featured.json from existing users.json"""

import json
from datetime import datetime, timezone


def calculate_engagement_score(user):
    """Calculate engagement score for a user."""
    score = 0.0

    # Followers contribution (40%)
    followers = user.get("followers", 0)
    if followers != "N/A" and followers:
        score += min(followers / 1000, 100) * 0.4

    # Total stars contribution (30%)
    stars = user.get("total_stars", 0)
    if stars != "N/A" and stars:
        score += min(stars / 500, 100) * 0.3

    # Public repos contribution (15%)
    repos = user.get("public_repos", 0)
    if repos != "N/A" and repos:
        score += min(repos / 50, 100) * 0.15

    # Sponsors contribution (10%)
    sponsors = user.get("sponsors_count", 0)
    if sponsors != "N/A" and sponsors:
        score += min(sponsors / 20, 100) * 0.1

    # Recent activity bonus (5%)
    last_commit = user.get("last_public_commit_at", "")
    if last_commit:
        try:
            commit_date = datetime.fromisoformat(last_commit.replace("Z", "+00:00"))
            days_ago = (datetime.now(timezone.utc) - commit_date).days
            if days_ago < 90:
                recency_score = max(0, (90 - days_ago) / 90 * 100)
                score += recency_score * 0.05
        except (ValueError, TypeError):
            pass

    return score


# Load existing users
with open("./docs/users.json", "r") as f:
    users = json.load(f)

# Calculate scores
for user in users:
    user["engagement_score"] = calculate_engagement_score(user)

# Select featured user
featured = max(users, key=lambda u: u.get("engagement_score", 0))

print(f"Featured user: {featured['login']}")
print(f"Engagement score: {featured['engagement_score']:.2f}")
print(f"Followers: {featured.get('followers', 'N/A')}")
print(f"Total stars: {featured.get('total_stars', 'N/A')}")
print(f"Public repos: {featured.get('public_repos', 'N/A')}")

# Create featured.json
featured_data = {
    "user": featured,
    "selected_at": datetime.now(timezone.utc).isoformat(),
    "month": datetime.now(timezone.utc).strftime("%B %Y"),
}

with open("./docs/featured.json", "w") as f:
    json.dump(featured_data, f, ensure_ascii=False)

print(f"\n✅ Created docs/featured.json with {featured['login']} as featured user!")
