(function () {
  const samples = window.FINURA_DEMO_SAMPLES;
  const api = window.FinuraDemoApi;
  const money = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function formatAmount(paise, currency) {
    if (currency === "INR") return money.format((paise || 0) / 100);
    return (paise || 0) + " " + (currency || "");
  }

  function statusClass(status) {
    const s = (status || "").toUpperCase();
    if (s.indexOf("DENY") >= 0 || s === "FAILED") return "deny";
    if (s.indexOf("REQUIRE") >= 0 || s === "DEFER" || s === "UNKNOWN") return "warn";
    return "ok";
  }

  /* ---- tabs ---- */
  const tabButtons = $all('[role="tab"]');
  const panels = $all('[role="tabpanel"]');
  tabButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const id = btn.getAttribute("aria-controls");
      tabButtons.forEach(function (b) {
        b.setAttribute("aria-selected", b === btn ? "true" : "false");
      });
      panels.forEach(function (p) {
        const show = p.id === id;
        p.hidden = !show;
      });
    });
  });

  /* ---- API status ---- */
  const apiBadge = $("#api-status");
  async function refreshHealth() {
    if (!apiBadge) return;
    try {
      const res = await api.health();
      if (res.ok) {
        apiBadge.textContent = "Live API connected";
        apiBadge.className = "badge live";
      } else {
        apiBadge.textContent = "API reachable · demo surface pending (HTTP " + res.status + ")";
        apiBadge.className = "badge sample";
      }
    } catch (_) {
      apiBadge.textContent = "API unreachable · using local samples";
      apiBadge.className = "badge sample";
    }
  }
  refreshHealth();

  /* ---- Refund demo ---- */
  const refundForm = $("#refund-form");
  const refundResult = $("#refund-result");
  const presetRow = $("#refund-presets");

  function fillPreset(preset) {
    if (!refundForm || !preset) return;
    refundForm.transaction_id.value = preset.transaction_id;
    refundForm.amount_inr.value = String(Math.round(preset.amount / 100));
    refundForm.evidence.value = (preset.evidence_refs || []).join(", ");
    refundForm.reason.value = (preset.model_output && preset.model_output.refund_reason) || "";
  }

  if (presetRow && samples) {
    samples.presets.forEach(function (p) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = p.label;
      b.addEventListener("click", function () {
        $all(".chip", presetRow).forEach(function (c) {
          c.setAttribute("aria-pressed", "false");
        });
        b.setAttribute("aria-pressed", "true");
        fillPreset(p);
      });
      presetRow.appendChild(b);
    });
    fillPreset(samples.presets[0]);
    const first = presetRow.querySelector(".chip");
    if (first) first.setAttribute("aria-pressed", "true");
  }

  function renderShap(container, shap) {
    container.innerHTML = "";
    if (!shap || !shap.length) {
      container.innerHTML = "<p class='muted'>No SHAP values returned.</p>";
      return;
    }
    const max = Math.max.apply(
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
        "</div><div class='shap-bar' role='img' aria-label='" +
        escapeHtml(s.feature) +
        " contribution " +
        (s.contribution || 0).toFixed(3) +
        "'><span class='shap-fill" +
        (neg ? " neg" : "") +
        "' style='width:" +
        pct +
        "%'></span></div><div>" +
        (s.contribution || 0).toFixed(3) +
        "</div>";
      container.appendChild(row);
    });
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderRefund(decision, meta) {
    if (!refundResult) return;
    const risk = decision.refund_risk_v1 || {};
    const sample = !!(decision.sample || (meta && meta.sample));
    const synth = risk.synthetic !== false;
    const citations = decision.citations || [];
    const audit = decision.audit_trail || [];

    refundResult.hidden = false;
    refundResult.innerHTML =
      "<div class='decision-head'>" +
      "<div><span class='status-pill " +
      statusClass(decision.status) +
      "'>" +
      escapeHtml(decision.status || "UNKNOWN") +
      "</span></div>" +
      "<div>" +
      (sample
        ? "<span class='badge sample'>Sample fallback</span> "
        : "<span class='badge live'>Live demo tenant</span> ") +
      (synth ? "<span class='badge synth'>Synthetic model</span>" : "") +
      "</div></div>" +
      "<dl class='kv'>" +
      "<dt>Decision</dt><dd>" +
      escapeHtml(decision.decision_id || "—") +
      "</dd>" +
      "<dt>Transaction</dt><dd>" +
      escapeHtml(decision.transaction_id || "—") +
      "</dd>" +
      "<dt>Amount</dt><dd>" +
      escapeHtml(formatAmount(decision.amount, decision.currency)) +
      "</dd>" +
      "<dt>Policy</dt><dd>" +
      escapeHtml(decision.policy_snapshot_id || "—") +
      "</dd>" +
      "<dt>Risk score</dt><dd><strong>refund_risk_v1</strong> = " +
      (risk.score != null ? Number(risk.score).toFixed(2) : "—") +
      (risk.label ? " (" + escapeHtml(risk.label) + ")" : "") +
      "</dd></dl>" +
      "<p class='src' style='margin-top:16px'>SHAP feature contributions (higher magnitude = stronger push on risk).</p>" +
      "<div class='shap' id='shap-bars'></div>" +
      "<p class='src'><strong>Disclaimer:</strong> refund_risk_v1 in this demo is a <em>synthetic / illustrative</em> model for product walkthroughs — not a production credit or fraud model.</p>" +
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
      "<h3 style='margin-top:22px'>Audit trail</h3>" +
      "<ul class='audit'>" +
      (audit.length
        ? audit
            .map(function (a) {
              return (
                "<li><strong>" +
                escapeHtml(a.at || a.event || "step") +
                "</strong> — " +
                escapeHtml(a.detail || a.event || "") +
                "</li>"
              );
            })
            .join("")
        : "<li class='muted'>No audit events.</li>") +
      "</ul>";

    renderShap($("#shap-bars", refundResult), risk.shap || []);
  }

  if (refundForm) {
    refundForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const btn = refundForm.querySelector('[type="submit"]');
      const status = $("#refund-status");
      const amountInr = Number(refundForm.amount_inr.value);
      const evidence = String(refundForm.evidence.value || "")
        .split(",")
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);
      const payload = {
        transaction_id: refundForm.transaction_id.value.trim(),
        amount: Math.round(amountInr * 100),
        currency: "INR",
        evidence_refs: evidence,
        model_output: {
          refund_reason: refundForm.reason.value.trim() || "unspecified",
        },
      };
      btn.disabled = true;
      if (status) {
        status.textContent = "Submitting to /demo/refunds…";
        status.className = "form-status";
      }
      try {
        const res = await api.submitRefund(payload);
        if (res.ok && res.data) {
          const decision = res.data.decision || res.data;
          if (status) {
            status.textContent = decision.sample
              ? "API returned a labelled sample run."
              : "Decision received from live demo tenant.";
            status.className = "form-status ok";
          }
          renderRefund(decision, { sample: !!decision.sample });
          return;
        }
        if (res.status >= 400 && res.status < 500) {
          const formatted = formatApiError(
            res.data &&
              (res.data.detail !== undefined
                ? res.data.detail
                : res.data.message),
            res.status
          );
          if (status) {
            status.textContent = formatted.message;
            status.className = "form-status err";
          }
          return;
        }
        throw new Error("HTTP " + res.status);
      } catch (_) {
        if (status) {
          status.textContent =
            "Demo API unavailable — showing local sample decision (not live).";
          status.className = "form-status err";
        }
        const sample = Object.assign({}, samples.refundDecision, {
          transaction_id: payload.transaction_id,
          amount: payload.amount,
          currency: payload.currency,
          evidence_refs: payload.evidence_refs,
          refund_reason: payload.model_output.refund_reason,
          sample: true,
        });
        if (payload.amount >= 500000) {
          sample.status = "REQUIRE_APPROVAL";
          sample.refund_risk_v1 = Object.assign({}, sample.refund_risk_v1, {
            score: 0.62,
            label: "elevated",
          });
        }
        renderRefund(sample, { sample: true });
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* ---- Policies ---- */
  const policyList = $("#policy-list");
  const policyStatus = $("#policy-status");

  function renderPolicies(payload, sample) {
    if (!policyList) return;
    const policies = (payload && payload.policies) || [];
    const active = payload && payload.active_version;
    policyList.innerHTML = "";
    if (policyStatus) {
      policyStatus.innerHTML = sample
        ? "<span class='badge sample'>Sample policies</span>"
        : "<span class='badge live'>Live policies</span>" +
          (active ? " · active <code>" + escapeHtml(active) + "</code>" : "");
    }
    policies.forEach(function (p, i) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "policy-item";
      btn.setAttribute("aria-expanded", i === 0 ? "true" : "false");
      const cites = (p.citations || [])
        .map(function (c) {
          return "<li><strong>" + escapeHtml(c.code) + "</strong> — " + escapeHtml(c.label) + "</li>";
        })
        .join("");
      btn.innerHTML =
        "<span class='k'>" +
        escapeHtml(p.version || "policy") +
        "</span><strong>" +
        escapeHtml(p.title || p.version || "Policy") +
        "</strong>" +
        "<div class='policy-body'>" +
        "<p>" +
        escapeHtml(p.summary || "") +
        "</p>" +
        "<p>Currency <strong>" +
        escapeHtml(p.currency || "—") +
        "</strong> · auto-limit " +
        escapeHtml(
          p.auto_limit != null ? formatAmount(p.auto_limit, p.currency || "INR") : "—"
        ) +
        " · evidence window " +
        escapeHtml(String(p.evidence_window_days != null ? p.evidence_window_days : "—")) +
        " days</p>" +
        (cites ? "<ul class='audit'>" + cites + "</ul>" : "") +
        "</div>";
      btn.addEventListener("click", function () {
        const open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", open ? "false" : "true");
      });
      policyList.appendChild(btn);
    });
  }

  async function loadPolicies() {
    try {
      const res = await api.getPolicies();
      if (res.ok && res.data) {
        renderPolicies(res.data, !!res.data.sample);
        return;
      }
      throw new Error("bad status");
    } catch (_) {
      renderPolicies(samples.policies, true);
    }
  }
  loadPolicies();

  /* ---- Goal run viewer ---- */
  const goalForm = $("#goal-form");
  const goalTimeline = $("#goal-timeline");
  const goalStatus = $("#goal-status");
  const goalBadge = $("#goal-badge");
  let streamHandle = null;

  function renderGoalSteps(steps, activeIndex) {
    if (!goalTimeline) return;
    goalTimeline.innerHTML = "";
    (steps || []).forEach(function (s, i) {
      const div = document.createElement("div");
      div.className =
        "tl-step" +
        (i < activeIndex ? " done" : "") +
        (i === activeIndex ? " active" : "");
      div.innerHTML =
        "<div class='stage'>" +
        escapeHtml(s.stage || "step") +
        "</div><div class='body'>" +
        escapeHtml(s.detail || s.message || "") +
        "</div>";
      goalTimeline.appendChild(div);
    });
  }

  function playSampleGoal() {
    const run = samples.goalRun;
    if (goalBadge) {
      goalBadge.innerHTML =
        "<span class='badge sample'>Sample run</span> <span class='muted'>" +
        escapeHtml(run.sample_reason || "") +
        "</span>";
    }
    if (goalStatus) {
      goalStatus.textContent = "Playing recorded sample (plan → reason → reflect).";
      goalStatus.className = "form-status";
    }
    let i = 0;
    renderGoalSteps(run.steps, 0);
    const reduce =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      renderGoalSteps(run.steps, run.steps.length);
      return;
    }
    const timer = setInterval(function () {
      i += 1;
      if (i >= run.steps.length) {
        clearInterval(timer);
        renderGoalSteps(run.steps, run.steps.length);
        if (goalStatus) {
          goalStatus.textContent = "Sample run completed.";
          goalStatus.className = "form-status ok";
        }
        return;
      }
      renderGoalSteps(run.steps, i);
    }, 420);
  }

  function normalizeGoalPayload(data) {
    if (!data) return null;
    if (data.steps) return data;
    if (data.events) {
      return {
        sample: !!data.sample,
        sample_reason: data.sample_reason,
        status: data.status,
        steps: data.events.map(function (e) {
          return { stage: e.stage || e.event || "event", detail: e.detail || e.message || "" };
        }),
      };
    }
    if (data.outcome && data.outcome.steps) {
      return Object.assign({ sample: !!data.sample }, data.outcome, {
        sample_reason: data.sample_reason,
      });
    }
    return data;
  }

  if (goalForm) {
    goalForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (streamHandle) streamHandle.close();
      const title = goalForm.goal_title.value.trim();
      const btn = goalForm.querySelector('[type="submit"]');
      btn.disabled = true;
      if (goalStatus) {
        goalStatus.textContent = "Starting goal on /demo/goals…";
        goalStatus.className = "form-status";
      }
      try {
        const res = await api.runGoal({
          title: title,
          action: "achieve",
          constraints: { demo: true, currency: "INR" },
        });
        if (!res.ok || !res.data) throw new Error("HTTP " + res.status);
        const data = res.data;
        if (data.sample || data.fallback === "sample") {
          if (goalBadge) {
            goalBadge.innerHTML =
              "<span class='badge sample'>Sample run (API fallback)</span>";
          }
          const normalized = normalizeGoalPayload(data) || samples.goalRun;
          renderGoalSteps(normalized.steps || samples.goalRun.steps, (normalized.steps || []).length);
          if (goalStatus) {
            goalStatus.textContent =
              data.sample_reason || "API returned a labelled sample run.";
            goalStatus.className = "form-status ok";
          }
          return;
        }
        if (goalBadge) {
          goalBadge.innerHTML = "<span class='badge live'>Live goal run</span>";
        }
        const runId = data.run_id || data.session_id || data.goal_id;
        const steps = [];
        renderGoalSteps(steps, 0);
        if (runId) {
          streamHandle = api.streamGoalEvents(runId, {
            onEvent: function (evt) {
              steps.push({
                stage: evt.stage || evt.event || "event",
                detail: evt.detail || evt.message || JSON.stringify(evt),
              });
              renderGoalSteps(steps, steps.length - 1);
            },
            onDone: function () {
              renderGoalSteps(steps, steps.length);
              if (goalStatus) {
                goalStatus.textContent = "Goal run finished.";
                goalStatus.className = "form-status ok";
              }
            },
            onError: function () {
              // Fall back to polling once
              api.getGoalRun(runId).then(function (r) {
                const n = normalizeGoalPayload(r.data);
                if (n && n.steps) {
                  renderGoalSteps(n.steps, n.steps.length);
                } else {
                  playSampleGoal();
                }
              });
            },
          });
        } else {
          const n = normalizeGoalPayload(data);
          if (n && n.steps) renderGoalSteps(n.steps, n.steps.length);
          else playSampleGoal();
        }
      } catch (_) {
        playSampleGoal();
      } finally {
        btn.disabled = false;
      }
    });
  }

  function formatApiError(detail, status) {
    const helper = window.FinuraFormErrors;
    if (helper && helper.fromDetail) return helper.fromDetail(detail, status);
    if (typeof detail === "string") {
      if (/turnstile/i.test(detail)) {
        return {
          message: "Bot check failed, please retry",
          resetTurnstile: true,
        };
      }
      return { message: detail, resetTurnstile: false };
    }
    return {
      message: status ? "Request failed (" + status + ")." : "Request failed.",
      resetTurnstile: false,
    };
  }

  /* ---- Leads (also used on contact pages) → POST /demo/leads ---- */
  const leadForm = $("#lead-form");
  const turnstile = window.FinuraTurnstile;
  if (leadForm && turnstile && turnstile.enabled()) {
    turnstile.render(leadForm.querySelector("[data-turnstile]")).catch(function () {});
  }
  if (leadForm) {
    leadForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const btn = leadForm.querySelector('[type="submit"]');
      const status = $("#lead-status");
      const turnstileEl = leadForm.querySelector("[data-turnstile]");

      function setLeadErr(msg) {
        if (status) {
          status.textContent = msg;
          status.className = "form-status err";
        }
      }

      const name = (leadForm.name && leadForm.name.value.trim()) || "";
      const email = (leadForm.email && leadForm.email.value.trim()) || "";
      const company =
        (leadForm.company && leadForm.company.value.trim()) || "";
      const missing = [];
      if (!name) missing.push("Name");
      if (!email) missing.push("Work email");
      if (!company) missing.push("Company");
      if (missing.length) {
        setLeadErr("Please fill in: " + missing.join(", "));
        if (!name && leadForm.name) leadForm.name.focus();
        else if (!email && leadForm.email) leadForm.email.focus();
        else if (leadForm.company) leadForm.company.focus();
        return;
      }

      const consent = leadForm.consent && leadForm.consent.checked;
      if (!consent) {
        setLeadErr("Please confirm consent to be contacted.");
        return;
      }
      const plan =
        (leadForm.plan && leadForm.plan.value) ||
        (leadForm.tier && leadForm.tier.value) ||
        "";
      const companySize =
        (leadForm.company_size && leadForm.company_size.value) || "";
      let useCase =
        (leadForm.use_case && leadForm.use_case.value.trim()) || "";
      // Backend accepts extra fields; also echo plan/size into use_case for older handlers.
      if (plan || companySize) {
        const meta = [];
        if (plan) meta.push("plan=" + plan);
        if (companySize) meta.push("company_size=" + companySize);
        useCase = useCase
          ? useCase + "\n\n[" + meta.join(", ") + "]"
          : "[" + meta.join(", ") + "]";
      }
      const payload = {
        name: name,
        email: email,
        company: company,
        role: (leadForm.role && leadForm.role.value) || "",
        use_case: useCase,
        consent: true,
      };
      if (plan) {
        payload.plan = plan;
        payload.tier = plan;
      }
      if (companySize) payload.company_size = companySize;

      if (turnstile && turnstile.enabled()) {
        const token = turnstile.getToken(turnstileEl);
        if (!token) {
          setLeadErr("Please complete the bot check before submitting.");
          return;
        }
        payload.turnstile_token = token;
      }

      function openMailtoFallback(reason) {
        const lines = [
          "Name: " + payload.name,
          "Email: " + payload.email,
          "Company: " + payload.company,
          "Role: " + payload.role,
          plan ? "Plan: " + plan : "",
          companySize ? "Company size: " + companySize : "",
          "",
          payload.use_case || "",
          "",
          "(Submitted via mailto fallback — API post failed: " +
            (reason || "unknown") +
            ")",
        ].filter(function (l, i, arr) {
          return l !== "" || (i > 0 && arr[i - 1] !== "");
        });
        const subject = encodeURIComponent(
          "FINURA lead — " + (payload.name || payload.email || "contact")
        );
        const body = encodeURIComponent(lines.join("\n"));
        window.location.href =
          "mailto:tatikunta.k@gmail.com?subject=" + subject + "&body=" + body;
      }

      btn.disabled = true;
      if (status) {
        status.textContent = "Sending to /demo/leads…";
        status.className = "form-status";
      }
      try {
        const res = await api.submitLead(payload);
        if (res.ok) {
          leadForm.reset();
          if (turnstile) turnstile.reset(turnstileEl);
          const msg =
            (res.data && res.data.message) ||
            "Thanks — we received your request.";
          if (status) {
            status.textContent = msg;
            status.className = "form-status ok";
          }
          const success = $("#lead-success");
          if (success) success.hidden = false;
          return;
        }

        const formatted = formatApiError(
          res.data &&
            (res.data.detail !== undefined ? res.data.detail : res.data.message),
          res.status
        );
        // Client/validation errors: show message only. Mailto only when the post itself fails.
        if (res.status >= 400 && res.status < 500) {
          setLeadErr(formatted.message);
          if (turnstile) turnstile.reset(turnstileEl);
          return;
        }

        if (status) {
          status.textContent =
            formatted.message + " Opening your email client as a fallback…";
          status.className = "form-status err";
        }
        if (turnstile) turnstile.reset(turnstileEl);
        openMailtoFallback(formatted.message);
      } catch (err) {
        const reason =
          (err && err.message) || "Could not reach the demo API";
        if (status) {
          status.textContent =
            reason + " Opening your email client as a fallback…";
          status.className = "form-status err";
        }
        if (turnstile) turnstile.reset(turnstileEl);
        openMailtoFallback(reason);
      } finally {
        btn.disabled = false;
      }
    });
  }
})();
