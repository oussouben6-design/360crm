import { asMember } from "@/lib/db";
import { MODULE_LABELS, type ModuleKey } from "@/lib/permissions/catalog";
import { recordAudit } from "@/lib/server/audit";
import { can, type AppContext } from "@/lib/server/context";
import { formatDate, formatMoney } from "@/lib/utils";

export type AiProviderKind = "openai" | "groq" | "gemini" | "anthropic" | "embedded";

export type AiPresetKey = "summary" | "projects" | "crm" | "finance" | "draft";

export interface AiConnectionStatus {
  connected: true;
  provider: AiProviderKind;
  model: string;
  label: string;
  externalConfigured: boolean;
  endpoint: string | null;
}

export interface AiOrganizationSnapshot {
  organization: {
    id: string;
    name: string;
    currency: string;
    timezone: string;
    industry: string | null;
  };
  authorizedModules: ModuleKey[];
  authorizedLabels: string[];
  projects: {
    total: number;
    active: number;
    completed: number;
    topActive: { name: string; status: string; progress: number; endDate: string | null }[];
  } | null;
  tasks: {
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    overdue: number;
    overdueItems: { title: string; dueDate: string; priority: string; assignee: string | null }[];
    upcomingMilestones: { title: string; dueDate: string }[];
  } | null;
  crm: {
    customersTotal: number;
    customersNew30d: number;
    recentCustomers: { name: string; kind: string; status: string }[];
  } | null;
  prospection: {
    leadsTotal: number;
    leadsConverted: number;
    conversionRate: number;
    openOpportunities: number;
    openPipelineMinor: string;
    wonOpportunities30d: number;
    topOpportunities: { title: string; amountMinor: string; probability: number }[];
  } | null;
  finance: {
    revenue30dMinor: string;
    expense30dMinor: string;
    net30dMinor: string;
    unpaidCount: number;
    unpaidMinor: string;
    unpaidInvoices: {
      number: string;
      customerName: string | null;
      balanceMinor: string;
      dueDate: string | null;
      status: string;
    }[];
  } | null;
  hr: {
    activeEmployees: number;
    pendingLeaves: number;
    departmentsCount: number;
  } | null;
  partners: {
    activePartners: number;
  } | null;
  communication: {
    upcomingEventsCount: number;
    recentAnnouncements: { title: string; createdAt: string }[];
  } | null;
}

export interface AiQueryResponse {
  answer: string;
  provider: AiProviderKind;
  providerLabel: string;
  model: string;
  usedExternalLlm: boolean;
  authorizedLabels: string[];
  generatedAt: string;
  warning?: string | null;
}

/**
 * Détecte le moteur IA actif.
 * L'assistant IA est toujours connecté aux données autorisées de l'organisation :
 * - si une clé LLM externe (OpenAI, Groq, Gemini, Anthropic) est présente, elle est utilisée ;
 * - sinon (ou en cas d'indisponibilité réseau), le moteur analytique intégré Excellence 360 prend le relais.
 */
export function getAiConnectionStatus(
  env: Record<string, string | undefined> = process.env,
): AiConnectionStatus {
  const customModel = env.AI_MODEL?.trim() || env.OPENAI_MODEL?.trim();
  const customBaseUrl = (env.AI_BASE_URL?.trim() || env.OPENAI_BASE_URL?.trim() || "").replace(
    /\/$/,
    "",
  );

  if (env.OPENAI_API_KEY?.trim()) {
    const model = customModel || "gpt-4o-mini";
    const endpoint = `${customBaseUrl || "https://api.openai.com/v1"}/chat/completions`;
    return {
      connected: true,
      provider: "openai",
      model,
      label: `OpenAI (${model}) · Connecté aux données CRM`,
      externalConfigured: true,
      endpoint,
    };
  }

  if (env.GROQ_API_KEY?.trim()) {
    const model = customModel || "llama-3.3-70b-versatile";
    const endpoint = `${customBaseUrl || "https://api.groq.com/openai/v1"}/chat/completions`;
    return {
      connected: true,
      provider: "groq",
      model,
      label: `Groq (${model}) · Connecté aux données CRM`,
      externalConfigured: true,
      endpoint,
    };
  }

  if (env.GEMINI_API_KEY?.trim()) {
    const model = customModel || "gemini-2.0-flash";
    const endpoint =
      customBaseUrl ||
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    return {
      connected: true,
      provider: "gemini",
      model,
      label: `Google Gemini (${model}) · Connecté aux données CRM`,
      externalConfigured: true,
      endpoint,
    };
  }

  if (env.ANTHROPIC_API_KEY?.trim()) {
    const model = customModel || "claude-3-5-sonnet-latest";
    return {
      connected: true,
      provider: "anthropic",
      model,
      label: `Anthropic Claude (${model}) · Connecté aux données CRM`,
      externalConfigured: true,
      endpoint: "https://api.anthropic.com/v1/messages",
    };
  }

  return {
    connected: true,
    provider: "embedded",
    model: "excellence360-analytique-v1",
    label: "Moteur IA Analytique Excellence 360 · Connecté en direct",
    externalConfigured: false,
    endpoint: null,
  };
}

const READABLE_MODULES: ModuleKey[] = [
  "dashboard",
  "crm",
  "prospection",
  "projects",
  "tasks",
  "documents",
  "hr",
  "finance",
  "partners",
  "communication",
  "reports",
];

/**
 * Charge un instantané temps réel des données de l'organisation, strictement filtré
 * par les permissions de lecture de l'utilisateur et par la Row Level Security PostgreSQL.
 */
export async function loadAiOrganizationSnapshot(
  context: AppContext,
): Promise<AiOrganizationSnapshot> {
  const org = context.organization!;
  const authorizedModules = READABLE_MODULES.filter((mod) => can(context, mod, "read"));
  const authorizedLabels = authorizedModules.map((mod) => MODULE_LABELS[mod]);

  const canReadProjects = can(context, "projects", "read") || can(context, "dashboard", "read");
  const canReadTasks = can(context, "tasks", "read") || can(context, "dashboard", "read");
  const canReadCrm = can(context, "crm", "read") || can(context, "dashboard", "read");
  const canReadProspection =
    can(context, "prospection", "read") || can(context, "dashboard", "read");
  const canReadFinance = can(context, "finance", "read");
  const canReadHr = can(context, "hr", "read");
  const canReadPartners = can(context, "partners", "read");
  const canReadCommunication = can(context, "communication", "read");

  return asMember({ userId: context.user.id, organizationId: org.id }, async (tx) => {
    let projects: AiOrganizationSnapshot["projects"] = null;
    if (canReadProjects) {
      const counts = await tx.query<{ total: number; active: number; completed: number }>(
        `select
           count(*)::int as total,
           count(*) filter (where status = 'active')::int as active,
           count(*) filter (where status = 'completed')::int as completed
         from projects where organization_id = $1 and deleted_at is null`,
        [org.id],
      );
      const topActive = await tx.query<{
        name: string;
        status: string;
        progress: number;
        end_date: string | null;
      }>(
        `select name, status, coalesce(progress, 0)::int as progress, end_date::text as end_date
         from projects
         where organization_id = $1 and deleted_at is null and status in ('active', 'planned')
         order by updated_at desc limit 5`,
        [org.id],
      );
      projects = {
        total: counts[0]?.total ?? 0,
        active: counts[0]?.active ?? 0,
        completed: counts[0]?.completed ?? 0,
        topActive: topActive.map((row) => ({
          name: row.name,
          status: row.status,
          progress: row.progress,
          endDate: row.end_date,
        })),
      };
    }

    let tasks: AiOrganizationSnapshot["tasks"] = null;
    if (canReadTasks) {
      const counts = await tx.query<{
        total: number;
        todo: number;
        in_progress: number;
        done: number;
        overdue: number;
      }>(
        `select
           count(*)::int as total,
           count(*) filter (where status = 'todo')::int as todo,
           count(*) filter (where status = 'in_progress')::int as in_progress,
           count(*) filter (where status = 'done')::int as done,
           count(*) filter (where status <> 'done' and due_date is not null and due_date < current_date)::int as overdue
         from tasks where organization_id = $1 and deleted_at is null`,
        [org.id],
      );
      const overdueItems = await tx.query<{
        title: string;
        due_date: string;
        priority: string;
        assignee: string | null;
      }>(
        `select t.title, t.due_date::text as due_date, t.priority, p.full_name as assignee
         from tasks t
         left join profiles p on p.id = t.assignee_id
         where t.organization_id = $1 and t.deleted_at is null
           and t.status <> 'done' and t.due_date is not null and t.due_date < current_date
         order by t.due_date asc limit 5`,
        [org.id],
      );
      const upcomingMilestones = await tx.query<{ title: string; due_date: string }>(
        `select title, due_date::text as due_date
         from project_milestones
         where organization_id = $1 and completed_at is null
           and due_date is not null and due_date <= current_date + interval '30 days'
         order by due_date asc limit 5`,
        [org.id],
      );
      tasks = {
        total: counts[0]?.total ?? 0,
        todo: counts[0]?.todo ?? 0,
        inProgress: counts[0]?.in_progress ?? 0,
        done: counts[0]?.done ?? 0,
        overdue: counts[0]?.overdue ?? 0,
        overdueItems: overdueItems.map((row) => ({
          title: row.title,
          dueDate: row.due_date,
          priority: row.priority,
          assignee: row.assignee,
        })),
        upcomingMilestones: upcomingMilestones.map((row) => ({
          title: row.title,
          dueDate: row.due_date,
        })),
      };
    }

    let crm: AiOrganizationSnapshot["crm"] = null;
    if (canReadCrm) {
      const counts = await tx.query<{ total: number; new_30d: number }>(
        `select
           count(*)::int as total,
           count(*) filter (where created_at >= now() - interval '30 days')::int as new_30d
         from customers where organization_id = $1 and deleted_at is null`,
        [org.id],
      );
      const recentCustomers = await tx.query<{ name: string; kind: string; status: string }>(
        `select name, kind, status from customers
         where organization_id = $1 and deleted_at is null
         order by created_at desc limit 5`,
        [org.id],
      );
      crm = {
        customersTotal: counts[0]?.total ?? 0,
        customersNew30d: counts[0]?.new_30d ?? 0,
        recentCustomers,
      };
    }

    let prospection: AiOrganizationSnapshot["prospection"] = null;
    if (canReadProspection) {
      const leads = await tx.query<{ total: number; converted: number }>(
        `select
           count(*)::int as total,
           count(*) filter (where status = 'converted')::int as converted
         from leads where organization_id = $1 and deleted_at is null`,
        [org.id],
      );
      const opps = await tx.query<{
        open_count: number;
        open_amount: string;
        won_30d: number;
      }>(
        `select
           count(*) filter (where status = 'open')::int as open_count,
           coalesce(sum(amount_minor) filter (where status = 'open'), 0)::text as open_amount,
           count(*) filter (where status = 'won' and updated_at >= now() - interval '30 days')::int as won_30d
         from opportunities where organization_id = $1 and deleted_at is null`,
        [org.id],
      );
      const topOpportunities = await tx.query<{
        title: string;
        amount_minor: string;
        probability: number;
      }>(
        `select title, amount_minor::text as amount_minor, coalesce(probability, 0)::int as probability
         from opportunities
         where organization_id = $1 and deleted_at is null and status = 'open'
         order by amount_minor desc limit 5`,
        [org.id],
      );
      const totalLeads = leads[0]?.total ?? 0;
      const convertedLeads = leads[0]?.converted ?? 0;
      prospection = {
        leadsTotal: totalLeads,
        leadsConverted: convertedLeads,
        conversionRate: totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0,
        openOpportunities: opps[0]?.open_count ?? 0,
        openPipelineMinor: opps[0]?.open_amount ?? "0",
        wonOpportunities30d: opps[0]?.won_30d ?? 0,
        topOpportunities: topOpportunities.map((row) => ({
          title: row.title,
          amountMinor: row.amount_minor,
          probability: row.probability,
        })),
      };
    }

    let finance: AiOrganizationSnapshot["finance"] = null;
    if (canReadFinance) {
      const row = await tx.query<{
        revenue: string;
        expense: string;
        unpaid: string;
        unpaid_count: number;
      }>(
        `select
           coalesce((select sum(amount_minor) from revenues
                     where organization_id = $1 and deleted_at is null
                       and received_at >= current_date - interval '30 days'), 0)::text as revenue,
           coalesce((select sum(amount_minor) from expenses
                     where organization_id = $1 and deleted_at is null and status <> 'rejected'
                       and expense_date >= current_date - interval '30 days'), 0)::text as expense,
           coalesce((select sum(total_minor - amount_paid_minor) from invoices
                     where organization_id = $1 and deleted_at is null
                       and status in ('sent', 'partial', 'overdue')), 0)::text as unpaid,
           (select count(*)::int from invoices
            where organization_id = $1 and deleted_at is null
              and status in ('sent', 'partial', 'overdue')) as unpaid_count`,
        [org.id],
      );
      const unpaidInvoices = await tx.query<{
        number: string;
        customer_name: string | null;
        balance_minor: string;
        due_date: string | null;
        status: string;
      }>(
        `select i.number, c.name as customer_name,
                (i.total_minor - i.amount_paid_minor)::text as balance_minor,
                i.due_date::text as due_date, i.status
         from invoices i
         left join customers c on c.id = i.customer_id
         where i.organization_id = $1 and i.deleted_at is null
           and i.status in ('sent', 'partial', 'overdue')
         order by i.due_date asc nulls last limit 5`,
        [org.id],
      );
      const rev = row[0]?.revenue ?? "0";
      const exp = row[0]?.expense ?? "0";
      finance = {
        revenue30dMinor: rev,
        expense30dMinor: exp,
        net30dMinor: String(Number(rev) - Number(exp)),
        unpaidCount: row[0]?.unpaid_count ?? 0,
        unpaidMinor: row[0]?.unpaid ?? "0",
        unpaidInvoices: unpaidInvoices.map((inv) => ({
          number: inv.number,
          customerName: inv.customer_name,
          balanceMinor: inv.balance_minor,
          dueDate: inv.due_date,
          status: inv.status,
        })),
      };
    }

    let hr: AiOrganizationSnapshot["hr"] = null;
    if (canReadHr) {
      const counts = await tx.query<{
        employees: number;
        leaves: number;
        departments: number;
      }>(
        `select
           (select count(*)::int from employees where organization_id = $1 and deleted_at is null and status <> 'ended') as employees,
           (select count(*)::int from leave_requests where organization_id = $1 and status = 'pending') as leaves,
           (select count(*)::int from departments where organization_id = $1 and deleted_at is null) as departments`,
        [org.id],
      );
      hr = {
        activeEmployees: counts[0]?.employees ?? 0,
        pendingLeaves: counts[0]?.leaves ?? 0,
        departmentsCount: counts[0]?.departments ?? 0,
      };
    }

    let partners: AiOrganizationSnapshot["partners"] = null;
    if (canReadPartners) {
      const counts = await tx.query<{ count: number }>(
        `select count(*)::int as count from partners
         where organization_id = $1 and deleted_at is null and status = 'active'`,
        [org.id],
      );
      partners = { activePartners: counts[0]?.count ?? 0 };
    }

    let communication: AiOrganizationSnapshot["communication"] = null;
    if (canReadCommunication) {
      const events = await tx.query<{ count: number }>(
        `select count(*)::int as count from calendar_events
         where organization_id = $1 and deleted_at is null
           and starts_at >= now() - interval '1 day' and starts_at <= now() + interval '30 days'`,
        [org.id],
      );
      const announcements = await tx.query<{ title: string; created_at: string }>(
        `select title, created_at::text as created_at from announcements
         where organization_id = $1 and deleted_at is null
         order by created_at desc limit 3`,
        [org.id],
      );
      communication = {
        upcomingEventsCount: events[0]?.count ?? 0,
        recentAnnouncements: announcements.map((a) => ({
          title: a.title,
          createdAt: a.created_at,
        })),
      };
    }

    return {
      organization: {
        id: org.id,
        name: org.name,
        currency: org.currency,
        timezone: org.timezone,
        industry: org.industry,
      },
      authorizedModules,
      authorizedLabels,
      projects,
      tasks,
      crm,
      prospection,
      finance,
      hr,
      partners,
      communication,
    };
  });
}

function detectIntent(prompt: string, preset?: AiPresetKey): AiPresetKey {
  if (preset) return preset;
  const lower = prompt.toLowerCase();
  if (
    /factur|financ|trésor|tresor|recett|dépens|depens|impay|devis|paiement|budget|solde/.test(
      lower,
    )
  ) {
    return "finance";
  }
  if (/client|prospect|opportunit|pipeline|commercial|vente|conversion/.test(lower)) {
    return "crm";
  }
  if (/projet|tâche|tache|retard|jalon|équipe|equipe|charge|kanban/.test(lower)) {
    return "projects";
  }
  if (
    /rédig|redig|compte rendu|compte-rendu|courriel|email|e-mail|relance|lettre|message|réunion|reunion/.test(
      lower,
    )
  ) {
    return "draft";
  }
  return "summary";
}

/**
 * Génère une réponse structurée, fidèle aux données autorisées de l'organisation,
 * via le moteur analytique intégré Excellence 360.
 */
export function generateEmbeddedAiResponse(
  snapshot: AiOrganizationSnapshot,
  prompt: string,
  preset?: AiPresetKey,
): string {
  const intent = detectIntent(prompt, preset);
  const { organization, projects, tasks, crm, prospection, finance, hr, partners } = snapshot;
  const currency = organization.currency;

  const lines: string[] = [];

  if (intent === "projects") {
    lines.push(`### Analyse des projets et des tâches — ${organization.name}`);
    if (!projects && !tasks) {
      lines.push(
        "Votre rôle actuel ne dispose pas des droits de lecture sur les modules Projets et Tâches.",
      );
      return lines.join("\n\n");
    }
    if (projects) {
      lines.push(
        `- **Portefeuille projets** : **${projects.active}** actif(s) sur **${projects.total}** au total (**${projects.completed}** terminé(s)).`,
      );
      if (projects.topActive.length > 0) {
        lines.push(
          `- **Projets principaux en cours** : ${projects.topActive
            .map(
              (p) =>
                `${p.name} (${p.progress}%${p.endDate ? `, échéance ${formatDate(p.endDate)}` : ""})`,
            )
            .join(" · ")}.`,
        );
      }
    }
    if (tasks) {
      const completionRate =
        tasks.total > 0 ? Math.round((tasks.done / tasks.total) * 100) : 0;
      lines.push(
        `- **Avancement des tâches** : **${tasks.done}/${tasks.total}** terminées (**${completionRate}%**), **${tasks.inProgress}** en cours, **${tasks.todo}** à faire, et **${tasks.overdue}** en retard.`,
      );
      if (tasks.overdueItems.length > 0) {
        lines.push("#### Priorités immédiates (tâches en retard)");
        for (const item of tasks.overdueItems) {
          lines.push(
            `- **${item.title}** — échéance ${formatDate(item.dueDate)} (${item.assignee ?? "Non assignée"}, priorité ${item.priority})`,
          );
        }
      } else {
        lines.push("- **Aucune tâche en retard** : le calendrier opérationnel est à jour.");
      }
      if (tasks.upcomingMilestones.length > 0) {
        lines.push(
          `- **Jalons des 30 prochains jours** : ${tasks.upcomingMilestones
            .map((m) => `${m.title} (${formatDate(m.dueDate)})`)
            .join(", ")}.`,
        );
      }
    }
    lines.push(
      "#### Recommandation IA\nConcentrez le point d'équipe hebdomadaire sur les tâches arrivées à échéance et réaffectez les tâches non assignées avant l'ouverture de nouveaux lots.",
    );
    return lines.join("\n\n");
  }

  if (intent === "crm") {
    lines.push(`### Analyse commerciale & Pipeline — ${organization.name}`);
    if (!crm && !prospection) {
      lines.push(
        "Votre rôle actuel ne dispose pas des droits de lecture sur les modules Clients (CRM) et Prospection.",
      );
      return lines.join("\n\n");
    }
    if (crm) {
      lines.push(
        `- **Base clients** : **${crm.customersTotal}** client(s) actif(s), dont **${crm.customersNew30d}** nouveau(x) sur les 30 derniers jours.`,
      );
      if (crm.recentCustomers.length > 0) {
        lines.push(
          `- **Derniers comptes enregistrés** : ${crm.recentCustomers.map((c) => c.name).join(", ")}.`,
        );
      }
    }
    if (prospection) {
      lines.push(
        `- **Prospection** : **${prospection.leadsTotal}** prospect(s), **${prospection.leadsConverted}** converti(s) (taux de conversion : **${prospection.conversionRate}%**).`,
      );
      lines.push(
        `- **Pipeline d'opportunités ouvertes** : **${prospection.openOpportunities}** opportunité(s) pour un volume cumulé de **${formatMoney(prospection.openPipelineMinor, currency)}** (**${prospection.wonOpportunities30d}** gagnée(s) sur 30 jours).`,
      );
      if (prospection.topOpportunities.length > 0) {
        lines.push("#### Opportunités prioritaires à relancer");
        for (const opp of prospection.topOpportunities) {
          lines.push(
            `- **${opp.title}** : **${formatMoney(opp.amountMinor, currency)}** (probabilité ${opp.probability}%)`,
          );
        }
      }
    }
    lines.push(
      "#### Recommandation IA\nPriorisez la relance des opportunités ayant une probabilité ≥ 50 % et planifiez un suivi systématique sous 48 h pour les nouveaux prospects.",
    );
    return lines.join("\n\n");
  }

  if (intent === "finance") {
    lines.push(`### Synthèse financière & Facturation — ${organization.name}`);
    if (!finance) {
      lines.push(
        "L'accès aux données financières requiert la permission **Finances : Lire (`finance:read`)**. Vos données financières restent protégées.",
      );
      return lines.join("\n\n");
    }
    lines.push(
      `- **Recettes (30 derniers jours)** : **${formatMoney(finance.revenue30dMinor, currency)}**\n` +
        `- **Dépenses (30 derniers jours)** : **${formatMoney(finance.expense30dMinor, currency)}**\n` +
        `- **Solde net sur 30 jours** : **${formatMoney(finance.net30dMinor, currency)}**\n` +
        `- **Encours clients à recouvrer** : **${finance.unpaidCount}** facture(s) en attente ou en retard pour **${formatMoney(finance.unpaidMinor, currency)}**`,
    );
    if (finance.unpaidInvoices.length > 0) {
      lines.push("#### Factures en attente de règlement");
      for (const inv of finance.unpaidInvoices) {
        lines.push(
          `- **Facture ${inv.number}** (${inv.customerName ?? "Client"}) : **${formatMoney(inv.balanceMinor, currency)}** — échéance ${formatDate(inv.dueDate)} (${inv.status === "overdue" ? "en retard" : "envoyée"})`,
        );
      }
    }
    lines.push(
      "#### Recommandation IA\nProgrammez une relance prioritaire sur les factures échues afin de sécuriser la trésorerie court terme avant validation des prochaines dépenses.",
    );
    return lines.join("\n\n");
  }

  if (intent === "draft") {
    const today = formatDate(new Date());
    lines.push(`### Proposition de compte rendu de pilotage — ${organization.name}`);
    lines.push(
      `**Date :** ${today}\n**Objet :** Point d'activité et priorités opérationnelles — ${organization.name}`,
    );
    const bullets: string[] = [];
    if (projects) {
      bullets.push(
        `- **Projets :** ${projects.active} projet(s) actif(s) et ${projects.completed} terminé(s) sur un portefeuille de ${projects.total}.`,
      );
    }
    if (tasks) {
      bullets.push(
        `- **Exécution :** ${tasks.done} tâche(s) terminée(s), ${tasks.inProgress} en cours, ${tasks.overdue} en retard à traiter en priorité.`,
      );
    }
    if (crm || prospection) {
      bullets.push(
        `- **Activité commerciale :** ${crm?.customersTotal ?? 0} client(s) actif(s) ; ${prospection?.openOpportunities ?? 0} opportunité(s) ouverte(s) (${formatMoney(prospection?.openPipelineMinor ?? "0", currency)}).`,
      );
    }
    if (finance) {
      bullets.push(
        `- **Situation financière (30j) :** Recettes de ${formatMoney(finance.revenue30dMinor, currency)}, dépenses de ${formatMoney(finance.expense30dMinor, currency)} (solde net : ${formatMoney(finance.net30dMinor, currency)}). Encours à recouvrer : ${formatMoney(finance.unpaidMinor, currency)} (${finance.unpaidCount} facture(s)).`,
      );
    }
    if (bullets.length > 0) {
      lines.push("#### 1. Indicateurs clés\n" + bullets.join("\n"));
    }
    lines.push(
      "#### 2. Décisions et prochaines étapes\n" +
        "1. Clôturer ou rééchelonner les tâches en retard identifiées cette semaine.\n" +
        "2. Relancer les opportunités commerciales ouvertes et les factures arrivées à échéance.\n" +
        "3. Mettre à jour l'avancement des projets actifs avant le prochain comité.",
    );
    return lines.join("\n\n");
  }

  // Synthèse exécutive globale (par défaut)
  lines.push(`### Synthèse exécutive IA — ${organization.name}`);
  lines.push(
    `Analyse générée en direct à partir de vos modules autorisés (${snapshot.authorizedLabels.join(", ")}).`,
  );

  const kpis: string[] = [];
  if (projects) {
    kpis.push(
      `- **Projets** : **${projects.active}** actif(s) / **${projects.total}** total (**${projects.completed}** terminé(s))`,
    );
  }
  if (tasks) {
    kpis.push(
      `- **Tâches** : **${tasks.inProgress}** en cours, **${tasks.todo}** à faire, **${tasks.done}** terminée(s), **${tasks.overdue}** en retard`,
    );
  }
  if (crm) {
    kpis.push(
      `- **Clients (CRM)** : **${crm.customersTotal}** client(s) (**+${crm.customersNew30d}** sur 30 jours)`,
    );
  }
  if (prospection) {
    kpis.push(
      `- **Prospection** : **${prospection.openOpportunities}** opportunité(s) ouverte(s) (**${formatMoney(prospection.openPipelineMinor, currency)}**), conversion prospects **${prospection.conversionRate}%**`,
    );
  }
  if (finance) {
    kpis.push(
      `- **Finances (30j)** : solde net de **${formatMoney(finance.net30dMinor, currency)}** (recettes **${formatMoney(finance.revenue30dMinor, currency)}**, dépenses **${formatMoney(finance.expense30dMinor, currency)}**) · **${finance.unpaidCount}** facture(s) à encaisser (**${formatMoney(finance.unpaidMinor, currency)}**)`,
    );
  }
  if (hr) {
    kpis.push(
      `- **Ressources humaines** : **${hr.activeEmployees}** collaborateur(s) actif(s), **${hr.departmentsCount}** département(s), **${hr.pendingLeaves}** demande(s) de congé en attente`,
    );
  }
  if (partners) {
    kpis.push(`- **Partenaires** : **${partners.activePartners}** partenaire(s) actif(s)`);
  }

  if (kpis.length > 0) {
    lines.push("#### Vue d'ensemble temps réel\n" + kpis.join("\n"));
  }

  const alerts: string[] = [];
  if (tasks && tasks.overdue > 0) {
    alerts.push(
      `- **${tasks.overdue} tâche(s) en retard** nécessite(nt) un arbitrage immédiat (${tasks.overdueItems.map((t) => t.title).join(", ")}).`,
    );
  }
  if (finance && finance.unpaidCount > 0) {
    alerts.push(
      `- **${finance.unpaidCount} facture(s) en attente de règlement** pour un total de **${formatMoney(finance.unpaidMinor, currency)}**.`,
    );
  }
  if (hr && hr.pendingLeaves > 0) {
    alerts.push(`- **${hr.pendingLeaves} demande(s) de congé** en attente de validation RH.`);
  }
  if (alerts.length === 0) {
    alerts.push("- Aucun point de blocage critique détecté sur votre périmètre autorisé.");
  }
  lines.push("#### Points d'attention & Priorités\n" + alerts.join("\n"));

  return lines.join("\n\n");
}

async function callExternalLlm(
  status: AiConnectionStatus,
  snapshot: AiOrganizationSnapshot,
  prompt: string,
  env: Record<string, string | undefined> = process.env,
): Promise<string> {
  const systemPrompt = [
    `Tu es l'Assistant IA officiel d'Excellence 360 CRM pour l'organisation « ${snapshot.organization.name} » (devise : ${snapshot.organization.currency}).`,
    "Réponds toujours en français, de manière claire, professionnelle, structurée (titres ###, listes à puces, chiffres clés en gras) et directement actionnable.",
    "RÈGLE DE SÉCURITÉ ABSOLUE : appuie-toi UNIQUEMENT sur les données JSON autorisées ci-dessous. N'invente aucun chiffre ni aucun client.",
    `Modules autorisés pour cet utilisateur : ${snapshot.authorizedLabels.join(", ")}.`,
    `Données temps réel de l'organisation :\n${JSON.stringify(snapshot, null, 2)}`,
  ].join("\n\n");

  if (status.provider === "anthropic") {
    const apiKey = env.ANTHROPIC_API_KEY?.trim() ?? "";
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: status.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      throw new Error(`Anthropic HTTP ${response.status}`);
    }
    const data = (await response.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text = data.content?.find((c) => c.type === "text")?.text?.trim();
    if (!text) throw new Error("Réponse Anthropic vide.");
    return text;
  }

  const apiKey =
    status.provider === "openai"
      ? env.OPENAI_API_KEY?.trim()
      : status.provider === "groq"
        ? env.GROQ_API_KEY?.trim()
        : env.GEMINI_API_KEY?.trim();

  const response = await fetch(status.endpoint!, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey ?? ""}`,
    },
    body: JSON.stringify({
      model: status.model,
      temperature: 0.2,
      max_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`${status.provider} HTTP ${response.status}`);
  }
  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error(`Réponse ${status.provider} vide.`);
  return text;
}

export async function runAiAssistantQuery(
  context: AppContext,
  input: { prompt: string; preset?: AiPresetKey },
): Promise<AiQueryResponse> {
  const snapshot = await loadAiOrganizationSnapshot(context);
  const status = getAiConnectionStatus();
  const cleanPrompt = input.prompt.trim();

  let answer: string;
  let usedExternalLlm = false;
  let warning: string | null = null;
  let activeProvider = status.provider;
  let activeLabel = status.label;
  let activeModel = status.model;

  if (status.externalConfigured) {
    try {
      answer = await callExternalLlm(status, snapshot, cleanPrompt);
      usedExternalLlm = true;
    } catch (error) {
      answer = generateEmbeddedAiResponse(snapshot, cleanPrompt, input.preset);
      activeProvider = "embedded";
      activeModel = "excellence360-analytique-v1";
      activeLabel = "Moteur IA Analytique Excellence 360 (relais automatique)";
      warning = `Le fournisseur externe (${status.provider}) n'a pas répondu (${(error as Error).message}) : réponse générée par le moteur analytique intégré Excellence 360.`;
    }
  } else {
    answer = generateEmbeddedAiResponse(snapshot, cleanPrompt, input.preset);
  }

  await asMember(
    { userId: context.user.id, organizationId: context.organization!.id },
    async (tx) => {
      await recordAudit(tx, {
        organizationId: context.organization!.id,
        actorId: context.user.id,
        actorEmail: context.user.email,
        action: "ai.query",
        entityType: "organization",
        entityId: context.organization!.id,
        summary: `Analyse Assistant IA (${input.preset ?? "question libre"})`,
        metadata: {
          provider: activeProvider,
          model: activeModel,
          preset: input.preset ?? null,
        },
      });
    },
  );

  return {
    answer,
    provider: activeProvider,
    providerLabel: activeLabel,
    model: activeModel,
    usedExternalLlm,
    authorizedLabels: snapshot.authorizedLabels,
    generatedAt: new Date().toISOString(),
    warning,
  };
}
