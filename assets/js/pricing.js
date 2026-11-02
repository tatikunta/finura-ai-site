/**
 * Pricing page: INR/USD toggle, FAQ accordion, and CTAs honouring
 * SELF_SERVE_ENABLED / BILLING_ENABLED.
 * Free → sign-up when self-serve is on; paid → auth then Cashfree when billing on.
 */
(function () {
  const cfg = window.FINURA_CONFIG || {};
  const selfServe = !!cfg.SELF_SERVE_ENABLED;
  const billing = !!cfg.BILLING_ENABLED;
  let currency = "INR";

  /* —— Currency toggle (Phase 1) —— */
  const buttons = document.querySelectorAll(".currency-toggle [data-currency]");
  const prices = document.querySelectorAll(".pricing-card .price[data-inr]");

  function setCurrency(code) {
    currency = code === "USD" ? "USD" : "INR";
    buttons.forEach(function (btn) {
      const on = btn.getAttribute("data-currency") === currency;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    prices.forEach(function (el) {
      const amount = el.querySelector(".amount");
      if (!amount) return;
      amount.textContent =
        currency === "USD" ? el.getAttribute("data-usd") : el.getAttribute("data-inr");
    });
    // Refresh paid CTA hrefs so currency rides along to checkout.
    wirePlanCtas();
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

  function mockQuery() {
    try {
      const h = (location.hostname || "").toLowerCase();
      const prod =
        h === "finuraai.org" ||
        h === "www.finuraai.org" ||
        h.endsWith(".finuraai.org");
      if (prod) return "";
      if (new URLSearchParams(location.search).get("mock") === "1") return "mock=1";
      if (localStorage.getItem("finura_mock") === "1") return "mock=1";
    } catch (_) {}
    return "";
  }

  function authUrl(planId) {
    const q = new URLSearchParams();
    if (planId) q.set("plan", planId);
    if (planId && planId !== "free" && billing) {
      q.set("checkout", "1");
      q.set("currency", currency);
    }
    const mock = mockQuery();
    if (mock) q.set("mock", "1");
    const s = q.toString();
    return "/auth/" + (s ? "?" + s : "");
  }

  function appCheckoutUrl(planId) {
    const q = new URLSearchParams();
    q.set("tab", "billing");
    q.set("plan", planId);
    q.set("checkout", "1");
    q.set("currency", currency);
    const mock = mockQuery();
    if (mock) q.set("mock", "1");
    return "/app/?" + q.toString();
  }

  function currentUser() {
    return window.FinuraAuth && window.FinuraAuth.currentUser
      ? window.FinuraAuth.currentUser()
      : null;
  }

  function wirePlanCtas() {
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
        btn.href = currentUser() ? "/app/" : authUrl("free");
        btn.textContent = "Start free";
        return;
      }

      if (!billing) {
        btn.href = earlyHref;
        btn.textContent = earlyLabel;
        return;
      }

      // Signed-in → dashboard checkout; otherwise sign-in first (preserves plan + currency).
      btn.href = currentUser() ? appCheckoutUrl(plan) : authUrl(plan);
      btn.textContent = "Start " + (plan.charAt(0).toUpperCase() + plan.slice(1));
    });
  }

  wirePlanCtas();

  // Re-wire when auth resolves so signed-in users skip /auth/.
  if (window.FinuraAuth && window.FinuraAuth.onAuthStateChanged) {
    window.FinuraAuth.init();
    window.FinuraAuth.onAuthStateChanged(function () {
      wirePlanCtas();
    });
  }

  const banner = document.getElementById("pricing-mode-banner");
  if (banner) {
    if (!selfServe) {
      banner.hidden = false;
      banner.textContent =
        "Self-serve signup is not enabled yet — join the waitlist and we will provision access.";
    } else if (!billing) {
      banner.hidden = false;
      banner.textContent =
        "Free accounts are open. Paid plans stay on early access / waitlist until BILLING_ENABLED (Cashfree) is turned on.";
    } else {
      banner.hidden = true;
    }
  }
})();
