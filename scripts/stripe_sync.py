#!/usr/bin/env python3
"""Create Stripe products and prices from the ParcelReady pack registry.

SUPERSEDED Nov 23, 2026: the restricted key never reaches a workstation
(it lives only as a Worker secret), so this sync now runs server side in
worker/src/index.js (ensurePrice, same idempotent create-or-find rules,
no tax codes). This script remains as the payload-shape reference.

Reads ../catalog.json. For every pack with store.mode "stripe" it ensures a
Stripe Product (found by metadata pack_id) and a Price exist, then records
the ids back into catalog.json and ../store-registry.json.

Usage:
  python3 stripe_sync.py --dry-run   # print payloads, no key, no network
  STRIPE_SECRET_KEY=sk_... python3 stripe_sync.py   # live sync

Idempotent: rerunning finds the existing product and price and changes
nothing. Tax codes are deliberately NOT set; see STORE-ARCHITECTURE.md,
CPA flags. No key is ever read from a file or printed.
"""
import json
import os
import sys
import urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(ROOT)


def load_registry():
    with open(os.path.join(SITE, "catalog.json")) as f:
        return json.load(f)


def stripe_call(key, method, path, params=None):
    data = None
    if params:
        from urllib.parse import urlencode
        data = urlencode(params).encode()
    req = urllib.request.Request(
        f"https://api.stripe.com/v1/{path}", data=data, method=method,
        headers={"Authorization": f"Bearer {key}"})
    with urllib.request.urlopen(req) as r:
        return json.load(r)


def plan(pack):
    store = pack["store"]
    product = {
        "name": f"ParcelReady: {pack['title']}",
        "description": pack["tagline"] + ".",
        "metadata[pack_id]": pack["id"],
    }
    price = {
        "currency": "usd",
        "unit_amount": str(int(pack["price"]) * 100),
    }
    if store["billing"] == "subscription":
        price["recurring[interval]"] = "month"
    return product, price


def main():
    dry = "--dry-run" in sys.argv
    catalog = load_registry()
    targets = [p for p in catalog["packs"] if p["store"]["mode"] == "stripe"]
    skipped = [p["id"] for p in catalog["packs"] if p["store"]["mode"] != "stripe"]
    print(f"stripe mode packs: {len(targets)}; skipped (gumroad feeder): {len(skipped)}")
    if dry:
        for p in targets:
            product, price = plan(p)
            print(f"\nDRY RUN {p['id']}:")
            print("  product:", json.dumps(product))
            print("  price:  ", json.dumps(price))
        if not targets:
            print("No stripe mode packs yet. The 13 existing products are the "
                  "Gumroad feeder shelf; the first new metro pack flips the first row.")
        return
    key = os.environ.get("STRIPE_SECRET_KEY")
    if not key:
        print("STRIPE_SECRET_KEY not set. Aborting; nothing was called.")
        sys.exit(1)
    changed = False
    for p in targets:
        store = p["store"]
        if not store.get("stripe_product_id"):
            found = stripe_call(key, "GET",
                                f"products/search?query=metadata['pack_id']:'{p['id']}'")
            if found["data"]:
                store["stripe_product_id"] = found["data"][0]["id"]
            else:
                product, _ = plan(p)
                created = stripe_call(key, "POST", "products", product)
                store["stripe_product_id"] = created["id"]
            changed = True
        if not store.get("stripe_price_id"):
            _, price = plan(p)
            price["product"] = store["stripe_product_id"]
            created = stripe_call(key, "POST", "prices", price)
            store["stripe_price_id"] = created["id"]
            changed = True
        print(f"{p['id']}: product {store['stripe_product_id']} price {store['stripe_price_id']}")
    if changed:
        with open(os.path.join(SITE, "catalog.json"), "w") as f:
            json.dump(catalog, f, indent=1)
        print("catalog.json updated with Stripe ids. Rerun build.py to refresh store-registry.json.")


if __name__ == "__main__":
    main()
