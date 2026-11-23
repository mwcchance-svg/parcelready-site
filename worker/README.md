# ParcelReady store worker: deploy sheet

Worker name: `parcelready-store` (matches wrangler.toml). Code:
`worker/src/index.js`. Registry: `worker/store-registry.json` (generated
by build.py, bundled into the Worker at deploy; redeploy after any
registry change).

## Bindings (exact names the code expects)

- R2 bucket `parcelready-files`, binding **PACK_FILES**
- KV namespace, binding **TOKENS** (delivery tokens, price map, config)
- KV namespace, binding **LEADS** (sample leads)
- Vars (in wrangler.toml): SITE_BASE, API_BASE (set to the Worker's real
  origin at deploy), ALLOWED_ORIGINS, MAIL_FROM, LEADS_INBOX,
  TAX_MODE = "off"
- Secrets, dashboard-set, never in files: **STRIPE_SECRET_KEY** (placed
  screen to screen from the Stripe reveal dialog), **RESEND_API_KEY**
  (later step), **ADMIN_TOKEN** (optional; enables /api/admin/sync)
- The webhook signing secret is NOT set by hand. The Worker registers
  its own endpoint and stores the secret in TOKENS as
  `config:webhook_secret`.

## R2 file inventory (20 objects)

Upload under these exact keys. Pack files come from
~/workspace/data-products/ (the delivery file each registry entry names);
sample files come from the site repo's delivery/samples/ folder.

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

Largest file is about 10.6 MB, inside dashboard upload limits.

## Route A: dashboard deploy (no wrangler auth needed)

1. Cloudflare dashboard, Workers and Pages: open the `parcelready-store`
   shell (the one holding the STRIPE_SECRET_KEY secret; dashboard-set
   secrets persist across code edits).
2. Create the R2 bucket `parcelready-files` and upload the 20 objects
   above (R2, parcelready-files, Upload).
3. Create two KV namespaces (Workers, KV): names of your choosing; the
   BINDING names are what matter: PACK_FILES is the R2 binding; the KV
   bindings are TOKENS and LEADS. Attach all three under the Worker's
   Settings, Variables and Bindings.
4. Set the vars from wrangler.toml; set API_BASE to the Worker's
   workers.dev origin shown on its dashboard page.
5. Replace the Worker code: Edit code, paste worker/src/index.js in
   full, and add worker/store-registry.json as a module the import can
   reach (the dashboard editor supports multiple files; keep the
   relative path ../store-registry.json from src/index.js, or adjust
   the import to the layout used and tell Mason which).
6. Deploy. Then run the post-deploy sequence below.

## Route B: wrangler (needs a Workers-scoped API token)

1. `wrangler r2 bucket create parcelready-files`
2. `wrangler kv namespace create TOKENS` and `... create LEADS`; put the
   returned ids in wrangler.toml in place of SET_AT_DEPLOY.
3. Upload the 20 objects: `wrangler r2 object put parcelready-files/<key>
   --file <path>` for each key above.
4. Set API_BASE in wrangler.toml to the workers.dev origin, then
   `wrangler deploy`. Secrets already set in the dashboard persist.

## Post-deploy sequence

1. Confirm STRIPE_SECRET_KEY is present on the Worker (dashboard shows
   the secret name; the value is never displayed again).
2. Bulk sync (optional; checkout also syncs lazily): if ADMIN_TOKEN was
   set, POST /api/admin/sync with header `x-admin-token`. This also
   registers the webhook endpoint and stores its signing secret.
   Without ADMIN_TOKEN, the first checkout for a pack creates its
   product and price on the spot and registers the webhook the same way.
3. Flip the first test pack to stripe mode in catalog.json, run
   build.py, commit the site (one commit) with PR_API in assets/site.js
   set to the Worker origin in the same change, push.
4. Live test purchase on that pack, verify the delivery email and the
   download, then refund in the Stripe dashboard. Report to HQ.
5. Resend signup (separate step, ParcelReady domain) unlocks delivery
   email; until RESEND_API_KEY is set, the Worker records leads and
   completes checkouts but sendEmail returns false, so step 4's email
   check waits for Resend or uses a dashboard-placed key.
