(function () {
  const params = new URLSearchParams(window.location.search);
  const plan = (params.get("plan") || params.get("tier") || "").toLowerCase();
  const select = document.getElementById("plan-select");
  const submit = document.getElementById("lead-submit");
  const allowed = ["free", "starter", "business", "enterprise"];

  if (select && allowed.indexOf(plan) !== -1) {
    select.value = plan;
  }

  function syncSubmitLabel() {
    if (!select || !submit) return;
    submit.textContent =
      select.value === "enterprise" ? "Contact sales" : "Join waitlist";
  }

  if (select) {
    select.addEventListener("change", syncSubmitLabel);
    syncSubmitLabel();
  }
})();
