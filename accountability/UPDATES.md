# Updates — accountability

This log records **updates**: a scheduled refresh, a new upstream vintage, a promise
register read, a new public count added to band E. It is not the corrections log. When a
published number on this page was **wrong**, that goes in the repository's `CORRECTIONS.md`,
dated and append-only, and it goes there instead of here. Treating a routine refresh as an
error teaches readers to ignore the corrections log.

Newest first. Every entry names the date, what changed in the reading, and what triggered it.

---

## 2026-08-28 — register opened, page drafted

- `data/promises.json` seeded once, by hand, from the eighteen forward events in
  `timeline/data/timeline.json` as they stood at the 13 August 2026 vintage. Every row
  stamped `first_published: 2026-08-28`, `first_published_basis: "register opened"`, and
  `first_published_date` set to the resolution date as it stood that day. The file is
  append-only from this entry onward.
- Calibration statistic opens at **n = 0**. No commitment has resolved against the register,
  so no keeping rate renders. The floor of six is the spec's stated default and not a
  decision; Open Question 4 is unanswered.
- Upstream vintages read: award register 2026-08-13, internal scorecard 2026-08-13, public
  event register 2026-08-13, EDA Tech Hub award file 2026-08-13, USAspending obligations
  FY2019 to FY2026, BLS QCEW establishment counts 2025.
- Not published, and each for a stated reason on the page: the disbursement stage, the seven
  board rows that need PIC's own registers, the slip record for dates published before this
  register existed, and a jobs-created or economic-impact figure.
- **The page is an unreviewed draft and is not linked from any index.** See `.unlisted` and
  the seven open questions in `README.md`. The next entry in this file should be the answer
  to Open Question 6, naming the person who reads the register each quarter, because band D
  ships only with one.

### Due at the next quarter close (2026-09-30)

- Read the promise register. Four commitments resolve before that date: F02 (15 August 2026,
  already past at the register's opening and unread against it), F04 (9 September 2026), and
  nothing else until October. Record each as `delivered`, `moved` or `missed`, and append a
  dated `history[]` entry for any date that moved.
- Recompute the calibration statistic. It will still print `n` and no rate.
- Re-run `derive_accountability.py` and the full gate set before the reading is published.
