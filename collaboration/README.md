# The Collaboration That Thinned

**Do the University of Akron and Case Western Reserve collaborate, and on polymer work specifically?**

Sources: OpenAlex works listing both institutions, 2012–2025, and the NSF awards API, awards
to either institution since 2012. Fetched 2026-08-31. Status in the data: **PROTOTYPE**.

**What a row is:** one year. It holds the works listing both institutions, their polymer
(subfield 2507) and biomaterials (subfield 2502) counts, each university’s own output, and the
count per 1,000 of Akron’s works.

```
index.html                    page shell
styles.css                    page-local CSS (a few lines)
app.js                        charts and table views
data/collaboration.json       THE DATA (7 KB). Edit the builder, not this.
claims.json                   7 assertions, re-run by _data/build/verify_claims.py
                              (1 is verify: manual)
```

There is no `shots/` folder.

## Rebuild

```
cd ../_data/build
python fetch_collab.py          # OpenAlex + NSF pulls, writes collab.json in this folder
python derive_collaboration.py  # control series + shaping, writes
                                # ../../collaboration/data/collaboration.json
```

**The raw pull is held.** `_data/build/collab.json` is gitignored with every other
`_data/build/*.json`, so `derive_collaboration.py` cannot run from a clean clone until
`fetch_collab.py` has run. It refuses to build without the `own` series (each university’s
own output), and asserts that no year lacks it. `test_fetch_collab_identity.py` is the
script’s own regression test. A refetch will differ from the shipped file where either
index has since changed.

## Two instruments, one proposition

Publications and federal awards are independent measures of the same question, which makes
this triangulation rather than juxtaposition, and they can disagree.

- Coauthorship: 208 works name both, 8 classified in polymers and 11 in biomaterials.
  Peak 29 in 2018; 6 in 2025.
- Joint NSF awards, found two ways: one award with a PI and co-PI at the two domains, or two
  “Collaborative Research” awards with identical normalized titles. The page counts three
  projects worth $3,412,585. No new joint award started after 2017.

## Read before quoting anything from this page

- **This instrument can demonstrate collaboration and cannot demonstrate its absence**
  (`col-cannot-prove-absence`, `verify: manual`). A low count means not detectable at this
  resolution. OpenAlex affiliation coverage is incomplete, NSF’s co-PI field lists
  signatories rather than the coalition, and neither sees industry contracts, consortium
  membership or joint teaching.
- **A falling count has two other explanations,** so each university’s own output is carried
  beside it: indexing lag, and one partner shrinking. The page reports papers naming both as a
  share of Akron’s output. The controls cannot exclude different indexing delays for the
  joint subset (`col-not-indexing-lag`).
- **The window ends at the last complete publication year,** set by hand in `fetch_collab.py`
  and guarded by `col-no-new-joint-award`.
- **Polymers are a classification, not a keyword.** The unbounded count is published beside
  both subfield counts.

## Corrections naming this page

`CORRECTIONS.md`: a keyword search the page does not run; “joint” for papers naming both
(now “papers naming both”); a researcher’s move counted as a joint project (four joint NSF
projects became three, $3.7M became $3.4M); reach’s years in collaboration’s filters (208
papers on this window fall to 158 on reach’s shorter one); and an award date a day late
(13 July 2026).

## Run and publish

```
cd .. && python -m http.server 8899     # http://localhost:8899/collaboration/
node ../tools/bundle.mjs collaboration  # → ../dist/collaboration.html
python ../_data/build/verify_claims.py collaboration
```
