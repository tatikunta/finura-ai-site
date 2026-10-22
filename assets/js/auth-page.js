(function () {
  const api = window.FinuraAccountApi;
  const auth = window.FinuraAuth;
  const status = document.getElementById("auth-status");
  const modeBanner = document.getElementById("auth-mode-banner");
  const form = document.getElementById("email-form");
  const toggle = document.getElementById("auth-mode-toggle");
  const title = document.getElementById("auth-title");
  const submitBtn = document.getElementById("email-submit");
  const nameField = document.getElementById("display-name-field");
  let mode = "signin"; // signin | signup

  const params = new URLSearchParams(location.search);
  const planIntent = params.get("plan");
  const wantsCheckout = params.get("checkout") === "1";
  if (params.get("mock") === "1") {
    try {
      localStorage.setItem("finura_mock", "1");
    } catch (_) {}
  }

  function setStatus(msg, kind) {
    if (!status) return;
    status.textContent = msg || "";
    status.className = "form-status" + (kind ? " " + kind : "");
  }

  function setMode(next) {
    mode = next;
    if (title) title.textContent = mode === "signup" ? "Create account" : "Sign in";
    if (submitBtn) submitBtn.textContent = mode === "signup" ? "Create account" : "Sign in";
    if (nameField) nameField.hidden = mode !== "signup";
    if (toggle) {
      toggle.textContent =
        mode === "signup"
          ? "Already have an account? Sign in"
          : "Need an account? Sign up";
    }
  }

  if (toggle) {
    toggle.addEventListener("click", function (e) {
      e.preventDefault();
      setMode(mode === "signup" ? "signin" : "signup");
    });
  }

  if (modeBanner) {
    const cfg = window.FINURA_CONFIG || {};
    if (auth.isMock()) {
      modeBanner.hidden = false;
      modeBanner.textContent =
        "Dev mock auth — Firebase placeholders are not configured (or ?mock=1). Self-serve API routes are mocked locally.";
    } else if (!cfg.SELF_SERVE_ENABLED) {
      modeBanner.hidden = false;
      modeBanner.textContent =
        "Self-serve is flagged off (SELF_SERVE_ENABLED=false). You can still sign in once Firebase is configured; live /v1/account routes require the backend flag.";
    }
  }

  async function afterAuth() {
    setStatus("Preparing your account…");
    try {
      await api.bootstrap(
        planIntent
          ? { account_name: undefined, account_type: "individual" }
          : {}
      );
    } catch (err) {
      // getMe auto-bootstraps on backend; bootstrap may 404 in mock-off live.
      try {
        await api.getMe();
      } catch (err2) {
        setStatus(err2.message || "Could not bootstrap account", "err");
        return;
      }
    }

    if (planIntent && planIntent !== "free" && wantsCheckout) {
      const cfg = window.FINURA_CONFIG || {};
      if (cfg.BILLING_ENABLED) {
        location.href = "/app/?tab=billing&plan=" + encodeURIComponent(planIntent) + "&checkout=1";
        return;
      }
    }
    if (planIntent && planIntent !== "free") {
      location.href = "/app/?tab=billing&plan=" + encodeURIComponent(planIntent);
      return;
    }
    location.href = "/app/";
  }

  auth.onAuthStateChanged(function (user) {
    if (user && !document.body.dataset.authBusy) {
      afterAuth();
    }
  });

  const googleBtn = document.getElementById("google-signin");
  if (googleBtn) {
    googleBtn.addEventListener("click", async function () {
      document.body.dataset.authBusy = "1";
      setStatus("Opening Google…");
      try {
        await auth.signInWithGoogle();
        await afterAuth();
      } catch (err) {
        setStatus(err.message || "Google sign-in failed", "err");
      } finally {
        delete document.body.dataset.authBusy;
      }
    });
  }

  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      document.body.dataset.authBusy = "1";
      const email = form.email.value.trim();
      const password = form.password.value;
      const displayName = form.display_name ? form.display_name.value.trim() : "";
      setStatus(mode === "signup" ? "Creating account…" : "Signing in…");
      try {
        if (mode === "signup") {
          await auth.signUpWithEmail(email, password, displayName);
        } else {
          await auth.signInWithEmail(email, password);
        }
        await afterAuth();
      } catch (err) {
        setStatus(err.message || "Authentication failed", "err");
      } finally {
        delete document.body.dataset.authBusy;
      }
    });
  }

  setMode("signin");
})();
