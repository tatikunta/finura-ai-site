(function () {
  const auth = window.FinuraAuth;
  const api = window.FinuraAccountApi;
  const form = document.getElementById("pg-form");
  const status = document.getElementById("pg-status");
  const result = document.getElementById("pg-result");
  const creditsEl = document.getElementById("pg-credits");
  const banner = document.getElementById("pg-mock-banner");

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function statusClass(s) {
    const u = (s || "").toUpperCase();
    if (u.indexOf("DENY") >= 0 || u === "FAILED") return "deny";
    if (u.indexOf("REQUIRE") >= 0 || u === "DEFER") return "warn";
    return "ok";
  }

  function renderShap(container, shap) {
    container.innerHTML = "";
    if (!shap || !shap.length) {
      container.innerHTML = "<p class='muted'>No SHAP values returned.</p>";
      return;
    }
    const max =
      Math.max.apply(
        null,
        shap.map(function (s) {
          return Math.abs(s.contribution || 0);
        })
      ) || 1;
    shap.forEach(function (s) {
      const row = document.createElement("div");
      row.className = "shap-row";
      const mag = Math.abs(s.contribution || 0);
      const pct = Math.round((mag / max) * 100);
      const neg = (s.contribution || 0) < 0;
      row.innerHTML =
        "<div>" +
        escapeHtml(s.feature) +
        "</div><div class='shap-bar'><span class='shap-fill" +
        (neg ? " neg" : "") +
        "' style='width:" +
        pct +
        "%'></span></div><div>" +
        (s.contribution || 0).toFixed(3) +
        "</div>";
      container.appendChild(row);
    });
  }

  function renderDecision(payload) {
    const credits = payload.credits || {};
    const decision =
      (payload.result && payload.result.decision) || payload.decision || {};
    const risk = decision.refund_risk_v1 || {};
    const citations = decision.citations || [];

    result.hidden = false;
    result.innerHTML =
      "<div class='decision-head'>" +
      "<div><span class='status-pill " +
      statusClass(decision.status) +
      "'>" +
      escapeHtml(decision.status || "UNKNOWN") +
      "</span></div>" +
      "<div><span class='badge'>Credits −" +
      escapeHtml(String(credits.debited != null ? credits.debited : 1)) +
      "</span> <span class='badge'>" +
      escapeHtml(String(credits.remaining != null ? credits.remaining : "—")) +
      " left</span></div></div>" +
      "<dl class='kv'>" +
      "<dt>Decision</dt><dd>" +
      escapeHtml(decision.decision_id || "—") +
      "</dd>" +
      "<dt>Kind</dt><dd>" +
      escapeHtml((payload.result && payload.result.kind) || "—") +
      "</dd>" +
      "<dt>Transaction</dt><dd>" +
      escapeHtml(decision.transaction_id || "—") +
      "</dd>" +
      "<dt>Risk score</dt><dd><strong>refund_risk_v1</strong> = " +
      (risk.score != null ? Number(risk.score).toFixed(2) : "—") +
      (risk.label ? " (" + escapeHtml(risk.label) + ")" : "") +
      "</dd></dl>" +
      "<h3 style='margin-top:22px'>Policy citations</h3>" +
      "<ul class='audit'>" +
      (citations.length
        ? citations
            .map(function (c) {
              return (
                "<li><strong>" +
                escapeHtml(c.code || "cite") +
                "</strong> — " +
                escapeHtml(c.label || "") +
                "</li>"
              );
            })
            .join("")
        : "<li class='muted'>No citations returned.</li>") +
      "</ul>" +
      "<p class='src' style='margin-top:16px'>SHAP feature contributions</p>" +
      "<div class='shap' id='pg-shap'></div>";

    renderShap(document.getElementById("pg-shap"), risk.shap || []);
    if (creditsEl && credits.remaining != null) {
      creditsEl.textContent =
        "Credits remaining: " +
        credits.remaining +
        " / " +
        (credits.granted != null ? credits.granted : "—");
    }
  }

  async function refreshCredits() {
    try {
      const res = await api.getCredits();
      const c = res.data || {};
      if (creditsEl) {
        creditsEl.textContent =
          "Credits remaining: " +
          c.remaining +
          " / " +
          c.granted +
          " (" +
          c.period +
          ")";
      }
    } catch (_) {}
  }

  form &&
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const btn = form.querySelector('[type="submit"]');
      const amountInr = Number(form.amount_inr.value);
      const payload = {
        title: form.title.value.trim() || "Playground decision",
        action: form.action.value || "assess",
        target: null,
        parameters: {
          notes: form.notes.value.trim() || undefined,
        },
        transaction_id: form.transaction_id.value.trim() || undefined,
      };
      if (amountInr > 0) {
        payload.amount = Math.round(amountInr * 100);
        payload.currency = "INR";
      }
      btn.disabled = true;
      if (status) {
        status.textContent = "Running playground decision…";
        status.className = "form-status";
      }
      try {
        const res = await api.playgroundDecision(payload);
        if (status) {
          status.textContent = "Decision received.";
          status.className = "form-status ok";
        }
        renderDecision(res.data || {});
      } catch (err) {
        if (status) {
          status.textContent =
            err.code === "credits_exhausted"
              ? "Credits exhausted (402). Upgrade or wait for the next period."
              : err.message || "Playground request failed";
          status.className = "form-status err";
        }
      } finally {
        btn.disabled = false;
      }
    });

  auth.init();
  auth.onAuthStateChanged(async function (user) {
    if (!user) {
      location.href = "/auth/" + (api.shouldMock() ? "?mock=1" : "");
      return;
    }
    if (banner && api.shouldMock()) {
      banner.hidden = false;
      banner.textContent =
        "Mock playground — responses follow the PR #8 contract until /v1/account/playground/decisions is live.";
    }
    try {
      await api.bootstrap({});
    } catch (_) {}
    refreshCredits();
  });
})();
