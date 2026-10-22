/**
 * Contract-faithful mock for /v1/account/* when self-serve is not deployed.
 * Used for local preview and screenshots only — no secrets.
 */
(function (global) {
  const PLANS = [
    {
      id: "free",
      name: "Free",
      price_inr: 0,
      price_usd: 0,
      monthly_credits: 50,
      api_keys_allowed: false,
      playground_only: true,
      hard_cap: true,
      overage_allowed: false,
      team_seats: 1,
      contact_sales: false,
      description: "Playground only — 50 credits/month, hard-capped.",
    },
    {
      id: "starter",
      name: "Starter",
      price_inr: 1499,
      price_usd: 19,
      monthly_credits: 1000,
      api_keys_allowed: true,
      playground_only: false,
      hard_cap: false,
      overage_allowed: true,
      team_seats: 1,
      contact_sales: false,
      description: "API key + overage. 1,000 credits/month.",
    },
    {
      id: "business",
      name: "Business",
      price_inr: 7999,
      price_usd: 99,
      monthly_credits: 7500,
      api_keys_allowed: true,
      playground_only: false,
      hard_cap: false,
      overage_allowed: true,
      team_seats: 5,
      contact_sales: false,
      description: "5 seats + overage. 7,500 credits/month.",
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price_inr: null,
      price_usd: null,
      monthly_credits: null,
      api_keys_allowed: true,
      playground_only: false,
      hard_cap: false,
      overage_allowed: true,
      team_seats: null,
      contact_sales: true,
      description: "Custom credits, seats, and residency — contact sales.",
    },
  ];

  const OVERAGE = {
    inr_per_credit: 0.5,
    usd_per_credit: 0.01,
    note: "Default overage after monthly grant (Starter+).",
  };

  const UNITS = { decision_evaluation: 1, goal_run: 5 };

  const STORE_KEY = "finura_mock_account_v1";

  function periodNow() {
    const d = new Date();
    return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0");
  }

  function uid(prefix) {
    return (
      prefix +
      "_" +
      Math.random().toString(36).slice(2, 10) +
      Math.random().toString(36).slice(2, 6)
    );
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  }

  function save(state) {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  }

  function planById(id) {
    return PLANS.find(function (p) {
      return p.id === id;
    }) || PLANS[0];
  }

  function defaultState(profile) {
    const plan = planById("free");
    const period = periodNow();
    return {
      user: {
        id: uid("usr"),
        email: (profile && profile.email) || "demo@finuraai.org",
        display_name: (profile && profile.displayName) || "Demo User",
        photo_url: (profile && profile.photoURL) || null,
        created_at: Math.floor(Date.now() / 1000),
      },
      account: {
        id: uid("acct"),
        tenant_id: "ss_" + Math.random().toString(36).slice(2, 10),
        name: (profile && profile.displayName) || "Demo Account",
        account_type: "individual",
        plan_id: "free",
        seats: plan.team_seats || 1,
        status: "active",
        created_at: Math.floor(Date.now() / 1000),
      },
      credits: {
        period: period,
        granted: plan.monthly_credits,
        used: 12,
        overage: 0,
        remaining: plan.monthly_credits - 12,
      },
      keys: [],
      ledger: [
        {
          id: uid("cl"),
          period: period,
          delta: -1,
          balance_after: plan.monthly_credits - 1,
          reason: "playground_decision",
          ref_type: "playground",
          ref_id: "",
          created_at: Math.floor(Date.now() / 1000) - 86400 * 2,
        },
        {
          id: uid("cl"),
          period: period,
          delta: -5,
          balance_after: plan.monthly_credits - 6,
          reason: "goal_run",
          ref_type: "goal",
          ref_id: "goal_demo",
          created_at: Math.floor(Date.now() / 1000) - 86400,
        },
        {
          id: uid("cl"),
          period: period,
          delta: -1,
          balance_after: plan.monthly_credits - 7,
          reason: "playground_decision",
          ref_type: "playground",
          ref_id: "",
          created_at: Math.floor(Date.now() / 1000) - 3600 * 6,
        },
      ],
      invoices: [],
      subscription: null,
      daily_usage: [2, 1, 0, 3, 1, 2, 0, 1, 2, 4, 1, 0, 2, 1, 3, 0, 1, 2, 1, 0, 2, 1, 3, 1, 0, 2, 1, 1],
    };
  }

  function ensure(profile) {
    let state = load();
    if (!state) {
      state = defaultState(profile);
      save(state);
    } else if (profile) {
      if (profile.email) state.user.email = profile.email;
      if (profile.displayName) state.user.display_name = profile.displayName;
      if (profile.photoURL !== undefined) state.user.photo_url = profile.photoURL;
      save(state);
    }
    return state;
  }

  function mePayload(state, created) {
    return {
      user: state.user,
      account: state.account,
      plan: planById(state.account.plan_id),
      credits: Object.assign({ account_id: state.account.id }, state.credits),
      created: !!created,
    };
  }

  function err(code, message, status) {
    const e = new Error(message || code);
    e.status = status;
    e.code = code;
    e.data = { detail: { code: code, message: message || code } };
    return e;
  }

  async function handle(method, path, body, profile) {
    await new Promise(function (r) {
      setTimeout(r, 180 + Math.random() * 220);
    });
    const state = ensure(profile);
    const plan = planById(state.account.plan_id);

    if (method === "GET" && path === "/v1/plans") {
      return {
        plans: PLANS,
        overage: OVERAGE,
        units: UNITS,
      };
    }

    if (method === "POST" && path === "/v1/account/bootstrap") {
      if (body && body.account_name) state.account.name = body.account_name;
      if (body && body.account_type) state.account.account_type = body.account_type;
      save(state);
      return mePayload(state, true);
    }

    if (method === "GET" && path === "/v1/account/me") {
      return mePayload(state, false);
    }

    if (method === "GET" && path === "/v1/account/plan") {
      return {
        account_id: state.account.id,
        plan: plan,
        overage: {
          allowed: !!plan.overage_allowed,
          inr_per_credit: OVERAGE.inr_per_credit,
          usd_per_credit: OVERAGE.usd_per_credit,
        },
        subscription: state.subscription,
      };
    }

    if (method === "GET" && path === "/v1/account/usage") {
      return {
        account_id: state.account.id,
        tenant_id: state.account.tenant_id,
        plan_id: state.account.plan_id,
        credits: Object.assign({}, state.credits),
        units: UNITS,
        daily_usage: state.daily_usage,
      };
    }

    if (method === "GET" && path === "/v1/account/credits") {
      return Object.assign({ account_id: state.account.id }, state.credits);
    }

    if (method === "GET" && path.indexOf("/v1/account/credits/history") === 0) {
      const entries = state.ledger
        .slice()
        .reverse()
        .map(function (e) {
          return Object.assign({ account_id: state.account.id, idempotency_key: null, metadata_json: {} }, e);
        });
      return { account_id: state.account.id, entries: entries };
    }

    if (method === "GET" && path === "/v1/account/api-keys") {
      return {
        keys: state.keys.map(function (k) {
          return {
            id: k.id,
            name: k.name,
            key_prefix: k.key_prefix,
            scopes: k.scopes,
            revoked: !!k.revoked_at,
            created_at: k.created_at,
            last_used_at: k.last_used_at,
          };
        }),
      };
    }

    if (method === "POST" && path === "/v1/account/api-keys") {
      if (!plan.api_keys_allowed) {
        throw err("plan_not_allowed", "API keys require Starter or higher.", 403);
      }
      const secret =
        "fin_sk_test_" +
        Math.random().toString(36).slice(2) +
        Math.random().toString(36).slice(2);
      const key = {
        id: uid("key"),
        name: (body && body.name) || "Default",
        key_prefix: secret.slice(0, 18),
        scopes: (body && body.scopes) || ["decisions:write", "goals:write"],
        revoked_at: null,
        created_at: Math.floor(Date.now() / 1000),
        last_used_at: null,
      };
      state.keys.push(key);
      save(state);
      return {
        key: key,
        secret: secret,
        message: "Store this secret now — it will not be shown again.",
      };
    }

    if (method === "DELETE" && path.indexOf("/v1/account/api-keys/") === 0) {
      const keyId = path.split("/").pop();
      const key = state.keys.find(function (k) {
        return k.id === keyId;
      });
      if (!key) throw err("not_found", "API key not found.", 404);
      key.revoked_at = Math.floor(Date.now() / 1000);
      save(state);
      return { key: key };
    }

    if (method === "GET" && path === "/v1/account/billing") {
      const cfg = global.FINURA_CONFIG || {};
      return {
        billing_enabled: !!cfg.BILLING_ENABLED,
        provider: "razorpay",
        customer_id: state.subscription ? "cus_mock" : null,
        subscription: state.subscription,
        plan: { plan: plan },
      };
    }

    if (method === "POST" && path === "/v1/account/billing/checkout") {
      const cfg = global.FINURA_CONFIG || {};
      if (!cfg.BILLING_ENABLED) {
        throw err("billing_disabled", "Billing is not enabled yet.", 503);
      }
      const planId = body && body.plan_id;
      const next = planById(planId);
      if (!next || next.contact_sales) {
        throw err("plan_not_allowed", "Enterprise requires contact sales.", 403);
      }
      if (next.id === "free") {
        state.account.plan_id = "free";
        state.account.seats = next.team_seats || 1;
        state.credits.granted = next.monthly_credits;
        state.credits.remaining = Math.max(0, next.monthly_credits - state.credits.used);
        state.subscription = null;
        save(state);
        return {
          provider: "local",
          subscription_id: null,
          order_id: null,
          plan_id: "free",
          amount: 0,
          currency: (body && body.currency) || "INR",
          key_id: null,
          checkout_payload: null,
        };
      }
      const currency = (body && body.currency) || "INR";
      const amount =
        currency === "USD"
          ? Math.round((next.price_usd || 0) * 100)
          : Math.round((next.price_inr || 0) * 100);
      const subId = "sub_mock_" + next.id;
      // Simulate successful checkout locally (no Razorpay key in mock).
      state.account.plan_id = next.id;
      state.account.seats = next.team_seats || 1;
      state.credits.granted = next.monthly_credits;
      state.credits.remaining = Math.max(0, next.monthly_credits - state.credits.used);
      state.subscription = {
        id: subId,
        plan_id: next.id,
        status: "active",
        currency: currency,
      };
      state.invoices.unshift({
        id: uid("inv"),
        amount: amount,
        currency: currency,
        status: "paid",
        provider_invoice_id: "rzp_inv_mock",
        created_at: Math.floor(Date.now() / 1000),
      });
      save(state);
      return {
        provider: "razorpay",
        subscription_id: subId,
        order_id: null,
        plan_id: next.id,
        amount: amount,
        currency: currency,
        key_id: "rzp_test_mock",
        checkout_payload: {
          subscription_id: subId,
          key_id: "rzp_test_mock",
          prefill: { email: state.user.email },
          notes: {
            finura_account_id: state.account.id,
            finura_plan_id: next.id,
          },
        },
        _mock_activated: true,
      };
    }

    if (method === "GET" && path === "/v1/account/billing/invoices") {
      return { invoices: state.invoices };
    }

    if (method === "POST" && path === "/v1/account/playground/decisions") {
      if (state.credits.remaining <= 0 && plan.hard_cap) {
        throw err("credits_exhausted", "Monthly credits exhausted on Free plan.", 402);
      }
      const debit = 1;
      state.credits.used += debit;
      if (state.credits.remaining > 0) {
        state.credits.remaining -= debit;
      } else if (plan.overage_allowed) {
        state.credits.overage += debit;
      }
      const ledgerId = uid("cl");
      state.ledger.push({
        id: ledgerId,
        period: state.credits.period,
        delta: -debit,
        balance_after: state.credits.remaining,
        reason: "playground_decision",
        ref_type: "playground",
        ref_id: "",
        created_at: Math.floor(Date.now() / 1000),
      });
      const day = new Date().getUTCDate() - 1;
      if (state.daily_usage[day] != null) state.daily_usage[day] += 1;
      save(state);

      const amount = body && body.amount;
      const decision = {
        decision_id: uid("dec"),
        status: amount && amount >= 50000 ? "REQUIRE_APPROVAL" : "APPROVE",
        transaction_id: (body && body.transaction_id) || "txn_playground",
        amount: amount || null,
        currency: (body && body.currency) || "INR",
        policy_snapshot_id: "pol_refund_v3",
        citations: [
          { code: "RBI-DPSS-2024", label: "Unauthorised electronic banking transactions — customer liability" },
          { code: "FINURA-REF-02", label: "Evidence completeness gate for card-present disputes" },
        ],
        refund_risk_v1: {
          score: amount && amount >= 50000 ? 0.61 : 0.28,
          label: amount && amount >= 50000 ? "elevated" : "low",
          synthetic: true,
          shap: [
            { feature: "amount_band", contribution: 0.18 },
            { feature: "evidence_completeness", contribution: -0.12 },
            { feature: "customer_history", contribution: -0.08 },
            { feature: "mcc_risk", contribution: 0.06 },
            { feature: "time_since_txn", contribution: 0.04 },
          ],
        },
        audit_trail: [
          { at: "perceive", detail: "Case ingested from playground" },
          { at: "reason", detail: "Policy + risk model evaluated" },
          { at: "decide", detail: "Decision emitted with citations" },
        ],
      };

      return {
        tenant_id: state.account.tenant_id,
        credits: {
          debited: debit,
          remaining: state.credits.remaining,
          used: state.credits.used,
          overage: state.credits.overage,
          granted: state.credits.granted,
          ledger_id: ledgerId,
        },
        result: {
          kind: amount ? "refund_decision" : "goal_run",
          decision: decision,
        },
      };
    }

    throw err("not_found", "Mock route not found: " + method + " " + path, 404);
  }

  global.FinuraMockAccount = {
    handle: handle,
    plans: PLANS,
    reset: function () {
      localStorage.removeItem(STORE_KEY);
    },
  };
})(window);
