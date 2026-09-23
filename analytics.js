/*
  URL param parsing + analytics tracking wrapper.
  Provider is swappable in one place: CONFIG.ANALYTICS_PROVIDER. Every event
  also fire-and-forget POSTs to our own /api/events for DB capture,
  regardless of provider - see server.js.
*/
(function () {
  function parseParams() {
    const usp = new URLSearchParams(window.location.search);

    // Pass through untouched - never decode/transform.
    const user_id = usp.has("user_id") ? usp.get("user_id") : "";
    const recharge_count = usp.has("recharge_count") ? usp.get("recharge_count") : "";

    const rawVariant = (usp.get("variant") || "").toLowerCase();
    const variantMissing = rawVariant !== "a" && rawVariant !== "b";
    const variant = rawVariant === "b" ? "b" : "a"; // defaults to "a" when missing/invalid

    return { user_id, recharge_count, variant, variantMissing };
  }

  window.PARAMS = parseParams();

  // Page taxonomy for event tagging - L1/L2/L3 per Nitin's naming.
  window.PAGES = {
    LIST: { code: "L1", name: "Listing Page" },
    DETAIL: { code: "L2", name: "Detail Page" },
    WAITLIST: { code: "L3", name: "Waiting Page" },
  };

  const PROVIDERS = {
    posthog: function (name, props) {
      if (window.posthog && typeof window.posthog.capture === "function") {
        window.posthog.capture(name, props);
      } else {
        console.info("[analytics:posthog:fallback]", name, props);
      }
    },
  };

  // Fire-and-forget DB capture. Fails silently (e.g. local static-file dev
  // server with no /api/events route, or no DATABASE_URL configured yet) -
  // analytics must never block or break the UI.
  function sendToEventsApi(name, props) {
    try {
      fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_name: name, props: props }),
        keepalive: true,
      }).catch(function () {});
    } catch (e) {
      /* fetch unavailable - DB capture silently skipped */
    }
  }

  window.track = function track(name, props, page) {
    const p = window.PARAMS;
    const merged = Object.assign(
      {
        user_id: p.user_id,
        recharge_count: p.recharge_count,
        variant: p.variant,
        timestamp: new Date().toISOString(),
      },
      page ? { page: page.code, page_name: page.name } : {},
      props || {}
    );
    const provider = PROVIDERS[window.CONFIG.ANALYTICS_PROVIDER];
    if (provider) {
      provider(name, merged);
    } else {
      console.warn("[fakedoor] unknown analytics provider:", window.CONFIG.ANALYTICS_PROVIDER);
    }
    sendToEventsApi(name, merged);
  };

  // Dedupe *_view events so a refresh or back/forward nav doesn't double-count a view
  // within the same browser session.
  const VIEWED_STORAGE_KEY = "fakedoor_viewed_events";

  function getViewedSet() {
    try {
      return new Set(JSON.parse(sessionStorage.getItem(VIEWED_STORAGE_KEY) || "[]"));
    } catch (e) {
      return new Set();
    }
  }

  function saveViewedSet(set) {
    try {
      sessionStorage.setItem(VIEWED_STORAGE_KEY, JSON.stringify(Array.from(set)));
    } catch (e) {
      /* sessionStorage unavailable - dedupe silently disabled */
    }
  }

  window.trackViewOnce = function trackViewOnce(dedupeKey, name, props, page) {
    const set = getViewedSet();
    if (set.has(dedupeKey)) return;
    set.add(dedupeKey);
    saveViewedSet(set);
    window.track(name, props, page);
  };

  if (window.PARAMS.variantMissing) {
    window.track("variant_missing", {}, window.PAGES.LIST);
  }
})();
