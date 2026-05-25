#!/usr/bin/env node

import { join } from "node:path";
import { existsSync, chmodSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const platform = process.platform;
const arch = process.arch;

const archMap = {
  x64: "amd64",
  ia32: "386",
  arm: "arm",
  arm64: "arm64",
};

const platformMap = {
  darwin: "darwin",
  win32: "windows",
  linux: "linux",
  freebsd: "freebsd",
};

const ext = platform === "win32" ? ".exe" : "";

const binaryName = `tsgo-${platformMap[platform]}-${archMap[arch]}${ext}`;

const binaryPath = join(
  path.dirname(fileURLToPath(import.meta.url)),
  "bin",
  binaryName
);

if (!existsSync(binaryPath)) {
  console.error(
    `Not found binary file for current platform (${platform}-${arch})`
  );
  process.exit(1);
}

if (platform !== "win32") {
  try {
    chmodSync(binaryPath, 0o755);
  } catch (err) {
    console.error(`Error setting executable permission for binary file:`, err);
  }
}

const result = spawnSync(binaryPath, process.argv.slice(2), {
  stdio: "inherit",
});

process.exit(result.status);
