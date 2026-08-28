/* PIC chart core — shared by every rebuilt prototype.
   Palette validated with dataviz/scripts/validate_palette.js:
     categorical #008BA8,#C85F0C,#A32A78 → 6/6 PASS light; dark WARN on plum,
     relieved by direct labels + table view (never dismissed).
     sequential = PIC teal ramp, monotonic light→dark.
   Rules enforced here: one axis per chart, solid hairline grid, thin marks,
   selective direct labels, hover on every mark, table-view twin. */
const PV = (() => {
  const NS = "http://www.w3.org/2000/svg";
  /* fill and stroke go on the STYLE, not as attributes, and that is not a preference.
     A presentation attribute sits BELOW every stylesheet rule in the cascade, so
     `fill="#fff"` on an element carrying class="pv-lab" loses to `.pv-lab{fill:...}` —
     silently, with no error and no console warning. That is how six charts came to print
     white-on-dark value labels in dark ink: the value sitting on the darkest cell of a
     heat matrix, which is exactly the number a reader most wants to read. Promoting the
     two color properties to inline style makes an explicit color win by construction. */
  const el = (t, a, p) => {
    const n = document.createElementNS(NS, t);
    for (const k in a) {
      if (a[k] == null) continue;
      if (k === "fill" || k === "stroke") n.style[k] = a[k];
      else n.setAttribute(k, a[k]);
    }
    if (p) p.appendChild(n);
    return n;
  };
  const txt = (p, s, a) => { const n = el("text", a, p); n.textContent = s; return n; };
  const CAT = ["#008BA8", "#C85F0C", "#A32A78"];
  const SEQ = ["#CFE8EC", "#9FD2DA", "#6BB8C4", "#3D9CAC", "#1A8A9E", "#0C6473"];
  const GRAY = "#B9B3A9", INK = "#0C6473";
  const usd = n => "$" + Math.round(n).toLocaleString("en-US");
  const usdShort = n => n >= 1e6 ? "$" + (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + "M"
                     : n >= 1e3 ? "$" + Math.round(n / 1e3) + "k" : "$" + n;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* nice round ticks */
  function ticks(lo, hi, n = 5) {
    const span = hi - lo || 1;
    const raw = span / n;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || mag * 10;
    const out = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }

  /* one shared tooltip element per page */
  let tip;
  function tooltip() {
    if (tip) return tip;
    tip = document.createElement("div");
    tip.className = "pv-tip";
    tip.setAttribute("role", "status");
    document.body.appendChild(tip);
    return tip;
  }
  function showTip(html, ev) {
    const t = tooltip();
    t.innerHTML = html;
    t.classList.add("on");
    const r = t.getBoundingClientRect();
    let x = ev.clientX + 14, y = ev.clientY - r.height - 12;
    if (x + r.width > innerWidth - 8) x = ev.clientX - r.width - 14;
    if (y < 8) y = ev.clientY + 18;
    t.style.left = x + "px"; t.style.top = y + "px";
  }
  const hideTip = () => tip && tip.classList.remove("on");

  /* Attach hover + keyboard focus to a mark. Tooltips enhance, never gate:
     every value is also in the table view. */
  function hoverable(node, html, label) {
    node.setAttribute("tabindex", "0");
    node.setAttribute("role", "img");
    if (label) node.setAttribute("aria-label", label);
    node.addEventListener("pointerenter", e => showTip(html, e));
    node.addEventListener("pointermove", e => showTip(html, e));
    node.addEventListener("pointerleave", hideTip);
    node.addEventListener("focus", () => {
      const r = node.getBoundingClientRect();
      showTip(html, {clientX: r.left + r.width / 2, clientY: r.top});
    });
    node.addEventListener("blur", hideTip);
    return node;
  }

  /* frame: solid hairline grid, recessive axes, no dashes */
  function frame(svg, {x, y, w, h, xs, ys, xt, yt, xfmt, yfmt, xlab, ylab, band}) {
    const g = el("g", {}, svg);
    if (band) el("rect", {x: xs(band[0]), y, width: xs(band[1]) - xs(band[0]),
      height: h, fill: "rgba(12,100,115,.06)"}, g);
    (yt || []).forEach(v => {
      el("line", {x1: x, y1: ys(v), x2: x + w, y2: ys(v),
        stroke: "var(--pv-grid)", "stroke-width": 1}, g);
      txt(g, yfmt ? yfmt(v) : v, {x: x - 10, y: ys(v) + 4, "text-anchor": "end",
        class: "pv-tick"});
    });
    (xt || []).forEach(v => {
      txt(g, xfmt ? xfmt(v) : v, {x: xs(v), y: y + h + 20, "text-anchor": "middle",
        class: "pv-tick"});
    });
    el("line", {x1: x, y1: y + h, x2: x + w, y2: y + h,
      stroke: "var(--pv-axis)", "stroke-width": 1}, g);
    if (xlab) txt(g, xlab, {x: x + w / 2, y: y + h + 46, "text-anchor": "middle",
      class: "pv-axlab"});
    if (ylab) txt(g, ylab, {x, y: y - 16, "text-anchor": "start", class: "pv-axlab"});
    return g;
  }

  /* build the table-view twin from rows [{cells:[], head:bool}] */
  function tableView(id, caption, head, rows) {
    return `<details class="pv-table"><summary>Table view: ${caption}</summary>
      <div class="pv-tablewrap"><table>
        <caption>${caption}</caption>
        <thead><tr>${head.map(h => `<th scope="col">${h}</th>`).join("")}</tr></thead>
        <tbody>${rows.map(r => `<tr>${r.map((c, i) =>
          i === 0 ? `<th scope="row">${c}</th>` : `<td>${c}</td>`).join("")}</tr>`).join("")}
        </tbody></table></div></details>`;
  }

  /* ---------------------------------------------------------------- ceremony

     Three helpers for the parts every page repeats verbatim. They exist because the
     repetition was measured — 40 identical chart preambles, 14 identical stat rows,
     6 identical footprint banners — not because abstraction is a virtue. Nothing that
     differs between pages is hidden in here: chart bodies stay explicit and local,
     because that is where the editorial thinking lives and it should be readable in
     the file it belongs to. */

  const N = n => Math.round(n).toLocaleString("en-US");

  /* The hero stat row. rows = [[cls, value, key, detail], ...]; the first is usually
     "key", which paints its rule in the accent. */
  function figures(rows, id = "figs") {
    const host = document.getElementById(id);
    if (!host) return null;
    host.innerHTML = rows.map(([c, n, k, d]) =>
      `<div class="figv ${c || ""}"><div class="n">${n}</div><div class="k">${k}</div>
       <div class="d">${d || ""}</div></div>`).join("");
    return host;
  }

  /* Chart scaffold. Replaces the five lines every chart opens with, and returns the
     geometry the body needs. Margins are merged over a sane default so a caller only
     states the ones it actually cares about — usually a right gutter wide enough for
     its own direct labels. */
  function chart(id, opts = {}) {
    const svg = document.getElementById(id);
    if (!svg) throw new Error(`chart("${id}"): no such element`);
    const m = Object.assign({t: 44, r: 60, b: 60, l: 78}, opts.m);
    const W = opts.W || 1100;
    /* ROW CHARTS DECLARE THEIR ROWS, NOT THEIR HEIGHT.
       Ten charts hand-computed `H = pad + rows * rowHeight`, and seven picked a pad
       smaller than their own top+bottom margins — so the last rows were drawn into the
       axis and painted over the tick labels. Passing {rows, rowH} makes that arithmetic
       the core's job and the mistake unrepresentable. A caller may still pass H directly
       for a chart that is not a stack of rows. */
    const H = opts.rows != null
      ? m.t + opts.rows * (opts.rowH || 32) + m.b
      : (opts.H || 400);
    if (opts.rows != null && opts.H != null)
      throw new Error(`chart("${id}"): pass rows+rowH OR H, never both`);
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    /* A CHART IS AS WIDE AS ITS DATA NEEDS. One figure width for a 51-row dot plot AND an
       11-point line was the tell that these pages were assembled from a template rather
       than composed: the line chart stretched 0.12 of premium across 980px and read as a
       wobble. `narrow:true` puts the containing .chart at --figure-narrow (640px), which is
       where an editorial desk sets a short time series. The svg still fills whatever box
       it is given via viewBox, so the caller changes nothing else. */
    if (opts.narrow) svg.closest(".chart")?.classList.add("narrow");
    /* Keep the first N ELEMENT children, not the first N childNodes. Written as a
       childNodes count, this silently ate the <title> on every chart whose markup was
       indented (`<svg ...>\n  <title>`): childNodes[0] is then the whitespace text node,
       so the kept slot held whitespace and the title was removed on first draw. Every
       such chart shipped role="img" aria-labelledby pointing at an element that no
       longer existed — a screen reader got no alternative at all, while the source
       markup looked correct and every gate passed. Found 2026-08-28. */
    const keep = opts.keep ?? 1;
    let kept = 0;
    for (const node of [...svg.childNodes]) {
      if (node.nodeType === 1 && kept < keep) { kept++; continue; }
      svg.removeChild(node);
    }
    return {svg, W, H, m, w: W - m.l - m.r, h: H - m.t - m.b};
  }

  /* Complete the final row of a card grid.
     The grids here draw their 1px rules by showing a line-colored container through
     the gaps. That is fine until the last row is short, at which point the leftover
     cells render as a large gray slab and the layout reads as broken. Inert fillers
     finish the row. Recomputed on resize because the column count is fluid, and hidden
     from assistive tech because they carry nothing. */
  function padGrid(gridSel, cardClass = "card") {
    const run = () => document.querySelectorAll(gridSel).forEach(g => {
      g.querySelectorAll(".pv-filler").forEach(f => f.remove());
      const cols = getComputedStyle(g).gridTemplateColumns.split(" ").filter(Boolean).length;
      const n = g.querySelectorAll(`.${cardClass}`).length;
      const short = cols > 1 ? (cols - (n % cols)) % cols : 0;
      for (let i = 0; i < short; i++) {
        const d = document.createElement("div");
        d.className = `${cardClass} pv-filler`;
        d.setAttribute("aria-hidden", "true");
        g.appendChild(d);
      }
    });
    run();
    addEventListener("resize", run, {passive: true});
  }

  /* Which county set this page was built from, stated on the page rather than left to
     the reader. PIC-12 and NEO-14 share ten counties and never reconcile. */
  function footprintBanner(FP, extra) {
    const b = document.createElement("div");
    b.className = "pv-footprint";
    // .wrap or it renders full-bleed at x=0, flush against the window edge, while every
    // other element on the page sits inside the centered column
    b.innerHTML = `<div class="wrap"><b>${FP.label}</b>: ${FP.words} counties.
      ${FP.note || ""}
      ${extra ? `<span class="d">${extra}</span>` : ""}
      ${FP.differs ? `<span class="d">${FP.differs}</span>` : ""}</div>`;
    const mast = document.querySelector(".mast");
    if (mast) mast.after(b);
    return b;
  }


  /* ------------------------------------------------------------------- mark

     The official PIC molecule mark, white variant, inlined verbatim from
     PIC-brand-assets/logos/polymer-industry-cluster/svg/PIC Logo 2025_Mark-White.svg.
     Geometry is untouched — never re-trace or re-typeset a real mark, and never
     recolour one; the white variant is used because these mastheads are dark, which
     is what that variant exists for.

     The isolated mark is the right lockup here because the masthead already sets
     "Polymer Industry Cluster" in type beside it; the full wordmark would say it twice.

     NOTE: it sits next to a PROTOTYPE flag on purpose. A registered mark on a draft
     implies clearance, so the flag has to stay louder than the logo. */
  const MARK = `<svg class="pv-mark" viewBox="-30 -30 289.182 294.048" role="img" aria-label="Polymer Industry Cluster" xmlns="http://www.w3.org/2000/svg"> <g id="pic-mark"> <path id="path2" d="m 1557.61,1759.91 -467.12,216.88 203.23,498.07 40.16,-16.38 -187.6,-459.77 429.59,-199.44 -18.26,-39.36" style="fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:none" transform="matrix(0.13333333,0,0,-0.13333333,0,349.17333)" /> <path id="path3" d="m 1313.8,2618.78 c -83.89,0 -152.13,-68.24 -152.13,-152.11 0,-83.89 68.24,-152.13 152.13,-152.13 83.87,0 152.12,68.24 152.12,152.13 0,83.87 -68.25,152.11 -152.12,152.11" style="fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:none" transform="matrix(0.13333333,0,0,-0.13333333,0,349.17333)" /> <path id="path4" d="m 256.441,1089.67 -35.511,24.91 389.636,555.58 495.664,335.55 24.31,-35.92 -489.044,-331.08 -385.055,-549.04" style="fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:none" transform="matrix(0.13333333,0,0,-0.13333333,0,349.17333)" /> <path id="path5" d="m 611.324,1638.49 -409.047,377.31 29.418,31.89 409.043,-377.31 -29.414,-31.89" style="fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:none" transform="matrix(0.13333333,0,0,-0.13333333,0,349.17333)" /> <path id="path6" d="m 626.031,1842.59 c -103.742,0 -188.148,-84.41 -188.148,-188.16 0,-103.74 84.406,-188.15 188.148,-188.15 103.75,0 188.157,84.41 188.157,188.15 0,103.75 -84.407,188.16 -188.157,188.16" style="fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:none" transform="matrix(0.13333333,0,0,-0.13333333,0,349.17333)" /> <path id="path7" d="m 1118.38,2139.88 c -83.88,0 -152.126,-68.24 -152.126,-152.13 0,-83.87 68.246,-152.11 152.126,-152.11 83.88,0 152.12,68.24 152.12,152.11 0,83.89 -68.24,152.13 -152.12,152.13" style="fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:none" transform="matrix(0.13333333,0,0,-0.13333333,0,349.17333)" /> <path id="path8" d="m 1566.74,1931.72 c -83.89,0 -152.13,-68.24 -152.13,-152.13 0,-83.87 68.24,-152.11 152.13,-152.11 83.88,0 152.12,68.24 152.12,152.11 0,83.89 -68.24,152.13 -152.12,152.13" style="fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:none" transform="matrix(0.13333333,0,0,-0.13333333,0,349.17333)" /> <path id="path9" d="m 216.984,2183.88 c -83.875,0 -152.1207,-68.25 -152.1207,-152.13 0,-83.89 68.2457,-152.13 152.1207,-152.13 83.887,0 152.129,68.24 152.129,152.13 0,83.88 -68.242,152.13 -152.129,152.13" style="fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:none" transform="matrix(0.13333333,0,0,-0.13333333,0,349.17333)" /> <path id="path10" d="M 238.684,1340.83 C 107.074,1340.83 0,1233.74 0,1102.13 0,970.512 107.074,863.441 238.684,863.441 c 131.613,0 238.695,107.071 238.695,238.689 0,131.61 -107.082,238.7 -238.695,238.7" style="fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:none" transform="matrix(0.13333333,0,0,-0.13333333,0,349.17333)" /> </g> </svg>`;

  /* The tab mark. The masthead MARK is white-filled for a dark strip, so used bare as a
     favicon it disappears on a light tab. This wraps the same paths on the masthead's own
     ground (--deeper) so the tab reads as the page's own header at 16px, and it is injected
     here rather than written into fifteen <head>s so a new page inherits it by existing.
     Data URI, so it survives bundling into a single self-contained file. */
  function favicon() {
    if (document.querySelector('link[rel="icon"]')) return;
    const paths = MARK.slice(MARK.indexOf("<g"), MARK.lastIndexOf("</svg>"));
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 -60 349 354">' +
      '<rect x="-60" y="-60" width="349" height="354" rx="52" fill="#052E36"/>' +
      paths + "</svg>";
    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    link.href = "data:image/svg+xml," + encodeURIComponent(svg);
    document.head.appendChild(link);
  }

  function mark() {
    const host = document.querySelector(".mast .wrap");
    if (!host || host.querySelector(".pv-mark")) return null;
    const span = document.createElement("span");
    span.className = "pv-markwrap";
    span.innerHTML = MARK;
    host.insertBefore(span, host.firstChild);
    return span;
  }

  /* Load a data file. Served from the folder it fetches; bundled into dist/ it reads
     the inlined <script type="application/json" data-pv-file> tag instead. One call
     site, both modes — the artifact and the source tree never diverge. */
  /* Where a file lives when the page is served as a folder rather than as a bundle.
     The bundler inlines everything as <script data-pv-file> tags, so for months the
     fetch path below only ever ran in local development — and it fetched EVERY file from
     data/, which is right for the artifact's own JSON and wrong for the two shared files.
     Deployed as raw folders (GitHub Pages), that meant SOURCES.json and claims.json both
     404ed and no page rendered its methodology block. Found 2026-08-17 by serving the
     staged public tree and looking. */
  const WHERE = {
    "SOURCES.json": "../_data/SOURCES.json",   // one registry for the whole site
    "claims.json": "claims.json",              // sits beside index.html, not in data/
  };
  async function data(file) {
    const tag = document.querySelector(`script[data-pv-file="${file}"]`);
    if (tag) return JSON.parse(tag.textContent);
    const url = WHERE[file] || `data/${file}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${file}: ${res.status} at ${url} — serve the folder over HTTP`);
    return res.json();
  }

  /* Footprint label. PIC-12 and NEO-14 share only 10 counties and never reconcile, so
     no page may hard-code "fourteen" — it reads what its own data was built from. */
  function footprint(meta) {
    const f = meta && meta.footprint;
    if (!f) return {label: "an unstated footprint", n: null, words: "these counties",
                    note: ""};
    const words = {12: "twelve", 14: "fourteen"}[f.n] || String(f.n);
    return {label: f.label, n: f.n, words, note: f.note || "", differs: f.differs || "",
            counties: f.counties || []};
  }

  /* ------------------------------------------------------------ methodology box

     Data journalism's standard "How we did this" disclosure, generated rather than
     hand-written, so it cannot drift from the data and no page can ship without one.
     It reads the page's own data meta and its claims file, so a page that adds a
     limitation to its meta gets it published here automatically.

     The AI paragraph is not optional and not boilerplate. Every page in this project
     was built by a language model, and one of them published a false finding — a
     transposed CIP code that erased a whole university's degree program and survived
     a passing assertion suite because the assertions were true of the filtered data.
     A reader is entitled to know that, to know what was checked, and to know what was
     not. Disclosure that only appears when the work went well is not disclosure. */
  async function methodology(opts = {}) {
    const o = Object.assign({claims: "claims.json"}, opts);
    /* A page that supplies noClaimsNote is TELLING us it has no claims file, so do not go
       looking for one. The catch below made the miss harmless, but it still left a 404 in
       the network log of the front page of a site whose entire argument is that it checks
       its own work — the first thing a sceptical reader opens is devtools. */
    if (o.noClaimsNote) o.claims = null;
    let claims = null;
    const inlined = o.claims && document.querySelector(`script[data-pv-file="${o.claims}"]`);
    if (o.claims && (inlined || location.protocol.startsWith("http"))) {
      try { claims = await data(o.claims); } catch (e) { /* page may carry none */ }
    }
    /* The registry is loaded here rather than passed in, so a page cannot forget it and
       silently publish without provenance. */
    let registry = o.registry || null;
    if (!registry) {
      try { registry = await data("SOURCES.json"); } catch (e) { registry = null; }
    }
    o.registry = registry;      // o is a const object; mutate, never reassign
    const m = o.meta || {};
    const list = claims && claims.claims ? claims.claims : [];
    const manual = list.filter(c => c.verify === "manual");
    const auto = list.filter(c => c.verify !== "manual");
    const li = a => a.filter(Boolean).map(x => `<li>${x}</li>`).join("");

    const sources = [m.source, m.sources, m.url && `<span class="mono">${m.url}</span>`]
      .filter(Boolean);
    // `excludes` names what a filter CANNOT see — the defect class that reads as an
    // absence rather than an error, so it belongs in Limitations, not a footnote.
    /* EVERY META KEY IS CLASSIFIED. NOTHING SHIPS BY DEFAULT.

       Three sets, and a key in none of them is a BUILD ERROR (verify_consistency.py
       enforces it) — not silently dropped, and not silently published.

       History, because both mistakes are instructive. This began as an eight-name
       allowlist and an audit on 2026-08-17 found 28 prose keys outside it being silently
       DISCARDED — real disclosure, correctly written, that never reached a reader:
       `laborshed`'s not_a_commute and no_industry, `reach`'s quarantine, `credit`'s
       two_footprints_never_compared. The first fix inverted it to a denylist, so unknown
       keys published automatically. Two independent model families rejected that for a
       public artifact on the same grounds: unclassified keys are where drafts live —
       `todo`, `editor_note`, half-written caveats, occasionally a raw vendor warning —
       and a typo like `limtations` would ship an unreviewed sentence. Publication should
       be opt-in; validation should be loud.

       So: fail-closed publication, fail-loud validation. Adding a meta key is now a
       deliberate act with one line of classification attached.

       LIMITS   — caveats that change how a reader should read the number.
       METHOD   — how it was computed. True, useful, and NOT a limitation; filing these
                  under "Limitations" was diluting the section with definitions.
       STRUCTURAL — provenance and scaffolding, rendered elsewhere or not at all. */
    const LIMITS = new Set([
      "not", "caution", "excludes", "suppression", "base_month_bias", "not_margin",
      "geography", "award_level_note", "what_a_null_would_mean", "window_is_legal",
      "two_footprints_never_compared", "uncertain", "scope", "not_the_cluster",
      "no_industry", "not_a_commute", "split_is_judgment", "impact_is_separate",
      "no_raw_trends", "quarantine", "nominal", "no_deflator", "small_numbers",
      "publicOnly", "note", "peer_rule", "size_control",
    ]);
    const METHOD = new Set([
      "definition", "bases", "stages", "baseline", "why", "why_corresponding",
      "rebasing", "composite_note", "derived_note",
    ]);
    const STRUCTURAL = new Set([
      "source", "sources", "url", "docs", "row", "fetched", "as_of", "years", "year",
      "span", "footprint", "title", "question", "home", "bounds", "basemap", "subfield",
      "subfield_alt", "cip", "cip_groups", "groups", "neo", "measure", "industries",
      "benchmark", "demographics", "control", "polymer_bound", "baseline_year",
      "two_measures", "led_joined", "naics",
    ]);
    const prose = ([, v]) => typeof v === "string" && v.trim().length >= 25;
    const limits = Object.entries(m).filter(e => prose(e) && LIMITS.has(e[0])).map(([, v]) => v);
    const method = Object.entries(m).filter(e => prose(e) && METHOD.has(e[0])).map(([, v]) => v);

    /* THE DATELINE. Every editorial data piece says who and when at the top; these pages
       said it at the bottom in 13px, on a site whose whole argument is "check our work."
       The date is meta.fetched — when the source was pulled — because that is the honest
       "as of" for an analysis that rebuilds from live federal series. It is written into
       the masthead from the data, so it can neither be forgotten nor go stale. Byline is
       the organisation, deliberately: this is desk work, and the reviewer of record is
       named in "How we checked it" below. */
    const mast = document.querySelector("header.mast .wrap");
    if (mast && m.fetched && !mast.querySelector(".dateline")) {
      const d = document.createElement("span");
      d.className = "dateline";
      d.textContent = `Data as of ${m.fetched}`;
      mast.appendChild(d);
    }

    const sec = document.createElement("section");
    sec.className = "band pv-method";
    sec.innerHTML = `<div class="wrap">
      <p class="takeaway">How we did this</p>
      <h2>Methodology, limits, and who to argue with</h2>
      <div class="pv-method-grid">
        ${(() => {
          /* REPRODUCE THIS. An audit on 2026-08-17 found only three of twenty datasets
             published a source URL and none published its industry or programme codes — so
             every page asserted reproducibility it did not provide. Naming "BLS QCEW"
             without naming NAICS 3252 tells a reader where to start, not what was done.
             The registry is _data/SOURCES.json, extracted from the fetch scripts rather
             than written from memory, and rendered here so it cannot drift from them. */
          const R = o.registry, keys = (R && R.by_artifact && R.by_artifact[o.page]) || [];
          if (!keys.length) return "";
          return `<details class="pv-repro">
            <summary><h3>Reproduce this</h3></summary>
            <p class="pv-method-note">Every figure on this page comes from the sources below.
              The filters are the exact values applied, not a description of them.</p>
            ${keys.map(k => {
              const src = R.sources[k]; if (!src) return "";
              const f = Object.entries(src.filters || {})
                .map(([kk, vv]) => `<dt>${kk}</dt><dd>${vv}</dd>`).join("");
              return `<div class="pv-src">
                <h4>${src.name}</h4>
                <p class="pv-method-note">${src.agency}${src.key_required
                  ? " &middot; free API key required" : ""}</p>
                ${src.url ? `<p class="mono pv-endpoint">${src.url}</p>` : ""}
                ${src.docs ? `<p class="pv-method-note"><a href="${src.docs}">Documentation</a></p>` : ""}
                ${f ? `<dl class="pv-filters">${f}</dl>` : ""}
                ${src.script ? `<p class="pv-method-note">Fetched by
                  <span class="mono">${src.script}</span></p>` : ""}
              </div>`;
            }).join("")}
          </details>`;
        })()}
        <div>
          <h3>Data sources</h3>
          ${sources.length ? `<ul>${li(sources)}</ul>`
            : `<p>${o.sourcesNote || "Named on each page this one links to."}</p>`}
          ${m.fetched ? `<p class="pv-method-note">Retrieved ${m.fetched}.</p>` : ""}
        </div>
        ${m.row || o.definitions || method.length ? `<div>
          <h3>What one row is, and how it was computed</h3>
          ${m.row ? `<p>${m.row}</p>` : ""}
          ${o.definitions ? `<p>${o.definitions}</p>` : ""}
          ${method.length ? `<ul>${li(method)}</ul>` : ""}
        </div>` : ""}
        ${limits.length ? `<div>
          <h3>Limitations</h3>
          <ul>${li(limits)}</ul>
        </div>` : ""}
        <div>
          <h3>How we checked it</h3>
          <p>${list.length
            ? `Every number on this page is written as a <b>test</b>, not a sentence:
               <b>${list.length}</b> of them, each stating the condition that would prove it
               wrong. ${auto.length} re-run automatically against the source data every time
               the page is built. ${manual.length === 0
                 ? "None of them rests on a document a person had to read, which is the stronger position: nothing here needs you to trust a reading."
                 : `${manual.length} ${manual.length === 1 ? "rests" : "rest"} on a document a person had to read, so ${manual.length === 1 ? "that one is" : "those are"} the place to attack first.`}`
            : (o.noClaimsNote || "This page makes no numeric claim of its own: every " +
               "figure on it is carried by the page it links to, and is checked there.")}</p>
          <p>The work was done with <b>Claude (Anthropic)</b>, directed and reviewed by a
            person. Figures are recomputed from the source data by script, and readings of
            what they mean were sent to competing AI systems to be argued down. That is a
            floor, not a guarantee: one mistyped federal classification code once erased a
            university&rsquo;s degree program from a finding and passed every check, because
            the checks were true of the data the mistake had already filtered. A reader
            caught it.</p>
        </div>
        <div>
          <h3>Corrections</h3>
          <p>Every figure here is rebuilt from free public data, so any of it can be
            checked independently, and errors are expected to be found.</p>
          <p>If you think something is wrong, say so:
            <b>${o.contact || "jswanson@greaterakronchamber.org"}</b>. The most useful note
            names the sentence and what you think it fails against.</p>
        </div>
      </div>
    </div>`;
    const closer = document.querySelector(".closer");
    if (closer) closer.parentNode.insertBefore(sec, closer);
    else document.body.appendChild(sec);
    return sec;
  }

  return {el, txt, ticks, frame, hoverable, showTip, hideTip, tableView, data, footprint,
          methodology, figures, chart, footprintBanner, padGrid, mark, favicon, N,
          CAT, SEQ, GRAY, INK, usd, usdShort, reduced};
})();
PV.mark();
PV.favicon();
