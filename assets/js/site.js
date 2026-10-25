(function (global) {
  const FIELD_LABELS = {
    name: "Name",
    email: "Work email",
    company: "Company",
    company_size: "Company size",
    role: "Role",
    plan: "Plan",
    tier: "Plan",
    use_case: "Use case",
    consent: "Consent",
    turnstile_token: "Bot check",
    transaction_id: "Transaction ID",
    amount: "Amount",
    amount_inr: "Amount",
    evidence_refs: "Evidence",
    reason: "Refund reason",
    goal_title: "Goal",
    password: "Password",
    display_name: "Name",
  };

  function fieldLabel(name) {
    if (!name) return "Field";
    if (FIELD_LABELS[name]) return FIELD_LABELS[name];
    return String(name)
      .replace(/_/g, " ")
      .replace(/\b\w/g, function (c) {
        return c.toUpperCase();
      });
  }

  function isTurnstileMessage(text) {
    return /turnstile/i.test(text || "");
  }

  /**
   * Humanize FastAPI / API error payloads.
   * - detail: [{loc,msg},…] → "Please fill in: Company, Name"
   * - detail string mentioning turnstile → bot-check copy + resetTurnstile
   * Returns { message, resetTurnstile }.
   */
  function fromDetail(detail, status) {
    if (typeof detail === "string") {
      if (isTurnstileMessage(detail)) {
        return {
          message: "Bot check failed, please retry",
          resetTurnstile: true,
        };
      }
      return { message: detail, resetTurnstile: false };
    }

    if (Array.isArray(detail) && detail.length) {
      const names = [];
      const seen = Object.create(null);
      let turnstile = false;
      detail.forEach(function (item) {
        if (!item || typeof item !== "object") return;
        const loc = item.loc || [];
        const field = loc.length ? loc[loc.length - 1] : "";
        const msg = item.msg || "";
        if (isTurnstileMessage(String(field)) || isTurnstileMessage(msg)) {
          turnstile = true;
          return;
        }
        if (field && field !== "body" && field !== "query" && field !== "path") {
          const label = fieldLabel(field);
          if (!seen[label]) {
            seen[label] = true;
            names.push(label);
          }
        }
      });
      if (turnstile && !names.length) {
        return {
          message: "Bot check failed, please retry",
          resetTurnstile: true,
        };
      }
      if (names.length) {
        return {
          message: "Please fill in: " + names.join(", "),
          resetTurnstile: turnstile,
        };
      }
      const first = detail[0];
      if (first && first.msg) {
        return { message: String(first.msg), resetTurnstile: turnstile };
      }
    }

    if (detail && typeof detail === "object") {
      const msg = detail.message || detail.msg || detail.code;
      if (msg) {
        if (isTurnstileMessage(String(msg))) {
          return {
            message: "Bot check failed, please retry",
            resetTurnstile: true,
          };
        }
        return { message: String(msg), resetTurnstile: false };
      }
    }

    if (status === 429) {
      return {
        message: "Rate limited — try again shortly.",
        resetTurnstile: false,
      };
    }
    return {
      message: status ? "Request failed (" + status + ")." : "Request failed.",
      resetTurnstile: false,
    };
  }

  global.FinuraFormErrors = {
    fieldLabel: fieldLabel,
    fromDetail: fromDetail,
    isTurnstileMessage: isTurnstileMessage,
  };

  const nav = document.querySelector("nav");
  const toggle = document.querySelector(".nav-toggle");
  if (nav && toggle) {
    toggle.addEventListener("click", function () {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  if (typeof IntersectionObserver !== "undefined") {
    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (x) {
          if (x.isIntersecting) {
            x.target.classList.add("in");
            io.unobserve(x.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    document.querySelectorAll(".reveal").forEach(function (el) {
      io.observe(el);
    });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) {
      el.classList.add("in");
    });
  }
})(window);
