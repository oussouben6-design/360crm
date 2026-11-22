"use server";

import { z } from "zod";
import { requirePermission } from "@/lib/server/context";
import { failure, guard, success, type ActionResult } from "@/lib/server/action";
import { rateLimit } from "@/lib/rate-limit";
import {
  runAiAssistantQuery,
  type AiPresetKey,
  type AiQueryResponse,
} from "./service";

const askAiSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(2, "Veuillez saisir une question ou choisir une analyse rapide.")
    .max(2000, "La question ne peut pas dépasser 2 000 caractères."),
  preset: z
    .enum(["summary", "projects", "crm", "finance", "draft"])
    .optional(),
});

export async function askAiAssistantAction(
  _prev: ActionResult<AiQueryResponse> | null,
  formData: FormData,
): Promise<ActionResult<AiQueryResponse>> {
  return guard(async () => {
    const context = await requirePermission("ai", "read");
    const limit = rateLimit(
      `ai:${context.organization!.id}:${context.user.id}`,
      30,
      5 * 60,
    );
    if (!limit.allowed) {
      return failure(
        "Trop de requêtes envoyées à l'assistant IA. Veuillez patienter quelques instants.",
        "rate_limited",
      );
    }

    const rawPreset = String(formData.get("preset") ?? "").trim();
    const parsed = askAiSchema.safeParse({
      prompt: String(formData.get("prompt") ?? ""),
      preset: rawPreset ? (rawPreset as AiPresetKey) : undefined,
    });

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message ?? "Requête invalide.";
      return failure(firstIssue, "validation");
    }

    const response = await runAiAssistantQuery(context, parsed.data);
    return success("Analyse générée avec succès.", response);
  });
}
