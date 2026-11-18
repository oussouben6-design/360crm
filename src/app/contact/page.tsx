import type { Metadata } from "next";
import { Building2, Clock, Mail, MapPin, Phone } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/layout/public-chrome";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  APP_COMPANY_LEGAL,
  APP_CONTACT_EMAIL,
  APP_CONTACT_EMAIL_HREF,
  APP_CONTACT_LOCATION,
  APP_CONTACT_PHONES,
  APP_NAME,
} from "@/lib/brand";
import { CONTACT_PAGE_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import { getSessionUser } from "@/lib/server/context";
import { CONTACT_SUBJECTS, type ContactSubject } from "@/lib/validation/contact";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: CONTACT_PAGE_DESCRIPTION,
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: `Contact · ${SITE_NAME}`,
    description: CONTACT_PAGE_DESCRIPTION,
    url: "/contact",
  },
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ objet?: string }>;
}) {
  const [user, params] = await Promise.all([getSessionUser(), searchParams]);
  const defaultSubject: ContactSubject =
    params.objet && (CONTACT_SUBJECTS as readonly string[]).includes(params.objet)
      ? (params.objet as ContactSubject)
      : "demo";

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <PublicHeader authenticated={Boolean(user)} currentPath="/contact" />

      <main className="flex-1">
        <section className="border-b border-border bg-sidebar text-sidebar-foreground">
          <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
            <span className="inline-flex items-center rounded-full bg-brand px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-foreground">
              Contact &amp; démonstration
            </span>
            <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Échangeons sur la gestion de votre organisation
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-sidebar-muted sm:text-base">
              L&apos;équipe <span className="font-medium text-white">{APP_COMPANY_LEGAL}</span> vous
              accompagne pour une démonstration d&apos;{APP_NAME}, le déploiement de votre espace ou
              l&apos;assistance de vos collaborateurs.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[0.92fr_1.28fr] lg:items-start">
            <div className="space-y-4">
              <div className="card-surface p-5">
                <div className="flex items-start gap-3.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                    <Mail className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <h2 className="text-sm font-semibold text-foreground">Courrier électronique</h2>
                    <p className="text-xs text-muted-foreground">
                      Demandes commerciales, démonstrations et assistance
                    </p>
                    <a
                      href={APP_CONTACT_EMAIL_HREF}
                      className="block break-all pt-1 text-sm font-semibold text-primary hover:underline"
                    >
                      {APP_CONTACT_EMAIL}
                    </a>
                  </div>
                </div>
              </div>

              <div className="card-surface p-5">
                <div className="flex items-start gap-3.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                    <Phone className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <h2 className="text-sm font-semibold text-foreground">Téléphone</h2>
                    <p className="text-xs text-muted-foreground">
                      Joignez directement notre équipe à {APP_CONTACT_LOCATION.city}
                    </p>
                    <div className="flex flex-col gap-1.5 pt-1.5">
                      {APP_CONTACT_PHONES.map((phone) => (
                        <a
                          key={phone.raw}
                          href={phone.href}
                          className="inline-flex w-fit items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                        >
                          <Phone className="size-3.5 text-primary" aria-hidden />
                          <span>{phone.display}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-surface p-5">
                <div className="flex items-start gap-3.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                    <MapPin className="size-5" aria-hidden />
                  </span>
                  <div className="space-y-1">
                    <h2 className="text-sm font-semibold text-foreground">Siège social</h2>
                    <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <Building2 className="size-3.5 text-muted-foreground" aria-hidden />
                      {APP_COMPANY_LEGAL}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {APP_CONTACT_LOCATION.address}, {APP_CONTACT_LOCATION.city} —{" "}
                      {APP_CONTACT_LOCATION.country}
                    </p>
                    <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                      <Clock className="size-3.5 text-primary" aria-hidden />
                      Fuseau horaire : Africa/Niamey (UTC+1)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Envoyer un message</CardTitle>
                <CardDescription>
                  Remplissez ce formulaire pour planifier une démonstration ou poser une question.
                  Les champs marqués d&apos;un astérisque sont obligatoires.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ContactForm defaultSubject={defaultSubject} />
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <PublicFooter authenticated={Boolean(user)} />
    </div>
  );
}
