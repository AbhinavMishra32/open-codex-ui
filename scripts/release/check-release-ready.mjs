import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(new URL("../../", import.meta.url).pathname);
const pkg = JSON.parse(readFileSync(resolve(rootDir, "package.json"), "utf8"));
const changelog = readFileSync(resolve(rootDir, "CHANGELOG.md"), "utf8");

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

const workspacePackageFiles = [];
for (const workspace of ["apps", "packages"]) {
  const workspaceDir = resolve(rootDir, workspace);
  for (const entry of readdirSync(workspaceDir)) {
    const packageFile = resolve(workspaceDir, entry, "package.json");
    if (existsSync(packageFile)) workspacePackageFiles.push(packageFile);
  }
}

for (const packageFile of workspacePackageFiles) {
  const workspacePkg = JSON.parse(readFileSync(packageFile, "utf8"));
  if (workspacePkg.version !== version) {
    console.error(`${packageFile} version (${workspacePkg.version}) does not match root version (${version})`);
    process.exit(1);
  }
}

const releaseDir = resolve(rootDir, "releases", version);
const requiredReleaseFiles = ["web.md", "electron.md", "tui.md", "api.md", "agent-core.md"];
if (!existsSync(releaseDir)) {
  console.error(`Missing release directory: ${releaseDir}`);
  process.exit(1);
}

for (const releaseFile of requiredReleaseFiles) {
  const absolutePath = resolve(releaseDir, releaseFile);
  if (!existsSync(absolutePath)) {
    console.error(`Missing release notes file: ${absolutePath}`);
    process.exit(1);
  }
}

console.log(`Release check passed for version ${version}`);
