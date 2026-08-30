/* Prefer the JSON the bundler inlined; fall back to fetch when the folder is served
   directly. One call site, both modes — the source tree and the published artifact never
   diverge, and a bundled page needs no network at all. */
function loadData(file) {
  var tag = document.querySelector(
    'script[type="application/json"][data-pv-file="' + file + '"]');
  if (tag) return Promise.resolve(JSON.parse(tag.textContent));
  return fetch('data/' + file, {cache: 'no-cache'}).then(function (r) {
    if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
    return r.json();
  });
}

/* =========================================================================
   PIC funding map
   Vanilla JS. No dependencies, no build step. Everything on this page is
   derived from data/funding.json — that file is the single source of truth.

   Structure
     1  formatting          the number-format rule lives here and nowhere else
     2  data model          load, index, build the source→program→recipient graph
     3  diagram (wide)      SVG sankey, laid out in real CSS pixels
     4  cards (narrow)      the deliberate alternative view below ~960px
     5  table / csv / prose
     6  interaction         highlight, detail panel, hash routing, reveal
   ========================================================================= */

(() => {
  'use strict';

  // Container px. Measured, not guessed: below about this width the longest
  // recipient names ("Case Western Reserve University") can no longer sit beside
  // their chips and amount without being cut, so the card view takes over.
  /* Was 1120, which was above the shared 1044px column — so folding this page into the one
     column system silently swapped its centerpiece diagram for the phone fallback. The
     diagram itself was only ever drawing about 1,054px of ink, so it was never the reason
     for the number. 900 keeps the card fallback for real narrow screens. */
  const CARD_BREAKPOINT = 900;
  const REVEAL_MS = 1100;        // total staged-reveal budget

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let DATA = null;
  let G = null;                  // indexed graph
  let revealDone = false;
  let selected = null;           // {kind, id}
  let lastFocusEl = null;
  let currentMode = null;        // 'diagram' | 'cards'
  let lastW = 0;                 // last width we laid out for
  let cardMode = 'program';      // 'program' | 'amount' | 'name'

  const viz = document.getElementById('viz');
  const panel = document.getElementById('panel');
  const scrim = document.getElementById('scrim');
  const resetBtn = document.getElementById('reset-view');

  /* ---------------------------------------------------------------- 1 format */

  // The rule: $1M and above gets two decimals and an M. Below $1M gets whole
  // thousands and a K. Full precision belongs in the panel, the table and the CSV.
  function fmt(n) {
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
    return '$' + Math.round(n / 1000).toLocaleString('en-US') + 'K';
  }
  function fmtHero(n) { return '$' + (n / 1e6).toFixed(1) + 'M'; }
  function fmtFull(n) { return '$' + n.toLocaleString('en-US'); }

  // For screen readers, spelled out rather than abbreviated.
  function fmtSpoken(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(2) + ' million dollars';
    return Math.round(n / 1000).toLocaleString('en-US') + ' thousand dollars';
  }

  /* ---------------------------------------------------------------- 2 model */

  // `deep` paints the solid stem; `textInk` is the only value allowed on white
  // type — each measured at or above 4.5:1 so small labels stay legible.
  const TINT = {
    eda:  { solid: '#1A8A9E', deep: '#0C6473', textInk: '#0C6473', chipBg: '#D3EAEF', chipFg: '#0A5361' },
    // `ohio` is the source hue; `hub` is the same green used for the hub's own
    // workstreams. Same value, two names, because they mean different things.
    ohio: { solid: '#8FAE2B', deep: '#6E8A1E', textInk: '#4F6310', chipBg: '#E2EDC6', chipFg: '#3D4E0D' },
    hub:  { solid: '#8FAE2B', deep: '#6E8A1E', textInk: '#4F6310', chipBg: '#E2EDC6', chipFg: '#3D4E0D' },
    rd:   { solid: '#5E7A10', deep: '#4C630C', textInk: '#3E520A', chipBg: '#DCE7BE', chipFg: '#34450A' },
    s6:   { solid: '#B8D637', deep: '#93AE22', textInk: '#4A5A12', chipBg: '#EDF5C9', chipFg: '#4A5A12' },
    apex: { solid: '#E5673E', deep: '#C24E27', textInk: '#B04521', chipBg: '#FADCD1', chipFg: '#8A3419' }
  };
  const chipClass = (chip) => 'chip chip--' + chip.replace(/[^A-Z0-9]/gi, '');

  function index(data) {
    const sources = new Map(data.sources.map((s) => [s.id, s]));
    const programs = new Map(data.programs.map((p) => [p.id, p]));
    const recipients = new Map(data.recipients.map((r) => [r.id, r]));

    // links, plus the reverse indexes the highlight logic needs
    const progOut = new Map();   // programId -> [{recipient, award}]
    data.programs.forEach((p) => progOut.set(p.id, []));
    data.recipients.forEach((r) => {
      r.total = r.awards.reduce((a, w) => a + w.amount, 0);
      // An award may override its program's chip. Needed because `eda-direct` is genuinely ONE
      // instrument (seven awards obligated straight to their project leads) carrying three kinds
      // of work: five industry-led R&D projects, one workforce, one governance. Splitting the
      // program to label them would invent a structure the award does not have.
      // See specs/NAMING-RULING-RD-2026-08-13.md.
      r.chips = [...new Set(r.awards.map((w) => w.chip || programs.get(w.programId).chip))];
      r.awards.forEach((w, i) => {
        w.key = r.id + '::' + w.programId;
        w.recipientId = r.id;
        w.index = i;
        progOut.get(w.programId).push({ recipient: r, award: w });
      });
    });

    const srcPrograms = new Map();
    data.sources.forEach((s) => srcPrograms.set(s.id, data.programs.filter((p) => p.sourceId === s.id)));

    return { sources, programs, recipients, progOut, srcPrograms, order: data };
  }

  // Everything on the path through a node, upstream and downstream.
  function related(kind, id) {
    const nodes = new Set(), links = new Set();
    const addProgram = (p) => {
      nodes.add('prog:' + p.id);
      nodes.add('src:' + p.sourceId);
      links.add('link:' + p.sourceId + '>' + p.id);
      G.progOut.get(p.id).forEach(({ recipient, award }) => {
        nodes.add('rcp:' + recipient.id);
        links.add('link:' + award.key);
      });
    };
    if (kind === 'source') {
      nodes.add('src:' + id);
      G.srcPrograms.get(id).forEach(addProgram);
    } else if (kind === 'program') {
      addProgram(G.programs.get(id));
    } else {
      const r = G.recipients.get(id);
      nodes.add('rcp:' + r.id);
      r.awards.forEach((w) => {
        const p = G.programs.get(w.programId);
        nodes.add('prog:' + p.id);
        nodes.add('src:' + p.sourceId);
        links.add('link:' + p.sourceId + '>' + p.id);
        links.add('link:' + w.key);
      });
    }
    return { nodes, links };
  }

  /* ---------------------------------------------------------------- svg utils */

  const NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, text) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  function h(tag, attrs, kids) {
    const n = document.createElement(tag);
    for (const k in (attrs || {})) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach((c) => n.appendChild(c));
    return n;
  }
  const clamp = (lo, v, hi) => Math.max(lo, Math.min(v, hi));

  // Greedy word wrap for SVG plate copy. Aptos runs ~0.50em average advance,
  // so this estimate is close enough for two short label sentences.
  function wrap(str, maxW, fontSize) {
    const per = fontSize * 0.505;
    const words = str.split(/\s+/);
    const n = Math.max(1, Math.ceil((str.length * per) / maxW));
    const target = (str.length * per) / n;          // balance the lines, so no word is left alone
    const out = [];
    let line = '';
    words.forEach((w) => {
      const cand = line ? line + ' ' + w : w;
      const worse = Math.abs(cand.length * per - target) > Math.abs(line.length * per - target);
      if (line && worse && out.length < n - 1) { out.push(line); line = w; }
      else line = cand;
    });
    if (line) out.push(line);
    return out;
  }

  // Sankey ribbon: two cubics joined by straight caps.
  function ribbon(x0, y0a, y0b, x1, y1a, y1b) {
    const mx = (x0 + x1) / 2;
    return `M${x0},${y0a} C${mx},${y0a} ${mx},${y1a} ${x1},${y1a} L${x1},${y1b} C${mx},${y1b} ${mx},${y0b} ${x0},${y0b} Z`;
  }

  /* ---------------------------------------------------------------- 3 diagram */

  function layout(W) {
    const d = DATA;
    const pad = 8, srcGap = 34, innerGap = 4;

    // --- right column: one row per recipient, taller when it carries a second award
    /* 0.35, not 0.30. Every other zone in this layout is a ribbon or a band and shrinks
       gracefully; the recipient column is TEXT, and organization names do not get shorter
       when the column does. At the shared 980px column the old share left 294px and
       ellipsized "Full Circle Technologies" and a rider amount down to "+ $...". The flow
       region gives up 49px, which costs a ribbon nothing. Do not push past ~0.365: rowX
       would cross bandR and the rows would sit on top of the bands. */
    const rowW = clamp(280, W * 0.35, 440);
    const rightEdge = W - 4;
    const rowX = rightEdge - rowW;
    /* Two annotation slots live inside the recipient column: a contrast note above the
       Synthe6 cohort rows and a reconciliation footing under the last row. The heights
       are layout constants; every numeral in them is computed from DATA when drawn. */
    const A2H = 58, A3H = 84;
    const rows = [];
    let y = pad;
    let a2Top = null;
    const groupOf = (r) => G.programs.get(r.awards[0].programId).id;
    /* TWO CONCEPTS, NOT ONE. `multi` is a recipient funded by more than one program: it
       earns the convergence highlight and the second-award rider. `dual` is only the
       question of whether the row needs two lines, and a single-award recipient can need
       one too. "Case Western Reserve" beside a TRANSLATIONAL chip did not fit on one line
       at any width the diagram renders, and shrink-then-truncate shipped "Case Western
       Reserv…". On a two-line row the chips drop below and the name gets the whole
       column, which is the layout that already existed for multi-program rows. */
    const CHIP_PAD = 21, AMT_COL = 80;   // AMT_COL must match fitLabels
    const chipsW = (chips) => chips.reduce((a, c) => a + c.length * 7.7 + CHIP_PAD, 0);
    d.recipients.forEach((r, i) => {
      const multi = r.awards.length > 1;
      const oneLineRoom = (rightEdge - AMT_COL - chipsW(r.chips)) - rowX - 12;
      const dual = multi || (r.short || r.name).length * 6.3 > oneLineRoom;
      const hgt = dual ? 52 : 34;
      const prev = d.recipients[i - 1];
      // a little air between program groups
      if (prev && groupOf(prev) !== groupOf(r)) {
        y += 12;
        if (groupOf(r) === 'oh-startup') { a2Top = y; y += A2H; }
      }
      rows.push({ r, y, h: hgt, cy: y + (dual ? 18 : hgt / 2), dual, multi });
      y += hgt;
    });
    const a3Top = y + 10;
    const H = y + pad + A3H;

    // --- left column: three sources on one shared dollar scale
    const grand = d.meta.totals.total;
    const U = H - 2 * pad - 2 * srcGap - d.sources.length * innerGap;
    const s = U / grand;

    const srcLabelW = clamp(196, W * 0.205, 286);
    const stemW = 15;
    const bodyW = clamp(58, W * 0.068, 120);
    const srcX = srcLabelW;
    const mechX = srcX + stemW + bodyW;
    const hubZone = clamp(124, W * 0.158, 236);
    const bandX = mechX + hubZone;
    const bandW = clamp(136, W * 0.175, 254);
    const bandR = bandX + bandW;

    const src = [];
    let sy = pad;
    d.sources.forEach((so) => {
      const ah = so.award * s, mh = so.matchAmount * s;
      src.push({ so, y: sy, h: ah, my: sy + ah + innerGap, mh });
      sy += ah + innerGap + mh + srcGap;
    });
    const byId = Object.fromEntries(src.map((x) => [x.so.id, x]));

    // --- middle: EDA and APEX pass straight through; Ohio expands onto a
    // workstream column, and the funnel is what declares the scale change.
    const edaB = { x: mechX, w: bandR - mechX, y: byId.eda.y, h: byId.eda.h };
    const apexB = { x: mechX, w: bandR - mechX, y: byId.apex.y, h: byId.apex.h };
    // 0.68, not 0.60: the node has to be wide enough to hold "Innovation Hub" at a
    // legible size. It still ends short of bandX, so the funnel is only shorter.
    const hub = { x: mechX, w: hubZone * 0.68, y: byId.ohio.y, h: byId.ohio.h };
    // EDA has no split, so its mechanism is a plate on the flow rather than a
    // node it passes through. Same left edge as the hub node, so they rhyme.
    const edaPlate = { x: mechX, w: hubZone - 8, h: 124, y: edaB.y + edaB.h / 2 - 62 };

    const roomTop = edaB.y + edaB.h + 16;
    const roomBot = apexB.y - 16;
    const Hws = clamp(260, roomBot - roomTop, 470);
    let wsTop = (hub.y + hub.h / 2) - Hws / 2;
    wsTop = clamp(roomTop, wsTop, roomBot - Hws);

    const ohPrograms = G.srcPrograms.get('ohio');
    const ohTotal = ohPrograms.reduce((a, p) => a + p.amount, 0);
    const ws = [];
    let wy = wsTop;
    ohPrograms.forEach((p) => {
      const hh = (p.amount / ohTotal) * Hws;
      ws.push({ p, y: wy, h: hh });
      wy += hh;
    });

    // --- band segments each outgoing award leaves from
    const bandOf = {};
    bandOf['eda-direct'] = { x: bandR, y: edaB.y, h: edaB.h };
    bandOf['apex-workforce'] = { x: bandR, y: apexB.y, h: apexB.h };
    ws.forEach((w) => { bandOf[w.p.id] = { x: bandR, y: w.y, h: w.h }; });

    // slice each band among its recipients, ordered by row so ribbons stay legible
    const rowIndex = new Map(rows.map((rw, i) => [rw.r.id, i]));
    const slices = new Map();
    d.programs.forEach((p) => {
      const outs = G.progOut.get(p.id).slice()
        .sort((a, b) => rowIndex.get(a.recipient.id) - rowIndex.get(b.recipient.id));
      const band = bandOf[p.id];
      const sum = outs.reduce((a, o) => a + o.award.amount, 0);
      let cy = band.y;
      outs.forEach((o) => {
        const hh = (o.award.amount / sum) * band.h;
        slices.set(o.award.key, { x: band.x, y: cy, h: hh });
        cy += hh;
      });
    });

    return { W, H, pad, s, src, byId, srcX, stemW, bodyW, mechX, hubZone, bandX, bandW, bandR,
             rightEdge, rowX, rowW, rows, edaB, apexB, hub, edaPlate, ws, Hws, slices, bandOf,
             a2Top, a3Top };
  }

  function describe() {
    const d = DATA;
    const srcTxt = d.sources.map((s) =>
      `${s.name}, ${fmtSpoken(s.award)} plus ${fmtSpoken(s.matchAmount)} in ${s.matchLabel}`).join('; ');
    const wsTxt = G.srcPrograms.get('ohio').map((p) => `${p.name} ${fmtSpoken(p.amount)}`).join(', ');
    return `Money-flow diagram in three columns. Left, three public awards drawn to scale, each paired with a ` +
      `hatched match bar on the same scale: ${srcTxt}. Middle, the mechanism: the EDA award is obligated directly ` +
      `to each of seven project leads with no pass-through; the Ohio award enters the Greater Akron Polymer ` +
      `Innovation Hub and splits into five workstreams drawn to scale against each other (${wsTxt}); the Good Jobs ` +
      `Challenge APEX award runs to regional workforce programs with the Greater Akron Chamber as grantee. Right, ` +
      `one row per organization, each labeled with its amount and the program chips that fund it. ` +
      `${d.recipients.filter((r) => r.awards.length > 1).length} organizations receive money from more than one ` +
      `program. Notes on the diagram mark the ${fmtSpoken(G.programs.get('oh-facility').amount)} pilot facility ` +
      `as the single largest line, the ${G.progOut.get('oh-startup').length} startup awards of ` +
      `${fmtSpoken(G.progOut.get('oh-startup')[0].award.amount)} each, and the ` +
      `${fmtSpoken(d.meta.totals.awards - d.recipients.reduce((a, r) => a + r.total, 0))} awarded but not yet ` +
      `with a named recipient. Every figure is also in the data table below this graphic.`;
  }

  function renderDiagram(W) {
    const L = layout(W);
    const d = DATA;

    const svg = el('svg', {
      class: 'sankey', viewBox: `0 0 ${L.W} ${L.H}`, width: L.W, height: L.H,
      role: 'img', 'aria-label': describe()
    });

    // ---- defs: gradients per tint, hatches for match money
    const defs = el('defs');
    for (const k in TINT) {
      const g = el('linearGradient', { id: 'g-' + k, x1: 0, y1: 0, x2: 1, y2: 0 });
      g.appendChild(el('stop', { offset: 0, 'stop-color': TINT[k].solid, 'stop-opacity': .86 }));
      g.appendChild(el('stop', { offset: 1, 'stop-color': TINT[k].solid, 'stop-opacity': .56 }));
      defs.appendChild(g);
      const p = el('pattern', { id: 'h-' + k, width: 9, height: 9,
        patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
      p.appendChild(el('rect', { width: 9, height: 9, fill: TINT[k].solid, 'fill-opacity': .26 }));
      p.appendChild(el('rect', { width: 3.4, height: 9, fill: TINT[k].deep, 'fill-opacity': .52 }));
      defs.appendChild(p);
    }
    // one wipe per stream, so the reveal reads as three flows being drawn
    d.sources.forEach((so) => {
      const cp = el('clipPath', { id: 'clip-' + so.id, clipPathUnits: 'userSpaceOnUse' });
      cp.appendChild(el('rect', { class: 'wipe wipe--' + so.id, x: L.mechX, y: 0, width: L.W - L.mechX, height: L.H }));
      defs.appendChild(cp);
    });
    svg.appendChild(defs);

    // ---- convergence highlight behind multi-program rows
    // rowgroup, so the highlights arrive with the rows they belong to rather
    // than floating on an empty canvas during the reveal
    const hlG = el('g', { class: 'rowgroup' });
    L.rows.filter((rw) => rw.multi).forEach((rw) => {
      hlG.appendChild(el('rect', { class: 'hl dimmable', 'data-node': 'rcp:' + rw.r.id,
        x: L.rowX - 16, y: rw.y + 2, width: L.rightEdge - L.rowX + 16, height: rw.h - 4, rx: 8, fill: TINT.s6.solid }));
    });
    svg.appendChild(hlG);

    // ---- sources (bar + match chip + labels)
    const srcG = el('g', { class: 'srcgroup' });
    L.src.forEach((sx) => {
      const t = TINT[sx.so.hue];
      const nid = 'src:' + sx.so.id;
      const g = el('g', { class: 'dimmable', 'data-node': nid });
      g.appendChild(el('rect', { x: L.srcX, y: sx.y, width: L.stemW, height: sx.h, fill: t.deep }));
      g.appendChild(el('rect', { x: L.srcX + L.stemW, y: sx.y, width: L.bodyW, height: sx.h, fill: `url(#g-${sx.so.hue})` }));
      g.appendChild(el('rect', { x: L.srcX, y: sx.my, width: L.stemW, height: sx.mh, fill: t.deep, 'fill-opacity': .42 }));
      const mx2 = L.mechX, r = Math.min(6, sx.mh / 2);
      g.appendChild(el('path', {
        d: `M${L.srcX + L.stemW},${sx.my} H${mx2 - r} A${r},${r} 0 0 1 ${mx2},${sx.my + r} V${sx.my + sx.mh - r} A${r},${r} 0 0 1 ${mx2 - r},${sx.my + sx.mh} H${L.srcX + L.stemW} Z`,
        fill: `url(#h-${sx.so.hue})` }));

      // labels, right-aligned into the gutter, centered on the award bar
      const lx = L.srcX - 14, cy = sx.y + sx.h / 2;
      const amtSize = clamp(21, L.W * 0.021, 29);
      /* WRAP, don't truncate. "EDA Sustainable Polymers Tech Hub" is 33 characters and
         does not fit this gutter even at the 12px floor, so shrink-then-truncate shipped
         "EDA Sustainable Polymers Tech…" on the flagship $51.00M label. The gutter has
         empty vertical room above and below every bar, so the name takes a second line
         and the block re-centres around it. Only names that still overflow at the floor
         wrap; "Ohio Innovation Hub" and "Good Jobs Challenge (APEX)" stay on one line. */
      const gut = L.srcX - 16;
      const nameLines = (sx.so.name.length * 12 * 0.505 > gut) ? wrap(sx.so.name, gut, 15) : [sx.so.name];
      const dy = (nameLines.length - 1) * 17, off = -dy / 2;
      // style, not the fill attribute — the .sankey text rule would win otherwise
      g.appendChild(el('text', { class: 'src-amount', x: lx, y: cy - 24 + off, 'text-anchor': 'end',
        'font-size': amtSize, style: `fill:${t.textInk}` }, fmt(sx.so.award)));
      nameLines.forEach((ln, i) => g.appendChild(
        el('text', { class: 'src-name', x: lx, y: cy + 1 + i * 17 + off, 'text-anchor': 'end' }, ln)));
      g.appendChild(el('text', { class: 'src-kind', x: lx, y: cy + 21 + dy + off, 'text-anchor': 'end' }, sx.so.kind));
      g.appendChild(el('text', { class: 'src-match', x: lx, y: cy + 44 + dy + off, 'text-anchor': 'end',
        style: `fill:${t.textInk}` }, `+ ${fmt(sx.so.matchAmount)} ${sx.so.matchLabel}`));
      srcG.appendChild(g);
    });
    svg.appendChild(srcG);

    // ---- mechanism + ribbons, inside the per-stream wipe
    const flowG = el('g');
    d.sources.forEach((so) => {
      const g = el('g', { 'clip-path': `url(#clip-${so.id})` });
      flowG.appendChild(g);

      if (so.id === 'eda' || so.id === 'apex') {
        // The band is the awards bundled, so draw it as its slices with hairline
        // gaps. Hovering one recipient then lights its own thread of the band.
        const B = so.id === 'eda' ? L.edaB : L.apexB;
        const prog = G.srcPrograms.get(so.id)[0];
        G.progOut.get(prog.id).forEach(({ award }) => {
          const sl = L.slices.get(award.key);
          g.appendChild(el('rect', { class: 'band dimmable', 'data-node': 'prog:' + prog.id,
            'data-link': 'link:' + award.key,
            x: B.x, y: sl.y, width: B.w, height: Math.max(sl.h - 1.5, 1.2), fill: `url(#g-${prog.tint})` }));
        });
      } else {
        g.appendChild(el('rect', { class: 'dimmable', 'data-node': 'src:ohio',
          x: L.hub.x, y: L.hub.y, width: L.hub.w, height: L.hub.h, rx: 10, fill: TINT.eda.deep }));
        // funnel: hub band expands onto the workstream column
        const fx0 = L.hub.x + L.hub.w, fx1 = L.bandX, fm = (fx0 + fx1) / 2;
        let acc = L.hub.y;
        L.ws.forEach((w) => {
          const hh = (w.p.amount / 31250000) * L.hub.h;
          const tint = TINT[w.p.tint];
          g.appendChild(el('path', {
            class: 'funnel dimmable', 'data-node': 'prog:' + w.p.id, 'data-link': 'link:ohio>' + w.p.id,
            d: `M${fx0},${acc} C${fm},${acc} ${fm},${w.y} ${fx1},${w.y} L${fx1},${w.y + w.h} C${fm},${w.y + w.h} ${fm},${acc + hh} ${fx0},${acc + hh} Z`,
            fill: tint.solid, 'fill-opacity': .34 }));
          acc += hh;
        });
        L.ws.forEach((w) => {
          g.appendChild(el('rect', { class: 'band dimmable', 'data-node': 'prog:' + w.p.id,
            x: L.bandX, y: w.y, width: L.bandW, height: w.h, fill: `url(#g-${w.p.tint})` }));
        });
      }

      // ribbons out to the recipient rows
      G.srcPrograms.get(so.id).forEach((p) => {
        const tint = TINT[p.tint];
        G.progOut.get(p.id).forEach(({ recipient, award }) => {
          const sl = L.slices.get(award.key);
          const rw = L.rows.find((x) => x.r.id === recipient.id);
          const capH = 22, k = recipient.awards.length;
          const segH = capH / k, top = rw.cy - capH / 2 + award.index * segH;
          g.appendChild(el('path', {
            class: 'ribbon dimmable', 'data-link': 'link:' + award.key, 'data-node': 'rcp:' + recipient.id,
            d: ribbon(sl.x, sl.y, sl.y + Math.max(sl.h, 1.2), L.rowX - 13, top, top + segH),
            fill: tint.solid, 'fill-opacity': .42 }));
        });
      });
    });
    svg.appendChild(flowG);

    // ---- mechanism labels (outside the wipe so they never flash mid-draw)
    const mechG = el('g', { class: 'rowgroup' });
    const edaProg = G.srcPrograms.get('eda')[0];
    // A dark plate, because teal-900 type on the teal band measures 2.2:1 and
    // white type on it measures 3.2:1 — neither is readable. On the plate it is 6.8:1.
    // Each label set carries the same data-node as the shape it sits on, so a
    // label never stays dark over a band that has dimmed out from under it.
    const P = L.edaPlate;
    const plateG = el('g', { class: 'dimmable', 'data-node': 'prog:' + edaProg.id });
    plateG.appendChild(el('rect', { x: P.x, y: P.y, width: P.w, height: P.h, rx: 10, fill: TINT.eda.deep }));
    const cx = P.x + P.w / 2, inner = P.w - 20;
    let py = P.y + 30;
    wrap(DATA.sources[0].mechanismTitle, inner, 15).forEach((ln) => {
      plateG.appendChild(el('text', { class: 'plate-title', x: cx, y: py, 'text-anchor': 'middle' }, ln));
      py += 19;
    });
    py += 4;
    DATA.sources[0].mechanismLines.forEach((s) => {
      wrap(s, inner, 11.5).forEach((ln) => {
        plateG.appendChild(el('text', { class: 'plate-sub', x: cx, y: py, 'text-anchor': 'middle' }, ln));
        py += 14;
      });
    });
    mechG.appendChild(plateG);

    /* The hub label is wrapped to the node it sits inside, not hand-broken into three
       fixed lines: "Innovation Hub" at 15px is wider than the node, so white type ran off
       a dark box onto white paper and vanished at both ends. */
    const hubG = el('g', { class: 'dimmable', 'data-node': 'src:ohio' });
    const hubLines = wrap(G.sources.get('ohio').mechanismTitle, L.hub.w - 10, 13.5);
    hubLines.forEach((ln, i) => {
      hubG.appendChild(el('text', { class: 'hub-title', style: 'font-size:13.5px', x: L.hub.x + L.hub.w / 2,
        y: L.hub.y + L.hub.h / 2 + 5 - (hubLines.length - 1) * 8.5 + i * 17,
        'text-anchor': 'middle' }, ln));
    });
    mechG.appendChild(hubG);

    L.ws.forEach((w) => {
      const small = w.h < 34;
      const base = w.y + w.h / 2 + (small ? 4 : (w.p.rider ? -1 : 5));
      const g = el('g', { class: 'dimmable', 'data-node': 'prog:' + w.p.id });
      // `short` is the hand-authored label for a band too thin to carry the full name.
      // "Workforce development" shrank to the floor and still shipped "Workforce dev…".
      g.appendChild(el('text', { class: 'ws-name', x: L.bandX + 14, y: base,
        style: `font-size:${small ? 12 : 14.5}px` }, (small && w.p.short) || w.p.name));
      g.appendChild(el('text', { class: 'ws-amt', x: L.bandR - 14, y: base, 'text-anchor': 'end',
        style: `font-size:${small ? 12 : 15}px` }, fmt(w.p.amount)));
      if (w.p.rider && w.h > 44) {
        g.appendChild(el('text', { class: 'ws-rider', x: L.bandR - 14, y: base + 17, 'text-anchor': 'end' }, w.p.rider));
      }
      mechG.appendChild(g);
    });

    const apexG = el('g', { class: 'dimmable', 'data-node': 'prog:' + G.srcPrograms.get('apex')[0].id });
    /* Wrapped to the mechanism column, like the hub label above it, and stacked upward
       from the band. Set on one 14px line it ran 183px, past the mechanism column and
       under the Ohio "Workforce" band label by 18px — a real collision that no gate could
       see while this figure sat outside `.chart`. Folding the page into the house anatomy
       put it inside collide.mjs's reach, and this is what it found. */
    const apexLines = wrap(DATA.sources[2].mechanismTitle, L.hub.w - 10, 13);
    apexLines.forEach((ln, i) => {
      apexG.appendChild(el('text', { class: 'mech-title', x: L.mechX + 4,
        y: L.apexB.y - 16 - (apexLines.length - 1 - i) * 17,
        style: `font-size:13px;fill:${TINT.apex.textInk}` }, ln));
    });
    apexG.appendChild(el('text', { class: 'mech-sub', x: L.mechX + 4, y: L.apexB.y + L.apexB.h + 20 },
      DATA.sources[2].mechanismLines[0]));
    mechG.appendChild(apexG);

    // ---- recipient rows
    L.rows.forEach((rw) => {
      const r = rw.r, nid = 'rcp:' + r.id;
      const g = el('g', { class: 'dimmable', 'data-node': nid });
      const prime = r.awards[0], t0 = TINT[G.programs.get(prime.programId).tint];

      // node cap, split when the row is fed by two programs
      const capH = 22, k = r.awards.length, segH = capH / k;
      r.awards.forEach((w, i) => {
        const tt = TINT[G.programs.get(w.programId).tint];
        g.appendChild(el('rect', { x: L.rowX - 13, y: rw.cy - capH / 2 + i * segH, width: 8, height: segH - (k > 1 ? 1 : 0),
          rx: 2, fill: tt.solid }));
      });

      const nameY = rw.cy + 5;
      // `short` is the hand-authored map label. "Case Western Reserve University" cannot
      // sit beside its TRANSLATIONAL chip at any legible size and shipped truncated; the
      // full legal name stays in the panel, the table, the CSV and the screen-reader text.
      g.appendChild(el('text', { class: 'rc-name', x: L.rowX, y: nameY }, r.short || r.name));
      g.appendChild(el('text', { class: 'rc-amt', x: L.rightEdge, y: nameY, 'text-anchor': 'end', fill: t0.deep },
        fmt(prime.amount)));
      // On a multi-program row the chips drop to the second line with the rider,
      // which leaves the full column width for names like "Regional workforce programs".
      const chipY = rw.dual ? nameY + 19 : nameY;
      if (rw.multi) {
        const w2 = r.awards[1], p2 = G.programs.get(w2.programId);
        // data-short is the fallback when the row is too narrow for the program
        // name. Dropping it costs nothing — the chip beside it says the same thing.
        g.appendChild(el('text', { class: 'rc-rider', x: L.rowX + 2, y: chipY,
          'data-short': `+ ${fmt(w2.amount)}` }, `+ ${fmt(w2.amount)} ${p2.name}`));
      }
      const cg = el('g', { class: 'chipg' });
      r.chips.forEach((c) => {
        const ct = chipTintFor(c);
        cg.appendChild(el('rect', { class: 'chip-bg', height: 17, rx: 8.5, fill: ct.chipBg, y: chipY - 13 }));
        cg.appendChild(el('text', { class: 'chip-tx', y: chipY - 1, fill: ct.chipFg }, c));
      });
      g.appendChild(cg);
      mechG.appendChild(g);
    });
    svg.appendChild(mechG);

    renderAnnotations(svg, L);

    // ---- interactive overlay: real HTML buttons, so focus and semantics are real
    const hits = h('div', { class: 'hitlayer' });
    const addHit = (kind, id, label, x, y, w, hh) => {
      const b = h('button', { class: 'hit', type: 'button', 'data-kind': kind, 'data-id': id,
        'aria-label': label, style: `left:${x}px;top:${y}px;width:${w}px;height:${hh}px` });
      hits.appendChild(b);
    };
    L.src.forEach((sx) => {
      const so = sx.so;
      addHit('source', so.id,
        `${so.name}. ${fmtSpoken(so.award)} awarded, plus ${fmtSpoken(so.matchAmount)} in ${so.matchLabel}. Show details.`,
        0, sx.y - 4, L.mechX, sx.h + sx.mh + 12);
    });
    addHit('program', edaProg.id, `${edaProg.name}. ${fmtSpoken(edaProg.amount)}. Show details.`,
      L.edaB.x, L.edaB.y, L.edaB.w, L.edaB.h);
    L.ws.forEach((w) => addHit('program', w.p.id,
      `${w.p.name}, Ohio Innovation Hub. ${fmtSpoken(w.p.amount)}. Show details.`, L.bandX, w.y, L.bandW, w.h));
    const apexProg = G.srcPrograms.get('apex')[0];
    addHit('program', apexProg.id, `${apexProg.name}. ${fmtSpoken(apexProg.amount)}. Show details.`,
      L.apexB.x, L.apexB.y, L.apexB.w, L.apexB.h);
    L.rows.forEach((rw) => {
      const r = rw.r;
      const parts = r.awards.map((w) => `${fmtSpoken(w.amount)} from ${G.programs.get(w.programId).name}`).join(', and ');
      addHit('recipient', r.id, `${r.name}. ${parts}. Show details.`, L.rowX - 18, rw.y + 1, L.rightEdge - L.rowX + 18, rw.h - 2);
    });

    viz.textContent = '';
    viz.appendChild(svg);
    viz.appendChild(hits);
    viz.removeAttribute('aria-busy');

    fitLabels(svg, L);
    return L;
  }

  function chipTintFor(chip) {
    // EDA R&D tints with its SOURCE (federal teal), not with the Ohio R&D green. The two are both
    // R&D but they are different money, and color carries the stream while the word carries the work.
    if (chip === 'EDA' || chip === 'EDA R&D') return TINT.eda;
    if (chip === 'TRANSLATIONAL') return TINT.rd;
    if (chip === 'SYNTHE6') return TINT.s6;
    if (chip === 'APEX') return TINT.apex;
    return TINT.hub;
  }

  /* ------------------------------------------------------------- annotations
     Three editorial callouts drawn ON the diagram, and drawn LAST so nothing
     occludes them. Every numeral is computed from DATA and formatted by fmt(),
     the same rule as the labels they sit beside, so a data revision moves the
     annotation with it. Each group carries the data-node of the thing it is
     about, so it dims and lights with that thing. */
  const NUMWORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
    'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const numword = (n, cap) => {
    const w = NUMWORD[n] || String(n);
    return cap ? w.charAt(0).toUpperCase() + w.slice(1) : w;
  };

  function renderAnnotations(svg, L) {
    const g = el('g', { class: 'annos rowgroup' });

    // A1 — the single largest line is a building. Text sits in the empty left
    // gutter between the EDA and Ohio label blocks; the leader runs right,
    // through the source-bar gap, into the pilot-facility band.
    const fac = L.ws.find((w) => w.p.id === 'oh-facility');
    if (fac) {
      const corridorTop = L.byId.eda.my + L.byId.eda.mh + 10;  // below the EDA match bar
      const corridorBot = L.byId.ohio.y - 10;                  // above the Ohio award bar
      const ly = clamp(corridorTop, fac.y + 52, corridorBot);
      if (corridorBot - corridorTop >= 0) {
        const a1 = el('g', { class: 'dimmable', 'data-node': 'prog:' + fac.p.id });
        const tx = L.srcX - 14;
        [['The single largest line', 'anno-t anno-strong'],
         ['on this map is a building:', 'anno-t'],
         [`the ${fmt(fac.p.amount)} pilot facility.`, 'anno-t']].forEach(([t, cls], i) => {
          a1.appendChild(el('text', { class: cls, x: tx, y: ly - 34 + i * 16,
            'text-anchor': 'end' }, t));
        });
        /* The tip lands INSIDE the facility band, not on its left edge. At the edge it
           sat beside the pale funnel and the hatched EDA match block, and at rendered
           size a reader could read it as pointing at the match. */
        const tipX = L.bandX + Math.min(58, L.bandW * 0.45);
        a1.appendChild(el('line', { class: 'anno-lead', x1: L.srcX - 8, y1: ly + 6,
          x2: tipX, y2: ly + 6 }));
        a1.appendChild(el('circle', { class: 'anno-dot', cx: tipX, cy: ly + 6, r: 2.5 }));
        g.appendChild(a1);
      }
    }

    // A2 — the cash-layer contrast, directly above the Synthe6 cohort rows,
    // with an elbow leader pointing into the group.
    const s6 = G.progOut.get('oh-startup') || [];
    const eda7 = G.progOut.get('eda-direct') || [];
    if (L.a2Top != null && s6.length && eda7.length) {
      const amounts = s6.map((o) => o.award.amount);
      const sum6 = amounts.reduce((a, v) => a + v, 0);
      const even = Math.min(...amounts) === Math.max(...amounts);
      const edaSum = eda7.reduce((a, o) => a + o.award.amount, 0);
      const a2 = el('g', { class: 'dimmable', 'data-node': 'prog:oh-startup' });
      const l1 = `${numword(s6.length, true)} startups share ${fmt(sum6)} in cash` +
        (even ? `, ${fmt(amounts[0])} each.` : '.');
      const l2 = `The ${numword(eda7.length)} federal leads above hold ${fmt(edaSum)}.`;
      [[l1, 'anno-t anno-strong'], [l2, 'anno-t']].forEach(([t, cls], i) => {
        a2.appendChild(el('text', { class: cls, x: L.rowX, y: L.a2Top + 15 + i * 17 }, t));
      });
      a2.appendChild(el('path', { class: 'anno-lead',
        d: `M${L.rowX + 6},${L.a2Top + 40} V${L.a2Top + 54} h7`, fill: 'none' }));
      g.appendChild(a2);
    }

    // A3 — the reconciliation footing: awarded money with no named recipient yet,
    // ruled off under the recipient column like a ledger total.
    if (L.a3Top != null) {
      const named = DATA.recipients.reduce((a, r) => a + r.total, 0);
      const un = DATA.meta.totals.awards - named;
      const rdBal = G.programs.get('oh-rd').amount -
        G.progOut.get('oh-rd').reduce((a, o) => a + o.award.amount, 0);
      const s6Bal = G.programs.get('oh-startup').amount -
        s6.reduce((a, o) => a + o.award.amount, 0);
      const a3 = el('g', { class: 'dimmable', 'data-node': 'src:ohio' });
      a3.appendChild(el('line', { class: 'anno-lead', x1: L.rowX, y1: L.a3Top + 2,
        x2: L.rightEdge, y2: L.a3Top + 2 }));
      // "not yet sub-granted" is the contract word; on the figure it says "not yet passed
      // on", which is what it means. The sub-grant wording stays in the table note below.
      [[`Not on any row: ${fmt(un)} of awarded money has`, 'anno-t anno-strong'],
       [`no named recipient yet: ${fmt(rdBal)} of R&D not yet`, 'anno-t'],
       [`passed on, ${fmt(s6Bal)} running Synthe6 via Bounce.`, 'anno-t']].forEach(([t, cls], i) => {
        a3.appendChild(el('text', { class: cls, x: L.rowX, y: L.a3Top + 22 + i * 17 }, t));
      });
      g.appendChild(a3);
    }

    svg.appendChild(g);
  }

  // Measure once the real font is in, then place chips and shrink any name that
  // would collide with them. Nothing here changes the data — only the fit.
  function fitLabels(svg, L) {
    /* 80, not 92. The widest amount in this column is "$11.12M" at about 57px, so 92
       reserved 35px of air the recipient names needed: it is what pushed "Case Western
       Reserve University" under the truncation threshold. */
    const AMT_COL = 80;

    // Source labels are right-anchored into the left gutter, so anything too
    // wide runs off the canvas rather than overlapping something. Long names have
    // already been wrapped onto two lines by then; this only trims the remainder.
    const gutter = L.srcX - 16;
    svg.querySelectorAll('.src-name').forEach((n) => shrinkToFit(n, gutter, 15, 12));
    svg.querySelectorAll('.src-kind, .src-match').forEach((n) => shrinkToFit(n, gutter, 13.5, 12));
    // White type on a dark node: overflow is invisible, so it shrinks and never truncates.
    svg.querySelectorAll('.hub-title').forEach((n) => shrinkToFit(n, L.hub.w - 10, 13.5, 12, false));

    L.rows.forEach((rw) => {
      const g = svg.querySelector(`g[data-node="rcp:${CSS.escape(rw.r.id)}"].dimmable`);
      if (!g) return;
      const cg = g.querySelector('.chipg');
      const name = g.querySelector('.rc-name');
      if (!cg || !name) return;

      const rects = [...cg.querySelectorAll('rect')], txts = [...cg.querySelectorAll('text')];
      let widths = txts.map((t) => { try { return t.getComputedTextLength(); } catch (e) { return 40; } });
      const padX = 8, gapX = 5;
      let totalW = widths.reduce((a, w) => a + w + padX * 2, 0) + gapX * (widths.length - 1);
      let cx = L.rightEdge - AMT_COL - totalW;
      rects.forEach((rect, i) => {
        rect.setAttribute('x', cx);
        rect.setAttribute('width', widths[i] + padX * 2);
        txts[i].setAttribute('x', cx + padX);
        cx += widths[i] + padX * 2 + gapX;
      });

      // Shrink, then truncate, whichever text shares the line with the chips.
      const chipsLeft = L.rightEdge - AMT_COL - totalW;
      const rider = g.querySelector('.rc-rider');
      const target = rw.multi ? rider : name;
      const nameAvail = rw.dual ? (L.rightEdge - AMT_COL) - L.rowX - 12 : chipsLeft - L.rowX - 12;

      shrinkToFit(name, nameAvail, 15, 12);
      if (target && target !== name) {
        const availR = chipsLeft - L.rowX - 12;
        shrinkToFit(target, availR, 12.5, 12, false);
        if (target.getComputedTextLength() > availR) {
          target.textContent = target.getAttribute('data-short');
          target.style.fontSize = '';
          shrinkToFit(target, availR, 12.5, 12);
        }
      }
    });

    /* The workstream bands were the one label group this pass never covered, so they were
       the only place text could still land on top of text: the name is left-anchored inside
       the band and the amount right-anchored, and nothing checked that the two did not meet
       in the middle. "PIC Translational R&D" and "$5.79M" overlapped even at the old wider
       layout — it just took the narrower shared column to make it obvious. Stack when the
       band is tall enough to carry two lines; otherwise shrink, then truncate. */
    L.ws.forEach((w) => {
      const g = svg.querySelector(`g[data-node="prog:${CSS.escape(w.p.id)}"].dimmable`);
      if (!g) return;
      const name = g.querySelector('.ws-name'), amt = g.querySelector('.ws-amt');
      if (!name || !amt) return;
      const inner = (L.bandR - L.bandX) - 28, gap = 12;
      const aw = amt.getComputedTextLength();
      if (name.getComputedTextLength() + aw + gap <= inner) return;
      const rider = g.querySelector('.ws-rider');
      if (w.h >= 40 && !rider) {
        const base = parseFloat(name.getAttribute('y'));
        name.setAttribute('y', base - 9);
        amt.setAttribute('y', base + 10);
        amt.setAttribute('x', L.bandX + 14);
        amt.setAttribute('text-anchor', 'start');
        shrinkToFit(name, inner, 14.5, 12);
      } else if (w.h >= 60 && rider) {
        /* Three-line stack for a tall band that carries a rider. This is the
           "PIC Translational R&D" fix: shrink-then-truncate rendered it as
           "PIC Translati…" at exactly the width the lede told readers to study.
           Name, amount and rider each get their own left-anchored line instead. */
        const base = parseFloat(name.getAttribute('y'));
        name.setAttribute('y', base - 17);
        amt.setAttribute('y', base + 1);
        amt.setAttribute('x', L.bandX + 14);
        amt.setAttribute('text-anchor', 'start');
        rider.setAttribute('y', base + 19);
        rider.setAttribute('x', L.bandX + 14);
        rider.setAttribute('text-anchor', 'start');
        shrinkToFit(name, inner, 14.5, 12);
        shrinkToFit(rider, inner, 12, 12);
      } else {
        shrinkToFit(name, inner - aw - gap, 14.5, 12);
      }
    });

    // Annotation copy fits its lane or shrinks to the 12px floor, never past it.
    svg.querySelectorAll('.annos text').forEach((n) => {
      const end = n.getAttribute('text-anchor') === 'end';
      shrinkToFit(n, end ? L.srcX - 22 : L.rowW - 8, 12.5, 12);
    });
  }

  /* `min` is the project's 12px legibility floor, not a suggestion. These labels used to
     shrink to 10.5 to avoid truncating an organization name; below 12 the name is present
     but not readable, which is the worse failure. Truncate instead — the full value is in
     the hover and in the table view, so nothing is lost, only moved. */
  function shrinkToFit(node, avail, from, min, allowTruncate = true) {
    if (!node || avail <= 0) return;
    // style, not the font-size attribute — the class rule would win otherwise
    let fs = from, w = node.getComputedTextLength();
    while (w > avail && fs > min) { fs -= 0.5; node.style.fontSize = fs + 'px'; w = node.getComputedTextLength(); }
    if (allowTruncate && w > avail) {
      let s = node.textContent;
      while (s.length > 4 && node.getComputedTextLength() > avail) { s = s.slice(0, -2); node.textContent = s + '…'; }
    }
  }

  /* ---------------------------------------------------------------- 4 cards */

  function renderCards() {
    const d = DATA;
    const root = h('div', { class: 'cards' });

    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Arrange recipients' });
    [['program', 'By program'], ['amount', 'By amount'], ['name', 'A–Z']].forEach(([k, lab]) => {
      seg.appendChild(h('button', { type: 'button', text: lab, 'aria-pressed': String(cardMode === k),
        onclick: () => { cardMode = k; render(); } }));
    });
    root.appendChild(h('div', { class: 'sortbar' }, [
      h('span', { class: 'sortbar-label', text: 'Arrange' }), seg
    ]));

    /* GLOBAL bar scale. Scaling each group to its own maximum rendered a $25K
       cohort award and an $11.12M federal award as the same full-width bar two
       screens apart — a cross-group misread waiting to happen. One maximum for
       every bar, stated, so a sliver means a sliver. */
    const gmax = Math.max(...d.recipients.flatMap((r) => r.awards.map((w) => w.amount)));
    const gRec = d.recipients.find((r) => r.awards.some((w) => w.amount === gmax));
    root.appendChild(h('p', { class: 'cards-note',
      text: `Every bar is drawn against the same maximum, ${gRec.name} at ${fmt(gmax)}, so lengths compare across groups.` }));

    const card = (r, amount, chips, tint, max, segs) => {
      const bar = h('div', { class: 'rcard-bar' });
      segs.forEach((sg) => {
        const pct = (sg.amount / max) * 100;
        bar.appendChild(h('span', { style: `width:${pct}%;background:${sg.color}` }));
      });
      const chipRow = h('div', { class: 'rcard-chips' });
      chips.forEach((c) => chipRow.appendChild(h('span', { class: chipClass(c), text: c })));
      return h('li', {}, [
        h('button', {
          class: 'rcard', type: 'button', 'data-kind': 'recipient', 'data-id': r.id,
          'aria-label': `${r.name}, ${fmtSpoken(amount)}. Show details.`
        }, [
          h('div', { class: 'rcard-top' }, [
            h('span', { class: 'rcard-name', text: r.name }),
            h('span', { class: 'rcard-amt', text: fmt(amount) })
          ]),
          chipRow, bar
        ])
      ]);
    };

    /* One card for a cohort of identical awards. Nine consecutive $25,000 cards drew nine
       1px slivers down about a thousand pixels of phone scroll and encoded nothing: at the
       shared $18.52M maximum they are all the same length, and the only thing that differs
       between them is the company name. So the nine names travel inside one card, each one
       still its own button, so nothing is dropped and every deep link still resolves. */
    const cohortCard = (p, outs, tint, max) => {
      const sum = outs.reduce((a, o) => a + o.award.amount, 0);
      const bar = h('div', { class: 'rcard-bar' }, [
        h('span', { style: `width:${(sum / max) * 100}%;background:${tint.solid}` })]);
      const names = h('ul', { class: 'rcard-names' });
      outs.slice().sort((a, b) => a.recipient.name.localeCompare(b.recipient.name))
        .forEach(({ recipient, award }) => names.appendChild(h('li', {}, [
          h('button', { class: 'rname', type: 'button', 'data-kind': 'recipient',
            'data-id': recipient.id, text: recipient.name,
            'aria-label': `${recipient.name}, ${fmtSpoken(award.amount)}. Show details.` })])));
      return h('li', { class: 'card-wide' }, [h('div', { class: 'rcard rcard--group' }, [
        h('div', { class: 'rcard-top' }, [
          h('span', { class: 'rcard-name',
            text: `${numword(outs.length, true)} companies, ${fmt(outs[0].award.amount)} each` }),
          h('span', { class: 'rcard-amt', text: fmt(sum) })
        ]),
        bar, names
      ])]);
    };

    if (cardMode === 'program') {
      d.programs.forEach((p) => {
        const so = G.sources.get(p.sourceId);
        const tint = TINT[p.tint];
        const outs = G.progOut.get(p.id).slice().sort((a, b) => b.award.amount - a.award.amount);
        const amts = outs.map((o) => o.award.amount);
        const even = outs.length > 2 && Math.min(...amts) === Math.max(...amts);
        const list = h('ul', { class: 'card-list' });
        if (even && outs.length > 3) {
          list.appendChild(cohortCard(p, outs, tint, gmax));
        } else {
          outs.forEach(({ recipient, award }) => {
            list.appendChild(card(recipient, award.amount, recipient.chips, tint, gmax,
              [{ amount: award.amount, color: tint.solid }]));
          });
        }
        const grp = h('section', { class: 'card-group', style: `--grp:${tint.solid}` }, [
          h('div', { class: 'cg-head' }, [
            h('h3', { class: 'cg-title', text: p.name }),
            h('span', { class: 'cg-amount', text: fmt(p.amount) })
          ]),
          h('p', { class: 'cg-sub', text: `${so.short} · ${outs.length} recipient${outs.length > 1 ? 's' : ''}` +
            (even ? ` · ${fmt(amts[0])} each` : '') }),
          list
        ]);
        root.appendChild(grp);
      });
    } else {
      const list = h('ul', { class: 'card-list' });
      const sorted = d.recipients.slice().sort(
        cardMode === 'amount' ? (a, b) => b.total - a.total : (a, b) => a.name.localeCompare(b.name));
      const max = Math.max(...sorted.map((r) => r.total));
      sorted.forEach((r) => {
        const segs = r.awards.map((w) => ({ amount: w.amount, color: TINT[G.programs.get(w.programId).tint].solid }));
        list.appendChild(card(r, r.total, r.chips, TINT.eda, max, segs));
      });
      root.appendChild(h('section', { class: 'card-group', style: '--grp:var(--teal-500)' }, [
        h('div', { class: 'cg-head' }, [
          h('h3', { class: 'cg-title', text: cardMode === 'amount' ? 'All recipients, largest first' : 'All recipients, A to Z' }),
          h('span', { class: 'cg-amount', text: fmt(DATA.meta.totals.awards) })
        ]),
        h('p', { class: 'cg-sub', text: `${sorted.length} organizations · bar segments show each program that funds them` }),
        list
      ]));
    }

    viz.textContent = '';
    viz.appendChild(root);
    viz.removeAttribute('aria-busy');
    return root;
  }

  /* ---------------------------------------------------------------- 5 static */

  function renderLegend() {
    const lg = document.getElementById('legend');
    lg.textContent = '';
    const block = (title, items) => {
      const ul = h('ul', {});
      items.forEach((it) => ul.appendChild(h('li', {}, [
        it.chip ? h('span', { class: chipClass(it.label), text: it.label })
                : h('span', { class: 'sw' + (it.hatch ? ' sw--hatch' : ''),
                    style: it.hatch ? `color:${it.color}` : `background-color:${it.color}` }),
        h('span', { text: it.text })
      ])));
      return h('div', {}, [h('h3', { text: title }), ul]);
    };
    lg.appendChild(block('Funding source', [
      { color: TINT.eda.solid, text: 'EDA Tech Hub (federal)' },
      { color: TINT.hub.solid, text: 'Ohio Innovation Hub (state)' },
      { color: TINT.apex.solid, text: 'Good Jobs Challenge / APEX (federal)' },
      { color: TINT.hub.deep, hatch: true, text: 'Match and cost share, promised alongside' }
    ]));
    lg.appendChild(block('Program, within the Ohio stream', [
      { color: TINT.rd.solid, text: 'PIC Translational R&D' },
      { color: TINT.s6.solid, text: 'Synthe6 startup awards' },
      { color: TINT.hub.solid, text: 'Hub workstreams' }
    ]));
    /* The third block was a key to the program chips: six chips with no text beside them,
       restating styles the rows already spell out in words. Thirteen legend entries on a
       directly-labelled chart is legend-as-primary-decoding, so the self-labelling half
       is gone and only the two colour keys remain. (The two R&D chips are still distinct
       on purpose: EDA R&D is the industry-led Tech Hub work, TRANSLATIONAL is the ODOD
       program. Both are research; they are different money, and the hues say so.) */
    lg.hidden = false;
  }

  function renderProse() {
    /* CAVEAT INK. What stays visible beside the figure is one limitation sentence and one
       source line, about 33 words against a 45-word budget. The EDA verification note, the
       NEO-SMART note and the whole drawn-to-scale inventory ran to ~170 words of apparatus
       under the map; they are the same words, one click away, where the reader who wants
       them can still reach them without wading through them to get to the story. */
    /* PLAIN FIRST. "disbursement follows milestones" is the one term of art left in the
       sentence a reader actually meets beside the figure, and it is the sentence that
       decides whether they read these bars as money spent. The plain reading leads; the
       data string follows verbatim, so a correction to it still propagates. */
    document.getElementById('fn-disclosure').textContent =
      'Money is paid out as the work hits agreed checkpoints. ' + DATA.meta.disclosures[0];
    const more = document.getElementById('fn-more');
    DATA.meta.scaleNote.concat(DATA.meta.disclosures.slice(1))
      .forEach((t) => more.appendChild(h('p', { text: t })));
    /* Record-level provenance — which signed document each figure came from — has no slot
       in the generated methodology box (PV.methodology's meta keys are fixed in the shared
       core). It rides with the register it documents, one click away. */
    const pl = document.getElementById('prov-list');
    DATA.meta.provenance.forEach((t) => pl.appendChild(h('li', { text: t })));
  }

  /* THE STAT ROW IS THE ADDITION, LAID OUT. It used to lead with $106.3M under the key
     "Public money in play", with the two parts as the second and third cards and a fourth
     unrelated total beside them — four figures in a 2x2 grid with nothing saying how any
     of them related, arriving under a headline that printed a fifth reading of the first.
     Read in grid order it is now: awarded, promised beside it, the two added, and how much
     of the awarded money has found a recipient. The key line on the third card does the
     work a plus sign cannot: at 390px "= $106.3M" is wider than the column it sits in.

     $106.3M IS STILL THE PAGE'S TOTAL and still the figure the hub, the scorecard and the
     accountability page carry for this quantity. What changed is which number the reader
     meets first and whether the parts arrive with it. */
  function renderHero() {
    const t = DATA.meta.totals;
    const named = DATA.recipients.reduce((a, r) => a + r.total, 0);
    PV.figures([
      ['key', `<span id="hero-count" data-value="${t.awards}">${fmtHero(t.awards)}</span>`,
        'Awarded by government', 'the three signed awards this page follows'],
      ['', fmtHero(t.match), 'Promised beside it',
        'match and cost share from partners and the state: promised, not awarded'],
      ['', fmtHero(t.total), 'The two added together',
        'the total the region reports as secured'],
      ['', fmtHero(named), 'Already names a recipient',
        `of the money awarded; the other ${fmt(t.awards - named)} sits in two Ohio lines`]
    ]);
  }

  /* The generated "How we did this" band, in the house position: after the last story
     band, before the closer. PV.methodology publishes only meta keys classified in
     _shared/picviz.js, so the page's five "what this doesn't show" items are handed over
     under the classified names rather than restated here — one wording, one source. */
  function renderMethods() {
    const ns = DATA.meta.notShown;
    return PV.methodology({
      page: 'funding-map',
      meta: {
        source: 'Signed federal Notices of Award, the executed Ohio grant agreement (SBIG20251005), and executed sub-grant agreements.',
        fetched: '13 August 2026',
        row: 'One row is one award line: a named recipient, the program that funds it, and the amount that program has committed to that recipient.',
        caution: ns[0], excludes: ns[1], not_the_cluster: ns[2], note: ns[3],
        award_level_note: ns[4],
        publicOnly: 'This is the public money PIC helped win, not all public money reaching polymer work in the region. A program PIC was not part of does not appear here, and its absence is not evidence it does not exist.',
        not: 'Recipients are named as the award names them. Where an award passes through one organization to others, only the named recipient appears.',
        scope: 'No comparison with the other eleven funded EDA Tech Hubs is drawn here, because their award data is not shipped with this page. Every comparison on the page is internal to these three awards.'
      }
    });
  }

  // One row per award, for the CSV and for the group-by-program reading.
  function tableRows() {
    const out = [];
    DATA.programs.forEach((p) => {
      const so = G.sources.get(p.sourceId);
      G.progOut.get(p.id).forEach(({ recipient, award }) => {
        out.push({ source: so.name, program: p.name, recipient: recipient.name,
          amount: award.amount, awardId: award.awardId || '', funds: award.funds || '' });
      });
    });
    return out;
  }

  /* DISPLAY rows: the same money, ranked, with one cohort folded.
     The archive table shipped ~27 rows and about 2,900px of scroll, a third of the page,
     nine of them identical but for the company name. Ranking answers the question the
     table is actually asked ("who got the most?"), the cohort folds into one row that
     names all nine companies, and everything past the tenth row sits behind a control.
     The CSV is unchanged and still has one line per award. */
  const TOP_N = 10;
  function displayRows() {
    const rows = [];
    DATA.programs.forEach((p) => {
      const so = G.sources.get(p.sourceId);
      const outs = G.progOut.get(p.id);
      const amts = outs.map((o) => o.award.amount);
      const even = outs.length > 3 && Math.min(...amts) === Math.max(...amts);
      if (even) {
        const names = outs.map((o) => o.recipient.name).sort((a, b) => a.localeCompare(b));
        rows.push({ source: so.short, program: p.name,
          recipient: `${numword(outs.length, true)} ` +
            `${p.chip.charAt(0) + p.chip.slice(1).toLowerCase()} cohort companies`,
          amount: amts.reduce((a, v) => a + v, 0), awardId: '',
          funds: `${fmtFull(amts[0])} each in one-time cash: ${names.join(', ')}.` });
      } else {
        outs.forEach(({ recipient, award }) => rows.push({ source: so.short, program: p.name,
          recipient: recipient.name, amount: award.amount,
          awardId: award.awardId || '', funds: award.funds || '' }));
      }
    });
    return rows.sort((a, b) => b.amount - a.amount);
  }

  function renderTable() {
    const rows = displayRows();
    const tb = document.getElementById('data-tbody');
    tb.textContent = '';
    rows.forEach((r, i) => {
      const tr = h('tr', i >= TOP_N ? { class: 'is-extra', hidden: 'hidden' } : {}, [
        h('th', { class: 't-rcp', scope: 'row', 'data-label': 'Recipient', text: r.recipient }),
        h('td', { class: 'num', 'data-label': 'Amount', text: fmtFull(r.amount) }),
        h('td', { class: 't-by', 'data-label': 'Funded by' }, [
          h('span', { class: 't-prog', text: r.program }),
          h('span', { class: 't-src', text: r.source })
        ]),
        h('td', { class: 't-id', 'data-label': 'Award ID', 'data-none': r.awardId ? null : '1',
          text: r.awardId || '—' }),
        h('td', { class: 't-funds', 'data-label': 'What it funds', text: r.funds })
      ]);
      tb.appendChild(tr);
    });

    // Foot the column that is actually in the table. The rows sum to less than
    // the awards total, and the sentence below the table says exactly why.
    const rowSum = rows.reduce((a, r) => a + r.amount, 0);
    const tf = h('tfoot', {}, [h('tr', {}, [
      h('td', { text: 'Total to named recipients' }),
      h('td', { class: 'num', text: fmtFull(rowSum) }),
      h('td', { colspan: '3', text: `of ${fmtFull(DATA.meta.totals.awards)} awarded` })
    ])]);
    const tbl = document.getElementById('data-table');
    const old = tbl.querySelector('tfoot');
    if (old) old.remove();
    tbl.appendChild(tf);

    const btn = document.getElementById('table-toggle');
    const extra = rows.length - TOP_N;
    const setState = (open) => {
      tbl.querySelectorAll('tr.is-extra').forEach((tr) => { tr.hidden = !open; });
      btn.textContent = open ? 'Show the ten largest only'
        : `Show all ${rows.length} rows`;
      btn.setAttribute('aria-expanded', String(open));
    };
    if (extra > 0) { btn.setAttribute('aria-controls', 'data-table'); setState(false);
      btn.addEventListener('click', () => setState(btn.getAttribute('aria-expanded') !== 'true'));
    } else { btn.parentElement.hidden = true; }

    /* Four reconciliation paragraphs used to follow the table. The foot row already
       carries the arithmetic, so what is left visible is the one sentence that says
       where the gap is; the paragraph-by-paragraph version is a click away. */
    const rd = G.programs.get('oh-rd').amount -
      G.progOut.get('oh-rd').reduce((a, o) => a + o.award.amount, 0);
    const s6 = G.programs.get('oh-startup').amount -
      G.progOut.get('oh-startup').reduce((a, o) => a + o.award.amount, 0);
    document.getElementById('table-note').textContent =
      `The ${fmtFull(DATA.meta.totals.awards - rowSum)} difference is Ohio money committed but not ` +
      `yet written into a sub-grant: ${fmtFull(rd)} of PIC Translational R&D, and ${fmtFull(s6)} of ` +
      `the startup-support workstream delivered through the Bounce sub-grant that runs Synthe6.`;

    /* WHAT ONE ROW COUNTS, WORKED THROUGH ON THE PAGE'S OWN LARGEST CASE. Generated, so
       the example moves if the file does: the organization named is whichever multi-award
       recipient holds the most, and both figures and the difference between them are read
       off its own awards rather than typed. */
    const multi = DATA.recipients.filter((r) => r.awards.length > 1);
    const unit = document.getElementById('row-unit');
    if (unit && multi.length) {
      const ex = multi.slice().sort((a, b) => b.total - a.total)[0];
      const big = ex.awards.slice().sort((a, b) => b.amount - a.amount)[0];
      const rest = ex.awards.filter((w) => w !== big);
      unit.textContent =
        ` One row is one award line, not one organization. ${numword(multi.length, true)} ` +
        `organizations hold more than one award and appear on more than one row, so the ` +
        /* Curly, not straight: tools/style.mjs asserts the house apostrophe against the
           rendered page, and a template literal is the easiest place to lose it. */
        `finder above the map, which adds an organization’s awards together, can read ` +
        `higher than any row here: ${ex.name} is ${fmt(ex.total)} in the finder and ` +
        `${fmtFull(big.amount)} in its largest row, the difference being a ` +
        `${fmtFull(rest[0].amount)} ${rest[0].funds}.`;
    }
    const recon = document.getElementById('recon-more');
    DATA.meta.reconciliation.forEach((t) => recon.appendChild(h('p', { text: t })));
  }

  function buildCsv() {
    const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [['Source', 'Program', 'Recipient', 'Amount (USD)', 'Amount (display)', 'Award ID', 'What it funds'].join(',')];
    tableRows().forEach((r) => lines.push([q(r.source), q(r.program), q(r.recipient), r.amount,
      q(fmt(r.amount)), q(r.awardId), q(r.funds)].join(',')));
    const blob = new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
    const a = document.getElementById('csv-link');
    a.href = URL.createObjectURL(blob);
    a.download = `pic-funding-map-${DATA.meta.asOf}.csv`;
  }

  /* ---------------------------------------------------------------- 6 interact */

  function setHighlight(kind, id) {
    const nodes = viz.querySelectorAll('[data-node], [data-link]');
    if (!kind) {
      viz.classList.remove('is-focused');
      nodes.forEach((n) => n.classList.remove('lit'));
      return;
    }
    const { nodes: ns, links: ls } = related(kind, id);
    nodes.forEach((n) => {
      const a = n.getAttribute('data-node'), b = n.getAttribute('data-link');
      n.classList.toggle('lit', (a && ns.has(a)) || (b && ls.has(b)));
    });
    viz.classList.add('is-focused');
  }

  function panelFor(kind, id) {
    const kindEl = document.getElementById('panel-kind');
    const titleEl = document.getElementById('panel-title');
    const body = document.getElementById('panel-body');
    body.textContent = '';

    const chipsRow = (chips) => {
      const row = h('div', { class: 'panel-chips' });
      chips.forEach((c) => row.appendChild(h('span', { class: chipClass(c), text: c })));
      return row;
    };
    const totalBlock = (v, label) => h('div', { class: 'panel-total' }, [
      h('p', { class: 'pt-v', text: fmt(v) }), h('p', { class: 'pt-l', text: label })
    ]);

    if (kind === 'recipient') {
      const r = G.recipients.get(id);
      kindEl.textContent = 'Recipient';
      titleEl.textContent = r.name;
      if (r.alsoKnownAs) body.appendChild(h('p', { class: 'panel-aka', text: r.alsoKnownAs }));
      body.appendChild(chipsRow(r.chips));
      body.appendChild(totalBlock(r.total, r.awards.length > 1
        ? `awarded across ${r.awards.length} programs · ${fmtFull(r.total)}`
        : `awarded · ${fmtFull(r.total)}`));
      body.appendChild(h('h3', { text: r.awards.length > 1 ? 'Award breakdown' : 'The award' }));
      r.awards.forEach((w) => {
        const p = G.programs.get(w.programId), so = G.sources.get(p.sourceId), t = TINT[p.tint];
        const blk = h('div', { class: 'award', style: `--aw:${t.solid}` }, [
          h('div', { class: 'award-top' }, [
            h('span', { class: 'award-amt', text: fmt(w.amount) }),
            h('span', { class: 'award-prog', text: p.name })
          ]),
          h('p', { class: 'award-src', text: `${so.name} · ${fmtFull(w.amount)}` })
        ]);
        if (w.funds) blk.appendChild(h('p', { class: 'award-funds', text: w.funds }));
        if (w.awardId) blk.appendChild(h('p', { class: 'award-id' }, [
          h('b', { text: 'Award ID ' }), document.createTextNode(w.awardId)
        ]));
        body.appendChild(blk);
      });
    } else if (kind === 'program') {
      const p = G.programs.get(id), so = G.sources.get(p.sourceId);
      kindEl.textContent = 'Program · ' + so.short;
      titleEl.textContent = p.name;
      body.appendChild(chipsRow([p.chip]));
      /* A share with no denominator on it is a number a reader cannot use: this page
         shows the Ohio money twice, as a $31.25M award and as $41.67M with the state
         cost share, so "59.27% of the Ohio award" was ambiguous by exactly $10.42M. */
      body.appendChild(totalBlock(p.amount,
        (p.share ? `${p.share} of the ${fmt(so.award)} Ohio award · ` : '') + fmtFull(p.amount)));
      body.appendChild(h('p', { class: 'panel-note', text: p.note }));
      const outs = G.progOut.get(p.id).slice().sort((a, b) => b.award.amount - a.award.amount);
      body.appendChild(h('h3', { text: `Where it goes · ${outs.length} recipient${outs.length > 1 ? 's' : ''}` }));
      const ul = h('ul', { class: 'panel-list' });
      outs.forEach(({ recipient, award }) => ul.appendChild(h('li', {}, [
        h('span', { text: recipient.name }), h('span', { class: 'pl-a', text: fmt(award.amount) })
      ])));
      body.appendChild(ul);
    } else {
      const so = G.sources.get(id);
      kindEl.textContent = 'Funding source';
      titleEl.textContent = so.name;
      body.appendChild(h('p', { class: 'panel-aka', text: `${so.kind} · ${so.agency}` }));
      // Source-level award identifier. The EDA and APEX awards are identified per recipient,
      // so their IDs live on the awards; the Ohio grant is a single instrument to GAC and its
      // Grant Control No. identifies the whole $31.25M. See specs/AWARD-IDS-2026-08-13.md.
      if (so.awardId) body.appendChild(h('p', { class: 'award-id' },
        [h('b', { text: so.awardIdLabel || 'Award ID ' }), document.createTextNode(so.awardId)]));
      body.appendChild(totalBlock(so.award, `awarded · ${fmtFull(so.award)}`));
      body.appendChild(h('p', { class: 'panel-note',
        text: `Plus ${fmt(so.matchAmount)} in ${so.matchLabel} (${fmtFull(so.matchAmount)}), committed alongside the award.` }));
      body.appendChild(h('p', { class: 'panel-note', style: 'margin-top:14px', text: so.note }));
      const progs = G.srcPrograms.get(id);
      body.appendChild(h('h3', { text: progs.length > 1
        ? `Five workstreams, shares of the ${fmt(so.award)} award` : 'Program' }));
      const ul = h('ul', { class: 'panel-list' });
      progs.forEach((p) => ul.appendChild(h('li', {}, [
        h('span', { text: p.name + (p.share ? ` · ${p.share}` : '') }),
        h('span', { class: 'pl-a', text: fmt(p.amount) })
      ])));
      body.appendChild(ul);
    }
    /* The defining uncertainty gets said where the inference happens, not only in a
       footer: an awarded dollar and a spent dollar are identical pixels on the map.
       Outlay figures are internal per the sub-award disclosure ruling (see README),
       so the panel says "not public" rather than saying nothing. */
    document.getElementById('panel-disclosure').textContent =
      DATA.meta.disclosures[0] + ' Disbursement to date is not public on this page.';
  }

  function openDetail(kind, id, { push = true, focus = true } = {}) {
    if (!G[kind === 'recipient' ? 'recipients' : kind === 'program' ? 'programs' : 'sources'].has(id)) return;
    selected = { kind, id };
    panelFor(kind, id);
    setHighlight(kind, id);
    markSelected();

    panel.hidden = false; scrim.hidden = false;
    requestAnimationFrame(() => { panel.classList.add('is-open'); scrim.classList.add('is-open'); });
    resetBtn.hidden = false;

    const finder = document.getElementById('finder');
    if (finder) finder.value = kind === 'recipient' ? id : '';

    const hash = '#' + kind + '/' + id;
    if (push && location.hash !== hash) history.pushState({ kind, id }, '', hash);
    if (focus) {
      lastFocusEl = document.activeElement;
      document.getElementById('panel-close').focus({ preventScroll: true });
    }
    cancelReveal();
  }

  function closeDetail({ push = true, restore = true } = {}) {
    if (!selected) return;
    selected = null;
    panel.classList.remove('is-open'); scrim.classList.remove('is-open');
    const done = () => { panel.hidden = true; scrim.hidden = true; };
    reduceMotion.matches ? done() : setTimeout(done, 200);
    setHighlight(null);
    markSelected();
    resetBtn.hidden = true;
    const finder = document.getElementById('finder');
    if (finder) finder.value = '';
    if (push && location.hash) history.pushState(null, '', location.pathname + location.search);
    if (restore && lastFocusEl && document.contains(lastFocusEl)) lastFocusEl.focus({ preventScroll: true });
    lastFocusEl = null;
  }

  function markSelected() {
    viz.querySelectorAll('.hit, .rcard[data-kind], .rname').forEach((b) => {
      const on = selected && b.dataset.kind === selected.kind && b.dataset.id === selected.id;
      b.classList.toggle('is-selected', !!on);
    });
  }

  function cancelReveal() {
    if (revealDone) return;
    revealDone = true;
    viz.classList.remove('reveal');
    viz.classList.add('static');
    const c = viz.querySelector('.cards');
    if (c) { c.classList.remove('reveal'); c.classList.add('static'); }
  }

  function startReveal(root) {
    if (revealDone || reduceMotion.matches) { root.classList.add('static'); return; }
    root.classList.add('reveal');
    // stagger the rows so they land after the ribbons have drawn
    root.querySelectorAll('.rowgroup, .card-group').forEach((g, i) => {
      g.style.animationDelay = (260 + i * 26) + 'ms';
    });
    setTimeout(() => { revealDone = true; root.classList.remove('reveal'); root.classList.add('static'); }, REVEAL_MS);
  }

  /* Animates the hero's KEY figure, which is the awarded money now rather than the total
     secured. The id moved with it; a node id naming a quantity the card no longer shows is
     the next reader's wrong turn. */
  function countUp() {
    const node = document.getElementById('hero-count');
    const target = Number(node.dataset.value);
    if (reduceMotion.matches) { node.textContent = fmtHero(target); return; }
    let ran = false;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting || ran) return;
        ran = true; io.disconnect();
        const t0 = performance.now(), dur = 900;
        const step = (t) => {
          const k = Math.min(1, (t - t0) / dur);
          const e2 = 1 - Math.pow(1 - k, 3);
          node.textContent = fmtHero(target * e2);
          if (k < 1) requestAnimationFrame(step); else node.textContent = fmtHero(target);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    io.observe(node);
  }

  /* ------------------------------------------------------------- cold open */
  /* The hero strip. Every organization that has been named as receiving this money, one
     row each, ordered by size: the shape of where it lands, before a word of explanation.
     Deliberately a POORER view than the map below, which carries source, program,
     mechanism and match as well; this keeps recipient and dollars and nothing else, and
     orders by size, which the map does not. Every figure in it is derived here from
     DATA.recipients, so a revision to funding.json moves the chart and its labels together.

     SIZED IN REAL CSS PIXELS, like renderDiagram above it. A viewBox authored at some
     fixed unit count and squeezed into a narrower column silently shrinks its own type:
     700 units in a 350px phone column paints a 15-unit label at 7.5px, half the floor.
     Here the viewBox width IS the measured width, so the scale is 1 and a 15-unit label
     paints at 15px at every width. Below 520px the layout changes rather than the scale:
     the reading stacks onto three lines, the rows tighten, the tick set halves and the
     labels shorten.

     COLOR. The dark hero ground is --ink #0C6473, and this page's own lane hues were
     mixed for the light band below: --eda #1A8A9E measures 1.7:1 on it, --ohio 2.7:1,
     --apex 2.1:1, all under the 3:1 floor. The mark hue is --eda lightened to #7ADAEA
     (4.2:1); the secondary type is #C6E2E6, the standfirst's own ink (5.0:1). */
  function drawOpen() {
    const svg = document.getElementById('open');
    if (!svg || !DATA) return;
    const W = Math.round(svg.getBoundingClientRect().width);
    if (!W) return;
    const M = W < 520;

    const rows = DATA.recipients
      .map((r) => ({ name: r.name, total: r.awards.reduce((s, a) => s + a.amount, 0) }))
      .sort((a, b) => b.total - a.total);
    const named = rows.reduce((s, r) => s + r.total, 0);
    // One stated cut, $1M, and both sides of it are counted from the data.
    const over = rows.filter((r) => r.total >= 1e6).length;
    const under = rows.length - over;
    const share = Math.round(rows.slice(0, over).reduce((s, r) => s + r.total, 0) / named * 100);
    const top = rows[0];
    // Domain anchored at 0 and running to the next whole million above the longest row.
    const DOM = Math.ceil(top.total / 1e6) * 1e6;

    const m = M ? { r: 12, b: 32, l: 12 } : { r: 16, b: 34, l: 16 };
    const rowH = M ? 5.4 : 6;
    const w = W - m.l - m.r;
    const X = (v) => m.l + (v / DOM) * w;

    /* Keep the <title> and drop the previous render. This runs again on every real width
       change, and appending would stack two strips in one box; a naive innerHTML wipe
       would take the accessible title with it. */
    [...svg.childNodes].slice(1).forEach((n) => svg.removeChild(n));
    const add = (tag, attrs, text) => { const n = el(tag, attrs, text); svg.appendChild(n); return n; };

    const MARK = '#7ADAEA', KEY = '#C6E2E6';
    const LABEL = { 'font-size': 15, 'font-weight': 700 };

    const reading = M ? `${over} of ${rows.length} clear $1M, taking ${share}%`
                      : `${over} of the ${rows.length} clear $1M and take ${share}% of it`;
    const topLabel = `${M ? 'Pilot facility' : top.name}, ${fmtHero(top.total)}`;

    /* WHETHER THE READING AND THE ROW LABEL FIT ON ONE BASELINE IS A QUESTION ABOUT
       RENDERED STRINGS, NOT ABOUT THE VIEWPORT. Sharing that baseline at opposite ends is
       the house idiom and it was clean at 1440 and at 390, so the first version hard-coded
       it for every width above the narrow switch. At 560px the two overlapped by 36px:
       the reading's length is fixed and the label's right edge is pinned to the data. So
       the strings are measured and the label drops to a line of its own when it would not
       clear. getComputedTextLength reports user units, which is what the gap is in. */
    const measure = (s) => {
      const n = add('text', { ...LABEL, x: 0, y: -60 }, s);
      const len = n.getComputedTextLength();
      svg.removeChild(n);
      return len;
    };
    const oneLine = !M && m.l + measure(reading) + 24 <= X(top.total) - measure(topLabel);
    m.t = M ? 95 : (oneLine ? 54 : 74);

    const H = Math.round(m.t + rows.length * rowH + m.b);
    const rowY = (i) => m.t + i * rowH + rowH / 2;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    rows.forEach((r, i) => {
      const y = rowY(i), x = X(r.total);
      /* .8, not the .55 this shipped with first: a stem carries the value in its length,
         so it is a graphical object that has to clear 3:1 on the hero ground. At .55 the
         composite measures 2.34:1; at .8 it is 3.31:1. */
      add('line', { x1: m.l, y1: y, x2: x, y2: y, stroke: MARK,
        'stroke-width': M ? 1.6 : 1.8, 'stroke-opacity': .8 });
      add('circle', { cx: x, cy: y, r: M ? 2.4 : 2.6, fill: MARK });
    });

    const ay = m.t + rows.length * rowH + 8;
    add('line', { x1: m.l, y1: ay, x2: m.l + w, y2: ay,
      stroke: 'rgba(255,255,255,.32)', 'stroke-width': 1 });
    (M ? [0, 10e6] : [0, 5e6, 10e6, 15e6]).forEach((v) => {
      add('text', { ...LABEL, x: X(v), y: H - 10, 'text-anchor': 'middle', fill: KEY },
        v ? '$' + v / 1e6 + 'M' : '$0');
    });

    /* The reading. The phone has no room for the whole sentence on one line, so it takes
       three of its own; the wide layout says it in two. */
    if (M) {
      add('text', { ...LABEL, x: m.l, y: 16, fill: '#fff' },
        `Where the ${fmtHero(named)} lands:`);
      add('text', { ...LABEL, x: m.l, y: 36, fill: '#fff' }, 'one row per recipient');
      add('text', { ...LABEL, x: m.l, y: 56, fill: KEY }, reading);
    } else {
      add('text', { ...LABEL, x: m.l, y: 16, fill: '#fff' },
        `Where the ${fmtHero(named)} lands: one row per recipient`);
      add('text', { ...LABEL, x: m.l, y: 36, fill: KEY }, reading);
    }

    // The longest row, named where it ends, with a leader down to it: a direct label is
    // the primary decoding here, and there is no legend to shuttle to.
    const tx = X(top.total), ty = oneLine ? 36 : (M ? 79 : 58);
    add('text', { ...LABEL, x: tx, y: ty, 'text-anchor': 'end', fill: '#fff' }, topLabel);
    add('line', { x1: tx, y1: ty + 5, x2: tx, y2: rowY(0) - 4,
      stroke: 'rgba(255,255,255,.5)', 'stroke-width': 1 });

    /* The tail, bracketed rather than labelled row by row: twelve rows at this scale
       cannot each carry a name, and the claim is about the group, not its members. */
    const bx = M ? 30 : 52;
    add('line', { x1: bx, y1: rowY(over) - rowH / 2 - 1, x2: bx, y2: rowY(rows.length - 1) + rowH / 2 + 1,
      stroke: 'rgba(255,255,255,.4)', 'stroke-width': 1 });
    add('text', { ...LABEL, x: bx + 8, y: (rowY(over) + rowY(rows.length - 1)) / 2 + 5, fill: KEY },
      M ? `${under} under $1M` : `${under} recipients under $1M each`);
  }

  /* ---------------------------------------------------------------- render */

  function render() {
    /* The cold open re-lays out on the same trigger as the map: one width change, one
       render pass. It reads its own container rather than the map's, because it sits on
       the text rail and the map on the figure rail. */
    drawOpen();
    const W = Math.round(viz.getBoundingClientRect().width);
    if (!W) return;
    const mode = W < CARD_BREAKPOINT ? 'cards' : 'diagram';
    const first = currentMode === null;
    currentMode = mode;
    lastW = W;

    /* HOW TO READ, per mode. This span used to carry only the not-to-scale caveat, while
       the static half of the subtitle described the encoding ("hue names the source; a
       tint step separates...") and asserted "one dollar scale" — which the Ohio bands do
       not use. It now states the READING of the geometry that is actually on screen, and
       says out loud that the bands run on a second scale. In card mode it says nothing:
       there is no left-to-right and no band column, and the note above the first group
       already gives the card reading. */
    const sub = document.querySelector('.fig-sub-mode');
    if (sub) sub.textContent = mode === 'diagram'
      ? 'Left to right: each award, the machine it runs through, then who receives the money. ' +
        'Taller means more dollars. The Ohio hub’s five bands sit on a larger scale of their ' +
        'own so the smallest can carry a label, and the threads into single recipients are not ' +
        'to scale.'
      : '';

    const root = mode === 'diagram' ? (renderDiagram(W), viz) : renderCards();
    if (first) startReveal(mode === 'diagram' ? viz : root);
    else { (mode === 'diagram' ? viz : root).classList.add('static'); }

    markSelected();
    if (selected) setHighlight(selected.kind, selected.id);
  }

  function wire() {
    /* The lookup affordance. Deep links (#recipient/…) always existed; the select
       makes them reachable without knowing the URL grammar. Any PIC member can jump
       straight to their own row; selection opens the same panel a click would. */
    /* AN OPTION THAT SUMS SAYS SO. This listed "BioVerde · $11.15M" while the register
       below printed $11,122,386 against the same name, and nothing on the page told the
       reader that the $25,000 between them is a second, much smaller award. The finder is
       per ORGANIZATION and the register is per AWARD LINE; where those differ the option
       now names the count it is adding, and the register lede carries the worked example. */
    const finder = document.getElementById('finder');
    if (finder) {
      DATA.recipients.slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((r) => finder.appendChild(h('option', { value: r.id,
          text: `${r.name} · ${fmt(r.total)}` +
            (r.awards.length > 1 ? ` across ${numword(r.awards.length)} awards` : '') })));
      finder.addEventListener('change', () => {
        if (!finder.value) { closeDetail(); return; }
        const id = finder.value;
        openDetail('recipient', id, { focus: false });
        const b = viz.querySelector(`[data-kind="recipient"][data-id="${CSS.escape(id)}"]`);
        if (b) b.scrollIntoView({ block: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      });
    }

    // hover / focus highlight, click to open
    viz.addEventListener('pointerover', (e) => {
      const b = e.target.closest('.hit, .rcard[data-kind], .rname');
      if (b && !selected) setHighlight(b.dataset.kind, b.dataset.id);
    });
    viz.addEventListener('pointerout', (e) => {
      const b = e.target.closest('.hit, .rcard[data-kind], .rname');
      if (b && !selected && !viz.contains(e.relatedTarget)) setHighlight(null);
      else if (b && !selected && !e.relatedTarget?.closest?.('.hit, .rcard[data-kind], .rname')) setHighlight(null);
    });
    viz.addEventListener('focusin', (e) => {
      const b = e.target.closest('.hit, .rcard[data-kind], .rname');
      if (b && !selected) setHighlight(b.dataset.kind, b.dataset.id);
    });
    viz.addEventListener('focusout', (e) => {
      if (!selected && !viz.contains(e.relatedTarget)) setHighlight(null);
    });
    viz.addEventListener('click', (e) => {
      const b = e.target.closest('.hit, .rcard[data-kind], .rname');
      if (!b) return;
      if (selected && selected.kind === b.dataset.kind && selected.id === b.dataset.id) closeDetail();
      else openDetail(b.dataset.kind, b.dataset.id);
    });

    document.getElementById('panel-close').addEventListener('click', () => closeDetail());
    scrim.addEventListener('click', () => closeDetail());
    // click-away, for the widths where there is no scrim to click
    document.addEventListener('click', (e) => {
      if (!selected) return;
      if (e.target.closest('.panel, .hit, .rcard, .rname, #reset-view, #finder')) return;
      closeDetail({ restore: false });
    });
    resetBtn.addEventListener('click', () => { closeDetail(); setHighlight(null); });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && selected) { e.preventDefault(); closeDetail(); }
    });

    // any interaction kills the remainder of the reveal, once and for all
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((t) =>
      window.addEventListener(t, cancelReveal, { once: true, passive: true }));

    const syncHash = () => {
      const m = /^#(recipient|program|source)\/(.+)$/.exec(decodeURIComponent(location.hash));
      if (m) openDetail(m[1], m[2], { push: false, focus: false });
      else closeDetail({ push: false, restore: false });
    };
    window.addEventListener('popstate', syncHash);
    window.addEventListener('hashchange', syncHash);

    // ResizeObserver fires once on observe. Re-rendering on that first call
    // would restart the layout mid-reveal and cancel it, so only act on a real
    // width change.
    let t;
    const ro = new ResizeObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (Math.round(viz.getBoundingClientRect().width) !== lastW) render();
      }, 130);
    });
    ro.observe(viz);

    reduceMotion.addEventListener('change', () => { cancelReveal(); });
  }

  /* ---------------------------------------------------------------- boot */

  async function boot() {
    try {
      // loadData returns PARSED json (inlined tag or fetch), not a Response — the
      // res.ok / res.json() pair that used to live here would throw on the object.
      DATA = await loadData('funding.json');
    } catch (err) {
      viz.textContent = '';
      viz.appendChild(h('p', { class: 'noscript' }, [
        document.createTextNode('The funding data could not be loaded (' + err.message + '). '),
        h('a', { href: 'data/funding.json', text: 'Open the data file directly.' }),
        document.createTextNode(' If you opened this page from your file system, serve it over HTTP instead — see the README.')
      ]));
      viz.removeAttribute('aria-busy');
      return;
    }

    G = index(DATA);
    renderHero();
    renderProse();
    renderTable();
    renderLegend();
    buildCsv();
    countUp();
    await renderMethods();

    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) { /* measure anyway */ } }
    render();
    wire();

    const m = /^#(recipient|program|source)\/(.+)$/.exec(decodeURIComponent(location.hash));
    if (m) {
      cancelReveal();
      openDetail(m[1], m[2], { push: false, focus: false });
      const b = viz.querySelector(`[data-kind="${m[1]}"][data-id="${CSS.escape(m[2])}"]`);
      if (b) {
        b.scrollIntoView({ block: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
        b.focus({ preventScroll: true });
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
