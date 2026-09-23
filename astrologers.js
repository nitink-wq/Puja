/*
  Astrologer pool. 6 astrologers total, 3 shown per pooja (rotated by pooja index
  so each pooja gets a different trio). `photo` points at the real supplied
  photo; `initials`/`color` are only used as a fallback (see astroAvatarSvg in
  app.js) if `photo` is ever missing for a future entry. `rating` is a
  placeholder number - swap with real data when available.
*/
window.ASTROLOGERS = [
  { id: "a1", name: "Pandit Ravi Shastri", experience: "15+ years", specialization: "Vedic Rituals", rating: 4.9, initials: "RS", color: "#F45722", photo: "assets/astro-ravi-shastri.webp" },
  { id: "a2", name: "Pandit Suresh Sharma", experience: "12+ years", specialization: "Havan & Shanti", rating: 4.8, initials: "SS", color: "#C9491F", photo: "assets/astro-suresh-sharma.webp" },
  { id: "a3", name: "Astro Deepak Joshi", experience: "18+ years", specialization: "Kundli & Dosh Nivaran", rating: 4.9, initials: "DJ", color: "#E0512A", photo: "assets/astro-deepak-joshi.webp" },
  { id: "a4", name: "Pandit Mahesh Tiwari", experience: "10+ years", specialization: "Griha Shanti", rating: 4.7, initials: "MT", color: "#F4842E", photo: "assets/astro-mahesh-tiwari.webp" },
  { id: "a5", name: "Astro Priya Verma", experience: "6+ years", specialization: "Vedic Karma Kand", rating: 4.8, initials: "PV", color: "#D9622A", photo: "assets/astro-priya-verma.webp" },
  { id: "a6", name: "Astro Meera Nair", experience: "14+ years", specialization: "Rahu-Ketu & Graha", rating: 4.8, initials: "MN", color: "#E8703A", photo: "assets/astro-meera-nair.webp" },
];

window.getAstrosForPooja = function (poojaId) {
  var idx = window.POOJAS.findIndex(function (p) {
    return p.id === poojaId;
  });
  if (idx < 0) idx = 0;
  var list = [];
  for (var i = 0; i < 3; i++) {
    list.push(window.ASTROLOGERS[(idx + i) % window.ASTROLOGERS.length]);
  }
  return list;
};
