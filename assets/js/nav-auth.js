/**
 * Updates Sign in / Dashboard nav affordances from Firebase (or mock) auth state.
 * Safe to include on public pages; no-ops if auth scripts are absent.
 */
(function () {
  function setLink(el, href, label) {
    if (!el) return;
    el.href = href;
    el.textContent = label;
    el.hidden = false;
  }

  function apply(user) {
    const cfg = window.FINURA_CONFIG || {};
    const links = document.querySelectorAll("[data-auth-nav]");
    links.forEach(function (el) {
      if (user) {
        setLink(el, "/app/", "Dashboard");
      } else if (cfg.SELF_SERVE_ENABLED || (window.FinuraAuth && window.FinuraAuth.isMock())) {
        setLink(el, "/auth/", "Sign in");
      } else {
        // Self-serve off: still offer Sign in entry (early-access gate on /auth/).
        setLink(el, "/auth/", "Sign in");
      }
    });
  }

  function boot() {
    if (window.FinuraAuth && window.FinuraAuth.onAuthStateChanged) {
      window.FinuraAuth.init();
      window.FinuraAuth.onAuthStateChanged(apply);
    } else {
      apply(null);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
