#!/usr/bin/env python3
"""Convert a delivered CSV to its XLSX sibling, in the shelf's own
conventions: one sheet named "Sheet", every value stored as text
exactly as the CSV carries it (ZIP codes and account numbers are
never re-typed as numbers), blanks left blank.

Usage: python3 scripts/make_xlsx.py <file.csv> [<file.csv> ...]

Writes <file>.xlsx beside each CSV and verifies the pair: the XLSX
data row count must equal the CSV data row count, or the script
exits non-zero. Part of the landing pipeline (Atlas's format choice
ruling, Nov 23, 2026): every pack and sample stages in both formats.
"""
import csv
import os
import sys

import openpyxl


def convert(csv_path):
    xlsx_path = os.path.splitext(csv_path)[0] + ".xlsx"
    wb = openpyxl.Workbook(write_only=True)
    ws = wb.create_sheet("Sheet")
    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        header = next(reader)
        ws.append(header)
        rows = 0
        for row in reader:
            # Pad or trim to the header width so the sheet is rectangular.
            row = (row + [""] * len(header))[: len(header)]
            ws.append([v if v != "" else None for v in row])
            rows += 1
    wb.save(xlsx_path)
    # Verify the pair by recounting the written file.
    check = openpyxl.load_workbook(xlsx_path, read_only=True)
    counted = sum(1 for _ in check.active.iter_rows(values_only=True)) - 1
    check.close()
    if counted != rows:
        print(f"FAIL {csv_path}: xlsx holds {counted} data rows, csv holds {rows}")
        return False
    print(f"ok {xlsx_path}: {rows} data rows, matches the csv")
    return True


def main(paths):
    if not paths:
        print(__doc__)
        return 2
    ok = True
    for p in paths:
        if not p.endswith(".csv") or not os.path.exists(p):
            print(f"FAIL {p}: not an existing csv")
            ok = False
            continue
        ok = convert(p) and ok
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
