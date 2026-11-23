# Supabase deploy sheet: parcelready-store Edge Function

One page. Dashboard route; if Anvil's Tool One mechanics used the CLI
for any step, that step swaps to his pattern without changing the rest.

**Function:** `parcelready-store`. **Code:** one file, paste whole:
`supabase/dist/parcelready-store.single.ts` (21,662 bytes, type-checked
with `deno check`, generated from supabase/src/index.ts with the pack
registry inlined). It contains NO key material.

## 1. Project

A Supabase project for ParcelReady (free tier), in the same account as
Tool One unless Anvil's mechanics say otherwise. Note the project ref;
the function base is https://<project-ref>.supabase.co/functions/v1/parcelready-store

## 2. Secrets FIRST (Edge Functions, Secrets) - before anything else

The key lands in its slot before any other build step because the
sitting's later steps depend on the secret being in place: the
function's first sync and checkout calls read it. No dialog is being
held open anywhere; the placement is a rotation at this step, not a
rescue. The secret slot is project level; it does not need the
function to exist.

Platform-injected, never entered by hand: SUPABASE_URL,
SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.

Set these:
- STRIPE_SECRET_KEY: the earlier value is gone (its reveal dialog
  closed during the abandoned Cloudflare attempt; it was never
  deposited anywhere we control). At this step the key ROTATES ONCE in
  the Stripe window (rotation needed no verification last time), the
  fresh value is revealed, and the agent places it screen to screen
  into this secret, the dialog under agent control end to end. FIRST,
  before the schema, the function, or storage.
- SITE_BASE = https://parcelreadydata.com
- API_BASE = https://<project-ref>.supabase.co/functions/v1/parcelready-store
- ALLOWED_ORIGINS = https://parcelreadydata.com,https://mwcchance-svg.github.io
- MAIL_FROM = ParcelReady <delivery@parcelreadydata.com>
- LEADS_INBOX = hello@parcelreadydata.com
- TAX_MODE = off
- ADMIN_TOKEN (optional): any long random string; enables the bulk
  sync endpoint. Report only that it exists, never its value.
- RESEND_API_KEY: later step, skip now.

Live and sandbox are separate universes: this key is live (rk_live).
Nothing from the ParcelReady sandbox account (a different account id)
goes anywhere near this project.

## 3. Schema (SQL editor, paste and run once)

`supabase/migrations/0001_store.sql`: four tables (delivery_tokens,
leads, store_config, price_map) with RLS on and no public policies, plus
the private Storage bucket `parcelready-files`.

## 4. Function (Edge Functions, create function parcelready-store)

Paste the single file as index.ts and deploy with **verify_jwt OFF**
(Stripe webhooks and browser calls carry no Supabase JWT; the design's
own signature and token checks are the gate).

## 5. Storage uploads (bucket parcelready-files, 22 objects)

Create folders packs/ and samples/ in the bucket, then upload. Pack
files are in ~/workspace/data-products/; sample files are in the site
repo under delivery/samples/. Keys:

- packs/houston-hvac-pack-2026-11-16.csv
- packs/houston-plumbing-pack-2026-11-22.csv
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
- samples/houston-plumbing-sample.csv
- samples/austin-sa-roofing-sample.csv
- samples/dallas-absentee-sample.csv
- samples/dallas-code-cases-sample.csv
- samples/dallas-permits-sample.csv
- samples/tarrant-tax-delinquent-sample.csv
- samples/tarrant-absentee-sample.csv
- samples/dallas-new-construction-sample.csv
- samples/dallas-demolition-sample.csv
- samples/collin-absentee-sample.csv

Largest file about 10.6 MB.

## 6. After deploy

1. GET the function base: any path returns "not found" (the function
   answering; a 404 there is success at this step).
2. Report to Mason: the project ref and function base, whether
   ADMIN_TOKEN was set, and any step the dashboard would not take.
3. Mason then: flips the first test pack to stripe mode, sets the
   site's PR_API to the function base in one site commit, and runs the
   live test purchase and refund (delivery email waits on Resend).
