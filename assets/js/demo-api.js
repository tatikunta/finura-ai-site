/**
 * Browser client for FINURA /demo/* routes only.
 * Never embeds API tokens. Optional short-lived bearer from GET /demo/bootstrap.
 */
(function (global) {
  const cfg = () => global.FINURA_CONFIG || {};
  let sessionToken = null;
  let bootstrapAttempted = false;

  function assertDemoPath(path) {
    const prefix = cfg().DEMO_PREFIX || "/demo";
    if (!path.startsWith(prefix + "/") && path !== prefix) {
      throw new Error("Demo client may only call " + prefix + "/* routes");
    }
  }

  function apiUrl(path) {
    assertDemoPath(path);
    const base = (cfg().API_BASE || "").replace(/\/$/, "");
    return base + path;
  }

  async function bootstrapIfNeeded() {
    if (sessionToken || bootstrapAttempted) return sessionToken;
    bootstrapAttempted = true;
    const boot = cfg().BOOTSTRAP_PATH;
    if (!boot) return null;
    try {
      assertDemoPath(boot);
      const res = await fetch(apiUrl(boot), {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "omit",
      });
      if (!res.ok) return null;
      const data = await res.json();
      // Accepted shapes from PR A: { access_token } | { token } | { demo_token }
      sessionToken = data.access_token || data.token || data.demo_token || null;
      return sessionToken;
    } catch (_) {
      return null;
    }
  }

  async function demoFetch(path, options = {}) {
    assertDemoPath(path);
    const timeout = cfg().REQUEST_TIMEOUT_MS || 25000;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    const headers = Object.assign(
      { Accept: "application/json" },
      options.headers || {}
    );
    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    if (sessionToken) {
      headers.Authorization = "Bearer " + sessionToken;
    }

    try {
      let res = await fetch(apiUrl(path), {
        method: options.method || "GET",
        headers,
        body: options.body,
        signal: ctrl.signal,
        credentials: "omit",
      });

      if (res.status === 401 && !sessionToken) {
        const tok = await bootstrapIfNeeded();
        if (tok) {
          headers.Authorization = "Bearer " + tok;
          res = await fetch(apiUrl(path), {
            method: options.method || "GET",
            headers,
            body: options.body,
            signal: ctrl.signal,
            credentials: "omit",
          });
        }
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
      return { ok: res.ok, status: res.status, data, headers: res.headers };
    } finally {
      clearTimeout(timer);
    }
  }

  async function getPolicies() {
    return demoFetch("/demo/policies");
  }

  async function submitRefund(payload) {
    return demoFetch("/demo/refunds", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async function getRefund(decisionId) {
    return demoFetch("/demo/refunds/" + encodeURIComponent(decisionId));
  }

  async function runGoal(payload) {
    return demoFetch("/demo/goals", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async function getGoalRun(runId) {
    return demoFetch("/demo/goals/" + encodeURIComponent(runId));
  }

  /**
   * Stream goal events. EventSource cannot send Authorization headers, so when a
   * bootstrap bearer is present we poll GET /demo/goals/{id} instead of SSE.
   * Prefer public (no-token) /demo streams from PR A for true SSE.
   */
  function streamGoalEvents(runId, handlers) {
    let closed = false;
    if (sessionToken) {
      let ticks = 0;
      const timer = setInterval(async function () {
        if (closed) return;
        ticks += 1;
        try {
          const res = await getGoalRun(runId);
          const data = res.data || {};
          const events = data.events || data.steps || [];
          events.forEach(function (evt) {
            handlers.onEvent && handlers.onEvent(evt);
          });
          if (
            data.status === "completed" ||
            data.status === "failed" ||
            data.done ||
            ticks >= 40
          ) {
            clearInterval(timer);
            handlers.onDone && handlers.onDone(data);
          }
        } catch (err) {
          clearInterval(timer);
          handlers.onError && handlers.onError(err);
        }
      }, 800);
      return {
        close: function () {
          closed = true;
          clearInterval(timer);
        },
      };
    }

    const url = apiUrl(
      "/demo/goals/" + encodeURIComponent(runId) + "/events/stream"
    );
    let es;
    try {
      es = new EventSource(url);
    } catch (err) {
      handlers.onError && handlers.onError(err);
      return { close: function () {} };
    }
    es.onmessage = function (msg) {
      try {
        const evt = JSON.parse(msg.data);
        handlers.onEvent && handlers.onEvent(evt);
        if (evt.done || evt.status === "completed" || evt.status === "failed") {
          handlers.onDone && handlers.onDone(evt);
          es.close();
        }
      } catch (e) {
        handlers.onError && handlers.onError(e);
      }
    };
    es.onerror = function () {
      handlers.onError && handlers.onError(new Error("Event stream unavailable"));
      es.close();
    };
    return {
      close: function () {
        closed = true;
        es.close();
      },
    };
  }

  async function submitLead(payload) {
    return demoFetch("/demo/leads", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async function health() {
    return demoFetch("/demo/health");
  }

  global.FinuraDemoApi = {
    apiUrl,
    demoFetch,
    getPolicies,
    submitRefund,
    getRefund,
    runGoal,
    getGoalRun,
    streamGoalEvents,
    submitLead,
    health,
    bootstrapIfNeeded,
  };
})(window);
