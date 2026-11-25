"use server";

import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";
import { failure, guard, success, type ActionResult } from "@/lib/server/action";
import { contactRequestSchema } from "@/lib/validation/contact";
import { submitContactRequest } from "@/modules/contact/service";

async function clientIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? headerList.get("x-real-ip") ?? "unknown";
}

export async function submitContactAction(
  _state: ActionResult<{ reference: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ reference: string }>> {
  return guard(async () => {
    const ip = await clientIp();
    const limit = rateLimit(`contact:${ip}`, 5, 15 * 60);
    if (!limit.allowed) {
      return failure(
        "Trop de messages envoyés récemment. Veuillez patienter quelques minutes ou nous joindre directement par téléphone ou e-mail.",
        "rate_limit",
      );
    }

    const parsed = contactRequestSchema.parse({
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      company: formData.get("company"),
      subject: formData.get("subject"),
      message: formData.get("message"),
      honeypot: formData.get("company_website"),
    });

    // Leurre anti-robot rempli : réponse neutre sans écriture en base.
    if (parsed.honeypot) {
      return success("Votre message a bien été enregistré.", { reference: "OK" });
    }

    const { id } = await submitContactRequest({
      name: parsed.name,
      email: parsed.email,
      phone: parsed.phone,
      company: parsed.company,
      subject: parsed.subject,
      message: parsed.message,
    });

    return success(
      "Votre message a bien été transmis à l'équipe Excellence Services. Nous vous répondrons dans les meilleurs délais.",
      { reference: id.slice(0, 8).toUpperCase() },
    );
  });
}
