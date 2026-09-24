/*
  Router + screen rendering for the pooja fake-door test.
  Routes: #/list, #/pooja/:id. Once a user has ever hit "slots full", every
  route (any hash) is intercepted and shows the persistent waitlist gate
  instead - see renderWaitlistGate / fetchWaitlistState / server.js. The
  gate is checked server-side (Postgres `waitlist` table) on every page
  load, not client localStorage, so clearing browser storage can't unlock
  a gated user_id.
*/
(function () {
  const root = document.getElementById("app");

  // This page loads inside a React Native WebView in the AstroLokal app.
  // Firing the deeplink from inside the WebView stacks a NEW Home screen on
  // top of this one, so hardware back just returns here instead of actually
  // leaving - same bug bhagya-score hit. Fix: always try the postMessage
  // bridge first (native pops this WebView screen directly); the deeplink
  // below is a fallback ONLY for when the page is opened outside the app
  // (plain browser, no bridge) - never the primary path when the bridge
  // exists.
  const DEEPLINK_SCHEME = "astrolokal://BottomTabs?screen=Home";

  function sendBackAction() {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ action: "GO_BACK" }));
      return true;
    }
    return false;
  }

  // Shared "exit to app" path for both the header back button (when it's
  // pointed at home) and the waitlist gate's "Back to Home" CTA. `source`
  // is appended for native-side debugging/analytics, matching bhagya-score.
  function exitToHome(source) {
    if (sendBackAction()) return;
    const params = new URLSearchParams();
    params.set("source", source);
    if (window.PARAMS && window.PARAMS.user_id) params.set("user_id", window.PARAMS.user_id);
    window.location.href = DEEPLINK_SCHEME + "&" + params.toString();
  }

  function getPooja(id) {
    return window.POOJAS.find(function (p) {
      return p.id === id;
    });
  }

  // Per-session random "users booked" count in the 2,000-3,000 range (not a
  // round number) so it doesn't read as an obviously fake figure. Cached per
  // pooja for the session so it doesn't jump around on re-renders.
  function getBookedCount(poojaId) {
    try {
      var key = "pooja_fakedoor_booked_" + poojaId;
      var cached = sessionStorage.getItem(key);
      if (cached) return Number(cached);
      var count = 2000 + Math.floor(Math.random() * 1001);
      sessionStorage.setItem(key, String(count));
      return count;
    } catch (e) {
      return 2340;
    }
  }

  function astroAvatarSvg(astro) {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<circle cx="50" cy="50" r="50" fill="' + astro.color + '"/>' +
      '<text x="50" y="60" font-family="Figtree, sans-serif" font-size="36" font-weight="700" fill="#fff" text-anchor="middle">' +
      astro.initials +
      "</text>" +
      "</svg>";
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }

  function astroPhotoSrc(astro) {
    return astro.photo || astroAvatarSvg(astro);
  }

  function astroCardHtml(astro) {
    return (
      '<div class="astro-photo-wrap">' +
      '<img class="astro-photo" src="' + astroPhotoSrc(astro) + '" alt="" width="56" height="56" loading="lazy" />' +
      '<span class="astro-badge">&#10003;</span>' +
      "</div>" +
      '<div class="astro-info">' +
      '<div class="astro-info-top">' +
      '<span class="astro-name">' + astro.name + "</span>" +
      '<span class="astro-rating">' + starSvg() + " " + astro.rating + "</span>" +
      "</div>" +
      '<div class="astro-meta">' + astro.experience + " &middot; " + astro.specialization + "</div>" +
      "</div>"
    );
  }

  function astroOptionsHtml(astros, pendingId) {
    return astros
      .map(function (a) {
        const selected = a.id === pendingId;
        return (
          '<button type="button" class="astro-option' + (selected ? " is-selected" : "") + '" data-astro-id="' + a.id + '">' +
          '<img class="astro-option-photo" src="' + astroPhotoSrc(a) + '" alt="" width="44" height="44" loading="lazy" />' +
          '<span class="astro-option-info">' +
          '<span class="astro-option-name">' + a.name + "</span>" +
          '<span class="astro-option-meta">' + a.experience + " &middot; " + a.specialization + "</span>" +
          "</span>" +
          '<span class="astro-option-rating">' + starSvg() + " " + a.rating + "</span>" +
          '<span class="astro-option-radio" aria-hidden="true"></span>' +
          "</button>"
        );
      })
      .join("");
  }

  // Once a user reaches "slots full" for any pooja, remember it server-side
  // (Postgres `waitlist` table, see server.js) keyed by user_id, so a return
  // visit - from ANY browser/device, even after clearing local storage -
  // shows the waitlist gate instead of letting them book again. This is
  // deliberately NOT client-side state: a user clearing their own browser
  // storage must not be able to unlock themselves.
  var waitlistState = { record: null };

  function fetchWaitlistState() {
    if (!window.PARAMS.user_id) return Promise.resolve(null);
    return fetch("/api/waitlist?user_id=" + encodeURIComponent(window.PARAMS.user_id))
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(function (data) {
        return data && data.onWaitlist
          ? { poojaId: data.poojaId, poojaName: data.poojaName }
          : null;
      })
      .catch(function () {
        // API unreachable (e.g. static-file-only local dev with no backend) -
        // fail open so local testing without `node server.js` still works.
        return null;
      });
  }

  function saveWaitlistRecord(pooja) {
    // Optimistic: block immediately in this tab without waiting on the
    // round trip. The POST below is what actually makes it authoritative
    // for future visits/devices.
    waitlistState.record = { poojaId: pooja.id, poojaName: pooja.name };
    try {
      fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: window.PARAMS.user_id, pooja_id: pooja.id, pooja_name: pooja.name }),
        keepalive: true,
      }).catch(function () {});
    } catch (e) {
      /* fetch unavailable - server-side record silently skipped */
    }
  }

  function getWaitlistRecord() {
    return waitlistState.record;
  }

  function priceFor(pooja) {
    return window.getPrice(pooja);
  }

  function backChevronSvg() {
    return (
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
      "</svg>"
    );
  }

  function chevronSvg(dir) {
    const d = dir === "next" ? "M9 18l6-6-6-6" : "M15 18l-6-6 6-6";
    return (
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="' + d + '" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
      "</svg>"
    );
  }

  function starSvg(cls) {
    return (
      '<svg class="' + (cls || "") + '" width="14" height="14" viewBox="0 0 24 24" fill="#FFBF6E" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.9L5.7 21l1.7-7-5.4-4.7 7.1-.6L12 2z"/>' +
      "</svg>"
    );
  }

  function clockSvg() {
    return (
      '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      "</svg>"
    );
  }

  function headerHtml(opts) {
    opts = opts || {};
    const backAction = opts.backAction || "list";
    return (
      '<header class="app-header">' +
      '<button class="icon-btn-circle back-btn" data-back-action="' + backAction + '" aria-label="Back">' + backChevronSvg() + "</button>" +
      '<span class="app-header-brand">' +
      '<img class="app-header-logo" src="' + window.APP_LOGO + '" alt="" width="120" height="120" />' +
      '<span class="app-header-title">' + window.COPY.appName + "</span>" +
      "</span>" +
      '<span class="app-header-action-spacer" aria-hidden="true"></span>' +
      "</header>"
    );
  }

  function bindHeaderBack(page) {
    const btn = root.querySelector(".back-btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      const action = btn.getAttribute("data-back-action");
      window.track("back_click", { back_action: action }, page);
      if (action === "home") {
        exitToHome((page ? page.code : "unknown") + "_back");
      } else {
        go("#/list");
      }
    });
  }

  function listItemsHtml(items) {
    return items.map(function (item) { return "<li>" + item + "</li>"; }).join("");
  }

  function howItWorksHtml(steps) {
    return steps
      .map(function (step, i) {
        return (
          '<li class="process-step">' +
          '<span class="process-step-index">' + (i + 1) + "</span>" +
          '<div class="process-step-content">' +
          '<div class="process-step-title">' + step.title + "</div>" +
          '<div class="process-step-body">' + step.body + "</div>" +
          "</div>" +
          "</li>"
        );
      })
      .join("");
  }

  function heroCardHtml(pooja) {
    const price = window.getPrice(pooja);
    const compareAt = window.getCompareAtPrice(pooja);
    const discount = window.getDiscountPercent(pooja);
    const art = (window.POOJA_ART[pooja.id] || [])[0] || "";
    const listCopy = window.COPY.list;
    return (
      '<a class="pooja-card pooja-hero-card" href="#/pooja/' + pooja.id + '" data-pooja-id="' + pooja.id + '" data-price="' + price + '">' +
      '<div class="pooja-hero-image">' +
      '<img src="' + art + '" alt="" width="720" height="540" fetchpriority="high" />' +
      '<span class="pooja-hero-rating">' + starSvg() + '<span class="pooja-hero-rating-value">' + pooja.rating + "</span></span>" +
      '<span class="pooja-hero-ribbon">&#10024; ' + listCopy.mostRecommended + "</span>" +
      '<div class="pooja-hero-caption">' +
      '<span class="pooja-hero-meta">' + clockSvg() + pooja.duration + "</span>" +
      '<h2 class="pooja-hero-name">' + pooja.name + "</h2>" +
      "</div>" +
      "</div>" +
      '<div class="pooja-hero-footer">' +
      '<div class="pooja-hero-price">' +
      '<div class="pooja-hero-price-row">' +
      '<span class="price-now">₹' + price + "</span>" +
      '<span class="price-was-sm">₹' + compareAt + "</span>" +
      '<span class="discount-badge-sm discount-badge-pill">' + discount + "% off</span>" +
      "</div>" +
      "</div>" +
      '<span class="btn-hero-cta">' + listCopy.bookPooja + " " + chevronSvg("next") + "</span>" +
      "</div>" +
      "</a>"
    );
  }

  function gridCardHtml(pooja) {
    const price = window.getPrice(pooja);
    const compareAt = window.getCompareAtPrice(pooja);
    const discount = window.getDiscountPercent(pooja);
    const art = (window.POOJA_ART[pooja.id] || [])[0] || "";
    return (
      '<a class="pooja-card" href="#/pooja/' + pooja.id + '" data-pooja-id="' + pooja.id + '" data-price="' + price + '">' +
      '<div class="pooja-card-image">' +
      '<img src="' + art + '" alt="" width="360" height="270" loading="lazy" />' +
      '<span class="pooja-card-rating">' + starSvg() + pooja.rating + "</span>" +
      '<span class="pooja-card-meta">' + clockSvg() + pooja.duration + "</span>" +
      "</div>" +
      '<div class="pooja-card-body">' +
      '<h3 class="pooja-card-name">' + pooja.name + "</h3>" +
      '<span class="pooja-card-tag">' + pooja.tag + "</span>" +
      '<div class="pooja-card-footer">' +
      '<div class="pooja-card-price-col">' +
      '<div class="pooja-card-price-row">' +
      '<span class="price-now">₹' + price + "</span>" +
      '<span class="price-was-sm">₹' + compareAt + "</span>" +
      "</div>" +
      '<span class="discount-badge-sm">' + discount + "% off</span>" +
      "</div>" +
      '<span class="btn-card-icon" aria-label="' + window.COPY.list.bookNow + '">' + chevronSvg("next") + "</span>" +
      "</div>" +
      "</div>" +
      "</a>"
    );
  }

  function renderList() {
    const listCopy = window.COPY.list;

    const heroPooja = window.POOJAS.find(function (p) { return p.recommended; }) || window.POOJAS[0];
    const gridPoojas = window.POOJAS.filter(function (p) { return p !== heroPooja; });

    const gridHtml = gridPoojas.map(gridCardHtml).join("");

    const trustPillarsHtml = listCopy.trustPillars
      .map(function (item, i) {
        return (
          '<div class="trust-pillar' + (i === 1 ? " trust-pillar-divided" : "") + '">' +
          '<div class="trust-pillar-icon">' + item.icon + "</div>" +
          '<div class="trust-pillar-title">' + item.title + "</div>" +
          '<div class="trust-pillar-body">' + item.body + "</div>" +
          "</div>"
        );
      })
      .join("");

    root.innerHTML =
      headerHtml({ backAction: "home" }) +
      '<main class="screen list-screen">' +
      '<div class="list-hero">' +
      '<h1 class="list-title">' + listCopy.header + "</h1>" +
      '<p class="trust-line">' + listCopy.trustLine + "</p>" +
      "</div>" +
      '<div class="pooja-hero-wrap">' + heroCardHtml(heroPooja) + "</div>" +
      '<div class="pooja-grid pooja-grid-tight">' + gridHtml + "</div>" +
      '<div class="trust-pillars">' + trustPillarsHtml + "</div>" +
      "</main>";

    bindHeaderBack(window.PAGES.LIST);

    root.querySelectorAll(".pooja-card").forEach(function (el) {
      el.addEventListener("click", function () {
        window.track(
          "pooja_card_click",
          {
            pooja_id: el.getAttribute("data-pooja-id"),
            price: Number(el.getAttribute("data-price")),
          },
          window.PAGES.LIST
        );
      });
    });

    window.trackViewOnce("list_view", "list_view", {}, window.PAGES.LIST);
  }

  function carouselHtml(images) {
    const slides = images
      .map(function (src, i) {
        const loadAttrs = i === 0 ? 'fetchpriority="high"' : 'loading="lazy"';
        const slideClass = i === 0 ? "carousel-slide carousel-slide-main" : "carousel-slide";
        return '<div class="' + slideClass + '"><img src="' + src + '" alt="" width="720" height="540" ' + loadAttrs + " /></div>";
      })
      .join("");
    const dots = images
      .map(function (_, i) {
        return '<span class="carousel-dot' + (i === 0 ? " is-active" : "") + '" data-dot-index="' + i + '"></span>';
      })
      .join("");
    const arrows =
      images.length > 1
        ? '<button class="carousel-arrow carousel-arrow-prev" data-dir="prev" aria-label="Previous image">' + chevronSvg("prev") + "</button>" +
          '<button class="carousel-arrow carousel-arrow-next" data-dir="next" aria-label="Next image">' + chevronSvg("next") + "</button>"
        : "";
    return (
      '<div class="carousel">' +
      '<div class="carousel-track">' + slides + "</div>" +
      arrows +
      '<div class="carousel-dots">' + dots + "</div>" +
      "</div>"
    );
  }

  function bindCarousel() {
    const track = root.querySelector(".carousel-track");
    if (!track) return;
    const dots = root.querySelectorAll(".carousel-dot");
    const slideCount = dots.length;
    let index = 0;
    let autoplayTimer = null;

    function updateDots(i) {
      dots.forEach(function (d, di) {
        d.classList.toggle("is-active", di === i);
      });
    }

    function goToSlide(i, instant) {
      index = (i + slideCount) % slideCount;
      track.scrollTo({ left: index * track.clientWidth, behavior: instant ? "auto" : "smooth" });
      updateDots(index);
    }

    function stopAutoplay() {
      if (autoplayTimer) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    }

    function startAutoplay() {
      stopAutoplay();
      if (slideCount <= 1) return;
      autoplayTimer = setInterval(function () {
        goToSlide(index + 1);
      }, 2000);
    }

    track.addEventListener("scroll", function () {
      const i = Math.round(track.scrollLeft / track.clientWidth);
      if (i !== index) {
        index = i;
        updateDots(index);
      }
    });

    track.addEventListener("touchstart", stopAutoplay, { passive: true });
    track.addEventListener("touchend", startAutoplay, { passive: true });

    root.querySelectorAll(".carousel-arrow").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const dir = btn.getAttribute("data-dir") === "next" ? 1 : -1;
        goToSlide(index + dir);
        startAutoplay();
      });
    });

    startAutoplay();
  }

  function checkListHtml(items) {
    return items
      .map(function (item) {
        return '<li class="check-item"><span class="check-item-icon">&#10003;</span><span>' + item + "</span></li>";
      })
      .join("");
  }

  function renderDetail(id) {
    const pooja = getPooja(id);
    if (!pooja) {
      go("#/list", { replace: true });
      return;
    }
    const price = priceFor(pooja);
    const compareAt = window.getCompareAtPrice(pooja);
    const discount = window.getDiscountPercent(pooja);
    const astros = window.getAstrosForPooja(pooja.id);
    let selectedAstro = astros[0];
    const bookedCount = getBookedCount(pooja.id);
    const detailCopy = window.COPY.detail;
    const sections = detailCopy.sections;
    const images = window.POOJA_ART[pooja.id] || [];

    root.innerHTML =
      headerHtml({ backAction: "list" }) +
      '<main class="screen detail-screen">' +

      carouselHtml(images) +

      '<div class="detail-body">' +
      '<h1 class="pooja-title">' + pooja.name + "</h1>" +

      '<div class="rating-row">' +
      starSvg() +
      '<span class="rating-value">' + pooja.rating + "</span>" +
      '<span class="rating-dot">&middot;</span>' +
      '<span class="rating-booked">' + detailCopy.usersBooked(bookedCount) + "</span>" +
      '<span class="rating-dot">&middot;</span>' +
      '<span class="rating-duration">' + clockSvg() + pooja.duration + "</span>" +
      "</div>" +

      '<section class="detail-section detail-section-decorative">' +
      "<h2>" + sections.whatItDoes + "</h2>" +
      "<p>" + pooja.whatItDoes + "</p>" +
      "</section>" +

      '<section class="detail-section">' +
      "<h2>" + sections.whatsIncluded + "</h2>" +
      '<ul class="check-list">' + checkListHtml(pooja.included) + "</ul>" +
      "</section>" +

      '<section class="detail-section">' +
      '<div class="detail-section-header">' +
      "<h2>" + sections.aboutAstrologer + "</h2>" +
      '<button type="button" class="astro-change-btn" id="astro-change-btn" aria-label="Change astrologer">Change ' + chevronSvg("next") + "</button>" +
      "</div>" +
      '<div class="astro-card" id="astro-card">' + astroCardHtml(selectedAstro) + "</div>" +
      "</section>" +

      '<section class="detail-section detail-section-last">' +
      "<h2>" + sections.process + "</h2>" +
      '<ol class="process-list">' + howItWorksHtml(detailCopy.howItWorks) + "</ol>" +
      "</section>" +

      "</div>" +
      "</main>" +

      '<div class="sticky-cta">' +
      '<div class="sticky-price">' +
      '<div class="sticky-price-row">' +
      '<span class="price-was">₹' + compareAt + "</span>" +
      '<span class="discount-badge">' + discount + "% Off</span>" +
      "</div>" +
      '<div class="sticky-price-bottom">' +
      '<span class="price-now-large">₹' + price + "</span>" +
      '<span class="all-inclusive">' + detailCopy.allInclusive + "</span>" +
      "</div>" +
      "</div>" +
      '<button class="btn-primary" id="pay-now-btn">' + detailCopy.bookNow(price) + " " + chevronSvg("next") + "</button>" +
      "</div>" +

      '<div class="sheet-backdrop" id="astro-sheet-backdrop"></div>' +
      '<div class="bottom-sheet" id="astro-sheet">' +
      '<div class="bottom-sheet-handle"></div>' +
      '<h3 class="bottom-sheet-title">Choose Your Astrologer</h3>' +
      '<div class="astro-option-list" id="astro-option-list">' + astroOptionsHtml(astros, selectedAstro.id) + "</div>" +
      '<button type="button" class="btn-primary bottom-sheet-cta" id="astro-confirm-btn">Confirm Astrologer</button>' +
      "</div>";

    bindHeaderBack(window.PAGES.DETAIL);
    bindCarousel();

    let pendingAstro = selectedAstro;
    const astroSheet = document.getElementById("astro-sheet");
    const astroSheetBackdrop = document.getElementById("astro-sheet-backdrop");
    const astroOptionList = document.getElementById("astro-option-list");
    const astroConfirmBtn = document.getElementById("astro-confirm-btn");

    function openAstroSheet() {
      pendingAstro = selectedAstro;
      astroOptionList.innerHTML = astroOptionsHtml(astros, pendingAstro.id);
      astroSheet.classList.add("is-open");
      astroSheetBackdrop.classList.add("is-open");
    }

    function closeAstroSheet() {
      astroSheet.classList.remove("is-open");
      astroSheetBackdrop.classList.remove("is-open");
    }

    document.getElementById("astro-change-btn").addEventListener("click", function () {
      window.track("astro_change_click", { pooja_id: pooja.id }, window.PAGES.DETAIL);
      openAstroSheet();
    });

    astroSheetBackdrop.addEventListener("click", closeAstroSheet);

    astroOptionList.addEventListener("click", function (e) {
      const optBtn = e.target.closest(".astro-option");
      if (!optBtn) return;
      const chosen = astros.find(function (a) { return a.id === optBtn.getAttribute("data-astro-id"); });
      if (!chosen) return;
      pendingAstro = chosen;
      astroOptionList.innerHTML = astroOptionsHtml(astros, pendingAstro.id);
    });

    astroConfirmBtn.addEventListener("click", function () {
      selectedAstro = pendingAstro;
      document.getElementById("astro-card").innerHTML = astroCardHtml(selectedAstro);
      window.track(
        "astro_confirm_click",
        { pooja_id: pooja.id, astro_id: selectedAstro.id, astro_name: selectedAstro.name },
        window.PAGES.DETAIL
      );
      closeAstroSheet();
    });

    document.getElementById("pay-now-btn").addEventListener("click", function () {
      window.track("pay_now_click", { pooja_id: pooja.id, price: price }, window.PAGES.DETAIL);
      showLoaderThenFull(pooja, price, selectedAstro.name);
    });

    window.trackViewOnce(
      "pooja_detail_view_" + pooja.id,
      "pooja_detail_view",
      { pooja_id: pooja.id, price: price },
      window.PAGES.DETAIL
    );
  }

  function showLoaderThenFull(pooja, price, astroName) {
    saveWaitlistRecord(pooja);

    const stickyCta = document.querySelector(".sticky-cta");
    if (stickyCta) stickyCta.style.display = "none";

    const messages = window.COPY.loader.messages(astroName);
    const overlay = document.createElement("div");
    overlay.className = "loader-overlay";
    overlay.innerHTML =
      '<div class="spinner" aria-hidden="true"></div>' +
      '<p class="loader-text">' + messages[0] + "</p>";
    document.body.appendChild(overlay);

    const textEl = overlay.querySelector(".loader-text");
    let msgIndex = 0;
    const msgTimer = setInterval(function () {
      msgIndex = (msgIndex + 1) % messages.length;
      textEl.textContent = messages[msgIndex];
    }, window.CONFIG.LOADER_DURATION_MS / messages.length);

    setTimeout(function () {
      clearInterval(msgTimer);
      go("#/waitlist", { replace: true });
    }, window.CONFIG.LOADER_DURATION_MS);
  }

  // Persistent gate: once a user has ever hit "slots full" for any pooja,
  // every visit - this session or a future one, any route - shows this
  // screen instead of the app. They can leave, but they can't book again.
  function renderWaitlistGate(record) {
    const waitlistCopy = window.COPY.waitlist;

    document.querySelectorAll(".loader-overlay").forEach(function (el) { el.remove(); });

    root.innerHTML =
      headerHtml({ backAction: "home" }) +
      '<main class="screen waitlist-gate-screen">' +
      '<div class="waitlist-gate">' +
      '<div class="waitlist-gate-icon-wrap"><span class="waitlist-gate-icon" aria-hidden="true">&#9203;</span></div>' +
      '<h1 class="waitlist-gate-title">' + waitlistCopy.title + "</h1>" +
      '<p class="waitlist-gate-body">' + waitlistCopy.body + "</p>" +
      '<button class="btn-primary waitlist-gate-cta" id="back-home-btn">' + waitlistCopy.cta + "</button>" +
      "</div>" +
      "</main>";

    bindHeaderBack(window.PAGES.WAITLIST);

    document.getElementById("back-home-btn").addEventListener("click", function () {
      window.track("back_home_click", { pooja_id: record.poojaId }, window.PAGES.WAITLIST);
      exitToHome(window.PAGES.WAITLIST.code + "_cta");
    });

    window.trackViewOnce(
      "waitlist_gate_view",
      "waitlist_gate_view",
      { pooja_id: record.poojaId },
      window.PAGES.WAITLIST
    );
  }

  function parseRoute() {
    const hash = window.location.hash;
    if (!hash || hash === "#/" || hash === "#/list") {
      return { screen: "list" };
    }
    const m = hash.match(/^#\/pooja\/([^/]+)$/);
    if (m) return { screen: "detail", id: decodeURIComponent(m[1]) };

    return { screen: "list" };
  }

  function go(hash, opts) {
    opts = opts || {};
    if (opts.replace) {
      history.replaceState(null, "", hash);
      render();
    } else {
      window.location.hash = hash;
    }
  }
  window.__go = go; // exposed for debugging/tests only

  function render() {
    document.querySelectorAll(".loader-overlay").forEach(function (el) { el.remove(); });

    const waitlistRecord = getWaitlistRecord();
    if (waitlistRecord) {
      renderWaitlistGate(waitlistRecord);
      window.scrollTo(0, 0);
      return;
    }

    const route = parseRoute();
    if (route.screen === "list") renderList();
    else if (route.screen === "detail") renderDetail(route.id);
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", render);

  document.addEventListener("DOMContentLoaded", function () {
    if (!window.location.hash) {
      history.replaceState(null, "", "#/list");
    }
    // Check the server for an existing waitlist record before the very
    // first render, so a returning user (any device, cleared storage or
    // not) can't slip into List/Detail even for a frame.
    fetchWaitlistState().then(function (record) {
      waitlistState.record = record;
      render();
    });
  });
})();
