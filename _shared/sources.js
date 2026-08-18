/* The "Reproduce this" block, for pages that do NOT use the shared chart core.
 *
 * funding-map and timeline predate _shared/picviz.js and draw with their own renderers, so
 * they never called PV.methodology() and therefore published no provenance at all — the
 * provenance gate in tools/verify.mjs caught both the day it was added, and they were the
 * two newest public artifacts.
 *
 * They could have been forced onto PV.methodology(), but that function expects a `meta`
 * shape and a claims.json neither page has, and loading picviz.js would drag in its
 * masthead side effects. This does one job instead.
 *
 * THE DATA CANNOT DRIFT: _data/SOURCES.json is the single registry for every page. The
 * RENDERING here is a second implementation of the same markup as picviz.js, which is a
 * real duplication and is stated rather than hidden — if the block's structure changes,
 * both need the change. The alternative was two registries, which is worse.
 *
 *   <script src="../_shared/sources.js"></script>
 *   <script>PVSources.render("funding-map", "repro");</script>
 */
window.PVSources = (function () {
  "use strict";

  function registry() {
    const tag = document.querySelector('script[data-pv-file="SOURCES.json"]');
    if (tag) {
      try { return Promise.resolve(JSON.parse(tag.textContent)); } catch (e) { /* fall through */ }
    }
    // serving the folder directly rather than a bundle
    return fetch("../_data/SOURCES.json").then(r => r.json()).catch(() => null);
  }

  function html(reg, slug) {
    const keys = (reg && reg.by_artifact && reg.by_artifact[slug]) || [];
    if (!keys.length) return "";
    const esc = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");
    return `<div class="pv-repro">
      <h3>Reproduce this</h3>
      <p class="pv-method-note">Every figure on this page comes from the sources below. The
        filters are the exact values applied, not a description of them.</p>
      ${keys.map(k => {
        const s = reg.sources[k];
        if (!s) return "";
        const f = Object.entries(s.filters || {})
          .map(([kk, vv]) => `<dt>${esc(kk)}</dt><dd>${esc(vv)}</dd>`).join("");
        return `<div class="pv-src">
          <h4>${esc(s.name)}</h4>
          <p class="pv-method-note">${esc(s.agency)}${s.key_required
            ? " &middot; free API key required" : ""}</p>
          ${s.url ? `<p class="mono pv-endpoint">${esc(s.url)}</p>` : ""}
          ${s.docs ? `<p class="pv-method-note"><a href="${esc(s.docs)}">Documentation</a></p>` : ""}
          ${f ? `<dl class="pv-filters">${f}</dl>` : ""}
          ${s.script ? `<p class="pv-method-note">Fetched by <span class="mono">${esc(s.script)}</span></p>` : ""}
        </div>`;
      }).join("")}
    </div>`;
  }

  /* Limitations, for the two pages that cannot use PV.methodology().
   *
   * Those pages published NO limitations at all until 2026-08-17 — this renderer only
   * ever emitted sources, so there was nowhere for a limit to go.
   *
   * The caller passes the lines explicitly rather than a meta object, deliberately.
   * picviz.js decides what counts as a limitation by excluding a set of structural keys;
   * reproducing that rule here would be a second copy of it, and a rule kept in two
   * places going out of sync is the defect this whole pass was cleaning up. An explicit
   * array needs no rule.
   */
  function limitsHtml(limits) {
    if (!limits || !limits.length) return "";
    const esc = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");
    return `<div class="pv-src">
      <h4>Limitations</h4>
      <ul>${limits.map(t => `<li>${esc(t)}</li>`).join("")}</ul>
    </div>`;
  }

  return {
    render: function (slug, mountId, opts) {
      const mount = document.getElementById(mountId);
      if (!mount) return;
      registry().then(reg => {
        if (!reg) return;
        mount.innerHTML = html(reg, slug) + limitsHtml(opts && opts.limits);
      });
    }
  };
})();
