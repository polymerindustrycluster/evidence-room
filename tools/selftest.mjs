/* DOES EACH GATE ACTUALLY CATCH THE DEFECT IT EXISTS FOR?
 *
 *   node tools/selftest.mjs [--list] [gate | gate/page ...]
 *
 * A green board is worth exactly as much as the gates behind it, and during the
 * 2026-08 rebuild six of this project's own checks turned out to be unable to fail on
 * the thing they were written for:
 *
 *   textsize   printed "svg-min —" and PASSED a page whose chart had collapsed to zero
 *              width. 231 labels unmeasured, by the one check whose job was chart text.
 *   collide    tested a single width; every collision found by hand was invisible to it.
 *              Its out-of-frame check was vertical-only while its header claimed both.
 *              It printed three findings per width on a page that had twelve.
 *   disclosure did not exist, and half the site had lost its AI credit to a stray regex.
 *   coldopen   did not exist, and 15 of 16 first charts sat below the fold.
 *   figures    did not exist, and one page stated a disbursement its sibling called
 *              unknowable.
 *
 * Each was found by hand, by injecting the defect and watching the gate stay quiet. This
 * makes that ritual permanent: every injection below reproduces a defect that ACTUALLY
 * SHIPPED here, and a gate that cannot fail its own fixture is reported as untrustworthy
 * whatever the board says.
 *
 * Injections are applied to a COPY and reverted in a finally block. Dist backups sit next
 * to their bundle; source-data backups live in the system temp directory so their mere
 * presence cannot make the bundle-freshness gate fail before the injection. A crash may
 * leave an `evidence-room-selftest-*` temp directory or a dist `.selftest-backup`; the original
 * path is never the backup.
 */
import {readFileSync, writeFileSync, copyFileSync, unlinkSync, existsSync,
        statSync, utimesSync, mkdtempSync, rmdirSync} from "fs";
import {spawnSync} from "child_process";
import {tmpdir} from "os";
import {join} from "path";

/* a correction note turned edge-on and back, inside a box kept in 3D and styled `extra` */
const turned = extra => '<p><span style="display:inline-block;transform:rotateX(90deg);transform-style:preserve-3d;' + extra +
  '"><span style="display:inline-block;transform:rotateX(-90deg)">Correction, 28 September 2026: </span></span>Joint work rose.</p>';

/* the onFonts helper every chart page carries, and the redraw-then-refocus step PR #33 used */
const ON_FONTS = /const onFonts = redraw => \{[\s\S]*?\n\};/;
const KEEP = "const onFonts = redraw => {\n  const keep = () => {\n" +
  '    const a = document.activeElement, k = a && a.getAttribute && a.getAttribute("aria-label");\n' +
  "    redraw();\n    if (k && !a.isConnected) {\n" +
  '      const n = [...document.querySelectorAll("[aria-label]")].find(e => e.getAttribute("aria-label") === k);\n' +
  "      if (n) n.focus({preventScroll: true});\n    }\n  };\n";

const CASES = [
  {gate: "textsize", page: "laborshed", args: ["--sweep", "laborshed"],
   defect: "a chart collapsed to zero width, so its text cannot be measured at all",
   inject: s => s.replace("</head>", "<style>.chart svg{width:0 !important}</style></head>")},

  {gate: "collide", page: "peers", args: ["peers"],
   defect: "bar rows drawn down through their own axis (the height-arithmetic bug)",
   inject: s => s.replace("</head>", "<style>.chart svg rect{transform:translateY(30px)}</style></head>")},

  {gate: "collide", page: "scorecard", args: ["--sweep", "scorecard"],
   defect: "a row label clipped off the left edge of a panning chart, unreachable",
   /* Shifts the chart left INSIDE its scroll box so its leftmost ink falls outside the
      container. The first version removed a `.chart` bleed instead, and went stale twice
      over: that bleed was reverted for breaking the text rail, and the overhang it
      compensated for was later fixed at the chart's own margin. The harness reported it
      BROKEN rather than letting a dead fixture vouch for a live gate. */
   inject: s => s.replace("</head>", "<style>@media(min-width:761px) and (max-width:1099px)" +
     "{.chart svg{margin-left:-30px !important}}</style></head>")},

  /* THE SHARED RENDER MUST FILE EACH DEFECT UNDER THE RIGHT GATE. tools/sweeps.mjs runs
     both sweeps off one render per page x width; a defect only textsize can see must fail
     textsize and leave collide clean, and the reverse, or the combined run is blaming the
     wrong check (or, with its probes swapped, passing both). */
  {gate: "sweeps", page: "laborshed", args: ["laborshed"], expect: /^collide\s+ok[\s\S]*^textsize\s+FAIL/m,
   defect: "9px chart labels, through the combined sweep: textsize fails, collide does not",
   inject: s => s.replace("</head>", "<style>.chart svg text{font-size:9px !important}</style></head>")},

  {gate: "sweeps", page: "peers", args: ["peers"], expect: /^collide\s+FAIL[\s\S]*^textsize\s+ok/m,
   defect: "bars through their axis, through the combined sweep: collide fails, textsize does not",
   inject: s => s.replace("</head>", "<style>.chart svg rect{transform:translateY(30px)}</style></head>")},

  {gate: "caveat", page: "realwage", args: ["realwage"],
   defect: "apparatus growing back under a chart on a page that had paid its budget off",
   inject: s => s.replace("</body>",
     '<p class="src">' + "word ".repeat(60) + '</p></body>')},

  {gate: "furniture", page: "occupations", args: ["occupations"],
   defect: "a figure title carrying a number the page states nowhere, the shape of the " +
           "'2014-2021 pace' caption that shipped over a 2014-2020 chart and passed every gate",
   inject: s => s.replace("</body>",
     '<div class="chart"><p class="fig-title">A 9,481 this page states nowhere else.</p></div></body>')},

  {gate: "disclosure", page: "churn", args: ["churn"],
   defect: "a byline crediting a person for analysis a model produced",
   inject: s => s.replace(/Analysis and graphics by Claude \(Anthropic\)/,
     "Analysis and graphics J. Swanson")},

  {gate: "disclosure", page: "wages", args: ["wages"],
   defect: "the shared promise re-inflated to a condition that \"would prove it wrong\", " +
           "claiming verification the checks do not perform (shipped on all 23 pages " +
           "until 2026-09-01)",
   /* The sentence lives once, in _shared/picviz.js, and is rendered into every page, so
      the defect this reproduces arrives on the whole site in one commit. Injected into
      the inlined script, which is where a bundle carries it. */
   inject: s => s.replace("consistency check, not a check against the world",
                          "written condition that would prove it wrong")},

  {gate: "disclosure", page: "occupations", args: ["occupations"],
   defect: "licensed data used without the trademark symbol or a link to the licence",
   inject: s => s.replace("creativecommons.org/licenses/by/4.0/", "example.invalid/none")
                 .replace(/O\*NET(\u00ae|®) is a trademark/, "O*NET is a trademark")},

  /* One status vocabulary (DECISIONS.md, 2026-10-04). Each injection removes one of the
     four places a page's status must agree. */
  {gate: "disclosure", page: "chain", args: ["chain"],
   expect: /PROTOTYPE page has 0 footer status banners/,
   defect: "a prototype page whose footer banner is gone, so a reader leaving from the " +
           "bottom never learns it is a draft",
   inject: s => s.replace('document.querySelector("footer .wrap")?.prepend(banner("foot"));', "")},

  {gate: "disclosure", page: "chain", file: "dist/index.html", args: ["chain"],
   expect: /hub card says PUBLISHED, the page declares PROTOTYPE/,
   defect: "a prototype's hub card shown without its status, beside the published articles " +
           "(the gallery before 2026-09-29)",
   inject: s => s.replace('<span class="pill geo">PIC-12+2</span><span class="pill proto">Prototype</span>',
                          '<span class="pill geo">PIC-12+2</span>')},

  {gate: "breaksif", page: "peers", file: "peers/claims.json", args: ["peers"],
   expect: /hero claim oh-rank-1 has no breaks_if/,
   defect: "a listed story whose hero claim lost its breaks_if, so the hub's promise that " +
           "each story states what would contradict it is false on that page again",
   inject: s => s.replace(/\n *"breaks_if": "A 2024 revision moves another state above Ohio[^\n]*/, "")},

  {gate: "breaksif", page: "peers", args: ["peers"],
   expect: /not directly under the first chart/,
   defect: "the breaks-if line back under the hero, where it shipped first and pushed four " +
           "first charts past their cold-open ceilings",
   inject: s => s.replace("</body>", '<script>setTimeout(() => document.querySelector(".hero .wrap")' +
     '.appendChild(document.querySelector(".pv-breaks")), 300)</script></body>')},

  {gate: "breaksif", page: "chain", args: ["chain"],
   expect: /after 768 to 1024px: the breaks-if line is not directly under the first chart/,
   defect: "the breaks-if line anchored once at load, left under chain's county map after a " +
           "narrow-to-wide resize made the chain diagram the first chart (Codex, PR #47)",
   inject: s => s.replace('addEventListener("resize", () => { clearTimeout(t); t = setTimeout(() => ' +
     'requestAnimationFrame(place), 150); });', "")},

  {gate: "disclosure", page: "sources", args: ["sources"],
   expect: /link to INTERNAL page \S+ carries no Internal tag/,
   defect: "the source guide linking an unlisted internal page with nothing to say it is " +
           "not for citation",
   inject: s => s.replace('` <span class="status-tag" data-status="INTERNAL">Internal</span>`', '""')},

  /* How this was made and checked, and Cite as (DECISIONS.md, 5 October 2026). */
  {gate: "disclosure", page: "peers", args: ["peers"],
   expect: /no How this was made and checked box/,
   defect: "a page shipped without the box that says who made it, what its checks can " +
           "establish and how to cite it",
   inject: s => s.replace('await madeAndChecked(o.page || "index", manual.length, claims);', "")},

  {gate: "disclosure", page: "churn", args: ["churn"],
   expect: /byline Revised reads 2020-01-01/,
   defect: "a page rendering a revision date its citation record does not hold, so its " +
           "Revised date and cite version name a date nobody can trace",
   /* the bundle's inlined copy of _data/cite.json, which the page renders from */
   inject: s => s.replace(/("churn": \{[^}]*"revised": ")[^"]+/, (m, k) => k + "2020-01-01")},

  {gate: "disclosure", page: "accountability", args: ["accountability"],
   expect: /the box credits .*analysis and graphics by Codex \(OpenAI\).*; the byline credits/,
   defect: "the box crediting Codex with the analysis on a page whose byline credits Codex " +
           "only for updating the federal context (PR #46 review)",
   inject: s => s.replace('<span class="pv-made-credit">${credit}</span>',
     '<span class="pv-made-credit">Analysis and graphics by Claude (Anthropic) and Codex (OpenAI)</span>')},

  {gate: "consistency", page: "funding-map", file: "funding-map/data/funding.json",
   command: "python3", args: ["_data/build/verify_consistency.py"],
   expect: /\[masthead\] funding-map/,
   defect: "a masthead calling the register's 13 August 2026 the newest retrieval while the " +
           "same file carries a USAspending check read on 1 September 2026 (PR #46 review)",
   inject: s => s.replace('  "as_of": "2026-09-01",\n', "")},

  {gate: "consistency", page: "index", file: "index/app.js",
   command: "python3", args: ["_data/build/verify_consistency.py"],
   expect: /\[neo14-name\] index/,
   defect: "NEO-14 naming the chain register's PIC-12+2 counties, the vault's set's name on " +
           "a different set (the hub's definitions before 2026-10-04)",
   inject: s => s.replace("<b>PIC-12+2</b> is the\n      fourteen-county CODEBOOK area",
                          "<b>NEO-14</b> is the\n      fourteen-county CODEBOOK area")},

  {gate: "style", page: "peers", args: ["peers"],
   defect: "a bare acronym on first reference: AP's define-on-first-reference law, the " +
           "machine-checkable slice (a cold reader met EDA, APEX and an unexpanded PIC " +
           "with nothing, 2026-09-01)",
   inject: s => s.replace("<body>", "<body><p>The XQZV filter excludes those counties " +
     "from every series on this page.</p>")},

  {gate: "style", page: "realwage", args: ["realwage"],
   defect: "a negative number printed with the ASCII hyphen instead of the true minus " +
           "(23 table cells shipped this way, found 2026-08-31)",
   inject: s => s.replace("</head>", "<style></style></head>")
                 .replace("<body>", "<body><p>The gap widened by -14% this year.</p>")},

  {gate: "measure", page: "federal-money", args: ["federal-money"],
   defect: "measure-width prose on the wrong rail: table-drawer notes sat 678px wide at " +
           "the figure rail while every neighbour centred on the text rail (shipped on " +
           "five pages until 2026-09-01; a reader saw it before any gate)",
   inject: s => s.replace("</head>", "<style>.tnote{margin-left:0 !important;" +
     "margin-right:auto !important}</style></head>")},

  {gate: "measure", page: "churn", args: ["churn"],
   defect: "the compounding measure: a nested measure-capped box re-resolves 100% " +
           "against its parent and prose runs 488px wide (shipped 2026-08-31)",
   /* Recreates the defect by un-pinning --measure on the methodology grid, restoring
      the :root formula whose leftover 100% compounds inside the 678px container. */
   /* The fix moved from a literal pin on the grid to a 100% pin on its CHILDREN when
      the story layer arrived (two page measures), so the injection now overrides the
      children pin — the first version went stale within a day and reported BROKEN,
      which is the harness doing its job. */
   inject: s => s.replace("</head>", "<style>.pv-method-grid > *{--measure:" +
     "min(678px, calc(min(980px, 100%) * 0.72)) !important}</style></head>")},

  {gate: "coldopen", page: "churn", args: ["churn"],
   defect: "a page whose first chart sinks below its recorded budget",
   inject: s => s.replace("</head>", "<style>.hero .wrap{padding-bottom:400px}</style></head>")},

  {gate: "style", page: "revisions", args: ["revisions"],
   defect: "an em-dash in published prose, which the house style law forbids",
   inject: s => s.replace("<body>", '<body><p>A banned em-dash \u2014 here.</p>')},

  {gate: "style", page: "revisions", args: ["revisions"],
   defect: "a straight quote in published prose, still caught after the rule was narrowed",
   /* The quote rules were scoped to skip <pre>/.code on 2026-08-30, because a JSON
      request body is only valid with straight double quotes and the page hands one to the
      reader to paste. Narrowing a rule is exactly when it stops catching what it was
      written for, so the prose half is pinned here. The verbatim half cannot be expressed
      as an injection in this harness (it asserts injected=FAIL) and was checked by hand
      both ways when the change was made. */
   inject: s => s.replace("<body>", '<body><p>A reader said "this is prose" here.</p>')},

  {gate: "style", page: "collaboration", args: ["collaboration"], expect: /withdrawn:joint work/,
   defect: "a phrasing a published correction withdrew, printed again outside a correction note",
   /* The relapse that motivated the check: the h2 the 2026-09-28 correction rewrote. */
   inject: s => s.replace("Papers naming both fell as a share", "Joint work fell as a share")},

  {gate: "style", page: "collaboration", args: ["collaboration"], expect: /withdrawn:joint work/,
   defect: "a withdrawn phrasing split by hidden text, beside a correction label the prose only quotes",
   /* Both review families got past the first version of the check this way (2026-09-29):
      the hidden span broke the match, and the quoted label passed for a dated note. */
   inject: s => s.replace("<body>", '<body><p>The log’s “Correction, 28 September 2026” entry. Joint<span hidden>x</span> work rose.</p>')},

  {gate: "style", page: "collaboration", args: ["collaboration"], expect: /withdrawn:joint work/,
   defect: "a withdrawn phrasing split by an inline-flex pill, in the card beside a correction note",
   /* The confirmation round got past the second version this way (2026-09-29): the
      pill broke the phrase, and a note in one inline-block card exempted the next. */
   inject: s => s.replace("<body>", '<body><div><div style="display:inline-block">Correction, 28 September 2026: a count.</div><div style="display:inline-block">Joint <span style="display:inline-flex">work</span> rose.</div></div>')},

  {gate: "style", page: "collaboration", args: ["collaboration"], expect: /withdrawn:joint work/,
   defect: "a withdrawn phrasing split by a button, in a display:contents flex item beside a correction note",
   /* The third round got past the third version this way (2026-09-29): a control the
      list of inline tags missed broke the phrase, and display:contents let a note in one
      flex item exempt the next. */
   inject: s => s.replace("<body>", '<body><div style="display:flex"><div style="display:contents">Correction, 28 September 2026: a count.</div><div style="display:contents">Joint <button>work</button> rose.</div></div>')},

  {gate: "style", page: "collaboration", args: ["collaboration"], expect: /withdrawn:joint work/,
   defect: "a withdrawn phrasing whose word boundary is lost where two flex items join",
   /* The fourth round got past the fourth version this way (2026-09-29): reading flex
      items as one passage ran "Current" into "Joint work" as "CurrentJoint work", which
      the \b in the listed pattern does not match. */
   inject: s => s.replace("<body>", '<body><div style="display:flex;gap:2rem"><p>Current</p><p>Joint work rose.</p></div>')},

  {gate: "style", page: "collaboration", args: ["collaboration"], expect: /withdrawn:joint work/,
   defect: "a withdrawn phrasing split by a table cell, behind a correction label a filter hides",
   /* The fourth round got past the fourth version this way too (2026-09-29): a table part
      was not walked through, and text a filter made transparent still wrote a dated note. */
   inject: s => s.replace("<body>", '<body><p><span style="filter:opacity(0)">Correction, 28 September 2026: </span>Joint <span style="display:table-cell">work</span> rose.</p>')},

  {gate: "style", page: "collaboration", args: ["collaboration"], expect: /withdrawn:joint work/,
   defect: "a withdrawn phrasing inside one of two flex items, with an inline box inside a word",
   /* Round 15 of review (2026-09-29): the spaced reading broke the line at every box, so
      "Jo<span style=display:-webkit-inline-box>int</span>" read "Jo int", while the
      joined reading ran the flex items together as "CurrentJoint". */
   inject: s => s.replace("<body>", '<body><div style="display:flex;gap:2rem"><p>Current</p><p>Jo<span style="display:-webkit-inline-box">int</span> work rose.</p></div>')},

  {gate: "style", page: "collaboration", args: ["collaboration"], expect: /withdrawn:joint work/,
   defect: "a withdrawn phrasing passed as quoted because a visible closing quote was judged hidden",
   /* Round 15 of review (2026-09-29): a transform on a plain inline span does nothing, but
      the gate dropped the span's closing quote as scaled to zero, so the phrase after it
      read as inside “Old ... “New”. */
   inject: s => s.replace("<body>", '<body><p>“Old<span style="transform:scale(0)">”</span> Joint work rose. “New”</p>')},

  {gate: "style", page: "collaboration", args: ["collaboration"], expect: /withdrawn:joint work/,
   defect: "a withdrawn phrasing passed as corrected by a note turned edge-on",
   /* Round 16 of review (2026-09-29): rotateX(90deg) inside rotateX(-90deg) is drawn flat,
      so each span is edge-on and the note unseen, but the 3D product of the two
      rotations cancelled and the gate read the note as visible. */
   inject: s => s.replace("<body>", '<body><p><span style="display:inline-block;transform:rotateX(90deg)"><span style="display:inline-block;transform:rotateX(-90deg)">Correction, 28 September 2026: </span></span>Joint work rose.</p>')},

  {gate: "style", page: "collaboration", args: ["collaboration"], expect: /withdrawn:joint work/,
   defect: "a withdrawn phrasing split by an item nested in an inline box inside a word",
   /* Round 16 of review (2026-09-29): the <b> is an item of the inline box, and the
      spaced reading broke there, though the box sits in the word's line: "Jo int". */
   inject: s => s.replace("<body>", '<body><div style="display:flex;gap:2rem"><p>Current</p><p>Jo<span style="display:-webkit-inline-box"><b>int</b></span> work rose.</p></div>')},

  {gate: "style", page: "collaboration", args: ["collaboration"], expect: /withdrawn:joint work/,
   defect: "a withdrawn phrasing read as quoted because a closing quote kept in 3D was dropped",
   /* Round 17 of review (2026-09-29): under transform-style: preserve-3d the two rotations
      cancel and the closing quote shows, but the gate flattened every box, dropped the
      quote, and read the phrase as inside “Old ... “New”. */
   inject: s => s.replace("<body>", '<body><p><span style="visibility:hidden">Correction, 28 September 2026: </span>“Old<span style="display:inline-block;transform:rotateX(90deg);transform-style:preserve-3d"><span style="display:inline-block;transform:rotateX(-90deg)">”</span></span> Joint work rose. “New”</p>')},

  {gate: "style", page: "collaboration", args: ["collaboration"], expect: /withdrawn:joint work/,
   defect: "a withdrawn phrasing split by a block nested in an inline box inside a word",
   /* Round 17 of review (2026-09-29): the round-16 fix exempted only an inline item, and
      a display:block item still broke "Jo int", though the box sits in the word's line. */
   inject: s => s.replace("<body>", '<body><div style="display:flex;gap:2rem"><p>Current</p><p>Jo<span style="display:-webkit-inline-box"><b style="display:block">int</b></span> work rose.</p></div>')},

  {gate: "style", page: "collaboration", args: ["collaboration"], expect: /withdrawn:joint work/,
   defect: "a withdrawn phrasing run into the word before it, across a full-width inline box",
   /* Round 18 of review (2026-09-29): the round-17 fix read the edge of an inline box as
      no break, so "Current" and a block inside a full-width inline-block, on two lines,
      read "CurrentJoint work". */
   inject: s => s.replace("<body>", '<body><div>Current<span style="display:inline-block;width:100%"><b style="display:block">Joint work rose.</b></span></div>')},

  /* Round 18 of review (2026-09-29) found more ways the browser draws a note that the
     gate's emulation of transforms and compositing drew differently. The gate stopped
     emulating: any exemption resting on text drawn by such a style is refused, and says so. */
  {gate: "style", page: "collaboration", args: ["collaboration"], expect: /cannot confirm the note is seen/,
   defect: "a withdrawn phrasing passed as corrected by a note turned edge-on across a plain inline span",
   inject: s => s.replace("<body>", '<body><p><span style="display:inline-block;transform:rotateX(90deg);transform-style:preserve-3d"><span><span style="display:inline-block;transform:rotateX(-90deg)">Correction, 28 September 2026: </span></span></span>Joint work rose.</p>')},
  ...["will-change:opacity", "backdrop-filter:blur(1px)", "perspective:100px", "contain:layout",
      "overflow:clip"].map(style => (
  {gate: "style", page: "collaboration", args: ["collaboration"], expect: /cannot confirm the note is seen/,
   defect: `a withdrawn phrasing passed as corrected by a note turned edge-on, flattened by ${style}`,
   inject: s => s.replace("<body>", `<body>${turned(style)}`)})),
  ...["display:inline-block;contain:size;overflow:clip", "-webkit-mask-image:linear-gradient(transparent,transparent)",
      "filter:opacity(1%)"].map(style => (
  {gate: "style", page: "collaboration", args: ["collaboration"], expect: /cannot confirm the note is seen/,
   defect: `a withdrawn phrasing passed as corrected by a note hidden by ${style}`,
   inject: s => s.replace("<body>", `<body><p><span style="${style}">Correction, 28 September 2026: </span>Joint work rose.</p>`)})),
  /* clip takes effect only on an absolutely positioned box, which is a block of its own, so
     the clipped note is not in the phrase's line and fails before the drawn rule is asked */
  {gate: "style", page: "collaboration", args: ["collaboration"], expect: /withdrawn:joint work/,
   defect: "a withdrawn phrasing passed as corrected by a note hidden by clip:rect(0 0 0 0)",
   inject: s => s.replace("<body>", '<body><p><span style="position:absolute;clip:rect(0 0 0 0)">Correction, 28 September 2026: </span>Joint work rose.</p>')},

  /* Follow-ups of 2026-09-30. */
  {gate: "style", page: "collaboration", args: ["collaboration"], expect: /withdrawn:joint work/,
   defect: "a withdrawn phrasing spanning two flex items, exempted by a note in the first item alone",
   /* The note's box holds "Joint" and not "work", so the phrase is not in the note's line. */
   inject: s => s.replace("<body>", '<body><div style="display:flex"><span>Correction, 28 September 2026: Joint</span><span>work rose.</span></div>')},

  {gate: "style", page: "collaboration", args: ["collaboration"], expect: /withdrawn:joint work/,
   defect: "a withdrawn phrasing after a line break the tight reading lost inside an inline box",
   /* "Current" sits on the inline box's last line, beside "rose.", not beside "Jo"; the
      tight reading let the inline box undo the block's break and read "CurrentJoint". */
   inject: s => s.replace("<body>", '<body><div>Current<span style="display:inline-block"><b style="display:block">Jo<span style="display:inline-block">int</span> work</b><b style="display:block">rose.</b></span></div>')},

  {gate: "style", page: "collaboration", args: ["collaboration"], expect: /cannot confirm the note is seen/,
   defect: "a withdrawn phrasing passed as corrected by a note cut off by overflow:hidden",
   inject: s => s.replace("<body>", '<body><div style="overflow:hidden;height:2px">Correction, 28 September 2026: Joint work rose.</div>')},

  {gate: "style", page: "collaboration", args: ["collaboration"], expect: /cannot confirm the note is seen/,
   defect: "a withdrawn phrasing passed as corrected by a note in an inline span under content-visibility:hidden",
   inject: s => s.replace("<body>", '<body><p><span style="content-visibility:hidden">Correction, 28 September 2026: </span>Joint work rose.</p>')},

  {gate: "style", page: "collaboration", args: ["collaboration"], expect: /cannot confirm the note is seen/,
   defect: "a withdrawn phrasing passed as corrected by a note under display:contents and content-visibility:hidden",
   inject: s => s.replace("<body>", '<body><div><p style="display:contents;content-visibility:hidden">Correction, 28 September 2026: Joint work rose.</p></div>')},

  {gate: "style", page: "programs", args: ["programs"], expect: /withdrawn:graduated two polymer undergraduates/,
   defect: "a phrasing withdrawn before the list existed (2026-09-01), printed again",
   inject: s => s.replace("<body>", "<body><p>Akron graduated two polymer undergraduates.</p>")},

  /* Text a script writes only after a click: the rendered walk reads the default state, and
     cost-scissors printed its withdrawn "winning seat" in the seat selector's reading after
     a tap, which passed (2026-09-30). The script scan must find it in the source. */
  {gate: "style", page: "cost-scissors", file: "cost-scissors/app.js", args: ["cost-scissors"],
   expect: /withdrawn:winning seat: cost-scissors\/app\.js:\d+ \(script\)/,
   defect: "a withdrawn phrasing written into the page only after a control is used",
   inject: s => s.replace("<b>Finished products:</b> the seat still at its peak",
                          "<b>Finished products:</b> the winning seat")},

  /* The one fixture that must PASS: a bare dated note exempts. The drawn rule compares
     computed values with defaults as strings (zoom "1", clip "auto" ...), so a Chromium that
     serialises one differently would refuse every note on the site; this fails first, and
     names the cause, instead of five live exemptions flipping at once. */
  {gate: "style", page: "collaboration", args: ["collaboration"], exempt: true,
   expect: /passed as a dated correction note[\s\S]*collaboration: withdrawn:joint work: \S*rrection, 28 September 2026: Joint work rose/,
   defect: "a bare dated correction note, which must exempt the phrase it corrects",
   /* below the first h2: a dated note above it fails correction-above-headline (D3) */
   inject: s => s.replace("</h2>", '</h2><p>Correction, 28 September 2026: Joint work rose.</p>')},

  /* From the 2026-10-04 review fixes (PR A). Each puts back the exact text that shipped. */
  {gate: "style", page: "federal-money", args: ["federal-money"], expect: /footprint-relationship/,
   defect: "the footprint line naming the four counties NEO-14 adds and not the two it leaves " +
           "out, so twelve plus four reads as fourteen (six pages until 2026-10-04)",
   inject: s => s.replaceAll("; NEO-14 in turn leaves out Ashtabula and Trumbull. The two share ten counties.", ".")},

  {gate: "style", page: "sources", args: ["sources"], expect: /href-template: https:\/\/educationdata/,
   defect: "a dataset name linked to an API pattern with a literal {year}, a server error " +
           "for every reader who followed it (IPEDS directory, until 2026-10-04)",
   inject: s => s.replace("const home = s => s.docs || (s.url && !/[{}]/.test(s.url) ? s.url : null);",
                          "const home = s => s.url;")},

  {gate: "style", page: "index", args: ["index"], expect: /href-raw-markdown: \.\.\/CORRECTIONS\.md/,
   defect: "the front page's correction-log link opening raw Markdown source (until 2026-10-04)",
   inject: s => s.replace('href="../corrections/">correction log',
                          'href="../CORRECTIONS.md">correction log')},

  {gate: "style", page: "wages", args: ["wages"], expect: /correction-above-headline/,
   defect: "a dated correction note between the byline and the headline figure, so a reader " +
           "meets a finding's history before the finding (four pages until 2026-10-04, D3)",
   inject: s => s.replace(/(<p class="byline">By <b>John Swanson<\/b>[\s\S]*?<\/p>)/,
     '$1\n<p class="byline"><b>Correction, September 28, 2026:</b> the headline said pay was level.</p>')},

  {gate: "consistency", page: "corrections", file: "corrections/data/corrections.json",
   command: "python3", args: ["_data/build/verify_consistency.py"],
   expect: /\[corrections\] corrections\/data\/corrections\.json/,
   defect: "the rendered corrections log missing an entry CORRECTIONS.md carries, so the log " +
           "every page links to is short of the record (D3)",
   inject: s => { const d = JSON.parse(s); d.entries.splice(3, 1); return JSON.stringify(d, null, 1) + "\n"; }},

  {gate: "consistency", page: "corrections", file: "corrections/data/corrections.json",
   command: "python3", args: ["_data/build/verify_consistency.py"],
   expect: /does not render the Markdown word for word/,
   defect: "a rendered entry missing a word its Markdown carries (the renderer once read " +
           "\"2020.\" at the start of a wrapped line as a list number and dropped it)",
   inject: s => s.replace("rather than 2020", "rather than")},

  {gate: "consistency", page: "corrections", file: "CORRECTIONS.md",
   command: "python3", args: ["_data/build/verify_consistency.py"],
   expect: /resolve to no page/,
   defect: "a page named in a heading's italics that no page answers to, so its count " +
           "silently loses the entry (\"front page\" dropped from index, PR #49 review)",
   inject: s => s.replace("timeline, sources, front page*", "timeline, sources, frontpage*")},

  {gate: "disclosure", page: "wages", args: ["wages"], expect: /corrections line reads/,
   defect: "the how-we-checked box counting a page's corrections differently from the log " +
           "every count is read from (D3)",
   inject: s => s.replace(/(data-pv-file="corrections_by_page.json">[\s\S]*?"wages": \[\s*)\{[^}]*\},\s*/, "$1")},

  {gate: "consistency", page: "corrections", file: "_data/corrections_by_page.json",
   command: "python3", args: ["_data/build/verify_consistency.py"],
   expect: /\[corrections\] wages/,
   defect: "a page's correction summary counting an entry the log does not attribute to it",
   inject: s => { const d = JSON.parse(s); d.pages.wages.push({...d.pages.index[0]}); return JSON.stringify(d, null, 1) + "\n"; }},

  {gate: "style", page: "federal-money", args: ["federal-money"], expect: /withdrawn:still running/,
   defect: "a fiscal year called \"still running\" on a snapshot taken before it ended, false " +
           "from 30 September 2026 with every number on the page unchanged",
   inject: s => s.replace(/Fiscal 2026 had not closed when the data were retrieved, so its total is\s+partial\./,
                          "Fiscal 2026 is still running.")},

  {gate: "provenance", page: "cost-scissors", args: ["cost-scissors"],
   defect: "a page crediting a federal source it has never read",
   /* Injected into SOURCES.json rather than the artifact, so this case names its own file.
      This is the entry exactly as it shipped: cost-scissors is built from FRED price
      series and credited the BLS employment census for months. */
   file: "_data/SOURCES.json",
    inject: s => {
      const registry = JSON.parse(s);
      registry.by_artifact["cost-scissors"].push("qcew");
      return JSON.stringify(registry, null, 1) + "\n";
    }},

  {gate: "provenance", page: "funding-map", args: ["funding-map"],
   defect: "a page whose reproduce panel describes a source pull it never used: the funding " +
           "map, built from signed award documents, listed the USAspending contract recipe " +
           "(ER-04, 2026-10-04)",
   file: "_data/SOURCES.json",
    inject: s => {
      const registry = JSON.parse(s);
      registry.by_artifact["funding-map"].push("usaspending");
      return JSON.stringify(registry, null, 1) + "\n";
    }},

  {gate: "style", page: "laborshed", args: ["laborshed"], expect: /bare-first-reference:LEHD/,
   defect: "an acronym left unexpanded in a byline, passed for weeks by a silent debt entry " +
           "(laborshed's LEHD LODES, F§15, 2026-10-04)",
   inject: s => s.replace(/Census LEHD LODES \(Longitudinal Employer-Household Dynamics Origin-Destination Employment Statistics\)/,
                          "Census LEHD LODES")},

  {gate: "style", page: "patents", args: ["patents"], expect: /stale-debt:HTTP/,
   defect: "an acronym debt entry the page no longer needs, which would excuse the next bare " +
           "reference without anyone seeing it",
   inject: s => s.replace("<body>", "<body><p>HTTP (the protocol a browser speaks) carries every request here.</p>")},

  {gate: "style", page: "peers", args: ["peers"], expect: /withdrawn-link:/,
   defect: "a withdrawn citation coming back as a link address, which the text walk never " +
           "reads (Michelin's 2024 anniversary post, U P1, 2026-10-04)",
   inject: s => s.replace('href="https://michelinmedia.com/about/"',
                          'href="https://michelinmedia.com/pages/blog/detail/article/c0/a1370/"')},

  {gate: "style", page: "funding-map", args: ["funding-map"], expect: /case-mangled:uSA/,
   defect: "a data string lowercased at its first letter to sit mid-sentence, printing " +
           "\"uSAspending\" in a recipient panel only a deep link opens (PR #43, 2026-10-04)",
   inject: s => s.replace("Public record: ${ev.publicRecord}. ",
     "Public record: ${ev.publicRecord.charAt(0).toLowerCase() + ev.publicRecord.slice(1)}. ")},

  {gate: "alttext", page: "wages", args: ["wages"],
   defect: "a chart shipped with no accessible description at all",
   /* The structural half of the description defect. The SEMANTIC half, a description that
      states a true-looking count which is simply wrong, is not gateable and is pinned by a
      claim instead; see the header of tools/alttext.mjs. */
   inject: s => s.replace(/<title id="prem-t">[\s\S]*?<\/title>/, "")},

  {gate: "figures", page: "cluster-health", args: ["cluster-health"],
   defect: "a page stating an amount for a quantity the public record cannot show",
   /* Anchored on <body> rather than a page-specific class: the first draft keyed on
      `<p class="stand">` and the fixture went stale the moment that page was restructured,
      which the harness caught and reported as stale rather than as a passing gate. */
   inject: s => s.replace("<body>", '<body><p>The award is signed, none of it spent.</p>')},

  {gate: "nouns", page: "churn", prepare: ["tools/pagetext.mjs", "churn"],
   command: "python3", args: ["_data/build/verify_nouns.py", "churn"],
   expect: /\(0 could not be inspected, [1-9]\d* of \d+ occurrence\(s\) missing/,
   defect: "the right number, the wrong noun beside it — the atlas shape " +
           "(41 institutions printed as '41 recorded polymer awards', 2026-09-28)",
   /* Dropping "headcount" from beside churn's 17,725 reproduces the atlas shape: a true
      number, now missing the word it counts. */
   inject: s => s.replace("the headcount fell by 719, to 17,725.",
                          "the total fell by 719, to 17,725.")},

  {gate: "nouns", page: "atlas", prepare: ["tools/pagetext.mjs", "atlas"],
   command: "python3", args: ["_data/build/verify_nouns.py", "atlas"],
   expect: /\(0 could not be inspected, [1-9]\d* of \d+ occurrence\(s\) missing/,
   defect: "the atlas relapse itself: the right noun one clause back, the wrong one beside " +
           "the figure ('147 institution records since 1991; 41 recorded polymer awards')",
   /* Grok's refute, 2026-09-28: with "institution records" four words before the 41, the
      8-word window passed this exact relapse. The window now stops at the clause. */
   /* Global since 2026-10-05: the page now quotes this sentence again in its "What would
      prove this page wrong" list, and a first-match edit hit that copy, leaving the
      headline intact and the fixture passing. */
   inject: s => s.replace(/41 of them recorded\s+a polymer award/g, "41 recorded polymer awards")},

  {gate: "consistency", page: "sources", file: "index/data/counts.json",
   command: "python3", args: ["_data/build/verify_consistency.py"],
   expect: /\[published-register\] checks\.n_claims/,
   defect: "the sources page's copied claim census drifting from the generated index census",
   /* Mutate only the independently owned page row. Leaving both copied summaries stale
      ensures that an implementation which trusts counts.total_claims cannot pass its own
      fixture; the guard must re-derive the census exactly as derive_sources.py does. */
   inject: s => {
     const d = JSON.parse(s);
     d.pages.wages.claims += 1;
     return JSON.stringify(d, null, 1) + "\n";
   }},

  /* From the PR #33 and #36 reviews (Codex, 2026-09-30), which delayed the web font by
     hand. #dir, not #map: the map never redraws on a font load, so it cannot lose focus.
     Each injection swaps in a whole earlier onFonts helper. */
  {gate: "fontfocus", page: "reach", file: "reach/app.js", args: ["reach:dir"],
   expect: /focus lost/,
   defect: "a font-load redraw that replaces the focused chart mark and drops the reader on " +
           "<body> (the onFonts helper before PR #33)",
   inject: s => s.replace(ON_FONTS, "const onFonts = redraw => {\n" +
     '  document.fonts.forEach(f => { if (f.status === "loading") f.loaded.then(() => redraw(), () => {}); });\n' +
     '  document.fonts.addEventListener("loadingdone", () => redraw());\n};')},

  {gate: "fontfocus", page: "reach", file: "reach/app.js", args: ["reach:dir"],
   expect: /focus moved \d+ times/,
   defect: "focus restored once per arriving face and again on loadingdone, so a screen " +
           "reader announces the same mark several times (PR #33 as merged)",
   inject: s => s.replace(ON_FONTS, KEEP +
     '  document.fonts.forEach(f => { if (f.status === "loading") f.loaded.then(keep, () => {}); });\n' +
     '  document.fonts.addEventListener("loadingdone", keep);\n};')},

  {gate: "fontfocus", page: "reach", file: "reach/app.js", args: ["reach:dir"],
   expect: /no redraw while a face was still loading/,
   defect: "one redraw only after every face has landed, so the chart keeps fallback " +
           "measurements under Lato while one face loads (clipped 'North Carolina' on peers " +
           "at 768px on Linux; PR #36 as first written)",
   inject: s => s.replace(ON_FONTS, KEEP +
     "  let queued = false;\n  const settle = () => {\n    if (queued) return;\n    queued = true;\n" +
     '    requestAnimationFrame(() => { queued = false; if (document.fonts.status !== "loading") keep(); });\n  };\n' +
     '  if (document.fonts.status === "loading") document.fonts.ready.then(settle, () => {});\n' +
     '  document.fonts.addEventListener("loadingdone", settle);\n};')},

  /* The roving tab stop of 4 October 2026 has to follow focus, or the reader the font-load
     redraw hands back to their mark is handed a chart whose one Tab stop is elsewhere. */
  {gate: "fontfocus", page: "peers", file: "_shared/picviz.js", args: ["peers:states"],
   expect: /Tab stop/,
   defect: "a roving tab stop that stays on the first mark when focus is restored to another " +
           "one after the font-load redraw",
   inject: s => s.replace('document.addEventListener("focusin", e => {',
                          'document.addEventListener("focusin-off", e => {')},

  /* tools/access.mjs, added 4 October 2026 from the multi-persona audit and the usability
     review. Each injection puts back a defect the site shipped until that day. */
  {gate: "access", page: "peers", args: ["peers"], expect: /takes \d+ Tab stops/,
   defect: "every chart mark its own Tab stop (198 on peers before 4 October 2026, ER-02)",
   inject: s => s.replace("    enlist(node);\n", '    node.setAttribute("tabindex", "0");\n')},

  {gate: "access", page: "wages", args: ["wages"], expect: /no "Skip the chart" control/,
   defect: "a chart with no bypass before it in the Tab order (ER-02)",
   inject: s => s.replace("skipFor(g).hidden = !vis.length;", "void vis;")},

  {gate: "access", page: "peers", args: ["peers"], expect: /twin table holds 25 rows for 155/,
   defect: "the metro table holding the top 25 of the 155 metros plotted above it (ER-07)",
   inject: s => s.replace("const rows = ranked.map(", "const rows = ranked.slice(0, 25).map(")
                 .replace("ids: ranked.map(r => r.area)", "ids: ranked.slice(0, 25).map(r => r.area)")},

  {gate: "access", page: "wages", args: ["wages"], expect: /no live region it names/,
   defect: "a county button that rewrites the verdict with no live region (ER-10)",
   inject: s => s.replace('<p class="verdict" id="verdict" role="status" aria-live="polite"></p>',
                          '<p class="verdict" id="verdict"></p>')},

  {gate: "access", page: "peers", args: ["peers"], expect: /no accessible name/,
   defect: "a rendered link whose only content is an unlabelled graphic",
   inject: s => s.replace("<body>", '<body><p><a href="../wages/"><svg width="12" height="12"></svg></a></p>')},

  {gate: "access", page: "404", file: "404.html", args: ["404"], expect: /no element with id "stories"/,
   defect: "a 404 page whose story-list link points at nothing",
   inject: s => s.replace("/evidence-room/index/#alltitle", "/evidence-room/index/#stories")},

  {gate: "verify", page: "index", args: ["index"], expect: /contrast 5 under AA/,  /* byline, its name, the made-and-checked toggle row (3) */
   defect: "the hero byline at #9CC4CA, 3.62:1 on the teal hero (ER-11)",
   inject: s => s.replace("line-height:1.5;color:#C0DBE1;letter-spacing:.02em}",
                          "line-height:1.5;color:#9CC4CA;letter-spacing:.02em}")},

  /* From the Codex review of PR #44 (4 October 2026). */
  {gate: "access", page: "funding-map", args: ["funding-map"], expect: /390: chart #viz takes \d+ Tab stops/,
   defect: "the phone form of a chart left with every recipient card a Tab stop, which a " +
           "1440-only walk passed",
   inject: s => s.replace("PV.rove(viz, 'button.rcard, button.rname');", "")},

  {gate: "access", page: "peers", args: ["peers"], expect: /drops focus to <body>/,
   defect: "a search that redraws the scatter after the reader has Tabbed onto a dot, dropping " +
           "them on <body>",
   inject: s => s.replace('"#scatter [aria-label]"', '"#scatter [aria-label=none]"')},

  {gate: "access", page: "funding-map", args: ["funding-map"], expect: /after Escape closed what it opened/,
   defect: "the finder's status still calling a panel open after Escape closed it",
   inject: s => s.replace("    if (status) status.textContent = '';\n    if (push && location.hash)",
                          "    if (push && location.hash)")},

  /* From the review round of 5 October 2026. */
  {gate: "access", page: "chain", args: ["chain"], expect: /pressing Monomer[^;]* drops focus to <body>/,
   defect: "a stage or county press that redraws the ribbon and the map and drops the keyboard " +
           "reader on <body>",
   inject: s => s.replace("  renderAll();\n  if (key && !a.isConnected) {", "  renderAll();\n  if (false) {")},

  {gate: "access", page: "timeline", args: ["timeline"], expect: /closing the panel with Escape leaves focus on <body>/,
   defect: "closing an event's detail panel leaving focus on <body>, not the mark that opened it",
   inject: s => s.replace("const o = opener; opener = null;", "const o = null; opener = null;")},

  {gate: "style", page: "cluster-health", args: ["cluster-health"], expect: /withdrawn:fy2026 is still open/,
   defect: "\"FY2026 is still open\" on a dated snapshot, which the withdrawn pattern missed because " +
           "its optional space compiled to a required one",
   inject: s => s.replace("FY2026 was partial when retrieved and is left out", "FY2026 is still open and is left out")},

  {gate: "style", page: "churn", args: ["churn"], expect: /withdrawn:today:.*28 today/,
   defect: "\"today\" against a dated snapshot (churn's 55-and-older share, to 2025Q3)",
   inject: s => s.replace("about 28 in the year to the third quarter of 2025.", "about 28 today.")},

  {gate: "verify", page: "index", args: ["index"], expect: /eyebrow[^,]* 4\.12:1/,
   defect: "the brand lime eyebrow on the teal hero at 4.12:1, exempt from the check until 5 October 2026",
   inject: s => s.replace(".hero .eyebrow{color:#C6DE5D}", ".hero .eyebrow{color:#B8D637}")},

  {gate: "verify", page: "funding-map", args: ["funding-map"], expect: /1440:contrast-rendered[^:]*: p\.eyebrow/,
   defect: "the hero's radial glow under the eyebrow, 4.35:1 on funding-map at 1440, which the " +
           "ancestor-colour walk passed because a pseudo-element is not an ancestor (PR #48)",
   inject: s => s.replace(".hero::before{-webkit-mask-image:linear-gradient(to bottom,transparent 0,transparent 84px,#000 150px);\n  mask-image:linear-gradient(to bottom,transparent 0,transparent 84px,#000 150px)}", "")},

  {gate: "provenance", page: "accountability", args: ["accountability"], expect: /UNCREDITED/,
   defect: "a page printing signed-award figures while crediting only the USAspending contract " +
           "pull (accountability, cluster-health and scorecard until 5 October 2026)",
   file: "_data/SOURCES.json",
    inject: s => {
      const registry = JSON.parse(s);
      registry.by_artifact["accountability"] = registry.by_artifact["accountability"]
        .filter(k => !["eda_notices_of_award", "ohio_hub_grant_agreement", "pic_subgrant_agreements",
                       "usaspending_award_lookup"].includes(k));
      return JSON.stringify(registry, null, 1) + "\n";
    }},

  /* tools/launchers.mjs, added 6 October 2026 (ER-021). Pixel gates read 20 to 60px apart on
     macOS and on the Linux runner until every launch turned font hinting off; a tool that
     reaches Playwright on its own measures on the old basis again. */
  {gate: "launchers", page: "coldopen", file: "tools/coldopen.mjs", args: [],
   expect: /coldopen\.mjs:\d+  reaches a browser/,
   defect: "a pixel gate launching chromium itself, with the hinting that made macOS and CI disagree",
   inject: s => s.replace('import {launch} from "./_browser.mjs";',
                          'import {createRequire} from "module";\n' +   /* names split so this */
                          'const {chromium} = createRequire(import.meta.url)("play' + 'wright");')
                 .replace("await launch()", "await chromium." + "launch()")},  /* file passes the gate */

  {gate: "launchers", page: "_browser", file: "tools/_browser.mjs", args: [],
   expect: /no longer launches with --font-render-hinting=none/,
   defect: "the shared launcher losing the flag that makes Linux and macOS render alike",
   inject: s => s.replace('Object.freeze(["--font-render-hinting=none"])', "Object.freeze([])")},

  /* THE W4 READER FURNITURE (DECISIONS.md, 7 October 2026). Each piece, once a page opts in,
     must fail when it goes missing or stops agreeing with what it is rendered from. These
     inject on peers, the worked example, and the hub's table. */
  {gate: "consistency", page: "peers", file: "peers/index.html",
   command: "python3", args: ["_data/build/verify_consistency.py"],
   expect: /\[kicker\] peers\s+kicker reads 'Where Northeast Ohio actually sits'/,
   defect: "a story's kicker drifting from the question the hub asks for it (peers' eyebrow " +
           "before W4)",
   inject: s => s.replace("data-kicker>Where does Ohio rank?", "data-kicker>Where Northeast Ohio actually sits")},

  {gate: "consistency", page: "peers", file: "peers/claims.json",
   command: "python3", args: ["_data/build/verify_consistency.py"],
   expect: /\[quote\] peers\s+the quote prints 54,864/,
   defect: "a Quote this sentence whose figure was retyped wrong, with every claim still passing",
   inject: s => s.replace("2024: 54,846, which is", "2024: 54,864, which is")},

  {gate: "consistency", page: "peers", file: "peers/claims.json",
   command: "python3", args: ["_data/build/verify_consistency.py"],
   expect: /\[glossary\] peers\s+the page uses 'shift-share', which _data\/glossary.json does not define/,
   defect: "a page declaring a glossary term the shared definitions file does not hold",
   inject: s => s.replace('"terms": ["QCEW", ', '"terms": ["QCEW", "shift-share", ')},

  {gate: "consistency", page: "index", file: "_data/jobcounts.json",
   command: "python3", args: ["_data/build/verify_consistency.py"],
   expect: /\[jobcounts\] peers:18,549/,
   defect: "a job-count table total that no longer matches the claim on the story it names",
   inject: s => s.replace('"total": "18,594"', '"total": "18,549"')},

  {gate: "disclosure", page: "peers", args: ["peers"],
   expect: /claim oh-rank-1 carries a scope and no scope chip renders it/,
   defect: "a headline figure shipped without the scope chip its claim declares",
   inject: s => s.replace(', {scope: "oh-rank-1"}]', "]")},

  {gate: "disclosure", page: "peers", args: ["peers"],
   expect: /claims\.json declares a quote and the how-we-checked box shows none/,
   defect: "a declared Quote this sentence missing from the how-we-checked box",
   inject: s => s.replace("spec && spec.quote && spec.quote.text ?", "false ?")},

  {gate: "disclosure", page: "peers", args: ["peers"],
   expect: /declares a glossary and 0 Words on this page blocks render/,
   defect: "a page that declares its words losing the block that defines them",
   /* the static block and the script's fallback both, as a page that never ran render_static.py
      and lost the call would ship */
   inject: s => s.replace(/<details class="pv-words">[\s\S]*?<\/details>/, "")
                 .replace('await wordsOnPage(claims, document.querySelector(".pv-breaks-all") || sec);', "")},

  {gate: "disclosure", page: "peers", args: ["peers"],
   expect: /its total 18,594 is in the job-count table and the page has no link to it/,
   defect: "a story whose total is in the hub's job-count table with no link to it",
   inject: s => s.replace("A county total, not a sum of metros.`, {differs: true}]", "A county total, not a sum of metros.`]")},

  {gate: "disclosure", page: "index", args: ["index"],
   expect: /job-count table differs from _data\/jobcounts\.json: 17,707/,
   defect: "the hub's job-count table rendering a total its data file does not hold",
   inject: s => s.replace('<th scope="row">17,770</th>', '<th scope="row">17,707</th>')},

  /* PR #54 review: the furniture must survive without scripting, and an opened disclosure
     must not widen a phone page. */
  {gate: "consistency", page: "peers", file: "peers/index.html",
   command: "python3", args: ["_data/build/verify_consistency.py"],
   expect: /\[static\] peers\s+the static words region is empty/,
   defect: "a Words on this page block left to the script, so a reader without scripting gets " +
           "an empty mount where the glossary was (PR #54 as first pushed)",
   inject: s => s.replace(/(<!-- pv:static words -->)[\s\S]*?(<!-- \/pv:static -->)/, "$1\n    $2")},

  {gate: "consistency", page: "index", file: "index/index.html",
   command: "python3", args: ["_data/build/verify_consistency.py"],
   expect: /\[static\] index\s+the static jobcounts region is stale/,
   defect: "the hub's static job-count table edited by hand away from _data/jobcounts.json",
   inject: s => s.replace('<th scope="row">18,594</th>', '<th scope="row">18,549</th>')},

  {gate: "verify", page: "index", args: ["index"], expect: /(390|360):overflow-open/,
   defect: "the job-count table, opened on a phone, widening the whole page past the viewport " +
           "while the closed-disclosure pass stayed clean (394px at 360 and 390, PR #54)",
   inject: s => s.replace(".pv-jobcounts-scroll{overflow-x:auto;max-width:100%}", "")},

  /* W4 content (7 October 2026): the short card kicker as the one source, and the
     "If you run a plant here" box bound to the claims it names. */
  {gate: "consistency", page: "index", file: "index/index.html",
   command: "python3", args: ["_data/build/verify_consistency.py"],
   expect: /\[kicker\] index:peers\s+card kicker .* is 45 characters, over 40/,
   defect: "a hub card kicker grown past the 40 characters a short question gets",
   inject: s => s.replace('<p class="kick">Where does Ohio rank?</p>',
                          '<p class="kick">Where does Ohio rank among states and metros?</p>')},

  {gate: "consistency", page: "index", file: "index/index.html",
   command: "python3", args: ["_data/build/verify_consistency.py"],
   expect: /\[kicker\] index:federal-money\s+Start with a question link reads 'Where does federal money go\?'/,
   defect: "a Start with a question link drifting from its story's card kicker (federal money's link before W4)",
   inject: s => s.replace('<a href="../federal-money/">How big is the Tech Hub award?</a>',
                          '<a href="../federal-money/">Where does federal money go?</a>')},

  {gate: "consistency", page: "peers", file: "peers/claims.json",
   command: "python3", args: ["_data/build/verify_consistency.py"],
   expect: /\[plant\] peers#3\s+prints 95, which none of its automatically checked claims/,
   defect: "an If you run a plant here sentence printing a figure its claim does not state",
   inject: s => s.replace("average of about 59 people a site", "average of about 95 people a site")},

  {gate: "consistency", page: "peers", file: "peers/claims.json",
   command: "python3", args: ["_data/build/verify_consistency.py"],
   expect: /\[plant\] peers#2\s+must name at least one claim on the page, and only claims that exist; metro-visibilty/,
   defect: "an If you run a plant here sentence bound to a claim id that does not exist",
   inject: s => s.replace('"claims": ["metro-visibility"]', '"claims": ["metro-visibilty"]')},

  {gate: "consistency", page: "peers", file: "peers/claims.json",
   command: "python3", args: ["_data/build/verify_consistency.py"],
   expect: /\[scope\] peers:oh-rank-1\s+scope period '2023 annual avg' names a year neither/,
   defect: "a scope chip dating its figure to a year its claim never states",
   inject: s => s.replace('"period": "2024 annual avg"', '"period": "2023 annual avg"')},

  {gate: "disclosure", page: "cluster-health", file: "cluster-health/claims.json", args: ["cluster-health"],
   expect: /claim workplaces-recent-contrast carries a scope and no scope chip renders it/,
   defect: "a scope with no chip and no stated reason, the unchipped waiver dropped",
   inject: s => s.replace(/, "unchipped": "[^"]*"/, "")},

  {gate: "consistency", page: "peers", file: "peers/index.html",
   command: "python3", args: ["_data/build/verify_consistency.py"],
   expect: /\[static\] peers\s+the static plant region is stale/,
   defect: "the no-script If you run a plant here box drifting from claims.json plant",
   inject: s => s.replace("about 59 people a site, which", "about 60 people a site, which")},

  {gate: "disclosure", page: "peers", args: ["peers"],
   expect: /claims\.json declares If you run a plant here and 0 such boxes render/,
   defect: "a declared If you run a plant here box missing from the page",
   inject: s => s.replace("    plantBox(claims);\n", "").replace(/<section class="pv-plant-band">[\s\S]*?<\/section>/, "")},

  {gate: "style", page: "peers", args: ["peers"], expect: /scope-chip-form/,
   defect: "a scope chip set as a comma list rather than the house industry · place · period · source form",
   inject: s => s.replace('[s.industry, s.place, s.period, s.source].join(" \u00b7 ")',
                          '[s.industry, s.place, s.period, s.source].join(", ")')},
];

const only = process.argv.slice(2).filter(a => !a.startsWith("--"));
/* --list prints the fixtures as JSON and runs nothing: tools/all.mjs reads it to pick the
   fixtures a change can affect (a gate's code, a fixture's page or file). */
if (process.argv.includes("--list")) {
  console.log(JSON.stringify(CASES.map(c => ({gate: c.gate, page: c.page, file: c.file || null,
    command: c.command || "node", args: c.args, prepare: c.prepare || null}))));
  process.exit(0);
}
/* A gate that reads a derived file (nouns reads the text tools/pagetext.mjs dumps from the
   bundle) needs it re-derived from whatever the bundle holds before each run, and once more
   after the restore so the clean bundle is not left with the injected page's text. */
/* A failed dump must not pass as a caught defect: a stale or missing dump fails the gate
   too, but as "could not be inspected", which is not the defect the fixture exists for. */
const prepare = c => {
  if (!c.prepare) return;
  const r = spawnSync("node", c.prepare, {encoding: "utf8"});
  if (r.status !== 0) throw new Error(`${c.prepare.join(" ")} failed: ${(r.stderr || r.stdout || "").trim()}`);
};
const run = c => {
  const r = spawnSync(c.command || "node",
    c.command ? c.args : [`tools/${c.gate}.mjs`, ...c.args], {encoding: "utf8"});
  return {status: r.status ?? 1, output: (r.stdout || "") + (r.stderr || "")};
};

let trusted = 0, broken = [];
for (const c of CASES) {
  /* a name picks a gate's fixtures; gate/page picks that gate's fixtures on one page */
  if (only.length && !only.includes(c.gate) && !only.includes(`${c.gate}/${c.page}`)) continue;
  const f = c.file || `dist/${c.page}.html`;
  if (!existsSync(f)) { console.log(`SKIP  ${c.gate} — ${f} missing, run bundle first`); continue; }
  const backupDir = c.file ? mkdtempSync(join(tmpdir(), "evidence-room-selftest-")) : null;
  const bak = backupDir ? join(backupDir, "original") : `${f}.selftest-backup`;
  const originalTimes = statSync(f);
  copyFileSync(f, bak);
  let before, after;
  try {
    prepare(c);
    before = run(c);                                    // must be clean to start
    const src = readFileSync(bak, "utf8");
    const hurt = c.inject(src);
    if (hurt === src) throw new Error("injection changed nothing — the fixture is stale");
    writeFileSync(f, hurt);
    utimesSync(f, originalTimes.atime, originalTimes.mtime);
    prepare(c);
    after = run(c);                                     // must now fail
  } finally {
    copyFileSync(bak, f);
    unlinkSync(bak);
    utimesSync(f, originalTimes.atime, originalTimes.mtime);
    if (backupDir) rmdirSync(backupDir);
    prepare(c);
  }
  const named = !c.expect || c.expect.test(after.output);
  /* an `exempt` case injects something the gate must let through, and say so (expect) */
  const ok = before.status === 0 && (c.exempt ? after.status === 0 : after.status !== 0) && named;
  if (ok) trusted++; else broken.push(c);
  console.log(`${ok ? "  ok  " : "BROKEN"} ${c.gate.padEnd(11)} ${c.page.padEnd(15)} ` +
    `clean=${before.status === 0 ? "pass" : "FAIL"} ` +
    `injected=${after.status !== 0 ? "FAIL" : "pass"}${c.exempt ? " (must pass)" : ""}` +
    `${named ? "" : " wrong-failure"}  ${c.defect}`);
}

console.log("");
if (broken.length) {
  console.log(`${broken.length} gate fixture(s) did not behave. A gate that cannot fail on its`);
  console.log(`own defect is not evidence, and every green board it signs is worth less:`);
  broken.forEach(b => console.log(`  ${b.gate} / ${b.page}: ${b.defect}`));
} else {
  console.log(`${trusted} gate fixture(s) verified: each stays quiet on a clean page and fails`);
  console.log(`on the exact defect that motivated it.`);
}
process.exit(broken.length ? 1 : 0);
