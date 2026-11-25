# Supabase deploy sheet: parcelready-store Edge Function

One page. Dashboard route; if Anvil's Tool One mechanics used the CLI
for any step, that step swaps to his pattern without changing the rest.

**Function:** `parcelready-store`. **Code:** one file, paste whole:
`supabase/dist/parcelready-store.single.ts` (76,328 bytes at
deployment 24, Nov 25, 2026; the size changes with every registry
build, so read it off the dist file at paste time; type-checked
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
- ADMIN_TOKEN (set at the Nov 23 window sitting): any long random string; enables the bulk
  sync endpoint and the admin upload endpoint (the landing pipeline's
  bucket route, packs/ and samples/ CSV keys only). HQ passes the
  value to Mason's desk. Report only that it exists, never its value.
- RESEND_API_KEY: later step, skip now.

Live and sandbox are separate universes: this key is live (rk_live).
Nothing from the ParcelReady sandbox account (a different account id)
goes anywhere near this project.

## 3. Schema (SQL editor, paste and run once)

`supabase/migrations/0001_store.sql`: four tables (delivery_tokens,
leads, store_config, price_map) with RLS on and no public policies, plus
the private Storage bucket `parcelready-files`.

**Grant step (learned live, Nov 23, 2026):** tables created by raw SQL
on a new Supabase project carry no Data API grants, and the service role
bypasses RLS but NOT table privileges, so the function's writes fail
with rest_403 until the grants land. In the same SQL sitting, run:
`grant all on all tables in schema public to service_role;`
`grant all on all sequences in schema public to service_role;`
plus matching `alter default privileges` statements so future tables
inherit the grants. Grant nothing to anon or authenticated; they stay
locked out by design.

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

## 7. Tax sitting (Matt's ruling, Nov 23, 2026)

In the Stripe dashboard window, in this order:

1. Settings, Tax: enable Stripe Tax on the ParcelReady account.
2. Add the Texas registration. The registration form asks for the Texas
   sales tax permit number, which is Matt's own item; the wiring does
   not wait on it, but this step does.
3. Redeploy the parcelready-store function from the current chunks
   (the tax wiring build), verify_jwt OFF as before.
4. Flip the TAX_MODE function secret to stripe_tax.
5. Verification legs (unpaid): a checkout call for houston-plumbing
   returns a session on the NEW inclusive price (the sync creates it
   and archives the pre-ruling price; the dashboard shows exactly one
   live price). Open the session URL: a Texas address shows the total
   holding at $79.00 with the tax broken out inside it; an out-of-state
   address (no registration) shows $79.00 with no tax. No card is
   entered and nothing is paid.

## Chunk relay discipline (Mason's lesson, Nov 23, 2026)

When the single-file build travels to HQ as chat messages, relay each
chunk ONLY from byte-window extractions (dd skip/count) small enough
to copy exactly (about 2,200 bytes per message for the one-line
registry chunk, about 4,500 for code chunks), and state each window's
byte range and its exact first and last characters in the message.
Never relay from a full-file read or from memory of the file: two
relays on Nov 23, 2026 overran their windows (an invented registry
continuation and a mistranscribed hmacHex line, plus a guarded
currency expression), each caught and corrected in-thread, with the
assembled md5 as the final guard. If a relay deviates, flag it the
moment it is noticed, name the exact correct line, and mark the bad
message DISCARD in a correction that reaches HQ before the paste.
