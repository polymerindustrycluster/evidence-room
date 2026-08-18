# PIC portfolio timeline

An interactive record of what the cluster has publicly done since the 2023 federal
designation: 87 public events across five workstreams, on one shared calendar.
Companion to `web/funding-map` — *that* one shows where the money sits today, this
one shows what the portfolio did over time.

Self-contained: vanilla JS, inline SVG, no frameworks, no CDN, no build step.

```
index.html            page shell
styles.css            all styling, brand tokens at the top
app.js                scales, lane packing, render, interaction
data/timeline.json    GENERATED — do not edit by hand
fonts/                Aptos, copied from ../../megadeck/fonts
```

## Run it locally

`fetch()` cannot read the JSON over `file://`, so serve the folder:

```
cd web/timeline
python -m http.server 8900
# then open http://localhost:8900/
```

## Regenerating the data

```
python tools/build-timeline-web.py
```

Reads `specs/mining/r2/timeline-events.md` — the merged inventory of 269 events from
eight independent records — and writes `data/timeline.json`. **Edit the inventory, not
the JSON.** A hand-edit to the JSON is destroyed by the next regeneration, which is the
standing rule in `specs/DIAGRAM-TOOLING.md`.

## The publication gate — read this before changing the extractor

The inventory is an **internal** file. This page is **public**. Three filters stand
between them, and the run prints its drop counts every time so none can fail silently:

| Filter | Currently drops |
|-|-|
| `Vis` must be `PUBLIC` | **161 of 269** — most of the record is internal |
| Tier must not be `ADMIN` / `CONF` / `MISS` / `CADENCE` | 4 |
| Must parse to a date and a known lane | 0 |

The **Slip column is never emitted.** The inventory records 21 events with a documented
`planned → actual` slip and says plainly that the slip record is for John. A public page
showing what slipped is a different artifact with different consequences.

## Two date traps, both found by looking at the render

1. **The date cell carries markdown.** `**2026-10-09**` does not match the ISO patterns,
   falls through to the bare-year search, and silently becomes mid-2026 — turning the
   pilot-facility groundbreaking into a guess three months early. `clean()` runs on the
   date now, not just the title.
2. **Mid-period placement puts forward events in the past.** An event recorded only as
   "2026" but listed as still to come cannot sit at 1 July when today is 13 August.
   Forward events are placed in the midpoint of what *remains* of their period, so a
   scheduled mark never renders behind the "today" rule. Eight events were doing this.

## Conventions worth keeping

- **Precision is shown, never faked.** A year-only event says so in its panel and is
  placed mid-period rather than pretending to a day. 73 of 104 are day-precise.
- **Forward events are hollow rings with a center pip, not faded dots.** Fading reads as
  "less important"; a scheduled award end is a *different kind of thing*, not a minor one.
  The ring color must be set through the `--c` custom property — an inline `stroke=""`
  presentation attribute loses to any stylesheet rule and the rings vanish white-on-white.
- **Dot size is horizon** (time to a visible result), never importance.
- One dimension per visual channel: lane = color, horizon = size, status = fill.
