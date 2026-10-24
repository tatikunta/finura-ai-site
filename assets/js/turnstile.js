/**
 * Cloudflare Turnstile helper. Active only when FINURA_CONFIG.TURNSTILE_SITE_KEY
 * is a non-empty string. Site key is public; the secret stays on the API.
 */
(function (global) {
  const SCRIPT_URL =
    "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  let loadPromise = null;
  const widgets = Object.create(null);

  function siteKey() {
    const cfg = global.FINURA_CONFIG || {};
    const key = cfg.TURNSTILE_SITE_KEY;
    return key && String(key).trim() ? String(key).trim() : "";
  }

  function enabled() {
    return !!siteKey();
  }

  function loadScript() {
    if (!enabled()) return Promise.resolve(null);
    if (global.turnstile) return Promise.resolve(global.turnstile);
    if (loadPromise) return loadPromise;
    loadPromise = new Promise(function (resolve, reject) {
      const s = document.createElement("script");
      s.src = SCRIPT_URL;
      s.async = true;
      s.defer = true;
      s.onload = function () {
        resolve(global.turnstile || null);
      };
      s.onerror = function () {
        loadPromise = null;
        reject(new Error("Failed to load Turnstile"));
      };
      document.head.appendChild(s);
    });
    return loadPromise;
  }

  /**
   * Render into an element (or [data-turnstile] nodes when el omitted).
   * Returns widget id or null when Turnstile is off.
   */
  async function render(el, options) {
    if (!enabled()) return null;
    const node =
      typeof el === "string" ? document.querySelector(el) : el || null;
    const targets = node
      ? [node]
      : Array.prototype.slice.call(
          document.querySelectorAll("[data-turnstile]")
        );
    if (!targets.length) return null;

    const api = await loadScript();
    if (!api || typeof api.render !== "function") return null;

    const key = siteKey();
    let lastId = null;
    targets.forEach(function (target) {
      if (target.dataset.turnstileRendered === "1") return;
      target.hidden = false;
      const id = api.render(target, {
        sitekey: key,
        theme: (options && options.theme) || "light",
        callback: options && options.callback,
        "error-callback": options && options.errorCallback,
        "expired-callback": options && options.expiredCallback,
      });
      target.dataset.turnstileRendered = "1";
      target.dataset.turnstileWidgetId = id;
      widgets[id] = target;
      lastId = id;
    });
    return lastId;
  }

  function getToken(el) {
    if (!enabled() || !global.turnstile) return "";
    const node =
      typeof el === "string" ? document.querySelector(el) : el || null;
    const target =
      node ||
      document.querySelector("[data-turnstile][data-turnstile-widget-id]");
    if (!target) return "";
    const id = target.dataset.turnstileWidgetId;
    if (!id) return "";
    try {
      return global.turnstile.getResponse(id) || "";
    } catch (_) {
      return "";
    }
  }

  function reset(el) {
    if (!enabled() || !global.turnstile) return;
    const node =
      typeof el === "string" ? document.querySelector(el) : el || null;
    const targets = node
      ? [node]
      : Array.prototype.slice.call(
          document.querySelectorAll("[data-turnstile][data-turnstile-widget-id]")
        );
    targets.forEach(function (target) {
      const id = target.dataset.turnstileWidgetId;
      if (id) {
        try {
          global.turnstile.reset(id);
        } catch (_) {}
      }
    });
  }

  global.FinuraTurnstile = {
    enabled: enabled,
    siteKey: siteKey,
    loadScript: loadScript,
    render: render,
    getToken: getToken,
    reset: reset,
  };
})(window);
