#!/usr/bin/env bun

/**
 * Bootstrap and verify external tooling defined in .crucible/tools.yaml.
 *
 * Usage:
 *   bun run scripts/bootstrap-tools.ts --install [--manifest path]
 *   bun run scripts/bootstrap-tools.ts --verify [--manifest path]
 */

import { parseArgs } from "util";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { resolve, join } from "path";
import { load as parseYaml } from "js-yaml";

interface ToolManifest {
  version: string;
  binDir?: string;
  tools: ToolDefinition[];
}

interface ToolDefinition {
  id: string;
  description?: string;
  required?: boolean;
  install: InstallDefinition;
}

interface InstallDefinition {
  type: "go" | "verify" | "download";
  module?: string;
  version?: string;
  binName?: string;
  destination?: string;
  command?: string;
  url?: string;
  checksum?: string | Record<string, string>;
}

const args = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    manifest: { type: "string", default: ".crucible/tools.yaml" },
    install: { type: "boolean", default: false },
    verify: { type: "boolean", default: false },
    force: { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
  allowPositionals: false,
});

if (args.values.help) {
  printHelp();
  process.exit(0);
}

const manifestPath = resolve(args.values.manifest);
const mode = args.values.install ? "install" : args.values.verify ? "verify" : "verify";

const manifest = loadManifest(manifestPath);
const defaultBinDir = resolve(manifest.binDir ?? "bin");

(async () => {
  let failures = 0;

  for (const tool of manifest.tools) {
    const ok = await handleTool(tool, mode, args.values.force ?? false);
    if (!ok && tool.required !== false) {
      failures++;
    }
  }

  if (failures > 0) {
    console.error(`❌ ${failures} required tool(s) failed in ${mode} mode.`);
    process.exit(1);
  }

  console.log(`✅ External tools ${mode === "install" ? "installed" : "verified"} successfully.`);
})();

function loadManifest(path: string): ToolManifest {
  if (!existsSync(path)) {
    console.error(`Manifest not found: ${path}`);
    process.exit(1);
  }
  const text = readFileSync(path, "utf-8");
  const data = parseYaml(text) as ToolManifest;
  if (!data || !Array.isArray(data.tools)) {
    console.error(`Invalid manifest: ${path}`);
    process.exit(1);
  }
  return data;
}

async function handleTool(tool: ToolDefinition, mode: "install" | "verify", force: boolean): Promise<boolean> {
  switch (tool.install.type) {
    case "go":
      if (mode === "install") {
        return await installGoTool(tool, force);
      }
      return verifyBinary(tool.install.binName ?? tool.id, resolveDirectory(tool.install.destination));
    case "verify":
      return verifyCommand(tool.install.command ?? tool.id, tool.required !== false);
    case "download":
      if (mode === "install") {
        return await installDownloadTool(tool, force);
      }
      return verifyBinary(tool.install.binName ?? tool.id, resolveDirectory(tool.install.destination));
    default:
      console.error(`Unknown install type '${(tool.install as any).type}' for tool ${tool.id}`);
      return false;
  }
}

async function installGoTool(tool: ToolDefinition, force: boolean): Promise<boolean> {
  const install = tool.install;
  if (!install.module || !install.version) {
    console.error(`Tool ${tool.id}: go installer requires 'module' and 'version'.`);
    return false;
  }

  const binName = install.binName ?? tool.id;
  const destination = resolveDirectory(install.destination);
  const ext = process.platform === "win32" ? ".exe" : "";
  const binaryPath = join(destination, `${binName}${ext}`);

  if (!force && existsSync(binaryPath)) {
    console.log(`• ${tool.id}: found existing binary at ${binaryPath}, skipping.`);
    return true;
  }

  mkdirSync(destination, { recursive: true });

  console.log(`• Installing ${tool.id} via go install ${install.module}@${install.version}`);
  const go = Bun.spawn({
    cmd: ["go", "install", `${install.module}@${install.version}`],
    env: { ...process.env, GOBIN: destination },
    stdio: ["inherit", "inherit", "inherit"],
  });
  const status = await go.exited;
  if (status !== 0) {
    console.error(`Tool ${tool.id}: go install failed with status ${status}.`);
    return false;
  }
  console.log(`  → installed to ${binaryPath}`);
  return true;
}

async function installDownloadTool(tool: ToolDefinition, force: boolean): Promise<boolean> {
  const install = tool.install;
  if (!install.url) {
    console.error(`Tool ${tool.id}: download installer requires 'url'.`);
    return false;
  }

  const binName = install.binName ?? tool.id;
  const destination = resolveDirectory(install.destination);
  const ext = process.platform === "win32" ? ".exe" : "";
  const binaryPath = join(destination, `${binName}${ext}`);

  if (!force && existsSync(binaryPath)) {
    console.log(`• ${tool.id}: found existing binary at ${binaryPath}, skipping.`);
    return true;
  }

  mkdirSync(destination, { recursive: true });

  // Resolve platform/arch template variables
  const platformKey = getPlatformKey();
  const resolvedUrl = install.url
    .replace(/\{\{os\}\}/g, getPlatformOS())
    .replace(/\{\{arch\}\}/g, getPlatformArch())
    .replace(/\{\{platform\}\}/g, getPlatformOS());

  console.log(`• Downloading ${tool.id} from ${resolvedUrl}`);
  
  try {
    const response = await fetch(resolvedUrl);
    if (!response.ok) {
      console.error(`Tool ${tool.id}: download failed with status ${response.status}`);
      return false;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Resolve checksum for current platform
    let expectedChecksum: string | undefined;
    if (install.checksum) {
      if (typeof install.checksum === "string") {
        expectedChecksum = install.checksum;
      } else {
        expectedChecksum = install.checksum[platformKey];
        if (!expectedChecksum) {
          console.warn(`Tool ${tool.id}: no checksum defined for platform ${platformKey}`);
        }
      }
    }

    // Verify checksum if available
    if (expectedChecksum) {
      const crypto = await import("crypto");
      const hash = crypto.createHash("sha256");
      hash.update(buffer);
      const actualChecksum = hash.digest("hex");
  
      if (actualChecksum !== expectedChecksum) {
        console.error(`Tool ${tool.id}: checksum mismatch!`);
        console.error(`  Expected: ${expectedChecksum}`);
        console.error(`  Actual:   ${actualChecksum}`);
        return false;
      }
      console.log(`  ✓ Checksum verified`);
    }

    // Handle compressed archives
    if (resolvedUrl.endsWith(".tar.gz") || resolvedUrl.endsWith(".tgz")) {
      console.log(`  ✓ Extracting tar.gz archive...`);
      const tempArchive = join(destination, `${binName}.tar.gz`);
      await Bun.write(tempArchive, buffer);
  
      // Extract using tar
      const tar = Bun.spawn({
        cmd: ["tar", "-xzf", tempArchive, "-C", destination],
        stdio: ["inherit", "pipe", "pipe"],
      });
      const tarStatus = await tar.exited;
  
      // Clean up archive
      await Bun.spawn({ cmd: ["rm", tempArchive] }).exited;
  
      if (tarStatus !== 0) {
        console.error(`Tool ${tool.id}: tar extraction failed`);
        return false;
      }
  
      // Binary should now exist
      if (!existsSync(binaryPath)) {
        console.error(`Tool ${tool.id}: expected binary not found after extraction: ${binaryPath}`);
        return false;
      }
    } else if (resolvedUrl.endsWith(".gz")) {
      console.log(`  ✓ Decompressing gzip archive...`);
      const gunzip = Bun.spawn({
        cmd: ["gunzip"],
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
      });
  
      gunzip.stdin.write(buffer);
      gunzip.stdin.end();
  
      const decompressed = await new Response(gunzip.stdout).arrayBuffer();
      await Bun.write(binaryPath, Buffer.from(decompressed));
  
      const gunzipStatus = await gunzip.exited;
      if (gunzipStatus !== 0) {
        console.error(`Tool ${tool.id}: gunzip decompression failed`);
        return false;
      }
    } else {
      // Write raw binary
      await Bun.write(binaryPath, buffer);
    }
  
    // Make executable (Unix-like systems)
    if (process.platform !== "win32") {
      await Bun.spawn({
        cmd: ["chmod", "+x", binaryPath],
        stdio: ["inherit", "inherit", "inherit"],
      }).exited;
    }

    console.log(`  → installed to ${binaryPath}`);
    return true;
  } catch (error) {
    console.error(`Tool ${tool.id}: download failed:`, error instanceof Error ? error.message : String(error));
    return false;
  }
}

function getPlatformOS(): string {
  switch (process.platform) {
    case "darwin": return "darwin";
    case "linux": return "linux";
    case "win32": return "windows";
    default: return process.platform;
  }
}

function getPlatformArch(): string {
  switch (process.arch) {
    case "x64": return "amd64";
    case "arm64": return "arm64";
    default: return process.arch;
  }
}

function getPlatformKey(): string {
  return `${getPlatformOS()}-${getPlatformArch()}`;
}

function verifyBinary(binName: string, destination: string | null): boolean {
  const ext = process.platform === "win32" ? ".exe" : "";
  const candidates: string[] = [];
  if (destination) {
    candidates.push(join(destination, `${binName}${ext}`));
  } else {
    candidates.push(join(defaultBinDir, `${binName}${ext}`));
    const manifestLocations = manifest.binDir ? [resolve(manifest.binDir)] : [];
    for (const loc of manifestLocations) {
      candidates.push(join(loc, `${binName}${ext}`));
    }
  }
  const pathMatch = commandExists(binName);
  if (pathMatch) {
    console.log(`• ${binName}: available at ${pathMatch}`);
    return true;
  }
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      console.log(`• ${binName}: available at ${candidate}`);
      return true;
    }
  }
  console.error(`• ${binName}: not found. Run make bootstrap.`);
  return false;
}

function verifyCommand(command: string, required: boolean): boolean {
  const match = commandExists(command);
  if (match) {
    console.log(`• ${command}: available at ${match}`);
    return true;
  }
  const message = `• ${command}: command not found.`;
  if (required) {
    console.error(message);
    return false;
  }
  console.warn(message + " (optional)");
  return true;
}

function commandExists(command: string): string | null {
  const check = Bun.spawnSync({
    cmd: process.platform === "win32"
      ? ["where", command]
      : ["bash", "-lc", `command -v "${command}"`],
  });
  if (check.exitCode === 0) {
    return check.stdout.toString().trim();
  }
  return null;
}

function printHelp() {
  console.log(`
Bootstrap External Tools

USAGE:
  bun run scripts/bootstrap-tools.ts --install
  bun run scripts/bootstrap-tools.ts --verify

OPTIONS:
  --manifest <path>   Path to manifest (default .crucible/tools.yaml)
  --install           Install tools defined in the manifest
  --verify            Verify tools are available
  --force             Reinstall even if binaries exist
  --help              Show this help
`);
}

function resolveDirectory(dir?: string): string {
  if (dir) {
    return resolve(dir);
  }
  return defaultBinDir;
}
