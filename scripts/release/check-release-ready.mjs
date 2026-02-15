import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
const changelog = readFileSync(new URL("../../CHANGELOG.md", import.meta.url), "utf8");

const version = pkg.version;
if (!version) {
  console.error("package.json is missing version");
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`Invalid semver version: ${version}`);
  process.exit(1);
}

const section = `## [${version}]`;
if (!changelog.includes(section)) {
  console.error(`CHANGELOG.md is missing section: ${section}`);
  process.exit(1);
}

console.log(`Release check passed for version ${version}`);
