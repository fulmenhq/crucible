import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "js-yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

interface ExitCode {
  code: number;
  name: string;
  description: string;
  context: string;
  category?: string;
  bsd_equivalent?: string;
  retry_hint?: string;
  python_note?: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
  range: {
    min: number;
    max: number;
  };
  codes: ExitCode[];
}

interface SimplifiedModeMapping {
  simplified_code: number;
  simplified_name: string;
  maps_from: number[];
}

interface SimplifiedMode {
  id: string;
  name: string;
  description: string;
  mappings: SimplifiedModeMapping[];
}

interface ExitCodeCatalog {
  version: string;
  categories: Category[];
  simplified_modes?: SimplifiedMode[];
}

interface ExitCodesSnapshot {
  version: string;
  codes: Record<
    string,
    {
      name: string;
      category: string;
      description: string;
      context: string;
      bsd_equivalent?: string;
      retry_hint?: string;
      python_note?: string;
    }
  >;
}

interface SimplifiedModesSnapshot {
  version: string;
  modes: Record<string, Record<string, number[]>>;
}

async function loadExitCodesCatalog(): Promise<ExitCodeCatalog> {
  const catalogPath = path.resolve(repoRoot, "config/library/foundry/exit-codes.yaml");
  const text = await readFile(catalogPath, "utf8");
  return YAML.load(text) as ExitCodeCatalog;
}

function generateExitCodesSnapshot(catalog: ExitCodeCatalog): ExitCodesSnapshot {
  const codes: Record<string, any> = {};

  for (const category of catalog.categories) {
    for (const code of category.codes) {
      const snapshot: any = {
        name: code.name,
        category: category.id,
        description: code.description,
        context: code.context,
      };

      // Optional fields
      if (code.bsd_equivalent) {
        snapshot.bsd_equivalent = code.bsd_equivalent;
      }
      if (code.retry_hint) {
        snapshot.retry_hint = code.retry_hint;
      }
      if (code.python_note) {
        snapshot.python_note = code.python_note;
      }

      codes[code.code.toString()] = snapshot;
    }
  }

  return {
    version: catalog.version,
    codes,
  };
}

function generateSimplifiedModesSnapshot(catalog: ExitCodeCatalog): SimplifiedModesSnapshot {
  const modes: Record<string, Record<string, number[]>> = {};

  if (catalog.simplified_modes) {
    for (const mode of catalog.simplified_modes) {
      const modeMapping: Record<string, number[]> = {};

      for (const mapping of mode.mappings) {
        modeMapping[mapping.simplified_code.toString()] = mapping.maps_from;
      }

      modes[mode.id] = modeMapping;
    }
  }

  return {
    version: catalog.version,
    modes,
  };
}

async function main(): Promise<void> {
  console.log("Loading exit codes catalog...");
  const catalog = await loadExitCodesCatalog();

  console.log("Generating exit codes snapshot...");
  const exitCodesSnapshot = generateExitCodesSnapshot(catalog);
  const exitCodesPath = path.resolve(repoRoot, "config/library/foundry/exit-codes.snapshot.json");
  await writeFile(exitCodesPath, JSON.stringify(exitCodesSnapshot, null, 2) + "\n", "utf8");
  console.log(`✅ Written: ${exitCodesPath}`);

  console.log("Generating simplified modes snapshot...");
  const simplifiedModesSnapshot = generateSimplifiedModesSnapshot(catalog);
  const simplifiedModesPath = path.resolve(
    repoRoot,
    "config/library/foundry/simplified-modes.snapshot.json",
  );
  await writeFile(
    simplifiedModesPath,
    JSON.stringify(simplifiedModesSnapshot, null, 2) + "\n",
    "utf8",
  );
  console.log(`✅ Written: ${simplifiedModesPath}`);

  console.log("✅ Snapshot generation complete");
}

main().catch((err) => {
  console.error("Error generating snapshots:", err);
  process.exitCode = 1;
});
