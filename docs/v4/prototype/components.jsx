/* eslint-disable */
// Peninsula Insider — Home, reimagined. Shared components.
const { useState, useEffect, useRef } = React;

/* -------- Icons (Lucide-style, 1.6 stroke) -------- */
const Svg = ({ s = 18, sw = 1.6, fill = "none", children }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const IBookmark = ({ s = 16, filled }) => <Svg s={s} fill={filled ? "currentColor" : "none"}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></Svg>;
const IArrow = ({ s = 15 }) => <Svg s={s}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></Svg>;
const IArrowUR = ({ s = 16 }) => <Svg s={s}><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></Svg>;
const ISearch = ({ s = 18 }) => <Svg s={s}><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Svg>;
const ICheck = ({ s = 12 }) => <Svg s={s} sw={2.4}><polyline points="20 6 9 17 4 12" /></Svg>;
const ISend = ({ s = 18 }) => <Svg s={s}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></Svg>;
const IMap = ({ s = 18 }) => <Svg s={s}><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></Svg>;
const IClock = ({ s = 14 }) => <Svg s={s}><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></Svg>;
const IUsers = ({ s = 14 }) => <Svg s={s}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Svg>;
const ICar = ({ s = 14 }) => <Svg s={s}><path d="M5 17H3v-5l2-5h14l2 5v5h-2" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /><line x1="9" y1="17" x2="15" y2="17" /></Svg>;
const IClose = ({ s = 20 }) => <Svg s={s}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Svg>;
const IHome = ({ s = 20 }) => <Svg s={s}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></Svg>;
const IFork = ({ s = 20 }) => <Svg s={s}><path d="M6 3v7a2 2 0 0 0 4 0V3" /><line x1="8" y1="10" x2="8" y2="21" /><path d="M17 3c-1.5 0-2.5 1.8-2.5 4.5S15.5 12 17 12s2.5-1.8 2.5-4.5S18.5 3 17 3z" /><line x1="17" y1="12" x2="17" y2="21" /></Svg>;
const IBook = ({ s = 20 }) => <Svg s={s}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></Svg>;
const ICompass = ({ s = 20 }) => <Svg s={s}><circle cx="12" cy="12" r="9" /><polygon points="16.2 7.8 14.1 14.1 7.8 16.2 9.9 9.9 16.2 7.8" /></Svg>;

/* -------- Save toggle -------- */
function Save({ light }) {
  const [on, setOn] = useState(false);
  return (
    <button className={"save" + (on ? " is-saved" : "")} aria-label={on ? "Saved" : "Save for later"} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOn(!on); }}>
      <IBookmark s={15} filled={on} />
    </button>
  );
}

/* -------- Eyebrow -------- */
function Eyebrow({ children, mute, bone, color }) {
  return <span className={"eyebrow" + (mute ? " eyebrow--mute" : "") + (bone ? " eyebrow--bone" : "")} style={color ? { color } : null}><span className="rule" />{children}</span>;
}

/* -------- Section head -------- */
function SHead({ eyebrow, title, more, color }) {
  return (
    <div className="shead">
      <div>
        <Eyebrow color={color}>{eyebrow}</Eyebrow>
        <h2 className="shead__title" dangerouslySetInnerHTML={{ __html: title }} />
      </div>
      {more && <a className="shead__more" href="#" onClick={(e) => e.preventDefault()}>{more} <IArrow s={13} /></a>}
    </div>
  );
}

/* -------- Stock stand-in photography --------
   Returns null so image slots ship EMPTY (elegant tonal placeholder).
   Drop a photo on any slot to fill it, or return a URL here to seed stand-ins. */
const stock = (seed, w = 1100, h = 825) => null;

/* -------- Image slot helper (falls back to a tonal wash) -------- */
function Slot({ id, ph, gradient, img }) {
  // gradient gives an elegant empty state in the palette; img is a stand-in fallback
  return (
    <image-slot id={id} placeholder={ph || "Drop a photo"} radius="0" src={img || undefined} style={gradient ? { background: gradient } : null}></image-slot>
  );
}

/* -------- Masthead -------- */
function Masthead() {
  const c = window.PI.DATA.conditions;
  const nav = ["Eat & Drink", "Wine", "Stay", "Explore", "What's On", "Plans", "Journal"];
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  const goAsk = (e) => { e.preventDefault(); setOpen(false); document.getElementById("ask").scrollIntoView({ behavior: "smooth", block: "start" }); };
  return (
    <React.Fragment>
    <header className="mast">
      <div className="wrap">
        <div className="mast__util">
          <span className="mast__cond"><span className="dot" />{c.town} {c.temp} · Sunset {c.sunset} · {c.note}</span>
          <span className="mast__util-right">
            <span className="mast__issue">{window.PI.DATA.issue}</span>
            <a href="#" onClick={(e) => e.preventDefault()}>Saved</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Login</a>
          </span>
        </div>
        <div className="mast__bar">
          <button className="mast__burger" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
            <span /><span /><span />
          </button>
          <a className="mast__brand" href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
            <span className="mast__lockup">Peninsula <em>Insider</em></span>
          </a>
          <nav className="mast__nav">
            {nav.map((n) => <a key={n} href="#" onClick={(e) => e.preventDefault()}>{n}</a>)}
          </nav>
          <div className="mast__actions">
            <button className="mast__icon-btn" aria-label="Search"><ISearch s={17} /></button>
            <a className="btn btn--primary btn--sm mast__ask" href="#ask" onClick={goAsk}>Ask The Insider</a>
          </div>
        </div>
      </div>
    </header>

      {/* Mobile drawer — rendered outside the header so the header's
          backdrop-filter doesn't trap this fixed element. */}
      <div className={"mnav" + (open ? " is-open" : "")} aria-hidden={!open}>
        <div className="mnav__scrim" onClick={() => setOpen(false)} />
        <aside className="mnav__panel" role="dialog" aria-label="Menu">
          <div className="mnav__head">
            <span className="mast__lockup">Peninsula <em>Insider</em></span>
            <button className="mnav__close" aria-label="Close menu" onClick={() => setOpen(false)}><IClose s={20} /></button>
          </div>
          <nav className="mnav__links">
            {nav.map((n) => <a key={n} href="#" onClick={(e) => { e.preventDefault(); setOpen(false); }}>{n}<IArrow s={16} /></a>)}
          </nav>
          <div className="mnav__foot">
            <a className="btn btn--primary" href="#ask" onClick={goAsk}>Ask The Insider</a>
            <div className="mnav__util">
              <a href="#" onClick={(e) => { e.preventDefault(); setOpen(false); }}>Saved</a>
              <a href="#" onClick={(e) => { e.preventDefault(); setOpen(false); }}>Login</a>
              <span className="mnav__cond"><span className="dot" />{c.town} {c.temp} · Sunset {c.sunset}</span>
            </div>
          </div>
        </aside>
      </div>
    </React.Fragment>
  );
}

/* -------- Mobile bottom bar -------- */
function MobileBar() {
  const items = [
    { id: "top", label: "Home", icon: <IHome s={20} /> },
    { id: "weekend", label: "Eat", icon: <IFork s={20} /> },
    { id: "journal", label: "Read", icon: <IBook s={20} /> },
    { id: "plans", label: "Plan", icon: <ICompass s={20} /> },
    { id: "map", label: "Map", icon: <IMap s={20} /> },
  ];
  const go = (id) => {
    if (id === "top") { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <nav className="mbar" aria-label="Quick navigation">
      {items.map((it) => (
        <button key={it.id} className="mbar__item" onClick={() => go(it.id)}>
          {it.icon}<span>{it.label}</span>
        </button>
      ))}
    </nav>
  );
}

/* -------- Venue card -------- */
function VenueCard({ v }) {
  const cat = window.PI.CATS[v.cat];
  return (
    <article className="vcard">
      <div className="vcard__media">
        <Slot id={"v-" + v.slug} ph={v.name} img={stock(v.cat + "-" + v.slug)} gradient={`linear-gradient(150deg, ${cat.color}, #1c1a14)`} />
        {v.pick && <span className="vcard__pick"><span className="bd bd--pick">Insider Pick</span></span>}
        <span className="vcard__save"><Save /></span>
      </div>
      <div className="vcard__body">
        <span className="vcard__cat" style={{ color: cat.color }}><span className="dot" style={{ background: cat.color }} />{cat.label} · {v.place}</span>
        <h3 className="vcard__name">{v.name}</h3>
        <p className="vcard__sig">{v.sig}</p>
        <div className="vcard__meta">
          {v.authority && <span>{v.authority}</span>}
          {v.authority && <span>·</span>}
          <span className="vcard__verified"><ICheck s={11} /> Verified {v.verified}</span>
        </div>
        <div className="vcard__actions">
          <a href="#" onClick={(e) => e.preventDefault()}>Read the notes <IArrow s={12} /></a>
          <a className="alt" href="#" onClick={(e) => e.preventDefault()}>Book</a>
        </div>
      </div>
    </article>
  );
}

/* -------- Article rail card -------- */
function ArticleCard({ a }) {
  const cat = window.PI.CATS.eat;
  return (
    <article className="acard" onClick={(e) => e.preventDefault()}>
      <div className="acard__media"><Slot id={"a-" + a.slug} ph={a.titleEm || "Feature"} img={stock("story-" + a.slug)} gradient="linear-gradient(150deg, #3a4a52, #1c1a14)" /></div>
      <span className="acard__sec">{a.section}</span>
      <h3 className="acard__title">{a.titleA}<em>{a.titleEm}</em>{a.titleB}</h3>
      <p className="acard__dek">{a.dek}</p>
    </article>
  );
}

/* -------- Place tile -------- */
function PlaceTile({ p }) {
  const cls = "place" + (p.size === "wide" ? " place--wide" : p.size === "tall" ? " place--tall" : "");
  const grads = ["linear-gradient(160deg,#7e8e6f,#3a4a52)", "linear-gradient(160deg,#c45838,#6e2330)", "linear-gradient(160deg,#3a4a52,#1c1a14)", "linear-gradient(160deg,#8a5a3a,#3a4a52)"];
  const g = grads[(p.name.length) % grads.length];
  return (
    <div className={cls} onClick={(e) => e.preventDefault()}>
      <Slot id={"p-" + p.slug} ph={p.name} img={stock("place-" + p.slug)} gradient={g} />
      <div className="place__scrim" />
      <div className="place__label">
        <div>
          <div className="place__name">{p.name}</div>
          <div className="place__count">{p.count}</div>
        </div>
        <span className="place__arrow"><IArrowUR s={20} /></span>
      </div>
    </div>
  );
}

/* -------- Plan card -------- */
function PlanCard({ p, i }) {
  const grads = ["linear-gradient(180deg,#6e2330,#1c1a14)", "linear-gradient(180deg,#3a4a52,#1c1a14)", "linear-gradient(180deg,#7e8e6f,#1c1a14)"];
  const icons = [<ICar s={13} />, <IUsers s={13} />, <IClock s={13} />];
  return (
    <article className="icard" onClick={(e) => e.preventDefault()}>
      <image-slot id={"plan-" + p.slug} placeholder={p.title} radius="0" src={stock("plan-" + p.slug)} style={{ background: grads[i % 3] }}></image-slot>
      <div className="icard__scrim" />
      <div className="icard__body">
        <span className="icard__badge">{p.badge}</span>
        <h3 className="icard__title">{p.title}</h3>
        <p className="icard__dek">{p.dek}</p>
        <div className="icard__meta">
          {p.meta.map((m, idx) => (
            <React.Fragment key={m}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{idx === 0 ? icons[1] : idx === 1 ? <IMap s={13} /> : <ICar s={13} />}{m}</span>
              {idx < p.meta.length - 1 && <span>·</span>}
            </React.Fragment>
          ))}
        </div>
        <span className="icard__cta">View the plan <IArrow s={14} /></span>
      </div>
    </article>
  );
}

/* -------- Footer -------- */
function Footer() {
  const f = window.PI.DATA.footer;
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__top">
          <div>
            <div className="footer__lockup">Peninsula <em>Insider</em></div>
            <p className="footer__blurb">Built on the Peninsula, for the Peninsula. Every venue visited, every opinion earned, clearly labelled when partner-supplied.</p>
          </div>
          {f.cols.map((col) => (
            <div className="footer__col" key={col.h}>
              <h6>{col.h}</h6>
              {col.links.map((l) => <a key={l} href="#" onClick={(e) => e.preventDefault()}>{l}</a>)}
            </div>
          ))}
        </div>
        <p className="footer__ack">{f.ack}</p>
        <div className="footer__legal">
          <span>© 2026 Peninsula Insider, a trading name of Optiflows Pty Ltd</span>
          <span className="grp">
            <a href="#" onClick={(e) => e.preventDefault()}>Privacy</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Terms</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Contact</a>
          </span>
        </div>
      </div>
    </footer>
  );
}

/* -------- Scroll reveal hook -------- */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  });
}

Object.assign(window, {
  Svg, IBookmark, IArrow, IArrowUR, ISearch, ICheck, ISend, IMap, IClock, IUsers, ICar,
  IClose, IHome, IFork, IBook, ICompass,
  Save, Eyebrow, SHead, Slot, Masthead, MobileBar, VenueCard, ArticleCard, PlaceTile, PlanCard, Footer, useReveal,
});
