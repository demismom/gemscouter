#!/usr/bin/env python3
"""
Gem Scouter → Pinterest Auto-Pinner
Fetches live listings from gemscouter.com data sources and pins 20 items/day to Pinterest.
"""

import os
import json
import random
import requests
import time
import sys
from datetime import datetime, date
from pathlib import Path

# ─── CONFIG ──────────────────────────────────────────────────────────────────

PINTEREST_ACCESS_TOKEN = os.environ["PINTEREST_ACCESS_TOKEN"]
PINTEREST_BOARD_ID     = os.environ["PINTEREST_BOARD_ID"]  # e.g. "1234567890123456789"

AFFILIATE_CAMPID = "5339145706"  # Your eBay campaign ID
PINS_PER_DAY     = 20
DELAY_BETWEEN_PINS = 30  # seconds between API calls (be gentle with the API)

# Data sources — Gem Scouter pulls from these JSON files via GitHub Pages
DATA_URLS = [
    "https://gemscouter.com/listings.json",
]

PINTEREST_PINS_URL = "https://api.pinterest.com/v5/pins"

# Category → Pinterest board section hints (optional, for future board sections)
CATEGORY_HASHTAGS = {
    "Watches & Timepieces": ["#vintagewatches", "#watchcollector", "#antiquewatch", "#vintagestyle"],
    "Jewelry & Accessories": ["#vintagejewelry", "#handmadejewelry", "#estatejewelry", "#bohojewelry"],
    "Eyewear & Sunglasses": ["#vintageeyewear", "#sunglassesstyle", "#retrosunglasses", "#vintagefashion"],
    "Paintings & Original Art": ["#originalart", "#handmadeart", "#artcollector", "#vintageart"],
    # Also handle shorter category names
    "Watches":   ["#vintagewatches", "#watchcollector", "#antiquewatch", "#vintagestyle"],
    "Jewelry":   ["#vintagejewelry", "#handmadejewelry", "#estatejewelry", "#bohojewelry"],
    "Eyewear":   ["#vintageeyewear", "#sunglassesstyle", "#retrosunglasses", "#vintagefashion"],
    "Paintings": ["#originalart", "#handmadeart", "#artcollector", "#vintageart"],
}

DEFAULT_HASHTAGS = ["#vintagefinds", "#handmade", "#shopvintage", "#uniquegifts", "#gemscouter"]

# ─── HELPERS ─────────────────────────────────────────────────────────────────

def fetch_listings():
    """Fetch listings from Gem Scouter's listings.json."""
    listings = []
    for url in DATA_URLS:
        try:
            r = requests.get(url, timeout=10)
            if r.status_code == 200:
                data = r.json()
                items = []
                if isinstance(data, list):
                    items = data
                elif isinstance(data, dict):
                    # listings.json has {pinned: [...], scouted: [...]}
                    for key in ["pinned", "scouted", "trustedScouted", "broadScouted", "listings", "items", "results"]:
                        if key in data and isinstance(data[key], list):
                            items.extend(data[key])
                listings.extend(items)
                print(f"  ✓ {url} → {len(items)} items")
        except Exception as e:
            print(f"  ✗ {url} → {e}")
    return listings


def build_affiliate_url(item_url: str) -> str:
    """Append eBay affiliate campid if not already present."""
    if not item_url:
        return item_url
    if "campid" in item_url:
        return item_url
    sep = "&" if "?" in item_url else "?"
    return f"{item_url}{sep}campid={AFFILIATE_CAMPID}&toolid=10001"


def build_description(item: dict) -> str:
    """Generate a Pinterest-friendly pin description."""
    title     = item.get("title", "Rare vintage find")
    price     = item.get("price", item.get("currentPrice", ""))
    category  = item.get("categoryName", item.get("category", ""))
    condition = item.get("condition", "")
    seller    = item.get("seller", item.get("sellerUsername", ""))

    # Price formatting
    price_str = ""
    if price:
        try:
            price_str = f"${float(price):.2f}"
        except (ValueError, TypeError):
            price_str = str(price)

    # Build a human-feeling description
    lines = []
    lines.append(f"✨ {title}")
    if price_str:
        lines.append(f"💰 {price_str}")
    if condition:
        lines.append(f"Condition: {condition}")
    lines.append("")
    lines.append("Curated by Gem Scouter — rare handmade & vintage finds from across the web.")
    lines.append("Price never ranks results. Your taste does.")
    lines.append("")

    # Hashtags
    tags = CATEGORY_HASHTAGS.get(category, []) + DEFAULT_HASHTAGS
    lines.append(" ".join(tags[:8]))  # Pinterest recommends ≤ 20 hashtags; we keep it tight

    return "\n".join(lines)


def get_image_url(item: dict) -> str | None:
    """Extract the best image URL from an item."""
    for key in ["imageUrl", "image", "galleryURL", "picture", "thumbnail", "img"]:
        url = item.get(key)
        if url and isinstance(url, str) and url.startswith("http"):
            return url
    return None


def get_item_id(item: dict) -> str | None:
    """Get the unique item ID."""
    return item.get("id") or item.get("itemId")


def get_affiliate_url(item: dict) -> str:
    """Get the affiliate/buy URL for the item."""
    # Your data already has affiliateUrl with campid baked in
    url = item.get("affiliateUrl") or item.get("viewItemURL") or item.get("url") or item.get("link", "")
    if not url:
        return "https://gemscouter.com"
    # Only append campid for eBay URLs that don't already have it
    if "ebay.com" in url and "campid" not in url:
        sep = "&" if "?" in url else "?"
        url = f"{url}{sep}campid={AFFILIATE_CAMPID}&toolid=10001"
    return url


def already_pinned_today(item_id: str, pinned_log: dict) -> bool:
    today = str(date.today())
    return item_id in pinned_log.get(today, [])


def load_pinned_log(log_path: Path) -> dict:
    if log_path.exists():
        try:
            return json.loads(log_path.read_text())
        except Exception:
            pass
    return {}


def save_pinned_log(log_path: Path, log: dict):
    # Keep only last 30 days to avoid bloat
    sorted_days = sorted(log.keys(), reverse=True)
    trimmed = {k: log[k] for k in sorted_days[:30]}
    log_path.write_text(json.dumps(trimmed, indent=2))


def pin_item(item: dict) -> bool:
    """Create a single Pinterest pin. Returns True on success."""
    image_url = get_image_url(item)
    if not image_url:
        print(f"    ⚠ No image for: {item.get('title', '?')[:50]}")
        return False

    affiliate_url = get_affiliate_url(item)
    title = item.get("title", "Rare Vintage Find")[:100]  # Pinterest title limit

    payload = {
        "board_id":    PINTEREST_BOARD_ID,
        "title":       title,
        "description": build_description(item),
        "link":        affiliate_url,
        "media_source": {
            "source_type": "image_url",
            "url":          image_url,
        },
        "alt_text": f"{title} — found on Gem Scouter",
    }

    headers = {
        "Authorization": f"Bearer {PINTEREST_ACCESS_TOKEN}",
        "Content-Type":  "application/json",
    }

    try:
        r = requests.post(PINTEREST_PINS_URL, headers=headers, json=payload, timeout=15)
        if r.status_code in (200, 201):
            pin_data = r.json()
            print(f"    ✓ Pinned: {title[:60]} → pin {pin_data.get('id', '?')}")
            return True
        else:
            print(f"    ✗ API error {r.status_code}: {r.text[:200]}")
            return False
    except Exception as e:
        print(f"    ✗ Request failed: {e}")
        return False


# ─── MAIN ────────────────────────────────────────────────────────────────────

def main():
    print(f"\n🌿 Gem Scouter Pinterest Pinner — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    log_path = Path("pinned_log.json")
    pinned_log = load_pinned_log(log_path)
    today = str(date.today())

    # 1. Fetch listings
    print("\n📡 Fetching listings from Gem Scouter...")
    all_listings = fetch_listings()

    if not all_listings:
        print("❌ No listings found. Check data URLs.")
        sys.exit(1)

    print(f"   Total listings available: {len(all_listings)}")

    # 2. Filter out items already pinned today
    already_today = set(pinned_log.get(today, []))
    candidates = [
        item for item in all_listings
        if get_item_id(item) and get_item_id(item) not in already_today and get_image_url(item)
    ]

    print(f"   Eligible to pin today: {len(candidates)}")

    if not candidates:
        print("✅ Already pinned everything available today!")
        return

    # 3. Pick 20 randomly (or all if fewer available)
    to_pin = random.sample(candidates, min(PINS_PER_DAY, len(candidates)))
    print(f"\n📌 Pinning {len(to_pin)} items to board {PINTEREST_BOARD_ID}...\n")

    # 4. Pin each item
    pinned_today = list(already_today)
    success_count = 0

    for i, item in enumerate(to_pin, 1):
        item_id = get_item_id(item) or f"unknown_{i}"
        print(f"  [{i}/{len(to_pin)}] {item.get('title', '?')[:60]}")

        if pin_item(item):
            pinned_today.append(item_id)
            success_count += 1
        
        # Save progress after each pin (resilient to mid-run failures)
        pinned_log[today] = pinned_today
        save_pinned_log(log_path, pinned_log)

        # Rate limiting — Pinterest allows ~100 pins/day for standard tier
        if i < len(to_pin):
            time.sleep(DELAY_BETWEEN_PINS)

    print(f"\n✅ Done! {success_count}/{len(to_pin)} pins created successfully.")
    print(f"   Total pinned today: {len(pinned_today)}")


if __name__ == "__main__":
    main()
