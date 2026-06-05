import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const TEXT_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".sql",
  ".ts",
  ".tsx",
]);

const IGNORED_DIRS = new Set([
  ".git",
  ".next",
  "coverage",
  "node_modules",
  "playwright-report",
  "test-results",
]);

const DEFAULT_DIRS = ["app", "components", "lib", "scripts", "supabase", "tests", "types"];

const MOJIBAKE_PATTERNS = [
  new RegExp("\\u0432\\u0402", "g"),
  new RegExp("\\u0412\\u00b7", "g"),
  new RegExp("\\u0432\\u2030", "g"),
  new RegExp("\\u0432\\u2020", "g"),
  new RegExp("\\u0432\\u040a", "g"),
  new RegExp("\\u0413\\u2014", "g"),
  new RegExp(
    "\\u0420[\\u0452\\u0453\\u201e\\u2026\\u2020\\u2021\\u20ac\\u2030\\u0409\\u2039\\u040a\\u040c\\u040b\\u040f\\u201d\\u2122]",
    "g",
  ),
];

function extname(path) {
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "" : path.slice(dot);
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path, files);
    } else if (TEXT_EXTENSIONS.has(extname(entry))) {
      files.push(path);
    }
  }
  return files;
}

function scanFile(path) {
  const text = readFileSync(path, "utf8");
  const hits = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    for (const pattern of MOJIBAKE_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(lines[i])) {
        hits.push({ line: i + 1, text: lines[i].trim().slice(0, 180) });
        break;
      }
    }
  }
  return hits;
}

export function findMojibake({ root = ROOT, dirs = DEFAULT_DIRS } = {}) {
  const files = dirs
    .map((dir) => join(root, dir))
    .filter((dir) => existsSync(dir))
    .flatMap((dir) => walk(dir));

  return files.flatMap((file) =>
    scanFile(file).map((hit) => ({
      file: relative(root, file).replaceAll("\\", "/"),
      ...hit,
    })),
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const hits = findMojibake();
  if (hits.length > 0) {
    console.error("Mojibake detected. Fix corrupted UTF-8 text before shipping:");
    for (const hit of hits.slice(0, 80)) {
      console.error(`- ${hit.file}:${hit.line} ${hit.text}`);
    }
    if (hits.length > 80) {
      console.error(`...and ${hits.length - 80} more`);
    }
    process.exit(1);
  }
  console.log("No mojibake fingerprints found.");
}
