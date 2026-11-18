# Déploiement LWS (cPanel + Passenger) — Excellence 360 CRM

Guide express pour déployer **Excellence 360 CRM** sur **`https://360crm.excellence-services-sarl.com`**
(Excellence Services SARL — `admin@excellence-services-sarl.com` · `+227 78 79 89 00` · `+227 92 80 02 57`).

> **Prérequis d'offre LWS :** formule **cPanel L, XL, 2XL, 3XL ou CloudCP** disposant du menu
> **Setup Node.js App** (Phusion Passenger). Un hébergement « LWS Panel » classique (Perso / Pro /
> Business) n'exécute pas Node.js.

---

## Ce que contient `excellence360-lws.zip`

L'archive `telechargements/excellence360-lws.zip` est **complète et autonome** (générée par
`npm run pack:lws`) : elle contient tout le code de l'application, les 27 migrations, la page
`/contact` et vos coordonnées officielles, `passenger.cjs`, `package.json` / `package-lock.json`
ainsi que tout le kit `deploy/cpanel/` (sans aucun secret).

---

## Installation en 6 étapes sur cPanel LWS

### 1. Créer le sous-domaine

cPanel → **Domaines** → *Créer un domaine* :

| Champ | Valeur |
| --- | --- |
| Domaine | `360crm.excellence-services-sarl.com` |
| DocumentRoot | `public_html/360crm` (dossier **dédié**) |
| Force HTTPS Redirect | **Activé** |

> ⚠️ Ne déposez **jamais** le code de l'application dans `public_html/360crm`. Ce dossier ne doit
> contenir que le fichier `.htaccess`. Le code vit dans `~/apps/excellence360`.

### 2. Déposer l'application dans `~/apps/excellence360`

**Option A — Avec le fichier `excellence360-lws.zip` (Gestionnaire de fichiers cPanel) :**
1. cPanel → **Gestionnaire de fichiers** → créez le dossier `apps/excellence360` à la racine de votre compte.
2. Téléversez **`excellence360-lws.zip`** dans `apps/excellence360`, puis clic droit → **Extraire** directement dans `apps/excellence360` (vérifiez que `passenger.cjs` et `package.json` se trouvent bien dans `~/apps/excellence360/`).
3. Supprimez `excellence360-lws.zip` après extraction.

**Option B — Avec Git (Terminal cPanel / SSH) :**
```bash
mkdir -p ~/apps/excellence360 && cd ~/apps/excellence360
git clone https://github.com/oussouben6-design/360crm.git .
```

### 3. Créer l'application Node.js dans cPanel

cPanel → **Setup Node.js App** → *Create Application* :

| Champ | Valeur |
| --- | --- |
| Node.js version | **22** (minimum 20.9) |
| Application mode | **Production** |
| Application root | `apps/excellence360` |
| Application URL | `360crm.excellence-services-sarl.com` |
| Application startup file | **`passenger.cjs`** |

Copiez la commande `source /home/…/nodevenv/apps/excellence360/22/bin/activate && cd /home/…/apps/excellence360` affichée en haut de la page cPanel et exécutez-la dans **cPanel → Terminal** (ou en SSH).

### 4. Installer le `.htaccess` du sous-domaine

Dans le Terminal cPanel :
```bash
mkdir -p ~/logs ~/public_html/360crm
cp ~/apps/excellence360/deploy/cpanel/public_html.htaccess ~/public_html/360crm/.htaccess
sed -i "s#/home/USER/#$HOME/#g" ~/public_html/360crm/.htaccess
```

### 5. Renseigner `.env.production`

```bash
cd ~/apps/excellence360
cp deploy/cpanel/env.production.example .env.production
chmod 600 .env.production
nano .env.production
```

`APP_URL`, `NEXT_PUBLIC_SITE_URL`, `SUPABASE_URL` (`opnlvqwbevnivfjpbrxa`) et `MAIL_FROM`
(`Excellence 360 CRM <admin@excellence-services-sarl.com>`) sont déjà pré-remplis.
Complétez uniquement les **5 secrets** :
1. `MOT_DE_PASSE_DB` dans `DATABASE_URL` (mot de passe PostgreSQL Supabase, pooler port `6543`)
2. `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API → `service_role`)
3. `RESEND_API_KEY` (clé API Resend)
4. `MFA_ENCRYPTION_KEY` → générer avec `openssl rand -base64 32`
5. `MAINTENANCE_SECRET` → générer avec `openssl rand -hex 32`

*(Si vous n'avez pas encore configuré Resend et souhaitez tester la connexion immédiatement, passez temporairement `AUTH_LOGIN_OTP=false` et `MAIL_TRANSPORT=none`.)*

### 6. Construire et démarrer

```bash
cd ~/apps/excellence360
bash deploy/cpanel/install-on-cpanel.sh
bash deploy/cpanel/check-remote.sh https://360crm.excellence-services-sarl.com
```

Le script installe les dépendances, vérifie `.env.production`, compile Next.js, relance Passenger
et contrôle `/api/health` (**27/27 migrations**, déjà appliquées sur Supabase).

Ouvrez ensuite :
- **`https://360crm.excellence-services-sarl.com`** (accueil)
- **`https://360crm.excellence-services-sarl.com/contact`** (page Contact avec `admin@excellence-services-sarl.com`, `+227 78 79 89 00`, `+227 92 80 02 57`)

---

## Mises à jour ultérieures

```bash
bash ~/apps/excellence360/deploy/cpanel/deploy.sh
```

---

## Dépannage rapide

| Symptôme | Cause probable | Solution |
| --- | --- | --- |
| `403` / « Index of / » | `.htaccess` absent ou `USER` non remplacé | Refaire l'étape 4 |
| `503` | Erreur au démarrage de `passenger.cjs` | `tail -n 100 ~/logs/excellence360-passenger.log` |
| `500` « Invalid command 'PassengerEnabled' » | Directives Passenger gérées par cPanel | Cliquer **Save / Restart** dans *Setup Node.js App* |
| Code OTP non reçu | Domaine/clé Resend non vérifiés | Vérifier `RESEND_API_KEY` + `MAIL_FROM`, ou `AUTH_LOGIN_OTP=false` en secours |

Documentation complète (SEO, Search Console, CI/CD SSH) : `docs/lws.md`.
