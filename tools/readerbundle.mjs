/* WHAT A READER SEES, AND NOTHING ELSE.
 *
 *   node tools/readerbundle.mjs [--out DIR] [names...]
 *
 * Builds one folder per page holding the rendered text in reading order, every chart as
 * its own image, and the phone's first screen. A reviewer given ONLY this folder is the
 * most productive check this project has: run against a site where eleven gates were green
 * and five review rounds had passed, it found two severity-5 defects and eighteen
 * severity-4s. It works by REMOVING capability rather than adding it. Every other reviewer
 * here had source access, and none of them could see what a reader sees, because expertise
 * cannot un-know itself.
 *
 * WHY THIS IS A TOOL AND NOT A SCRIPT SOMEONE PASTES. The first version was pasted, and it
 * clipped every chart image to 720px. Two of about forty findings that came back were
 * artefacts of that clamp: a reader reported a chart "stops mid-list" and another reported
 * one "cuts off the fifth workstream", and both charts render in full. False findings cost
 * more than missed ones, because they spend an editor's trust. Charts are captured by
 * ELEMENT here, so a 1,119px chart arrives as 1,119px.
 *
 * WHAT MUST NOT LEAK IN: source, data files, claims, READMEs, the brief. The reviewer's
 * ignorance is the instrument, and a single glance at a builder script destroys it. This
 * writes nothing but rendered output, and the prompt that goes with it should forbid the
 * repo explicitly.
 */
import {readdirSync, writeFileSync, mkdirSync, rmSync} from "fs";
import {pathToFileURL} from "url";
import {chromium} from "./_browser.mjs";

const args = process.argv.slice(2);
const oi = args.indexOf("--out");
const OUT = oi >= 0 ? args[oi + 1] : "/tmp/readerbundle";
const names = args.filter((a, i) => !a.startsWith("--") && i !== oi + 1);
const list = names.length ? names
  : readdirSync("dist").filter(f => f.endsWith(".html")).map(f => f.slice(0, -5));

rmSync(OUT, {recursive: true, force: true});
const b = await chromium.launch();
for (const n of list) {
  const dir = `${OUT}/${n}`;
  mkdirSync(dir, {recursive: true});
  const p = await b.newPage({viewport: {width: 1440, height: 1200}});
  await p.goto(pathToFileURL(process.cwd() + "/dist/" + n + ".html").href);
  await p.waitForTimeout(1500);
  /* Tables live behind <details>. A reader can open them, so the reviewer gets them
     open: a collapsed table is a table nobody checks the arithmetic of. */
  await p.evaluate(() => document.querySelectorAll("details").forEach(d => (d.open = true)));
  await p.waitForTimeout(400);

  const text = await p.evaluate(() => {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let t, out = [];
    while ((t = w.nextNode())) {
      const e = t.parentElement;
      if (!e || e.closest("script,style,noscript")) continue;
      const s = t.textContent.replace(/\s+/g, " ").trim();
      if (s) out.push(s);
    }
    return out.join("\n");
  });
  writeFileSync(`${dir}/rendered-text.txt`, text);

  /* BY ELEMENT, NOT BY CLIP. A viewport-relative clip silently truncates any chart taller
     than the window and hands the reviewer a cropped picture they will faithfully report
     as a cropped chart. */
  const charts = await p.$$(".chart, .hero-viz");
  let i = 0;
  for (const el of charts) {
    const box = await el.boundingBox();
    if (!box || box.height < 60) continue;
    i++;
    await el.scrollIntoViewIfNeeded();
    await p.waitForTimeout(200);
    try { await el.screenshot({path: `${dir}/chart-${i}.png`}); }
    catch { i--; }                        // detached or zero-area: skip rather than crop
  }
  await p.close();

  const q = await b.newPage({viewport: {width: 390, height: 844}});
  await q.goto(pathToFileURL(process.cwd() + "/dist/" + n + ".html").href);
  await q.waitForTimeout(1300);
  await q.screenshot({path: `${dir}/mobile-first-screen.png`});
  await q.close();
  console.log(`${n.padEnd(18)} ${String(text.length).padStart(6)} chars  ${i} charts`);
}
await b.close();
console.log(`\nbundles in ${OUT}. Give a reviewer the folder and forbid the repo:\n` +
  `source, data, claims and READMEs all destroy the only thing that makes this work.`);
