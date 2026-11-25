import { APP_CONTACT_EMAIL, APP_NAME } from "@/lib/brand";
import { privileged } from "@/lib/db";
import { appBaseUrl, sendMail } from "@/lib/mail";
import {
  CONTACT_SUBJECT_LABELS,
  type ContactRequestInput,
  type ContactSubject,
} from "@/lib/validation/contact";

export interface ContactRequestRecord {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  subject: ContactSubject;
  message: string;
  status: "new" | "contacted" | "qualified" | "closed";
  created_at: string;
}

/**
 * Enregistre une demande de contact dans la table `contact_requests` et notifie
 * l'adresse officielle (`admin@excellence-services-sarl.com`) lorsqu'un transport
 * d'e-mail est configuré. L'enregistrement en base reste garanti même si l'envoi
 * d'e-mail n'est pas activé.
 */
export async function submitContactRequest(
  input: Omit<ContactRequestInput, "honeypot">,
): Promise<{ id: string; notified: boolean }> {
  const [row] = await privileged((tx) =>
    tx.query<{ id: string }>(
      `insert into contact_requests (name, email, phone, company, subject, message)
       values ($1, $2, $3, $4, $5, $6)
       returning id`,
      [
        input.name,
        input.email,
        input.phone,
        input.company,
        input.subject,
        input.message,
      ],
    ),
  );

  const id = row!.id;
  const subjectLabel = CONTACT_SUBJECT_LABELS[input.subject];
  const lines = [
    `Une nouvelle demande a été déposée sur ${APP_NAME} :`,
    `Objet : ${subjectLabel}`,
    `Nom : ${input.name}`,
    `E-mail : ${input.email}`,
    ...(input.phone ? [`Téléphone : ${input.phone}`] : []),
    ...(input.company ? [`Organisation : ${input.company}`] : []),
    `Message : ${input.message}`,
  ];

  const mail = await sendMail({
    to: APP_CONTACT_EMAIL,
    replyTo: input.email,
    subject: `[${APP_NAME}] ${subjectLabel} — ${input.name}`,
    kind: "contact_request",
    actionUrl: `${appBaseUrl()}/contact`,
    lines,
  });

  return { id, notified: mail.delivered };
}
