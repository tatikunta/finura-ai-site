/**
 * Client for /v1/account/* and GET /v1/plans.
 * Sends Firebase ID token as Bearer. Falls back to FinuraMockAccount when
 * MOCK_MODE / localhost / ?mock=1, or when live self-serve returns 404.
 */
(function (global) {
  const cfg = () => global.FINURA_CONFIG || {};

  function apiUrl(path) {
    const base = (cfg().API_BASE || "").replace(/\/$/, "");
    return base + path;
  }

  /** Production site hosts — mock API must never activate here. */
  function isProductionHost() {
    const h = (location.hostname || "").toLowerCase();
    return (
      h === "finuraai.org" ||
      h === "www.finuraai.org" ||
      h.endsWith(".finuraai.org")
    );
  }

  function shouldMock() {
    if (isProductionHost()) {
      try {
        localStorage.removeItem("finura_mock");
      } catch (_) {}
      return false;
    }
    if (cfg().MOCK_MODE) return true;
    try {
      const q = new URLSearchParams(location.search);
      if (q.get("mock") === "1") {
        localStorage.setItem("finura_mock", "1");
        return true;
      }
      if (localStorage.getItem("finura_mock") === "1") return true;
    } catch (_) {}
    return (
      location.hostname === "localhost" || location.hostname === "127.0.0.1"
    );
  }

  function profileFromAuth() {
    const u = global.FinuraAuth && global.FinuraAuth.currentUser();
    if (!u) return null;
    return {
      email: u.email,
      displayName: u.displayName,
      photoURL: u.photoURL,
    };
  }

  async function mockRequest(method, path, body) {
    if (!global.FinuraMockAccount) {
      throw Object.assign(new Error("Mock account module missing"), {
        status: 500,
        code: "mock_unavailable",
      });
    }
    const data = await global.FinuraMockAccount.handle(
      method,
      path,
      body || null,
      profileFromAuth()
    );
    return { ok: true, status: 201, data: data, mock: true };
  }

  function parseError(status, data) {
    const detail = data && data.detail;
    let code = "http_" + status;
    let message = "Request failed (" + status + ")";
    if (detail && typeof detail === "object") {
      code = detail.code || code;
      message = detail.message || message;
    } else if (typeof detail === "string") {
      message = detail;
    }
    return { code: code, message: message, status: status, data: data };
  }

  async function accountFetch(path, options) {
    options = options || {};
    const method = (options.method || "GET").toUpperCase();
    const body = options.body;

    if (shouldMock()) {
      return mockRequest(method, path, body);
    }

    const timeout = cfg().REQUEST_TIMEOUT_MS || 25000;
    const ctrl = new AbortController();
    const timer = setTimeout(function () {
      ctrl.abort();
    }, timeout);

    try {
      const token =
        global.FinuraAuth && (await global.FinuraAuth.getIdToken());
      const headers = Object.assign(
        { Accept: "application/json" },
        options.headers || {}
      );
      if (body != null && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }
      if (
        token &&
        (path === "/v1/account" || path.indexOf("/v1/account/") === 0)
      ) {
        headers.Authorization = "Bearer " + token;
      }
      if (options.idempotencyKey) {
        headers["Idempotency-Key"] = String(options.idempotencyKey).slice(0, 128);
      }

      let res;
      try {
        res = await fetch(apiUrl(path), {
          method: method,
          headers: headers,
          body: body != null ? JSON.stringify(body) : undefined,
          signal: ctrl.signal,
          credentials: "omit",
        });
      } catch (networkErr) {
        if (shouldMock() || cfg().MOCK_MODE) {
          return mockRequest(method, path, body);
        }
        throw Object.assign(networkErr, {
          status: 0,
          code: "network_error",
          message: "Network error talking to API",
        });
      }

      // Self-serve not deployed yet — graceful mock fallback for screenshots/dev.
      if (
        (res.status === 404 || res.status === 501 || res.status === 503) &&
        (global.FinuraAuth && global.FinuraAuth.isMock())
      ) {
        return mockRequest(method, path, body);
      }

      const text = await res.text();
      let data = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (_) {
          data = { raw: text };
        }
      }

      if (!res.ok) {
        const err = parseError(res.status, data);
        const e = new Error(err.message);
        Object.assign(e, err);
        throw e;
      }

      return { ok: true, status: res.status, data: data, mock: false };
    } finally {
      clearTimeout(timer);
    }
  }

  function getPlans() {
    return accountFetch("/v1/plans");
  }
  function bootstrap(payload) {
    return accountFetch("/v1/account/bootstrap", {
      method: "POST",
      body: payload || {},
    });
  }
  function getMe() {
    return accountFetch("/v1/account/me");
  }
  function getPlan() {
    return accountFetch("/v1/account/plan");
  }
  function getUsage() {
    return accountFetch("/v1/account/usage");
  }
  function getCredits() {
    return accountFetch("/v1/account/credits");
  }
  function getCreditsHistory(limit, offset) {
    const q =
      "?limit=" +
      encodeURIComponent(limit || 50) +
      "&offset=" +
      encodeURIComponent(offset || 0);
    return accountFetch("/v1/account/credits/history" + q);
  }
  function listApiKeys() {
    return accountFetch("/v1/account/api-keys");
  }
  function createApiKey(name, scopes) {
    return accountFetch("/v1/account/api-keys", {
      method: "POST",
      body: { name: name || "Default", scopes: scopes || null },
    });
  }
  function revokeApiKey(keyId) {
    return accountFetch("/v1/account/api-keys/" + encodeURIComponent(keyId), {
      method: "DELETE",
    });
  }
  function getBilling() {
    return accountFetch("/v1/account/billing");
  }
  function checkout(planId, currency) {
    return accountFetch("/v1/account/billing/checkout", {
      method: "POST",
      body: { plan_id: planId, currency: currency || "INR" },
    });
  }
  function getInvoices() {
    return accountFetch("/v1/account/billing/invoices");
  }
  function playgroundDecision(payload, idempotencyKey) {
    return accountFetch("/v1/account/playground/decisions", {
      method: "POST",
      body: payload,
      idempotencyKey: idempotencyKey || "pg_" + Date.now().toString(36),
    });
  }
  function exportAccount() {
    // ECRP: GET /v1/account/data-export (not /export)
    return accountFetch("/v1/account/data-export");
  }
  function deleteAccount() {
    // ECRP: DELETE /v1/account requires X-Confirm-Delete: DELETE
    return accountFetch("/v1/account", {
      method: "DELETE",
      headers: { "X-Confirm-Delete": "DELETE" },
    });
  }

  /**
   * Open Razorpay Checkout with the payload returned by POST .../billing/checkout.
   * Resolves when payment succeeds; rejects on dismiss/failure.
   */
  function openRazorpayCheckout(checkoutRes) {
    return new Promise(function (resolve, reject) {
      if (!checkoutRes) {
        reject(new Error("Missing checkout response"));
        return;
      }
      if (checkoutRes._mock_activated || checkoutRes.provider === "local") {
        resolve({ mock: true, plan_id: checkoutRes.plan_id });
        return;
      }
      if (typeof Razorpay === "undefined") {
        reject(new Error("Razorpay Checkout.js not loaded"));
        return;
      }
      const payload = checkoutRes.checkout_payload || {};
      const options = Object.assign({}, payload, {
        key: checkoutRes.key_id || payload.key_id,
        handler: function (response) {
          resolve(response);
        },
        modal: {
          ondismiss: function () {
            reject(Object.assign(new Error("Checkout dismissed"), { code: "dismissed" }));
          },
        },
      });
      if (checkoutRes.subscription_id) {
        options.subscription_id = checkoutRes.subscription_id;
      }
      if (checkoutRes.order_id) {
        options.order_id = checkoutRes.order_id;
      }
      const rzp = new Razorpay(options);
      rzp.on("payment.failed", function (resp) {
        reject(
          Object.assign(new Error("Payment failed"), {
            code: "payment_failed",
            data: resp,
          })
        );
      });
      rzp.open();
    });
  }

  global.FinuraAccountApi = {
    apiUrl,
    shouldMock,
    accountFetch,
    getPlans,
    bootstrap,
    getMe,
    getPlan,
    getUsage,
    getCredits,
    getCreditsHistory,
    listApiKeys,
    createApiKey,
    revokeApiKey,
    getBilling,
    checkout,
    getInvoices,
    playgroundDecision,
    exportAccount,
    deleteAccount,
    openRazorpayCheckout,
  };
})(window);
