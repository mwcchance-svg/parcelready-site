// ParcelReady store backend: Supabase Edge Function (Deno).
//
// Ported Nov 23, 2026 from the Cloudflare Worker design (Cloudflare route
// abandoned the same day: the dashboard's bot wall blocked the browser).
// Same rules as the Worker ran under:
//   - The Stripe restricted key exists ONLY as a function secret. It
//     never reaches any workstation, so the product and price sync runs
//     here, server side: ensurePrice does the idempotent create-or-find
//     (product by pack_id metadata, price reused only on an exact amount,
//     currency, and interval match, NO tax codes ever assigned).
//   - Checkout calls ensurePrice lazily; POST /api/admin/sync runs it in
//     bulk and stays dark unless ADMIN_TOKEN is set.
//   - The Worker registers its own Stripe webhook endpoint and keeps the
//     signing secret in the store_config table, because Stripe shows
//     that secret only once, at creation.
// Platform map: Storage bucket parcelready-files stands in for R2;
// Postgres tables stand in for KV (delivery_tokens, leads, store_config,
// price_map). SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by
// the platform. Deploy with verify_jwt OFF: Stripe webhooks and browser
// calls carry no Supabase JWT; the design's own checks are the gate.

import registry from "../store-registry.json" with { type: "json" };

const enc = new TextEncoder();
const env = (name: string) => Deno.env.get(name) || "";

function json(body: unknown, status = 200, req: Request | null = null) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (req) {
    const origin = req.headers.get("Origin") || "";
    const allowed = (env("ALLOWED_ORIGINS") || env("SITE_BASE")).split(",").map((s) => s.trim());
    if (allowed.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function packById(id: string) {
  return (registry as any).packs.find((p: any) => p.id === id) || null;
}

async function hmacHex(secret: string, data: string) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ---------------- data layer (PostgREST + Storage) ---------------- */

function restHeaders(extra: Record<string, string> = {}) {
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...extra };
}

async function rest(path: string, init: RequestInit = {}) {
  const res = await fetch(`${env("SUPABASE_URL")}/rest/v1/${path}`, {
    ...init,
    headers: { ...restHeaders(), ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`rest_${res.status}:${path}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const configGet = async (key: string) => {
  const rows = await rest(`store_config?key=eq.${encodeURIComponent(key)}&select=value`);
  return rows && rows.length ? rows[0].value : null;
};
const configSet = (key: string, value: string) =>
  rest("store_config", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ key, value }),
  });

const priceMapGet = async (priceId: string) => {
  const rows = await rest(`price_map?price_id=eq.${encodeURIComponent(priceId)}&select=pack_id`);
  return rows && rows.length ? rows[0].pack_id : null;
};
const priceMapSet = (priceId: string, packId: string) =>
  rest("price_map", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ price_id: priceId, pack_id: packId }),
  });

async function storageObject(key: string) {
  const res = await fetch(
    `${env("SUPABASE_URL")}/storage/v1/object/parcelready-files/${key}`,
    { headers: restHeaders() }
  );
  if (!res.ok) return null;
  return res;
}

/* ---------------- email + delivery ---------------- */

async function sendEmail(to: string, subject: string, text: string, html?: string) {
  if (!env("RESEND_API_KEY")) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env("MAIL_FROM") || "ParcelReady <delivery@parcelreadydata.com>",
      to, subject, text, ...(html ? { html } : {}),
    }),
  });
  return res.ok;
}

/* ---------------- client email design (Matt's order, Nov 23, 2026) ----
   Every client facing email is a branded HTML message with a plain
   text fallback: a ParcelReady header, a courteous opening, a download
   button with the raw link beneath it, the 72 hour window stated
   warmly, the label promise carried in full, and a courteous sign off.
   Tone: a national data company that respects the buyer's time. No
   hype, no exclamation marks. */

const SUPPORT = "hello@parcelreadydata.com";

// The label promise, carried verbatim from the terms page. It is a
// legal commitment; its substance does not get paraphrased.
const LABEL_PROMISE =
  "The promise attaches to the label, not to freshness. If a pack does not match what its page " +
  "promised (the wrong file, a file that will not open, counts that do not match the label, or a " +
  "field marked verified that was not), tell us within 30 days of purchase and we will fix it or " +
  "refund that pack. Ordinary staleness is not covered: public records change after the pull date, " +
  "and some addresses and emails will go bad over time. The answer to that is the published refresh " +
  "schedule, and the membership, whose members always hold the current file. A field left blank was " +
  "not verified, and we say so on the label rather than guess.";

function escHtml(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function emailShell(bodyHtml: string) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F1E6C9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1E6C9;padding:28px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border:1px solid #D9CBA3;border-radius:10px;overflow:hidden;">
<tr><td style="background:#06331F;padding:26px 34px;">
  <div style="font-family:'Archivo','Helvetica Neue',Arial,sans-serif;font-weight:900;font-size:24px;color:#F6E8C8;letter-spacing:0.01em;">ParcelReady</div>
  <div style="font-family:'IBM Plex Mono','Courier New',monospace;font-size:11px;letter-spacing:0.22em;color:#E9B949;padding-top:6px;">WE DO THE WORK. YOU GET THE LEADS.</div>
</td></tr>
<tr><td style="padding:30px 34px 8px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:15.5px;line-height:1.62;color:#122B1E;">
${bodyHtml}
</td></tr>
<tr><td style="padding:18px 34px 30px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:15.5px;line-height:1.62;color:#122B1E;">
  <p style="margin:0;">Thank you for choosing ParcelReady.</p>
  <p style="margin:10px 0 0;">Warm regards,<br><strong>ParcelReady</strong></p>
  <p style="margin:14px 0 0;font-size:13.5px;color:#3D5546;">Questions, or a hand with your file: <a href="mailto:${SUPPORT}" style="color:#0A4A2A;">${SUPPORT}</a></p>
</td></tr>
<tr><td style="background:#FBF5E2;padding:14px 34px;border-top:1px solid #E4D6AC;font-family:'IBM Plex Mono','Courier New',monospace;font-size:10.5px;letter-spacing:0.14em;color:#6B7A6E;">
  PARCELREADY &middot; CLEAN, READY TO USE DATASETS FROM PUBLIC RECORDS
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function downloadBlockHtml(csvLink: string, xlsxLink: string) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px;">
    <tr>
      <td style="background:#E9B949;border-radius:8px;">
        <a href="${escHtml(csvLink)}" style="display:inline-block;padding:13px 26px;font-family:'Helvetica Neue',Arial,sans-serif;font-weight:700;font-size:15px;color:#122B1E;text-decoration:none;">Download CSV</a>
      </td>
      <td style="width:10px;"></td>
      <td style="background:#FBF5E2;border:1px solid #0A4A2A;border-radius:8px;">
        <a href="${escHtml(xlsxLink)}" style="display:inline-block;padding:12px 25px;font-family:'Helvetica Neue',Arial,sans-serif;font-weight:700;font-size:15px;color:#0A4A2A;text-decoration:none;">Download XLSX</a>
      </td>
    </tr>
  </table>
  <p style="margin:8px 0 0;font-size:13px;color:#3D5546;">If the buttons do not work in your mail program, copy a link into your browser:<br>
  CSV: <a href="${escHtml(csvLink)}" style="color:#0A4A2A;word-break:break-all;">${escHtml(csvLink)}</a><br>
  XLSX: <a href="${escHtml(xlsxLink)}" style="color:#0A4A2A;word-break:break-all;">${escHtml(xlsxLink)}</a></p>
  <p style="margin:8px 0 0;font-size:13px;color:#3D5546;">The CSV opens straight into Google Sheets. The XLSX is the same data in Excel's own format.</p>`;
}

function promiseBlockHtml() {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 4px;">
    <tr><td style="background:#FBF5E2;border:1px solid #E4D6AC;border-radius:8px;padding:16px 18px;">
      <div style="font-family:'IBM Plex Mono','Courier New',monospace;font-size:10.5px;letter-spacing:0.2em;color:#0A4A2A;padding-bottom:8px;">THE LABEL PROMISE</div>
      <p style="margin:0;font-size:13.5px;line-height:1.6;color:#3D5546;">${escHtml(LABEL_PROMISE)}</p>
    </td></tr>
  </table>`;
}

const WARM_WINDOW =
  "Your link stays open for 72 hours, so there is no rush. If it closes before you have had a " +
  "chance to download, write to us and we will send a fresh one.";
const WARM_WINDOW_HTML = `<p style="margin:16px 0 0;">${WARM_WINDOW}</p>`;

async function deliver(pack: any, email: string, kind: string) {
  const token = randomToken();
  const expires = new Date(Date.now() + 72 * 3600 * 1000).toISOString();
  await rest("delivery_tokens", {
    method: "POST",
    body: JSON.stringify({ token, pack_id: pack.id, email, kind, expires_at: expires }),
  });
  const base = env("API_BASE") || env("SITE_BASE");
  const link = `${base}/api/download?token=${token}`;
  const linkXlsx = `${link}&format=xlsx`;
  const isSample = kind === "sample";
  // Beauty spec B8: the Free Sample Pack delivers as one Excel
  // workbook (one sheet per paid list, each in that list's exact
  // format), so its sample email carries a single download.
  const isWorkbook = isSample && typeof pack.sample_file_key === "string" &&
    pack.sample_file_key.endsWith(".xlsx");
  const text = isWorkbook
    ? `Thank you for asking to see the data first. That is exactly what the sample is for.\n\n` +
      `Your free sample of ${pack.title} is ready: one Excel workbook with a sheet for every ` +
      `paid list in the store, each sheet carrying that list's exact columns and real rows, ` +
      `100 records in all.\n\n` +
      `Download the workbook:\n${link}\n\n${WARM_WINDOW}\n\n` +
      `If the sample earns its keep, the full packs are listed on parcelreadydata.com with ` +
      `their record counts, exact pull dates, and refresh schedules printed on the label.\n\n` +
      `The label promise\n${LABEL_PROMISE}`
    : isSample
    ? `Thank you for asking to see the data first. That is exactly what the sample is for.\n\n` +
      `Your free sample of ${pack.title} is ready. It carries every field, exactly as the full ` +
      `pack ships them, so you can judge the data the way it will actually arrive. It comes in ` +
      `two formats: CSV, which opens straight into Google Sheets, and XLSX, the same data in ` +
      `Excel's own format.\n\n` +
      `Download CSV:\n${link}\n\nDownload XLSX:\n${linkXlsx}\n\n${WARM_WINDOW}\n\n` +
      `If the sample earns its keep, the full pack is listed on parcelreadydata.com with its ` +
      `record count, its exact pull date, and its refresh schedule printed on the label.\n\n` +
      `The label promise\n${LABEL_PROMISE}`
    : `Thank you for your purchase. We are glad to have you with us.\n\n` +
      `Your copy of ${pack.title} is ready. It comes in two formats, with every field exactly ` +
      `as it ships: CSV, which opens straight into Google Sheets, and XLSX, the same data in ` +
      `Excel's own format.\n\n` +
      `Download CSV:\n${link}\n\nDownload XLSX:\n${linkXlsx}\n\n${WARM_WINDOW}\n\n` +
      `Every ParcelReady pack lists its source, its build date, and its limits on the label, and ` +
      `this file is the one its page describes.\n\n` +
      `The label promise\n${LABEL_PROMISE}`;
  const html = emailShell(
    (isWorkbook
      ? `<p style="margin:0;">Thank you for asking to see the data first. That is exactly what the sample is for.</p>
  <p style="margin:14px 0 0;">Your free sample of <strong>${escHtml(pack.title)}</strong> is ready: one Excel workbook with a sheet for every paid list in the store, each sheet carrying that list's exact columns and real rows, 100 records in all.</p>`
      : isSample
      ? `<p style="margin:0;">Thank you for asking to see the data first. That is exactly what the sample is for.</p>
  <p style="margin:14px 0 0;">Your free sample of <strong>${escHtml(pack.title)}</strong> is ready. It carries every field, exactly as the full pack ships them, so you can judge the data the way it will actually arrive.</p>`
      : `<p style="margin:0;">Thank you for your purchase. We are glad to have you with us.</p>
  <p style="margin:14px 0 0;">Your copy of <strong>${escHtml(pack.title)}</strong> is ready, in two formats, with every field exactly as it ships.</p>`) +
      (isWorkbook
        ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px;"><tr><td style="background:#E9B949;border-radius:8px;"><a href="${escHtml(link)}" style="display:inline-block;padding:13px 26px;font-family:'Helvetica Neue',Arial,sans-serif;font-weight:700;font-size:15px;color:#122B1E;text-decoration:none;">Download the workbook</a></td></tr></table>`
        : downloadBlockHtml(link, linkXlsx)) +
      WARM_WINDOW_HTML +
      (isSample
        ? `<p style="margin:16px 0 0;">If the sample earns its keep, the full pack is listed on parcelreadydata.com with its record count, its exact pull date, and its refresh schedule printed on the label.</p>`
        : `<p style="margin:16px 0 0;">Every ParcelReady pack lists its source, its build date, and its limits on the label, and this file is the one its page describes.</p>`) +
      promiseBlockHtml()
  );
  await sendEmail(email, `Your ParcelReady download: ${pack.title}`, text, html);
}

/* ---------------- tax (Matt's ruling, Nov 23, 2026) ----------------
   Prices are tax-inclusive: the sticker is the whole price, and Stripe
   Tax carves the buyer-state tax out of it wherever ParcelReady has a
   registration (Texas only today; other states switch on as their
   economic thresholds cross). The category is Stripe's Website Data
   Processing code, per Matt's data-processing treatment. If the CPA
   determination lands on Electronically Delivered Information Services
   instead, the flip is this one constant: txcd_10701410. */
const TAX_CODE = "txcd_10701300";
const taxOn = () => env("TAX_MODE") === "stripe_tax";

/* ---------------- stripe helpers ---------------- */

async function stripeCall(method: string, path: string, params?: Record<string, string>) {
  const init: RequestInit = {
    method,
    headers: { Authorization: `Bearer ${env("STRIPE_SECRET_KEY")}` },
  };
  let url = `https://api.stripe.com/v1/${path}`;
  if (method === "GET" && params) url += `?${new URLSearchParams(params).toString()}`;
  else if (params) {
    (init.headers as Record<string, string>)["Content-Type"] = "application/x-www-form-urlencoded";
    init.body = new URLSearchParams(params).toString();
  }
  const res = await fetch(url, init);
  return res.json();
}
const stripePost = (path: string, params: Record<string, string>) => stripeCall("POST", path, params);
const stripeGet = (path: string, params?: Record<string, string>) => stripeCall("GET", path, params);

/* -------- server-side product and price sync (idempotent) -------- */

async function findProduct(pack: any) {
  const searched = await stripeGet("products/search", {
    query: `metadata['pack_id']:'${pack.id}'`,
  });
  if (searched && Array.isArray(searched.data) && searched.data.length) return searched.data[0];
  const listed = await stripeGet("products", { limit: "100", active: "true" });
  if (listed && Array.isArray(listed.data)) {
    return listed.data.find((p: any) => p.metadata && p.metadata.pack_id === pack.id) || null;
  }
  return null;
}

async function ensurePrice(pack: any, oneTime = false) {
  let product = await findProduct(pack);
  if (!product || !product.id) {
    const created: Record<string, string> = {
      name: pack.title,
      description: "Downloadable dataset from ParcelReady. We do the work. You get the leads.",
      "metadata[pack_id]": pack.id,
      "metadata[registry]": "parcelready",
    };
    if (taxOn()) created.tax_code = TAX_CODE;
    product = await stripePost("products", created);
    if (!product.id) throw new Error(`product_create_failed:${pack.id}`);
  } else if (taxOn() && product.tax_code !== TAX_CODE) {
    await stripePost(`products/${product.id}`, { tax_code: TAX_CODE });
  }
  // Spec 13 (HQ, Nov 23, 2026): a pack may carry a true one-time
  // offer beside its subscription (Dallas Code Cases, $79 one time).
  // oneTime ensures the non-recurring price at one_time_cents.
  const cents = Math.round(oneTime ? (pack.one_time_cents || 0) : (pack.price_cents || 0));
  const sub = !oneTime && pack.store.billing === "subscription";
  const prices = await stripeGet("prices", { product: product.id, active: "true", limit: "100" });
  const match = (prices.data || []).find((pr: any) => {
    if (pr.unit_amount !== cents || pr.currency !== "usd") return false;
    if (taxOn() && pr.tax_behavior !== "inclusive") return false;
    if (!sub) return !pr.recurring;
    return (
      pr.recurring &&
      pr.recurring.interval === (pack.interval || "month") &&
      pr.recurring.interval_count === (pack.interval_count || 1)
    );
  });
  let price = match;
  if (!price) {
    const params: Record<string, string> = {
      product: product.id,
      unit_amount: String(cents),
      currency: "usd",
      "metadata[pack_id]": pack.id,
    };
    if (sub) {
      params["recurring[interval]"] = pack.interval || "month";
      if ((pack.interval_count || 1) > 1) params["recurring[interval_count]"] = String(pack.interval_count);
    }
    // Under TAX_MODE stripe_tax the price is created tax-inclusive, so
    // the sticker stays the whole price and the tax carves out of it.
    // With tax off, no tax behavior is assigned (the pre-ruling shape).
    if (taxOn()) params.tax_behavior = "inclusive";
    price = await stripePost("prices", params);
    if (!price.id) throw new Error(`price_create_failed:${pack.id}`);
  }
  await priceMapSet(price.id, pack.id);
  if (taxOn()) {
    // Deliberate handling of pre-ruling prices: a price created before
    // the ruling carries no inclusive behavior and must never be picked
    // up silently once tax is on. Stripe prices cannot be deleted, so
    // every other active price on this product is archived, EXCEPT a
    // price that legitimately belongs to one of the pack's own offers
    // (its primary price, or its spec 13 one-time price): archiving
    // those would make the two offers destroy each other at checkout.
    const legit = (pr: any) => {
      if (pr.currency !== "usd" || pr.tax_behavior !== "inclusive") return false;
      const primarySub = pack.store.billing === "subscription";
      if (pr.unit_amount === Math.round(pack.price_cents || 0)) {
        if (!primarySub && !pr.recurring) return true;
        if (primarySub && pr.recurring &&
            pr.recurring.interval === (pack.interval || "month") &&
            pr.recurring.interval_count === (pack.interval_count || 1)) return true;
      }
      if (pack.one_time_cents && pr.unit_amount === Math.round(pack.one_time_cents) && !pr.recurring) return true;
      return false;
    };
    for (const pr of prices.data || []) {
      if (pr.id !== price.id && pr.active && !legit(pr)) {
        await stripePost(`prices/${pr.id}`, { active: "false" }).catch(() => {});
      }
    }
  }
  return price.id;
}

async function ensureWebhook() {
  if (env("STRIPE_WEBHOOK_SECRET")) return { status: "env_secret_in_use" };
  const existingSecret = await configGet("webhook_secret");
  const url = `${env("API_BASE")}/api/webhook`;
  const listed = await stripeGet("webhook_endpoints", { limit: "100" });
  const mine = (listed.data || []).filter((w: any) => w.url === url);
  if (mine.length && existingSecret) return { status: "already_registered", id: mine[0].id };
  // The signing secret is shown only at creation; if we hold no secret,
  // replace the endpoint so a fresh secret lands in the config table.
  // Pre-launch safe.
  for (const w of mine) await stripeCall("DELETE", `webhook_endpoints/${w.id}`);
  const created = await stripePost("webhook_endpoints", {
    url,
    "enabled_events[0]": "checkout.session.completed",
    "enabled_events[1]": "invoice.paid",
    description: "ParcelReady store function (auto-registered)",
  });
  if (!created.id || !created.secret) throw new Error("webhook_create_failed");
  await configSet("webhook_secret", created.secret);
  return { status: "registered", id: created.id };
}

async function handleAdminSync(req: Request) {
  if (!env("ADMIN_TOKEN")) return new Response("not found", { status: 404 });
  if (req.headers.get("x-admin-token") !== env("ADMIN_TOKEN")) return json({ error: "unauthorized" }, 401);
  const report: any = { synced: [], webhook: null, errors: [] };
  for (const pack of (registry as any).packs) {
    if (pack.store.mode !== "stripe") continue;
    try {
      report.synced.push({ pack: pack.id, price: await ensurePrice(pack) });
    } catch (err) {
      report.errors.push({ pack: pack.id, error: String(err) });
    }
  }
  try {
    report.webhook = await ensureWebhook();
  } catch (err) {
    report.errors.push({ webhook: String(err) });
  }
  return json(report, report.errors.length ? 207 : 200);
}

/* ---------------- checkout ---------------- */

// Landing pipeline upload (HQ sanction, Nov 23, 2026): the desk posts
// a pack or sample file as the raw request body with ?key=packs/<name>
// or ?key=samples/<name>. Same gate as the sync route: dark (404)
// until ADMIN_TOKEN is set, 401 on a wrong token. CSV and XLSX keys
// (the format pair, Atlas's ruling Nov 23, 2026), 25 MB cap, upsert
// so a refresh replaces the delivered object.
const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
async function handleAdminUpload(req: Request, url: URL) {
  if (!env("ADMIN_TOKEN")) return new Response("not found", { status: 404 });
  if (req.headers.get("x-admin-token") !== env("ADMIN_TOKEN")) return json({ error: "unauthorized" }, 401);
  const key = url.searchParams.get("key") || "";
  if (!/^(packs|samples)\/[A-Za-z0-9._-]+\.(csv|xlsx)$/.test(key) || key.includes("..")) {
    return json({ error: "bad_key" }, 400);
  }
  const body = new Uint8Array(await req.arrayBuffer());
  if (!body.length) return json({ error: "empty_body" }, 400);
  if (body.length > 64 * 1024 * 1024) return json({ error: "too_large" }, 413);
  const res = await fetch(
    `${env("SUPABASE_URL")}/storage/v1/object/parcelready-files/${key}`,
    {
      method: "POST",
      headers: { ...restHeaders(), "Content-Type": key.endsWith(".xlsx") ? XLSX_TYPE : "text/csv", "x-upsert": "true" },
      body,
    }
  );
  if (!res.ok) return json({ error: "storage_" + res.status }, 502);
  return json({ ok: true, key, bytes: body.length });
}

async function handleCheckout(req: Request) {
  const { pack_id, variant } = await req.json();
  const pack = packById(pack_id);
  if (!pack || pack.store.mode !== "stripe") return json({ error: "pack_not purchasable_here" }, 400, req);
  const oneTime = variant === "one_time" && !!pack.one_time_cents;
  let priceId;
  try {
    priceId = await ensurePrice(pack, oneTime);
    await ensureWebhook().catch(() => {});
  } catch (err) {
    return json({ error: "sync_failed" }, 502, req);
  }
  const sub = !oneTime && pack.store.billing === "subscription";
  const params: Record<string, string> = {
    mode: sub ? "subscription" : "payment",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    success_url: `${env("SITE_BASE")}/thanks.html?pack=${pack.id}`,
    cancel_url: `${env("SITE_BASE")}/packs/${pack.id}.html`,
    "metadata[pack_id]": pack.id,
    "metadata[variant]": oneTime ? "one_time" : "standard",
  };
  if (sub) params["subscription_data[metadata][pack_id]"] = pack.id;
  else params["payment_intent_data[metadata][pack_id]"] = pack.id;
  if (taxOn()) {
    params["automatic_tax[enabled]"] = "true";
    // Stripe Tax needs the buyer's address to place the sale; Checkout
    // collects it before payment, and the tax line resolves inside the
    // inclusive price on the hosted page.
    params.billing_address_collection = "required";
  }
  const session = await stripePost("checkout/sessions", params);
  if (!session.url) return json({ error: "checkout_failed" }, 502, req);
  return json({ url: session.url }, 200, req);
}

/* ---------------- webhook ---------------- */

async function verifyStripe(req: Request, raw: string) {
  const secret = env("STRIPE_WEBHOOK_SECRET") || (await configGet("webhook_secret"));
  if (!secret) return false;
  const header = req.headers.get("stripe-signature") || "";
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=")));
  if (!parts.t || !parts.v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return false;
  const expected = await hmacHex(secret, `${parts.t}.${raw}`);
  return expected === parts.v1;
}

async function packForPrice(priceId: string) {
  const cached = await priceMapGet(priceId);
  if (cached) return packById(cached);
  const price = await stripeGet(`prices/${priceId}`);
  const id = price && price.metadata && price.metadata.pack_id;
  if (id) await priceMapSet(priceId, id);
  return id ? packById(id) : null;
}

async function handleWebhook(req: Request) {
  const raw = await req.text();
  if (!(await verifyStripe(req, raw))) return new Response("bad signature", { status: 400 });
  const event = JSON.parse(raw);
  if (event.type === "checkout.session.completed") {
    const s = event.data.object;
    const pack = packById(s.metadata && s.metadata.pack_id);
    const email = s.customer_details && s.customer_details.email;
    if (pack && email) {
      await deliver(pack, email, "purchase");
      await sendEmail(
        env("LEADS_INBOX") || "hello@parcelreadydata.com",
        `ParcelReady sale: ${pack.title}`,
        ...saleNotice(pack, email, s.amount_total, s.currency, false)
      );
    }
  }
  if (event.type === "invoice.paid") {
    const line = event.data.object.lines && event.data.object.lines.data[0];
    const priceId = line && line.price && line.price.id;
    const pack = priceId ? await packForPrice(priceId) : null;
    const email = event.data.object.customer_email;
    // The first invoice is already covered by checkout.session.completed.
    if (pack && email && event.data.object.billing_reason !== "subscription_create") {
      await deliver(pack, email, "refresh");
      await sendEmail(
        env("LEADS_INBOX") || "hello@parcelreadydata.com",
        `ParcelReady renewal: ${pack.title}`,
        ...saleNotice(pack, email, event.data.object.amount_paid, event.data.object.currency, true)
      );
    }
  }
  return json({ received: true });
}

/* Internal lead notification (Atlas's order, Nov 23, 2026, on Matt's
   screenshot): the notice to the leads inbox wears the same clean
   shell as the client emails and reads as plain lines, never a JSON
   dump. Returns [text, html] for sendEmail. */
function leadNotice(lead: any, pack: any): [string, string] {
  const kind = lead.request_kind === "state"
    ? "State hub request"
    : pack
      ? "Pack sample request"
      : "Sample request";
  const when = String(lead.at || "").replace("T", " ").replace(/\.\d+Z$/, " UTC");
  const lines: Array<[string, string]> = [
    ["Who asked", lead.business_name || "Not given"],
    ["Email", lead.email || "Not given"],
    ["State", lead.state || "Not given"],
    ["Trade", lead.trade || (pack ? pack.category : "") || "Not given"],
    ["Pack", pack ? pack.title : "None (no pack requested)"],
    ["Request", kind],
    ["Source page", lead.source_page || "Not given"],
    ["Received", when],
  ];
  if (lead.metro) lines.splice(4, 0, ["Metro", lead.metro]);
  if (lead.notes) lines.push(["Notes", lead.notes]);
  const text =
    `A new sample request came in through the site.\n\n` +
    lines.map(([k, v]) => `${k}: ${v}`).join("\n") +
    `\n\nThe lead is recorded in the leads table, and the requester has been answered by the usual route.`;
  const rows = lines
    .map(([k, v]) =>
      `<tr><td style="padding:5px 18px 5px 0;font-size:13px;color:#3D5546;white-space:nowrap;">${escHtml(k)}</td>` +
      `<td style="padding:5px 0;font-size:14px;color:#122B1E;">${escHtml(v)}</td></tr>`)
    .join("\n");
  const html = emailShell(
    `<p style="margin:0;">A new sample request came in through the site.</p>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0 4px;">${rows}</table>
  <p style="margin:14px 0 0;font-size:13px;color:#3D5546;">The lead is recorded in the leads table, and the requester has been answered by the usual route.</p>`
  );
  return [text, html];
}

/* Internal sale notification (Matt's order via Atlas, Nov 23, 2026):
   our own notice to the leads inbox when money lands, in the same
   branded shell as the lead notice. Stripe's own notification settings
   are untouched. Renewals (an invoice.paid that fires a refresh
   delivery) carry the same notice labeled as a renewal. Returns
   [text, html] for sendEmail. */
function saleNotice(pack: any, email: string, amountCents: any, currency: string, renewal: boolean): [string, string] {
  const cents = typeof amountCents === "number" ? amountCents : null;
  const amount = cents === null
    ? "Not shown"
    : currency && currency.toLowerCase() !== "usd"
      ? `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`
      : `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const when = new Date().toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
  const lines: Array<[string, string]> = [
    ["What", renewal ? "Subscription renewal" : "New sale"],
    ["Pack", pack.title],
    ["Amount paid", amount],
    ["Buyer", email],
    ["Received", when],
  ];
  const intro = renewal
    ? "A subscription renewed on the store."
    : "A sale landed on the store.";
  const outro = renewal
    ? "The subscriber has been sent a fresh delivery email with the download links."
    : "The buyer has been sent the delivery email with the download links.";
  const text =
    `${intro}\n\n` +
    lines.map(([k, v]) => `${k}: ${v}`).join("\n") +
    `\n\n${outro}`;
  const rows = lines
    .map(([k, v]) =>
      `<tr><td style="padding:5px 18px 5px 0;font-size:13px;color:#3D5546;white-space:nowrap;">${escHtml(k)}</td>` +
      `<td style="padding:5px 0;font-size:14px;color:#122B1E;">${escHtml(v)}</td></tr>`)
    .join("\n");
  const html = emailShell(
    `<p style="margin:0;">${intro}</p>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0 4px;">${rows}</table>
  <p style="margin:14px 0 0;font-size:13px;color:#3D5546;">${outro}</p>`
  );
  return [text, html];
}

/* ---------------- sample capture + download ---------------- */

async function handleSample(req: Request) {
  const body = await req.json();
  const email = (body.email || "").trim();
  if (!email || !email.includes("@")) return json({ error: "email_required" }, 400, req);
  const lead = {
    at: new Date().toISOString(),
    business_name: body.business_name || "",
    email,
    trade: body.trade || "",
    state: body.state || "",
    metro: body.metro || "",
    reply_route: body.reply_route || "",
    notes: body.notes || "",
    pack_id: body.pack_id || "",
    source_page: body.source_page || "",
    request_kind: body.request_kind || "",
    source: body.source || "",
  };
  await rest("leads", { method: "POST", body: JSON.stringify({ payload: lead }) });
  const pack = lead.pack_id ? packById(lead.pack_id) : null;
  await sendEmail(
    env("LEADS_INBOX") || "hello@parcelreadydata.com",
    `ParcelReady sample lead: ${lead.trade || lead.pack_id} ${lead.state}`.trim(),
    ...leadNotice(lead, pack)
  );
  if (pack && pack.sample_file_key) {
    await deliver(pack, email, "sample");
    return json({ ok: true, delivered: "sample" }, 200, req);
  }
  if (lead.request_kind === "state") {
    const stateName = lead.state || "your state";
    const hasPacks = (body.state_has_packs || "") === "1";
    const stateBody = hasPacks
      ? `It is recorded with ${stateName} as its source. ${stateName} packs are live now, ` +
        `and our team follows up from hello@parcelreadydata.com with the sample that fits ` +
        `your trade. There is nothing further you need to do.`
      : `${stateName} is in the build queue, and your request is recorded with the state ` +
        `as its source. Requests are how states move up the build order. When the first ` +
        `${stateName} pack passes verification, its free sample comes to this address ` +
        `first, before the pack is listed for anyone else. There is nothing further you need to do.`;
    const stateText = `Thank you for your request.\n\n` + stateBody;
    const stateHtml = emailShell(
      `<p style="margin:0;">Thank you for your request.</p>\n  <p style="margin:14px 0 0;">${stateBody}</p>`
    );
    await sendEmail(email, "Your ParcelReady sample request", stateText, stateHtml);
    return json({ ok: true, delivered: "queued" }, 200, req);
  }
  const queuedText =
    `Thank you for your request.\n\n` +
    `The pack you asked about is still in production, so there is no sample file to send ` +
    `today. We would rather tell you that plainly than send you something unfinished. The ` +
    `moment it passes verification, your sample rows come to this address first, before ` +
    `the pack is listed for anyone else. There is nothing further you need to do.`;
  const queuedHtml = emailShell(
    `<p style="margin:0;">Thank you for your request.</p>
  <p style="margin:14px 0 0;">The pack you asked about is still in production, so there is no sample file to send today. We would rather tell you that plainly than send you something unfinished. The moment it passes verification, your sample rows come to this address first, before the pack is listed for anyone else. There is nothing further you need to do.</p>`
  );
  await sendEmail(email, "Your ParcelReady sample request", queuedText, queuedHtml);
  return json({ ok: true, delivered: "queued" }, 200, req);
}

async function handleDownload(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) return new Response("missing token", { status: 400 });
  const rows = await rest(
    `delivery_tokens?token=eq.${encodeURIComponent(token)}&select=pack_id,kind,expires_at`
  );
  const record = rows && rows.length ? rows[0] : null;
  if (!record || new Date(record.expires_at).getTime() < Date.now()) {
    return new Response("link expired or invalid", { status: 403 });
  }
  const pack = packById(record.pack_id);
  // Format choice (Atlas's ruling, Nov 23, 2026): the same token
  // serves both formats; ?format=xlsx swaps the staged CSV key for
  // its XLSX sibling. No format parameter means CSV, so every link
  // already in a buyer's inbox keeps working exactly as before.
  const xlsx = url.searchParams.get("format") === "xlsx";
  let key = record.kind === "sample" ? pack.sample_file_key : pack.file_key;
  if (!key) return new Response("file not staged yet", { status: 404 });
  // B8: a sample key that IS an xlsx (the Free Sample Pack workbook)
  // serves as XLSX under either format parameter.
  const workbook = key.endsWith(".xlsx");
  if (xlsx && !workbook) key = key.replace(/\.csv$/, ".xlsx");
  const object = await storageObject(key);
  if (!object) return new Response("file not staged yet", { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type": (xlsx || workbook) ? XLSX_TYPE : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${key.split("/").pop()}"`,
    },
  });
}

/* ---------------- router ---------------- */

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const idx = url.pathname.indexOf("/api/");
  const path = idx >= 0 ? url.pathname.slice(idx) : url.pathname;
  try {
    if (req.method === "OPTIONS" && path.startsWith("/api/")) {
      const origin = req.headers.get("Origin") || "";
      const allowed = (env("ALLOWED_ORIGINS") || env("SITE_BASE")).split(",").map((s) => s.trim());
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : env("SITE_BASE"),
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }
    if (req.method === "POST" && path === "/api/checkout") return handleCheckout(req);
    if (req.method === "POST" && path === "/api/webhook") return handleWebhook(req);
    if (req.method === "POST" && path === "/api/sample") return handleSample(req);
    if (req.method === "POST" && path === "/api/admin/sync") return handleAdminSync(req);
    if (req.method === "POST" && path === "/api/admin/upload") return handleAdminUpload(req, url);
    if (req.method === "GET" && path === "/api/download") return handleDownload(req);
    return new Response("not found", { status: 404 });
  } catch (err) {
    return json({ error: "server_error" }, 500, req);
  }
});
