#!/usr/bin/env python3
"""Standing probe set for the ParcelReady store function (Mason KB entry 07-01).

Probes the three customer routes of the live Supabase function:
  1. checkout_ok      POST /api/checkout with a live pack, expect a Stripe URL
  2. checkout_bogus   POST /api/checkout with a bogus pack, expect the clean error
  3. sample_ok        POST /api/sample for a live pack to the desk's own mailbox,
                      expect {"ok": true, "delivered": "sample"}
  4. download_no_token  GET /api/download, expect 400 "missing token"
  5. download_bad_token GET /api/download?token=bogus, expect 403 "link expired or invalid"

The positive download leg (a real token click-through) is NOT probed here:
tokens only exist inside delivered emails, so that leg runs attended after
every deploy and weekly (see entry 07-01).

Every run appends a dated block to the probe log and rewrites the last-run
block in entry 07-01 between its markers. Exit code 0 when every leg passes,
1 when any leg fails.

Probe sample requests are marked source "probe-07" with a probe note so the
leads table never mistakes them for customer demand.
"""
import json
import re
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

BASE = "https://zohneuvgkdlwbjldnnlp.supabase.co/functions/v1/parcelready-store"
PROBE_EMAIL = "mwc.chance@gmail.com"
LOG = Path.home() / "workspace/operations/knowledge-base/07-observability/probe-log.md"
ENTRY = Path.home() / "workspace/operations/knowledge-base/07-observability/07-01-standing-probe-set.md"
TIMEOUT = 30


def call(method, path, payload=None):
    """One call with transport retries. The egress proxy drops connections to
    this function intermittently (the Nov 23, 2026 upload lesson); a dropped
    connection is retried up to 3 times, while any HTTP response, including an
    error status, is a real answer and is returned at once."""
    data = json.dumps(payload).encode() if payload is not None else None
    last_err = None
    for attempt in range(3):
        req = urllib.request.Request(
            BASE + path,
            data=data,
            method=method,
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
                return resp.status, resp.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            # The status is a real answer, but the proxy can still truncate
            # the error body mid-read (IncompleteRead, Nov 26, 2026 run);
            # a truncated body is a transport failure, so retry the call.
            try:
                return e.code, e.read().decode("utf-8", "replace")
            except Exception as read_err:
                last_err = read_err
                time.sleep(2 * (attempt + 1))
        except Exception as e:  # transport drop: retry
            last_err = e
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"transport failed after 3 attempts: {last_err}")


def leg(name, ok, detail):
    return {"leg": name, "ok": bool(ok), "detail": detail}


def safe_call(method, path, payload=None):
    try:
        return call(method, path, payload)
    except RuntimeError as e:
        return None, str(e)


def run():
    results = []

    status, body = safe_call("POST", "/api/checkout", {"pack_id": "dallas-absentee"})
    url = ""
    try:
        url = json.loads(body).get("url", "")
    except Exception:
        pass
    results.append(leg("checkout_ok", status == 200 and url.startswith("https://checkout.stripe.com/"),
                       f"HTTP {status}, url host {'checkout.stripe.com' if url.startswith('https://checkout.stripe.com/') else 'NONE'}"))

    status, body = safe_call("POST", "/api/checkout", {"pack_id": "probe-bogus-pack"})
    results.append(leg("checkout_bogus", status == 400 and "pack_not purchasable_here" in body,
                       f"HTTP {status}, body {body.strip()[:80]}"))

    status, body = safe_call("POST", "/api/sample", {
        "email": PROBE_EMAIL,
        "pack_id": "dallas-absentee",
        "business_name": "Standing probe (Mason KB 07-01)",
        "source": "probe-07",
        "source_page": "/probe",
        "notes": "standing probe, not a customer",
    })
    ok = False
    try:
        j = json.loads(body)
        ok = status == 200 and j.get("ok") is True and j.get("delivered") == "sample"
    except Exception:
        pass
    results.append(leg("sample_ok", ok, f"HTTP {status}, body {body.strip()[:80]}"))

    status, body = safe_call("GET", "/api/download")
    results.append(leg("download_no_token", status == 400 and "missing token" in body,
                       f"HTTP {status}, body {body.strip()[:60]}"))

    status, body = safe_call("GET", "/api/download?token=probe-bogus")
    results.append(leg("download_bad_token", status == 403 and "link expired or invalid" in body,
                       f"HTTP {status}, body {body.strip()[:60]}"))

    return results


def main():
    results = run()
    now = datetime.now(timezone.utc)
    stamp = now.strftime("%Y-%m-%d %H:%M UTC")
    passed = sum(1 for r in results if r["ok"])
    verdict = "PASS" if passed == len(results) else "FAIL"
    lines = [f"## {stamp}: {verdict} ({passed}/{len(results)} legs)"]
    for r in results:
        lines.append(f"- {'PASS' if r['ok'] else 'FAIL'} {r['leg']}: {r['detail']}")
    block = "\n".join(lines) + "\n"

    LOG.parent.mkdir(parents=True, exist_ok=True)
    if not LOG.exists():
        LOG.write_text("# Probe log: ParcelReady store function (KB 07-01)\n\n", encoding="utf-8")
    with LOG.open("a", encoding="utf-8") as f:
        f.write("\n" + block)

    if ENTRY.exists():
        text = ENTRY.read_text(encoding="utf-8")
        new_block = ("<!-- PROBE-LAST-RUN:START -->\n"
                     f"Last run: {stamp}. Result: {verdict} ({passed}/{len(results)} legs). "
                     f"Full log: probe-log.md in this folder.\n"
                     "<!-- PROBE-LAST-RUN:END -->")
        text = re.sub(r"<!-- PROBE-LAST-RUN:START -->.*?<!-- PROBE-LAST-RUN:END -->",
                      new_block, text, flags=re.S)
        ENTRY.write_text(text, encoding="utf-8")

    print(block)
    return 0 if verdict == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
