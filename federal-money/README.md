# The Other Federal Money

**How large is the Tech Hub award beside existing federal procurement?** Prime contracts
under chemical and plastics/rubber manufacturing codes average **$41.4 million a year in
2025 dollars** across FY2019–FY2025 in PIC-12. The $51.0 million EDA implementation award
is about **1.2 average years**. Finished years range from $20.5 million to $59.9 million;
the average does not establish recurring demand or forecast the next year.

The industry-year series was refreshed on 8 September 2026. The company register retains
its separately dated 31 August 2026 snapshot.

## Sources and units

- `data/federal.json`: one signed transaction-obligation total per fiscal year and
  industry code. The primary NAICS rows and contracting comparator both use prime
  contract award types A–D, reported place of performance in PIC-12, FY2019–FY2026.
  All 325*/326* categories are retained after exhaustive category pagination.
- `data/awards.json`: a prime award's **whole-life obligation**, including obligations
  outside the FY2019–FY2026 activity window. Its $329.5M, 6,630 contracts and 193 companies
  describe the earlier award-register snapshot. They are never added to the annual series.
- `data/techhub.json`: seven EDA implementation awards reaggregated from
  `funding-map/data/funding.json`, totaling $51,001,413; $7.2M partner match is excluded.
- `claims.json`: runnable guards for the quantities the article prints.
- `app.js`: desktop and phone charts; all 37 industry categories remain visible and the
  full table carries Census names. `index.html` carries the argument and dated correction.

An obligation is a commitment, not an outlay. The transaction series keeps negative
de-obligations, which reduce the sum. Zero amounts and an absent category row are distinct.
Place of performance is a reported field, not a direct observation of local economic activity.
The 325*/326* scope includes chemistry beyond the narrower cluster measurement register.

## Inflation adjustment

The fiscal-year charts use the `real` column. Nominal dollars remain in the tables for
source reconciliation. BLS CPI-U, all items, U.S. city average, not seasonally adjusted
(CUUR0000SA0), supplies the monthly observations. The producer computes each calendar-year
mean from those observations.

The **2025 index is 321.943, based on eleven published months**. BLS marks October 2025
unavailable because of the lapse in appropriations. The held CPI file had incorrectly
labelled this as twelve months, and the former federal derivation separately hardcoded
322.132. The article now discloses the missing month. Calendar-year CPI approximates
prices over federal fiscal years, which begin the preceding October. FY2026 is carried
at the 2025 index rather than extrapolated; it is partial and excluded from the headline
average.

The Tech Hub line is $51.0M as awarded. Restating the awards carrying FY2024 IDs produces
$51.3M in 2025 dollars; either basis rounds to 1.2 finished-year averages. A competitive
implementation grant and a procurement commitment differ in purpose; this comparison
establishes scale, not additionality or economic impact.

## Acquisition and rebuild

Raw acquisition writes into an explicitly chosen private directory and refuses to replace
an existing compiled pull. Each request/response receipt records the filter, page, timestamp,
response hash and terminal pagination. Category rows are filtered only after the last page.
Malformed responses, missing amounts, duplicate category codes, invalid next-page pointers
and request failures stop the build.

The private compiled inputs retain each page's response text with its SHA256 and request
receipt. The producer replays those bytes, verifies every page and filter, and reproduces
the category rows and award-type totals before inflation adjustment. Only pagination
summaries enter the public data file. The acquisition's 0.01% residual threshold and the
producer's 10-to-100 comparator band are coarse review triggers; they do not establish
reconciliation or validate the displayed figure. The residual is disclosed separately,
and the article claim checks the printed one-in-29 contracting comparison.

From the repository root, with a fresh directory selected:

```powershell
$raw = "<fresh-private-directory>"
$env:FEDERAL_RAW_DIR = $raw
python _data/build/fetch_rest.py usaspending
python _data/build/fetch_fed_contracts.py --output-dir $raw
python _data/build/fetch_federal_cpi.py --output-dir $raw
python _data/build/fetch_federal_research.py --output-dir $raw
python _data/build/derive_federal.py --raw-dir $raw
python federal-money/derive_techhub.py
python -m unittest discover -s _data/build -p test_federal_categories.py -v
python -B _data/build/verify_claims.py federal-money
python -B _data/build/verify_series.py federal-money
```

`derive_rest.py` calls the same federal producer for full-site builds. The dedicated
producer avoids rebuilding unrelated articles. The registry, `_data/SOURCES.json`,
records the endpoints and filters.

The award-register producer remains `fetch_fed_awards.py` → `derive_fed_awards.py`.
Its original raw pull was unavailable in the source holdings used for this revision.
The retained published register was checked internally; the complete annual acquisition
does not independently verify that older register. A new award pull is a new source
vintage and must be reviewed before replacing those company amounts.

## Correction: 8 September 2026

The old category fetch stopped at its first 100 results, then filtered for chemistry
and polymers. Completing every year expands the retained series from 39 industry-year
rows across eight industries to 224 rows across 37 industries. FY2023's complete total
is $19,379,051.30 nominal, including $1,175,828.84 of tire manufacturing. The former
claim that no tire obligation appeared was false.

The revised series totals $278.6M nominal and $313.6M in 2025 dollars, up from $248.8M
and $279.3M. Completing pagination, correcting CPI, and incorporating current ledger
revisions raises the finished-year mean from $36.6M to $41.4M and changes the award ratio
from 1.4 to 1.2 years. FY2019 and FY2021 both exceed the award. The two leading rubber
codes now account for 58%, previously 65%.

Tire obligations decline from $20.2M to $1.2M in 2025 dollars between FY2022 and FY2023,
accounting for about 71% of the $26.5M regional decline. Excluding all-other rubber
reduces the finished-year mean to $29.8M (1.7 award-years); excluding tires too gives
$18.1M (2.8 years). These are sensitivity checks, not alternate definitions of the headline.

## Added 12 September 2026: the FY2025 rise is one customer

The same concentration runs the other way at the end of the series, and the article now
says so. The flow rises from $25.0M in FY2024 to $41.2M in FY2025 in 2025 dollars, a gain
of $16.2M, while tire manufacturing alone rises $18.3M across those two years. The gain in
one industry code therefore exceeds the gain in the whole series, and excluding tires the
flow falls from $12.2M to $10.2M. On the separately dated whole-life award register, 99% of
tire-code dollars belong to Goodyear, all of its contract dollars were placed by the
Department of Defense, and its largest award names a Foreign Military Sales case for Israel.
The paragraph stops there: the yearly series cannot split one year among firms, so the page
says tire-coded contracts carried more than the whole rise and everything else fell, and
does not say the rise was one buyer's. A lane-level check in the private workshop found the
FY2024 and FY2025 tire dollars to be one recipient's Army delivery orders under those
Foreign Military Sales cases; that finding is not published here because no public data file
on this page carries the fiscal-year lane, and a claim without a guard is not printed.
Guards: `fed-2025-tire-swing`, `fed-2025-ex-tire-falls`, `fed-tire-code-one-company`.

No published number changed and no correction is owed. The paragraph adds context the
series always contained and the article had not stated. Two limits are carried in the
prose itself. The fiscal-year series and the whole-life register are different time bases
and are never summed, so the paragraph names which basis each figure comes from. And a
Foreign Military Sales order is recorded here because its place of performance is reported
in these counties; that is a reported field, not an observation of where the work happened,
which the band's own note already states.

The finding came from a bounded probe of buyer and product-service-code lanes in the
private workshop repository, which tested whether repeat federal purchasing offers a
plausible entry point for a small manufacturer. It concluded that the three most recurrent
lanes are each one incumbent's business and that the accessible-demand framing does not
survive its own kill conditions. That probe's narrower finding is what this section
records; its lane-level tables are not published here, and every figure above is recomputed
from the two data files this page already ships.

## Comparator and current limits

The contracting denominator is $9.2B in 2025 dollars; polymer-coded work is about one
dollar in every 29. Both sides use the same award types and fiscal-year window.

The separately acquired all-type county context is $238.3B in 2025 dollars. It includes
grants, loans, direct payments and other assistance as well as contracts. Its six separately
queried award groups leave an **unresolved $8.5M nominal remainder**, about 0.004% of the
$214.6B nominal unfiltered total. The remainder is stated in the methodology and is not
assigned to a guessed category. Direct payments and other assistance are about 85% of
that nominal total. The historical September 1 correction retains its original $235.5B
vintage; it is not the refreshed current total.

The prime-contract award-type filter excludes research grants. NEO-SMART and TARDISS
illustrate that boundary; TARDISS is not presented as a
measured PIC-12 research award. The records cannot allocate company shares of a particular
fiscal year's total or establish who would win a future procurement.

TARDISS is excluded by the prime-contract award-type filter. The former article text
incorrectly implied that natural rubber falls outside NAICS 325/326. The
[2022 Census NAICS manual, industry group 3262](https://www.census.gov/naics/reference_files_tools/2022_NAICS_Manual.pdf#page=210)
includes products made from natural, synthetic, or reclaimed rubber. This source-scope
explanation was corrected on 8 September 2026; no numerical series changed.

Also corrected on 8 September 2026: the metadata formerly asserted that a university
files under 61xxxx or 5417xx. That universal coding claim was unsupported.
[FAR 19.102(b)](https://www.acquisition.gov/far/19.102) assigns contract NAICS by the
principal purpose of the supplies or services acquired. A recipient's identity does
not determine the contract code, and its address does not establish manufacturing
activity in PIC-12. The producer and rebuilt metadata now state these limits.

## Preview and release checks

```powershell
python -m http.server 8899
# http://localhost:8899/federal-money/
node tools/bundle.mjs federal-money
node tools/verify.mjs federal-money
node tools/collide.mjs federal-money
```

Read the page at desktop and 375px, including keyboard-accessible marks and tables.
A passing arithmetic guard cannot establish correct source acquisition; the pagination
regression deliberately places a tire category after page one, where the old extractor
loses it, and tests invalid pagination and the missing CPI month.
