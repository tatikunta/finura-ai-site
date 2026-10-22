/**
 * Pricing CTAs honour SELF_SERVE_ENABLED / BILLING_ENABLED.
 * Early-access mode keeps contact-sales behaviour when the flag is false.
 */
(function () {
  const cfg = window.FINURA_CONFIG || {};
  const selfServe = !!cfg.SELF_SERVE_ENABLED;
  const billing = !!cfg.BILLING_ENABLED;

  function authUrl(planId) {
    const q = new URLSearchParams();
    if (planId) q.set("plan", planId);
    if (planId && planId !== "free" && billing) q.set("checkout", "1");
    // Preserve mock for local/screenshot flows
    try {
      if (new URLSearchParams(location.search).get("mock") === "1") q.set("mock", "1");
      else if (localStorage.getItem("finura_mock") === "1") q.set("mock", "1");
    } catch (_) {}
    const s = q.toString();
    return "/auth/" + (s ? "?" + s : "");
  }

  document.querySelectorAll("[data-plan-cta]").forEach(function (btn) {
    const plan = btn.getAttribute("data-plan-cta");
    const earlyHref = btn.getAttribute("data-early-href") || "/#contact";
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

    btn.href = authUrl(plan);
    btn.textContent = billing ? "Start " + (plan.charAt(0).toUpperCase() + plan.slice(1)) : "Sign up";
  });

  const banner = document.getElementById("pricing-mode-banner");
  if (banner) {
    if (!selfServe) {
      banner.hidden = false;
      banner.textContent =
        "Self-serve signup is not enabled yet — request early access and we will provision a pilot tenant.";
    } else if (!billing) {
      banner.hidden = false;
      banner.textContent =
        "Accounts are open on Free. Paid checkout (Razorpay) enables when BILLING_ENABLED is turned on.";
    } else {
      banner.hidden = true;
    }
  }
})();
