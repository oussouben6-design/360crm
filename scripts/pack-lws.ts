/**
 * Génère l'archive complète et autonome de déploiement LWS (cPanel + Phusion Passenger) :
 *   telechargements/excellence360-lws.zip
 *
 * Usage :
 *   npm run pack:lws
 *
 * L'archive s'extrait directement dans `~/apps/excellence360` sur cPanel LWS :
 *   - contient tout le code applicatif (src, public, supabase, scripts, deploy/cpanel,
 *     passenger.cjs, package.json, package-lock.json, configurations et guide LIRE-MOI-LWS.md) ;
 *   - n'inclut JAMAIS de secrets (.env, .env.local, .env.production), ni node_modules,
 *     ni .next, ni base locale (.data), ni dépôt .git.
 */
import { spawnSync } from "node:child_process";
import { cp, mkdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "telechargements");
const OUT_ZIP = path.join(OUT_DIR, "excellence360-lws.zip");

const INCLUDED_PATHS = [
  "package.json",
  "package-lock.json",
  "passenger.cjs",
  "next.config.ts",
  "postcss.config.mjs",
  "tsconfig.json",
  "eslint.config.mjs",
  ".env.example",
  "README.md",
  "src",
  "public",
  "supabase",
  "scripts",
  "deploy/cpanel",
  "docs/lws.md",
  "docs/configuration.md",
  "docs/supabase.md",
] as const;

const FORBIDDEN_PATTERNS = [
  /(^|\/)\.env(\..+)?$/,
  /(^|\/)\.git(\/|$)/,
  /(^|\/)node_modules(\/|$)/,
  /(^|\/)\.next(\/|$)/,
  /(^|\/)\.data(\/|$)/,
  /\.tsbuildinfo$/,
];

function isAllowed(relativePath: string): boolean {
  if (relativePath === ".env.example" || relativePath.endsWith("/env.production.example")) {
    return true;
  }
  return !FORBIDDEN_PATTERNS.some((pattern) => pattern.test(relativePath));
}

async function main() {
  const staging = path.join(os.tmpdir(), `excellence360-lws-${process.pid}-${Date.now()}`);
  await mkdir(staging, { recursive: true });

  try {
    for (const rel of INCLUDED_PATHS) {
      const source = path.join(ROOT, rel);
      const destination = path.join(staging, rel);
      await mkdir(path.dirname(destination), { recursive: true });
      await cp(source, destination, {
        recursive: true,
        filter: (src) => {
          const itemRel = path.relative(ROOT, src).split(path.sep).join("/");
          return itemRel === "" || isAllowed(itemRel);
        },
      });
    }

    // Copie du mode d'emploi à la racine de l'archive pour un repérage immédiat dans cPanel.
    await cp(
      path.join(ROOT, "deploy/cpanel/LIRE-MOI.md"),
      path.join(staging, "LIRE-MOI-LWS.md"),
    );

    await mkdir(OUT_DIR, { recursive: true });
    await rm(OUT_ZIP, { force: true });

    const zip = spawnSync("zip", ["-rq", "-9", OUT_ZIP, "."], {
      cwd: staging,
      stdio: "inherit",
    });
    if (zip.status !== 0) {
      throw new Error(`La commande zip a échoué (code ${zip.status ?? "inconnu"}).`);
    }

    const info = await stat(OUT_ZIP);
    const sizeKb = Math.round(info.size / 1024);
    console.info(
      `✓ Archive LWS prête : ${path.relative(ROOT, OUT_ZIP)} (${sizeKb} Ko)`,
    );
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("✗ Échec de la génération du pack LWS :", error);
  process.exitCode = 1;
});
