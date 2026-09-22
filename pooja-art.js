/*
  Generated placeholder art for pooja images (list card + 3-image detail carousel).
  Swap window.POOJA_ART[id] with real photography URLs when available — same shape,
  3 image URLs per pooja, first one is also used as the list card thumbnail.
  Built as inline SVG data URIs so no binary asset files are needed for placeholders.
*/
(function () {
  const CTA = "#F45722";
  const GOLD = "#FFBF6E";
  const CARD = "#FFEBD2";
  const PANEL = "#FDD9CE";

  function tile(iconInner, opts) {
    opts = opts || {};
    const bgFrom = opts.bgFrom || CARD;
    const bgTo = opts.bgTo || PANEL;
    const accent = opts.accent || CTA;
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + bgFrom + '"/>' +
      '<stop offset="1" stop-color="' + bgTo + '"/>' +
      "</linearGradient></defs>" +
      '<rect width="400" height="300" fill="url(#g)"/>' +
      '<circle cx="380" cy="-20" r="100" fill="' + accent + '" opacity="0.10"/>' +
      '<circle cx="0" cy="320" r="120" fill="' + accent + '" opacity="0.08"/>' +
      '<g transform="translate(200,150)">' +
      '<circle r="66" fill="#FFFFFF" opacity="0.5"/>' +
      iconInner +
      "</g>" +
      "</svg>";
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }

  function icon(id, accent) {
    switch (id) {
      case "buri-nazar-nivaran":
        return (
          '<path d="M-35 0 Q0 -28 35 0 Q0 28 -35 0 Z" fill="none" stroke="' + accent + '" stroke-width="5"/>' +
          '<circle cx="0" cy="0" r="12" fill="' + accent + '"/>' +
          '<circle cx="0" cy="0" r="5" fill="#FFF9F1"/>'
        );
      case "grah-dosh-nivaran":
        return (
          '<circle cx="0" cy="0" r="15" fill="' + accent + '"/>' +
          '<ellipse cx="0" cy="0" rx="38" ry="13" fill="none" stroke="' + accent + '" stroke-width="4" transform="rotate(-20)"/>'
        );
      case "navgrah-shanti": {
        let dots = '<circle r="9" fill="' + accent + '"/>';
        for (let i = 0; i < 8; i++) {
          const a = (i * 45 * Math.PI) / 180;
          const cx = (30 * Math.cos(a)).toFixed(1);
          const cy = (30 * Math.sin(a)).toFixed(1);
          dots += '<circle cx="' + cx + '" cy="' + cy + '" r="6" fill="' + accent + '" opacity="0.85"/>';
        }
        return dots;
      }
      case "prem-milan":
        return (
          '<path d="M0 30 C-30 8 -40 -12 -25 -25 C-15 -34 -2 -30 0 -18 C2 -30 15 -34 25 -25 C40 -12 30 8 0 30 Z" fill="' + accent + '"/>'
        );
      case "kaal-sarp-dosh-nivaran":
        return (
          '<path d="M-20 0 C-20 -12 -8 -12 0 0 C8 12 20 12 20 0 C20 -12 8 -12 0 0 C-8 12 -20 12 -20 0 Z" fill="none" stroke="' +
          accent +
          '" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'
        );
      default:
        return '<circle r="14" fill="' + accent + '"/>';
    }
  }

  function samagriSlide(accent) {
    const diya =
      '<g transform="translate(-70,4)">' +
      '<ellipse cx="0" cy="10" rx="15" ry="6" fill="' + accent + '"/>' +
      '<path d="M0 -14 C6 -4 6 4 0 4 C-6 4 -6 -4 0 -14 Z" fill="' + GOLD + '"/>' +
      "</g>";
    const bell =
      '<g transform="translate(0,0)">' +
      '<path d="M-10 8 C-10 -10 10 -10 10 8 Z" fill="' + accent + '"/>' +
      '<rect x="-13" y="7" width="26" height="4" rx="2" fill="' + accent + '"/>' +
      '<circle cx="0" cy="16" r="3" fill="' + accent + '"/>' +
      "</g>";
    const flower =
      '<g transform="translate(70,0)">' +
      [0, 72, 144, 216, 288]
        .map(function (deg) {
          const a = (deg * Math.PI) / 180;
          const cx = (10 * Math.cos(a)).toFixed(1);
          const cy = (10 * Math.sin(a)).toFixed(1);
          return '<circle cx="' + cx + '" cy="' + cy + '" r="7" fill="' + GOLD + '"/>';
        })
        .join("") +
      '<circle r="5" fill="' + accent + '"/>' +
      "</g>";
    return tile(diya + bell + flower, { accent: accent });
  }

  function ritualSlide(accent) {
    const inner =
      '<circle r="46" fill="' + accent + '" opacity="0.15"/>' +
      '<ellipse cx="0" cy="16" rx="28" ry="10" fill="' + accent + '"/>' +
      '<path d="M0 -8 C8 4 8 14 0 14 C-8 14 -8 4 0 -8 Z" fill="' + GOLD + '"/>' +
      '<path d="M-14 -18 Q-10 -26 -14 -34" stroke="' + accent + '" stroke-width="2" fill="none" opacity="0.5"/>' +
      '<path d="M14 -18 Q10 -26 14 -34" stroke="' + accent + '" stroke-width="2" fill="none" opacity="0.5"/>' +
      '<path d="M0 -22 Q0 -30 0 -38" stroke="' + accent + '" stroke-width="2" fill="none" opacity="0.5"/>';
    return tile(inner, { accent: accent });
  }

  const ACCENTS = {
    "grah-dosh-nivaran": "#F45722",
    "buri-nazar-nivaran": "#E0512A",
    "navgrah-shanti": "#F4842E",
    "prem-milan": "#F45722",
    "kaal-sarp-dosh-nivaran": "#C9491F",
  };

  window.POOJA_ART = {};
  Object.keys(ACCENTS).forEach(function (id) {
    const accent = ACCENTS[id];
    window.POOJA_ART[id] = [
      tile(icon(id, accent), { accent: accent }),
      samagriSlide(accent),
      ritualSlide(accent),
    ];
  });

  // Real photos supplied for specific poojas override the generated placeholder
  // slides above. Add more entries here as real photography comes in — same
  // shape (array of image URLs), no other code needs to change.
  // WebP — much smaller than JPEG at equivalent quality, important for slow 3G.
  const REAL_PHOTOS = {
    "grah-dosh-nivaran": ["assets/grah-dosh-1.webp", "assets/grah-dosh-2.webp"],
    "buri-nazar-nivaran": ["assets/buri-nazar-1.webp", "assets/buri-nazar-2.webp"],
    "navgrah-shanti": ["assets/navgrah-shanti-1.webp", "assets/navgrah-shanti-2.webp"],
    "prem-milan": ["assets/prem-milan-1.webp", "assets/prem-milan-2.webp"],
    "kaal-sarp-dosh-nivaran": ["assets/kaal-sarp-1.webp", "assets/kaal-sarp-2.webp"],
  };
  Object.keys(REAL_PHOTOS).forEach(function (id) {
    window.POOJA_ART[id] = REAL_PHOTOS[id];
  });

  window.APP_LOGO = "assets/astrolokal-logo.png";
})();
