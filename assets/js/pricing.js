(function () {
  const buttons = document.querySelectorAll(".currency-toggle [data-currency]");
  const prices = document.querySelectorAll(".pricing-card .price[data-inr]");

  function setCurrency(code) {
    buttons.forEach(function (btn) {
      const on = btn.getAttribute("data-currency") === code;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    prices.forEach(function (el) {
      const amount = el.querySelector(".amount");
      if (!amount) return;
      amount.textContent =
        code === "USD" ? el.getAttribute("data-usd") : el.getAttribute("data-inr");
    });
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
})();
