#!/usr/bin/env python3
"""Pre-flight check for a pack landing in the ParcelReady catalog.

Run BEFORE build.py on any new or refreshed pack:
    python3 scripts/pack_check.py <pack-id> [<pack-id> ...]

Verifies, against the delivered files themselves (never the claim):
  - the catalog entry carries every field the templates render
  - the delivery file exists and its data row count equals the
    catalog's rows figure (the label standard: the file governs)
  - the format pair is staged (Atlas's format choice ruling,
    Nov 23, 2026): the delivery CSV and its XLSX sibling both exist
    with equal row counts, and the sample CSV and its XLSX sibling
    are staged in delivery/samples/ with equal row counts. A pack
    does not pass with only one format staged.
  - the cover art is in assets/covers/
  - the store block is complete (mode, billing, delivery file)
Exits non-zero and prints every failure it finds. A pack that fails
this check does not get built.
"""
import csv
import json
import os
import sys

import openpyxl


def xlsx_rows(path):
    wb = openpyxl.load_workbook(path, read_only=True)
    counted = sum(1 for _ in wb.active.iter_rows(values_only=True)) - 1
    wb.close()
    return counted

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DP = os.path.expanduser("~/workspace/data-products")
REQUIRED = ["title", "tagline", "buyer", "coverage", "rows", "rows_label",
            "data_as_of", "refresh_schedule", "price", "price_note",
            "inside", "stats", "limits", "cover", "family", "category",
            "state", "metro", "trade"]


def main(ids):
    catalog = json.load(open(os.path.join(ROOT, "catalog.json")))
    packs = {p["id"]: p for p in catalog["packs"]}
    failures = 0
    for pid in ids:
        p = packs.get(pid)
        if not p:
            print(f"FAIL {pid}: no catalog entry")
            failures += 1
            continue
        problems = []
        for field in REQUIRED:
            if not p.get(field):
                problems.append(f"missing field {field}")
        store = p.get("store") or {}
        for field in ("mode", "billing", "delivery_file"):
            if not store.get(field):
                problems.append(f"store block missing {field}")
        cover = os.path.join(ROOT, p.get("cover", ""))
        if not os.path.exists(cover):
            problems.append(f"cover not found: {p.get('cover')}")
        delivery = (store.get("delivery_file") or "").split(" + ")[0].strip()
        path = os.path.join(DP, delivery) if delivery else None
        rows = None
        if path and os.path.exists(path):
            with open(path, newline="", encoding="utf-8-sig") as f:
                rows = sum(1 for _ in csv.reader(f)) - 1
            if rows != p.get("rows"):
                problems.append(
                    f"row count mismatch: file holds {rows}, catalog claims {p.get('rows')}")
        elif delivery:
            problems.append(f"delivery file not found: {delivery}")
        if delivery and rows is not None:
            # The format pair, delivery side: the XLSX sibling must be
            # staged with the same data row count as the CSV.
            xlsx_path = os.path.splitext(path)[0] + ".xlsx"
            if not os.path.exists(xlsx_path):
                problems.append(f"format pair incomplete: no xlsx sibling for {delivery}")
            elif xlsx_rows(xlsx_path) != rows:
                problems.append(
                    f"format pair mismatch: xlsx holds {xlsx_rows(xlsx_path)} rows, csv holds {rows}")
            # The format pair, sample side: delivery/samples/<id>-sample
            # in both formats with equal row counts.
            sample_csv = os.path.join(ROOT, "delivery", "samples", f"{pid}-sample.csv")
            sample_xlsx = os.path.splitext(sample_csv)[0] + ".xlsx"
            if not os.path.exists(sample_csv):
                problems.append(f"sample not staged: delivery/samples/{pid}-sample.csv")
            elif not os.path.exists(sample_xlsx):
                problems.append(f"format pair incomplete: no xlsx sibling for the sample")
            else:
                with open(sample_csv, newline="", encoding="utf-8-sig") as f:
                    sample_rows = sum(1 for _ in csv.reader(f)) - 1
                if xlsx_rows(sample_xlsx) != sample_rows:
                    problems.append(
                        f"sample format pair mismatch: xlsx holds {xlsx_rows(sample_xlsx)} rows, csv holds {sample_rows}")
        if problems:
            failures += 1
            for problem in problems:
                print(f"FAIL {pid}: {problem}")
        else:
            print(f"OK   {pid}: {p['rows']} rows verified against the file, "
                  f"cover and copy complete, store mode {store['mode']}")
    return 1 if failures else 0


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(sys.argv[1:]))
