#!/usr/bin/env python3
"""ParcelReady site builder.

Reads catalog.json (the source of truth) and generates:
  - packs/<id>.html for every pack (with breadcrumb, data-as-of date, and a
    viewable free sample explorer fed by the pack's sample_csv)
  - assets/catalog-data.js (window.CATALOG) for the browse and home pages
  - assets/data/<id>-sample.json for every pack that has a sample source
  - states/index.html, states/<state>/index.html, and
    states/<state>/<category>/index.html for all 50 states and the full
    category taxonomy (deep links per state and category, per Matt's spec)
  - sitemap.xml and robots.txt

Add a pack row to catalog.json and rerun this script. No redesign needed.
Copy rule: no em dashes in customer facing text.
"""
import csv
import json
import os
import re
from datetime import date

ROOT = os.path.dirname(os.path.abspath(__file__))
DP = os.path.expanduser("~/workspace/data-products")
LEAD = os.path.join(DP, "lead-packs")

with open(os.path.join(ROOT, "catalog.json")) as f:
    CATALOG = json.load(f)

STATES = [
    ("Alabama", "AL"), ("Alaska", "AK"), ("Arizona", "AZ"), ("Arkansas", "AR"),
    ("California", "CA"), ("Colorado", "CO"), ("Connecticut", "CT"), ("Delaware", "DE"),
    ("Florida", "FL"), ("Georgia", "GA"), ("Hawaii", "HI"), ("Idaho", "ID"),
    ("Illinois", "IL"), ("Indiana", "IN"), ("Iowa", "IA"), ("Kansas", "KS"),
    ("Kentucky", "KY"), ("Louisiana", "LA"), ("Maine", "ME"), ("Maryland", "MD"),
    ("Massachusetts", "MA"), ("Michigan", "MI"), ("Minnesota", "MN"), ("Mississippi", "MS"),
    ("Missouri", "MO"), ("Montana", "MT"), ("Nebraska", "NE"), ("Nevada", "NV"),
    ("New Hampshire", "NH"), ("New Jersey", "NJ"), ("New Mexico", "NM"), ("New York", "NY"),
    ("North Carolina", "NC"), ("North Dakota", "ND"), ("Ohio", "OH"), ("Oklahoma", "OK"),
    ("Oregon", "OR"), ("Pennsylvania", "PA"), ("Rhode Island", "RI"), ("South Carolina", "SC"),
    ("South Dakota", "SD"), ("Tennessee", "TN"), ("Texas", "TX"), ("Utah", "UT"),
    ("Vermont", "VT"), ("Virginia", "VA"), ("Washington", "WA"), ("West Virginia", "WV"),
    ("Wisconsin", "WI"), ("Wyoming", "WY"),
]
CATEGORIES = [
    "Real Estate", "Construction", "Land", "HVAC", "Plumbing", "Electrical",
    "Roofing", "Pools", "Lawn Care and Landscaping", "Concrete",
    "Garage Door Repair", "Masonry",
]
TRADE_SAMPLE_CSVS = {
    "houston-hvac": os.path.join(LEAD, "houston-hvac", "houston-hvac-sample-2026-11-16.csv"),
    "austin-sa-roofing": os.path.join(LEAD, "austin-sa-roofing", "austin-sa-roofing-sample-2026-11-16.csv"),
}
TRADE_COLS = ["Business name", "City", "Published email", "Phone", "Contact form present", "Rating", "Review count", "Gap flags"]
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
BASE = "https://parcelreadydata.com"


def esc(s):
    import html as H
    return H.escape(str(s), quote=True)


def slug(name):
    return name.lower().replace(" ", "-")


def money(p):
    return "Free" if p == 0 else f"${p}"


def fmt_date(iso):
    y, m, d = (int(x) for x in iso.split("-"))
    return f"{MONTHS[m - 1]} {d}, {y}"


def state_name(code):
    return dict((c, n) for n, c in STATES)[code]


def chrome(prefix, title, description):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(title)}</title>
<meta name="description" content="{esc(description)}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:type" content="website">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;900&family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{prefix}assets/site.css">
<link rel="icon" href="{prefix}assets/img/logo.webp">
</head>
<body>
<header class="topbar">
  <a class="brand" href="{prefix}index.html"><img src="{prefix}assets/img/logo.webp" alt="ParcelReady logo"><span>ParcelReady</span></a>
  <nav>
    <a href="{prefix}catalog.html">Catalog</a>
    <a href="{prefix}states/index.html">States</a>
    <a href="{prefix}verify.html">How we verify</a>
    <a href="{prefix}terms.html">Terms</a>
    <a href="{prefix}privacy.html">Privacy</a>
    <a href="{prefix}sample.html" class="nav-cta">Get a free sample</a>
  </nav>
</header>
"""


def footer(prefix):
    return f"""
<footer>
  <div class="wrap foot-grid">
    <div><strong>ParcelReady</strong><br>Clean, ready to use datasets from public records. Every product lists its source, its build date, and its limits on the label.</div>
    <div><a href="{prefix}catalog.html">Catalog</a><br><a href="{prefix}states/index.html">Browse by state</a><br><a href="{prefix}verify.html">How we verify</a><br><a href="{prefix}sample.html">Free samples</a><br><a href="{prefix}terms.html">Terms</a><br><a href="{prefix}privacy.html">Privacy</a></div>
    <div>Questions: <a href="mailto:hello@parcelreadydata.com">hello@parcelreadydata.com</a><br>Store: <a href="https://parcelready.gumroad.com" target="_blank" rel="noopener">parcelready.gumroad.com</a></div>
  </div>
</footer>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<script data-goatcounter="https://parcelready.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>
<script src="{prefix}assets/site.js"></script>
</body>
</html>
"""


def card_grid(packs, prefix):
    """Beauty spec B5: two card sizes. The flagship pack of each hub
    (largest count, newest pull on a tie) renders as a wide card;
    the rest keep the standard card."""
    if not packs:
        return ""
    flagship = max(packs, key=lambda p: (p.get("rows") or 0, p["data_as_of"]))
    out = []
    for p in packs:
        out.append(card(p, prefix, wide=(p is flagship)))
    return "".join(out)


def card(p, prefix, wide=False):
    asof = fmt_date(p["data_as_of"])
    return f"""<article class="card{' card-wide' if wide else ''}">
      <a href="{prefix}packs/{p['id']}.html"><img src="{prefix}{p['cover']}" alt="{esc(p['title'])} data preview cover" loading="lazy"></a>
      <div class="card-body">
        <p class="meta">{esc(state_name(p['state']))} · {esc(p['category'])}</p>
        <h3>{esc(p['title'])}</h3>
        <p class="tagline">{esc(p['tagline'])}</p>
        {('<p class="card-diff">' + esc(p['diff_line']) + '</p>') if p.get('diff_line') else ''}
        <p class="asof">Data as of {asof}<br>{esc(p['refresh_schedule'])}</p>
        <div class="rowline"><span class="rows">{esc(p['rows_label'])}</span><span class="price">{money(p['price'])} <small>{esc(p['price_note'])}</small></span></div>
        <div class="card-links"><a href="{prefix}packs/{p['id']}.html">See what is inside</a><a href="{prefix}packs/{p['id']}.html#sample">Free sample</a></div>
      </div>
    </article>"""


# ---------------- sample data ----------------

def full_file_path(p):
    delivery = (p.get("store") or {}).get("delivery_file") or ""
    if not delivery:
        return None
    first = delivery.split(" + ")[0].strip()
    return os.path.join(DP, first)


def _spread(rs, n):
    if n <= 0 or not rs:
        return []
    step = max(1, len(rs) // n)
    return rs[::step][:n]


def _interleave(a, b):
    out, ia, ib = [], 0, 0
    total = len(a) + len(b)
    for i in range(total):
        if ia < len(a) and (i + 1) * len(a) // total > i * len(a) // total:
            out.append(a[ia]); ia += 1
        elif ib < len(b):
            out.append(b[ib]); ib += 1
        elif ia < len(a):
            out.append(a[ia]); ia += 1
    return out


def _stratified_pick(rows, n, fields):
    """Pick n rows from rows so the share carrying fields[0] matches
    the share in rows as closely as n allows, spread evenly within
    each stratum and interleaved. Each stratum's pick recurses on
    the remaining fields, so correlated fields track too: in the
    trade files a single-field draw on email dragged rating over 20
    points high, and a two-field draw caught two of the file's only
    three website-less rows."""
    if n <= 0 or not rows:
        return []
    if not fields:
        return _spread(rows, n)
    field = fields[0]
    have = [r for r in rows if (r.get(field) or "").strip()]
    have_not = [r for r in rows if not (r.get(field) or "").strip()]
    k = round(len(have) / len(rows) * n)
    k = max(0, min(n, k, len(have)))
    rest = n - k
    if rest > len(have_not):
        k += rest - len(have_not)
        rest = len(have_not)
    a = _stratified_pick(have, k, fields[1:])
    b = _stratified_pick(have_not, rest, fields[1:])
    return _interleave(a, b)


LEAD_FIELDS = ["Published email", "Phone", "Rating", "Review count"]


def _window_fix(draw, full):
    """Relay's A2 window rule (Nov 24, 2026): the first 5 rows of the
    preview are tested as their own window (tolerance the larger of
    10 points or one row's weight there, 20 points). If a lead field
    misses in the window, swap the earliest window row lacking the
    field with the nearest later draw row carrying it. Swaps change
    only order, never the draw's own rates. Bounded and checked
    after every swap; deterministic."""
    def rate(rs, f):
        return 100.0 * sum(1 for r in rs if (r.get(f) or "").strip()) / len(rs) if rs else 0.0
    tol = max(10.0, 100.0 / 5)
    for _ in range(10):
        bad = None
        for f in LEAD_FIELDS:
            if abs(rate(draw[:5], f) - rate(full, f)) > tol:
                bad = f
                break
        if bad is None:
            return draw
        swap_in = next((i for i in range(5, len(draw)) if (draw[i].get(bad) or "").strip()), None)
        swap_out = next((i for i in range(4, -1, -1) if not (draw[i].get(bad) or "").strip()), None)
        if swap_in is None or swap_out is None:
            return draw
        draw[swap_out], draw[swap_in] = draw[swap_in], draw[swap_out]
    return draw


def representative_draw(rows, target):
    """A2 (HQ ruling, Nov 24, 2026, on Relay's fill-rate facts): a
    trade sample whose lead-field fill rates match the full file's
    true rates as closely as the sample size allows, in the whole
    draw and in the first-5 window, under Relay's named tolerance
    (the larger of 10 points or one row's weight). Deterministic,
    so builds are reproducible and Relay's representativeness check
    can re-derive the same draw."""
    draw = _stratified_pick(rows, target,
                            ["Published email", "Rating", "Review count", "Website"])
    return _window_fix(draw, rows)


def write_sample_json():
    """The free sample is a fixed percentage of the full file (Matt's ruling,
    Nov 22, 2026). County samples draw systematically (every Nth row);
    trade samples draw representatively under A2 (see above). Emits
    the explorer JSON (first 500 sample rows) and the delivery CSV
    (the full sample) staged for R2 under delivery/samples/."""
    pct = CATALOG.get("sample_percent", 10)
    step = max(1, round(100 / pct))
    os.makedirs(os.path.join(ROOT, "assets", "data"), exist_ok=True)
    os.makedirs(os.path.join(ROOT, "delivery", "samples"), exist_ok=True)
    counts = {}
    for p in CATALOG["packs"]:
        path = full_file_path(p)
        if not path or not os.path.exists(path):
            continue
        with open(path, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            headers = reader.fieldnames
            all_rows = list(reader)
        target = max(15, min(50, round(len(all_rows) * pct / 100)))
        if p["family"] == "trade":
            delivered = representative_draw(all_rows, target)
            def _rate(rs, f):
                return 100.0 * sum(1 for r in rs if (r.get(f) or "").strip()) / len(rs) if rs else 0.0
            print(f"A2 DRAW {p['id']}: email file {_rate(all_rows, 'Published email'):.1f}% "
                  f"sample {_rate(delivered, 'Published email'):.1f}% | "
                  f"rating file {_rate(all_rows, 'Rating'):.1f}% sample {_rate(delivered, 'Rating'):.1f}% | "
                  f"reviews file {_rate(all_rows, 'Review count'):.1f}% sample {_rate(delivered, 'Review count'):.1f}% | "
                  f"first5 email {_rate(delivered[:5], 'Published email'):.1f}% rating {_rate(delivered[:5], 'Rating'):.1f}% "
                  f"reviews {_rate(delivered[:5], 'Review count'):.1f}%")
        else:
            dstep = max(1, len(all_rows) // target)
            delivered = all_rows[::dstep][:target]
        kind = "trade" if p["family"] == "trade" else "county"
        cols = [c for c in TRADE_COLS if c in headers] if kind == "trade" else headers
        if len(cols) < 4:
            cols = headers
        # The on-page preview IS the delivered sample (Beacon fix
        # spec 11): one draw, one count, so the preview can never
        # disagree with the file the buyer receives. The page shows
        # the first 25 of those rows.
        draw = list(delivered)
        ts = p.get("teaser_sort")
        if ts:
            col = ts["column"]
            def _key(r, col=col):
                try:
                    return float(str(r.get(col) or "").replace(",", "").replace("$", ""))
                except ValueError:
                    return 0.0
            draw.sort(key=_key, reverse=bool(ts.get("desc", True)))
        teaser = []
        for r in draw[:25]:
            row = {c: (r.get(c) or "") for c in cols}
            if kind == "trade":
                # Proof surface, not a delivery surface (Matt's ruling,
                # Nov 23, 2026): contact values never ship in the page
                # data. Presence is shown; the values travel only in
                # the delivered sample file.
                if "Published email" in row:
                    row["Published email"] = "Published" if row["Published email"] else ""
                if "Phone" in row:
                    row["Phone"] = "Listed" if row["Phone"] else ""
            else:
                # County packs mask under the same standard (HQ
                # ruling, Nov 23, 2026, Beacon fix spec 6): the owner
                # name and the mailing street address never ship in
                # the page data. Mailing city, state, and ZIP stay
                # visible so the geography stays checkable, and the
                # property side stays in full.
                for c in ("Owner Name", "Owner Mailing Address"):
                    if c in row and row[c]:
                        row[c] = "Masked"
            teaser.append(row)
        out = os.path.join(ROOT, "assets", "data", p["id"] + "-sample.json")
        with open(out, "w") as f:
            json.dump({"columns": cols,
                       "rows": teaser,
                       "kind": kind, "masked": True,
                       "sample_total": len(delivered),
                       "delivered_total": len(delivered),
                       "full_total": p["rows"] if isinstance(p["rows"], int) else len(all_rows),
                       "sample_percent": pct}, f)
        with open(os.path.join(ROOT, "delivery", "samples", p["id"] + "-sample.csv"), "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=headers)
            w.writeheader()
            w.writerows(delivered)
        counts[p["id"]] = (len(delivered), len(all_rows))
    return counts


# ---------------- pack pages ----------------

SAMPLE_COUNTS = {}


# Comparison strip constants (beauty spec, ranked item 5; Matt's
# generation rule, Nov 23, 2026). Theirs figures are sourced from
# Signal's competitor dossier of November 22, 2026 and must be
# re-verified whenever the dossier refreshes; a buyer class whose
# figure has not been re-verified does not render (fail closed).
COMPARE = {
    "as_of": "November 22, 2026",
    "county": {
        "theirs": "$1,018",
        "basis": ("PropertyRadar entry plan with dialer, worked first campaign "
                  "(the mail only figure is $919), figures as of November 22, 2026."),
    },
    "trade": {
        "theirs": "$699 or more, metered by the month",
        "basis": ("PropStream at $99 a month plus 12 cents a trace and $5 a document, "
                  "worked first campaign $699 to $789, figures as of November 22, 2026."),
    },
}


def compare_strip(p):
    """The generated comparison strip. Fail closed: no strip when the
    pack has no one-time price (free packs, subscription products)."""
    price = p.get("price") or 0
    if (not price or "/month" in (p.get("price_note") or "")
            or "per month" in (p.get("price_note") or "")
            or (p.get("store") or {}).get("billing") == "subscription"):
        return ""
    cls = "trade" if p["family"] == "trade" else "county"
    c = COMPARE[cls]
    ours = money(price)
    return f"""
<section class="compare-strip"><div class="wrap compare-grid">
  <p class="compare-line">You could pay {c['theirs']} to rent a list from one of our competitors. <strong>Or <span class="compare-price">{ours}</span> to own the data from us.</strong></p>
  <p class="compare-support">{c['basis']} Ours: one time, tax included, pull date on the label, nothing to cancel.</p>
</div></section>"""


def label_source(p):
    sl = p.get("source_line")
    if sl:
        s = sl.removeprefix("Source: ")
        for cut in (",", ". "):
            if cut in s:
                s = s.split(cut)[0]
        return s.rstrip(".")
    return "Each business's own website and listings, checked by hand"


_COVERAGE = {}


def trade_coverage(p):
    """(phone, published email, website) fill rates in whole percent,
    computed from the pack's delivered full file. Cached per build."""
    if p["id"] in _COVERAGE:
        return _COVERAGE[p["id"]]
    rates = None
    path = full_file_path(p)
    if path and os.path.exists(path):
        with open(path, newline="", encoding="utf-8-sig") as f:
            rows = list(csv.DictReader(f))
        if rows:
            def rate(field):
                return round(100 * sum(1 for r in rows if (r.get(field) or "").strip()) / len(rows))
            rates = (rate("Phone"), rate("Published email"), rate("Website"))
    _COVERAGE[p["id"]] = rates
    return rates


def label_plate(p):
    """Beauty spec B2: the Label, a designed specimen tag that
    replaces the loose stat strip as the pack page's anchor."""
    fields = [
        ("Pack", p["title"]),
        ("Source", label_source(p)),
        ("Pull date", fmt_date(p["data_as_of"])),
        ("Rows", p["rows_label"]),
    ]
    if p["family"] == "trade":
        # A2 (HQ ruling, Nov 24, 2026): the Label carries the pack's
        # true lead-field coverage, computed from the delivered file
        # at build time so the printed rates can never drift.
        cov = trade_coverage(p)
        if cov:
            fields.append(("Coverage",
                           f"Phone on {cov[0]}% · Published email on {cov[1]}% · Website on {cov[2]}%"))
    for s in p["stats"]:
        if "match" in s["k"].lower():
            fields.append(("Match rate", s["v"]))
    fields.append(("Refresh", p["refresh_schedule"]))
    fields.append(("Price", f"{money(p['price'])} {esc(p['price_note'])}".strip()))
    cleared = ("Contact details as published by each business."
               if p["family"] == "trade"
               else "Public record, as published by the source above.")
    fields.append(("Cleared for", cleared))
    rows_html = "".join(
        f'<div class="label-field"><span class="label-k">{esc(k)}</span>'
        f'<span class="label-v">{esc(v)}</span></div>' for k, v in fields)
    count = f"{p['rows']:,}" if isinstance(p.get("rows"), int) else esc(p["rows_label"])
    return f"""
<section class="label-band"><div class="wrap">
  <div class="label-plate">
    <div class="label-fields">{rows_html}</div>
    <div class="label-seal"><span class="seal-count">{count}</span><span class="seal-word">Verified</span></div>
    <p class="label-promise">The <a href="../terms.html#label-promise">label promise</a>: if this pack does not match what this page promises, tell us within 30 days and we will fix it or refund the pack.</p>
  </div>
</div></section>"""


def mini_preview(p):
    """Beauty spec B3: a compact live preview in the first screen,
    beside the buy block. Five masked rows drawn from the same teaser
    data as the full preview below; the full table stays lower."""
    path = os.path.join(ROOT, "assets", "data", f"{p['id']}-sample.json")
    if not os.path.exists(path):
        return ""
    try:
        d = json.load(open(path))
    except Exception:
        return ""
    cols_all = d["columns"]
    if p["family"] == "trade":
        want = ["Business name", "City", "Phone", "Published email"]
    else:
        want = ["Owner Name", "Property Address", "Property City"]
        val = next((c for c in cols_all if "Market Value" in c or "Total Amount Due" in c), None)
        if val:
            want.append(val)
    cols = [c for c in want if c in cols_all] or cols_all[:4]

    def cell(c, v):
        v = "" if v is None else str(v)
        if ("Market Value" in c or "Total Amount Due" in c) and v.replace(",", "").isdigit():
            return "$" + f"{int(v.replace(',', '')):,}"
        return v

    head = "".join(f"<th>{esc(c)}</th>" for c in cols)
    body = "".join(
        "<tr>" + "".join(f"<td>{esc(cell(c, r.get(c, '')))}</td>" for c in cols) + "</tr>"
        for r in d["rows"][:5])
    total = d.get("sample_total", len(d["rows"]))
    return f"""
      <div class="mini-preview">
        <p class="mini-head"><span>Live preview · first 5 rows</span><span>{total} preview rows in all</span></p>
        <table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>
        <p class="mini-foot">Real rows from this pack, contact details masked on screen. <a href="#sample">See the full preview below</a>; the delivered sample carries every field.</p>
      </div>"""


def fact_band(p, used):
    """Beauty spec B7: a quiet band where one fact sits large. Picks
    the pack's most display-worthy unused stat (a money figure first,
    then a percentage) and sets it at display size in mono."""
    stats = p["stats"]
    def pick(pred):
        for s in stats:
            if id(s) not in used and pred(s):
                used.add(id(s))
                return s
        return None
    s = pick(lambda s: "$" in s["v"]) or pick(lambda s: "%" in s["v"]) or pick(lambda s: True)
    if not s:
        return ""
    return f"""
<section class="fact-band"><div class="wrap">
  <p class="fact-v">{esc(s['v'])}</p>
  <p class="fact-k">{esc(s['k'])} · {esc(p['title'])}</p>
</div></section>"""


def sample_section(p):
    if p["id"] not in SAMPLE_COUNTS:
        # B8 (deployed Nov 23, 2026): the Free Sample Pack delivers
        # through the site's own flow as an Excel workbook, one sheet
        # per paid list. No Gumroad hop from site pages (spec 12).
        return f"""
    <section class="preview" id="sample">
      <div class="wrap">
        <p class="kicker">The free sample</p>
        <h2>This pack is the sample</h2>
        <p class="explorer-sub">The Free Sample Pack is itself the free product: one Excel workbook with a sheet for every paid list in the store, each sheet carrying that list's exact columns and real rows, 100 records in all. Enter your email and the workbook lands in your inbox.</p>
        <form class="capture" data-capture>
          <input type="hidden" name="pack_id" value="{p['id']}">
          <input type="hidden" name="request_kind" value="pack_sample">
          <label>Business name<input type="text" name="business_name" autocomplete="organization" placeholder="Your business"></label>
          <label>Email for the sample file<input type="email" name="email" required autocomplete="email" placeholder="you@yourbusiness.com"></label>
          <button class="btn btn-gold" type="submit">Email me the free sample pack</button>
          <p class="capture-status" role="status"></p>
        </form>
      </div>
    </section>"""
    kind = "trade" if p["family"] == "trade" else "county"
    noun = "rows" if kind == "trade" else "sample records"
    return f"""
    <section class="preview reveal" id="sample">
      <div class="wrap">
        <p class="kicker">Free sample, viewable right here</p>
        <h2>Inspect the data before you spend a dollar</h2>
        <p class="explorer-sub">What you see here is the proof surface: real rows {"drawn to represent the full file, so the coverage you see matches the coverage the file carries (the true rates are printed on the label)" if kind == "trade" else "drawn evenly from the full file"}, real counts, and the same fields the pack carries, with contact details masked on screen. The free sample file itself, {CATALOG.get("sample_percent", 10)} percent of the full file (15 rows at minimum, 50 at most, the same rule on every pack in the catalog), carries every field exactly as it ships, and it is delivered by email below. Inspect the structure and the counts here; the usable file comes by email.</p>
        <div class="explorer-frame">
          <p class="explorer-frame-head"><span>LIVE PREVIEW · {esc(p['title'].upper())}</span><span>PULLED {esc(fmt_date(p['data_as_of']).upper())}{' · CONTACT DETAILS MASKED' if kind == 'trade' else ''}</span></p>
          <div class="explorer" data-explorer="../assets/data/{p['id']}-sample.json"></div>
        </div>
        <p class="fineprint">Preview rows shown with contact details masked: phone and email on trade packs, owner name and mailing street address on county packs. Mailing city, state, and ZIP stay visible so the geography stays checkable. A blank field means it could not be verified. It is never guessed. The delivered sample carries every value.</p>
        <form class="capture" data-capture>
          <input type="hidden" name="pack_id" value="{p['id']}">
          <label>Business name<input type="text" name="business_name" autocomplete="organization" placeholder="Your business"></label>
          <label>Email for the sample file<input type="email" name="email" required autocomplete="email" placeholder="you@yourbusiness.com"></label>
          <button class="btn btn-gold" type="submit">Email me the free sample</button>
          <p class="capture-status" role="status"></p>
        </form>
      </div>
    </section>"""


def buy_button(p):
    if not p.get("price"):
        # The free pack's action is its own sample capture (B8).
        return '<a class="btn btn-gold" href="#sample">Get the free sample pack</a>'
    if p.get("store", {}).get("mode") == "stripe":
        return (f'<button class="btn btn-gold" type="button" data-checkout="{p["id"]}">'
                f'Buy the full pack, {money(p["price"])} <span class="price-note">{esc(p["price_note"])}</span></button>')
    return (f'<a class="btn btn-gold" href="{esc(p["buy_url"])}" target="_blank" rel="noopener">'
            f'Buy the full pack, {money(p["price"])} <span class="price-note">{esc(p["price_note"])}</span></a>')


def write_store_registry():
    packs = []
    for p in CATALOG["packs"]:
        store = p.get("store", {})
        delivery = store.get("delivery_file") or ""
        file_key = "packs/" + delivery.split(" + ")[0].split("/")[-1] if delivery else None
        sample_key = f"samples/{p['id']}-sample.csv" if delivery else None
        if p["id"] == "free-sample-pack":
            # B8: the sampler delivers as one XLSX workbook (a sheet
            # per paid list); the function serves that key as XLSX.
            sample_key = "samples/free-sample-pack-sample.xlsx"
        amt, interval, count = p["price"], "month", 1
        if store.get("billing") == "subscription" and p.get("membership"):
            amt = p["membership"]["price"]
            if p["membership"]["per"] == "quarter":
                interval, count = "month", 3
        packs.append({
            "id": p["id"], "title": p["title"],
            "store": {"mode": store.get("mode", "gumroad"),
                      "billing": store.get("billing", "one_time"),
                      "stripe_price_id": store.get("stripe_price_id")},
            "price_cents": int(round(amt * 100)),
            "interval": interval, "interval_count": count,
            "file_key": file_key, "sample_file_key": sample_key,
            "one_time_cents": int(round(p["one_time_price"] * 100)) if p.get("one_time_price") else None,
        })
    out = os.path.join(ROOT, "worker", "store-registry.json")
    with open(out, "w") as f:
        json.dump({"packs": packs}, f, indent=1)
    out2 = os.path.join(ROOT, "supabase", "store-registry.json")
    os.makedirs(os.path.dirname(out2), exist_ok=True)
    with open(out2, "w") as f:
        json.dump({"packs": packs}, f, indent=1)
    return len(packs)


def metro_link(p):
    mid = p.get("metro_id")
    if not mid:
        return ""
    m = CATALOG["metros"][mid]
    return (f', in the <a href="../states/{slug(state_name(p["state"]))}/metros/{m["slug"]}/index.html" '
            f'style="color:var(--gold-soft)">{esc(m["name"])} metro</a>')


def pricing_block(p):
    m = p.get("membership")
    if not m:
        return ""
    if (p.get("store") or {}).get("billing") == "subscription":
        frame = (f"A fresh snapshot costs {money(p['price'])} each time you pull it. Members hold the current "
                 f"file automatically, delivered on every refresh.")
        # Spec 13 (HQ, Nov 23, 2026): a true one-time SKU beside the
        # subscription, labeled as the current pull only; the weekly
        # refreshes ride the subscription, stated plainly on the card.
        onetime = ""
        # The card renders only once the function build carrying the
        # one-time checkout is deployed (catalog flag one_time_live);
        # before that, a click would land on the subscription price,
        # which is exactly the mislabeling spec 13 forbids.
        if p.get("one_time_price") and p.get("one_time_live"):
            onetime = f"""
      <article class="offer-card">
        <p class="meta">The current pull only</p>
        <p class="offer-price">{money(p['one_time_price'])} <small>one time</small></p>
        <p>This pull of the file, exactly as it stands today. Data as of {fmt_date(p['data_as_of'])}.</p>
        <p class="stepup">The weekly refreshes ride the subscription. This one-time file does not refresh.</p>
        <button class="btn btn-dark" data-checkout="{p['id']}" data-variant="one_time">Buy the current pull: {money(p['one_time_price'])}</button>
        <p class="fineprint">Sold and delivered on this site.</p>
      </article>"""
        return f"""
<section class="pricing-offers">
  <div class="wrap">
    <h2>The current file, delivered on every refresh</h2>
    <div class="offer-grid">
      <article class="offer-card offer-member">
        <p class="meta">Stay current: membership</p>
        <p class="offer-price">{money(m['price'])} <small>per {m['per']}</small></p>
        <p>{frame}</p>
        <p class="stepup">{esc(p['refresh_schedule'])}.</p>
        {buy_button(p)}
        <p class="fineprint">Sold and delivered on this site.</p>
      </article>{onetime}
    </div>
  </div>
</section>"""
    price = p["price"]
    # HQ ruling (Nov 23, 2026, from Beacon's site assessment):
    # membership is not purchasable yet, so the block carries no
    # membership price and no "Two ways to buy" heading; it reads
    # join-the-list only until membership checkout actually opens.
    frame = ("Membership will deliver every refresh to your inbox automatically, so the file "
             "you work from is never the stale one. It is not on sale yet.")
    card_b_cta = (f'<a class="btn btn-ghost" href="../sample.html?state={esc(state_name(p["state"]))}&trade={esc(p["category"])}">Join the follow up list</a>')
    card_b_note = "Membership checkout for this pack opens on the store next; the follow up list hears first."
    return f"""
<section class="pricing-offers">
  <div class="wrap">
    <h2>The full dataset</h2>
    <div class="offer-grid">
      <article class="offer-card">
        <p class="meta">The full dataset</p>
        <p class="offer-price">{money(price)} <small>one time</small></p>
        <p>{esc(p['rows_label'])}, data as of {fmt_date(p['data_as_of'])}. Yours as of the pull you buy; a one time file does not update itself, and we say so plainly.</p>
        <p class="stepup">{esc(p['refresh_schedule'])}.</p>
        {buy_button(p)}
      </article>
      <article class="offer-card offer-member">
        <p class="meta">Stay current: membership</p>
        <p>{frame}</p>
        {card_b_cta}
        <p class="fineprint">{card_b_note}</p>
      </article>
    </div>
  </div>
</section>"""


def build_pack(p):
    prefix = "../"
    used_stats = set()
    stats = "".join(
        f'<div class="stat"><span class="stat-v">{esc(s["v"])}</span><span class="stat-k">{esc(s["k"])}</span></div>'
        for s in p["stats"]
    )
    inside = "".join(f"<li>{esc(i)}</li>" for i in p["inside"])
    fresh = f"Data as of {fmt_date(p['data_as_of'])}. {esc(p['refresh_schedule'])}."
    page = chrome(prefix, f"{p['title']}: ParcelReady",
                  f"{p['tagline']}. {p['rows_label']}. Data as of {fmt_date(p['data_as_of'])}. Free sample viewable on the page.") + f"""
<nav class="crumbs wrap" aria-label="Breadcrumb">
  <a href="../catalog.html">Catalog</a> <span>/</span>
  <a href="../states/{slug(state_name(p['state']))}/index.html">{esc(state_name(p['state']))}</a> <span>/</span>
  <a href="../states/{slug(state_name(p['state']))}/{slug(p['category'])}/index.html">{esc(p['category'])}</a> <span>/</span>
  <span class="crumb-here">{esc(p['title'])}</span>
</nav>
<section class="pack-hero">
  <div class="wrap pack-hero-grid">
    <div>
      <p class="kicker">{'Trade lead pack' if p['family'] == 'trade' else 'County records pack'} · {esc(p['metro'])} · {esc(p['trade'])}</p>
      <h1>{esc(p['title'])}</h1>
      <p class="lede">{esc(p['tagline'])}.</p>
      {('<p class="buyer-line">' + esc(p['diff_line']) + '</p>') if p.get('diff_line') else ''}
      <p class="the-line">We do the work. You get the leads.</p>
      <p class="buyer-line">Built for: {esc(p['buyer'])}.</p>
      <p class="buyer-line">Coverage: {esc(p['coverage'])}{metro_link(p)}.</p>
      <div class="pack-actions">
        {buy_button(p)}
        <a class="btn btn-ghost" href="#sample">{esc(p['sample_label'])}</a>
      </div>
      <p class="fineprint">{fresh} {'Sold and delivered through Gumroad.' if p.get("store", {}).get("mode") == "gumroad" else 'Sold and delivered on this site.'}</p>
      {('<p class="fineprint">' + esc(p['source_line']) + '</p>') if p.get('source_line') else ''}
      {mini_preview(p)}
    </div>
    <figure class="pack-cover reveal"><img src="../{p['cover']}" alt="{esc(p['title'])} data preview cover"></figure>
  </div>
</section>
{label_plate(p)}
<section class="inside">
  <div class="wrap inside-grid">
    <div class="reveal">
      <h2>{'Every row, checked by hand' if p['family'] == 'trade' else 'Every row, built from the official source'}</h2>
      <ul class="inside-list">{inside}</ul>
    </div>
    <aside class="limits reveal">
      <p class="kicker">Honest limits</p>
      <p>{esc(p['limits'])}</p>
      <div class="pack-actions"><a class="btn btn-gold" href="#sample">Start with the free sample</a></div>
    </aside>
  </div>
</section>
{fact_band(p, used_stats)}
{pricing_block(p)}
{compare_strip(p)}
{fact_band(p, used_stats)}
{sample_section(p)}
<section class="cta-band">
  <div class="wrap">
    <h2>Need {esc(p['category'])} data for another state?</h2>
    <p>The catalog is building state by state. Tell us the state and the category, and sample requests shape the build order.</p>
    <a class="btn btn-gold" href="../sample.html?state={esc(state_name(p['state']))}&trade={esc(p['category'])}">Request a free sample</a>
    <a class="btn btn-ghost" href="../states/{slug(state_name(p['state']))}/index.html">More {esc(state_name(p['state']))} data</a>
  </div>
</section>
""" + footer(prefix)
    out = os.path.join(ROOT, "packs", p["id"] + ".html")
    with open(out, "w") as f:
        f.write(page)
    return f"packs/{p['id']}.html"


# ---------------- state pages ----------------

def packs_in(state_code, category=None):
    return [p for p in CATALOG["packs"]
            if p["state"] == state_code and (category is None or p["category"] == category)]


def soon_in(state_code, category=None):
    out = []
    for cs in CATALOG.get("coming_soon", []):
        if state_code not in cs.get("states", []):
            continue
        cat = cs["trade"] if cs["family"] == "trade" else "Real Estate"
        if cs["trade"] == "Absentee Land Owners, pilot":
            cat = "Land"
        if category is None or cat == category:
            out.append((cs, cat))
    return out


def build_metro_hubs(urls):
    for mid, m in CATALOG.get("metros", {}).items():
        prefix = "../../../../"
        sslug = slug(state_name(m["state"]))
        packs = [p for p in CATALOG["packs"] if p.get("metro_id") == mid]
        cards = card_grid(packs, prefix)
        cats = sorted({p["category"] for p in packs})
        cat_links = "".join(
            f'<a class="chip" href="../../{slug(c)}/index.html">{c}</a>' for c in cats)
        page = chrome(prefix, f"{m['name']} Data Packs: ParcelReady",
                      f"ParcelReady data packs for the {m['name']} metro: {m['coverage']}. Verified packs with free samples, exact pull dates, and refresh schedules.") + f"""
<nav class="crumbs wrap" aria-label="Breadcrumb"><a href="../../../../states/index.html">States</a> <span>/</span> <a href="../../index.html">{esc(state_name(m['state']))}</a> <span>/</span> <span class="crumb-here">{esc(m['name'])}</span></nav>
<section style="padding-bottom:1rem">
  <div class="wrap">
    <p class="kicker">Metro catalog</p>
    <h1 style="font-size:clamp(2.2rem,5vw,3.6rem)">{esc(m['name'])}</h1>
    <p class="lede" style="margin-top:1rem">A metro here means the area the way buyers actually work it, not one county line. {esc(m['name'])} covers {esc(m['coverage'])}. {len(packs)} pack{'s' if len(packs) != 1 else ''} live for this metro today.</p>
    <p style="margin-top:0.8rem">Membership is sold by metro: members hold the current file on every refresh. The {esc(state_name(m['state']))} state tier, carrying every metro in the state, is the step up.</p>
  </div>
</section>
<section style="padding-top:1rem">
  <div class="wrap">
    <div class="card-grid">{cards}</div>
    <h2 style="margin-top:3rem;font-size:1.4rem">Categories live in this metro</h2>
    <div class="filters">{cat_links}</div>
    <div class="pack-actions" style="margin-top:2rem">
      <a class="btn btn-gold" href="../../../../sample.html?state={esc(state_name(m['state']))}">Request a free {esc(m['name'])} sample</a>
      <a class="btn btn-ghost" href="../../index.html">All of {esc(state_name(m['state']))}</a>
    </div>
  </div>
</section>
""" + footer(prefix)
        d = os.path.join(ROOT, "states", sslug, "metros", m["slug"])
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "index.html"), "w") as f:
            f.write(page)
        urls.append(f"states/{sslug}/metros/{m['slug']}/")


def build_states_index(urls):
    prefix = "../"
    tiles = ""
    for name, code in STATES:
        live = packs_in(code)
        soon = soon_in(code)
        if live:
            label = f"{len(live)} pack{'s' if len(live) != 1 else ''} live"
            cls = "status-pill status-live"
        elif soon:
            label = "In production"
            cls = "status-pill"
        else:
            label = "Request a sample"
            cls = "status-pill dim"
        tiles += f'<a class="state-tile" href="{slug(name)}/index.html"><span class="state-name">{name}</span><span class="{cls}">{label}</span></a>\n'
    page = chrome(prefix, "Browse Data by State: ParcelReady",
                  "Every ParcelReady data pack, organized state first. Pick a state, then a category, and walk straight to the pack, its free sample, and its data as of date.") + f"""
<section>
  <div class="wrap">
    <p class="kicker">State first</p>
    <h1 style="font-size:clamp(2.2rem,5vw,3.8rem)">Browse by state</h1>
    <p class="lede" style="margin-top:1.2rem">Pick a state to see every data pack we hold for it, live and in production, organized by category. Texas is live today; the build is moving state by state, and sample requests shape the order.</p>
    <div class="state-grid">{tiles}</div>
  </div>
</section>
""" + footer(prefix)
    os.makedirs(os.path.join(ROOT, "states"), exist_ok=True)
    with open(os.path.join(ROOT, "states", "index.html"), "w") as f:
        f.write(page)
    urls.append("states/")


def state_capture(name, live):
    """The up-front sample request capture on every state hub (Matt's
    state coverage ruling, Nov 23, 2026). On states with no packs yet
    it leads the page: the state is in the build queue, a request
    takes a free sample when its first pack lands, and requests move
    the state up the build order. Submissions ride the existing
    capture: the function stores the lead with the state recorded as
    its source, and a request for an unbuilt state succeeds and
    stores cleanly (no pack is involved)."""
    if live:
        head = f"Get a free {esc(name)} sample"
        line = ("Tell us where to send it. Requests are recorded with the state "
                "as their source, and the follow up comes from hello@parcelreadydata.com.")
        success = ("Recorded. Our team follows up from hello@parcelreadydata.com "
                   "with the right sample for your trade.")
    else:
        head = f"Request the {esc(name)} sample"
        line = (f"{esc(name)} is in the build queue. When its first pack lands, the free "
                f"sample goes to this list first, and every request moves {esc(name)} "
                "up the build order.")
        success = (f"Recorded. Your request moves {esc(name)} up the build order, and "
                   "the first pack's sample comes to your inbox when it lands.")
    options = "".join(f'<option value="{esc(c)}">{esc(c)}</option>' for c in CATEGORIES)
    return f"""
<section class="state-capture" style="padding-top:0.5rem;padding-bottom:0.5rem">
  <div class="wrap">
    <h2>{head}</h2>
    <p style="max-width:44rem">{line}</p>
    <form class="capture" data-capture data-success="{success}">
      <input type="hidden" name="request_kind" value="state">
      <input type="hidden" name="source" value="state-hub">
      <input type="hidden" name="state" value="{esc(name)}">
      <input type="hidden" name="state_has_packs" value="{'1' if live else '0'}">
      <label>Business name<input type="text" name="business_name" autocomplete="organization" placeholder="Your business"></label>
      <label>Email for the sample<input type="email" name="email" required autocomplete="email" placeholder="you@yourbusiness.com"></label>
      <label>Trade or data type<select name="trade"><option value="">Any / first available</option>{options}</select></label>
      <button class="btn btn-gold" type="submit">Request the sample</button>
      <p class="capture-status" role="status"></p>
    </form>
  </div>
</section>"""


def build_state_hub(name, code, urls):
    prefix = "../../"
    sslug = slug(name)
    live = packs_in(code)
    soon = soon_in(code)
    cards = card_grid(live, prefix)
    cat_rows = ""
    for cat in CATEGORIES:
        n = len(packs_in(code, cat))
        s = soon_in(code, cat)
        if n:
            status = f'<span class="status-pill status-live">{n} live</span>'
        elif s:
            status = '<span class="status-pill">In production</span>'
        else:
            status = '<span class="status-pill dim">Not started</span>'
        cat_rows += f'<tr><td><a href="{slug(cat)}/index.html">{cat}</a></td><td>{status}</td></tr>\n'
    metro_tiles = ""
    metros_here = [(mid, m) for mid, m in CATALOG.get("metros", {}).items() if m["state"] == code]
    if metros_here:
        tiles = "".join(
            f'<a class="state-tile" href="metros/{m["slug"]}/index.html"><span class="state-name">{esc(m["name"])}</span>'
            f'<span class="status-pill status-live">{len([p for p in CATALOG["packs"] if p.get("metro_id") == mid])} packs live</span></a>'
            for mid, m in metros_here)
        metro_tiles = f'<h2 style="margin-top:3rem">Metros in {name}</h2><div class="state-grid">{tiles}</div>'
        if any(p.get("state") == code and not p.get("metro_id") for p in CATALOG["packs"]):
            metro_tiles += ('<p class="fineprint" style="margin-top:1rem">The Free Sample Pack is drawn from every list in the state '
                            'and carries no single metro, so it is counted in the state total above but not in a metro tile.</p>')
    soon_rows = "".join(
        f'<tr><td>{esc(cs["trade"])}</td><td>{esc(cs["metro"])}</td><td><span class="status-pill">{esc(cs["status"])}</span></td></tr>'
        for cs, _ in soon)
    if live:
        head = f"{len(live)} data pack{'s' if len(live) != 1 else ''} live for {name}"
        sub = f"Every pack below carries its verified count, its price, a free sample you can view on the page, and its data as of date."
    else:
        head = f"{name} is on the build map"
        sub = f"No {name} pack has passed verification yet. The trades and categories below are where the build is heading, and a sample request for {name} moves it up the order."
    page = chrome(prefix, f"{name} Data Packs: ParcelReady",
                  f"ParcelReady data packs for {name}: real estate, construction, land, and trade lead packs, each with a free sample and a data as of date.") + f"""
<nav class="crumbs wrap" aria-label="Breadcrumb"><a href="../../states/index.html">States</a> <span>/</span> <span class="crumb-here">{name}</span></nav>
<section style="padding-bottom:1rem">
  <div class="wrap">
    <p class="kicker">State catalog</p>
    <h1 style="font-size:clamp(2.2rem,5vw,3.8rem)">{head}</h1>
    <p class="lede" style="margin-top:1rem">{sub}</p>
  </div>
</section>
{state_capture(name, bool(live))}
<section style="padding-top:1rem">
  <div class="wrap">
    <div class="card-grid">{cards if cards else '<p class="empty-note">Nothing live here yet. Request a sample above and your state moves up the build order.</p>'}</div>
    {metro_tiles}
    <h2 style="margin-top:3rem">Categories in {name}</h2>
    <div class="table-scroll"><table class="matrix"><thead><tr><th>Category</th><th>Status</th></tr></thead><tbody>{cat_rows}</tbody></table></div>
    {('<h2 style="margin-top:3rem">In production</h2><div class="table-scroll"><table class="matrix"><thead><tr><th>Pack</th><th>Coverage</th><th>Status</th></tr></thead><tbody>' + soon_rows + '</tbody></table></div>') if soon_rows else ''}
    <div class="pack-actions" style="margin-top:2.5rem">
      <a class="btn btn-ghost" href="../../catalog.html">Browse the full catalog</a>
    </div>
  </div>
</section>
""" + footer(prefix)
    d = os.path.join(ROOT, "states", sslug)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "index.html"), "w") as f:
        f.write(page)
    urls.append(f"states/{sslug}/")


def build_combo(name, code, cat, urls):
    prefix = "../../../"
    sslug, cslug = slug(name), slug(cat)
    live = packs_in(code, cat)
    soon = soon_in(code, cat)
    cards = card_grid(live, prefix)
    if live:
        head = f"{name} {cat} data"
        sub = f"{len(live)} pack{'s' if len(live) != 1 else ''} live, each with a free sample viewable on its page and a data as of date printed on the label."
        body = f'<div class="card-grid">{cards}</div>'
    elif soon:
        head = f"{name} {cat} data is in production"
        sub = f"This exact pack is being built now. Request a free sample and you will get rows the moment it passes verification, and your request moves it up the order."
        body = '<p class="empty-note">In production. No page of fake products here: when it verifies, it lists.</p>'
    else:
        head = f"{name} {cat} data is not built yet"
        sub = f"We do not hold a {cat} pack for {name} today, and we will not pretend otherwise. It is on the national build map, and sample requests are how states and categories move up."
        body = '<p class="empty-note">Not built yet. The sample request below is the fastest way to change that.</p>'
    elsewhere = sorted({state_name(p["state"]) for p in CATALOG["packs"] if p["category"] == cat and p["state"] != code})
    cross = ""
    if elsewhere and not live:
        links = ", ".join(f'<a href="../../{slug(s)}/{cslug}/index.html">{s} {cat}</a>' for s in elsewhere)
        cross = f'<p class="cross-note">This category is live today in: {links}.</p>'
    siblings = "".join(
        f'<a class="chip" href="../{slug(c)}/index.html">{c}</a>' for c in CATEGORIES if c != cat)
    trade_param = cat
    page = chrome(prefix, f"{name} {cat} Data: ParcelReady",
                  f"ParcelReady {cat} data for {name}: verified packs with free samples and data as of dates, or an honest in production status.") + f"""
<nav class="crumbs wrap" aria-label="Breadcrumb"><a href="../../../states/index.html">States</a> <span>/</span> <a href="../index.html">{name}</a> <span>/</span> <span class="crumb-here">{cat}</span></nav>
<section style="padding-bottom:1rem">
  <div class="wrap">
    <p class="kicker">{name} · {cat}</p>
    <h1 style="font-size:clamp(2.2rem,5vw,3.6rem)">{head}</h1>
    <p class="lede" style="margin-top:1rem">{sub}</p>
    {cross}
  </div>
</section>
<section style="padding-top:1rem">
  <div class="wrap">
    {body}
    <div class="pack-actions" style="margin-top:2.5rem">
      <a class="btn btn-gold" href="../../../sample.html?state={name}&trade={trade_param}">Request a free {name} {cat} sample</a>
    </div>
    <h2 style="margin-top:3rem;font-size:1.4rem">Other categories in {name}</h2>
    <div class="filters">{siblings}</div>
  </div>
</section>
""" + footer(prefix)
    d = os.path.join(ROOT, "states", sslug, cslug)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "index.html"), "w") as f:
        f.write(page)
    urls.append(f"states/{sslug}/{cslug}/")


def records_total(sample_counts=None):
    """Sum the data rows of every live pack's delivery file.

    HQ ruling (Nov 23, 2026, Beacon fix spec 4): the counter counts
    EVERY live pack, including the Free Sample Pack, so the headline
    equals the sum a buyer can add up from the pack cards. The
    sampler's 100 records are drawn from the paid packs; that overlap
    is disclosed on the verify page. Counts come from
    write_sample_json's read of the same files (one read per build,
    not two); the direct read is the fallback for any pack the sample
    draw did not touch. Falls back to the catalog figure only if a
    file is missing.
    """
    per = {}
    for p in CATALOG["packs"]:
        n = None
        if sample_counts and p["id"] in sample_counts:
            n = sample_counts[p["id"]][1]
        if n is None:
            path = full_file_path(p)
            if path and os.path.exists(path):
                with open(path, newline="", encoding="utf-8-sig") as f:
                    n = sum(1 for _ in csv.reader(f)) - 1
        if n is None:
            n = p["rows"] if isinstance(p.get("rows"), int) else 0
        per[p["id"]] = n
    return per, sum(per.values())


def flap_tiles(total):
    """The split-flap board's static tiles for a total, grouped with
    commas. The board's settled state is rendered into the page at
    build time; the flip animation in site.js is only the count-up."""
    out = []
    for ch in f"{total:,}":
        if ch == ",":
            out.append('<span class="flap-sep">,</span>')
        else:
            out.append(f'<span class="flap" data-digit="{ch}">'
                       f'<span class="flap-face">{ch}</span></span>')
    return "\n          ".join(out)


def patch_index_records(total):
    path = os.path.join(ROOT, "index.html")
    with open(path) as f:
        page = f.read()
    page = re.sub(
        r'(<div class="flap-board" data-records data-total=")\d+(" role="img" aria-label=")[\d,]+( records compiled">)',
        lambda m: f"{m.group(1)}{total}{m.group(2)}{total:,}{m.group(3)}", page)
    page = re.sub(
        r'(<div class="flap-row" aria-hidden="true">).*?(</div>)',
        lambda m: f"{m.group(1)}\n          {flap_tiles(total)}\n        {m.group(2)}",
        page, flags=re.S)
    page = re.sub(
        r'(<span class="flap-tag" data-records-tag>)[^<]*',
        lambda m: f"{m.group(1)}{total:,} RECORDS COMPILED", page)
    # Home figures generate from the live catalog at build time
    # (Beacon fix specs 1-3), so they cannot go stale again.
    n_packs = len(CATALOG["packs"])
    n_tx = len([p for p in CATALOG["packs"] if p.get("state") == "TX"])
    page = re.sub(r'Texas: [\d,]+ packs live', f'Texas: {n_tx} packs live', page)
    page = re.sub(r'Browse all [\d,]+ (?:products|packs)', f'Browse all {n_packs} packs', page)
    tax = next(p for p in CATALOG["packs"] if p["id"] == "tarrant-tax-delinquent")
    page = re.sub(r'<b>[\d,]+</b> Tarrant tax delinquent accounts',
                  f'<b>{tax["rows"]:,}</b> Tarrant tax delinquent accounts', page)
    # Home comparison strips (beauty ranked item 5): two generated
    # instances, one per buyer class, from the featured packs. The
    # marker regenerates each build; fail closed if it is missing.
    if "<!--COMPARE-HOME-->" in page:
        feat_county = next(p for p in CATALOG["packs"] if p["id"] == "harris-absentee")
        feat_trade = next(p for p in CATALOG["packs"] if p["id"] == "houston-hvac")
        strips = compare_strip(feat_county) + compare_strip(feat_trade)
        if not strips:
            raise SystemExit("home comparison strips failed to generate (fail closed)")
        page = re.sub(r'<!--COMPARE-HOME-->(\s*<section class="compare-strip">.*?</section>)*',
                      lambda m: "<!--COMPARE-HOME-->" + strips, page, flags=re.S)
        print("HOME STRIPS VERIFIED: county and trade instances generated from featured packs.")
    with open(path, "w") as f:
        f.write(page)


def stamp_css_version():
    """Cache-bust the stylesheet: every page links site.css?v=<hash of
    the CSS file itself>, so a CSS fix reaches returning browsers on
    their next load instead of waiting out a cached copy. (Added Nov 23,
    2026 after a verified fix read as still-broken from a stale cache.)"""
    import hashlib
    css_path = os.path.join(ROOT, "assets", "site.css")
    v = hashlib.md5(open(css_path, "rb").read()).hexdigest()[:8]
    pat = re.compile(r'(href="[^"]*assets/site\.css)(\?v=[0-9a-f]+)?"')
    changed = 0
    for dirpath, _dirs, files in os.walk(ROOT):
        if ".git" in dirpath.split(os.sep):
            continue
        for fn in files:
            if fn.endswith(".html"):
                p = os.path.join(dirpath, fn)
                src = open(p).read()
                out = pat.sub(lambda m: f'{m.group(1)}?v={v}"', src)
                if out != src:
                    open(p, "w").write(out)
                    changed += 1
    print(f"CSS version stamp ?v={v} applied to {changed} pages")


def main():
    counts = write_sample_json()
    SAMPLE_COUNTS.update(counts)
    write_store_registry()
    urls = ["", "catalog.html", "sample.html", "verify.html", "terms.html", "privacy.html"]
    os.makedirs(os.path.join(ROOT, "packs"), exist_ok=True)
    for p in CATALOG["packs"]:
        urls.append(build_pack(p))
    build_states_index(urls)
    build_metro_hubs(urls)
    for name, code in STATES:
        build_state_hub(name, code, urls)
        for cat in CATEGORIES:
            build_combo(name, code, cat, urls)
    with open(os.path.join(ROOT, "assets", "catalog-data.js"), "w") as f:
        data = dict(CATALOG)
        data["states"] = [{"name": n, "code": c, "slug": slug(n)} for n, c in STATES]
        data["categories"] = CATEGORIES
        f.write("window.CATALOG = ")
        json.dump(data, f, indent=1)
        f.write(";\n")
    with open(os.path.join(ROOT, "sitemap.xml"), "w") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
        for u in urls:
            f.write(f"  <url><loc>{BASE}/{u}</loc></url>\n")
        f.write("</urlset>\n")
    with open(os.path.join(ROOT, "robots.txt"), "w") as f:
        f.write(f"User-agent: *\nAllow: /\nSitemap: {BASE}/sitemap.xml\n")
    print(f"Built {len(CATALOG['packs'])} pack pages, {len(STATES)} state hubs, "
          f"{len(STATES) * len(CATEGORIES)} state x category pages, sitemap with {len(urls)} URLs")
    print("Sample JSON rows:", counts)
    per, total = records_total(counts)
    patch_index_records(total)
    stamp_css_version()
    print("Records compiled per pack:", per)
    print("Records compiled total:", total)
    # Matt's rule (Nov 23, 2026): when the data updates, the ticker
    # updates. No build is complete until the written home page is
    # re-read and its counter matches the recount.
    written = open(os.path.join(ROOT, "index.html")).read()
    m = re.search(r'data-total="(\d+)"', written)
    if not m or int(m.group(1)) != total:
        raise SystemExit(f"COUNTER MISMATCH: home page carries "
                         f"{m.group(1) if m else 'nothing'}, recount is {total}")
    tiles = "".join(re.findall(r'data-digit="(\d)"', written))
    if tiles != str(total):
        raise SystemExit(f"COUNTER MISMATCH: flap board tiles read "
                         f"{tiles or 'nothing'}, recount is {total}")
    # The counter must equal what a buyer can sum from the pack
    # cards (Beacon fix spec 4): the catalog rows total.
    card_sum = sum(p["rows"] for p in CATALOG["packs"]
                   if isinstance(p.get("rows"), int))
    if total != card_sum:
        raise SystemExit(f"COUNTER MISMATCH: recount is {total}, "
                         f"printed card sum is {card_sum}")
    for pat, want in [(r'Texas: ([\d,]+) packs live',
                       f"{len([p for p in CATALOG['packs'] if p.get('state') == 'TX']):,}"),
                      (r'Browse all ([\d,]+) packs', f"{len(CATALOG['packs']):,}"),
                      (r'<b>([\d,]+)</b> Tarrant tax delinquent accounts',
                       f"{next(p for p in CATALOG['packs'] if p['id'] == 'tarrant-tax-delinquent')['rows']:,}")]:
        m2 = re.search(pat, written)
        if not m2 or m2.group(1) != want:
            raise SystemExit(f"HOME FIGURE MISMATCH: {pat} reads "
                             f"{m2.group(1) if m2 else 'nothing'}, catalog says {want}")
    print(f"COUNTER VERIFIED: rendered home page reads {total:,}; "
          f"delivered set recounts {total:,}; match.")
    print(f"HOME FIGURES VERIFIED: pack counts and marquee match the catalog.")


if __name__ == "__main__":
    main()
