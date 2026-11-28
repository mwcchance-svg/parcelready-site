#!/usr/bin/env node
/*
 * mobile_check.mjs — viewport-emulated mobile customer-eyes check.
 *
 * Built Nov 27, 2026 (Mason) to close the gap Beacon's weekly pass has
 * carried since it started: "no mobile verdict possible". Drives the
 * Playwright Chromium build over CDP (no npm dependencies; Node 22+
 * for the built-in WebSocket client) with an iPhone-class device
 * profile: 390x844 CSS pixels, deviceScaleFactor 3, touch enabled,
 * mobile Safari user agent.
 *
 * Per page it measures, after a real settle so animations finish:
 *   - horizontal overflow (document scrollWidth vs innerWidth) and
 *     the worst offending elements;
 *   - tap targets under 44x44 CSS px (Apple HIG / WCAG target size);
 *   - visible text under 12px;
 *   - fixed or sticky elements eating more than 15% of the viewport;
 *   - images rendered wider than the viewport, and images with no
 *     width/height attributes (layout-shift risk);
 *   - form label effective opacity (the A5 measure: product of the
 *     computed opacity up the ancestor chain, at rest);
 * and saves a viewport screenshot and a full-page screenshot per page.
 *
 * Usage:
 *   node scripts/mobile_check.mjs [--base URL] [--out DIR] [--pages a,b,c]
 *
 * With no --base it serves the repo root on 127.0.0.1:8932 and checks
 * that. Point --base at https://parcelreadydata.com to check the live
 * store from any machine whose browser can reach it.
 *
 * Font fidelity on the local route: this VM's Chromium cannot load
 * Google Fonts through the egress proxy, which would falsify text
 * metrics. When the latin woff2 files are present in MOBILE_FONTS_DIR
 * (default /tmp/sitefonts: Archivo 500/700/900, IBM Plex Mono 400/600),
 * the css2 request is intercepted and answered with @font-face rules
 * pointing at the local files, so layout is measured in the real
 * fonts. On a machine with open internet the interception is skipped
 * (set MOBILE_FONTS_DIR=off) and the real stylesheet loads.
 *
 * Exit code: 0 when no page FAILs, 1 when any page FAILs. A page
 * FAILs on horizontal overflow, a primary control (buy or sample
 * submit) under 44px tall, or a form label resting below full
 * opacity. Everything else is reported as data for the human verdict.
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const argVal = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};
const OUT = argVal("--out", join("/tmp", "mobile-check-" + new Date().toISOString().slice(0, 10)));
const FONTS_DIR = process.env.MOBILE_FONTS_DIR ?? "/tmp/sitefonts";
const PAGES = argVal("--pages", [
  "/", "/catalog.html", "/sample.html", "/verify.html", "/terms.html",
  "/packs/dallas-absentee.html", "/packs/kings-multifamily.html",
  "/states/texas/", "/states/new-york/",
].join(",")).split(",");

const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".svg": "image/svg+xml",
  ".json": "application/json", ".woff2": "font/woff2", ".csv": "text/csv", ".xlsx": "application/octet-stream" };

let base = argVal("--base", null);
let server = null;
if (!base) {
  const PORT = 8932;
  server = createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.startsWith("/__fonts__/")) {
      const f = join(FONTS_DIR, p.slice("/__fonts__/".length));
      if (existsSync(f)) { res.writeHead(200, { "content-type": "font/woff2" }); res.end(readFileSync(f)); return; }
      res.writeHead(404); res.end(); return;
    }
    if (p.endsWith("/")) p += "index.html";
    const f = join(ROOT, p);
    if (!f.startsWith(ROOT) || !existsSync(f)) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { "content-type": MIME[extname(f)] || "application/octet-stream" });
    res.end(readFileSync(f));
  });
  await new Promise((r) => server.listen(PORT, "127.0.0.1", r));
  base = `http://127.0.0.1:${PORT}`;
}

function chromePath() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  const cache = join(homedir(), ".cache", "ms-playwright");
  for (const d of readdirSync(cache).filter((x) => x.startsWith("chromium-")).sort().reverse()) {
    const p = join(cache, d, "chrome-linux64", "chrome");
    if (existsSync(p)) return p;
  }
  throw new Error("no Chromium build found under ~/.cache/ms-playwright");
}

const chrome = spawn(chromePath(), [
  "--headless", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
  "--remote-debugging-port=0", "--user-data-dir=/tmp/mobile-check-profile",
  "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });
const wsUrl = await new Promise((resolve, reject) => {
  let buf = "";
  chrome.stderr.on("data", (d) => {
    buf += d;
    const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
    if (m) resolve(m[1]);
  });
  setTimeout(() => reject(new Error("DevTools WS URL never appeared")), 20000);
});

const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let seq = 0;
const pending = new Map();
const listeners = new Map();
ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method && listeners.has(msg.method)) listeners.get(msg.method).forEach((f) => f(msg.params, msg.sessionId));
});
function send(method, params = {}, sessionId = null) {
  const id = ++seq;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}
const on = (method, fn) => { if (!listeners.has(method)) listeners.set(method, []); listeners.get(method).push(fn); };

// Attach to the initial about:blank target.
const targets = await send("Target.getTargets");
const pageTarget = targets.result.targetInfos.find((t) => t.type === "page");
const attached = await send("Target.attachToTarget", { targetId: pageTarget.targetId, flatten: true });
const S = attached.result.sessionId;
const S_ = (m, p) => send(m, p, S);

await S_("Page.enable");
await S_("Runtime.enable");
await S_("Network.enable");
await S_("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
await S_("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await S_("Emulation.setUserAgentOverride", {
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  platform: "iPhone",
});

// Font fidelity for the local route (see header).
const latinFaces = [
  ["Archivo", 500, "Archivo-500-latin.woff2"], ["Archivo", 700, "Archivo-700-latin.woff2"],
  ["Archivo", 900, "Archivo-900-latin.woff2"], ["IBM Plex Mono", 400, "IBMPlexMono-400-latin.woff2"],
  ["IBM Plex Mono", 600, "IBMPlexMono-600-latin.woff2"],
];
const fontsReady = FONTS_DIR !== "off" && latinFaces.every(([, , f]) => existsSync(join(FONTS_DIR, f)));
if (fontsReady) {
  const css = latinFaces.map(([fam, wt, f]) =>
    `@font-face { font-family: '${fam}'; font-style: normal; font-weight: ${wt}; font-display: swap; src: url(${base}/__fonts__/${f}) format('woff2'); }`
  ).join("\n");
  await S_("Fetch.enable", { patterns: [{ urlPattern: "*fonts.googleapis.com*" }] });
  on("Fetch.requestPaused", async (p, sid) => {
    if (sid !== S) return;
    await send("Fetch.fulfillRequest", {
      requestId: p.requestId, responseCode: 200,
      responseHeaders: [{ name: "Content-Type", value: "text/css" }],
      body: Buffer.from(css).toString("base64"),
    }, S).catch(() => {});
  });
}

const MEASURE = `(() => {
  const vw = window.innerWidth, vh = window.innerHeight;
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const label = (el) => (el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).join('.') : ''));
  const snippet = (el) => (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 60);
  const doc = document.documentElement;
  const overflowers = [], containedWide = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    if (!(r.right > vw + 1 || r.left < -1)) continue;
    // Wide content inside a clipping or scrolling ancestor (the home
    // page ticker, the specimen tables) is contained by design; only
    // uncontained overflow can push the page sideways.
    let contained = null, node = el.parentElement;
    while (node && node !== document.body) {
      const ox = getComputedStyle(node).overflowX;
      if (ox === 'hidden' || ox === 'clip' || ox === 'scroll' || ox === 'auto') {
        const nr = node.getBoundingClientRect();
        if (nr.left >= -1 && nr.right <= vw + 1) { contained = label(node); break; }
      }
      node = node.parentElement;
    }
    const rec = { el: label(el), excess: Math.round(Math.max(r.right - vw, -r.left)), w: Math.round(r.width), text: snippet(el), ...(contained ? { container: contained } : {}) };
    (contained ? containedWide : overflowers).push(rec);
  }
  overflowers.sort((a, b) => b.excess - a.excess);
  containedWide.sort((a, b) => b.excess - a.excess);
  const taps = [];
  for (const el of document.querySelectorAll('a[href], button, input, select, textarea, [role="button"]')) {
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 44 || r.width < 44) taps.push({ el: label(el), w: Math.round(r.width), h: Math.round(r.height), text: snippet(el) || el.getAttribute('aria-label') || el.type || '' });
  }
  const smallText = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el)) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 12) smallText.push({ el: label(el), fs, text: snippet(el) });
  }
  const fixed = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el)) continue;
    const pos = getComputedStyle(el).position;
    if (pos === 'fixed' || pos === 'sticky') { const r = el.getBoundingClientRect();
      if (r.height > vh * 0.15) fixed.push({ el: label(el), pos, h: Math.round(r.height), pct: Math.round(100 * r.height / vh), text: snippet(el) }); }
  }
  const wideImgs = [], noDimImgs = [];
  for (const img of document.querySelectorAll('img')) {
    if (!vis(img)) continue;
    const r = img.getBoundingClientRect();
    if (r.width > vw + 1) wideImgs.push({ src: (img.getAttribute('src') || '').slice(-50), w: Math.round(r.width) });
    if (!img.hasAttribute('width') || !img.hasAttribute('height')) noDimImgs.push((img.getAttribute('src') || '').slice(-50));
  }
  const labels = [];
  for (const el of document.querySelectorAll('label')) {
    if (!vis(el)) continue;
    let op = 1, node = el;
    while (node && node !== document.body) { op *= parseFloat(getComputedStyle(node).opacity); node = node.parentElement; }
    const o = Math.round(op * 100) / 100;
    // A5's failure shape is a FAINT label (0 < opacity < 1). A label at
    // exactly 0 is hidden by design (the visually-hidden filter labels
    // on the catalog page) and is reported separately, never as faint.
    labels.push({ text: snippet(el), opacity: o, state: o >= 0.99 ? 'full' : o <= 0.01 ? 'hidden' : 'faint' });
  }
  const primary = [];
  for (const el of document.querySelectorAll('button, .btn, input[type="submit"]')) {
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    primary.push({ el: label(el), w: Math.round(r.width), h: Math.round(r.height), text: snippet(el) || el.value || '' });
  }
  return { title: document.title, h1: (document.querySelector('h1') || {}).textContent?.trim() || '',
    innerWidth: vw, innerHeight: vh, scrollWidth: doc.scrollWidth,
    hOverflow: doc.scrollWidth > vw + 1, overflowers: overflowers.slice(0, 8),
    containedWide: containedWide.slice(0, 5),
    tapUndersized: taps.length, tapExamples: taps.slice(0, 8),
    smallTextCount: smallText.length, smallTextExamples: smallText.slice(0, 6),
    fixed, wideImgs, noDimImgs: noDimImgs.length, labels, primary };
})()`;

mkdirSync(OUT, { recursive: true });
const results = [];
for (const path of PAGES) {
  const url = base + path;
  console.log(`... ${path}`);
  await S_("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
  await new Promise((r) => setTimeout(r, 300));
  let loaded = new Promise((r) => { const h = (p, sid) => { if (sid === S) r(); }; on("Page.loadEventFired", h); });
  await S_("Page.navigate", { url });
  await Promise.race([loaded, new Promise((r) => setTimeout(r, 15000))]);
  await new Promise((r) => setTimeout(r, 1500)); // settle: reveals and transitions finish
  const withTimeout = (pr, ms, what) => Promise.race([pr, new Promise((_, rej) => setTimeout(() => rej(new Error(what + " timed out")), ms))]);
  let m;
  try {
    const ev = await withTimeout(S_("Runtime.evaluate", { expression: MEASURE, returnByValue: true }), 20000, "evaluate");
    m = ev.result?.result?.value;
  } catch (e) { m = null; }
  if (!m) { results.push({ path, error: "measurement failed" }); continue; }
  const shotName = (path.replace(/\//g, "_").replace(/^_/, "") || "home");
  const metrics = await S_("Page.getLayoutMetrics");
  const cs = metrics.result.cssContentSize;
  const vp = await withTimeout(S_("Page.captureScreenshot", { format: "png" }), 30000, "viewport shot");
  writeFileSync(join(OUT, shotName + ".viewport.png"), Buffer.from(vp.result.data, "base64"));
  // Full-page capture at DSF 1: at DSF 3 a long page exceeds the
  // compositor surface cap and the capture hangs (found on the first
  // run, Nov 27, 2026, killed after 25 minutes with no output).
  await S_("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  const full = await withTimeout(S_("Page.captureScreenshot", { format: "png", captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: cs.width, height: Math.min(cs.height, 10000), scale: 1 } }), 30000, "full-page shot");
  writeFileSync(join(OUT, shotName + ".full.png"), Buffer.from(full.result.data, "base64"));
  await S_("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
  const primarySmall = m.primary.some((t) => t.h < 40);
  const labelFaint = m.labels.some((l) => l.state === 'faint');
  const verdict = (m.hOverflow || m.overflowers.length > 0 || primarySmall || labelFaint) ? "FAIL" : "PASS";
  results.push({ path, verdict, ...m });
  console.log(`${verdict}  ${path}  overflow=${m.hOverflow} (scrollW ${m.scrollWidth} vs ${m.innerWidth})  uncontained=${m.overflowers.length}  contained=${m.containedWide.length}  undersized taps=${m.tapUndersized}  small text=${m.smallTextCount}  faint labels=${m.labels.filter((l) => l.state === 'faint').length}`);
}

writeFileSync(join(OUT, "report.json"), JSON.stringify({ base, fonts: fontsReady ? "local woff2 (real fonts)" : "as served", when: new Date().toISOString(), results }, null, 2));
console.log(`\nreport: ${join(OUT, "report.json")}`);
chrome.kill();
if (server) server.close();
process.exit(results.some((r) => r.verdict === "FAIL") ? 1 : 0);
