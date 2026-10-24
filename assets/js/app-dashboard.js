(function () {
  const auth = window.FinuraAuth;
  const api = window.FinuraAccountApi;
  const cfg = window.FINURA_CONFIG || {};
  const params = new URLSearchParams(location.search);

  if (params.get("mock") === "1") {
    const h = (location.hostname || "").toLowerCase();
    const prod =
      h === "finuraai.org" ||
      h === "www.finuraai.org" ||
      h.endsWith(".finuraai.org");
    if (!prod) {
      try {
        localStorage.setItem("finura_mock", "1");
      } catch (_) {}
    }
  }

  const TITLES = {
    overview: "Overview",
    keys: "API keys",
    usage: "Usage",
    billing: "Billing",
    team: "Team",
    account: "Account",
  };

  let me = null;
  let plans = [];

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function fmtTs(ts) {
    if (!ts) return "—";
    try {
      return new Date(ts * 1000).toLocaleString();
    } catch (_) {
      return String(ts);
    }
  }
  function fmtMoney(amount, currency) {
    if (amount == null) return "—";
    const major = amount / 100;
    try {
      return new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-IN", {
        style: "currency",
        currency: currency || "INR",
        maximumFractionDigits: 2,
      }).format(major);
    } catch (_) {
      return major + " " + (currency || "");
    }
  }

  function showGate(kind, message) {
    const loading = $("#gate-loading");
    const err = $("#gate-error");
    const root = $("#app-root");
    if (kind === "loading") {
      if (loading) loading.hidden = false;
      if (err) err.hidden = true;
      if (root) root.hidden = true;
    } else if (kind === "error") {
      if (loading) loading.hidden = true;
      if (err) {
        err.hidden = false;
        err.innerHTML =
          escapeHtml(message || "Something went wrong") +
          '<p style="margin-top:14px"><a class="btn s" href="/auth/">Sign in</a></p>';
      }
      if (root) root.hidden = true;
    } else {
      if (loading) loading.hidden = true;
      if (err) err.hidden = true;
      if (root) root.hidden = false;
    }
  }

  function selectTab(name) {
    name = TITLES[name] ? name : "overview";
    document.querySelectorAll("[data-tab]").forEach(function (a) {
      const on = a.getAttribute("data-tab") === name;
      if (a.hasAttribute("aria-current") || a.getAttribute("data-tab")) {
        if (on) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      }
    });
    document.querySelectorAll("[data-panel]").forEach(function (p) {
      p.hidden = p.getAttribute("data-panel") !== name;
    });
    const title = $("#page-title");
    if (title) title.textContent = TITLES[name];
    history.replaceState(null, "", "#" + name);
  }

  document.querySelectorAll("[data-tab]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      const tab = a.getAttribute("data-tab");
      if (!tab) return;
      e.preventDefault();
      selectTab(tab);
    });
  });

  $("#sign-out-btn") &&
    $("#sign-out-btn").addEventListener("click", async function (e) {
      e.preventDefault();
      await auth.signOut();
      location.href = "/auth/";
    });

  function renderOverview() {
    if (!me) return;
    const plan = me.plan || {};
    const credits = me.credits || {};
    $("#stat-plan").textContent = plan.name || plan.id || "—";
    $("#stat-plan-hint").textContent = plan.playground_only
      ? "Playground only"
      : plan.api_keys_allowed
        ? "API keys enabled"
        : "";
    $("#stat-credits").textContent =
      credits.remaining != null ? String(credits.remaining) : "—";
    $("#stat-credits-hint").textContent =
      "of " + (credits.granted != null ? credits.granted : "—") + " granted · " + (credits.period || "");
    $("#stat-used").textContent = credits.used != null ? String(credits.used) : "—";
    $("#stat-used-hint").textContent =
      credits.overage ? credits.overage + " overage" : "No overage";

    const chip = $("#user-chip");
    if (chip) {
      chip.innerHTML =
        "<strong>" +
        escapeHtml(me.user.display_name || me.user.email) +
        "</strong><span>" +
        escapeHtml(me.user.email || "") +
        "</span>";
    }
  }

  async function renderChart() {
    const el = $("#usage-chart");
    if (!el) return;
    el.innerHTML = "";
    let series = [];
    try {
      const usage = await api.getUsage();
      series = (usage.data && usage.data.daily_usage) || [];
    } catch (_) {
      series = [];
    }
    if (!series.length) {
      // Derive a simple series from ledger if daily_usage absent
      series = new Array(28).fill(0);
      try {
        const hist = await api.getCreditsHistory(100, 0);
        const entries = (hist.data && hist.data.entries) || [];
        entries.forEach(function (e) {
          const d = new Date((e.created_at || 0) * 1000);
          const day = d.getUTCDate() - 1;
          if (day >= 0 && day < series.length) {
            series[day] += Math.abs(e.delta || 0);
          }
        });
      } catch (_) {}
    }
    const max = Math.max.apply(null, series.concat([1]));
    series.forEach(function (v) {
      const bar = document.createElement("span");
      bar.style.height = Math.max(4, Math.round((v / max) * 100)) + "%";
      bar.title = v + " credits";
      el.appendChild(bar);
    });
  }

  async function renderKeys() {
    const tbody = $("#keys-table tbody");
    const empty = $("#keys-empty");
    const status = $("#keys-status");
    tbody.innerHTML = "";
    try {
      const res = await api.listApiKeys();
      const keys = (res.data && res.data.keys) || [];
      const active = keys.filter(function (k) {
        return !k.revoked;
      });
      if (!active.length) {
        empty.hidden = false;
      } else {
        empty.hidden = true;
        active.forEach(function (k) {
          const tr = document.createElement("tr");
          tr.innerHTML =
            "<td>" +
            escapeHtml(k.name) +
            "</td><td><code>" +
            escapeHtml(k.key_prefix) +
            "…</code></td><td>" +
            escapeHtml(fmtTs(k.created_at)) +
            "</td><td>" +
            escapeHtml(fmtTs(k.last_used_at)) +
            "</td><td><button type='button' class='btn s' data-revoke='" +
            escapeHtml(k.id) +
            "'>Revoke</button></td>";
          tbody.appendChild(tr);
        });
        tbody.querySelectorAll("[data-revoke]").forEach(function (btn) {
          btn.addEventListener("click", async function () {
            if (!confirm("Revoke this API key?")) return;
            try {
              await api.revokeApiKey(btn.getAttribute("data-revoke"));
              if (status) {
                status.textContent = "Key revoked.";
                status.className = "form-status ok";
              }
              renderKeys();
            } catch (err) {
              if (status) {
                status.textContent = err.message || "Revoke failed";
                status.className = "form-status err";
              }
            }
          });
        });
      }
    } catch (err) {
      empty.hidden = true;
      if (status) {
        status.textContent = err.message || "Could not load keys";
        status.className = "form-status err";
      }
    }
  }

  $("#create-key-form") &&
    $("#create-key-form").addEventListener("submit", async function (e) {
      e.preventDefault();
      const status = $("#keys-status");
      const box = $("#new-secret");
      const name = $("#key-name").value.trim() || "Default";
      try {
        const res = await api.createApiKey(name);
        const secret = res.data && res.data.secret;
        const msg = (res.data && res.data.message) || "";
        if (box && secret) {
          box.hidden = false;
          box.innerHTML =
            "<strong>Copy now — shown once</strong><br>" +
            escapeHtml(secret) +
            '<p class="inline-actions" style="margin-top:12px">' +
            '<button type="button" class="btn s" id="copy-secret">Copy</button></p>' +
            "<p class='muted' style='margin-top:8px'>" +
            escapeHtml(msg) +
            "</p>";
          const copy = $("#copy-secret");
          if (copy) {
            copy.addEventListener("click", function () {
              navigator.clipboard.writeText(secret).then(function () {
                copy.textContent = "Copied";
              });
            });
          }
        }
        if (status) {
          status.textContent = "Key created.";
          status.className = "form-status ok";
        }
        renderKeys();
      } catch (err) {
        if (status) {
          status.textContent =
            err.code === "plan_not_allowed"
              ? "API keys require Starter or higher. Upgrade under Billing."
              : err.message || "Create failed";
          status.className = "form-status err";
        }
      }
    });

  async function renderUsage() {
    const tbody = $("#usage-table tbody");
    const empty = $("#usage-empty");
    tbody.innerHTML = "";
    try {
      const res = await api.getCreditsHistory(50, 0);
      const entries = (res.data && res.data.entries) || [];
      if (!entries.length) {
        empty.hidden = false;
        return;
      }
      empty.hidden = true;
      entries.forEach(function (e) {
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" +
          escapeHtml(fmtTs(e.created_at)) +
          "</td><td>" +
          escapeHtml(e.reason || e.ref_type || "—") +
          "</td><td>" +
          escapeHtml(String(e.delta)) +
          "</td><td>" +
          escapeHtml(String(e.balance_after)) +
          "</td>";
        tbody.appendChild(tr);
      });
    } catch (err) {
      empty.hidden = false;
      empty.textContent = err.message || "Could not load usage";
    }
  }

  function renderPlanActions() {
    const el = $("#plan-actions");
    if (!el) return;
    el.innerHTML = "";
    const current = (me && me.account && me.account.plan_id) || "free";
    plans.forEach(function (p) {
      if (p.contact_sales) {
        const a = document.createElement("a");
        a.className = "btn s";
        a.href = "/#contact";
        a.textContent = "Contact sales";
        el.appendChild(a);
        return;
      }
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn " + (p.id === current ? "s" : "p");
      btn.disabled = p.id === current;
      btn.textContent =
        p.id === current
          ? "Current · " + p.name
          : (p.price_inr === 0 ? "Switch to " : "Upgrade to ") + p.name;
      btn.addEventListener("click", function () {
        startCheckout(p.id);
      });
      el.appendChild(btn);
    });
  }

  async function startCheckout(planId) {
    const status = $("#billing-status");
    if (!cfg.BILLING_ENABLED && planId !== "free") {
      // Allow mock checkout when MOCK so screenshots work; otherwise explain.
      if (!api.shouldMock()) {
        if (status) {
          status.textContent =
            "Billing is flagged off (BILLING_ENABLED=false). Enable it after Razorpay secrets are on Cloud Run.";
          status.className = "form-status err";
        }
        return;
      }
    }
    if (status) {
      status.textContent = "Starting checkout…";
      status.className = "form-status";
    }
    try {
      const res = await api.checkout(planId, "INR");
      const data = res.data;
      if (data.provider === "local" || data._mock_activated) {
        await refreshMe();
        if (status) {
          status.textContent =
            "Plan updated" + (data._mock_activated ? " (mock checkout)." : ".");
          status.className = "form-status ok";
        }
        return;
      }
      await api.openRazorpayCheckout(data);
      await refreshMe();
      if (status) {
        status.textContent = "Payment submitted — plan updates after webhook.";
        status.className = "form-status ok";
      }
    } catch (err) {
      if (err.code === "dismissed") {
        if (status) {
          status.textContent = "Checkout closed.";
          status.className = "form-status";
        }
        return;
      }
      if (status) {
        status.textContent =
          err.code === "billing_disabled"
            ? "Billing disabled on the API (503)."
            : err.message || "Checkout failed";
        status.className = "form-status err";
      }
    }
  }

  async function renderBilling() {
    const plan = me.plan || {};
    $("#bill-plan").textContent = plan.name || "—";
    $("#bill-plan-hint").textContent =
      plan.price_inr != null
        ? "₹" + plan.price_inr + " / mo ex-GST"
        : "Custom";
    try {
      const bill = await api.getBilling();
      const d = bill.data || {};
      $("#bill-flag").textContent = d.billing_enabled ? "On" : "Off";
      const sub = d.subscription;
      $("#bill-sub").textContent = sub
        ? sub.status || "active"
        : "None";
      $("#bill-sub-hint").textContent = sub
        ? sub.plan_id || ""
        : "No active Razorpay subscription";
    } catch (err) {
      $("#bill-flag").textContent = cfg.BILLING_ENABLED ? "?" : "Off";
      $("#bill-sub").textContent = "—";
      $("#bill-sub-hint").textContent = err.message || "";
    }
    renderPlanActions();

    const tbody = $("#invoices-table tbody");
    const empty = $("#invoices-empty");
    tbody.innerHTML = "";
    try {
      const inv = await api.getInvoices();
      const list = (inv.data && inv.data.invoices) || [];
      if (!list.length) {
        empty.hidden = false;
      } else {
        empty.hidden = true;
        list.forEach(function (i) {
          const tr = document.createElement("tr");
          tr.innerHTML =
            "<td>" +
            escapeHtml(i.id) +
            "</td><td>" +
            escapeHtml(fmtMoney(i.amount, i.currency)) +
            "</td><td>" +
            escapeHtml(i.status) +
            "</td><td>" +
            escapeHtml(fmtTs(i.created_at)) +
            "</td>";
          tbody.appendChild(tr);
        });
      }
    } catch (_) {
      empty.hidden = false;
    }
  }

  function renderTeam() {
    const plan = me.plan || {};
    const acct = me.account || {};
    $("#team-seats").textContent =
      acct.seats != null ? String(acct.seats) : plan.team_seats != null ? String(plan.team_seats) : "—";
    $("#team-seats-hint").textContent =
      plan.id === "business"
        ? "Business includes 5 seats"
        : plan.id === "enterprise"
          ? "Custom seat count"
          : "Single-seat plan";
    $("#team-type").textContent = acct.account_type || "—";
    $("#team-account").textContent = acct.name || acct.id || "";
    $("#team-tenant").textContent = acct.tenant_id || "—";
  }

  function wireAccountPrivacy() {
    const nav = document.querySelector('[data-tab="account"]');
    const enabled = !!cfg.ACCOUNT_PRIVACY_ENABLED;
    if (nav) nav.hidden = !enabled;
    if (!enabled) return;

    const status = $("#account-privacy-status");
    function setPrivacyStatus(msg, kind) {
      if (!status) return;
      status.textContent = msg || "";
      status.className = "form-status" + (kind ? " " + kind : "");
    }

    const exportBtn = $("#export-account-btn");
    if (exportBtn && !exportBtn.dataset.wired) {
      exportBtn.dataset.wired = "1";
      exportBtn.addEventListener("click", async function () {
        setPrivacyStatus("Preparing export…");
        exportBtn.disabled = true;
        try {
          const res = await api.exportAccount();
          const data = res.data;
          const blob = new Blob(
            [typeof data === "string" ? data : JSON.stringify(data, null, 2)],
            { type: "application/json" }
          );
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "finura-account-export.json";
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          setPrivacyStatus("Export downloaded.", "ok");
        } catch (err) {
          setPrivacyStatus(err.message || "Export failed", "err");
        } finally {
          exportBtn.disabled = false;
        }
      });
    }

    const deleteBtn = $("#delete-account-btn");
    if (deleteBtn && !deleteBtn.dataset.wired) {
      deleteBtn.dataset.wired = "1";
      deleteBtn.addEventListener("click", async function () {
        // Confirm step 1 — irreversible warning
        const ok = window.confirm(
          "Permanently delete your FINURA account and associated data? This cannot be undone."
        );
        if (!ok) {
          setPrivacyStatus("Deletion cancelled.");
          return;
        }
        // Confirm step 2 — typed confirmation (matches X-Confirm-Delete: DELETE)
        const confirmText = window.prompt(
          'Type DELETE to confirm account deletion.',
          ""
        );
        if (confirmText !== "DELETE") {
          setPrivacyStatus("Deletion cancelled — confirmation did not match DELETE.", "err");
          return;
        }
        setPrivacyStatus("Deleting account…");
        deleteBtn.disabled = true;
        try {
          await api.deleteAccount();
          try {
            await auth.signOut();
          } catch (_) {}
          setPrivacyStatus("Account deleted. Signing you out…", "ok");
          location.href = "/auth/?deleted=1";
        } catch (err) {
          setPrivacyStatus(err.message || "Delete failed", "err");
          deleteBtn.disabled = false;
        }
      });
    }
  }

  async function refreshMe() {
    const res = await api.getMe();
    me = res.data;
    try {
      const p = await api.getPlans();
      plans = (p.data && p.data.plans) || [];
    } catch (_) {
      plans = (window.FinuraMockAccount && window.FinuraMockAccount.plans) || [];
    }
    renderOverview();
    renderTeam();
    wireAccountPrivacy();
    await renderChart();
    await renderKeys();
    await renderUsage();
    await renderBilling();
  }

  async function boot(user) {
    if (!user) {
      location.href = "/auth/" + (api.shouldMock() ? "?mock=1" : "");
      return;
    }
    showGate("loading");
    const banner = $("#mock-banner");
    if (banner && api.shouldMock()) {
      banner.hidden = false;
      banner.textContent =
        "Mock mode — live /v1/account/* is not deployed yet. Data is local for UI preview.";
    }
    try {
      try {
        await api.bootstrap({});
      } catch (_) {}
      await refreshMe();
      showGate("ok");
      wireAccountPrivacy();
      let tab = (location.hash || "").replace("#", "") || params.get("tab") || "overview";
      if (tab === "account" && !cfg.ACCOUNT_PRIVACY_ENABLED) tab = "overview";
      selectTab(tab);
      if (params.get("checkout") === "1" && params.get("plan")) {
        selectTab("billing");
        startCheckout(params.get("plan"));
      }
    } catch (err) {
      showGate("error", err.message || "Failed to load account");
    }
  }

  showGate("loading");
  auth.init();
  auth.onAuthStateChanged(boot);
})();
