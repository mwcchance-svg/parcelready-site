#!/usr/bin/env python3
"""Upload one delivery file to the store bucket via /api/admin/upload.

The landing pipeline's bucket step, runnable from this desk once HQ
has set the ADMIN_TOKEN function secret and passed the value over.
The token comes from the PR_ADMIN_TOKEN environment variable only;
it is never stored in this repo or printed.

    PR_ADMIN_TOKEN=... python3 scripts/upload_file.py <local-path> <key>

<key> must be packs/<name>.csv or samples/<name>.csv. The API base
defaults to the live function and can be overridden with PR_API_BASE.
"""
import os
import sys
import urllib.request

API_BASE = os.environ.get(
    "PR_API_BASE",
    "https://zohneuvgkdlwbjldnnlp.supabase.co/functions/v1/parcelready-store")


def main():
    token = os.environ.get("PR_ADMIN_TOKEN")
    if not token:
        print("PR_ADMIN_TOKEN is not set; HQ sets the secret and passes "
              "the value at the sitting. Nothing uploaded.")
        return 2
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    path, key = sys.argv[1], sys.argv[2]
    with open(path, "rb") as f:
        body = f.read()
    req = urllib.request.Request(
        f"{API_BASE}/api/admin/upload?key={key}",
        data=body, method="POST",
        headers={"x-admin-token": token, "Content-Type": "text/csv"})
    with urllib.request.urlopen(req) as res:
        print(res.status, res.read().decode())
    print(f"uploaded {path} -> {key} ({len(body)} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
