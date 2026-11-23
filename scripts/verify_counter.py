#!/usr/bin/env python3
"""Weld check for the records counter (Matt's rule, Nov 23, 2026:
when the data updates, the ticker updates).

Independently recounts the delivered set from the delivery files and
compares it with the counter rendered on the home page. Run after any
data change, refresh or new pack, whether or not a build just ran:
a stale counter fails here even if nobody rebuilt.

    python3 scripts/verify_counter.py [--index path/to/index.html]

Prints the named verification line and exits non-zero on any mismatch.
"""
import csv
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DP = os.path.expanduser("~/workspace/data-products")


def recount():
    catalog = json.load(open(os.path.join(ROOT, "catalog.json")))
    total = 0
    for p in catalog["packs"]:
        if p["id"] == "free-sample-pack":
            continue  # its records are drawn from the other packs
        delivery = ((p.get("store") or {}).get("delivery_file") or "").split(" + ")[0].strip()
        path = os.path.join(DP, delivery) if delivery else None
        if path and os.path.exists(path):
            with open(path, newline="", encoding="utf-8-sig") as f:
                total += sum(1 for _ in csv.reader(f)) - 1
        else:
            total += p["rows"] if isinstance(p.get("rows"), int) else 0
    return total


def main():
    index_path = os.path.join(ROOT, "index.html")
    if "--index" in sys.argv:
        index_path = sys.argv[sys.argv.index("--index") + 1]
    html = open(index_path).read()
    m = re.search(r'data-total="(\d+)"', html)
    rendered = int(m.group(1)) if m else None
    tag = re.search(r'data-records-tag>([\d,]+)', html)
    tagged = int(tag.group(1).replace(",", "")) if tag else None
    delivered = recount()
    if rendered == delivered and tagged == delivered:
        print(f"COUNTER VERIFIED: rendered home page reads {delivered:,}; "
              f"delivered set recounts {delivered:,}; match.")
        return 0
    print(f"COUNTER MISMATCH: rendered counter {rendered}, pin tag {tagged}, "
          f"delivered set recounts {delivered:,}. Rebuild and recount.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
