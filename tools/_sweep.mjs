/* ONE RENDER PER PAGE x WIDTH, HOWEVER MANY CHECKS READ IT.
 *
 * collide and textsize each swept the same 14 widths of the same 24 bundles: open the
 * page at that viewport, wait 900ms for fonts and the first draw, measure, close. The
 * render and the wait are nearly all of the cost and the two measurements only read the
 * page, so a full suite paid for every render twice. This loop opens each page x width
 * once and runs every probe it is handed on that same page; tools/collide.mjs and
 * tools/textsize.mjs pass one probe each, tools/sweeps.mjs passes both.
 *
 * A probe must not change the page: the next probe sees whatever the last one left.
 */
import {realpathSync} from "fs";
import {pathToFileURL, fileURLToPath} from "url";
import {launch} from "./_browser.mjs";

/* probes: {name: function evaluated in the page}. onPage(name, {probeName: [{W, r}]})
   is called as each page finishes, so output streams page by page as it always has. */
export async function render(list, widths, probes, onPage) {
  const b = await launch();
  try {
    for (const n of list) {
      const per = Object.fromEntries(Object.keys(probes).map(k => [k, []]));
      for (const W of widths) {
        const p = await b.newPage({viewport: {width: W, height: 1000}});
        await p.goto(pathToFileURL(process.cwd() + "/dist/" + n + ".html").href);
        await p.waitForTimeout(900);
        for (const [k, fn] of Object.entries(probes)) per[k].push({W, r: await p.evaluate(fn)});
        await p.close();
      }
      onPage(n, per);
    }
  } finally {
    await b.close();
  }
}

/* true when the module at `url` is the script node was asked to run, symlinks resolved */
export const isMain = url => {
  try { return realpathSync(fileURLToPath(url)) === realpathSync(process.argv[1]); }
  catch { return false; }
};
