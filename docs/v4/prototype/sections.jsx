/* eslint-disable */
// Peninsula Insider — Home, reimagined. Page sections.
const { useState: useSecState } = React;

/* ---------------- HERO ---------------- */
function Hero() {
  const h = window.PI.DATA.hero;
  return (
    <section className="hero hero__grain" id="top">
      <div className="hero__media">
        <image-slot id="hero-cover" placeholder="Drop the cover photograph — a winter Peninsula coast" radius="0" src={window.stock("hero-cape-schanck", 1800, 1200)}
          style={{ background: "linear-gradient(155deg, #3a4a52 0%, #233038 45%, #1c1a14 100%)" }}></image-slot>
      </div>
      <div className="hero__scrim" />
      <div className="hero__spine"><span>Peninsula Insider · No. 06</span></div>
      <div className="wrap hero__inner">
        <div className="hero__grid">
          <div>
            <Eyebrow bone>{h.eyebrow}</Eyebrow>
            <h1 className="hero__title" style={{ marginTop: 20 }}>{h.titleA}<em>{h.titleEm}</em></h1>
            <p className="hero__dek">{h.dek}</p>
            <div className="hero__meta">By <a href="#" onClick={(e) => e.preventDefault()}>{h.author}</a> · {h.date} · {h.read}</div>
            <div className="hero__cta">
              <a className="btn btn--primary" href="#" onClick={(e) => e.preventDefault()}>Read the cover story <IArrow s={15} /></a>
              <a className="btn btn--line-bone" href="#ask" onClick={(e) => { e.preventDefault(); document.getElementById("ask").scrollIntoView({ behavior: "smooth" }); }}>Ask The Insider</a>
            </div>
          </div>
          <div className="hero__lines">
            <h4>In this issue</h4>
            <ul>
              {h.lines.map((l) => (
                <li key={l.n}>
                  <a href={l.href} onClick={(e) => { e.preventDefault(); const el = document.querySelector(l.href); if (el) el.scrollIntoView({ behavior: "smooth" }); }}>
                    <span className="n">{l.n} — </span>{l.t}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="hero__credit">{h.credit} · drop your own</div>
      <div className="hero__scroll"><span>Scroll</span><span className="bar" /></div>
    </section>
  );
}

/* ---------------- THIS WEEKEND ---------------- */
function Weekend() {
  const w = window.PI.DATA.weekend;
  const [tab, setTab] = useSecState("weekend");
  const list = w[tab] || w.weekend;
  return (
    <section className="band" id="weekend">
      <div className="wrap">
        <div className="reveal">
          <SHead eyebrow="What's on now" title="This weekend on the <em>Peninsula</em>" more="See what's on" />
        </div>
        <div className="tw-tabs reveal">
          {w.tabs.map((t) => (
            <button key={t.id} className={"tw-tab" + (tab === t.id ? " is-active" : "")} onClick={() => setTab(t.id)}>
              {t.label}<span className="ct">{t.ct}</span>
            </button>
          ))}
        </div>
        <div className="cards-4 reveal">
          {list.map((v) => <VenueCard key={v.slug} v={v} />)}
        </div>
      </div>
    </section>
  );
}

/* ---------------- JOURNAL: lead feature + rail ---------------- */
function Journal() {
  const f = window.PI.DATA.feature;
  const rail = window.PI.DATA.journalRail;
  return (
    <section className="band band--soft" id="journal">
      <div className="wrap">
        <div className="feat reveal">
          <div className="feat__media">
            <image-slot id="feat-cover" placeholder="Bushrangers Bay, south coast" radius="0" src={window.stock("feature-bushrangers", 1200, 860)}
              style={{ background: "linear-gradient(155deg, #7e8e6f, #3a4a52 60%, #1c1a14)" }}></image-slot>
            <span className="feat__credit">{f.credit}</span>
          </div>
          <div>
            <Eyebrow>{f.section}</Eyebrow>
            <h2 className="feat__title"><a href="#" onClick={(e) => e.preventDefault()}>{f.titleA}<em>{f.titleEm}</em>{f.titleB}</a></h2>
            <p className="feat__dek">{f.dek}</p>
            <div className="feat__meta">By <a href="#" onClick={(e) => e.preventDefault()}>{f.author}</a> · {f.date} · {f.read}</div>
            <div style={{ marginTop: 26 }}>
              <a className="btn btn--line" href="#" onClick={(e) => e.preventDefault()}>Read the feature <IArrow s={14} /></a>
            </div>
          </div>
        </div>

        <div className="shead reveal" style={{ marginTop: 84 }}>
          <div>
            <Eyebrow mute>From the Journal</Eyebrow>
            <h2 className="shead__title">What we're writing this week</h2>
          </div>
          <a className="shead__more" href="#" onClick={(e) => e.preventDefault()}>All journal pieces <IArrow s={13} /></a>
        </div>
        <div className="cards-3 reveal">
          {rail.map((a) => <ArticleCard key={a.slug} a={a} />)}
        </div>
      </div>
    </section>
  );
}

/* ---------------- FULL-BLEED INTERSTITIAL ---------------- */
function Interstitial() {
  const i = window.PI.DATA.interstitial;
  return (
    <section className="inter">
      <div className="inter__media">
        <image-slot id="inter-cover" placeholder="The drive down — Two Bays road" radius="0" src={window.stock("interstitial-road", 1800, 1000)}
          style={{ background: "linear-gradient(120deg, #233038, #3a4a52 60%, #6b6253)" }}></image-slot>
      </div>
      <div className="inter__scrim" />
      <div className="wrap inter__inner">
        <div className="reveal" style={{ maxWidth: 760 }}>
          <Eyebrow bone>{i.eyebrow}</Eyebrow>
          <h2 className="inter__quote">{i.quoteA}<em>{i.quoteEm}</em>{i.quoteB}</h2>
          <p className="inter__sub">{i.sub}</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a className="btn btn--bone" href="#plans" onClick={(e) => { e.preventDefault(); document.getElementById("plans").scrollIntoView({ behavior: "smooth" }); }}>Start the orientation drive <IArrow s={15} /></a>
            <a className="btn btn--line-bone" href="#ask" onClick={(e) => { e.preventDefault(); document.getElementById("ask").scrollIntoView({ behavior: "smooth" }); }}>Ask the Insider instead</a>
          </div>
        </div>
      </div>
      <div className="inter__credit">{i.credit} · drop your own</div>
    </section>
  );
}

/* ---------------- EXPLORE: places mosaic ---------------- */
function Places() {
  const places = window.PI.DATA.places;
  return (
    <section className="band" id="places">
      <div className="wrap">
        <div className="reveal">
          <SHead eyebrow="Area guide" title="Explore the <em>Peninsula</em>" more="All places & the map" />
        </div>
        <div className="mosaic reveal">
          {places.map((p) => <PlaceTile key={p.slug} p={p} />)}
        </div>
      </div>
    </section>
  );
}

/* ---------------- THE INSIDER MAP ---------------- */
function MapCanvas({ pins, active, setActive }) {
  return (
    <svg viewBox="0 0 720 540" preserveAspectRatio="xMidYMid slice" className="map-svg">
      <rect width="720" height="540" fill="#f6f1e8" />
      {/* parkland */}
      <path d="M120 80 C 220 50, 340 140, 360 200 C 380 280, 280 320, 200 280 C 130 240, 80 160, 120 80 Z" fill="#dde2d4" opacity="0.85" />
      <path d="M480 100 C 560 110, 620 180, 580 240 C 540 290, 470 270, 460 220 C 450 180, 460 130, 480 100 Z" fill="#dde2d4" opacity="0.85" />
      <path d="M380 360 C 460 350, 520 410, 480 470 C 440 510, 360 490, 340 440 C 330 400, 350 370, 380 360 Z" fill="#dde2d4" opacity="0.85" />
      {/* coastline */}
      <path d="M40 380 C 120 360, 200 420, 240 430 C 320 440, 380 470, 460 490 C 540 510, 620 500, 700 510 L 720 540 L 0 540 Z" fill="#d7dde1" />
      <path d="M40 380 C 120 360, 200 420, 240 430 C 320 440, 380 470, 460 490 C 540 510, 620 500, 700 510" stroke="#3a4a52" fill="none" strokeWidth="1.6" />
      {/* roads */}
      <path d="M 40 200 C 200 180, 360 240, 500 220 C 600 210, 660 230, 720 240" stroke="#c45838" strokeOpacity="0.38" strokeWidth="2.5" fill="none" />
      <path d="M 80 320 C 200 310, 340 350, 460 330 C 560 320, 640 350, 720 340" stroke="#c45838" strokeOpacity="0.32" strokeWidth="2" fill="none" />
      <path d="M 460 60 C 460 200, 460 340, 460 480" stroke="#c45838" strokeOpacity="0.3" strokeWidth="2" fill="none" />
      {/* labels */}
      <text x="120" y="200" fontFamily="Cormorant Garamond, serif" fontStyle="italic" fontSize="15" fill="#5d6e54">Western Port</text>
      <text x="506" y="160" fontFamily="Cormorant Garamond, serif" fontStyle="italic" fontSize="15" fill="#5d6e54">Red Hill plateau</text>
      <text x="540" y="452" fontFamily="Cormorant Garamond, serif" fontStyle="italic" fontSize="15" fill="#3a4a52">Bass Strait</text>
      <text x="48" y="48" fontFamily="Outfit, sans-serif" fontSize="10" letterSpacing="0.24em" fill="#6b6253">THE INSIDER MAP</text>
      {/* pins */}
      {pins.map((p) => {
        const cat = window.PI.CATS[p.cat];
        const on = active === p.slug;
        return (
          <g key={p.slug} className="map-pin-g" onClick={() => setActive(p.slug)}>
            <circle className="dot" cx={p.x} cy={p.y} r={on ? 11 : 8} fill={cat.color} stroke="#faf6ee" strokeWidth="2.5" />
            {on && (
              <g style={{ pointerEvents: "none" }}>
                <rect x={p.x + 14} y={p.y - 24} width="196" height="48" rx="5" fill="#1c1a14" />
                <text x={p.x + 24} y={p.y - 7} fontFamily="Outfit, sans-serif" fontSize="9.5" letterSpacing="0.12em" fill="rgba(250,246,238,0.66)">{cat.label.toUpperCase()} · {p.place.toUpperCase()}</text>
                <text x={p.x + 24} y={p.y + 13} fontFamily="Cormorant Garamond, serif" fontSize="17" fill="#faf6ee">{p.name}</text>
              </g>
            )}
          </g>
        );
      })}
      <g transform="translate(680, 70)">
        <circle r="15" fill="#faf6ee" stroke="#d8ccb1" />
        <text y="-3" textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="9" fill="#6b6253">N</text>
        <polygon points="0,-10 -3,-3 3,-3" fill="#c45838" />
      </g>
    </svg>
  );
}

function InsiderMap() {
  const allPins = window.PI.DATA.pins;
  const [cat, setCat] = useSecState("all");
  const [active, setActive] = useSecState(allPins[0].slug);
  const cats = Object.entries(window.PI.CATS);
  const counts = {};
  allPins.forEach((p) => { counts[p.cat] = (counts[p.cat] || 0) + 1; });
  const pins = cat === "all" ? allPins : allPins.filter((p) => p.cat === cat);
  return (
    <section className="band band--soft" id="map">
      <div className="wrap">
        <div className="reveal">
          <SHead eyebrow="The Insider Map" title="Every editorial pin, on <em>one screen</em>." more="Open the full map" />
        </div>
        <div className="map-wrap reveal">
          <div className="map-canvas"><MapCanvas pins={pins} active={active} setActive={setActive} /></div>
          <div className="map-side">
            <div className="map-side__head">
              <h3>The Insider Map</h3>
              <div className="sub">{pins.length} pins · {cat === "all" ? "five categories" : window.PI.CATS[cat].label}. Filter, then tap a pin.</div>
            </div>
            <div className="map-filters">
              <button className={"chip" + (cat === "all" ? " is-active" : "")} onClick={() => setCat("all")}>All</button>
              {cats.map(([id, c]) => (
                <button key={id} className={"chip" + (cat === id ? " is-active" : "")} onClick={() => setCat(id)}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: c.color, display: "inline-block" }} />{c.label}
                </button>
              ))}
            </div>
            <div className="map-legend">
              {cats.map(([id, c]) => (
                <div key={id} className={"map-leg" + (cat !== "all" && cat !== id ? " dim" : "")} onClick={() => setCat(cat === id ? "all" : id)}>
                  <span className="pin" style={{ background: c.color }} />
                  <span className="nm">{c.label}</span>
                  <span className="ct">{counts[id] || 0}</span>
                </div>
              ))}
            </div>
            <div className="map-side__foot">
              <a className="btn btn--line btn--sm" href="#" onClick={(e) => e.preventDefault()}><IMap s={15} /> Open the full map</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- PLANS ---------------- */
function Plans() {
  const plans = window.PI.DATA.plans;
  const intents = window.PI.DATA.planIntents;
  const [intent, setIntent] = useSecState(intents[0]);
  return (
    <section className="band" id="plans">
      <div className="wrap">
        <div className="reveal">
          <SHead eyebrow="Plans & itineraries" title="Or take the <em>whole weekend</em>." more="All editorial plans" />
        </div>
        <div className="plan-intro reveal">
          {intents.map((it) => (
            <button key={it} className={"chip" + (intent === it ? " is-active" : "")} onClick={() => setIntent(it)}>{it}</button>
          ))}
        </div>
        <div className="cards-3 reveal">
          {plans.map((p, i) => <PlanCard key={p.slug} p={p} i={i} />)}
        </div>
      </div>
    </section>
  );
}

/* ---------------- SHORTLIST ---------------- */
function Shortlist() {
  const items = window.PI.DATA.shortlist;
  return (
    <section className="band band--deep" id="shortlist">
      <div className="wrap">
        <div className="reveal">
          <SHead eyebrow="The Shortlist" title="Three pieces worth the <em>appointment</em>." more="View the Journal" />
        </div>
        <div className="shortlist">
          {items.map((it) => (
            <div className="sl-item reveal" key={it.n}>
              <div className="sl-item__n">{it.n}</div>
              <div>
                <span className="sl-item__sec">{it.section}</span>
                <h3 className="sl-item__title"><a href={it.href} onClick={(e) => e.preventDefault()}>{it.title}</a></h3>
                <p className="sl-item__dek">{it.dek}</p>
              </div>
              <a className="sl-item__go" href={it.href} onClick={(e) => e.preventDefault()} aria-label="Read"><IArrowUR s={22} /></a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- EDITOR'S LETTER ---------------- */
function Letter() {
  const l = window.PI.DATA.letter;
  return (
    <section className="band band--soft">
      <div className="wrap--prose letter reveal">
        <Eyebrow mute>Editor's Letter</Eyebrow>
        <h2 className="letter__title">{l.titleA}<em>{l.titleEm}</em></h2>
        <p className="letter__body">{l.body}</p>
        <blockquote className="letter__quote">{l.quote}</blockquote>
        <div className="letter__sign">{l.sign}</div>
        <div className="letter__role">{l.role}</div>
      </div>
    </section>
  );
}

/* ---------------- NEWSLETTER ---------------- */
function Newsletter() {
  const n = window.PI.DATA.newsletter;
  const [sent, setSent] = useSecState(false);
  return (
    <section className="band nl">
      <div className="wrap">
        <div className="nl__inner">
          <div className="reveal">
            <Eyebrow color="var(--pi-terracotta)">Peninsula This Weekend</Eyebrow>
            <h2 className="nl__title">{n.title}<em>{n.titleEm}</em></h2>
            <p className="nl__dek">{n.dek}</p>
            <form className="nl__form" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
              <input type="email" placeholder="you@example.com" aria-label="Email address" required />
              <button className="btn btn--primary" type="submit">{sent ? "You're in" : "Join the Dispatch"}</button>
            </form>
            <div className="nl__micro">
              {n.micro.map((m) => <span key={m}><span className="dot" />{m}</span>)}
            </div>
          </div>
          <div className="nl__card reveal" style={{ transitionDelay: "0.08s" }}>
            <div className="lbl">{n.card.label}</div>
            <h4>{n.card.title}</h4>
            <ul>
              {n.card.lines.map((li) => <li key={li}><span className="di">—</span>{li}</li>)}
            </ul>
            <div className="read">{n.card.read}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { Hero, Weekend, Journal, Interstitial, Places, InsiderMap, Plans, Shortlist, Letter, Newsletter });
