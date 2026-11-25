import type { Metadata } from "next";
import { CheckCircle2, Sparkles } from "lucide-react";
import { requirePagePermission } from "@/lib/server/context";
import {
  generateEmbeddedAiResponse,
  getAiConnectionStatus,
  loadAiOrganizationSnapshot,
  type AiQueryResponse,
} from "@/modules/ai/service";
import { PageHeader, StatCard } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { AssistantConsole } from "./assistant-console";

export const metadata: Metadata = { title: "Assistant IA" };

export default async function AssistantPage() {
  const context = await requirePagePermission("ai", "read");
  const status = getAiConnectionStatus();
  const snapshot = await loadAiOrganizationSnapshot(context);

  const initialResponse: AiQueryResponse = {
    answer: generateEmbeddedAiResponse(
      snapshot,
      "Synthèse exécutive de l'organisation",
      "summary",
    ),
    provider: status.provider,
    providerLabel: "Assistant IA Excellence 360",
    model: status.model,
    usedExternalLlm: status.externalConfigured,
    authorizedLabels: snapshot.authorizedLabels,
    generatedAt: new Date().toISOString(),
  };

  const currency = snapshot.organization.currency;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Assistant IA"
        description={`Synthèse, analyse et aide à la rédaction pour ${snapshot.organization.name}.`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="success">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="size-3.5" /> Connecté
              </span>
            </Badge>
          </div>
        }
      />

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Projets actifs"
          value={snapshot.projects ? `${snapshot.projects.active} / ${snapshot.projects.total}` : "—"}
          hint={
            snapshot.projects
              ? `${snapshot.projects.completed} projet(s) terminé(s)`
              : "Selon vos droits d'accès"
          }
          icon={<Sparkles className="size-4" />}
        />
        <StatCard
          label="Tâches à suivre"
          value={snapshot.tasks ? String(snapshot.tasks.inProgress + snapshot.tasks.todo) : "—"}
          hint={
            snapshot.tasks
              ? `${snapshot.tasks.overdue} en retard · ${snapshot.tasks.done} terminée(s)`
              : "Selon vos droits d'accès"
          }
          tone={snapshot.tasks && snapshot.tasks.overdue > 0 ? "danger" : "default"}
        />
        <StatCard
          label="Clients & Pipeline"
          value={snapshot.crm ? `${snapshot.crm.customersTotal} client(s)` : "—"}
          hint={
            snapshot.prospection
              ? `${snapshot.prospection.openOpportunities} opp. (${formatMoney(snapshot.prospection.openPipelineMinor, currency)})`
              : "Selon vos droits d'accès"
          }
        />
        <StatCard
          label="Solde net (30j)"
          value={
            snapshot.finance
              ? formatMoney(snapshot.finance.net30dMinor, currency)
              : "Restreint"
          }
          hint={
            snapshot.finance
              ? `${snapshot.finance.unpaidCount} facture(s) à encaisser`
              : "Accès finances requis"
          }
          tone={snapshot.finance && snapshot.finance.unpaidCount > 0 ? "warning" : "success"}
        />
      </div>

      <AssistantConsole initialResponse={initialResponse} />
    </div>
  );
}
