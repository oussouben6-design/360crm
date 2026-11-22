/**
 * Génère les archives de déploiement LWS (cPanel + Phusion Passenger) pour le sous-domaine
 * `360crm.excellence-services-sarl.com` :
 *   1. telechargements/excellence360-lws.zip (application complète + .htaccess + passenger.cjs)
 *   2. telechargements/sous-domaine-360crm-lws.zip (.htaccess dédié au dossier du sous-domaine)
 *
 * Usage :
 *   npm run pack:lws
 */
import { spawnSync } from "node:child_process";
import { cp, mkdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "telechargements");
const OUT_ZIP = path.join(OUT_DIR, "excellence360-lws.zip");
const OUT_SUBDOMAIN_ZIP = path.join(OUT_DIR, "sous-domaine-360crm-lws.zip");

const INCLUDED_PATHS = [
  "package.json",
  "package-lock.json",
  "passenger.cjs",
  "next.config.ts",
  "postcss.config.mjs",
  "tsconfig.json",
  "eslint.config.mjs",
  ".env.example",
  "src",
  "public",
  "supabase",
  "scripts",
  "deploy/cpanel",
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
  const subdomainStaging = path.join(
    os.tmpdir(),
    `excellence360-sub-${process.pid}-${Date.now()}`,
  );
  await mkdir(staging, { recursive: true });
  await mkdir(subdomainStaging, { recursive: true });

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

    // Copie du .htaccess, du modèle .env.production et du guide à la racine de l'archive complète
    await cp(
      path.join(ROOT, "deploy/cpanel/public_html.htaccess"),
      path.join(staging, ".htaccess"),
    );
    await cp(
      path.join(ROOT, "deploy/cpanel/env.production.example"),
      path.join(staging, "env.production.example"),
    );
    await cp(
      path.join(ROOT, "deploy/cpanel/LIRE-MOI.md"),
      path.join(staging, "LIRE-MOI-LWS.md"),
    );

    // Archive dédiée au DocumentRoot du sous-domaine (public_html/360crm)
    await cp(
      path.join(ROOT, "deploy/cpanel/public_html.htaccess"),
      path.join(subdomainStaging, ".htaccess"),
    );
    await writeFile(
      path.join(subdomainStaging, "LIRE-MOI-SOUS-DOMAINE.txt"),
      [
        "Excellence 360 CRM — Dossier du sous-domaine 360crm.excellence-services-sarl.com",
        "==============================================================================",
        "",
        "1. Dans cPanel → Domaines, créez le sous-domaine : 360crm.excellence-services-sarl.com",
        "   avec le DocumentRoot : public_html/360crm (et activez Force HTTPS Redirect).",
        "2. Extrayez cette archive dans public_html/360crm pour y déposer le fichier .htaccess.",
        "   (Dans le Gestionnaire de fichiers cPanel, activez « Afficher les fichiers cachés (dotfiles) »",
        "   en haut à droite dans Paramètres pour voir .htaccess).",
        "3. Dans cPanel → Setup Node.js App, liez l'URL 360crm.excellence-services-sarl.com",
        "   au dossier de l'application (apps/excellence360) avec le fichier de démarrage passenger.cjs.",
        "",
      ].join("\n"),
      "utf8",
    );

    await mkdir(OUT_DIR, { recursive: true });
    await rm(OUT_ZIP, { force: true });
    await rm(OUT_SUBDOMAIN_ZIP, { force: true });

    const zipFull = spawnSync("zip", ["-rq", "-9", OUT_ZIP, "."], {
      cwd: staging,
      stdio: "inherit",
    });
    if (zipFull.status !== 0) {
      throw new Error(`La commande zip (complète) a échoué (code ${zipFull.status ?? "inconnu"}).`);
    }

    const zipSub = spawnSync("zip", ["-rq", "-9", OUT_SUBDOMAIN_ZIP, "."], {
      cwd: subdomainStaging,
      stdio: "inherit",
    });
    if (zipSub.status !== 0) {
      throw new Error(`La commande zip (sous-domaine) a échoué (code ${zipSub.status ?? "inconnu"}).`);
    }

    const infoFull = await stat(OUT_ZIP);
    const infoSub = await stat(OUT_SUBDOMAIN_ZIP);
    console.info(
      `✓ Archive complète LWS prête : ${path.relative(ROOT, OUT_ZIP)} (${Math.round(infoFull.size / 1024)} Ko)`,
    );
    console.info(
      `✓ Archive sous-domaine LWS prête : ${path.relative(ROOT, OUT_SUBDOMAIN_ZIP)} (${Math.round(infoSub.size / 1024)} Ko)`,
    );
  } finally {
    await rm(staging, { recursive: true, force: true });
    await rm(subdomainStaging, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("✗ Échec de la génération du pack LWS :", error);
  process.exitCode = 1;
});
