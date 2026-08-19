// Centre-line audit: every composed block must share ONE vertical axis with the hero h1.
// Widths are the column audit's job (columns.mjs); this checks the thing it cannot see —
// a block can sit at the right width and still be left-aligned inside a wider wrap.
// Found 2026-08-18: `.closer .wrap > p{margin:0}` (0,2,1) beat the one-axis auto-margin
// block (0,2,0), so the closer was left-aligned on every page while columns.mjs said clean.
//
//   node tools/centres.mjs [webroot]      exit 1 if anything is off-axis by >2px
import { chromium } from './_browser.mjs';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(process.argv[2] ?? '.');
const pages = readdirSync(resolve(root, 'dist')).filter(f => f.endsWith('.html')).map(f => f.slice(0, -5));
const SEL = ['.hero h1', '.hero .stand', '.band .lede', '.band h2', '.chart', '.note',
  '.closer .wrap > p', '.closer .wrap > .sub', '.pv-method p', '.src'];
const WIDTHS = [1440, 1280, 1024];

const browser = await chromium.launch();
let off = 0, n = 0;
for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  for (const slug of pages) {
    await page.goto(pathToFileURL(resolve(root, 'dist', slug + '.html')).href);
    await page.waitForTimeout(350);
    const rows = await page.evaluate((SEL) => SEL.map(s => {
      const e = document.querySelector(s); if (!e) return null;
      const r = e.getBoundingClientRect(); if (r.width < 10) return null;
      return [s, Math.round(r.left + r.width / 2), Math.round(r.width)];
    }).filter(Boolean), SEL);
    const axis = (rows.find(r => r[0] === '.hero h1') ?? rows[0])?.[1];
    if (axis == null) continue;
    for (const [s, c, w] of rows) {
      n++;
      if (Math.abs(c - axis) > 2) { off++; console.log(`${String(width).padEnd(5)} ${slug.padEnd(18)} ${s.padEnd(22)} centre ${c} (axis ${axis}) width ${w}`); }
    }
  }
  await page.close();
}
await browser.close();
console.log(`centres: ${n} measured, ${off} off-axis, ${pages.length} pages x ${WIDTHS.length} widths`);
process.exit(off ? 1 : 0);
