import { describe, expect, it } from "vitest";
import {
  APP_CONTACT_EMAIL,
  APP_CONTACT_EMAIL_HREF,
  APP_CONTACT_PHONES,
} from "@/lib/brand";
import {
  CONTACT_PAGE_DESCRIPTION,
  PRODUCTION_SITE_URL,
  PUBLIC_PAGES,
  ROBOTS_DISALLOW,
  SITE_DESCRIPTION,
  absoluteUrl,
  organizationJsonLd,
  siteUrl,
} from "@/lib/seo";

/**
 * Référencement : l'URL publique ne doit jamais dépendre d'un `localhost` oublié, rien de
 * l'espace client ne doit être indexable, et les coordonnées officielles doivent figurer
 * dans les métadonnées et les données structurées.
 */
describe("URL publique", () => {
  it("retombe sur le domaine de production sans variable", () => {
    expect(siteUrl({})).toBe(PRODUCTION_SITE_URL);
    expect(PRODUCTION_SITE_URL).toBe("https://360crm.excellence-services-sarl.com");
  });

  it("privilégie NEXT_PUBLIC_SITE_URL, puis APP_URL", () => {
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "https://crm.exemple.com", APP_URL: "https://autre.com" })).toBe(
      "https://crm.exemple.com",
    );
    expect(siteUrl({ APP_URL: "https://app.exemple.com" })).toBe("https://app.exemple.com");
  });

  it("retire les slashs finaux et ajoute le schéma manquant", () => {
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "https://crm.exemple.com///" })).toBe("https://crm.exemple.com");
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "crm.exemple.com" })).toBe("https://crm.exemple.com");
  });

  it("construit des URL absolues pour les balises", () => {
    const env = { NEXT_PUBLIC_SITE_URL: "https://crm.exemple.com" };
    expect(absoluteUrl("/logo.png", env)).toBe("https://crm.exemple.com/logo.png");
    expect(absoluteUrl("logo.png", env)).toBe("https://crm.exemple.com/logo.png");
    expect(absoluteUrl("https://cdn.exemple.com/a.png", env)).toBe("https://cdn.exemple.com/a.png");
  });
});

describe("Indexation", () => {
  it("exclut l'espace client, les API et les liens d'invitation", () => {
    for (const path of ["/app", "/api/", "/connexion", "/invitations/"]) {
      expect(ROBOTS_DISALLOW).toContain(path);
    }
  });

  it("publie au sitemap l'accueil et la page contact, jamais l'espace client", () => {
    const paths = PUBLIC_PAGES.map((page) => page.path);
    expect(paths).toContain("/");
    expect(paths).toContain("/contact");
    for (const page of PUBLIC_PAGES) {
      expect(page.path.startsWith("/")).toBe(true);
      expect(page.path.startsWith("/app")).toBe(false);
      expect(page.priority).toBeGreaterThan(0);
    }
  });
});

describe("Coordonnées officielles et données structurées", () => {
  it("expose l'e-mail et les deux numéros officiels d'Excellence Services SARL", () => {
    expect(APP_CONTACT_EMAIL).toBe("admin@excellence-services-sarl.com");
    expect(APP_CONTACT_EMAIL_HREF).toBe("mailto:admin@excellence-services-sarl.com");
    expect(APP_CONTACT_PHONES.map((phone) => phone.raw)).toEqual([
      "+22778798900",
      "+22792800257",
    ]);
    expect(APP_CONTACT_PHONES.map((phone) => phone.href)).toEqual([
      "tel:+22778798900",
      "tel:+22792800257",
    ]);
  });

  it("décrit l'organisation, ses points de contact et l'application avec des URL absolues", () => {
    const json = JSON.stringify(organizationJsonLd({ NEXT_PUBLIC_SITE_URL: "https://crm.exemple.com" }));
    expect(json).toContain('"@type":"Organization"');
    expect(json).toContain('"@type":"SoftwareApplication"');
    expect(json).toContain('"@type":"ContactPoint"');
    expect(json).toContain("https://crm.exemple.com/#organization");
    expect(json).toContain("https://crm.exemple.com/contact");
    expect(json).not.toContain("360crm.excellence-services-sarl.com");
    expect(json).toContain("admin@excellence-services-sarl.com");
    expect(json).toContain("+22778798900");
    expect(json).toContain("+22792800257");
  });

  it("expose des descriptions exploitables par les moteurs", () => {
    expect(SITE_DESCRIPTION.length).toBeGreaterThan(80);
    expect(SITE_DESCRIPTION).toContain("Excellence 360 CRM");
    expect(CONTACT_PAGE_DESCRIPTION).toContain("admin@excellence-services-sarl.com");
    expect(CONTACT_PAGE_DESCRIPTION).toContain("+227 78 79 89 00");
    expect(CONTACT_PAGE_DESCRIPTION).toContain("+227 92 80 02 57");
  });
});
