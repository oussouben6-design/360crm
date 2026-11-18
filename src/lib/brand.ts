/**
 * Identité de la plateforme — source unique pour le nom, la signature, les logos et les contacts.
 *
 * Produit : Excellence 360 CRM, édité par Excellence Services SARL.
 * Couleurs de marque (définies dans `src/app/globals.css`) :
 *  - bleu marine #00285e, bleu #0057a8, bleu vif #008bdf, bleu ciel #75c8fe, or #ffc000.
 */
export const APP_NAME = "Excellence 360 CRM";
export const APP_COMPANY = "Excellence Services";
export const APP_COMPANY_LEGAL = "Excellence Services SARL";
export const APP_TAGLINE =
  "Plateforme intégrée de gestion, de relation client et de pilotage de la performance";
export const APP_SLOGAN = "Diagnostic en quelques minutes";

/** Logo complet (bannière horizontale, fond blanc). */
export const LOGO_FULL = "/logo-excellence360.jpg";
/** Emblème circulaire « ES — Excellence Services » (fond transparent). */
export const LOGO_EMBLEM = "/embleme-excellence.png";

/** Coordonnées officielles d'Excellence Services SARL. */
export const APP_CONTACT_EMAIL = "admin@excellence-services-sarl.com";
export const APP_CONTACT_EMAIL_HREF = `mailto:${APP_CONTACT_EMAIL}`;

export interface ContactPhone {
  /** Numéro au format E.164 (sans espace), utilisé pour `tel:` et schema.org. */
  readonly raw: string;
  /** Numéro formaté pour la lecture humaine. */
  readonly display: string;
  /** Lien cliquable `tel:`. */
  readonly href: string;
}

export const APP_CONTACT_PHONES: readonly ContactPhone[] = [
  { raw: "+22778798900", display: "+227 78 79 89 00", href: "tel:+22778798900" },
  { raw: "+22792800257", display: "+227 92 80 02 57", href: "tel:+22792800257" },
] as const;

export const APP_CONTACT_LOCATION = {
  address: "Koira Kano",
  city: "Niamey",
  country: "Niger",
  countryCode: "NE",
} as const;

export const APP_COMPANY_WEBSITE = "https://www.excellence-services-sarl.com";
