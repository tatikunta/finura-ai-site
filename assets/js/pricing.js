/**
 * Pricing page: INR/USD toggle, FAQ accordion, and CTAs honouring
 * SELF_SERVE_ENABLED / BILLING_ENABLED.
 * Free → sign-up when self-serve is on; paid plans stay early-access until billing.
 */
(function () {
  const cfg = window.FINURA_CONFIG || {};
  const selfServe = !!cfg.SELF_SERVE_ENABLED;
  const billing = !!cfg.BILLING_ENABLED;

  /* —— Currency toggle (Phase 1) —— */
  const buttons = document.querySelectorAll(".currency-toggle [data-currency]");
  const prices = document.querySelectorAll(".pricing-card .price[data-inr]");

  function setCurrency(code) {
    buttons.forEach(function (btn) {
      const on = btn.getAttribute("data-currency") === code;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    prices.forEach(function (el) {
      const amount = el.querySelector(".amount");
      if (!amount) return;
      amount.textContent =
        code === "USD" ? el.getAttribute("data-usd") : el.getAttribute("data-inr");
    });
  }

  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setCurrency(btn.getAttribute("data-currency"));
    });
  });

  document.querySelectorAll("#faq .policy-item").forEach(function (item) {
    item.addEventListener("click", function () {
      const open = item.getAttribute("aria-expanded") === "true";
      document.querySelectorAll("#faq .policy-item").forEach(function (other) {
        other.setAttribute("aria-expanded", "false");
      });
      item.setAttribute("aria-expanded", open ? "false" : "true");
    });
  });

  /* —— Feature-flag CTAs (Phase 4) —— */
  function authUrl(planId) {
    const q = new URLSearchParams();
    if (planId) q.set("plan", planId);
    if (planId && planId !== "free" && billing) q.set("checkout", "1");
    try {
      const h = (location.hostname || "").toLowerCase();
      const prod =
        h === "finuraai.org" ||
        h === "www.finuraai.org" ||
        h.endsWith(".finuraai.org");
      if (!prod) {
        if (new URLSearchParams(location.search).get("mock") === "1") q.set("mock", "1");
        else if (localStorage.getItem("finura_mock") === "1") q.set("mock", "1");
      }
    } catch (_) {}
    const s = q.toString();
    return "/auth/" + (s ? "?" + s : "");
  }

  document.querySelectorAll("[data-plan-cta]").forEach(function (btn) {
    const plan = btn.getAttribute("data-plan-cta");
    const earlyHref = btn.getAttribute("data-early-href") || "/contact/";
    const earlyLabel = btn.getAttribute("data-early-label") || "Request early access";

    if (!selfServe) {
      btn.href = earlyHref;
      btn.textContent = earlyLabel;
      return;
    }

    if (plan === "enterprise") {
      btn.href = earlyHref;
      btn.textContent = btn.getAttribute("data-enterprise-label") || "Contact sales";
      return;
    }

    if (plan === "free") {
      btn.href = authUrl("free");
      btn.textContent = "Start free";
      return;
    }

    if (!billing) {
      btn.href = earlyHref;
      btn.textContent = earlyLabel;
      return;
    }

    btn.href = authUrl(plan);
    btn.textContent = "Start " + (plan.charAt(0).toUpperCase() + plan.slice(1));
  });

  const banner = document.getElementById("pricing-mode-banner");
  if (banner) {
    if (!selfServe) {
      banner.hidden = false;
      banner.textContent =
        "Self-serve signup is not enabled yet — join the waitlist and we will provision access.";
    } else if (!billing) {
      banner.hidden = false;
      banner.textContent =
        "Free accounts are open. Paid plans stay on early access / waitlist until BILLING_ENABLED (Razorpay) is turned on.";
    } else {
      banner.hidden = true;
    }
  }
})();
