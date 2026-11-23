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
    <a href="{prefix}sample.html" class="nav-cta">Get a free sample</a>
  </nav>
</header>
"""


def footer(prefix):
    return f"""
<footer>
  <div class="wrap foot-grid">
    <div><strong>ParcelReady</strong><br>Clean, ready to use datasets from public records. Every product lists its source, its build date, and its limits on the label.</div>
    <div><a href="{prefix}catalog.html">Catalog</a><br><a href="{prefix}states/index.html">Browse by state</a><br><a href="{prefix}verify.html">How we verify</a><br><a href="{prefix}sample.html">Free samples</a></div>
    <div>Questions: <a href="mailto:hello@parcelreadydata.com">hello@parcelreadydata.com</a><br>Store: <a href="https://parcelready.gumroad.com" target="_blank" rel="noopener">parcelready.gumroad.com</a></div>
  </div>
</footer>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.14/dist/lenis.min.js"></script>
<script src="{prefix}assets/site.js"></script>
</body>
</html>
"""


def card(p, prefix):
    asof = fmt_date(p["data_as_of"])
    return f"""<article class="card">
      <a href="{prefix}packs/{p['id']}.html"><img src="{prefix}{p['cover']}" alt="{esc(p['title'])} data preview cover" loading="lazy"></a>
      <div class="card-body">
        <p class="meta">{esc(state_name(p['state']))} · {esc(p['category'])}</p>
        <h3>{esc(p['title'])}</h3>
        <p class="tagline">{esc(p['tagline'])}</p>
        <p class="asof">Data as of {asof}<br>{esc(p['refresh_schedule'])}</p>
        <div class="rowline"><span class="rows">{esc(p['rows_label'])}</span><span class="price">{money(p['price'])} <small>{esc(p['price_note'])}</small></span></div>
        <div class="card-links"><a href="{prefix}packs/{p['id']}.html">See what is inside</a><a href="{esc(p['sample_url'])}" target="_blank" rel="noopener">Free sample</a></div>
      </div>
    </article>"""


# ---------------- sample data ----------------

def full_file_path(p):
    delivery = (p.get("store") or {}).get("delivery_file") or ""
    if not delivery:
        return None
    first = delivery.split(" + ")[0].strip()
    return os.path.join(DP, first)


def write_sample_json():
    """The free sample is a fixed percentage of the full file (Matt's ruling,
    Nov 22, 2026), drawn systematically (every Nth row) from the full file.
    Emits the explorer JSON (first 500 sample rows) and the delivery CSV
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
        sample = all_rows[::step]
        target = max(15, min(50, round(len(all_rows) * pct / 100)))
        dstep = max(1, len(all_rows) // target)
        delivered = all_rows[::dstep][:target]
        kind = "trade" if p["family"] == "trade" else "county"
        cols = [c for c in TRADE_COLS if c in headers] if kind == "trade" else headers
        if len(cols) < 4:
            cols = headers
        out = os.path.join(ROOT, "assets", "data", p["id"] + "-sample.json")
        with open(out, "w") as f:
            json.dump({"columns": cols,
                       "rows": [{c: (r.get(c) or "") for c in cols} for r in sample[:500]],
                       "kind": kind, "sample_total": len(sample),
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


def sample_section(p):
    if p["id"] not in SAMPLE_COUNTS:
        return f"""
    <section class="preview">
      <div class="wrap">
        <p class="kicker">The free sample</p>
        <h2>This pack is the sample</h2>
        <p class="explorer-sub">The Free Sample Pack is itself the free product: 100 real records from every paid list, in the exact format of the full files. Download it and inspect every list at once.</p>
        <div class="pack-actions"><a class="btn btn-gold" href="{esc(p['buy_url'])}" target="_blank" rel="noopener">Download the free sample pack</a></div>
      </div>
    </section>"""
    kind = "trade" if p["family"] == "trade" else "county"
    noun = "rows" if kind == "trade" else "sample records"
    return f"""
    <section class="preview reveal">
      <div class="wrap">
        <p class="kicker">Free sample, viewable right here</p>
        <h2>Inspect the data before you spend a dollar</h2>
        <p class="explorer-sub">The free sample is {CATALOG.get("sample_percent", 10)} percent of the full file (15 rows at minimum, 50 at most), the same rule on every pack in the catalog, drawn evenly across the whole dataset, and it carries the same fields as the full pack: nothing the pack sells is held back from the sample. Search it and judge it the way your clients will. The sample file itself is delivered by email below.</p>
        <div class="explorer" data-explorer="../assets/data/{p['id']}-sample.json"></div>
        <p class="fineprint">Sample {noun} shown exactly as they ship, including the blanks. A blank field means it could not be verified. It is never guessed.</p>
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
        })
    out = os.path.join(ROOT, "worker", "store-registry.json")
    with open(out, "w") as f:
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
    price = p["price"]
    mp, per = m["price"], m["per"]
    if per == "quarter":
        frame = (f"About ${round(mp / 3)} a month, billed quarterly. Re-buying the set at the next refresh "
                 f"costs {money(price)} a pull; membership delivers every refresh to your inbox automatically, "
                 f"for the price of one pull a quarter.")
    else:
        frame = (f"A fresh snapshot costs {money(price)} each time you pull it. Members hold the current "
                 f"file automatically, delivered on every refresh.")
    stepup = ""
    if m.get("statewide_price"):
        stepup = (f'<p class="stepup">Step up: the full {esc(state_name(p["state"]))} tier, every metro in the state, '
                  f'{money(m["statewide_price"])}. Membership is sold by metro; the state is the step up.</p>')
    live = p["id"] == "dallas-code-cases"
    card_b_cta = (f'<a class="btn btn-gold" href="{esc(p["buy_url"])}" target="_blank" rel="noopener">Get the membership</a>'
                  if live else
                  f'<a class="btn btn-ghost" href="../sample.html?state={esc(state_name(p["state"]))}&trade={esc(p["category"])}">Join the follow up list</a>')
    card_b_note = "Live now on the feeder shelf." if live else "Opens on the ParcelReady store at launch."
    return f"""
<section class="pricing-offers">
  <div class="wrap">
    <p class="kicker">Two ways to buy</p>
    <h2>The full dataset, or stay current</h2>
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
        <p class="offer-price">{money(mp)} <small>per {per}</small></p>
        <p>{frame}</p>
        {stepup}
        {card_b_cta}
        <p class="fineprint">{card_b_note}</p>
      </article>
    </div>
  </div>
</section>"""


def build_pack(p):
    prefix = "../"
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
      <p class="the-line">We do the work. You get the leads.</p>
      <p class="buyer-line">Built for: {esc(p['buyer'])}.</p>
      <p class="buyer-line">Coverage: {esc(p['coverage'])}{metro_link(p)}.</p>
      <div class="pack-actions">
        {buy_button(p)}
        <a class="btn btn-ghost" href="{esc(p['sample_url'])}" target="_blank" rel="noopener">{esc(p['sample_label'])}</a>
      </div>
      <p class="fineprint">{fresh} {'Sold and delivered through Gumroad.' if p.get("store", {}).get("mode") == "gumroad" else 'Sold and delivered on this site.'}</p>
    </div>
    <figure class="pack-cover reveal"><img src="../{p['cover']}" alt="{esc(p['title'])} data preview cover"></figure>
  </div>
</section>
<section class="stat-band"><div class="wrap stat-grid">{stats}</div></section>
<section class="inside">
  <div class="wrap inside-grid">
    <div class="reveal">
      <p class="kicker">What is inside</p>
      <h2>Every row, checked by hand</h2>
      <ul class="inside-list">{inside}</ul>
    </div>
    <aside class="limits reveal">
      <p class="kicker">Honest limits</p>
      <p>{esc(p['limits'])}</p>
      <div class="pack-actions"><a class="btn btn-gold" href="{esc(p['sample_url'])}" target="_blank" rel="noopener">Start with the free sample</a></div>
    </aside>
  </div>
</section>
{pricing_block(p)}
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
        cards = "".join(card(p, prefix) for p in packs)
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


def build_state_hub(name, code, urls):
    prefix = "../../"
    sslug = slug(name)
    live = packs_in(code)
    soon = soon_in(code)
    cards = "".join(card(p, prefix) for p in live)
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
<section style="padding-top:1rem">
  <div class="wrap">
    <div class="card-grid">{cards if cards else '<p class="empty-note">Nothing live here yet. Request a sample below and your state moves up the build order.</p>'}</div>
    {metro_tiles}
    <h2 style="margin-top:3rem">Categories in {name}</h2>
    <div class="table-scroll"><table class="matrix"><thead><tr><th>Category</th><th>Status</th></tr></thead><tbody>{cat_rows}</tbody></table></div>
    {('<h2 style="margin-top:3rem">In production</h2><div class="table-scroll"><table class="matrix"><thead><tr><th>Pack</th><th>Coverage</th><th>Status</th></tr></thead><tbody>' + soon_rows + '</tbody></table></div>') if soon_rows else ''}
    <div class="pack-actions" style="margin-top:2.5rem">
      <a class="btn btn-gold" href="../../sample.html?state={name}">Request a free {name} sample</a>
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
    cards = "".join(card(p, prefix) for p in live)
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


if __name__ == "__main__":
    main()
