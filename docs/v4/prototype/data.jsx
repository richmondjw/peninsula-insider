/* eslint-disable */
// Peninsula Insider — Home, reimagined. Content data.
// Voice: editorially confident, specific, active. No em-dashes. No pricing.

const CATS = {
  eat:     { label: "Eat & Drink", color: "#c45838", pin: "assets/pin-eat.svg" },
  wine:    { label: "Wine",        color: "#6e2330", pin: "assets/pin-wine.svg" },
  stay:    { label: "Stay",        color: "#7e8e6f", pin: "assets/pin-stay.svg" },
  explore: { label: "Experience",  color: "#3a4a52", pin: "assets/pin-explore.svg" },
  place:   { label: "Place hub",   color: "#8a5a3a", pin: "assets/pin-place.svg" },
};

const DATA = {
  conditions: { town: "Sorrento", temp: "16°C", sunset: "5.48pm", note: "Bay glassy, tide low" },
  issue: "Winter Insider · June 2026",

  hero: {
    eyebrow: "The Winter Issue · The Mornington Peninsula",
    titleA: "The season the Peninsula stops ",
    titleEm: "performing.",
    dek: "Short days, empty dining rooms, a fire in every cellar door with a hearth, and a coast that looks like a different country in a southerly. Winter is the Peninsula at its most honest.",
    author: "The Editors",
    date: "Saturday 31 May",
    read: "7 min read",
    credit: "Cape Schanck, winter clearing",
    lines: [
      { n: "Inside", t: "The cellar-door shortlist, filtered for fireside season", href: "#shortlist" },
      { n: "Plan",   t: "Three weekends built around a single anchor stay", href: "#plans" },
      { n: "Walk",   t: "Bushrangers Bay, and the four walks that earn the second drink", href: "#journal" },
      { n: "Ask",    t: "Tell the Insider what you want. Get the table.", href: "#ask" },
    ],
  },

  // Ask The Insider — scripted, source-grounded answers in PI's voice.
  ask: {
    intro: [
      "Ask like you'd ask a local who has eaten everywhere twice. <em>Dog-friendly beaches, a winery lunch for six, a rainy Sunday with kids.</em> The more specific you are, the sharper the call.",
    ],
    suggests: ["Romantic winery lunch", "Dog-friendly beaches", "Rainy Sunday with kids", "Best wine by the glass", "One night in Flinders"],
    qa: [
      {
        match: ["romantic", "winery lunch", "winery", "couple", "anniversary", "two of"],
        q: "A romantic winery lunch for two",
        a: [
          "Book Tedesca for the last lunch sitting. The light slides down across the long communal table by half past two, the kitchen relaxes into its rhythm, and the kingfish over the fire is the order.",
          "If you want the deck and the view instead of the hush, Foxeys at Red Hill. Sharper lunch menu than dinner, and they pour a sparkling that actually drinks like Champagne.",
        ],
        res: [
          { cat: "eat",  nm: "Tedesca Osteria", pl: "Red Hill", note: "Last lunch sitting" },
          { cat: "wine", nm: "Foxeys Hangout",  pl: "Red Hill", note: "The deck holds two beautifully" },
        ],
      },
      {
        match: ["dog", "beach", "dog-friendly"],
        q: "Dog-friendly beaches",
        a: [
          "Sorrento Back Beach off-leash before 9am, then walk the rocks toward Diamond Bay. The southerly side is wilder and emptier in winter, which is the point.",
          "On the bay side, the stretch below Mount Martha is leashed but easy, and there is a coffee at the end of it. Check the seasonal signs before you go, the rules tighten over summer.",
        ],
        res: [
          { cat: "explore", nm: "Sorrento Back Beach", pl: "Sorrento", note: "Off-leash before 9am" },
          { cat: "place",   nm: "Mount Martha foreshore", pl: "Bay side", note: "Leashed, coffee at the end" },
        ],
      },
      {
        match: ["rain", "rainy", "kids", "child", "family", "wet"],
        q: "A rainy Sunday with kids",
        a: [
          "Start at Peninsula Hot Springs for the morning session, it beats midday for both crowds and temperature, and skip the food add-on. Then a long lunch somewhere with a fire.",
          "If the rain really sets in, the Mornington Peninsula Regional Gallery is showing the Autumn Exhibition, indoors and genuinely good, and it is ten minutes from a bakery worth the detour.",
        ],
        res: [
          { cat: "explore", nm: "Peninsula Hot Springs", pl: "Rye", note: "Morning session, skip the food add-on" },
          { cat: "explore", nm: "MPRG Autumn Exhibition", pl: "Mornington", note: "Indoors, on now" },
        ],
      },
      {
        match: ["wine by the glass", "glass", "best wine", "by the glass", "drink"],
        q: "Best wine by the glass",
        a: [
          "Everyone sells the Peninsula as pinot country and they are half right. The quiet argument of the last three vintages is that the chardonnay is now the more interesting pour, and Ten Minutes by Tractor has the Wallis on by the glass.",
          "For pinot done properly without the lunch upsell, Quealy on a Friday afternoon. Underrated makers, no theatre.",
        ],
        res: [
          { cat: "wine", nm: "Ten Minutes by Tractor", pl: "Main Ridge", note: "The Wallis chardonnay" },
          { cat: "wine", nm: "Quealy", pl: "Balnarring", note: "Friday afternoon is the visit" },
        ],
      },
      {
        match: ["flinders", "one night", "quiet", "south"],
        q: "One night in Flinders",
        a: [
          "Flinders is the quietest of the southern villages and the right answer when Red Hill is booked out. Dinner at the Flinders Hotel, then the cliff-top walk in the morning before anyone else is on it.",
          "Stay close and keep it slow. The whole appeal of the south coast in winter is that nothing is performing for you.",
        ],
        res: [
          { cat: "eat",     nm: "The Flinders Hotel", pl: "Flinders", note: "Village dinner, book ahead" },
          { cat: "explore", nm: "Bushrangers Bay walk", pl: "Cape Schanck", note: "Park at Cape Schanck, not Boneo" },
        ],
      },
    ],
    fallback: {
      a: [
        "I work from Peninsula Insider's editorial research, every venue visited. Try me with something specific: a long lunch this Saturday, a cellar door without the lunch, a one-night escape for two.",
        "Or start with one of the popular searches below.",
      ],
      res: [],
    },
  },

  weekend: {
    tabs: [
      { id: "today",   label: "Today",        ct: 12 },
      { id: "weekend", label: "This Weekend", ct: 27 },
      { id: "week",    label: "This Week",    ct: 64 },
      { id: "month",   label: "This Month",   ct: 188 },
    ],
    today: [
      { slug: "laura",   cat: "eat",  name: "Laura at Pt Leo", place: "Merricks", sig: "Sit at the bar, not the dining room. Better view, faster service. The kingfish is the order.", authority: "2 hats · Good Food", verified: "29 May", pick: true },
      { slug: "phs",     cat: "explore", name: "Peninsula Hot Springs", place: "Rye", sig: "Morning session beats midday for crowds and heat. Skip the food add-on.", verified: "26 May", pick: false },
      { slug: "tmbt",    cat: "wine", name: "Ten Minutes by Tractor", place: "Main Ridge", sig: "Three vineyards, one table, and the Wallis chardonnay is the pour.", authority: "Halliday 96", verified: "24 May", pick: true },
      { slug: "schanck", cat: "explore", name: "Cape Schanck boardwalk", place: "Cape Schanck", sig: "The 1859 lighthouse, the walk to Pulpit Rock. Grounds free from 6am.", verified: "12 May", pick: false },
    ],
    weekend: [
      { slug: "tedesca", cat: "eat",  name: "Tedesca Osteria", place: "Red Hill", sig: "Brigitte Hafner's wood-fire menu. Book the last lunch sitting.", authority: "2 hats · Good Food", verified: "7 May", pick: true },
      { slug: "foxeys",  cat: "wine", name: "Foxeys Hangout", place: "Red Hill", sig: "The deck holds a group properly. Lunch menu is sharper than dinner.", authority: "Halliday 94", verified: "2 May", pick: true },
      { slug: "jackalope", cat: "stay", name: "Jackalope", place: "Merricks", sig: "The architecture does the work. Book Doot Doot Doot for dinner the same night.", authority: "Featured · Wallpaper", verified: "4 May", pick: false },
      { slug: "bushrangers", cat: "explore", name: "Bushrangers Bay walk", place: "Cape Schanck", sig: "Two hours, almost nobody on it after lunch. The wildflowers come late April.", verified: "30 Apr", pick: false },
    ],
    week: [
      { slug: "tmbt2",   cat: "wine", name: "Ten Minutes by Tractor", place: "Main Ridge", sig: "Three vineyards, one table. The Wallis pinot is the pour.", authority: "Halliday 96", verified: "24 May", pick: true },
      { slug: "polperro", cat: "stay", name: "Polperro", place: "Red Hill", sig: "Vineyard villas with the cellar door across the path. Books out by Wednesday.", verified: "21 May", pick: false },
      { slug: "ppe",     cat: "wine", name: "Port Phillip Estate", place: "Red Hill", sig: "The architecture does the heavy lifting. Go for the building, stay for the chardonnay.", authority: "Halliday 95", verified: "18 May", pick: false },
      { slug: "boatyard", cat: "eat", name: "The Boatyard", place: "Flinders", sig: "Village lunch on the quiet south coast. The fish, then the cliff walk.", verified: "16 May", pick: false },
    ],
    month: [
      { slug: "sorrento-wf", cat: "explore", name: "Sorrento Writers' Festival", place: "Sorrento", sig: "Three days at the Sorrento Hotel. Book the opening night before it fills.", verified: "1 Jun", pick: true },
      { slug: "quealy",  cat: "wine", name: "Quealy", place: "Balnarring", sig: "Underrated pinot makers, no theatre. Friday afternoon is the visit.", verified: "27 May", pick: false },
      { slug: "doot",    cat: "eat",  name: "Doot Doot Doot", place: "Merricks", sig: "Jackalope's dining room. Worth a booking even if you are not staying.", authority: "1 hat · Good Food", verified: "20 May", pick: false },
      { slug: "arthurs", cat: "explore", name: "Arthurs Seat Eagle", place: "Arthurs Seat", sig: "The gondola on a clear winter day reads the whole bay at once.", verified: "14 May", pick: false },
    ],
  },

  feature: {
    section: "Slow Peninsula · 7 min read",
    titleA: "The ",
    titleEm: "other",
    titleB: " Peninsula weekend.",
    href: "#",
    dek: "When Red Hill is booked out and Sorrento feels like a queue, Flinders offers another version of the weekend. South of everything, closer to the ocean, and slower on purpose.",
    author: "James Richmond",
    date: "Saturday 31 May",
    read: "7 min read",
    credit: "Bushrangers Bay, south coast",
  },
  journalRail: [
    { slug: "winter-weekend", section: "Feature · 8 min", titleA: "A ", titleEm: "winter", titleB: " Peninsula weekend.", dek: "A fire in every cellar door with a hearth, and a coast that looks like a different country in a southerly.", meta: "James Richmond · 24 May" },
    { slug: "late-walks", section: "Walk · 7 min", titleA: "When the light ", titleEm: "starts improving.", titleB: "", dek: "Bushrangers Bay for a full reset, Cape Schanck when time is short. The four walks that earn the second drink.", meta: "Remy Hines · 18 May" },
    { slug: "hatted", section: "Feature · 9 min", titleA: "The hatted restaurants of the ", titleEm: "Peninsula.", titleB: "", dek: "Every hat on the Peninsula, visited and ranked, with the one table to ask for at each.", meta: "James Richmond · 11 May" },
  ],

  interstitial: {
    eyebrow: "First time down? Start here",
    quoteA: "Ninety minutes from Melbourne. A ",
    quoteEm: "whole season",
    quoteB: " from the city.",
    sub: "Coming down this weekend? Three editors have already planned it. Start with the orientation drive, or tell the Insider what you want from the two days.",
    credit: "Two Bays road, toward the tip",
  },

  places: [
    { slug: "sorrento",  name: "Sorrento",   count: "Bay village · 34 pins", size: "wide" },
    { slug: "red-hill",  name: "Red Hill",   count: "Wine country · 41 pins", size: "tall" },
    { slug: "flinders",  name: "Flinders",   count: "South coast · 18 pins", size: "" },
    { slug: "portsea",   name: "Portsea",    count: "The tip · 22 pins", size: "" },
    { slug: "merricks",  name: "Merricks",   count: "Hinterland · 16 pins", size: "" },
    { slug: "main-ridge",name: "Main Ridge", count: "The plateau · 19 pins", size: "" },
    { slug: "arthurs",   name: "Arthurs Seat", count: "Above the bay · 12 pins", size: "wide" },
    { slug: "rye",       name: "Rye",        count: "Back beach · 15 pins", size: "" },
  ],

  pins: [
    { slug: "tedesca", cat: "eat",  name: "Tedesca Osteria", place: "Red Hill",   x: 460, y: 250 },
    { slug: "laura",   cat: "eat",  name: "Laura at Pt Leo",  place: "Merricks",   x: 500, y: 320 },
    { slug: "foxeys",  cat: "wine", name: "Foxeys Hangout",  place: "Red Hill",   x: 440, y: 220 },
    { slug: "tmbt",    cat: "wine", name: "Ten Minutes by Tractor", place: "Main Ridge", x: 410, y: 200 },
    { slug: "ppe",     cat: "wine", name: "Port Phillip Estate", place: "Red Hill", x: 470, y: 285 },
    { slug: "jackalope", cat: "stay", name: "Jackalope",     place: "Merricks",   x: 488, y: 348 },
    { slug: "polperro", cat: "stay", name: "Polperro",       place: "Red Hill",   x: 382, y: 268 },
    { slug: "bushrangers", cat: "explore", name: "Bushrangers Bay", place: "Cape Schanck", x: 408, y: 470 },
    { slug: "phs",     cat: "explore", name: "Peninsula Hot Springs", place: "Rye", x: 356, y: 430 },
    { slug: "red-hill", cat: "place", name: "Red Hill",      place: "Hinterland", x: 450, y: 238 },
    { slug: "sorrento", cat: "place", name: "Sorrento",      place: "Bay side",   x: 276, y: 360 },
    { slug: "flinders", cat: "place", name: "Flinders",      place: "South coast", x: 512, y: 412 },
  ],

  plans: [
    { slug: "ridge-to-sea", badge: "PI Plan · 2 nights", title: "Ridge to Sea", dek: "Start in Red Hill wine country, finish at the southern tip, and let the weekend widen as it goes.", meta: ["Best for couples", "Red Hill base", "95 min drive"] },
    { slug: "wellness", badge: "PI Plan · 2 nights", title: "The Wellness Reset", dek: "Thermal pools, a long walk, a slow lunch, and two nights of actual sleep. For people whose brief is simply to stop.", meta: ["Best for two", "Peninsula base", "70 min drive"] },
    { slug: "sorrento-off", badge: "PI Plan · 2 nights", title: "Sorrento Off-Season", dek: "A village-based plan that uses the tip properly. Back beach, national park, a village dinner, the fort walk.", meta: ["Best for couples", "Sorrento base", "55 min drive"] },
  ],
  planIntents: ["Day trip from Melbourne", "One night away", "Full long weekend", "Wellness weekend"],

  shortlist: [
    { n: "01", section: "Wine", title: "The Chardonnay Case", href: "#", dek: "Everyone sells the Peninsula as a pinot region. They are half right. The quiet argument of the last three vintages is that the chardonnay is now the more interesting bottle on the table, and the one worth cellaring." },
    { n: "02", section: "Plan", title: "The Peninsula Pantry", href: "#", dek: "If you have booked a villa with a kitchen, you have booked one of the great food sourcing weekends in Victoria. Here is the circuit, market first, bakery second, wine last, that actually does the region justice." },
    { n: "03", section: "Stay", title: "The Thermal Springs Weekend", href: "#", dek: "Most people arrive at the Peninsula's thermal baths with a ticket and no plan. That is why most leave faintly disappointed. Here is the version that actually works." },
  ],

  letter: {
    titleA: "On the particular pleasure of a ",
    titleEm: "winter Peninsula.",
    body: "Winter is the season the Peninsula stops performing for tourists. The weekend crowds go home, the dining rooms empty out, and the ridge settles into a quiet it only finds for about eight weeks a year. We have updated the cellar-door shortlist for fireside season and added the thermal springs guide for the weeks ahead.",
    quote: "This issue is built for the season where empty tables are a feature, not a failing, and the coast is at its most honest.",
    sign: "The Editors",
    role: "Peninsula Insider",
  },

  newsletter: {
    title: "This weekend on the Peninsula, ",
    titleEm: "in your inbox.",
    dek: "One useful Peninsula email. Where to book, what changed, what is worth the drive, sent when there is actually something worth knowing.",
    micro: ["Independent", "No affiliate links", "Unsubscribe any time"],
    card: {
      label: "Latest dispatch · 24 May",
      title: "Peninsula This Weekend",
      lines: ["How to build a Red Hill Saturday", "The cellar-door short list, for winter", "Three things worth the drive"],
      read: "Read in 3 minutes · used all weekend",
    },
  },

  footer: {
    cols: [
      { h: "Discover", links: ["Eat & Drink", "Wine", "Stay", "Explore", "What's On"] },
      { h: "Plan", links: ["This Weekend", "Plans & itineraries", "The Insider Map", "Places", "Ask The Insider"] },
      { h: "The Insider", links: ["About", "Partners", "Submit a tip", "Corrections", "Careers"] },
    ],
    ack: "Peninsula Insider acknowledges the Bunurong people of the Kulin Nation as the Traditional Custodians of the lands and waters of the Mornington Peninsula. We pay our respects to Elders past and present and acknowledge their continuing connection to Country, culture and community.",
  },
};

window.PI = { DATA, CATS };
