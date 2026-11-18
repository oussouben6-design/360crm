import Link from "next/link";
import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import { BrandLogo } from "@/components/layout/auth-shell";
import {
  APP_COMPANY_LEGAL,
  APP_CONTACT_EMAIL,
  APP_CONTACT_EMAIL_HREF,
  APP_CONTACT_LOCATION,
  APP_CONTACT_PHONES,
  APP_NAME,
  APP_TAGLINE,
} from "@/lib/brand";

export function PublicHeader({
  authenticated,
  currentPath = "/",
}: {
  authenticated: boolean;
  currentPath?: "/" | "/contact";
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <div className="flex items-center gap-6">
          <Link href="/" aria-label={`${APP_NAME} — accueil`}>
            <BrandLogo />
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            <Link
              href="/#modules"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Modules
            </Link>
            <Link
              href="/contact"
              aria-current={currentPath === "/contact" ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                currentPath === "/contact"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Contact
            </Link>
          </div>
        </div>

        <nav className="flex items-center gap-2" aria-label="Navigation principale">
          <Link
            href="/contact"
            aria-current={currentPath === "/contact" ? "page" : undefined}
            className={`inline-flex h-9 items-center rounded-lg px-2.5 text-sm font-medium md:hidden ${
              currentPath === "/contact"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Contact
          </Link>
          {authenticated ? (
            <Link
              href="/app"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
            >
              Ouvrir mon espace <ArrowRight className="size-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/connexion"
                className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Se connecter
              </Link>
              <Link
                href="/inscription"
                className="hidden h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover sm:inline-flex"
              >
                Créer un compte
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter({ authenticated = false }: { authenticated?: boolean }) {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.35fr_0.85fr_1.1fr]">
          <div className="space-y-3">
            <Link href="/" aria-label={`${APP_NAME} — accueil`} className="inline-block">
              <BrandLogo />
            </Link>
            <p className="max-w-sm text-sm text-muted-foreground">
              {APP_NAME}, édité par <span className="font-medium text-foreground">{APP_COMPANY_LEGAL}</span>.{" "}
              {APP_TAGLINE}.
            </p>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden />
              <span>
                {APP_CONTACT_LOCATION.address}, {APP_CONTACT_LOCATION.city} — {APP_CONTACT_LOCATION.country}
              </span>
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-navy">Plateforme</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-primary hover:underline">
                  Accueil
                </Link>
              </li>
              <li>
                <Link href="/#modules" className="hover:text-primary hover:underline">
                  Modules disponibles
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-primary hover:underline">
                  Nous contacter
                </Link>
              </li>
              {authenticated ? (
                <li>
                  <Link href="/app" className="hover:text-primary hover:underline">
                    Mon espace de travail
                  </Link>
                </li>
              ) : (
                <>
                  <li>
                    <Link href="/connexion" className="hover:text-primary hover:underline">
                      Se connecter
                    </Link>
                  </li>
                  <li>
                    <Link href="/inscription" className="hover:text-primary hover:underline">
                      Créer un compte
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-navy">Contacts</h2>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href={APP_CONTACT_EMAIL_HREF}
                  className="inline-flex items-center gap-2 text-foreground transition-colors hover:text-primary hover:underline"
                >
                  <Mail className="size-4 shrink-0 text-primary" aria-hidden />
                  <span className="break-all">{APP_CONTACT_EMAIL}</span>
                </a>
              </li>
              {APP_CONTACT_PHONES.map((phone) => (
                <li key={phone.raw}>
                  <a
                    href={phone.href}
                    className="inline-flex items-center gap-2 text-foreground transition-colors hover:text-primary hover:underline"
                  >
                    <Phone className="size-4 shrink-0 text-primary" aria-hidden />
                    <span>{phone.display}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {APP_COMPANY_LEGAL} — {APP_NAME}. Tous droits réservés.
          </p>
          <p>Les modules non finalisés sont signalés dans l&apos;interface.</p>
        </div>
      </div>
    </footer>
  );
}
