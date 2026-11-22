import { describe, expect, it } from "vitest";
import {
  generateEmbeddedAiResponse,
  getAiConnectionStatus,
  type AiOrganizationSnapshot,
} from "@/modules/ai/service";

const SAMPLE_SNAPSHOT: AiOrganizationSnapshot = {
  organization: {
    id: "80cac969-cad2-47f8-b0d7-b90138a64905",
    name: "Excellence Services SARL",
    currency: "XOF",
    timezone: "Africa/Niamey",
    industry: "Services & Conseil",
  },
  authorizedModules: ["dashboard", "crm", "prospection", "projects", "tasks", "finance"],
  authorizedLabels: [
    "Tableau de bord",
    "Clients (CRM)",
    "Prospection",
    "Projets",
    "Tâches",
    "Finances",
  ],
  projects: {
    total: 4,
    active: 3,
    completed: 1,
    topActive: [
      { name: "Déploiement CRM Niamey", status: "active", progress: 75, endDate: "2026-12-15" },
    ],
  },
  tasks: {
    total: 12,
    todo: 4,
    inProgress: 3,
    done: 4,
    overdue: 1,
    overdueItems: [
      {
        title: "Valider le cahier des charges client",
        dueDate: "2026-11-10",
        priority: "high",
        assignee: "Issouf",
      },
    ],
    upcomingMilestones: [{ title: "Mise en production LWS", dueDate: "2026-11-25" }],
  },
  crm: {
    customersTotal: 18,
    customersNew30d: 4,
    recentCustomers: [{ name: "SONITEL", kind: "company", status: "active" }],
  },
  prospection: {
    leadsTotal: 10,
    leadsConverted: 4,
    conversionRate: 40,
    openOpportunities: 3,
    openPipelineMinor: "4500000",
    wonOpportunities30d: 2,
    topOpportunities: [
      { title: "Contrat annuel maintenance", amountMinor: "2500000", probability: 80 },
    ],
  },
  finance: {
    revenue30dMinor: "6200000",
    expense30dMinor: "1800000",
    net30dMinor: "4400000",
    unpaidCount: 2,
    unpaidMinor: "1250000",
    unpaidInvoices: [
      {
        number: "FAC-2026-014",
        customerName: "SONITEL",
        balanceMinor: "750000",
        dueDate: "2026-11-05",
        status: "overdue",
      },
    ],
  },
  hr: {
    activeEmployees: 9,
    pendingLeaves: 1,
    departmentsCount: 3,
  },
  partners: {
    activePartners: 5,
  },
  communication: {
    upcomingEventsCount: 2,
    recentAnnouncements: [],
  },
};

describe("Module Assistant IA connecté", () => {
  it("est toujours connecté (moteur analytique intégré par défaut)", () => {
    const status = getAiConnectionStatus({});
    expect(status.connected).toBe(true);
    expect(status.provider).toBe("embedded");
    expect(status.externalConfigured).toBe(false);
  });

  it("détecte automatiquement OpenAI, Groq, Gemini ou Anthropic", () => {
    expect(getAiConnectionStatus({ OPENAI_API_KEY: "sk-test" }).provider).toBe("openai");
    expect(getAiConnectionStatus({ GROQ_API_KEY: "gsk-test" }).provider).toBe("groq");
    expect(getAiConnectionStatus({ GEMINI_API_KEY: "AIza-test" }).provider).toBe("gemini");
    expect(getAiConnectionStatus({ ANTHROPIC_API_KEY: "sk-ant-test" }).provider).toBe(
      "anthropic",
    );
  });

  it("génère une synthèse exécutive fidèle aux données de l'organisation", () => {
    const text = generateEmbeddedAiResponse(
      SAMPLE_SNAPSHOT,
      "Synthèse exécutive",
      "summary",
    );
    expect(text).toContain("Excellence Services SARL");
    expect(text).toContain("18");
    expect(text).toContain("Valider le cahier des charges client");
  });

  it("protège les données financières si l'utilisateur n'a pas finance:read", () => {
    const restrictedSnapshot: AiOrganizationSnapshot = {
      ...SAMPLE_SNAPSHOT,
      finance: null,
    };
    const text = generateEmbeddedAiResponse(
      restrictedSnapshot,
      "Quelle est notre situation financière et nos factures ?",
      "finance",
    );
    expect(text).toContain("finance:read");
    expect(text).not.toContain("FAC-2026-014");
  });
});
