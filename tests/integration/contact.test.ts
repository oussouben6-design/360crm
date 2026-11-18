import { describe, expect, it } from "vitest";
import { privileged } from "@/lib/db";
import { contactRequestSchema } from "@/lib/validation/contact";
import { submitContactRequest } from "@/modules/contact/service";

describe("demandes de contact publiques", () => {
  it("valide et normalise une demande complète", () => {
    const parsed = contactRequestSchema.parse({
      name: "  Moussa Abdou  ",
      email: "  Moussa@Exemple.ne ",
      phone: "+227 90 11 22 33",
      company: "Sahel Conseil",
      subject: "demo",
      message: "Nous souhaitons planifier une démonstration pour 15 collaborateurs.",
      honeypot: "",
    });
    expect(parsed.name).toBe("Moussa Abdou");
    expect(parsed.email).toBe("moussa@exemple.ne");
    expect(parsed.phone).toBe("+227 90 11 22 33");
    expect(parsed.company).toBe("Sahel Conseil");
    expect(parsed.subject).toBe("demo");
    expect(parsed.honeypot).toBeNull();
  });

  it("refuse un message trop court ou un objet inconnu", () => {
    expect(() =>
      contactRequestSchema.parse({
        name: "Moussa",
        email: "moussa@exemple.ne",
        subject: "demo",
        message: "Court",
      }),
    ).toThrow();

    expect(() =>
      contactRequestSchema.parse({
        name: "Moussa",
        email: "moussa@exemple.ne",
        subject: "inconnu",
        message: "Un message suffisamment long pour passer la règle.",
      }),
    ).toThrow();
  });

  it("persiste la demande en base et interdit toute relecture via organix_app", async () => {
    const { id } = await submitContactRequest({
      name: "Aïchatou Issoufou",
      email: "aichatou@organisation.ne",
      phone: "+22778798900",
      company: "Cabinet Horizon",
      subject: "pricing",
      message: "Bonjour, merci de nous transmettre une proposition pour notre équipe à Niamey.",
    });

    const [saved] = await privileged((tx) =>
      tx.query<{ name: string; email: string; subject: string; status: string }>(
        "select name, email, subject, status from contact_requests where id = $1",
        [id],
      ),
    );
    expect(saved).toEqual({
      name: "Aïchatou Issoufou",
      email: "aichatou@organisation.ne",
      subject: "pricing",
      status: "new",
    });

    // Sous le rôle applicatif non privilégié, aucune politique SELECT n'expose les demandes.
    const visibleToAppRole = await privileged(async (tx) => {
      await tx.exec("begin");
      try {
        await tx.exec("set local role organix_app");
        const rows = await tx.query<{ id: string }>(
          "select id from contact_requests where id = $1",
          [id],
        );
        return rows.length;
      } finally {
        await tx.exec("rollback");
      }
    });
    expect(visibleToAppRole).toBe(0);
  });
});
