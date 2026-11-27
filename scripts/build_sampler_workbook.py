#!/usr/bin/env python3
"""Rebuild the Free Sample Pack workbook (B8): one sheet per paid
pack in that pack's exact columns, rows drawn from each pack's
delivered sample file (trade packs: the fullest-rows draw under the
A4 amendment; county packs: the standard sample). Sheet titles are
the pack titles truncated to Excel's 31 characters. Per-sheet row
counts carry over by sheet title from the shipped workbook; a pack
with no sheet yet starts at 2 rows, and the workbook total is then
rebalanced to exactly 100 rows by trimming the largest sheets
(never below 1), so the "100 records in all" line stays true as
packs are added. Run after any sample regeneration or catalog
addition, then re-upload delivery/samples/free-sample-pack-sample.xlsx
to the bucket at samples/free-sample-pack-sample.xlsx.

Nov 24, 2026 (hostile audit): the original positional inheritance
asserted 42 sheets against a 45-pack catalog after the Miami-Dade
landing and could not run at all; the mapping is by title now."""
import csv
import json
import os

from openpyxl import Workbook, load_workbook

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TARGET = os.path.join(ROOT, "delivery", "samples", "free-sample-pack-sample.xlsx")
TOTAL_ROWS = 100
NEW_PACK_ROWS = 2


# One legacy sheet predates the title rule: the shipped workbook
# carries it under this exact name, and the by-title count mapping
# depends on keeping it.
LEGACY_TITLES = {"collin-tired-landlords": "Collin County Tired Landlords "}


def sheet_title(pack) -> str:
    if pack["id"] in LEGACY_TITLES:
        return LEGACY_TITLES[pack["id"]]
    t = pack["title"]
    for ch in "[]:*?/\\":
        t = t.replace(ch, " ")
    return t[:31]


def main():
    old = load_workbook(TARGET)
    # Sheet titles with trailing spaces do not survive a save/load
    # round trip (Excel trims them), so counts inherit on rstripped
    # keys on both sides. Found Nov 27, 2026: six shipped sheets
    # (comma-truncated absentee titles, the Collin legacy title, the
    # Collin long-term title) read back rstripped and no pack claimed
    # them under the un-stripped keys.
    counts = {ws.title.rstrip(): ws.max_row - 1 for ws in old.worksheets}
    with open(os.path.join(ROOT, "catalog.json")) as f:
        cat = json.load(f)
    packs = [p for p in cat["packs"] if p["price"] > 0]
    titles = [sheet_title(p).rstrip() for p in packs]
    missing = set(counts) - set(titles)
    assert not missing, f"shipped sheets no pack claims: {missing}"
    assert len(set(titles)) == len(titles), "sheet title collision after truncation"
    alloc = [counts.get(t, NEW_PACK_ROWS) for t in titles]
    while sum(alloc) > TOTAL_ROWS:
        i = max(range(len(alloc)), key=lambda j: alloc[j])
        assert alloc[i] > 1, "cannot rebalance without emptying a sheet"
        alloc[i] -= 1
    while sum(alloc) < TOTAL_ROWS:
        i = max(range(len(alloc)), key=lambda j: alloc[j])
        alloc[i] += 1
    wb = Workbook()
    wb.remove(wb.active)
    for p, title, n in zip(packs, titles, alloc):
        with open(os.path.join(ROOT, "delivery", "samples", f"{p['id']}-sample.csv"),
                  newline="", encoding="utf-8-sig") as f:
            rows = list(csv.DictReader(f))
        headers = list(rows[0].keys())
        ws = wb.create_sheet(title)
        ws.append(headers)
        for r in rows[:n]:
            ws.append([r.get(h, "") for h in headers])
    wb.save(TARGET)
    print(f"workbook rebuilt: {len(wb.worksheets)} sheets, {sum(alloc)} rows")
    for p, title, n in zip(packs, titles, alloc):
        if counts.get(title) != n:
            print(f"  allocation change: {title!r} {counts.get(title)} -> {n}")


if __name__ == "__main__":
    main()
