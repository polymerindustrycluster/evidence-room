(async () => {
"use strict";
const DATA = await PV.data("chain-data.json");
const {meta, tiers, enablers, counties, companies, geo} = DATA;
const N = n => n.toLocaleString("en-US");
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------ vocabulary */
const ALIAS = {
  plastics:"plastic", resins:"resin", polymers:"polymer", thermoplastics:"thermoplastic",
  elastomers:"elastomer", rubbers:"rubber", composites:"composite", adhesives:"adhesive",
  coatings:"coating", sealants:"sealant", additives:"additive", moldings:"molding",
  moulding:"molding", moulded:"molding", molded:"molding", molding:"molding",
  extruded:"extrusion", extruding:"extrusion", compounded:"compounding",
  compounds:"compound", machined:"machining", pp:"polypropylene", pe:"polyethylene",
  hdpe:"polyethylene", ldpe:"polyethylene", pu:"polyurethane", pc:"polycarbonate",
  tpe:"elastomer", tpu:"polyurethane", lfam:"large format additive manufacturing",
  antidegradant:"antidegradant", "6ppd":"antidegradant"
};
const EXPAND = {
  antidegradant:["antidegradant","antiozonant","antioxidant","stabilizer","accelerator"],
  recycling:["recycling","recycle","reclaim","regrind","repro","circular"],
  medical:["medical","healthcare","cleanroom","catheter","implant","biocompatible"],
  battery:["battery","separator","electrolyte","electrode","energy storage"],
  packaging:["packaging","package","bottle","container","closure","label"],
  sustainable:["sustainable","biobased","bio-based","compostable","renewable","circular"],
  tooling:["tooling","tool","mold","die","fixture","pattern"]
};
const tok = s => (s||"").toLowerCase().replace(/[^a-z0-9\- ]+/g," ").split(/\s+/)
  .filter(w => w.length > 1).map(w => ALIAS[w] || w);

/* ------------------------------------------------------------ query state */
const state = {q:"", tier:null, county:null, loose:false};

/* Every query token becomes a synonym GROUP. A company must satisfy EVERY group
   (AND), which is what people mean by "chemical recycling". If nothing satisfies
   all of them we fall back to ANY group and say so, rather than silently
   returning a broad OR result and calling it a count. */
function search() {
  const raw = state.q.trim();
  state.loose = false;
  let hits = companies;

  if (raw) {
    const groups = [...new Set(tok(raw))].map(t => [...new Set(EXPAND[t] || [t])]);
    const rawLC = raw.toLowerCase();

    const score = (c, requireAll) => {
      const nameLC = c.n.toLowerCase();
      let total = 0, met = 0, matched = new Set();
      for (const g of groups) {
        let best = 0, label = null;
        for (const t of g) {
          if (nameLC.includes(t))                    { best = Math.max(best, 16); label ??= t; }
          for (const p of c.p) if (p.includes(t))    { best = Math.max(best, 12); label ??= p; break; }
          for (const m of c.m) if (m.includes(t))    { best = Math.max(best, 8);  label ??= m; break; }
          if (c.b.includes(t))                       { best = Math.max(best, 4);  label ??= t; }
        }
        if (best) { met++; total += best; if (label) matched.add(label); }
      }
      if (requireAll && met < groups.length) return null;
      if (!met) return null;
      if (nameLC.includes(rawLC)) total += 70;        // exact company name
      if (c.b.includes(rawLC)) total += 25;           // exact phrase in evidence
      if (c.member) total += 2;                       // tiny nudge, never decisive
      return {c, total, matched:[...matched].slice(0, 4)};
    };

    let scored = companies.map(c => score(c, true)).filter(Boolean);
    if (!scored.length) {
      state.loose = true;
      scored = companies.map(c => score(c, false)).filter(Boolean);
    }
    scored.sort((a, b) => b.total - a.total || a.c.n.localeCompare(b.c.n));
    hits = scored.map(s => Object.assign({}, s.c, {_hits: s.matched}));
  }

  if (state.tier)   hits = hits.filter(c => c.t.includes(state.tier));
  if (state.county) hits = hits.filter(c => c.c === state.county);
  return hits;
}

/* ----------------------------------------------------------- chain render */
/* foot is the band BELOW the plot: two-line tier labels end at 451, so the per-tier
   break marks and the flow caption need room of their own. They used to be written at
   470 and 464 inside a 470-tall viewBox, which put them on the same line as each other
   and clipped their descenders at the frame. */
const CH = {w:1240, h:470, padL:78, padR:78, top:118, botPad:96, foot:46};
const svgNS = "http://www.w3.org/2000/svg";
const el = (t, a) => { const n = document.createElementNS(svgNS, t);
  for (const k in a) if (a[k] != null) n.setAttribute(k, a[k]); return n; };

function spline(pts) {                       // smooth monotone-ish cubic through points
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0,y0] = pts[i], [x1,y1] = pts[i+1], dx = (x1 - x0) * .42;
    d += `C${x0+dx},${y0} ${x1-dx},${y1} ${x1},${y1}`;
  }
  return d;
}

const chainSvg = document.getElementById("chain");
function drawChain(hits) {
  const filtered = state.q.trim() !== "" || state.county !== null;
  const counts = tiers.map(t => hits.filter(c => c.t.includes(t.key)).length);
  const base   = tiers.map(t => t.neo);
  // A subset of 10 firms drawn on a 0-246 scale is a flat line. Re-fit the scale
  // to the query and say so, rather than draw an honest but unreadable hairline.
  const scaleMax = Math.max(...(filtered ? counts : base), 1);
  const usable = CH.h - CH.top - CH.botPad, half = usable / 2, cy = CH.top + half;
  const step = (CH.w - CH.padL - CH.padR) / (tiers.length - 1);
  const X = i => CH.padL + i * step;
  const H = v => Math.max(v > 0 ? 3.5 : 0, (v / scaleMax) * (half - 14));

  // expected shape: outside-region mix rescaled to the NEO total
  const neoSum = base.reduce((a,b) => a+b, 0);
  const outSum = tiers.reduce((a,t) => a + t.outside, 0);
  const expected = tiers.map(t => t.outside * (neoSum / outSum));

  while (chainSvg.childNodes.length > 1) chainSvg.removeChild(chainSvg.lastChild);

  const defs = el("defs");
  const grad = el("linearGradient", {id:"ribbon", x1:"0", y1:"0", x2:"1", y2:"0"});
  [["0%","#2E93A6"],["42%","#1A8A9E"],["100%","#3FA7B6"]].forEach(([o,c]) =>
    grad.appendChild(el("stop", {offset:o, "stop-color":c})));
  defs.appendChild(grad);
  const hatch = el("pattern", {id:"hatch", width:"7", height:"7",
    patternUnits:"userSpaceOnUse", patternTransform:"rotate(45)"});
  hatch.appendChild(el("rect", {width:"7", height:"7", fill:"#0C6473"}));
  hatch.appendChild(el("line", {x1:"0", y1:"0", x2:"0", y2:"7",
    stroke:"#2C7A88", "stroke-width":"3.5"}));
  defs.appendChild(hatch);
  chainSvg.appendChild(defs);

  // The expected-shape guide compares the whole classified base against the
  // megaregion mix. It says nothing about a subset, so it goes away on a query.
  if (!filtered) {
    const eTop = expected.map((v,i) => [X(i), cy - H(v)]);
    const eBot = expected.map((v,i) => [X(i), cy + H(v)]).reverse();
    chainSvg.appendChild(el("path", {class:"expected", d: spline(eTop)}));
    chainSvg.appendChild(el("path", {class:"expected", d: spline(eBot)}));
  }

  const vals = filtered ? counts : base;
  const rTop = vals.map((v,i) => [X(i), cy - H(v)]);
  const rBot = vals.map((v,i) => [X(i), cy + H(v)]).reverse();
  const ribbon = el("path", {d: spline(rTop) + "L" + spline(rBot).slice(1) + "Z",
    fill:"url(#ribbon)"});
  chainSvg.appendChild(ribbon);
  if (!REDUCED) {
    ribbon.animate([{opacity:.35}, {opacity:1}], {duration:260, easing:"ease-out"});
  }

  tiers.forEach((t, i) => {
    const x = X(i), v = vals[i], exp = expected[i];
    const ratio = exp > 0 ? v / exp : 1;
    const thin = !filtered && ratio < .62;
    const on = state.tier === t.key;

    const g = el("g", {class:"tierhit" + (on ? " tier-on" : ""), tabindex:"0",
      role:"button", "aria-pressed":String(on),
      "aria-label":`${t.label}: ${v} companies. Filter the chain to this stage.`});
    g.appendChild(el("rect", {class:"hit", x:x-58, y:CH.top-92, width:116,
      height:CH.h-CH.top+62, fill:"transparent"}));
    g.appendChild(el("line", {x1:x, y1:CH.top-30, x2:x, y2:CH.h-CH.botPad+42,
      stroke:"rgba(255,255,255,.16)", "stroke-width":"1"}));

    const num = el("text", {class:"tiernum" + (thin ? " thin" : ""), x, y:CH.top-42,
      "text-anchor":"middle"});
    num.textContent = N(v);
    g.appendChild(num);

    const lab = el("text", {class:"tierlab", x, y:CH.h-CH.botPad+62, "text-anchor":"middle"});
    t.label.split(" & ").forEach((part, k, arr) => {
      const ts = el("tspan", {x, dy: k === 0 ? 0 : 15});
      ts.textContent = part + (k < arr.length-1 ? " &" : "");
      lab.appendChild(ts);
    });
    g.appendChild(lab);

    const sub = el("text", {class:"tiersub", x, y:CH.top-22, "text-anchor":"middle"});
    sub.textContent = filtered ? `of ${N(base[i])}` : `expected ${Math.round(exp)}`;
    g.appendChild(sub);
    if (thin) {
      const bm = el("text", {class:"breakmark", x, y:CH.h+6,
        "text-anchor":"middle"});
      bm.textContent = `${Math.round(ratio*100)}% of expected`;
      g.appendChild(bm);
    }
    // SVG elements have no HTMLElement.click(), so both paths call one handler.
    const toggle = () => { state.tier = on ? null : t.key; render(); };
    g.addEventListener("click", toggle);
    g.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
    });
    chainSvg.appendChild(g);
  });

  const note = el("text", {class:"axisnote", x:CH.padL, y:CH.h+36});
  note.textContent =
    `Flow of material, left to right. Recycling returns to the front of the chain.`;
  chainSvg.appendChild(note);
  chainSvg.setAttribute("viewBox", `0 0 ${CH.w} ${CH.h + CH.foot}`);

  document.getElementById("scalenote").innerHTML = filtered
    ? `<b>Scale re-fits to this query</b>: widest stage is ${N(scaleMax)}`
    : `<b>Scale</b>: widest stage is ${N(scaleMax)} companies`;
  drawChainBars(vals, base, expected, filtered);
}

/* Phone form: the same six numbers as stacked bars, because a 1240-wide ribbon
   scaled into 350 CSS pixels loses every label that makes it readable. */
function drawChainBars(vals, base, expected, filtered) {
  const max = Math.max(...vals, 1);
  const box = document.getElementById("chainbars");
  box.innerHTML = tiers.map((t, i) => {
    const v = vals[i], exp = expected[i], ratio = exp > 0 ? v / exp : 1;
    const thin = !filtered && ratio < .62;
    const on = state.tier === t.key;
    const expPct = filtered ? null : Math.min(100, (exp / max) * 100);
    return `<div class="cbar${thin ? " thin" : ""}" role="button" tabindex="0"
        aria-pressed="${on}" data-tier="${t.key}"
        aria-label="${t.label}: ${v} companies">
      <div class="cb-lab">${t.label}</div>
      <div class="cb-num">${N(v)}</div>
      <div class="cb-track">
        <div class="cb-fill" style="width:${(v / max) * 100}%"></div>
        ${expPct != null ? `<div class="cb-exp" style="left:${expPct}%"></div>` : ""}
      </div>
      <div class="cb-sub">${filtered ? `of ${N(base[i])} classified here`
        : `expected ${Math.round(exp)}${thin ? ` &middot; ${Math.round(ratio * 100)}% of expected` : ""}`}</div>
    </div>`;
  }).join("");
  box.querySelectorAll(".cbar").forEach(node => {
    const toggle = () => {
      state.tier = state.tier === node.dataset.tier ? null : node.dataset.tier;
      render();
    };
    node.addEventListener("click", toggle);
    node.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
    });
  });
}

/* ------------------------------------------------------------- map render */
const mapSvg = document.getElementById("map");
function drawMap(hits) {
  /* The box FOLLOWS the map, not the other way round. With a fixed 660x470 viewBox the
     projection fitted by whichever dimension bound first — height, for this region — and
     the fourteen counties then occupied barely half the width of their own container, with
     the rest dead space. Worse, squeezing the map that small is what pushed the Summit and
     Portage labels into each other. Width is fixed; height is whatever the geography is. */
  const MW = 660, pad = 16;
  let minX=180, maxX=-180, minY=90, maxY=-90;
  const rings = geo.features.map(f => {
    const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates]
                                                : f.geometry.coordinates;
    polys.forEach(p => p.forEach(r => r.forEach(([lo,la]) => {
      if (lo<minX) minX=lo; if (lo>maxX) maxX=lo;
      if (la<minY) minY=la; if (la>maxY) maxY=la;
    })));
    return {name: f.properties.NAME || f.properties.name, polys};
  });
  const k = Math.cos((minY+maxY)/2 * Math.PI/180);
  const sc = (MW - pad*2) / ((maxX-minX)*k);
  const MH = Math.round((maxY-minY)*sc + pad*2);
  mapSvg.setAttribute("viewBox", `0 0 ${MW} ${MH}`);
  const ox = pad, oy = pad;
  const PX = lo => ox + (lo-minX)*k*sc, PY = la => oy + (maxY-la)*sc;

  const byCounty = {};
  counties.forEach(c => byCounty[c.county] = c);
  const liveCount = {};
  hits.forEach(c => liveCount[c.c] = (liveCount[c.c]||0) + 1);
  const filtered = state.q.trim() !== "" || state.tier !== null;

  const ramp = ["#E4EFF0","#CFE8EC","#9FD2DA","#6BB8C4","#3D9CAC","#1A8A9E","#0C6473"];
  const shade = r => r <= 0 ? "url(#nodata)"
    : ramp[Math.min(ramp.length-1, Math.floor(r / .32))];

  while (mapSvg.childNodes.length > 1) mapSvg.removeChild(mapSvg.lastChild);
  const defs = el("defs");
  const nd = el("pattern", {id:"nodata", width:"8", height:"8",
    patternUnits:"userSpaceOnUse", patternTransform:"rotate(45)"});
  nd.appendChild(el("rect", {width:"8", height:"8", fill:"#F2EFEA"}));
  nd.appendChild(el("line", {x1:"0", y1:"0", x2:"0", y2:"8",
    stroke:"#B9B3A9", "stroke-width":"3"}));
  defs.appendChild(nd);
  mapSvg.appendChild(defs);

  rings.forEach(r => {
    const rec = byCounty[r.name] || {classified:0, cbp_estab:0};
    const val = filtered ? (liveCount[r.name]||0) : rec.classified;
    const ratio = filtered
      ? (rec.cbp_estab ? val / rec.cbp_estab : 0)
      : (rec.cbp_estab ? rec.classified / rec.cbp_estab : 0);
    let cx=0, cy=0, n=0;
    const d = r.polys.map(p => p.map(ring =>
      ring.map(([lo,la], i) => {
        const x = PX(lo), y = PY(la); cx+=x; cy+=y; n++;
        return (i ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1);
      }).join("") + "Z").join("")).join("");
    const on = state.county === r.name;
    const path = el("path", {class:"county" + (on ? " on" : ""), d,
      fill: val > 0 ? shade(ratio) : "url(#nodata)", tabindex:"0", role:"button",
      "aria-label":`${r.name} County: ${val} classified companies, ` +
                   `${rec.cbp_estab} Census establishments.`});
    const toggle = () => { state.county = on ? null : r.name; render(); };
    path.addEventListener("click", toggle);
    path.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
    });
    mapSvg.appendChild(path);
    const t = el("text", {class:"clab", x:(cx/n).toFixed(0), y:(cy/n).toFixed(0),
      /* Drawn ON the county shape, so the colour follows the shape: a ratio threshold
         guessed where the ramp turns dark and was wrong at both ends. */
      "text-anchor":"middle", fill: PV.onFill(shade(ratio))});
    t.textContent = r.name;
    mapSvg.appendChild(t);
    const v = el("text", {class:"clab", x:(cx/n).toFixed(0),
      y:(cy/n + 14).toFixed(0), "text-anchor":"middle",
      fill: PV.onFill(shade(ratio))});
    v.textContent = val > 0 ? val : "none";
    mapSvg.appendChild(v);
  });
}

/* ------------------------------------------------------------ side panels */
function drawCoverage() {
  const rows = [...counties].sort((a,b) => b.cbp_estab - a.cbp_estab);
  document.getElementById("covbody").innerHTML = rows.map(r => {
    const rat = r.cbp_estab ? r.classified / r.cbp_estab : 0;
    return `<tr class="${r.classified === 0 ? "zero" : ""}" data-county="${r.name || r.county}">
      <td>${r.county}</td><td>${r.classified || "&mdash;"}</td><td>${r.cbp_estab}</td>
      <td><span class="ratio">${r.classified ? Math.round(rat*100)+"%" : "0%"}</span></td></tr>`;
  }).join("");
  document.querySelectorAll("#covbody tr").forEach(tr => {
    tr.addEventListener("click", () => {
      const c = tr.firstElementChild.textContent;
      state.county = state.county === c ? null : c; render();
      document.getElementById("takeaway").scrollIntoView({behavior: REDUCED ? "auto" : "smooth"});
    });
  });

  const blanks = counties.filter(c => c.classified === 0)
                         .sort((a,b) => b.cbp_estab - a.cbp_estab);
  const plants = blanks.reduce((a,b) => a + b.cbp_estab, 0);
  document.getElementById("blanks").innerHTML =
    `<h3>${blanks.map(b => b.county).join(", ")}</h3>
     <p>Census counts <b>${plants} polymer and chemical manufacturing establishments</b> across these
     three counties. PIC has classified none of them. That is a to-do list for this register, not a
     statement about the region.</p>`;

  document.getElementById("mapsrc").innerHTML =
    `Coverage is PIC-classified companies divided by County Business Patterns 2023 establishments in
     NAICS 325 and 326, the federal industry codes for chemical and plastics manufacturing, in
     the same county. The two counts define a company differently: PIC classifies
     companies including distributors, machinery builders, and laboratories that Census files under
     other codes, so a county can exceed 100&nbsp;percent without being fully covered. Treat this as an
     indicator of where PIC’s knowledge is thin, not as a market share. Census totals for the fourteen
     counties: ${N(meta.cbp_estab)} establishments, ${N(meta.cbp_emp)} employees.`;
}

function drawMethods() {
  const cards = [
    ["What a row is", `One company PIC has classified from vault notes, not one plant. A company with
      four Ohio sites counts once. Census counts establishments, so the two never reconcile exactly.`],
    ["The chain", `Six stages built from the vault’s <b>${tiers.length + enablers.length}</b>
      value-chain roles. A company can sit at more than one stage, so the stages sum to more than the
      <b>${N(meta.neo_total)}</b> companies. The fifth stage, finished-product OEM, is the original
      equipment manufacturer whose name goes on the object.`],
    ["The expected shape", `The dashed guide is the same vault’s <b>${N(meta.outside_total)}</b>
      companies outside the fourteen counties (Michigan, Pittsburgh, Columbus, Indiana),
      rescaled to the fourteen-county total. It compares <b>mix</b>, not size, and both sides share one collection
      method.`],
    ["Unclassified is not incapable", `<b>${N(meta.unclassified)}</b> of ${N(meta.neo_total)} companies
      carry no value-chain role yet. They are absent from the ribbon and hatched on the map. Absence
      here is missing evidence, never a finding.`],
    ["Vocabulary", `The notes hold <b>${N(meta.raw_processes)}</b> distinct process strings and
      <b>${N(meta.raw_materials)}</b> material strings. A first normalization pass collapses these to
      ${N(meta.norm_processes)} and ${N(meta.norm_materials)}. The raw string stays on every record.`],
    ["What this is not", `A prototype over a mined convenience sample, as of ${meta.as_of}. Not a
      census, not a certification, and not a statement that any firm can or cannot do a job. PIC does
      not certify capability.`]
  ];
  document.getElementById("methods").innerHTML = cards
    .map(([h,p]) => `<div><h3>${h}</h3><p>${p}</p></div>`).join("");
}

/* --------------------------------------------------------------- results */
function drawCards(hits) {
  const shown = hits.slice(0, 48);
  const box = document.getElementById("cards");
  if (!hits.length) {
    box.innerHTML = `<div class="empty" style="grid-column:1/-1"><strong>Nothing classified matches that.</strong>
      That is a gap in PIC’s notes as often as a gap in the region. Try a broader term, or clear the
      filters.</div>`;
    return;
  }
  box.innerHTML = shown.map(c => {
    const member = !!c.member;
    const roles = c.r.slice(0,3).map(r => `<span class="role">${r}</span>`).join("");
    const hits2 = c._hits && c._hits.length
      ? `<p class="hits">matched: ${c._hits.join(" &middot; ")}</p>` : "";
    const name = c.w ? `<a href="${c.w}" target="_blank" rel="noopener">${c.n}</a>` : c.n;
    return `<article class="card">
      ${member ? '<div class="badge">PIC member</div>' : ""}
      <h3>${name}</h3>
      <p class="where">${c.y ? c.y + ", " : ""}${c.c ? c.c + " County" : "county not recorded"}</p>
      <div class="roles">${roles || '<span class="role">unclassified</span>'}</div>
      ${c.s ? `<p class="sum">${c.s}</p>` : ""}
      ${hits2}
    </article>`;
  }).join("");
}

/* ------------------------------------------------------------------ chips */
const CHIPS = ["injection molding", "extrusion", "compounding", "chemical recycling",
               "antidegradant", "medical", "packaging film", "polyurethane", "silicone"];
document.getElementById("chips").innerHTML = CHIPS
  .map(c => `<button class="chip" type="button" aria-pressed="false">${c}</button>`).join("");
document.querySelectorAll("#chips .chip").forEach(b => {
  b.addEventListener("click", () => {
    const v = b.textContent;
    state.q = (state.q === v) ? "" : v;
    document.getElementById("q").value = state.q;
    render();
  });
});

/* ----------------------------------------------------------------- render */
function headline(hits) {
  const t  = document.getElementById("takeaway");
  const sf = document.getElementById("standfirst");
  const q  = state.q.trim();
  const parts = [];
  if (q) parts.push(`&ldquo;${q}&rdquo;`);
  if (state.tier) parts.push(tiers.find(x => x.key === state.tier).label.toLowerCase());
  if (state.county) parts.push(`${state.county} County`);

  if (!parts.length) {
    t.innerHTML = `The region owns the middle of the polymer chain and <em>thins out at the molecule end</em>.`;
    sf.innerHTML = `All <b>${N(meta.neo_total)}</b> companies the Polymer Industry Cluster
      (PIC) has classified in the fourteen counties of Northeast Ohio, on the chain that turns a
      molecule into a product and back. Type what you need to make into the box below.`;
    return;
  }
  const cties = new Set(hits.map(h => h.c).filter(Boolean));
  const members = hits.filter(h => h.member).length;
  t.innerHTML = hits.length
    ? `<em>${N(hits.length)}</em> ${hits.length === 1 ? "company" : "companies"} for ${parts.join(", ")}.`
    : `Nothing classified for ${parts.join(", ")}.`;
  sf.innerHTML = hits.length
    ? `Across ${cties.size} ${cties.size === 1 ? "county" : "counties"}${members ?
        `, ${members} of them ${members === 1 ? "a PIC member" : "PIC members"}` : ""}.
       The ribbon shows where on the chain they sit, rescaled to this query; under each stage is
       how many of everything classified there this reaches.${state.loose ? ` <b>No company matched
       every word</b>, so this is a broadened match on any of them.` : ""}`
    : `PIC’s notes hold no classified match. That is a gap in the notes as often as a gap in the
       region: ${N(meta.unclassified)} companies here still carry no capability tags at all.`;
}

function render() {
  const hits = search();
  headline(hits);
  drawChain(hits);
  drawMap(hits);
  drawCards(hits);
  document.getElementById("qclear").hidden = !(state.q || state.tier || state.county);
  document.querySelectorAll("#chips .chip").forEach(b =>
    b.setAttribute("aria-pressed", String(b.textContent === state.q)));
  const bits = [];
  if (state.tier) bits.push(tiers.find(x => x.key === state.tier).label);
  if (state.county) bits.push(state.county + " County");
  document.getElementById("ressub").innerHTML = bits.length || state.q
    ? `${N(hits.length)} of ${N(meta.neo_total)} classified companies${
        bits.length ? " &middot; " + bits.join(" &middot; ") : ""}. Showing the first
        ${Math.min(48, hits.length)}.`
    : `All ${N(meta.neo_total)} companies PIC has classified in the fourteen counties.
       Showing the first 48. Every card links to the company’s own site, never to a PIC judgment.`;
  document.getElementById("ressrc").innerHTML =
    `Source: GAC-PIC vault company notes, extracted ${meta.as_of}. Capability is inferred from those
     notes. PIC does not certify these firms and this page is not a supplier qualification.`;
  const h = [state.q && "q=" + encodeURIComponent(state.q),
             state.tier && "tier=" + state.tier,
             state.county && "county=" + encodeURIComponent(state.county)].filter(Boolean).join("&");
  history.replaceState(null, "", h ? "#" + h : location.pathname);
}

/* ------------------------------------------------------------------ wiring */
const qEl = document.getElementById("q");
let timer;
qEl.addEventListener("input", () => {
  clearTimeout(timer);
  timer = setTimeout(() => { state.q = qEl.value; render(); }, 120);
});
qEl.addEventListener("keydown", e => { if (e.key === "Escape") {
  qEl.value = ""; state.q = ""; render(); } });
document.getElementById("qclear").addEventListener("click", () => {
  qEl.value = ""; state.q = ""; state.tier = null; state.county = null; render(); qEl.focus();
});
document.getElementById("copycsv").addEventListener("click", async e => {
  const hits = search();
  const q = v => `"${String(v ?? "").replaceAll('"','""')}"`;
  const csv = [["Company","City","County","Value chain roles","Processes","Membership","Website"]
    .map(q).join(",")].concat(hits.map(c => [c.n, c.y, c.c, c.r.join("; "),
    c.p.join("; "), c.member ? "member" : "", c.w].map(q).join(","))).join("\r\n");
  try { await navigator.clipboard.writeText(csv);
    e.target.textContent = `Copied ${N(hits.length)} rows`;
  } catch { e.target.textContent = "Clipboard blocked"; }
  setTimeout(() => e.target.textContent = "Copy these rows as CSV", 2200);
});

const hash = new URLSearchParams(location.hash.slice(1));
if (hash.get("q")) { state.q = hash.get("q"); qEl.value = state.q; }
if (hash.get("tier")) state.tier = hash.get("tier");
if (hash.get("county")) state.county = hash.get("county");


/* --------------------------------------- supply vs demand, one spine ------ */
{
  const VIZ = await PV.data("viz-data.json");
  const {el, txt, ticks, frame, hoverable, tableView, SEQ, CAT} = PV;
  const rows = VIZ.spine;
  const W = 1100, H = 60 + rows.length*46 + 70, m = {t:44, b:66};
  /* -30 left the left axis's own '246' tick 6px past the edge below 1100px. 2026-09-01. */
  const mid = W/2, gap = 150, half = mid - gap/2 - 42;
  const h = H - m.t - m.b;
  const svg = document.getElementById("sd");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const maxS = Math.max(...rows.map(r=>r.supply));
  const maxD = Math.max(...rows.map(r=>r.demand));
  const xL = v => mid - gap/2 - (v/maxS)*half;
  const xR = v => mid + gap/2 + (v/maxD)*half;
  txt(svg,"Classified companies",{x:mid-gap/2,y:m.t-18,"text-anchor":"end",class:"pv-axlab"});
  txt(svg,"2026 applications",{x:mid+gap/2,y:m.t-18,class:"pv-axlab"});
  rows.forEach((r,i)=>{
    const y = m.t + i*46, bh = 22;
    txt(svg,r.label,{x:mid,y:y+bh-4,"text-anchor":"middle",class:"pv-lab"});
    el("rect",{x:xL(r.supply),y:y+bh+4,width:mid-gap/2-xL(r.supply),height:14,
      fill:SEQ[4],rx:4},svg);
    el("rect",{x:mid+gap/2,y:y+bh+4,width:(r.demand/maxD)*half,height:14,
      fill:CAT[1],rx:4},svg);
    txt(svg,r.supply,{x:xL(r.supply)-9,y:y+bh+16,"text-anchor":"end",class:"pv-lab"});
    txt(svg,r.demand,{x:xR(r.demand)+9,y:y+bh+16,class:"pv-lab"});
    const ratio = r.demand ? (r.supply/r.demand) : null;
    hoverable(el("rect",{x:0,y:y-4,width:W,height:46,fill:"transparent"},svg),
      `<b>${r.label}</b><br><span class="v">${r.supply}</span> classified companies<br>
       <span class="v">${r.demand}</span> applications${ratio!=null?
       `<br><span class="v">${ratio.toFixed(1)}</span> companies per application`:""}`,
      `${r.label}: ${r.supply} companies, ${r.demand} applications`);
  });

  document.getElementById("sdtable").innerHTML = tableView("sd",
    "Companies and applications at each stage",
    ["Stage","Classified companies","2026 applications","Companies per application","Requested"],
    rows.map(r=>[r.label, r.supply, r.demand,
      r.demand ? (r.supply/r.demand).toFixed(1) : "—",
      "$" + r.demand_usd.toLocaleString("en-US")]));
}

drawCoverage();
drawMethods();
render();
addEventListener("resize", () => { drawChain(search()); }, {passive:true});

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js. */
/* chain-data.json carries counts but no limitation prose, so the disclosure is written
   here. Spread rather than replaced, so the file’s own meta still reaches the block. */
await PV.methodology({page: "chain", meta: {...DATA.meta,
  not: "A capability map, not a supplier list. Presence here means the vault records a " +
    "company as doing this work. It is not a qualification, an endorsement, or evidence " +
    "of current capacity.",
  excludes: `${DATA.meta.unclassified} of ${DATA.meta.neo_total} vault companies carry no ` +
    "usable classification and appear in no chain view. Absence from a stage means the " +
    "vault does not record that capability, not that nobody in the region has it.",
  caution: "Company descriptions are reproduced as the companies wrote them. They are " +
    "self-descriptions, not audited capability statements.",
  geography: "Vault records use NEO-14, the fourteen-county set inherited from the vault. " +
    "PIC’s federal-data pages use PIC-12. The two share ten counties, so figures here " +
    "will not reconcile with the cluster-health dashboard.",
}});
})();
