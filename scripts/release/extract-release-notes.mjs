import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rawTag = process.argv[2];
if (!rawTag) {
  console.error("Usage: node scripts/release/extract-release-notes.mjs v0.1.0-alpha.1");
  process.exit(1);
}

const version = rawTag.startsWith("v") ? rawTag.slice(1) : rawTag;
const rootDir = resolve(new URL("../../", import.meta.url).pathname);
const changelog = readFileSync(resolve(rootDir, "CHANGELOG.md"), "utf8");
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

const changelogBody = lines.slice(start, end).join("\n").trim();
const releaseDir = resolve(rootDir, "releases", version);
const releaseFiles = [
  ["Web UI", "web.md"],
  ["Electron Desktop", "electron.md"],
  ["TUI", "tui.md"],
  ["API", "api.md"],
  ["Agent Core", "agent-core.md"],
];

let output = `${changelogBody}\n\n## Surface Releases\n`;
for (const [surface, fileName] of releaseFiles) {
  const body = readFileSync(resolve(releaseDir, fileName), "utf8").trim();
  output += `\n### ${surface}\n\n${body}\n`;
}

console.log(output.trim());
