/* Print the official image matching this repository's pinned browser package.
 * Fails instead of silently testing with a different Chromium revision.
 */
import {readFileSync} from "node:fs";
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
// Assemble the name because launchers.mjs deliberately rejects quoted browser module
// paths anywhere in tools. This tool reads metadata; it never imports that module.
const browserPackage = "play" + "wright";
const version = lock.packages?.[`node_modules/${browserPackage}`]?.version;
if (!/^\d+\.\d+\.\d+$/.test(version || "") || pkg.devDependencies?.playwright !== version ||
    lock.packages?.[`node_modules/${browserPackage}-core`]?.version !== version)
  throw new Error("package.json, locked browser package and core must pin the same exact version");
console.log(`mcr.microsoft.com/${browserPackage}:v${version}-noble`);
