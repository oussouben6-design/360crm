import { z } from "zod";
import { emailSchema, optionalText, requiredText } from "./common";

export const CONTACT_SUBJECTS = ["demo", "pricing", "support", "partnership", "other"] as const;
export type ContactSubject = (typeof CONTACT_SUBJECTS)[number];

export const CONTACT_SUBJECT_LABELS: Record<ContactSubject, string> = {
  demo: "Demande de démonstration",
  pricing: "Tarifs et offre sur mesure",
  support: "Assistance technique",
  partnership: "Partenariat",
  other: "Autre demande",
};

export const contactRequestSchema = z.object({
  name: requiredText("Nom complet", 2, 160),
  email: emailSchema,
  phone: optionalText(40),
  company: optionalText(160),
  subject: z.enum(CONTACT_SUBJECTS, {
    errorMap: () => ({ message: "Veuillez choisir un objet valide" }),
  }),
  message: requiredText("Message", 10, 5000),
  /** Champ leurre anti-robot (invisible à l'écran, toujours vide pour un visiteur réel). */
  honeypot: optionalText(200),
});

export type ContactRequestInput = z.infer<typeof contactRequestSchema>;
