// ParcelReady store worker: checkout, delivery, and sample capture.
// All secrets arrive as environment bindings (see README.md). No key,
// account id, or price id is hard coded here. The pack registry is the
// generated store-registry.json, bundled at deploy time.

import registry from "../store-registry.json";

const enc = new TextEncoder();

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function packById(id) {
  return registry.packs.find((p) => p.id === id) || null;
}

async function hmacHex(secret, data) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sendEmail(env, { to, subject, text }) {
  // Delivery provider: Resend (free tier), key set at deploy time.
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.MAIL_FROM || "ParcelReady <delivery@parcelreadydata.com>",
      to, subject, text,
    }),
  });
  return res.ok;
}

async function mintDelivery(env, pack, email, kind) {
  const token = await hmacHex(env.DELIVERY_SECRET, `${pack.id}|${email}|${Date.now()}|${kind}`);
  await env.TOKENS.put(token, JSON.stringify({ pack: pack.id, email, kind }), {
    expirationTtl: 72 * 3600,
  });
  return `${env.SITE_BASE}/api/download?token=${token}`;
}

async function deliver(env, pack, email, kind) {
  const link = await mintDelivery(env, pack, email, kind);
  const what = kind === "sample" ? `the free sample of ${pack.title}` : pack.title;
  await sendEmail(env, {
    to: email,
    subject: `Your ParcelReady download: ${pack.title}`,
    text:
      `Here is ${what}.\n\nDownload (link good for 72 hours):\n${link}\n\n` +
      `Every ParcelReady product lists its source, its build date, and its limits on the label. ` +
      `If more than 2 percent of a mailing comes back undeliverable, tell us and we will make it right.\n\n` +
      `Questions: hello@parcelreadydata.com`,
  });
}

async function stripe(env, path, params) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params).toString(),
  });
  return res.json();
}

async function handleCheckout(request, env) {
  const { pack_id } = await request.json();
  const pack = packById(pack_id);
  if (!pack || pack.store.mode !== "stripe" || !pack.store.stripe_price_id) {
    return json({ error: "pack_not purchasable_here" }, 400);
  }
  const sub = pack.store.billing === "subscription";
  const params = {
    mode: sub ? "subscription" : "payment",
    "line_items[0][price]": pack.store.stripe_price_id,
    "line_items[0][quantity]": "1",
    success_url: `${env.SITE_BASE}/thanks.html?pack=${pack.id}`,
    cancel_url: `${env.SITE_BASE}/packs/${pack.id}.html`,
    "metadata[pack_id]": pack.id,
  };
  if (env.TAX_MODE === "stripe_tax") {
    params.automatic_tax = "true";
  }
  const session = await stripe(env, "checkout/sessions", params);
  if (!session.url) return json({ error: "checkout_failed" }, 502);
  return json({ url: session.url });
}

async function verifyStripe(request, env, raw) {
  const header = request.headers.get("stripe-signature") || "";
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=")));
  if (!parts.t || !parts.v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return false;
  const expected = await hmacHex(env.STRIPE_WEBHOOK_SECRET, `${parts.t}.${raw}`);
  return expected === parts.v1;
}

async function handleWebhook(request, env) {
  const raw = await request.text();
  if (!(await verifyStripe(request, env, raw))) {
    return new Response("bad signature", { status: 400 });
  }
  const event = JSON.parse(raw);
  if (event.type === "checkout.session.completed") {
    const s = event.data.object;
    const pack = packById(s.metadata && s.metadata.pack_id);
    const email = s.customer_details && s.customer_details.email;
    if (pack && email) await deliver(env, pack, email, "purchase");
  }
  if (event.type === "invoice.paid") {
    // Membership refresh delivery: the invoice's price maps back to a pack.
    const line = event.data.object.lines && event.data.object.lines.data[0];
    const priceId = line && line.price && line.price.id;
    const pack = registry.packs.find(
      (p) => p.store.stripe_price_id && p.store.stripe_price_id === priceId
    );
    const email = event.data.object.customer_email;
    // The first invoice is already covered by checkout.session.completed.
    if (pack && email && event.data.object.billing_reason !== "subscription_create") {
      await deliver(env, pack, email, "refresh");
    }
  }
  return json({ received: true });
}

async function handleSample(request, env) {
  const body = await request.json();
  const email = (body.email || "").trim();
  if (!email || !email.includes("@")) return json({ error: "email_required" }, 400);
  const lead = {
    at: new Date().toISOString(),
    business_name: body.business_name || "",
    email,
    trade: body.trade || "",
    state: body.state || "",
    metro: body.metro || "",
    reply_route: body.reply_route || "",
    pack_id: body.pack_id || "",
    source_page: body.source_page || "",
  };
  await env.LEADS.put(`lead:${lead.at}:${email}`, JSON.stringify(lead));
  await sendEmail(env, {
    to: env.LEADS_INBOX || "hello@parcelreadydata.com",
    subject: `ParcelReady sample lead: ${lead.trade || lead.pack_id} ${lead.state}`.trim(),
    text: JSON.stringify(lead, null, 2),
  });
  const pack = lead.pack_id ? packById(lead.pack_id) : null;
  if (pack && pack.sample_file_key) {
    await deliver(env, pack, email, "sample");
    return json({ ok: true, delivered: "sample" });
  }
  await sendEmail(env, {
    to: email,
    subject: "Your ParcelReady sample request",
    text:
      `Thanks for the request. The pack you asked about is in production or queued, ` +
      `so there is no sample file yet. The moment it passes verification, your sample rows ` +
      `come to this address first.\n\nQuestions: hello@parcelreadydata.com`,
  });
  return json({ ok: true, delivered: "queued" });
}

async function handleDownload(request, env) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return new Response("missing token", { status: 400 });
  const record = await env.TOKENS.get(token, "json");
  if (!record) return new Response("link expired or invalid", { status: 403 });
  const pack = packById(record.pack);
  const key = record.kind === "sample" ? pack.sample_file_key : pack.file_key;
  if (!key) return new Response("file not staged yet", { status: 404 });
  const object = await env.PACK_FILES.get(key);
  if (!object) return new Response("file not staged yet", { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${key.split("/").pop()}"`,
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (request.method === "POST" && url.pathname === "/api/checkout") return handleCheckout(request, env);
      if (request.method === "POST" && url.pathname === "/api/webhook") return handleWebhook(request, env);
      if (request.method === "POST" && url.pathname === "/api/sample") return handleSample(request, env);
      if (request.method === "GET" && url.pathname === "/api/download") return handleDownload(request, env);
      return new Response("not found", { status: 404 });
    } catch (err) {
      return json({ error: "server_error" }, 500);
    }
  },
};
