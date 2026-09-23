/*
  All UI copy lives here. Edit strings - no UI copy should be hardcoded in app.js.
  Kept in plain, simple English on purpose.
*/
window.COPY = {
  appName: "AstroLokal",

  list: {
    header: "Poojas for You",
    trustLine: "Real pooja done by top rated astrologers.",
    mostRecommended: "Most Recommended",
    bookNow: "Book Now",
    bookPooja: "Book Pooja",
    trustPillars: [
      { icon: "🪔", title: "Real Pooja", body: "100% Authentic" },
      { icon: "🎥", title: "Pooja Recording", body: "Sent to You" },
      { icon: "🙏", title: "Top Rated Astrologers", body: "100% Dedicated" },
    ],
  },

  waitlist: {
    title: "You're on the Waitlist",
    body: "All our astrologers are busy right now. Your booking could not be completed. We'll notify you as soon as someone is free.",
    cta: "Back to Home",
  },

  detail: {
    sections: {
      whatItDoes: "What This Pooja Does",
      whatsIncluded: "What's Included",
      aboutAstrologer: "Your Astrologer",
      process: "How It Works",
    },
    usersBooked: function (count) {
      return count + " users booked";
    },
    allInclusive: "all inclusive",
    bookNow: function (price) {
      return "Pay Now";
    },
    // Shared across every pooja - same 3-step flow regardless of which pooja is booked.
    howItWorks: [
      {
        title: "Book your session",
        body: "Select your pooja and complete payment to confirm your slot.",
      },
      {
        title: "Connect with your astrologer",
        body: "Your selected astrologer connects with you via chat to schedule the session.",
      },
      {
        title: "Pooja is performed",
        body: "The astrologer performs the pooja and shares a video of the performance.",
      },
    ],
  },

  loader: {
    messages: function (astroName) {
      return [
        "Checking availability for " + astroName + "...",
        "Confirming your pooja slot...",
        "Almost there...",
      ];
    },
  },

};
