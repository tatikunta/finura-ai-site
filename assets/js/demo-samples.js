/** Local sample payloads when Mumbai /demo/* is unreachable or returns sample fallback. */
window.FINURA_DEMO_SAMPLES = Object.freeze({
  presets: [
    {
      id: "card-dispute-small",
      label: "Card dispute · ₹2,499",
      transaction_id: "TXN-MUM-2499-DEMO",
      amount: 249900,
      currency: "INR",
      evidence_refs: ["dispute_form:df-1001", "sms_alert:sa-882"],
      model_output: {
        refund_reason: "unauthorised_card_present",
        merchant_category: "electronics",
        customer_tenure_months: 38,
      },
    },
    {
      id: "atm-overcharge",
      label: "ATM overcharge · ₹5,000",
      transaction_id: "TXN-ATM-5000-DEMO",
      amount: 500000,
      currency: "INR",
      evidence_refs: ["atm_receipt:ar-44", "cctv_ref:cv-12"],
      model_output: {
        refund_reason: "atm_cash_not_dispensed",
        merchant_category: "atm",
        customer_tenure_months: 12,
      },
    },
    {
      id: "large-upi",
      label: "Large UPI dispute · ₹85,000",
      transaction_id: "TXN-UPI-85000-DEMO",
      amount: 8500000,
      currency: "INR",
      evidence_refs: ["upi_complaint:up-77"],
      model_output: {
        refund_reason: "fraud_suspected",
        merchant_category: "marketplace",
        customer_tenure_months: 4,
      },
    },
  ],

  policies: {
    active_version: "refund_policy_in_v1",
    policies: [
      {
        version: "refund_policy_in_v1",
        title: "INR retail card / UPI refund",
        currency: "INR",
        auto_limit: 500000,
        evidence_window_days: 7,
        citations: [
          { code: "RBI-DPSS", label: "RBI DPSS customer liability guidelines (demo cite)" },
          { code: "FINURA-REFUND-01", label: "FINURA auto-limit + evidence freshness" },
        ],
        summary:
          "Auto-eligible below auto_limit when evidence is fresh; larger amounts require human approval.",
      },
      {
        version: "refund_policy_in_v1_strict",
        title: "High-risk / new account",
        currency: "INR",
        auto_limit: 100000,
        evidence_window_days: 3,
        citations: [
          { code: "FINURA-RISK-02", label: "Elevated fraud risk → approval gate" },
        ],
        summary: "Stricter auto-limit for short-tenure accounts and fraud-suspected reasons.",
      },
    ],
  },

  refundDecision: {
    decision_id: "demo-dec-sample-001",
    tenant_id: "demo",
    transaction_id: "TXN-MUM-2499-DEMO",
    amount: 249900,
    currency: "INR",
    status: "ELIGIBLE_FOR_AUTHORIZATION",
    policy_snapshot_id: "refund_policy_in_v1",
    rationale_ref: "sample://rationale/unauthorised_card_present",
    evidence_refs: ["dispute_form:df-1001", "sms_alert:sa-882"],
    model_authorized: false,
    model_proposal: { action: "approve_refund", confidence: 0.81 },
    refund_reason: "unauthorised_card_present",
    citations: [
      { code: "RBI-DPSS", label: "Customer liability for unauthorised electronic transactions (demo)" },
      { code: "FINURA-REFUND-01", label: "Within auto-limit · evidence within window" },
    ],
    refund_risk_v1: {
      score: 0.27,
      label: "low",
      model: "refund_risk_v1",
      synthetic: true,
      shap: [
        { feature: "amount_inr", value: 2499, contribution: -0.08 },
        { feature: "evidence_freshness", value: 0.9, contribution: -0.11 },
        { feature: "customer_tenure_m", value: 38, contribution: -0.09 },
        { feature: "mcc_electronics", value: 1, contribution: 0.04 },
        { feature: "prior_disputes_90d", value: 0, contribution: -0.05 },
        { feature: "channel_card", value: 1, contribution: 0.02 },
      ],
    },
    audit_trail: [
      { at: "T+0s", event: "perceive", detail: "Refund request accepted into demo tenant" },
      { at: "T+1s", event: "policy_match", detail: "Matched refund_policy_in_v1 (INR)" },
      { at: "T+2s", event: "risk_score", detail: "refund_risk_v1 = 0.27 (synthetic model)" },
      { at: "T+3s", event: "decide", detail: "ELIGIBLE_FOR_AUTHORIZATION — within auto-limit" },
    ],
    sample: true,
  },

  goalRun: {
    run_id: "demo-goal-sample-001",
    session_id: "00000000-0000-4000-8000-00000000demo",
    status: "completed",
    sample: true,
    sample_reason: "Recorded sample run (Gemini unavailable or demo fallback)",
    title: "Assess card dispute and propose governed refund",
    steps: [
      { stage: "perceive", detail: "Ingest dispute packet and transaction metadata" },
      { stage: "interpret", detail: "Classify as unauthorised card-present claim" },
      { stage: "contextualize", detail: "Load customer tenure + prior disputes" },
      { stage: "plan", detail: "Plan: policy match → risk score → decide → audit" },
      { stage: "reason", detail: "Reason over RBI/FINURA citations and evidence window" },
      { stage: "validate", detail: "Critic checks auto-limit and evidence freshness" },
      { stage: "execute", detail: "Record decision only (demo tenant; no settlement)" },
      { stage: "observe", detail: "Confirm decision_id persisted" },
      { stage: "reflect", detail: "No policy pause required for this sample amount" },
      { stage: "learn", detail: "Tag run as demo sample for traction demos" },
    ],
  },
});
