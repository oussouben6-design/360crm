import type { Metadata } from "next";
import { Bot, CheckCircle2, Lock, Sparkles } from "lucide-react";
import { requirePagePermission } from "@/lib/server/context";
import {
  generateEmbeddedAiResponse,
  getAiConnectionStatus,
  loadAiOrganizationSnapshot,
  type AiQueryResponse,
} from "@/modules/ai/service";
import { PageHeader, StatCard } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    providerLabel: status.label,
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
        description={`Connecté en temps réel aux données autorisées de ${snapshot.organization.name}.`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="success">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="size-3.5" /> IA Connectée
              </span>
            </Badge>
            <Badge variant="primary">{status.model}</Badge>
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
              : "Accès selon votre rôle"
          }
          icon={<Sparkles className="size-4" />}
        />
        <StatCard
          label="Tâches à suivre"
          value={snapshot.tasks ? String(snapshot.tasks.inProgress + snapshot.tasks.todo) : "—"}
          hint={
            snapshot.tasks
              ? `${snapshot.tasks.overdue} en retard · ${snapshot.tasks.done} terminée(s)`
              : "Accès selon votre rôle"
          }
          tone={snapshot.tasks && snapshot.tasks.overdue > 0 ? "danger" : "default"}
        />
        <StatCard
          label="Clients & Pipeline"
          value={snapshot.crm ? `${snapshot.crm.customersTotal} client(s)` : "—"}
          hint={
            snapshot.prospection
              ? `${snapshot.prospection.openOpportunities} opp. (${formatMoney(snapshot.prospection.openPipelineMinor, currency)})`
              : "Accès selon votre rôle"
          }
        />
        <StatCard
          label="Solde net (30j)"
          value={
            snapshot.finance
              ? formatMoney(snapshot.finance.net30dMinor, currency)
              : "Protégé"
          }
          hint={
            snapshot.finance
              ? `${snapshot.finance.unpaidCount} facture(s) à encaisser`
              : "Permission finance:read requise"
          }
          tone={snapshot.finance && snapshot.finance.unpaidCount > 0 ? "warning" : "success"}
        />
      </div>

      <AssistantConsole initialResponse={initialResponse} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bot className="size-4 text-primary" /> État de la connexion IA & Sécurité des données
          </CardTitle>
          <CardDescription>
            Connecté au moteur <strong>{status.label}</strong> avec cloisonnement strict par
            organisation (Row Level Security).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 p-3">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
            <div>
              <p className="font-semibold text-foreground">Moteur d&apos;intelligence actif</p>
              <p className="mt-0.5">
                {status.externalConfigured
                  ? `Fournisseur externe actif (${status.provider.toUpperCase()} — modèle ${status.model}) couplé au moteur analytique Excellence 360 en secours automatique.`
                  : "Moteur analytique embarqué Excellence 360 actif sans coût externe. Vous pouvez également activer OpenAI, Groq, Gemini ou Claude via OPENAI_API_KEY, GROQ_API_KEY, GEMINI_API_KEY ou ANTHROPIC_API_KEY dans .env.production."}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 p-3">
            <Lock className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="font-semibold text-foreground">Respect strict des permissions</p>
              <p className="mt-0.5">
                L&apos;assistant interroge uniquement les modules autorisés par votre rôle (
                {snapshot.authorizedLabels.join(", ")}) et journalise chaque analyse dans le journal
                d&apos;audit.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
