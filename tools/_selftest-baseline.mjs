/* Within one selftest process only: a successful clean invocation may be reused when
 * its executable, arguments, preparation and actual input bytes are unchanged. Never
 * memoize injected runs. Dependencies/browser installation must stay fixed during a
 * run, just as they must during an ordinary gate invocation. */
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
import {existsSync, lstatSync, readdirSync, readFileSync, statSync, utimesSync} from "node:fs";
import {join} from "node:path";

export function invocation(c) {
  return {command: c.command || "node",
    args: c.command ? c.args : [`tools/${c.gate}.mjs`, ...c.args],
    prepare: c.prepare || null};
}

const gitFiles = (root, args) => {
  const r = spawnSync("git", ["ls-files", "-z", ...args], {cwd: root, encoding: "utf8"});
  if (r.status !== 0) throw new Error(`cannot inventory selftest inputs: ${r.stderr || r.error || r.status}`);
  return r.stdout.split("\0").filter(Boolean);
};

export function inputSnapshot(root) {
  /* Local validation checkouts can link node_modules to the installed dependency
     tree. Git's node_modules/ ignore rule does not match the symlink itself. This
     one dependency location remains fixed for the run; do not follow it or mistake
     it for a source input. Every other unexpected symlink still fails inspection. */
  const files = new Set(gitFiles(root, ["--cached", "--others", "--exclude-standard"])
    .filter(f => f !== "node_modules" && !f.startsWith("node_modules/")));
  const addTree = dir => {
    if (!existsSync(join(root, dir))) return;
    for (const e of readdirSync(join(root, dir), {withFileTypes: true})) {
      const path = `${dir}/${e.name}`;
      if (e.name.endsWith(".selftest-backup")) continue;
      if (e.isDirectory()) addTree(path);
      else files.add(path);
    }
  };
  addTree("dist");
  if (existsSync(join(root, "_data/cite.json"))) files.add("_data/cite.json");
  /* Raw private build caches can be enormous; consistency also reads some of their
     contents. Do not silently omit them from a reusable identity: disable reuse on
     such a checkout. CI's tracked-only checkout has none. Python bytecode is not data. */
  const raw = gitFiles(root, ["--others", "--ignored", "--exclude-standard", "--", "_data/build"])
    .filter(f => !f.split("/").includes("__pycache__"));
  return {digest: fingerprint(root, files), reusable: raw.length === 0,
    reason: raw.length ? "ignored build inputs present" : null};
}

export function fingerprint(root, files) {
  const hash = createHash("sha256");
  for (const f of [...files].sort()) {
    if (f.endsWith(".selftest-backup")) continue;
    hash.update(JSON.stringify(f) + "\0");
    const path = join(root, f);
    if (!existsSync(path)) { hash.update("missing\0"); continue; }
    const stat = lstatSync(path);
    if (!stat.isFile()) throw new Error(`cannot inspect selftest input ${f}: expected a regular file`);
    hash.update(`${stat.mode}:${stat.size}\0`);
    /* Catalog freshness still reads script/catalog mtimes. For every other input,
       freshness is content-based; touching a restored fixture does not change it. */
    if (f === "_data/catalog.json" || /^_data\/build\/[^/]+\.(py|mjs|js)$/.test(f))
      hash.update(`${stat.mtimeMs}\0`);
    hash.update(readFileSync(path));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export class CleanBaselines {
  constructor({enabled = true} = {}) {
    this.enabled = enabled;
    this.entries = new Map();
    this.actual = 0;
    this.reused = 0;
    this.disabled = new Set();
  }
  check(c, snapshot, run) {
    const before = snapshot();
    /* A changed input invalidates ALL previous baselines, not just this command. */
    if (this.digest !== before.digest || !before.reusable) this.entries.clear();
    this.digest = before.digest;
    const key = JSON.stringify(invocation(c));
    if (!before.reusable) this.disabled.add(before.reason);
    if (this.enabled && before.reusable && this.entries.has(key)) {
      this.reused++;
      return {...this.entries.get(key), reused: true, snapshot: before};
    }
    this.actual++;
    const result = run();
    const after = snapshot();
    try { assertRestored(before, after, "clean gate changed its inputs"); }
    catch (error) { this.entries.clear(); throw error; }
    if (this.enabled && before.reusable && result.status === 0) this.entries.set(key, result);
    return {...result, reused: false, snapshot: before};
  }
}

export function assertRestored(before, after, label = "fixture inputs were not restored") {
  if (before.digest !== after.digest || before.reusable !== after.reusable)
    throw new Error(label);
}

export function restoreTimes(path, original) {
  // Numeric seconds retain microseconds; Date objects truncate these to milliseconds.
  utimesSync(path, original.atimeMs / 1000, original.mtimeMs / 1000);
}

export function verifyRestoration(path, originalBytes, originalTimes) {
  const bytes = readFileSync(path);
  if (!bytes.equals(originalBytes)) throw new Error(`${path}: restored bytes differ from backup`);
  // Reading the bytes may update atime. Restore it again before checking timestamps.
  restoreTimes(path, originalTimes);
  const now = statSync(path);
  // Node's utimes API restores to microseconds, not APFS's arbitrary nanoseconds.
  if (Math.abs(now.mtimeMs - originalTimes.mtimeMs) > 0.0011 ||
      Math.abs(now.atimeMs - originalTimes.atimeMs) > 0.0011)
    throw new Error(`${path}: timestamps were not restored to filesystem API precision`);
}
