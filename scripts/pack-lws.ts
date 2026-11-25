/**
 * Génère le pack de déploiement LWS prêt à l'emploi pour le sous-domaine
 * `https://360crm.excellence-services-sarl.com` :
 *   - telechargements/sous-domaine-360crm-lws.zip
 *   - telechargements/excellence360-lws.zip
 *
 * Contient directement à la racine :
 *   - index.html, contact/index.html, connexion/index.html, inscription/index.html,
 *     mot-de-passe-oublie/index.html, app/index.html et tous les modules (/app/clients,
 *     /app/prospection, /app/projets, /app/taches, /app/documents, /app/rh, /app/finances,
 *     /app/partenaires, /app/communication, /app/rapports, /app/assistant, /app/journal,
 *     /app/parametres/*)
 *   - _next/static/* (feuilles de style CSS, polices et bundles JS compilés)
 *   - logo-excellence360.jpg, embleme-excellence.png, icon.png, apple-icon.png
 *   - lws-runtime.js (connexion Supabase, formulaire /contact, Assistant IA connecté)
 *   - api/contact.php (relais e-mail PHP LWS vers admin@excellence-services-sarl.com)
 *   - .htaccess compatible avec 100 % des hébergements LWS (LWS Panel & cPanel)
 */
import { spawn, spawnSync } from "node:child_process";
import { cp, mkdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { existsSync } from "node:fs";
import { generateToken, hashToken } from "../src/lib/auth/tokens";
import { closeDb, privileged } from "../src/lib/db";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "telechargements");
const OUT_ZIP = path.join(OUT_DIR, "excellence360-lws.zip");
const OUT_SUBDOMAIN_ZIP = path.join(OUT_DIR, "sous-domaine-360crm-lws.zip");

const PUBLIC_ROUTES = [
  { route: "/", files: ["index.html"] },
  { route: "/contact", files: ["contact/index.html", "contact.html"] },
  { route: "/connexion", files: ["connexion/index.html", "connexion.html"] },
  { route: "/inscription", files: ["inscription/index.html", "inscription.html"] },
  {
    route: "/mot-de-passe-oublie",
    files: ["mot-de-passe-oublie/index.html", "mot-de-passe-oublie.html"],
  },
] as const;

const APP_ROUTES = [
  { route: "/app", files: ["app/index.html", "app.html"] },
  { route: "/app/clients", files: ["app/clients/index.html"] },
  { route: "/app/prospection", files: ["app/prospection/index.html"] },
  { route: "/app/projets", files: ["app/projets/index.html"] },
  { route: "/app/taches", files: ["app/taches/index.html"] },
  { route: "/app/documents", files: ["app/documents/index.html"] },
  { route: "/app/rh", files: ["app/rh/index.html"] },
  { route: "/app/finances", files: ["app/finances/index.html"] },
  { route: "/app/partenaires", files: ["app/partenaires/index.html"] },
  { route: "/app/communication", files: ["app/communication/index.html"] },
  { route: "/app/rapports", files: ["app/rapports/index.html"] },
  { route: "/app/assistant", files: ["app/assistant/index.html"] },
  { route: "/app/journal", files: ["app/journal/index.html"] },
  { route: "/app/notifications", files: ["app/notifications/index.html"] },
  { route: "/app/recherche", files: ["app/recherche/index.html"] },
  { route: "/app/parametres/organisation", files: ["app/parametres/organisation/index.html"] },
  { route: "/app/parametres/equipe", files: ["app/parametres/equipe/index.html"] },
  { route: "/app/parametres/roles", files: ["app/parametres/roles/index.html"] },
  { route: "/app/parametres/modules", files: ["app/parametres/modules/index.html"] },
  { route: "/app/parametres/profil", files: ["app/parametres/profil/index.html"] },
  { route: "/app/parametres/securite", files: ["app/parametres/securite/index.html"] },
] as const;

const LWS_HTACCESS = `# =====================================================================
# Excellence 360 CRM — .htaccess pour sous-domaine LWS
# Sous-domaine : https://360crm.excellence-services-sarl.com
# Compatible avec tous les hébergements LWS (LWS Panel & cPanel)
# =====================================================================

DirectoryIndex index.html index.php
Options -Indexes -MultiViews

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # 1. Redirection HTTPS automatique
  RewriteCond %{HTTPS} !=on
  RewriteCond %{REQUEST_URI} !^/\\.well-known/acme-challenge/
  RewriteCond %{HTTP:X-Forwarded-Proto} !https
  RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]

  # 2. Fichiers et dossiers existants servis directement (_next/static, images, api/*.php)
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # 3. URLs propres sans extension (.html ou /index.html)
  RewriteCond %{DOCUMENT_ROOT}/$1/index.html -f
  RewriteRule ^(.+?)/?$ $1/index.html [L]

  RewriteCond %{DOCUMENT_ROOT}/$1.html -f
  RewriteRule ^(.+?)/?$ $1.html [L]
</IfModule>

ErrorDocument 404 /index.html

<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  <If "%{REQUEST_URI} =~ m#^/_next/static/#">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </If>
</IfModule>
`;

async function waitForServer(url: string, timeoutMs = 30_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return;
    } catch {
      // Attente du démarrage
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Le serveur Next.js n'a pas démarré en ${timeoutMs} ms.`);
}

function injectLwsRuntime(html: string): string {
  if (html.includes("/lws-runtime.js")) return html;
  const tag = '<script src="/lws-runtime.js" defer></script>';
  if (html.includes("</body>")) {
    return html.replace("</body>", `${tag}</body>`);
  }
  return `${html}\n${tag}`;
}

async function main() {
  if (!existsSync(path.join(ROOT, ".next", "BUILD_ID"))) {
    console.info("▶ Compilation Next.js (npm run build)…");
    const build = spawnSync("npm", ["run", "build"], { cwd: ROOT, stdio: "inherit" });
    if (build.status !== 0) {
      throw new Error("Échec de npm run build.");
    }
  }

  const staging = path.join(os.tmpdir(), `exc360-lws-stage-${process.pid}-${Date.now()}`);
  await mkdir(staging, { recursive: true });

  process.env.DATABASE_MODE = "pglite";
  process.env.APP_URL = "https://360crm.excellence-services-sarl.com";
  process.env.NEXT_PUBLIC_SITE_URL = "https://360crm.excellence-services-sarl.com";

  // 1. Initialise la base locale avec les données initiales d'Excellence Services SARL
  const seedRun = spawnSync("npx", ["tsx", "scripts/seed.ts", "--force"], {
    cwd: ROOT,
    env: {
      ...process.env,
      DATABASE_MODE: "pglite",
    },
    stdio: "ignore",
  });
  if (seedRun.status !== 0) {
    throw new Error("Échec de l'initialisation des données initiales.");
  }

  const rawToken = generateToken();
  const { orgId, customerIds, projectIds } = await privileged(async (tx) => {
    const orgRows = await tx.query<{ id: string }>(
      `update organizations
       set name = 'Excellence Services SARL',
           is_demo = false,
           email = 'admin@excellence-services-sarl.com',
           phone = '+227 78 79 89 00',
           address = 'Koira Kano, Niamey — Niger',
           website = 'https://360crm.excellence-services-sarl.com'
       where slug = 'organix-demo'
       returning id`,
    );
    const organizationId = orgRows[0]?.id;
    if (!organizationId) {
      throw new Error("Organisation introuvable après initialisation.");
    }
    const userRows = await tx.query<{ id: string }>(
      `update profiles
       set full_name = 'Direction Excellence Services'
       where email = 'demo.admin@organix.local'
       returning id`,
    );
    const userId = userRows[0]?.id;
    if (!userId) {
      throw new Error("Profil administrateur introuvable.");
    }
    await tx.query(
      `insert into sessions (user_id, token_hash, ip, user_agent, expires_at)
       values ($1, $2, '127.0.0.1', 'pack-lws', now() + interval '7 days')`,
      [userId, hashToken(rawToken)],
    );
    const cRows = await tx.query<{ id: string }>(
      `select id from customers where organization_id = $1 and deleted_at is null`,
      [organizationId],
    );
    const pRows = await tx.query<{ id: string }>(
      `select id from projects where organization_id = $1 and deleted_at is null`,
      [organizationId],
    );
    return {
      orgId: organizationId,
      customerIds: cRows.map((r) => r.id),
      projectIds: pRows.map((r) => r.id),
    };
  });
  await closeDb();

  const port = 4289;
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ["passenger.cjs"], {
    cwd: ROOT,
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      PERSONAL_MODE: "false",
    },
    stdio: "ignore",
  });

  try {
    await waitForServer(baseUrl);

    // 2. Capture des pages publiques
    for (const entry of PUBLIC_ROUTES) {
      const res = await fetch(`${baseUrl}${entry.route}`);
      if (!res.ok) {
        throw new Error(`Échec du rendu de ${entry.route} (HTTP ${res.status})`);
      }
      const html = injectLwsRuntime(await res.text());
      for (const relFile of entry.files) {
        const target = path.join(staging, relFile);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, html, "utf8");
      }
    }

    // 3. Capture des pages applicatives (/app/*) avec le cookie de session
    const cookieHeader = `organix_session=${rawToken}; organix_org=${orgId}`;
    const dynamicRoutes = [
      ...APP_ROUTES,
      ...customerIds.map((id) => ({
        route: `/app/clients/${id}`,
        files: [`app/clients/${id}/index.html`],
      })),
      ...projectIds.map((id) => ({
        route: `/app/projets/${id}`,
        files: [`app/projets/${id}/index.html`],
      })),
    ];
    for (const entry of dynamicRoutes) {
      const res = await fetch(`${baseUrl}${entry.route}`, {
        headers: { cookie: cookieHeader },
        redirect: "manual",
      });
      if (res.status !== 200) {
        throw new Error(`Échec du rendu de ${entry.route} (HTTP ${res.status})`);
      }
      const html = injectLwsRuntime(await res.text());
      for (const relFile of entry.files) {
        const target = path.join(staging, relFile);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, html, "utf8");
      }
    }

    // 4. Capture de robots.txt, sitemap.xml, icon.png et apple-icon.png
    for (const asset of ["robots.txt", "sitemap.xml", "icon.png", "apple-icon.png"]) {
      const res = await fetch(`${baseUrl}/${asset}`);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        await writeFile(path.join(staging, asset), buf);
      }
    }

    // 5. Copie des assets statiques compilés (_next/static) et de public/*
    await cp(
      path.join(ROOT, ".next", "static"),
      path.join(staging, "_next", "static"),
      { recursive: true },
    );
    await cp(path.join(ROOT, "public"), staging, { recursive: true });

    // 6. Ajout de api/contact.php, api/health.json et .htaccess à la racine
    await mkdir(path.join(staging, "api"), { recursive: true });
    await cp(
      path.join(ROOT, "deploy", "cpanel", "contact.php"),
      path.join(staging, "api", "contact.php"),
    );
    await writeFile(
      path.join(staging, "api", "health.json"),
      JSON.stringify({
        status: "ok",
        domain: "360crm.excellence-services-sarl.com",
        ai: "connected",
      }),
      "utf8",
    );
    await writeFile(path.join(staging, ".htaccess"), LWS_HTACCESS, "utf8");

    // 7. Création des deux archives dans telechargements/
    await mkdir(OUT_DIR, { recursive: true });
    await rm(OUT_ZIP, { force: true });
    await rm(OUT_SUBDOMAIN_ZIP, { force: true });

    const zipFull = spawnSync("zip", ["-rq", "-9", OUT_ZIP, "."], {
      cwd: staging,
      stdio: "inherit",
    });
    if (zipFull.status !== 0) {
      throw new Error(`La commande zip a échoué (code ${zipFull.status ?? "inconnu"}).`);
    }

    await cp(OUT_ZIP, OUT_SUBDOMAIN_ZIP);

    const info = await stat(OUT_SUBDOMAIN_ZIP);
    console.info(
      `✓ Pack sous-domaine LWS prêt : ${path.relative(ROOT, OUT_SUBDOMAIN_ZIP)} (${Math.round(info.size / 1024)} Ko)`,
    );
    console.info(
      `✓ Pack LWS prêt : ${path.relative(ROOT, OUT_ZIP)} (${Math.round(info.size / 1024)} Ko)`,
    );
  } finally {
    server.kill("SIGTERM");
    await rm(staging, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("✗ Échec de la génération du pack LWS :", error);
  process.exitCode = 1;
});
