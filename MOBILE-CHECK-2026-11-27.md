# Mobile check, first run — Nov 27, 2026 (Mason)

The customer-eyes tooling had no mobile verdict: Beacon's weekly pass
has carried "no mobile verdict possible" since it started. The check
now exists as `scripts/mobile_check.mjs` (Node, no dependencies,
drives the Playwright Chromium over CDP) and ran tonight against the
store's nine key pages.

Method: iPhone-class emulation (390x844 CSS px, deviceScaleFactor 3,
touch, mobile Safari user agent), real fonts (Archivo and IBM Plex
Mono served locally into the page, because this VM's Chromium cannot
load Google Fonts through the egress proxy and fallback fonts would
falsify text metrics), a real settle so animations finish, then per
page: document-level horizontal overflow, wide elements split into
uncontained vs contained (inside a clipping or scrolling ancestor),
tap targets under 44px, primary control heights, visible text under
12px, fixed or sticky elements over 15% of the viewport, images wider
than the screen or missing width/height attributes, and form label
effective opacity at rest (the A5 measure). A viewport and a full-page
screenshot per page, read customer-eyes for this verdict.

The run served the deployed tree locally; that tree is byte-identical
to the live store at the run's commit (the day's live byte checks:
cover WebP md5 match, live page greps). The tool takes `--base`, so
Beacon can run it against https://parcelreadydata.com directly from
any machine whose browser reaches the live origin.

## Verdict by page

PASS: sample, terms, both pack pages (Dallas Absentee, Kings
Multifamily), both state hubs (Texas, New York), and verify after the
fix below. FAIL: home and catalog, on one shared cause (finding 2).

## Findings

1. DEFECT, FIXED TONIGHT. The How We Verify page laid out at 490 CSS
   px on a 390 px phone: two step grids carried inline
   `grid-template-columns` styles that override the stylesheet's
   mobile collapse (`.steps` goes to one column at 900px), so the
   grids stayed multi-column and their min-content pushed the page a
   quarter wider than the screen. On a real phone the page renders
   zoomed out, every text a quarter smaller. Fix: the inline styles
   are gone; the two-column desktop intent moved to a `.steps-2`
   class in site.css where the 900px collapse still governs. Re-run
   measures verify at exactly 390 and the screenshot shows the cards
   stacked full width. Shipped in this commit.

2. FAIL, OPEN. Filter chips are 32px tall everywhere they appear:
   the home specimen explorer (4 chips) and the catalog filters (17
   chips: states, categories). 32px is under the 44px touch target
   guideline, and the catalog chips are the primary way to browse 55
   packs on a phone. Recommendation: raise the shared `.chip` rule to
   a 44px minimum height. Left open deliberately: it changes the
   filter bars' look on desktop too, so it is a design call for HQ
   and Beacon's next pass rather than a silent fix.

3. Small targets on the browsing path. State hub pack card links
   ("See what is inside", "Free sample") are 24px tall; the header
   "Get a free sample" CTA is 41px and the brand link 38px, both just
   under 44; footer text links are 16px (dense, but the conventional
   footer pattern). The 24px card links matter most: they are the
   tap that starts a purchase on the hubs.

4. Specimen preview tables are contained, not broken, but wide.
   Pack page preview tables (1,138 to 1,560px) sit inside their
   scroll wrappers, so the page never scrolls sideways; on a phone a
   buyer sees about 4 of 12+ columns and swipes for the rest. The
   preview is the trust centerpiece of the pack page; a mobile
   treatment (priority columns) is a design question for the next
   pass, recorded here with the measurement.

5. A5 closed with a measurement. On sample.html every visible form
   label rests at effective opacity 1 in emulation, and the viewport
   screenshot shows the capture labels at full cream contrast above
   large touch-friendly fields; the corrected "free 15 row sample"
   labels render in the form. One pack-page sample label instance
   rests at opacity 0 inside a below-fold reveal container (it fires
   on scroll; same family as A5, lower severity, noted for the next
   fix batch).

6. Layout-shift risk. Images without width/height attributes:
   catalog 56, Texas hub 47, New York hub 7, home 7. Cover WebPs can
   shift the layout as they load on mobile. Mechanical fix (stamp
   dimensions at build), candidate for the next build pass.

7. Clean where it counts. No page scrolls sideways at the document
   level on any of the nine pages. No fixed or sticky element eats
   the viewport. No image renders wider than the screen. Body text
   sizes are healthy; every sub-12px element is a mono micro-label
   (10.2 to 11.8px), by design.

Overall: the store is fundamentally sound on a phone. One real
layout defect (verify) is fixed and verified; one guideline failure
(32px filter chips) and three polish items (card link targets,
preview table treatment, image dimensions) are measured and open
for the next pass.

## Run record

First run of the unrefined tool hung on full-page captures at DSF 3
(the compositor surface cap) and was killed at 25 minutes; the tool
now captures full pages at DSF 1 with per-step timeouts and runs the
nine pages in about 30 seconds. Its first verdict logic also fired
on artifacts (the clipped home ticker, visually-hidden filter
labels); containment and faint-vs-hidden classification were added
the same night, and the findings above are from the refined run.
