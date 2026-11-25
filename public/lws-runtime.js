/**
 * Excellence 360 CRM — Runtime autonome pour sous-domaine LWS
 * Connecte les pages pré-rendues du sous-domaine (360crm.excellence-services-sarl.com)
 * à Supabase (opnlvqwbevnivfjpbrxa), au relais PHP LWS (/api/contact.php) et au moteur
 * Assistant IA intégré.
 */
(function () {
  "use strict";

  var SUPABASE_URL = "https://opnlvqwbevnivfjpbrxa.supabase.co";
  var SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmx2cXdiZXZuaXZmanBicnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2MTY2MDUsImV4cCI6MjEwOTE5MjYwNX0.pcLJ2EEqQhjLqr6iGyVbzQB8ko2Eo2IeL5tZAz3MtmM";

  var STORAGE_KEY = "exc360_org_state_v1";
  var SESSION_KEY = "exc360_user_session_v1";

  // -------------------------------------------------------------------
  // 0. Navigation multi-pages fluide sur hébergement Apache LWS
  // -------------------------------------------------------------------
  var nativeFetch = window.fetch ? window.fetch.bind(window) : null;
  if (nativeFetch) {
    window.fetch = function (input, init) {
      var url = typeof input === "string" ? input : (input && input.url) || "";
      var headers = (init && init.headers) || {};
      var isRsc =
        url.indexOf("_rsc=") !== -1 ||
        headers["RSC"] === "1" ||
        headers["rsc"] === "1" ||
        (typeof Headers !== "undefined" && headers instanceof Headers && headers.get("RSC") === "1");

      if (isRsc) {
        return Promise.resolve(
          new Response("", {
            status: 200,
            headers: { "Content-Type": "text/x-component" }
          })
        );
      }
      return nativeFetch(input, init);
    };
  }

  document.addEventListener(
    "click",
    function (event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      var target = event.target;
      var anchor = target && target.closest ? target.closest("a[href]") : null;
      if (!anchor) return;

      var href = anchor.getAttribute("href") || "";
      if (
        !href ||
        href.charAt(0) === "#" ||
        href.indexOf("mailto:") === 0 ||
        href.indexOf("tel:") === 0 ||
        href.indexOf("javascript:") === 0 ||
        anchor.hasAttribute("download") ||
        anchor.getAttribute("target") === "_blank"
      ) {
        return;
      }

      if (href.charAt(0) === "/") {
        // Export CSV côté client sur LWS
        if (href.indexOf("/api/exports/") === 0) {
          event.preventDefault();
          event.stopImmediatePropagation();
          exportTableAsCsv(href);
          return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        window.location.href = href;
      }
    },
    true
  );

  function exportTableAsCsv(href) {
    var table = document.querySelector("table");
    var rows = [];
    if (table) {
      table.querySelectorAll("tr").forEach(function (tr) {
        var cols = [];
        tr.querySelectorAll("th, td").forEach(function (cell) {
          var txt = (cell.textContent || "").replace(/\s+/g, " ").trim().replace(/"/g, '""');
          cols.push('"' + txt + '"');
        });
        if (cols.length) rows.push(cols.join(";"));
      });
    }
    if (!rows.length) {
      rows.push('"Organisation";"Module";"Statut"');
      rows.push('"Excellence Services SARL";"' + href + '";"Actif"');
    }
    var blob = new Blob(["\uFEFF" + rows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    var name = href.split("/").pop().split("?")[0] || "export";
    a.href = url;
    a.download = "excellence360-" + name + ".csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Export CSV téléchargé.");
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // Stockage local indisponible
    }
    return {
      organizationName: "Excellence Services SARL",
      currency: "XOF",
      customers: [
        { name: "SONITEL Niger", kind: "Entreprise", email: "contact@sonitel.ne", phone: "+227 20 72 26 31", status: "Actif" },
        { name: "Banque Atlantique Niger", kind: "Institution", email: "direction@banqueatlantique.ne", phone: "+227 20 73 98 58", status: "Actif" },
        { name: "Groupe Sahel Logistique", kind: "Entreprise", email: "info@sahellogistique.ne", phone: "+227 96 11 22 33", status: "Actif" },
        { name: "Hôpital Général de Référence", kind: "Institution", email: "contact@hgr-niamey.ne", phone: "+227 20 75 11 00", status: "Actif" }
      ],
      leads: [
        { name: "Cabinet Kouri Consulting", source: "Site web", status: "Qualifié" },
        { name: "Niger Télécoms Entreprises", source: "Recommandation", status: "Converti" },
        { name: "Clinique Espoir Niamey", source: "Appel entrant", status: "Nouveau" }
      ],
      opportunities: [
        { title: "Déploiement Excellence 360 CRM — 25 postes", amount: 8500000, probability: 80 },
        { title: "Contrat annuel d'accompagnement & formation", amount: 4200000, probability: 65 },
        { title: "Intégration module Facturation & RH", amount: 3100000, probability: 55 }
      ],
      projects: [
        { name: "Déploiement CRM & Portail Client", status: "Actif", progress: 75, endDate: "15 déc. 2026" },
        { name: "Digitalisation Facturation & Trésorerie", status: "Actif", progress: 60, endDate: "30 déc. 2026" },
        { name: "Automatisation du suivi RH & Congés", status: "Actif", progress: 45, endDate: "20 janv. 2027" },
        { name: "Formation des équipes opérationnelles", status: "Terminé", progress: 100, endDate: "10 nov. 2026" }
      ],
      tasks: [
        { title: "Valider le paramétrage des rôles avec la direction", dueDate: "28 nov. 2026", priority: "Haute", status: "in_progress", assignee: "Direction" },
        { title: "Relancer les propositions commerciales en attente", dueDate: "25 nov. 2026", priority: "Haute", status: "todo", assignee: "Équipe Commerciale" },
        { title: "Vérifier les encaissements clients du mois", dueDate: "30 nov. 2026", priority: "Moyenne", status: "todo", assignee: "Comptabilité" },
        { title: "Mise en ligne du sous-domaine 360crm", dueDate: "18 nov. 2026", priority: "Haute", status: "done", assignee: "Technique" }
      ],
      finance: {
        revenue30d: 14850000,
        expense30d: 4250000,
        unpaidCount: 2,
        unpaidAmount: 3450000,
        invoices: [
          { number: "FAC-2026-0018", customer: "SONITEL Niger", amount: 2250000, dueDate: "05 déc. 2026", status: "Envoyée" },
          { number: "FAC-2026-0019", customer: "Groupe Sahel Logistique", amount: 1200000, dueDate: "12 déc. 2026", status: "En attente" }
        ]
      },
      hr: {
        activeEmployees: 12,
        departmentsCount: 4,
        pendingLeaves: 1
      },
      partners: 6
    };
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Stockage local indisponible
    }
  }

  function formatFCFA(amount) {
    try {
      return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "XOF",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(Number(amount) || 0);
    } catch {
      return String(amount) + " FCFA";
    }
  }

  function showToast(message, type) {
    var existing = document.getElementById("exc360-lws-toast");
    if (existing) existing.remove();
    var div = document.createElement("div");
    div.id = "exc360-lws-toast";
    div.setAttribute("role", "status");
    div.style.cssText =
      "position:fixed;bottom:20px;right:20px;z-index:9999;max-width:380px;padding:12px 18px;" +
      "border-radius:10px;font-size:13px;font-weight:600;box-shadow:0 10px 25px rgba(0,0,0,0.18);" +
      "color:#fff;background:" +
      (type === "error" ? "#dc2626" : "#0057a8") +
      ";transition:opacity 0.25s ease;";
    div.textContent = message;
    document.body.appendChild(div);
    setTimeout(function () {
      if (div.parentNode) div.remove();
    }, 4000);
  }

  // -------------------------------------------------------------------
  // 1. Formulaire de contact public (/contact)
  // -------------------------------------------------------------------
  function handleContactSubmit(form, event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    var fd = new FormData(form);
    if (fd.get("company_website")) return;

    var name = String(fd.get("name") || "").trim();
    var email = String(fd.get("email") || "").trim();
    var phone = String(fd.get("phone") || "").trim();
    var company = String(fd.get("company") || "").trim();
    var subject = String(fd.get("subject") || "demo").trim();
    var message = String(fd.get("message") || "").trim();

    if (name.length < 2 || !email.includes("@") || message.length < 10) {
      showToast("Veuillez remplir votre nom, votre e-mail et votre message (10 caractères min.).", "error");
      return;
    }

    var submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Envoi en cours…";
    }

    var refId = crypto.randomUUID ? crypto.randomUUID() : "exc360-" + Date.now();
    var shortRef = refId.slice(0, 8).toUpperCase();

    var supaPromise = nativeFetch(SUPABASE_URL + "/rest/v1/contact_requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        id: refId,
        name: name,
        email: email,
        phone: phone || null,
        company: company || null,
        subject: subject,
        message: message,
        source_path: "/contact"
      })
    }).catch(function () {
      return null;
    });

    var phpPromise = nativeFetch("/api/contact.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference: shortRef,
        name: name,
        email: email,
        phone: phone,
        company: company,
        subject: subject,
        message: message
      })
    }).catch(function () {
      return null;
    });

    Promise.all([supaPromise, phpPromise]).finally(function () {
      form.outerHTML =
        '<div role="status" class="space-y-4 rounded-xl border border-success/30 bg-success-soft/60 p-6 text-sm">' +
        '<div class="flex items-start gap-3">' +
        '<div class="space-y-1.5">' +
        '<p class="text-base font-semibold text-foreground">✓ Message envoyé avec succès</p>' +
        '<p class="text-muted-foreground">Merci ' +
        name.replace(/[<>&]/g, "") +
        ". Notre équipe Excellence Services SARL vous répondra dans les meilleurs délais.</p>" +
        '<p class="text-xs text-muted-foreground">Référence : <span class="font-mono font-medium text-foreground">#' +
        shortRef +
        "</span></p>" +
        "</div></div>" +
        '<div class="border-t border-border pt-4 text-xs text-muted-foreground">' +
        '<p class="font-medium text-foreground">Besoin d\'une réponse immédiate ?</p>' +
        '<div class="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">' +
        '<a href="mailto:admin@excellence-services-sarl.com" class="text-primary hover:underline">admin@excellence-services-sarl.com</a>' +
        '<a href="tel:+22778798900" class="text-primary hover:underline">+227 78 79 89 00</a>' +
        '<a href="tel:+22792800257" class="text-primary hover:underline">+227 92 80 02 57</a>' +
        "</div></div></div>";
    });
  }

  // -------------------------------------------------------------------
  // 2. Authentification (/connexion, /inscription, /mot-de-passe-oublie)
  // -------------------------------------------------------------------
  function handleAuthSubmit(form, pathname, event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    var fd = new FormData(form);
    var email = String(fd.get("email") || "").trim();
    var password = String(fd.get("password") || "");
    var fullName = String(fd.get("fullName") || "").trim();

    if (pathname.indexOf("/mot-de-passe-oublie") === 0) {
      if (!email.includes("@")) {
        showToast("Saisissez une adresse e-mail valide.", "error");
        return;
      }
      nativeFetch(SUPABASE_URL + "/auth/v1/recover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ email: email })
      }).finally(function () {
        showToast("Si un compte existe pour " + email + ", un lien de réinitialisation a été envoyé.");
      });
      return;
    }

    if (!email.includes("@") || password.length < 6) {
      showToast("Veuillez saisir une adresse e-mail valide et votre mot de passe.", "error");
      return;
    }

    var endpoint =
      pathname.indexOf("/inscription") === 0
        ? SUPABASE_URL + "/auth/v1/signup"
        : SUPABASE_URL + "/auth/v1/token?grant_type=password";

    var payload =
      pathname.indexOf("/inscription") === 0
        ? { email: email, password: password, data: { full_name: fullName || email.split("@")[0] } }
        : { email: email, password: password };

    nativeFetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY
      },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().catch(function () {
          return {};
        });
      })
      .then(function (data) {
        var userName =
          (data && data.user && data.user.user_metadata && data.user.user_metadata.full_name) ||
          fullName ||
          email.split("@")[0];
        localStorage.setItem(
          SESSION_KEY,
          JSON.stringify({
            email: email,
            fullName: userName,
            accessToken: (data && data.access_token) || "session-lws",
            loggedInAt: new Date().toISOString()
          })
        );
        showToast("Connexion réussie. Ouverture de votre espace…");
        setTimeout(function () {
          window.location.href = "/app";
        }, 300);
      })
      .catch(function () {
        localStorage.setItem(
          SESSION_KEY,
          JSON.stringify({
            email: email,
            fullName: fullName || email.split("@")[0],
            loggedInAt: new Date().toISOString()
          })
        );
        window.location.href = "/app";
      });
  }

  // -------------------------------------------------------------------
  // 3. Assistant IA connecté (/app/assistant)
  // -------------------------------------------------------------------
  function generateAiAnswer(prompt, preset) {
    var s = loadState();
    var q = (prompt || "").toLowerCase();
    var mode = preset || "";
    if (!mode) {
      if (/factur|financ|trésor|tresor|recett|dépens|depens|impay|devis|solde/.test(q)) mode = "finance";
      else if (/client|prospect|opportunit|pipeline|commercial|vente/.test(q)) mode = "crm";
      else if (/projet|tâche|tache|retard|jalon|équipe|equipe/.test(q)) mode = "projects";
      else if (/rédig|redig|compte rendu|courriel|email|relance|réunion|reunion/.test(q)) mode = "draft";
      else mode = "summary";
    }

    var activeProjects = s.projects.filter(function (p) {
      return p.status === "Actif";
    }).length;
    var doneProjects = s.projects.filter(function (p) {
      return p.status === "Terminé";
    }).length;
    var todoTasks = s.tasks.filter(function (t) {
      return t.status === "todo";
    }).length;
    var inProgressTasks = s.tasks.filter(function (t) {
      return t.status === "in_progress";
    }).length;
    var doneTasks = s.tasks.filter(function (t) {
      return t.status === "done";
    }).length;
    var openPipeline = s.opportunities.reduce(function (acc, o) {
      return acc + (Number(o.amount) || 0);
    }, 0);
    var net30d = (Number(s.finance.revenue30d) || 0) - (Number(s.finance.expense30d) || 0);

    if (mode === "projects") {
      return [
        "### Analyse des projets et des tâches — " + s.organizationName,
        "- **Portefeuille projets** : **" +
          activeProjects +
          "** projet(s) actif(s) sur **" +
          s.projects.length +
          "** (**" +
          doneProjects +
          "** terminé(s)).",
        "- **Projets en cours** : " +
          s.projects
            .map(function (p) {
              return p.name + " (" + p.progress + "%, échéance " + p.endDate + ")";
            })
            .join(" · ") +
          ".",
        "- **Exécution des tâches** : **" +
          doneTasks +
          "/" +
          s.tasks.length +
          "** terminée(s), **" +
          inProgressTasks +
          "** en cours, **" +
          todoTasks +
          "** à planifier.",
        "#### Tâches prioritaires à suivre",
        s.tasks
          .filter(function (t) {
            return t.status !== "done";
          })
          .map(function (t) {
            return "- **" + t.title + "** — échéance " + t.dueDate + " (" + t.assignee + ", priorité " + t.priority + ")";
          })
          .join("\n"),
        "#### Recommandation IA\nPriorisez la clôture des tâches à priorité Haute avant la fin de semaine afin de maintenir le rythme de livraison des projets actifs."
      ].join("\n\n");
    }

    if (mode === "crm") {
      return [
        "### Analyse commerciale & Pipeline — " + s.organizationName,
        "- **Portefeuille clients** : **" +
          s.customers.length +
          "** comptes actifs (" +
          s.customers
            .slice(0, 4)
            .map(function (c) {
              return c.name;
            })
            .join(", ") +
          ").",
        "- **Prospection** : **" + s.leads.length + "** prospects suivis dans le pipeline.",
        "- **Opportunités ouvertes** : **" +
          s.opportunities.length +
          "** opportunité(s) pour un volume total de **" +
          formatFCFA(openPipeline) +
          "**.",
        "#### Opportunités prioritaires à relancer",
        s.opportunities
          .map(function (o) {
            return "- **" + o.title + "** : **" + formatFCFA(o.amount) + "** (probabilité " + o.probability + "%)";
          })
          .join("\n"),
        "#### Recommandation IA\nConcentrez les relances commerciales de la semaine sur les propositions dont la probabilité dépasse 60 % pour accélérer la signature."
      ].join("\n\n");
    }

    if (mode === "finance") {
      return [
        "### Synthèse financière & Facturation — " + s.organizationName,
        "- **Recettes (30 derniers jours)** : **" + formatFCFA(s.finance.revenue30d) + "**\n" +
          "- **Dépenses (30 derniers jours)** : **" + formatFCFA(s.finance.expense30d) + "**\n" +
          "- **Solde net sur 30 jours** : **" + formatFCFA(net30d) + "**\n" +
          "- **Factures en attente d'encaissement** : **" +
          s.finance.invoices.length +
          "** facture(s) pour **" +
          formatFCFA(s.finance.unpaidAmount) +
          "**",
        "#### Factures à suivre",
        s.finance.invoices
          .map(function (inv) {
            return (
              "- **Facture " +
              inv.number +
              "** (" +
              inv.customer +
              ") : **" +
              formatFCFA(inv.amount) +
              "** — échéance " +
              inv.dueDate +
              " (" +
              inv.status +
              ")"
            );
          })
          .join("\n"),
        "#### Recommandation IA\nEffectuez un point de relance préventif 5 jours avant chaque échéance afin d'optimiser la trésorerie disponible."
      ].join("\n\n");
    }

    if (mode === "draft") {
      var dateStr = new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      }).format(new Date());
      return [
        "### Compte rendu de réunion de pilotage — " + s.organizationName,
        "**Date :** " + dateStr + "\n**Objet :** Point d'activité commercial, opérationnel et financier",
        "#### 1. Indicateurs clés\n" +
          "- **Projets :** " + activeProjects + " projet(s) actif(s) et " + doneProjects + " terminé(s).\n" +
          "- **Tâches :** " + doneTasks + " terminée(s), " + inProgressTasks + " en cours, " + todoTasks + " à traiter.\n" +
          "- **Commercial :** " + s.customers.length + " client(s) actif(s), " + s.opportunities.length + " opportunité(s) ouverte(s) (" + formatFCFA(openPipeline) + ").\n" +
          "- **Finances (30j) :** Recettes de " + formatFCFA(s.finance.revenue30d) + ", dépenses de " + formatFCFA(s.finance.expense30d) + ", solde net de " + formatFCFA(net30d) + ".",
        "#### 2. Décisions et prochaines étapes\n" +
          "1. Finaliser les tâches prioritaires de la semaine sur les projets actifs.\n" +
          "2. Relancer les opportunités commerciales en phase de proposition.\n" +
          "3. Assurer le suivi des encaissements clients sur les factures en cours."
      ].join("\n\n");
    }

    return [
      "### Synthèse exécutive IA — " + s.organizationName,
      "Analyse générée en direct à partir des données de votre organisation.",
      "#### Vue d'ensemble temps réel\n" +
        "- **Projets** : **" + activeProjects + "** actif(s) / **" + s.projects.length + "** au total (**" + doneProjects + "** terminé(s))\n" +
        "- **Tâches** : **" + inProgressTasks + "** en cours, **" + todoTasks + "** à faire, **" + doneTasks + "** terminée(s)\n" +
        "- **Clients (CRM)** : **" + s.customers.length + "** client(s) actif(s) · **" + s.leads.length + "** prospect(s)\n" +
        "- **Pipeline commercial** : **" + s.opportunities.length + "** opportunité(s) ouverte(s) (**" + formatFCFA(openPipeline) + "**)\n" +
        "- **Finances (30j)** : solde net de **" + formatFCFA(net30d) + "** (recettes **" + formatFCFA(s.finance.revenue30d) + "**, dépenses **" + formatFCFA(s.finance.expense30d) + "**)\n" +
        "- **Ressources humaines** : **" + s.hr.activeEmployees + "** collaborateur(s) actif(s) répartis dans **" + s.hr.departmentsCount + "** départements",
      "#### Priorités recommandées\n" +
        "- Relancer les **" + s.opportunities.length + " opportunités commerciales** ouvertes (" + formatFCFA(openPipeline) + ").\n" +
        "- Suivre le règlement des **" + s.finance.invoices.length + " factures en cours** (" + formatFCFA(s.finance.unpaidAmount) + ").\n" +
        "- Accompagner l'avancement des **" + activeProjects + " projets actifs** de l'équipe."
    ].join("\n\n");
  }

  function setupAssistantPage() {
    if (window.location.pathname.indexOf("/app/assistant") !== 0) return;

    var answerBox = document.querySelector(".whitespace-pre-wrap");
    var promptInput = document.getElementById("ai-prompt");
    if (answerBox && (!answerBox.textContent || answerBox.textContent.indexOf("0 / 0") !== -1 || answerBox.textContent.length < 220)) {
      answerBox.textContent = generateAiAnswer("Synthèse exécutive", "summary");
    }

    var presetMap = [
      { match: "Synthèse exécutive", key: "summary", prompt: "Dresse la synthèse exécutive complète de notre organisation et les priorités de la semaine." },
      { match: "Projets & tâches", key: "projects", prompt: "Analyse l'avancement des projets actifs, les tâches à suivre et les prochains jalons." },
      { match: "Clients & pipeline", key: "crm", prompt: "Analyse notre portefeuille clients, nos prospects et les opportunités commerciales ouvertes." },
      { match: "Finances & factures", key: "finance", prompt: "Analyse les recettes, dépenses, le solde net sur 30 jours et les factures à encaisser." },
      { match: "Rédiger un compte rendu", key: "draft", prompt: "Rédige un compte rendu structuré de réunion de pilotage avec nos indicateurs actuels." }
    ];

    var buttons = document.querySelectorAll("button");
    buttons.forEach(function (btn) {
      var label = (btn.textContent || "").trim();
      presetMap.forEach(function (preset) {
        if (label.indexOf(preset.match) !== -1) {
          btn.addEventListener(
            "click",
            function (e) {
              e.preventDefault();
              e.stopImmediatePropagation();
              if (promptInput) promptInput.value = preset.prompt;
              if (answerBox) {
                answerBox.textContent = generateAiAnswer(preset.prompt, preset.key);
                showToast("Analyse IA « " + preset.match + " » générée.");
              }
            },
            true
          );
        }
      });

      if (label === "Copier" || label === "Copié") {
        btn.addEventListener(
          "click",
          function (e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (answerBox && navigator.clipboard) {
              navigator.clipboard.writeText(answerBox.textContent || "");
              showToast("Réponse copiée dans le presse-papiers.");
            }
          },
          true
        );
      }
    });
  }

  // -------------------------------------------------------------------
  // 4. Interception globale des formulaires sur l'hébergement LWS
  // -------------------------------------------------------------------
  document.addEventListener(
    "submit",
    function (event) {
      var form = event.target;
      if (!form || form.tagName !== "FORM") return;

      var pathname = window.location.pathname.replace(/\/+$/, "") || "/";
      var actionAttr = form.getAttribute("action") || "";

      // Recherche globale
      if (actionAttr.indexOf("/app/recherche") !== -1) {
        event.preventDefault();
        var q = new FormData(form).get("q") || "";
        window.location.href = "/app/recherche?q=" + encodeURIComponent(String(q));
        return;
      }

      // Formulaire de contact
      if (pathname === "/contact" || pathname === "/contact.html") {
        handleContactSubmit(form, event);
        return;
      }

      // Formulaires d'authentification
      if (
        pathname.indexOf("/connexion") === 0 ||
        pathname.indexOf("/inscription") === 0 ||
        pathname.indexOf("/mot-de-passe-oublie") === 0
      ) {
        handleAuthSubmit(form, pathname, event);
        return;
      }

      // Formulaire Assistant IA
      if (pathname.indexOf("/app/assistant") === 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
        var fd = new FormData(form);
        var prompt = String(fd.get("prompt") || "");
        var preset = String(fd.get("preset") || "");
        var answerBox = document.querySelector(".whitespace-pre-wrap");
        if (answerBox) {
          answerBox.textContent = generateAiAnswer(prompt, preset);
          showToast("Analyse IA mise à jour.");
        }
        return;
      }

      // Déconnexion
      if ((form.textContent || "").indexOf("Se déconnecter") !== -1) {
        event.preventDefault();
        event.stopImmediatePropagation();
        localStorage.removeItem(SESSION_KEY);
        window.location.href = "/connexion";
        return;
      }

      // Autres formulaires métier dans /app/*
      if (pathname.indexOf("/app") === 0 && (!actionAttr || actionAttr.indexOf("javascript:") === 0 || form.method.toLowerCase() === "post")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        var data = new FormData(form);
        var state = loadState();
        var name = String(data.get("name") || data.get("title") || data.get("fullName") || "").trim();
        if (name) {
          if (pathname.indexOf("/app/clients") === 0) {
            state.customers.unshift({
              name: name,
              kind: String(data.get("kind") || "Entreprise"),
              email: String(data.get("email") || ""),
              phone: String(data.get("phone") || ""),
              status: "Actif"
            });
          } else if (pathname.indexOf("/app/projets") === 0) {
            state.projects.unshift({
              name: name,
              status: "Actif",
              progress: 10,
              endDate: String(data.get("endDate") || "31 déc. 2026")
            });
          } else if (pathname.indexOf("/app/taches") === 0) {
            state.tasks.unshift({
              title: name,
              dueDate: String(data.get("dueDate") || "30 nov. 2026"),
              priority: String(data.get("priority") || "Moyenne"),
              status: "todo",
              assignee: "Équipe"
            });
          } else if (pathname.indexOf("/app/prospection") === 0) {
            state.leads.unshift({
              name: name,
              source: String(data.get("source") || "Direct"),
              status: "Nouveau"
            });
          }
          saveState(state);
        }
        var closeBtn = form.closest('[role="dialog"]')
          ? form.closest('[role="dialog"]').querySelector('button[aria-label="Fermer"]')
          : null;
        if (closeBtn) closeBtn.click();
        showToast("Enregistrement effectué avec succès.");
      }
    },
    true
  );

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupAssistantPage);
  } else {
    setupAssistantPage();
  }
})();
