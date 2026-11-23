# Dashboard deploy sheet: parcelready-store Worker (Route A)

One page. Everything the dashboard run needs, nothing else.

**Worker:** `parcelready-store` (the existing shell holding the secret).
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

- STRIPE_SECRET_KEY: already being placed on the shell; confirm it is
  listed. Do not re-enter or replace it.
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
