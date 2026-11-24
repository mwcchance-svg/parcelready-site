#!/usr/bin/env python3
"""Rebuild the Free Sample Pack workbook (B8): one sheet per paid
pack in that pack's exact columns, rows drawn from each pack's
delivered sample file (trade packs: the fullest-rows draw under the
A4 amendment; county packs: the standard sample). Sheet names and
per-sheet row counts are inherited positionally from the shipped
workbook so the artifact's shape never drifts: 42 sheets, 100 rows.
Run after any sample regeneration, then re-upload
delivery/samples/free-sample-pack-sample.xlsx to the bucket at
samples/free-sample-pack-sample.xlsx."""
import csv
import json
import os

from openpyxl import Workbook, load_workbook

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TARGET = os.path.join(ROOT, "delivery", "samples", "free-sample-pack-sample.xlsx")


def main():
    old = load_workbook(TARGET)
    old_sheets = [(ws.title, ws.max_row - 1) for ws in old.worksheets]
    with open(os.path.join(ROOT, "catalog.json")) as f:
        cat = json.load(f)
    packs = [p for p in cat["packs"] if p["price"] > 0]
    assert len(packs) == len(old_sheets), (len(packs), len(old_sheets))
    wb = Workbook()
    wb.remove(wb.active)
    total = 0
    for p, (title, n) in zip(packs, old_sheets):
        with open(os.path.join(ROOT, "delivery", "samples", f"{p['id']}-sample.csv"),
                  newline="", encoding="utf-8-sig") as f:
            rows = list(csv.DictReader(f))
        headers = list(rows[0].keys())
        ws = wb.create_sheet(title)
        ws.append(headers)
        for r in rows[:n]:
            ws.append([r.get(h, "") for h in headers])
        total += n
    wb.save(TARGET)
    print(f"workbook rebuilt: {len(wb.worksheets)} sheets, {total} rows")


if __name__ == "__main__":
    main()
