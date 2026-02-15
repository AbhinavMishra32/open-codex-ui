import { readFileSync } from "node:fs";

const rawTag = process.argv[2];
if (!rawTag) {
  console.error("Usage: node scripts/release/extract-changelog.mjs v0.1.0-alpha");
  process.exit(1);
}

const version = rawTag.startsWith("v") ? rawTag.slice(1) : rawTag;
const changelog = readFileSync(new URL("../../CHANGELOG.md", import.meta.url), "utf8");
const lines = changelog.split(/\r?\n/);

const start = lines.findIndex((line) => line.trim() === `## [${version}]` || line.trim().startsWith(`## [${version}] - `));
if (start === -1) {
  console.error(`Could not find changelog section for ${version}`);
  process.exit(1);
}

let end = lines.length;
for (let i = start + 1; i < lines.length; i += 1) {
  if (lines[i].startsWith("## [")) {
    end = i;
    break;
  }
}

const body = lines.slice(start, end).join("\n").trim();
if (!body) {
  console.error(`Changelog section for ${version} is empty`);
  process.exit(1);
}

console.log(body);
