/*
  Pooja catalog. Max 5 poojas. Edit copy/fields here - UI code reads this directly.
  Exactly one pooja should have `recommended: true` - it becomes the featured hero
  card on the list page and is priced at RECOMMENDED_PRICE (see pricing.js);
  every other pooja is priced at STANDARD_PRICE regardless of order here.
  `rating` is a placeholder number (clearly marked) - swap with a real number when
  available. Live "devotees booked" counts are generated per-session in app.js
  (see getBookedCount), not stored here. "How It Works" is shared across all
  poojas - see COPY.detail.howItWorks in copy.js, not per-pooja.
*/
window.POOJAS = [
  {
    id: "grah-dosh-nivaran",
    name: "Grah Dosh Nivaran Pooja",
    tag: "Peace & Harmony",
    whatItDoes:
      "This pooja helps reduce the bad effect of weak planets in your kundli. It is for people facing delays, stress, or work that keeps getting stuck no matter how hard they try.",
    duration: "15 mins",
    mode: "Live video call",
    included: [
      "Sankalp ritual for your blessing",
      "Mantra chanting for your planets",
      "Havan with pooja items",
      "Video recording sent to you",
    ],
    rating: 4.8,
  },
  {
    id: "buri-nazar-nivaran",
    name: "Buri Nazar Nivaran Pooja",
    tag: "Evil Eye Shield",
    whatItDoes:
      "This pooja protects you from buri nazar (evil eye) and negative energy caused by jealousy or ill wishes. It brings safety and peace to you and your family.",
    duration: "15 mins",
    mode: "Live video call",
    included: [
      "Sankalp ritual for your blessing",
      "Buri nazar removal ritual",
      "Havan with pooja items",
      "Video recording sent to you",
    ],
    rating: 4.7,
  },
  {
    id: "navgrah-shanti",
    name: "Navgrah Shanti Pooja",
    tag: "9 Planets Balance",
    whatItDoes:
      "This pooja keeps all nine planets happy and balanced in your kundli. It brings peace, steady progress, and good results in daily life.",
    duration: "15 mins",
    mode: "Live video call",
    included: [
      "Sankalp ritual for your blessing",
      "Invocation of all nine planets",
      "Havan with pooja items",
      "Video recording sent to you",
    ],
    rating: 4.8,
  },
  {
    id: "prem-milan",
    name: "Prem Milan Pooja",
    tag: "Love & Unity",
    whatItDoes:
      "This pooja brings love and understanding back into your relationship. It helps when there is distance, misunderstanding, or delay in marriage.",
    duration: "20 mins",
    mode: "Live video call",
    included: [
      "Sankalp ritual for your blessing",
      "Radha-Krishna invocation for harmony",
      "Havan with pooja items",
      "Video recording sent to you",
    ],
    rating: 4.6,
    recommended: true,
    // our most-booked pooja - featured hero card on the list page
  },
  {
    id: "kaal-sarp-dosh-nivaran",
    name: "Kaal Sarp Dosh Nivaran Pooja",
    tag: "Rahu-Ketu Relief",
    whatItDoes:
      "This pooja reduces the effect of Kaal Sarp Dosh in your kundli. It helps when you face sudden problems or don't get results even after working hard.",
    duration: "15 mins",
    mode: "Live video call",
    included: [
      "Sankalp ritual for your blessing",
      "Rahu-Ketu nivaran ritual",
      "Havan with pooja items",
      "Video recording sent to you",
    ],
    rating: 4.9,
  },
];
