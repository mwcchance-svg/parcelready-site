# SUPERSEDED - RECORD ONLY (struck Nov 23, 2026, HQ order)

No Cloudflare Worker exists. No shell was ever created and no secret
was ever placed anywhere: Cloudflare was never reached (its sign in
Turnstile fails in the cloud browser even on an empty form), and the
route was abandoned on Matt's call, Nov 23, 2026. Route A is CLOSED.
The governing route is the Supabase port: supabase/DEPLOY-SHEET.md.
This sheet is retained only as the port spec record (the binding map
PACK_FILES, TOKENS, LEADS and the variables list, which transferred to
their Supabase equivalents). Any line below that speaks of an existing
shell or a placed secret is struck and does not describe reality.

# Dashboard deploy sheet: parcelready-store Worker (Route A)

One page. Everything the dashboard run needs, nothing else.

**Worker:** `parcelready-store`. STRUCK: there is no existing shell and no secret on it.
**Code:** one file, paste whole, no chunking or minifying needed:
`worker/dist/parcelready-store.single.js` (19,708 bytes, from the repo at
commit of this sheet). Paste it over the shell's code in Edit code and
Deploy. It contains NO key material; the key is read from the secret.

## Bindings (Settings, Variables and Bindings) - names are exact

- R2 bucket `parcelready-files` -> binding **PACK_FILES**
  (PACK_FILES, not FILES: the code reads env.PACK_FILES.)
- KV namespace (create, any name) -> binding **TOKENS**
- KV namespace (create, any name) -> binding **LEADS**

## Variables (plain text)

- SITE_BASE = https://parcelreadydata.com
- API_BASE = the Worker's own workers.dev origin shown on its dashboard
  page (for example https://parcelready-store.<account>.workers.dev)
- ALLOWED_ORIGINS = https://parcelreadydata.com,https://mwcchance-svg.github.io
- MAIL_FROM = ParcelReady <delivery@parcelreadydata.com>
- LEADS_INBOX = hello@parcelreadydata.com
- TAX_MODE = off

## Secrets (encrypted, Settings)

- STRIPE_SECRET_KEY: STRUCK. Nothing is placed anywhere. The key
  rotates once at the Supabase sitting and is placed screen to screen
  into the Supabase secrets form.
- ADMIN_TOKEN: optional. Any long random string; enables the bulk sync
  endpoint. If set, tell Mason it exists (not its value).
- RESEND_API_KEY: later step, skip now.

## R2 uploads (bucket parcelready-files, 20 objects)

Pack files are in ~/workspace/data-products/ on the workspace; sample
files are in the site repo under delivery/samples/. Upload each under
the key shown (the folder prefix is part of the key):

- packs/houston-hvac-pack-2026-11-16.csv
- packs/austin-sa-roofing-pack-2026-11-16.csv
- packs/dallas_absentee_longterm_full.csv
- packs/dallas_open_code_cases_v3.csv
- packs/dallas_permits_2026.csv
- packs/tarrant_tax_delinquent.csv
- packs/tarrant_absentee_longterm.csv
- packs/dallas_new_construction_permits_2026.csv
- packs/dallas_demolition_permits_2026.csv
- packs/collin_absentee_longterm.csv
- samples/houston-hvac-sample.csv
- samples/austin-sa-roofing-sample.csv
- samples/dallas-absentee-sample.csv
- samples/dallas-code-cases-sample.csv
- samples/dallas-permits-sample.csv
- samples/tarrant-tax-delinquent-sample.csv
- samples/tarrant-absentee-sample.csv
- samples/dallas-new-construction-sample.csv
- samples/dallas-demolition-sample.csv
- samples/collin-absentee-sample.csv

Largest file about 10.6 MB. Source file for key packs/<name> is
~/workspace/data-products/<name>; for samples/<name> it is
~/workspace/parcelready-site/delivery/samples/<name>.

## After Deploy

1. Visit the workers.dev origin: any path returns "not found" (that is
   the Worker answering; a 404 there is success at this step).
2. Report back: the workers.dev origin (Mason sets API_BASE records and
   the site's PR_API from it), whether ADMIN_TOKEN was set, and any
   binding the dashboard would not accept as named.
