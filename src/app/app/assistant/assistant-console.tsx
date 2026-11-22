"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  Bot,
  Briefcase,
  Check,
  Copy,
  FileText,
  FolderKanban,
  Send,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { askAiAssistantAction } from "@/modules/ai/actions";
import type { AiPresetKey, AiQueryResponse } from "@/modules/ai/service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/utils";

const PRESETS: {
  key: AiPresetKey;
  label: string;
  prompt: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    key: "summary",
    label: "Synthèse exécutive",
    prompt: "Dresse la synthèse exécutive complète de notre organisation et les priorités de la semaine.",
    icon: Sparkles,
  },
  {
    key: "projects",
    label: "Projets & tâches en retard",
    prompt: "Analyse l'avancement des projets actifs, les tâches en retard et les prochains jalons.",
    icon: FolderKanban,
  },
  {
    key: "crm",
    label: "Clients & pipeline commercial",
    prompt: "Analyse notre portefeuille clients, le taux de conversion prospects et les opportunités ouvertes.",
    icon: TrendingUp,
  },
  {
    key: "finance",
    label: "Finances & factures à encaisser",
    prompt: "Analyse les recettes, dépenses, le solde net sur 30 jours et les factures impayées à relancer.",
    icon: Wallet,
  },
  {
    key: "draft",
    label: "Rédiger un compte rendu",
    prompt: "Rédige un compte rendu structuré de réunion de pilotage avec nos indicateurs actuels et les prochaines étapes.",
    icon: FileText,
  },
];

export interface AssistantConsoleProps {
  initialResponse: AiQueryResponse;
}

export function AssistantConsole({ initialResponse }: AssistantConsoleProps) {
  const [state, formAction, pending] = useActionState(askAiAssistantAction, null);
  const [prompt, setPrompt] = React.useState("");
  const [selectedPreset, setSelectedPreset] = React.useState<AiPresetKey | "">("");
  const [copied, setCopied] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  const currentResponse = state?.ok && state.data ? state.data : initialResponse;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentResponse.answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers indisponible
    }
  };

  const triggerPreset = (preset: (typeof PRESETS)[number]) => {
    setPrompt(preset.prompt);
    setSelectedPreset(preset.key);
    requestAnimationFrame(() => {
      formRef.current?.requestSubmit();
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="size-4 text-primary" /> Analyses rapides & Questions
          </CardTitle>
          <CardDescription>
            Interrogez l&apos;assistant IA en langage naturel ou lancez une analyse en un clic sur
            vos données autorisées.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Actions rapides en un clic
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    disabled={pending}
                    onClick={() => triggerPreset(preset)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50"
                  >
                    <Icon className="size-3.5 text-primary" />
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          <form
            ref={formRef}
            action={formAction}
            onSubmit={() => {
              // Réinitialise le preset si l'utilisateur soumet manuellement après modification
            }}
            className="space-y-3"
          >
            <input type="hidden" name="preset" value={selectedPreset} />
            <div className="space-y-1.5">
              <label htmlFor="ai-prompt" className="text-xs font-medium text-foreground">
                Votre question ou instruction à l&apos;Assistant IA
              </label>
              <Textarea
                id="ai-prompt"
                name="prompt"
                rows={4}
                required
                value={prompt}
                onChange={(event) => {
                  setPrompt(event.target.value);
                  setSelectedPreset("");
                }}
                placeholder="Ex. : Quelles sont les tâches en retard cette semaine ? Rédige un courriel de relance pour nos factures en attente…"
              />
            </div>

            {state && !state.ok ? (
              <Alert variant="danger" title="Impossible d'exécuter l'analyse">
                {state.message}
              </Alert>
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-muted-foreground">
                Sécurité RLS active · Seuls vos modules autorisés sont consultés.
              </p>
              <Button type="submit" loading={pending}>
                <Send className="size-4" />
                Analyser avec l&apos;IA
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Bot className="size-4 text-primary" /> Réponse de l&apos;Assistant IA
              </CardTitle>
              <CardDescription>
                Moteur actif : <span className="font-medium text-foreground">{currentResponse.providerLabel}</span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success">Connecté</Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? "Copié" : "Copier"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentResponse.warning ? (
            <Alert variant="warning" title="Relais automatique activé">
              {currentResponse.warning}
            </Alert>
          ) : null}

          <div className="rounded-xl border border-border bg-muted/25 p-4 text-sm leading-relaxed whitespace-pre-wrap">
            {currentResponse.answer}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span>
              Périmètre analysé : {currentResponse.authorizedLabels.join(", ")}
            </span>
            <span>Généré le {formatDateTime(currentResponse.generatedAt)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
