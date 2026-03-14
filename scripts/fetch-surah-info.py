#!/usr/bin/env python3
"""
Fetch rich surah info from quran.com/surah/{n}/info (Ibn Ashur tafsir) and save
structured blocks to data/surah-info.json.

Each surah entry has independent hint blocks for the drill feature:
  themes, context, virtue, alternativeNames, overview (list)

Usage:
    python scripts/fetch-surah-info.py

Requires: requests beautifulsoup4  (pip install requests beautifulsoup4)
"""

import json
import re
import time
from pathlib import Path

try:
    import requests
except ImportError:
    raise SystemExit("pip install requests beautifulsoup4")

try:
    from bs4 import BeautifulSoup, Tag
except ImportError:
    raise SystemExit("pip install beautifulsoup4")

DATA_DIR = Path(__file__).parent.parent / "data"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; harf-app/1.0)",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
}

# ── Load existing surah-info.json for metadata (name, nameArabic, juz, etc.) ─

existing_raw = (DATA_DIR / "surah-info.json").read_text()
existing: dict[str, dict] = json.loads(existing_raw)

# ── HTML helpers ──────────────────────────────────────────────────────────────

def clean(text: str) -> str:
    """Collapse whitespace and strip."""
    return re.sub(r"\s+", " ", text).strip()


def parse_page(html: str) -> dict:
    """
    Extract structured hint blocks from the quran.com surah info page HTML.
    Returns: { themes, context, virtue, alternativeNames, overview }
    """
    soup = BeautifulSoup(html, "html.parser")

    # Find the description container div (class contains 'descriptionContainer')
    container = soup.find(class_=re.compile(r"descriptionContainer"))
    if not container:
        # Fallback: look for the marker paragraph
        marker = soup.find(string=re.compile(r"Adapted from Tafsir Ibn Ashur"))
        container = marker.parent.parent if marker and marker.parent else soup

    result = {
        "themes": "",
        "context": "",
        "names": "",
        "virtue": "",
        "overview": [],
    }

    current_section = None
    context_parts: list[str] = []

    for el in container.children:
        if not isinstance(el, Tag):
            continue

        tag = el.name
        strong = el.find("strong")

        if tag == "p" and strong:
            label = clean(strong.get_text()).rstrip(":")
            label_lc = label.lower()

            el_full = clean(el.get_text())

            # Inline = text from non-<strong> children only.
            # Handles both normal (content after label) and reversed layouts
            # (e.g. surah 1: "<em>themes text</em><strong>Context…</strong>")
            non_strong: list[str] = []
            for child in el.children:
                if isinstance(child, Tag):
                    if child.name != "strong":
                        t = clean(child.get_text())
                        if t:
                            non_strong.append(t)
                else:
                    t = clean(str(child))
                    if t:
                        non_strong.append(t)
            inline = " ".join(non_strong).strip()

            # ── Major section headings ─────────────────────────────────────────
            if "themes and purpose" in label_lc:
                if inline and not result["themes"]:
                    result["themes"] = inline  # themes inline in heading (rare)
                current_section = "themes"
                continue

            elif "context of revelation" in label_lc:
                # Some surahs put themes text inline here when themes heading has no body
                if current_section == "themes" and not result["themes"] and inline:
                    result["themes"] = inline
                elif inline:
                    context_parts.append(inline)
                current_section = "context"
                continue

            elif "name and ayah count" in label_lc:
                current_section = "name"
                continue

            elif "surah overview" in label_lc:
                current_section = "overview"
                continue

            # ── Sub-labels (Name / Virtue appear with or without outer heading) ──
            # These can be top-level OR nested under "name and ayah count"
            if "virtue" in label_lc and inline:
                result["virtue"] = inline
                continue
            if label_lc.startswith("name") and "name and ayah" not in label_lc and inline:
                if not result["names"]:
                    result["names"] = inline
                continue
            if label_lc in ("ayah count", "ayah count"):
                continue  # skip; have it from metadata

            # ── Context sub-labels (Era, Chronology, Context, Time, Order…) ───
            if current_section in ("context", "name"):
                if inline:
                    context_parts.append(el_full)  # keep label + value, e.g. "Era: Makkan"
                continue

        # ── Elements without a strong label ───────────────────────────────────
        if current_section == "themes" and tag == "p":
            t = clean(el.get_text())
            if t and "Adapted from" not in t and not result["themes"]:
                result["themes"] = t

        elif current_section == "context" and tag == "p":
            t = clean(el.get_text())
            if t:
                context_parts.append(t)

        elif current_section == "overview" and tag in ("ul", "ol"):
            for li in el.find_all("li"):
                item = clean(li.get_text())
                if item:
                    result["overview"].append(item)
            current_section = None

    result["context"] = " ".join(context_parts).strip()
    return result


def fetch_with_retry(url: str, retries: int = 3) -> str | None:
    for attempt in range(retries):
        try:
            r = requests.get(url, headers=HEADERS, timeout=20)
            r.raise_for_status()
            return r.text
        except Exception as exc:
            if attempt == retries - 1:
                print(f"  ERROR after {retries} attempts: {exc}")
                return None
            delay = 2 ** attempt
            print(f"  retry {attempt+1}/{retries} in {delay}s — {exc}")
            time.sleep(delay)
    return None


# ── Main loop ─────────────────────────────────────────────────────────────────

result: dict[str, dict] = {}

for n in range(1, 115):
    base = existing.get(str(n), {})
    print(f"[{n:>3}/114] {base.get('name', f'Surah {n}'):<22}", end=" ", flush=True)

    html = fetch_with_retry(f"https://quran.com/surah/{n}/info")
    if not html:
        result[str(n)] = base  # keep existing data
        continue

    parsed = parse_page(html)

    entry = {
        # ── Core metadata (from existing JSON) ──────────────────────────────
        "id":                 n,
        "name":               base.get("name", ""),
        "nameArabic":         base.get("nameArabic", ""),
        "translation":        base.get("translation", ""),
        "verses":             base.get("verses", 0),
        "revelationPlace":    base.get("revelationPlace", ""),
        "chronologicalOrder": base.get("chronologicalOrder", 0),
        "juz":                base.get("juz", []),
        # ── Hint blocks (from Ibn Ashur page) ───────────────────────────────
        "themes":             parsed["themes"],
        "context":            parsed["context"],
        "names":              parsed["names"],
        "virtue":             parsed["virtue"],
        "overview":           parsed["overview"],
        # ── Keep short summary for backward compat ───────────────────────────
        "summary":            parsed["themes"] or base.get("summary", ""),
    }

    result[str(n)] = entry

    ok_fields = sum(1 for v in [parsed["themes"], parsed["context"], parsed["virtue"], parsed["names"]] if v)
    ov_count = len(parsed["overview"])
    print(f"✓  {ok_fields}/3 text blocks · {ov_count} overview items")

    time.sleep(0.4)  # polite: 2.5 req/s

# ── Write output ──────────────────────────────────────────────────────────────

out_path = DATA_DIR / "surah-info.json"
out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2))
print(f"\n✅  Saved {len(result)} surahs → {out_path.relative_to(Path.cwd())}")
