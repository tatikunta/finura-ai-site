(function () {
  const api = window.FinuraAccountApi;
  const auth = window.FinuraAuth;
  const turnstile = window.FinuraTurnstile;
  const status = document.getElementById("auth-status");
  const modeBanner = document.getElementById("auth-mode-banner");
  const form = document.getElementById("email-form");
  const toggle = document.getElementById("auth-mode-toggle");
  const title = document.getElementById("auth-title");
  const submitBtn = document.getElementById("email-submit");
  const nameField = document.getElementById("display-name-field");
  const forgotLink = document.getElementById("forgot-password");
  let mode = "signin"; // signin | signup

  const params = new URLSearchParams(location.search);
  const planIntent = params.get("plan");
  const wantsCheckout = params.get("checkout") === "1";
  // Mock sticky flag is local/dev only — never persist on finuraai.org.
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
    if (forgotLink) forgotLink.hidden = mode !== "signin";
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

  if (turnstile && turnstile.enabled()) {
    turnstile.render().catch(function () {
      setStatus("Could not load bot check. Try refreshing.", "err");
    });
  }

  async function requireTurnstileToken() {
    if (!turnstile || !turnstile.enabled()) return "";
    const token = turnstile.getToken();
    if (!token) {
      throw new Error("Please complete the bot check before continuing.");
    }
    return token;
  }

  function humanizeAuthError(err) {
    const raw = (err && err.message) || "";
    const helper = window.FinuraFormErrors;
    if (helper && helper.isTurnstileMessage && helper.isTurnstileMessage(raw)) {
      return "Bot check failed, please retry";
    }
    if (/turnstile/i.test(raw)) return "Bot check failed, please retry";
    if (err && err.code === "turnstile_failed") {
      return "Bot check failed, please retry";
    }
    return raw || "Authentication failed";
  }

  async function afterAuth(turnstileToken) {
    setStatus("Preparing your account…");
    try {
      const payload = planIntent
        ? { account_name: undefined, account_type: "individual" }
        : {};
      if (turnstileToken) payload.turnstile_token = turnstileToken;
      await api.bootstrap(payload);
    } catch (err) {
      if (
        (err && err.code === "turnstile_failed") ||
        /turnstile/i.test((err && err.message) || "")
      ) {
        setStatus("Bot check failed, please retry", "err");
        if (turnstile) turnstile.reset();
        return;
      }
      // getMe auto-bootstraps on backend; bootstrap may 404 in mock-off live.
      try {
        await api.getMe();
      } catch (err2) {
        setStatus(humanizeAuthError(err2) || "Could not bootstrap account", "err");
        if (
          (err2 && err2.code === "turnstile_failed") ||
          /turnstile/i.test((err2 && err2.message) || "")
        ) {
          if (turnstile) turnstile.reset();
        }
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
      afterAuth("");
    }
  });

  const googleBtn = document.getElementById("google-signin");
  if (googleBtn) {
    googleBtn.addEventListener("click", async function () {
      document.body.dataset.authBusy = "1";
      setStatus("Opening Google…");
      try {
        const turnstileToken = await requireTurnstileToken();
        await auth.signInWithGoogle();
        await afterAuth(turnstileToken);
      } catch (err) {
        setStatus(humanizeAuthError(err) || "Google sign-in failed", "err");
        if (turnstile) turnstile.reset();
      } finally {
        delete document.body.dataset.authBusy;
      }
    });
  }

  if (forgotLink) {
    forgotLink.addEventListener("click", async function (e) {
      e.preventDefault();
      const emailInput = form && form.email;
      const email = emailInput && emailInput.value.trim();
      if (!email) {
        setStatus("Enter your email above, then click Forgot password.", "err");
        if (emailInput) emailInput.focus();
        return;
      }
      setStatus("Sending password reset email…");
      try {
        await auth.sendPasswordResetEmail(email);
        setStatus(
          "Password reset email sent to " + email + ". Check your inbox.",
          "ok"
        );
      } catch (err) {
        setStatus(err.message || "Could not send reset email", "err");
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
        const turnstileToken = await requireTurnstileToken();
        if (mode === "signup") {
          await auth.signUpWithEmail(email, password, displayName);
        } else {
          await auth.signInWithEmail(email, password);
        }
        await afterAuth(turnstileToken);
      } catch (err) {
        setStatus(humanizeAuthError(err), "err");
        if (turnstile) turnstile.reset();
      } finally {
        delete document.body.dataset.authBusy;
      }
    });
  }

  setMode("signin");
})();
