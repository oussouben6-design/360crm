"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Mail, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField, Input, NativeSelect, Textarea } from "@/components/ui/input";
import {
  APP_CONTACT_EMAIL,
  APP_CONTACT_EMAIL_HREF,
  APP_CONTACT_PHONES,
} from "@/lib/brand";
import { CONTACT_SUBJECTS, CONTACT_SUBJECT_LABELS, type ContactSubject } from "@/lib/validation/contact";
import { submitContactAction } from "./actions";

export function ContactForm({ defaultSubject = "demo" }: { defaultSubject?: ContactSubject }) {
  const [state, formAction, pending] = useActionState(submitContactAction, null);

  if (state?.ok) {
    return (
      <div
        role="status"
        className="space-y-4 rounded-xl border border-success/30 bg-success-soft/60 p-6 text-sm"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
          <div className="space-y-1.5">
            <p className="text-base font-semibold text-foreground">Message envoyé</p>
            <p className="text-muted-foreground">{state.message}</p>
            {state.data?.reference ? (
              <p className="text-xs text-muted-foreground">
                Référence : <span className="font-mono font-medium text-foreground">{state.data.reference}</span>
              </p>
            ) : null}
          </div>
        </div>
        <div className="border-t border-border pt-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Besoin d&apos;une réponse immédiate ?</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
            <a href={APP_CONTACT_EMAIL_HREF} className="inline-flex items-center gap-1.5 text-primary hover:underline">
              <Mail className="size-3.5" aria-hidden /> {APP_CONTACT_EMAIL}
            </a>
            {APP_CONTACT_PHONES.map((phone) => (
              <a
                key={phone.raw}
                href={phone.href}
                className="inline-flex items-center gap-1.5 text-primary hover:underline"
              >
                <Phone className="size-3.5" aria-hidden /> {phone.display}
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state && !state.ok ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{state.message}</span>
        </p>
      ) : null}

      {/* Champ leurre anti-robot (jamais visible ni focalisable). */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="contact-company-website">Site web</label>
        <input
          id="contact-company-website"
          name="company_website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nom complet" htmlFor="contact-name" required error={errors.name}>
          <Input
            id="contact-name"
            name="name"
            required
            minLength={2}
            maxLength={160}
            autoComplete="name"
            placeholder="Ex. Amina Traoré"
          />
        </FormField>

        <FormField label="Adresse e-mail" htmlFor="contact-email" required error={errors.email}>
          <Input
            id="contact-email"
            name="email"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
            placeholder="vous@entreprise.com"
          />
        </FormField>

        <FormField label="Téléphone" htmlFor="contact-phone" error={errors.phone}>
          <Input
            id="contact-phone"
            name="phone"
            type="tel"
            maxLength={40}
            autoComplete="tel"
            placeholder="+227 00 00 00 00"
          />
        </FormField>

        <FormField label="Organisation / Entreprise" htmlFor="contact-company" error={errors.company}>
          <Input
            id="contact-company"
            name="company"
            maxLength={160}
            autoComplete="organization"
            placeholder="Nom de votre structure"
          />
        </FormField>
      </div>

      <FormField label="Objet de la demande" htmlFor="contact-subject" required error={errors.subject}>
        <NativeSelect id="contact-subject" name="subject" defaultValue={defaultSubject} required>
          {CONTACT_SUBJECTS.map((subject) => (
            <option key={subject} value={subject}>
              {CONTACT_SUBJECT_LABELS[subject]}
            </option>
          ))}
        </NativeSelect>
      </FormField>

      <FormField
        label="Message"
        htmlFor="contact-message"
        required
        error={errors.message}
        hint="Précisez vos besoins (taille d'équipe, modules souhaités, contexte)."
      >
        <Textarea
          id="contact-message"
          name="message"
          rows={5}
          required
          minLength={10}
          maxLength={5000}
          placeholder="Bonjour, nous souhaiterions organiser une présentation d'Excellence 360 CRM pour notre équipe…"
        />
      </FormField>

      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Vos informations servent uniquement au traitement de votre demande.
        </p>
        <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto">
          <Send className="size-4" aria-hidden /> Envoyer le message
        </Button>
      </div>
    </form>
  );
}
