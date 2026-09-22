/*
  URL param parsing + analytics tracking wrapper.
  Provider is swappable in one place: CONFIG.ANALYTICS_PROVIDER.
*/
(function () {
  function parseParams() {
    const usp = new URLSearchParams(window.location.search);
    const rawBand = usp.get("ltv_band");
    const bandMissing = !rawBand || window.CONFIG.VALID_LTV_BANDS.indexOf(rawBand) === -1;
    const ltv_band = bandMissing ? window.CONFIG.DEFAULT_LTV_BAND : rawBand;

    const price_variant = usp.get("price_variant") || window.CONFIG.DEFAULT_PRICE_VARIANT;

    // Pass through untouched — never decode/transform.
    const user_token = usp.has("user_token") ? usp.get("user_token") : "";

    const home_deeplink = usp.get("home_deeplink") || window.CONFIG.HOME_DEEPLINK;
    const homeDeeplinkMissing = !usp.get("home_deeplink");

    return { ltv_band, price_variant, user_token, home_deeplink, bandMissing, homeDeeplinkMissing };
  }

  window.PARAMS = parseParams();

  if (window.PARAMS.homeDeeplinkMissing) {
    console.warn(
      "[fakedoor] home_deeplink param missing — falling back to CONFIG.HOME_DEEPLINK (" +
        window.CONFIG.HOME_DEEPLINK +
        "). Fill in the real deeplink in config.js."
    );
  }

  const PROVIDERS = {
    posthog: function (name, props) {
      if (window.posthog && typeof window.posthog.capture === "function") {
        window.posthog.capture(name, props);
      } else {
        console.info("[analytics:posthog:fallback]", name, props);
      }
    },
  };

  window.track = function track(name, props) {
    const p = window.PARAMS;
    const merged = Object.assign(
      {
        user_token: p.user_token,
        ltv_band: p.ltv_band,
        price_variant: p.price_variant,
        timestamp: new Date().toISOString(),
      },
      props || {}
    );
    const provider = PROVIDERS[window.CONFIG.ANALYTICS_PROVIDER];
    if (provider) {
      provider(name, merged);
    } else {
      console.warn("[fakedoor] unknown analytics provider:", window.CONFIG.ANALYTICS_PROVIDER);
    }
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
      /* sessionStorage unavailable — dedupe silently disabled */
    }
  }

  window.trackViewOnce = function trackViewOnce(dedupeKey, name, props) {
    const set = getViewedSet();
    if (set.has(dedupeKey)) return;
    set.add(dedupeKey);
    saveViewedSet(set);
    window.track(name, props);
  };

  if (window.PARAMS.bandMissing) {
    window.track("ltv_band_missing", {});
  }
})();
