window.CATALOG = {
 "coming_soon": [
  {
   "family": "trade",
   "metro": "Houston first",
   "status": "In production",
   "trade": "Electrical",
   "states": [
    "TX"
   ],
   "launch_price": 79
  },
  {
   "family": "trade",
   "metro": "Houston",
   "status": "In production",
   "trade": "Roofing",
   "states": [
    "TX"
   ]
  },
  {
   "family": "trade",
   "metro": "Houston",
   "status": "Queued",
   "trade": "Pools",
   "states": [
    "TX"
   ],
   "launch_price": 79
  },
  {
   "family": "trade",
   "metro": "Houston",
   "status": "Queued",
   "trade": "Lawn Care and Landscaping",
   "states": [
    "TX"
   ],
   "launch_price": 79
  },
  {
   "family": "trade",
   "metro": "Houston",
   "status": "Queued",
   "trade": "Concrete",
   "states": [
    "TX"
   ],
   "launch_price": 79
  },
  {
   "family": "trade",
   "metro": "Houston",
   "status": "Queued",
   "trade": "Garage Door Repair",
   "states": [
    "TX"
   ],
   "launch_price": 59
  },
  {
   "family": "county",
   "metro": "Denton County",
   "status": "Queued",
   "trade": "Absentee Owners",
   "states": [
    "TX"
   ]
  },
  {
   "family": "county",
   "metro": "Dallas County",
   "status": "Queued",
   "trade": "Multi-Property Landlords, 5+",
   "states": [
    "TX"
   ]
  },
  {
   "family": "county",
   "metro": "Harris County",
   "status": "Source check first",
   "trade": "Absentee Owners",
   "states": [
    "TX"
   ]
  },
  {
   "family": "county",
   "metro": "Texas, one county",
   "status": "Pilot",
   "trade": "Absentee Land Owners, pilot",
   "states": [
    "TX"
   ]
  }
 ],
 "generated_note": "Source of truth for the ParcelReady catalog. Add a row here and rerun build.py; the pack page, catalog card, and browse filters update with no redesign. Prices, counts and links are copied from the governing store records (LISTINGS.md, LAUNCH-LOG.md, PRICE-AUDIT-2026-11-16.md, pack LISTING-COPY.md files). Never reconstruct them from memory. State-first spec (Matt via HQ, Nov 22, 2026): every pack carries state, category, data_as_of (fed by Relay's refresh system; update the date here when a pack refreshes and rerun build.py), and a sample_csv source so every pack page carries a viewable sample. State hubs and state x category pages are generated for all 50 states and the full category taxonomy. Store revision (Matt via HQ, Nov 22, 2026): purchases for the new national catalog run on parcelreadydata.com through Stripe, created programmatically from this registry by scripts/stripe_sync.py; delivery is automated (see STORE-ARCHITECTURE.md). The 13 existing products keep mode gumroad as a feeder shelf.",
 "metros_ranked": [
  "Houston",
  "Phoenix",
  "Atlanta",
  "Tampa",
  "Orlando",
  "Charlotte",
  "Austin",
  "San Antonio",
  "Nashville",
  "Las Vegas",
  "Denver"
 ],
 "packs": [
  {
   "build_date": "November 16, 2026",
   "buy_url": "https://parcelready.gumroad.com/l/eqpouk",
   "buyer": "Agencies, answering services, and sales teams who prospect local HVAC operators",
   "cover": "assets/covers/hvac-pack.png",
   "family": "trade",
   "featured": true,
   "id": "houston-hvac",
   "inside": [
    "Business name and base city, 37 suburbs and neighborhoods from Conroe and The Woodlands to League City and Texas City",
    "Website and published phone on all 137 rows",
    "Published email on 43 rows, transcribed exactly as the business prints it, with the source page recorded",
    "Contact form status and form page URL, 42 confirmed contact or quote forms",
    "Public rating and review count where the business shows them",
    "Gap flags for targeting: no published email, no contact form, no online booking, no website"
   ],
   "limits": "Most small HVAC operators do not publish an email, which is why the email count is 43 and not 137. This pack tells you the truth about each business instead of padding the file with guessed addresses. Data is a dated November 2026 snapshot; the pack is fully re-verified monthly. Files: CSV and XLSX.",
   "metro": "Houston",
   "price": 79,
   "price_note": "one time",
   "rows": 137,
   "rows_label": "137 verified companies",
   "sample_cover": "assets/covers/hvac-sample.png",
   "sample_label": "Free 15 row sample",
   "sample_url": "https://parcelready.gumroad.com/l/phyzm",
   "stats": [
    {
     "k": "Verified companies",
     "v": "137"
    },
    {
     "k": "Rows with a phone",
     "v": "137"
    },
    {
     "k": "Verified emails",
     "v": "43"
    },
    {
     "k": "Confirmed forms",
     "v": "42"
    }
   ],
   "tagline": "137 verified local leads with phones, emails and gap flags",
   "title": "Houston HVAC Companies",
   "trade": "HVAC",
   "state": "TX",
   "category": "HVAC",
   "data_as_of": "2026-11-16",
   "sample_csv": "lead:houston-hvac",
   "store": {
    "mode": "stripe",
    "delivery_file": "lead-packs/houston-hvac/houston-hvac-pack-2026-11-16.csv + .xlsx",
    "billing": "one_time",
    "stripe_product_id": null,
    "stripe_price_id": null
   },
   "metro_id": "houston",
   "coverage": "Houston metro",
   "refresh_schedule": "Fully re-verified monthly",
   "membership": {
    "price": 79,
    "per": "quarter"
   }
  },
  {
   "build_date": "November 22, 2026",
   "buyer": "Agencies, answering services, and sales teams who prospect local plumbing companies",
   "cover": "assets/covers/plumbing-pack.png",
   "family": "trade",
   "id": "houston-plumbing",
   "inside": [
    "Business name and base city, 36 cities from Houston and Katy to Kingwood, The Woodlands, Magnolia, and Baytown",
    "Website and published phone on all 135 rows",
    "Published email on 42 rows, transcribed exactly as the business prints it, with the source page recorded",
    "Contact form status and form page URL, 90 confirmed contact or quote forms",
    "Public rating and review count where the business shows them",
    "Gap flags for targeting: no published email, no contact form, no online booking, no reviews found, low rating",
    "Maintenance plan and membership offers: 16 companies publish one, plan names recorded verbatim"
   ],
   "limits": "Most small plumbing operators do not publish an email, which is why the email count is 42 and not 135. Four rows carry a form status we could not confirm from the published pages, and the file says so rather than guess. This pack tells you the truth about each business instead of padding the file with guessed addresses. Data is a dated November 2026 snapshot; the pack is fully re-verified monthly. Files: CSV and XLSX.",
   "metro": "Houston",
   "price": 79,
   "price_note": "one time",
   "rows": 135,
   "rows_label": "135 verified companies",
   "sample_cover": "assets/covers/plumbing-sample.png",
   "sample_label": "Free 15 row sample",
   "sample_url": "https://parcelreadydata.com/packs/houston-plumbing.html",
   "stats": [
    {
     "k": "Verified companies",
     "v": "135"
    },
    {
     "k": "Rows with a phone",
     "v": "135"
    },
    {
     "k": "Verified emails",
     "v": "42"
    },
    {
     "k": "Confirmed forms",
     "v": "90"
    }
   ],
   "tagline": "135 verified local leads with phones, emails and gap flags",
   "title": "Houston Plumbing Companies",
   "trade": "Plumbing",
   "state": "TX",
   "category": "Plumbing",
   "data_as_of": "2026-11-22",
   "sample_csv": "lead:houston-plumbing",
   "store": {
    "mode": "stripe",
    "delivery_file": "lead-packs/houston-plumbing/houston-plumbing-pack-2026-11-22.csv + .xlsx",
    "billing": "one_time",
    "stripe_product_id": null,
    "stripe_price_id": null
   },
   "metro_id": "houston",
   "coverage": "Houston metro",
   "refresh_schedule": "Fully re-verified monthly",
   "membership": {
    "price": 79,
    "per": "quarter"
   }
  },
  {
   "build_date": "November 16, 2026",
   "buy_url": "https://parcelready.gumroad.com/l/keddu",
   "buyer": "Agencies and reps who sell to roofers",
   "cover": "assets/covers/roofing-pack.png",
   "family": "trade",
   "featured": false,
   "id": "austin-sa-roofing",
   "inside": [
    "Business name, base city, website, and a published phone on all 130 rows",
    "Published email on 68 rows, each transcribed exactly from the company's own site with the source page recorded",
    "Contact form status with the form page URL, 47 confirmed",
    "Public rating and review count where the company shows them",
    "Gap flags for targeting: no published email, no contact form, no online booking",
    "Plan or membership offers the company publishes on its own site, 6 found, plan names recorded verbatim"
   ],
   "limits": "An email is listed only where the company publishes one itself; 68 of 130 do, and that is the real rate for this trade, not a shortfall we hid. Small independent operators only: national chains, franchise locations, and lead generation template sites were screened out. Dated November 2026 snapshot, fully re-verified monthly. License: one business, use it across your own campaigns; do not resell or redistribute the raw file.",
   "metro": "Austin to San Antonio",
   "price": 79,
   "price_note": "one time",
   "rows": 130,
   "rows_label": "130 verified companies",
   "sample_cover": "assets/covers/roofing-sample.png",
   "sample_label": "Free 15 row sample",
   "sample_url": "https://parcelready.gumroad.com/l/bwtfap",
   "stats": [
    {
     "k": "Verified companies",
     "v": "130"
    },
    {
     "k": "Corridor cities",
     "v": "26"
    },
    {
     "k": "Verified emails",
     "v": "68"
    },
    {
     "k": "Confirmed forms",
     "v": "47"
    }
   ],
   "tagline": "130 verified local leads across 26 corridor cities",
   "title": "Austin to San Antonio Roofing Companies",
   "trade": "Roofing",
   "state": "TX",
   "category": "Roofing",
   "data_as_of": "2026-11-16",
   "sample_csv": "lead:austin-sa-roofing",
   "store": {
    "mode": "stripe",
    "delivery_file": "lead-packs/austin-sa-roofing/austin-sa-roofing-pack-2026-11-16.csv + .xlsx",
    "billing": "one_time",
    "stripe_product_id": null,
    "stripe_price_id": null
   },
   "metro_id": "austin-san-antonio",
   "coverage": "26 corridor cities, Austin to San Antonio",
   "refresh_schedule": "Fully re-verified monthly",
   "membership": {
    "price": 79,
    "per": "quarter"
   }
  },
  {
   "build_date": "October 12, 2026 data",
   "buy_url": "https://parcelready.gumroad.com/l/nwxhps",
   "buyer": "Real estate investors, wholesalers, and direct mail marketers working Dallas County",
   "cover": "assets/covers/dallas-absentee.png",
   "family": "county",
   "featured": false,
   "id": "dallas-absentee",
   "inside": [
    "Owner name and owner mailing address, city, state, and ZIP",
    "Property address, city, and ZIP",
    "Latest appraised market value, median $273,185 across the file",
    "Year built, bedrooms, full baths, living area square feet",
    "Deed transfer date and years owned",
    "DCAD account number on every record, for verification"
   ],
   "limits": "Built from the Dallas Central Appraisal District's current ownership file, not scraped and not resold from another list vendor. Every record passed an owner occupied check: if the mailing address matched the property address, it is not on this list. Values are county appraised values, not sale prices. Years of ownership is an equity signal, not a mortgage balance. If this pack does not match what its page promised, tell us within 30 days and we will fix it or refund the pack.",
   "metro": "Dallas County",
   "price": 49,
   "price_note": "one time",
   "rows": 53887,
   "rows_label": "53,887 records",
   "sample_label": "Free sample pack",
   "sample_url": "https://parcelready.gumroad.com/l/shdtbi",
   "stats": [
    {
     "k": "Records",
     "v": "53,887"
    },
    {
     "k": "Columns",
     "v": "16"
    },
    {
     "k": "Median value",
     "v": "$273,185"
    },
    {
     "k": "Ownership filter",
     "v": "11+ years"
    }
   ],
   "tagline": "53,887 owners who get their tax mail somewhere else, 11+ years of ownership",
   "title": "Dallas County Absentee Owners, Long Term",
   "trade": "Absentee Owners",
   "state": "TX",
   "category": "Real Estate",
   "data_as_of": "2026-10-12",
   "sample_csv": "dallas_absentee_longterm_sample100.csv",
   "store": {
    "mode": "stripe",
    "delivery_file": "dallas_absentee_longterm_full.csv",
    "billing": "one_time",
    "stripe_product_id": null,
    "stripe_price_id": null
   },
   "metro_id": "dfw",
   "coverage": "Dallas County",
   "refresh_schedule": "Refreshed monthly, plus a full rebuild after each annual certified roll",
   "membership": {
    "price": 49,
    "per": "quarter",
    "statewide_price": 199
   }
  },
  {
   "build_date": "Live city data, refreshed weekly",
   "buy_url": "https://parcelready.gumroad.com/l/xlvkiz",
   "buyer": "Investors and contractors who work early distress signals",
   "cover": "assets/covers/code-cases.png",
   "family": "county",
   "featured": false,
   "id": "dallas-code-cases",
   "inside": [
    "Case number, case type, status, and date opened, with days open",
    "Property address and ZIP",
    "Owner name and owner mailing address, matched to the county appraisal roll",
    "Latest appraised market value",
    "DCAD account number on matched records",
    "Match rate published in every refresh: 86 percent (6,260 of 7,260) on the current build"
   ],
   "limits": "Dallas publishes the case, not the inspector's notes, so the file tells you a property has an open code problem and how long it has been open, not the specific violation detail. Unmatched cases are included and clearly flagged; owners are never guessed. Subscription only, because stale code data is worthless. That is the point of the refresh.",
   "metro": "Dallas",
   "price": 79,
   "price_note": "per month, refreshed weekly",
   "rows": 7260,
   "rows_label": "7,260 open cases",
   "sample_label": "Free sample pack",
   "sample_url": "https://parcelready.gumroad.com/l/shdtbi",
   "stats": [
    {
     "k": "Open cases",
     "v": "7,260"
    },
    {
     "k": "Owner matched",
     "v": "86%"
    },
    {
     "k": "Refresh",
     "v": "Weekly"
    },
    {
     "k": "Source",
     "v": "City 311 + DCAD"
    }
   ],
   "tagline": "7,260 open cases with the property owner matched and attached",
   "title": "Dallas Open Code Cases, Owner Matched",
   "trade": "Code Cases",
   "state": "TX",
   "category": "Real Estate",
   "data_as_of": "2026-11-16",
   "sample_csv": "dallas_open_code_cases_v3_sample100.csv",
   "store": {
    "mode": "stripe",
    "delivery_file": "dallas_open_code_cases_v3.csv",
    "billing": "subscription",
    "stripe_product_id": null,
    "stripe_price_id": null
   },
   "metro_id": "dfw",
   "coverage": "City of Dallas",
   "refresh_schedule": "Refreshed weekly",
   "membership": {
    "price": 79,
    "per": "month"
   }
  },
  {
   "build_date": "2026 permit year",
   "buy_url": "https://parcelready.gumroad.com/l/hazks",
   "buyer": "Contractors, suppliers, and investors watching who is building what, and where",
   "cover": "assets/covers/permits.png",
   "family": "county",
   "featured": false,
   "id": "dallas-permits",
   "inside": [
    "Permit number, permit type, and issue date",
    "Street address and ZIP",
    "Contractor name where the city publishes it",
    "Declared project value, $3.77 billion across the file",
    "Area, work description, and land use",
    "The mix: 12,079 residential plumbing permits, 6,922 residential electrical, 2,953 commercial alterations, 2,142 new residential construction"
   ],
   "limits": "Declared values are what applicants wrote on the permit, and contractors are listed only where the city publishes them. This is the city's own data, cleaned and organized, nothing added and nothing invented.",
   "metro": "Dallas",
   "price": 49,
   "price_note": "one time",
   "rows": 55920,
   "rows_label": "55,920 permits",
   "sample_label": "Free sample pack",
   "sample_url": "https://parcelready.gumroad.com/l/shdtbi",
   "stats": [
    {
     "k": "Permits",
     "v": "55,920"
    },
    {
     "k": "Declared value",
     "v": "$3.77B"
    },
    {
     "k": "Coverage",
     "v": "Full year 2026"
    },
    {
     "k": "Format",
     "v": "CSV"
    }
   ],
   "tagline": "All 55,920 permits with contractors and project values",
   "title": "Dallas Building Permits 2026, Full Year",
   "trade": "Building Permits",
   "state": "TX",
   "category": "Construction",
   "data_as_of": "2026-11-09",
   "sample_csv": "dallas_permits_2026_sample100.csv",
   "store": {
    "mode": "stripe",
    "delivery_file": "dallas_permits_2026.csv",
    "billing": "one_time",
    "stripe_product_id": null,
    "stripe_price_id": null
   },
   "metro_id": "dfw",
   "coverage": "City of Dallas",
   "refresh_schedule": "Refreshed monthly, plus a January close-out build",
   "membership": {
    "price": 49,
    "per": "quarter"
   }
  },
  {
   "build_date": "Tax roll dated November 6, 2026",
   "buy_url": "https://parcelready.gumroad.com/l/usszp",
   "buyer": "Investors who work the oldest motivated seller signal there is",
   "cover": "assets/covers/tarrant-tax.png",
   "family": "county",
   "featured": false,
   "id": "tarrant-tax-delinquent",
   "inside": [
    "Owner name and mailing address",
    "Property address",
    "Appraised market value",
    "Current year amount due and prior year amount due",
    "Total amount due, median $3,328, sorted largest first",
    "County tax account number on every record"
   ],
   "limits": "Pulled from the county tax office's own weekly tax roll, the same records the collector bills from, not a resold scrape. Delinquent means a prior year balance is still open on the roll as of the run date. Balances change daily as owners pay. Amounts are base tax figures and do not include every penalty or fee a collector may add later.",
   "metro": "Tarrant County",
   "price": 49,
   "price_note": "one time",
   "rows": 12393,
   "rows_label": "12,393 accounts",
   "sample_label": "Free sample pack",
   "sample_url": "https://parcelready.gumroad.com/l/shdtbi",
   "stats": [
    {
     "k": "Accounts",
     "v": "12,393"
    },
    {
     "k": "Median total due",
     "v": "$3,328"
    },
    {
     "k": "Source",
     "v": "County tax roll"
    },
    {
     "k": "Sort",
     "v": "Largest owed first"
    }
   ],
   "tagline": "12,393 residential accounts that still owe prior year taxes",
   "title": "Tarrant County Tax Delinquent Properties",
   "trade": "Tax Delinquent",
   "state": "TX",
   "category": "Real Estate",
   "data_as_of": "2026-11-06",
   "sample_csv": "tarrant_tax_delinquent_sample100.csv",
   "store": {
    "mode": "stripe",
    "delivery_file": "tarrant_tax_delinquent.csv",
    "billing": "one_time",
    "stripe_product_id": null,
    "stripe_price_id": null
   },
   "metro_id": "dfw",
   "coverage": "Tarrant County",
   "refresh_schedule": "Refreshed monthly, plus a full rebuild after each annual certified roll",
   "membership": {
    "price": 49,
    "per": "quarter"
   }
  },
  {
   "build_date": "County tax roll, weekly source",
   "buy_url": "https://parcelready.gumroad.com/l/sgwua",
   "buyer": "Investors who work Tarrant County by street and neighborhood",
   "cover": "assets/covers/tarrant-absentee.png",
   "family": "county",
   "featured": false,
   "id": "tarrant-absentee",
   "inside": [
    "Owner name and mailing address",
    "Property street address",
    "Appraised market value",
    "Date of deed and years owned",
    "Tax account number on every record"
   ],
   "limits": "Priced for exactly what it is, and here is why it costs less than the Dallas list: the tax roll does not publish the property's city or ZIP, or its beds, baths, and square feet, so this file is thinner than the Dallas County version. If you mail by ZIP, buy Dallas. If you work Tarrant by street and neighborhood, this is your list.",
   "metro": "Tarrant County",
   "price": 39,
   "price_note": "one time",
   "rows": 31156,
   "rows_label": "31,156 records",
   "sample_label": "Free sample pack",
   "sample_url": "https://parcelready.gumroad.com/l/shdtbi",
   "stats": [
    {
     "k": "Records",
     "v": "31,156"
    },
    {
     "k": "Ownership filter",
     "v": "11+ years"
    },
    {
     "k": "Value floor",
     "v": "$150,000"
    },
    {
     "k": "Source",
     "v": "County tax roll"
    }
   ],
   "tagline": "31,156 Fort Worth side owners holding 11+ years, value $150,000 and up",
   "title": "Tarrant County Absentee Owners, Long Term",
   "trade": "Absentee Owners",
   "state": "TX",
   "category": "Real Estate",
   "data_as_of": "2026-11-09",
   "sample_csv": "tarrant_absentee_longterm_sample100.csv",
   "store": {
    "mode": "stripe",
    "delivery_file": "tarrant_absentee_longterm.csv",
    "billing": "one_time",
    "stripe_product_id": null,
    "stripe_price_id": null
   },
   "metro_id": "dfw",
   "coverage": "Tarrant County",
   "refresh_schedule": "Refreshed monthly, plus a full rebuild after each annual certified roll",
   "membership": {
    "price": 49,
    "per": "quarter"
   }
  },
  {
   "build_date": "2026 permit year",
   "buy_url": "https://parcelready.gumroad.com/l/zokmgd",
   "buyer": "Subcontractors and suppliers finding active jobs while they are still being built",
   "cover": "assets/covers/new-construction.png",
   "family": "county",
   "featured": false,
   "id": "dallas-new-construction",
   "inside": [
    "Permit number and type, issue date",
    "Street address and ZIP",
    "Contractor named on the permit where the city publishes it",
    "Declared project value, $3.52 billion across the file",
    "Area, work description, and land use"
   ],
   "limits": "Only the ground up work from the Dallas permits file. Declared values are the applicants' own figures, and a permit is a start, not a guarantee the project finished.",
   "metro": "Dallas",
   "price": 49,
   "price_note": "one time",
   "rows": 3808,
   "rows_label": "3,808 permits",
   "sample_label": "Free sample pack",
   "sample_url": "https://parcelready.gumroad.com/l/shdtbi",
   "stats": [
    {
     "k": "Permits",
     "v": "3,808"
    },
    {
     "k": "Declared value",
     "v": "$3.52B"
    },
    {
     "k": "Cut",
     "v": "Ground up only"
    },
    {
     "k": "Format",
     "v": "CSV"
    }
   ],
   "tagline": "3,808 ground up projects with contractors, $3.52 billion declared",
   "title": "Dallas New Construction Permits 2026",
   "trade": "New Construction",
   "state": "TX",
   "category": "Construction",
   "data_as_of": "2026-11-09",
   "sample_csv": "dallas_new_construction_sample100.csv",
   "store": {
    "mode": "stripe",
    "delivery_file": "dallas_new_construction_permits_2026.csv",
    "billing": "one_time",
    "stripe_product_id": null,
    "stripe_price_id": null
   },
   "metro_id": "dfw",
   "coverage": "City of Dallas",
   "refresh_schedule": "Refreshed monthly, plus a January close-out build",
   "membership": {
    "price": 49,
    "per": "quarter"
   }
  },
  {
   "build_date": "2026 permit year",
   "buy_url": "https://parcelready.gumroad.com/l/lcvikh",
   "buyer": "Lot buyers and builders watching redevelopment street by street",
   "cover": "assets/covers/demolition.png",
   "family": "county",
   "featured": false,
   "id": "dallas-demolition",
   "inside": [
    "Permit number and issue date",
    "Street address and ZIP",
    "Contractor where the city publishes it",
    "Work description and land use"
   ],
   "limits": "Every demolition permit the City of Dallas issued in 2026. Demolition permits do not say who bought the lot or what replaces the structure. This is the signal list, not the whole story.",
   "metro": "Dallas",
   "price": 39,
   "price_note": "one time",
   "rows": 1249,
   "rows_label": "1,249 permits",
   "sample_label": "Free sample pack",
   "sample_url": "https://parcelready.gumroad.com/l/shdtbi",
   "stats": [
    {
     "k": "Permits",
     "v": "1,249"
    },
    {
     "k": "Coverage",
     "v": "Full year 2026"
    },
    {
     "k": "Signal",
     "v": "Teardowns"
    },
    {
     "k": "Format",
     "v": "CSV"
    }
   ],
   "tagline": "1,249 teardowns, the lots about to change hands",
   "title": "Dallas Demolition Permits 2026",
   "trade": "Demolition",
   "state": "TX",
   "category": "Construction",
   "data_as_of": "2026-11-09",
   "sample_csv": "dallas_demolition_sample100.csv",
   "store": {
    "mode": "stripe",
    "delivery_file": "dallas_demolition_permits_2026.csv",
    "billing": "one_time",
    "stripe_product_id": null,
    "stripe_price_id": null
   },
   "metro_id": "dfw",
   "coverage": "City of Dallas",
   "refresh_schedule": "Refreshed monthly, plus a January close-out build",
   "membership": {
    "price": 39,
    "per": "quarter"
   }
  },
  {
   "build_date": "Collin CAD data, November 1, 2026",
   "buy_url": "https://parcelready.gumroad.com/l/ainbwv",
   "buyer": "Investors working the north side of the DFW map",
   "cover": "assets/covers/collin-absentee.png",
   "family": "county",
   "featured": false,
   "id": "collin-absentee",
   "inside": [
    "Owner name and mailing address",
    "Property address, city, and ZIP",
    "Market value, labeled as prior year appraised value in the file itself",
    "Year built, deed date, and years owned",
    "Collin CAD property ID on every record"
   ],
   "limits": "Built from Collin CAD's official appraisal dataset on the Texas Open Data Portal, with the same owner occupied check as the Dallas list: if the mailing street matched the property street, the record never made the file, and the verification pass found zero slips. Values are prior year appraised values, because the current year value field in the county's published file is empty for every record; the column is labeled exactly that way in the file.",
   "metro": "Collin County",
   "price": 49,
   "price_note": "one time",
   "rows": 14227,
   "rows_label": "14,227 records",
   "sample_label": "Free sample pack",
   "sample_url": "https://parcelready.gumroad.com/l/shdtbi",
   "stats": [
    {
     "k": "Records",
     "v": "14,227"
    },
    {
     "k": "Ownership filter",
     "v": "11+ years"
    },
    {
     "k": "Value floor",
     "v": "$150,000"
    },
    {
     "k": "Owner occupied slips",
     "v": "0 found"
    }
   ],
   "tagline": "14,227 Plano, McKinney, Frisco, and Allen owners holding 11+ years",
   "title": "Collin County Absentee Owners, Long Term",
   "trade": "Absentee Owners",
   "state": "TX",
   "category": "Real Estate",
   "data_as_of": "2026-11-01",
   "sample_csv": "collin_absentee_longterm_sample100.csv",
   "store": {
    "mode": "stripe",
    "delivery_file": "collin_absentee_longterm.csv",
    "billing": "one_time",
    "stripe_product_id": null,
    "stripe_price_id": null
   },
   "metro_id": "dfw",
   "coverage": "Collin County",
   "refresh_schedule": "Refreshed monthly, plus a full rebuild after each annual certified roll",
   "membership": {
    "price": 49,
    "per": "quarter"
   }
  },
  {
   "id": "harris-absentee",
   "title": "Harris County Absentee Owners, Long Term",
   "tagline": "78,514 owners who get their tax mail somewhere else, 11+ years of ownership",
   "buyer": "Real estate investors, wholesalers, and direct mail marketers working Harris County and the Houston metro",
   "cover": "assets/covers/harris-absentee.png",
   "family": "county",
   "featured": false,
   "metro": "Harris County",
   "price": 49,
   "price_note": "one time",
   "rows": 78514,
   "rows_label": "78,514 records",
   "sample_label": "Free 50 row sample",
   "sample_url": "https://parcelreadydata.com/packs/harris-absentee.html",
   "stats": [
    {
     "k": "Records",
     "v": "78,514"
    },
    {
     "k": "Columns",
     "v": "16"
    },
    {
     "k": "Median value",
     "v": "$247,287"
    },
    {
     "k": "Ownership filter",
     "v": "11+ years"
    }
   ],
   "inside": [
    "Owner name and owner mailing address, city, state, and ZIP",
    "Property address, city, and ZIP",
    "Latest appraised market value, median $247,287 across the file",
    "Year built and living area square feet (beds and baths are not keyed in the district's published files and ship blank, never estimated)",
    "Deed transfer date and years owned",
    "HCAD account number on every record, for verification"
   ],
   "limits": "Built from the Harris County Appraisal District's published ownership files, not scraped and not resold from another list vendor. Every record passed an owner occupied check: if the mailing address matched the property address, it is not on this list. Values are county appraised values, not sale prices. Deed transfer dates are the appraisal district's recorded new owner dates. Years of ownership is an equity signal, not a mortgage balance. If this pack does not match what its page promised, tell us within 30 days and we will fix it or refund the pack.",
   "trade": "Absentee Owners",
   "state": "TX",
   "category": "Real Estate",
   "data_as_of": "2026-11-22",
   "build_date": "November 22, 2026 data",
   "store": {
    "mode": "stripe",
    "delivery_file": "county-packs/harris/harris-absentee-2026-11-23.csv",
    "billing": "one_time",
    "stripe_product_id": null,
    "stripe_price_id": null
   },
   "metro_id": "houston",
   "coverage": "Harris County",
   "refresh_schedule": "Refreshed monthly, plus a full rebuild after each annual certified roll",
   "membership": {
    "price": 49,
    "per": "quarter",
    "statewide_price": 199
   }
  },
  {
   "id": "harris-commercial",
   "title": "Harris County Commercial Owners",
   "tagline": "71,185 commercial properties with the owner's mailing address, classes F1 and F2",
   "buyer": "Commercial real estate investors, brokers, lenders, and service firms working Harris County and the Houston metro",
   "cover": "assets/covers/harris-commercial.png",
   "family": "county",
   "featured": false,
   "metro": "Harris County",
   "price": 79,
   "price_note": "one time",
   "rows": 71185,
   "rows_label": "71,185 records",
   "sample_label": "Free 50 row sample",
   "sample_url": "https://parcelreadydata.com/packs/harris-commercial.html",
   "stats": [
    {
     "k": "Records",
     "v": "71,185"
    },
    {
     "k": "Columns",
     "v": "16"
    },
    {
     "k": "Median value",
     "v": "$768,483"
    },
    {
     "k": "Classes",
     "v": "F1 and F2"
    }
   ],
   "inside": [
    "Owner name and owner mailing address, city, state, and ZIP",
    "Property address, city, and ZIP",
    "Latest appraised market value, median $768,483 across the file",
    "Deed transfer date and years owned",
    "Year built, living area, beds, and baths ship blank on this pack (the district publishes commercial buildings separately from the residential building file, and blank fields are never estimated)",
    "HCAD account number on every record, for verification"
   ],
   "limits": "Built from the Harris County Appraisal District's published ownership files, not scraped and not resold from another list vendor. The list is the district's commercial classes, F1 and F2: every owner record in them, with no absentee test and no value filter applied. Values are county appraised values, not sale prices. Deed transfer dates are the appraisal district's recorded new owner dates. Year built and living area ship blank, as the inside list states. If this pack does not match what its page promised, tell us within 30 days and we will fix it or refund the pack.",
   "trade": "Commercial Owners",
   "state": "TX",
   "category": "Real Estate",
   "data_as_of": "2026-11-22",
   "build_date": "November 22, 2026 data",
   "store": {
    "mode": "stripe",
    "delivery_file": "county-packs/harris/harris-commercial-2026-11-23.csv",
    "billing": "one_time",
    "stripe_product_id": null,
    "stripe_price_id": null
   },
   "metro_id": "houston",
   "coverage": "Harris County",
   "refresh_schedule": "Refreshed monthly, plus a full rebuild after each annual certified roll",
   "membership": {
    "price": 79,
    "per": "quarter"
   }
  },
  {
   "id": "harris-high-equity",
   "title": "Harris County High Equity Owners",
   "tagline": "191,999 residential owners with modeled equity of 65 percent or more (ESTIMATE)",
   "buyer": "Real estate investors and direct mail marketers who target equity rich, long held homes in Harris County and the Houston metro",
   "cover": "assets/covers/harris-high-equity.png",
   "family": "county",
   "featured": false,
   "metro": "Harris County",
   "price": 59,
   "price_note": "one time",
   "rows": 191999,
   "rows_label": "191,999 records",
   "sample_label": "Free 50 row sample",
   "sample_url": "https://parcelreadydata.com/packs/harris-high-equity.html",
   "stats": [
    {
     "k": "Records",
     "v": "191,999"
    },
    {
     "k": "Columns",
     "v": "16"
    },
    {
     "k": "Median estimated equity",
     "v": "90%"
    },
    {
     "k": "Basis",
     "v": "Modeled (ESTIMATE)"
    }
   ],
   "inside": [
    "Owner name and owner mailing address, city, state, and ZIP",
    "Property address, city, and ZIP",
    "Latest appraised market value",
    "Deed transfer date and years owned (the model's amortization start)",
    "Year built and living area square feet (beds and baths are not keyed in the district's published files and ship blank, never estimated)",
    "HCAD account number on every record, for verification"
   ],
   "limits": "Built from the Harris County Appraisal District's published ownership files, not scraped and not resold from another list vendor. Equity on this pack is a modeled estimate, never a verified figure: the original loan is modeled at 80 percent of current appraised value, 30 year fixed at 6.5 percent, amortized from the deed transfer date to the roll date, and a record qualifies when the estimated equity reaches 65 percent or more of current value. No lender, lien, or mortgage record was checked for any record. Records with placeholder deed dates are excluded, because an amortization horizon computed off a conversion date is fabricated precision. Values are county appraised values, not sale prices. If this pack does not match what its page promised, tell us within 30 days and we will fix it or refund the pack.",
   "trade": "High Equity Owners",
   "state": "TX",
   "category": "Real Estate",
   "data_as_of": "2026-11-22",
   "build_date": "November 22, 2026 data",
   "store": {
    "mode": "stripe",
    "delivery_file": "county-packs/harris/harris-high-equity-2026-11-23.csv",
    "billing": "one_time",
    "stripe_product_id": null,
    "stripe_price_id": null
   },
   "metro_id": "houston",
   "coverage": "Harris County",
   "refresh_schedule": "Refreshed monthly, plus a full rebuild after each annual certified roll",
   "membership": {
    "price": 59,
    "per": "quarter"
   }
  },
  {
   "id": "harris-long-term",
   "title": "Harris County Long-Term Owners, 20+ Years",
   "tagline": "342,211 owners holding since 2005 or earlier, across every market class",
   "buyer": "Real estate investors, wholesalers, and direct mail marketers who target long held property in Harris County and the Houston metro",
   "cover": "assets/covers/harris-long-term.png",
   "family": "county",
   "featured": false,
   "metro": "Harris County",
   "price": 49,
   "price_note": "one time",
   "rows": 342211,
   "rows_label": "342,211 records",
   "sample_label": "Free 50 row sample",
   "sample_url": "https://parcelreadydata.com/packs/harris-long-term.html",
   "stats": [
    {
     "k": "Records",
     "v": "342,211"
    },
    {
     "k": "Columns",
     "v": "16"
    },
    {
     "k": "Ownership filter",
     "v": "20+ years"
    },
    {
     "k": "Exempt classes",
     "v": "Excluded"
    }
   ],
   "inside": [
    "Owner name and owner mailing address, city, state, and ZIP",
    "Property address, city, and ZIP",
    "Latest appraised market value",
    "Deed transfer date and years owned",
    "Year built and living area square feet (beds and baths are not keyed in the district's published files and ship blank, never estimated)",
    "HCAD account number on every record, for verification"
   ],
   "limits": "Built from the Harris County Appraisal District's published ownership files, not scraped and not resold from another list vendor. The population is every owner record with a deed transfer date on or before December 31, 2005, across all market property classes. The exempt division (government, religious, charitable, and educational institutions) is excluded: those are not sellable owners on an investor list. Deed transfer dates are the appraisal district's recorded new owner dates; the district's legacy conversion date appears on pre-digital transfers and is counted in the open (42,711 records carry it), never hidden. Values are county appraised values, not sale prices. If this pack does not match what its page promised, tell us within 30 days and we will fix it or refund the pack.",
   "trade": "Long-Term Owners",
   "state": "TX",
   "category": "Real Estate",
   "data_as_of": "2026-11-22",
   "build_date": "November 22, 2026 data",
   "store": {
    "mode": "stripe",
    "delivery_file": "county-packs/harris/harris-long-term-2026-11-23.csv",
    "billing": "one_time",
    "stripe_product_id": null,
    "stripe_price_id": null
   },
   "metro_id": "houston",
   "coverage": "Harris County",
   "refresh_schedule": "Refreshed monthly, plus a full rebuild after each annual certified roll",
   "membership": {
    "price": 49,
    "per": "quarter"
   }
  },
  {
   "id": "harris-out-of-area",
   "title": "Harris County Owners Who Live Elsewhere",
   "tagline": "73,323 absentee owners, segmented out of state and out of county on every row",
   "buyer": "Real estate investors and direct mail marketers who work out of area owners in Harris County and the Houston metro",
   "cover": "assets/covers/harris-out-of-area.png",
   "family": "county",
   "featured": false,
   "metro": "Harris County",
   "price": 49,
   "price_note": "one time",
   "rows": 73323,
   "rows_label": "73,323 records",
   "sample_label": "Free 50 row sample",
   "sample_url": "https://parcelreadydata.com/packs/harris-out-of-area.html",
   "stats": [
    {
     "k": "Records",
     "v": "73,323"
    },
    {
     "k": "Columns",
     "v": "17"
    },
    {
     "k": "Out of state",
     "v": "32,985"
    },
    {
     "k": "Out of county (TX)",
     "v": "40,338"
    }
   ],
   "inside": [
    "Owner name and owner mailing address, city, state, and ZIP",
    "Property address, city, and ZIP",
    "Latest appraised market value",
    "A Segment column on every record: Out of state or Out of county (TX)",
    "Deed transfer date and years owned",
    "HCAD account number on every record, for verification"
   ],
   "limits": "Built from the Harris County Appraisal District's published ownership files, not scraped and not resold from another list vendor. The population is the county's residential absentee owners (282,835 owners whose mailing address differs from the property address), cut by where the owner actually is: owners mailing from another state, and Texas owners mailing from outside Harris County. Owners who mail from inside Harris County are not on this list. This pack applies no deed date or value filter; it is the full absentee population segmented by geography. Values are county appraised values, not sale prices. Deed transfer dates are the appraisal district's recorded new owner dates. If this pack does not match what its page promised, tell us within 30 days and we will fix it or refund the pack.",
   "trade": "Out-of-Area Owners",
   "state": "TX",
   "category": "Real Estate",
   "data_as_of": "2026-11-22",
   "build_date": "November 22, 2026 data",
   "store": {
    "mode": "stripe",
    "delivery_file": "county-packs/harris/harris-out-of-area-2026-11-23.csv",
    "billing": "one_time",
    "stripe_product_id": null,
    "stripe_price_id": null
   },
   "metro_id": "houston",
   "coverage": "Harris County",
   "refresh_schedule": "Refreshed monthly, plus a full rebuild after each annual certified roll",
   "membership": {
    "price": 49,
    "per": "quarter"
   }
  },
  {
   "id": "harris-tired-landlords",
   "title": "Harris County Tired Landlords",
   "tagline": "11,087 properties held by 1,067 owners of 5 or more homes, half held since 2015 or earlier",
   "buyer": "Real estate investors who buy portfolios and long held rentals in Harris County and the Houston metro",
   "cover": "assets/covers/harris-tired-landlords.png",
   "family": "county",
   "featured": false,
   "metro": "Harris County",
   "price": 79,
   "price_note": "one time",
   "rows": 11087,
   "rows_label": "11,087 records",
   "sample_label": "Free 50 row sample",
   "sample_url": "https://parcelreadydata.com/packs/harris-tired-landlords.html",
   "stats": [
    {
     "k": "Records",
     "v": "11,087"
    },
    {
     "k": "Columns",
     "v": "18"
    },
    {
     "k": "Qualifying owners",
     "v": "1,067"
    },
    {
     "k": "Minimum portfolio",
     "v": "5 properties"
    }
   ],
   "inside": [
    "Owner name and owner mailing address, city, state, and ZIP",
    "Property address, city, and ZIP",
    "Latest appraised market value",
    "Owner Property Count and Owner Long-Held Count columns, so each owner's footprint in the file is visible on every row",
    "Deed transfer date and years owned",
    "HCAD account number on every record, for verification"
   ],
   "limits": "Built from the Harris County Appraisal District's published ownership files, not scraped and not resold from another list vendor. Owner identity is normalized on owner name plus mailing address, and properties are counted on residential records only. An owner qualifies with 5 or more properties where at least half the deed transfer dates fall on or before December 31, 2015. The district's legacy conversion date counts toward the long held half, because a pre-digital transfer is genuinely long ownership; 98 of the 1,067 qualifying owners have such a date inside their counts, stated here in the open. Values are county appraised values, not sale prices. If this pack does not match what its page promised, tell us within 30 days and we will fix it or refund the pack.",
   "trade": "Tired Landlords",
   "state": "TX",
   "category": "Real Estate",
   "data_as_of": "2026-11-22",
   "build_date": "November 22, 2026 data",
   "store": {
    "mode": "stripe",
    "delivery_file": "county-packs/harris/harris-tired-landlords-2026-11-23.csv",
    "billing": "one_time",
    "stripe_product_id": null,
    "stripe_price_id": null
   },
   "metro_id": "houston",
   "coverage": "Harris County",
   "refresh_schedule": "Refreshed monthly, plus a full rebuild after each annual certified roll",
   "membership": {
    "price": 79,
    "per": "quarter"
   }
  },
  {
   "id": "harris-multifamily",
   "title": "Harris County Multifamily Owners",
   "tagline": "16,428 multifamily properties in classes B1 to B4, with the owner's mailing address",
   "buyer": "Multifamily investors, brokers, and lenders working Harris County and the Houston metro",
   "cover": "assets/covers/harris-multifamily.png",
   "family": "county",
   "featured": false,
   "metro": "Harris County",
   "price": 79,
   "price_note": "one time",
   "rows": 16428,
   "rows_label": "16,428 records",
   "sample_label": "Free 50 row sample",
   "sample_url": "https://parcelreadydata.com/packs/harris-multifamily.html",
   "stats": [
    {
     "k": "Records",
     "v": "16,428"
    },
    {
     "k": "Columns",
     "v": "16"
    },
    {
     "k": "Classes",
     "v": "B1 to B4"
    },
    {
     "k": "Unit counts",
     "v": "Not published"
    }
   ],
   "inside": [
    "Owner name and owner mailing address, city, state, and ZIP",
    "Property address, city, and ZIP",
    "Latest appraised market value",
    "Class mix across the file: B2 is the largest class at 9,854 records, then B1 at 5,815, B3 at 502, B4 at 257",
    "Deed transfer date and years owned",
    "Year built and living area square feet where the district's building file carries the property",
    "HCAD account number on every record, for verification"
   ],
   "limits": "Built from the Harris County Appraisal District's published ownership files, not scraped and not resold from another list vendor. The list is the district's multifamily state classes, B1 through B4: every owner record in them. Unit counts are not published by the district in its account or building files, so they are marked not published and never approximated. Values are county appraised values, not sale prices. Deed transfer dates are the appraisal district's recorded new owner dates. If this pack does not match what its page promised, tell us within 30 days and we will fix it or refund the pack.",
   "trade": "Multifamily Owners",
   "state": "TX",
   "category": "Real Estate",
   "data_as_of": "2026-11-22",
   "build_date": "November 22, 2026 data",
   "store": {
    "mode": "stripe",
    "delivery_file": "county-packs/harris/harris-multifamily-2026-11-23.csv",
    "billing": "one_time",
    "stripe_product_id": null,
    "stripe_price_id": null
   },
   "metro_id": "houston",
   "coverage": "Harris County",
   "refresh_schedule": "Refreshed monthly, plus a full rebuild after each annual certified roll",
   "membership": {
    "price": 79,
    "per": "quarter"
   }
  },
  {
   "build_date": "Current builds",
   "buy_url": "https://parcelready.gumroad.com/l/shdtbi",
   "buyer": "Anyone who wants to inspect the data before spending a dollar",
   "cover": "assets/covers/sample-pack.png",
   "family": "county",
   "featured": false,
   "id": "free-sample-pack",
   "inside": [
    "100 real records drawn from every paid list in the store",
    "The exact columns and format of the full files",
    "Owner matched records shown with their match quality visible"
   ],
   "limits": "Check the columns, the addresses, and the match quality before you spend anything. If the samples do not convince you, the full lists will not either, and we would rather you find that out for free.",
   "metro": "All lists",
   "price": 0,
   "price_note": "free",
   "rows": 100,
   "rows_label": "100 records from every list",
   "sample_label": "Get the free sample pack",
   "sample_url": "https://parcelready.gumroad.com/l/shdtbi",
   "stats": [
    {
     "k": "Records",
     "v": "100"
    },
    {
     "k": "Lists covered",
     "v": "Every paid list"
    },
    {
     "k": "Price",
     "v": "$0"
    },
    {
     "k": "Format",
     "v": "CSV + XLSX"
    }
   ],
   "tagline": "100 real records from every paid list, in the exact format of the full files",
   "title": "ParcelReady Free Sample Pack",
   "trade": "Free Sample",
   "state": "TX",
   "category": "Real Estate",
   "data_as_of": "2026-11-16",
   "sample_csv": null,
   "store": {
    "mode": "gumroad",
    "delivery_file": null,
    "billing": "one_time",
    "stripe_product_id": null,
    "stripe_price_id": null
   },
   "metro_id": null,
   "coverage": "Drawn from every live list",
   "refresh_schedule": "Rolls with each source pack's refresh",
   "membership": null
  }
 ],
 "sample_percent": 10,
 "metros": {
  "dfw": {
   "name": "Dallas Fort Worth",
   "slug": "dallas-fort-worth",
   "state": "TX",
   "coverage": "Dallas, Tarrant, Collin, Denton, Ellis, Hunt, Johnson, Kaufman, Parker, Rockwall, and Wise counties"
  },
  "houston": {
   "name": "Houston",
   "slug": "houston",
   "state": "TX",
   "coverage": "Harris, Fort Bend, Montgomery, Brazoria, Galveston, Liberty, Waller, Chambers, and Austin counties"
  },
  "austin-san-antonio": {
   "name": "Austin to San Antonio",
   "slug": "austin-to-san-antonio",
   "state": "TX",
   "coverage": "The I-35 corridor: Travis, Williamson, Hays, Comal, Guadalupe, and Bexar counties"
  }
 },
 "states": [
  {
   "name": "Alabama",
   "code": "AL",
   "slug": "alabama"
  },
  {
   "name": "Alaska",
   "code": "AK",
   "slug": "alaska"
  },
  {
   "name": "Arizona",
   "code": "AZ",
   "slug": "arizona"
  },
  {
   "name": "Arkansas",
   "code": "AR",
   "slug": "arkansas"
  },
  {
   "name": "California",
   "code": "CA",
   "slug": "california"
  },
  {
   "name": "Colorado",
   "code": "CO",
   "slug": "colorado"
  },
  {
   "name": "Connecticut",
   "code": "CT",
   "slug": "connecticut"
  },
  {
   "name": "Delaware",
   "code": "DE",
   "slug": "delaware"
  },
  {
   "name": "Florida",
   "code": "FL",
   "slug": "florida"
  },
  {
   "name": "Georgia",
   "code": "GA",
   "slug": "georgia"
  },
  {
   "name": "Hawaii",
   "code": "HI",
   "slug": "hawaii"
  },
  {
   "name": "Idaho",
   "code": "ID",
   "slug": "idaho"
  },
  {
   "name": "Illinois",
   "code": "IL",
   "slug": "illinois"
  },
  {
   "name": "Indiana",
   "code": "IN",
   "slug": "indiana"
  },
  {
   "name": "Iowa",
   "code": "IA",
   "slug": "iowa"
  },
  {
   "name": "Kansas",
   "code": "KS",
   "slug": "kansas"
  },
  {
   "name": "Kentucky",
   "code": "KY",
   "slug": "kentucky"
  },
  {
   "name": "Louisiana",
   "code": "LA",
   "slug": "louisiana"
  },
  {
   "name": "Maine",
   "code": "ME",
   "slug": "maine"
  },
  {
   "name": "Maryland",
   "code": "MD",
   "slug": "maryland"
  },
  {
   "name": "Massachusetts",
   "code": "MA",
   "slug": "massachusetts"
  },
  {
   "name": "Michigan",
   "code": "MI",
   "slug": "michigan"
  },
  {
   "name": "Minnesota",
   "code": "MN",
   "slug": "minnesota"
  },
  {
   "name": "Mississippi",
   "code": "MS",
   "slug": "mississippi"
  },
  {
   "name": "Missouri",
   "code": "MO",
   "slug": "missouri"
  },
  {
   "name": "Montana",
   "code": "MT",
   "slug": "montana"
  },
  {
   "name": "Nebraska",
   "code": "NE",
   "slug": "nebraska"
  },
  {
   "name": "Nevada",
   "code": "NV",
   "slug": "nevada"
  },
  {
   "name": "New Hampshire",
   "code": "NH",
   "slug": "new-hampshire"
  },
  {
   "name": "New Jersey",
   "code": "NJ",
   "slug": "new-jersey"
  },
  {
   "name": "New Mexico",
   "code": "NM",
   "slug": "new-mexico"
  },
  {
   "name": "New York",
   "code": "NY",
   "slug": "new-york"
  },
  {
   "name": "North Carolina",
   "code": "NC",
   "slug": "north-carolina"
  },
  {
   "name": "North Dakota",
   "code": "ND",
   "slug": "north-dakota"
  },
  {
   "name": "Ohio",
   "code": "OH",
   "slug": "ohio"
  },
  {
   "name": "Oklahoma",
   "code": "OK",
   "slug": "oklahoma"
  },
  {
   "name": "Oregon",
   "code": "OR",
   "slug": "oregon"
  },
  {
   "name": "Pennsylvania",
   "code": "PA",
   "slug": "pennsylvania"
  },
  {
   "name": "Rhode Island",
   "code": "RI",
   "slug": "rhode-island"
  },
  {
   "name": "South Carolina",
   "code": "SC",
   "slug": "south-carolina"
  },
  {
   "name": "South Dakota",
   "code": "SD",
   "slug": "south-dakota"
  },
  {
   "name": "Tennessee",
   "code": "TN",
   "slug": "tennessee"
  },
  {
   "name": "Texas",
   "code": "TX",
   "slug": "texas"
  },
  {
   "name": "Utah",
   "code": "UT",
   "slug": "utah"
  },
  {
   "name": "Vermont",
   "code": "VT",
   "slug": "vermont"
  },
  {
   "name": "Virginia",
   "code": "VA",
   "slug": "virginia"
  },
  {
   "name": "Washington",
   "code": "WA",
   "slug": "washington"
  },
  {
   "name": "West Virginia",
   "code": "WV",
   "slug": "west-virginia"
  },
  {
   "name": "Wisconsin",
   "code": "WI",
   "slug": "wisconsin"
  },
  {
   "name": "Wyoming",
   "code": "WY",
   "slug": "wyoming"
  }
 ],
 "categories": [
  "Real Estate",
  "Construction",
  "Land",
  "HVAC",
  "Plumbing",
  "Electrical",
  "Roofing",
  "Pools",
  "Lawn Care and Landscaping",
  "Concrete",
  "Garage Door Repair",
  "Masonry"
 ]
};
