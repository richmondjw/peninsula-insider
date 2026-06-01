/* eslint-disable */
// Peninsula Insider — Ask The Insider (interactive centrepiece)
const { useState: useAskState, useRef: useAskRef, useEffect: useAskEffect } = React;

function matchQA(text) {
  const D = window.PI.DATA.ask;
  const t = text.toLowerCase();
  let best = null, bestScore = 0;
  D.qa.forEach((qa) => {
    let score = 0;
    qa.match.forEach((m) => { if (t.includes(m)) score += m.length; });
    if (score > bestScore) { bestScore = score; best = qa; }
  });
  return best || { a: D.fallback.a, res: D.fallback.res };
}

function AskResult({ r }) {
  const cat = window.PI.CATS[r.cat];
  return (
    <a className="ask-res" href="#" onClick={(e) => e.preventDefault()}>
      <span className="ask-res__pin" style={{ background: cat.color }} />
      <span className="ask-res__tx">
        <span className="ask-res__cat" style={{ color: cat.color }}>{cat.label} · {r.place || r.pl}</span>
        <span className="ask-res__nm">{r.nm} <span className="pl">{r.note}</span></span>
      </span>
      <span className="ask-res__go"><IArrow s={16} /></span>
    </a>
  );
}

/* PI message that streams its paragraphs in, then reveals result cards */
function PiMessage({ paras, res, onStep }) {
  const [shown, setShown] = useAskState(0); // number of paragraphs fully shown
  const [typing, setTyping] = useAskState(true);

  useAskEffect(() => {
    let cancelled = false;
    // brief "thinking" before first paragraph
    const seq = async () => {
      await wait(620);
      if (cancelled) return;
      setTyping(false);
      for (let i = 0; i < paras.length; i++) {
        // reveal paragraph i
        setShown(i + 1);
        onStep && onStep();
        // pause proportional to length, between paragraphs
        await wait(Math.min(1400, 480 + paras[i].replace(/<[^>]+>/g, "").length * 7));
        if (cancelled) return;
      }
      setShown(paras.length + 1); // signal: show results
      onStep && onStep();
    };
    seq();
    return () => { cancelled = true; };
  }, []);

  function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

  return (
    <div className="msg msg--pi">
      <span className="msg__av"><img src="assets/pi-logo.svg" width="30" height="30" alt="PI" /></span>
      <div className="msg__bubble">
        {typing && <div className="ask-typing"><span /><span /><span /></div>}
        {paras.slice(0, shown).map((p, i) => (
          <p key={i} dangerouslySetInnerHTML={{ __html: p }} style={{ animation: "msgIn 360ms var(--pi-ease-out) both" }} />
        ))}
        {shown > paras.length && res && res.length > 0 && (
          <div className="ask-results" style={{ animation: "msgIn 420ms var(--pi-ease-out) both" }}>
            {res.map((r, i) => <AskResult key={i} r={r} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function AskInsider() {
  const D = window.PI.DATA.ask;
  const [thread, setThread] = useAskState([
    { id: 0, role: "pi", paras: D.intro, res: [] },
  ]);
  const [val, setVal] = useAskState("");
  const [busy, setBusy] = useAskState(false);
  const threadRef = useAskRef(null);
  const idRef = useAskRef(1);

  function scrollDown() {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }
  useAskEffect(scrollDown, [thread]);

  function send(text) {
    const q = (text || "").trim();
    if (!q || busy) return;
    setBusy(true);
    setVal("");
    const userMsg = { id: idRef.current++, role: "user", text: q };
    setThread((t) => [...t, userMsg]);
    const ans = matchQA(q);
    const piMsg = { id: idRef.current++, role: "pi", paras: ans.a, res: ans.res };
    // add PI message shortly after the user's message lands
    setTimeout(() => {
      setThread((t) => [...t, piMsg]);
      // release busy after the answer roughly finishes streaming
      const dur = 700 + ans.a.reduce((s, p) => s + Math.min(1400, 480 + p.replace(/<[^>]+>/g, "").length * 7), 0);
      setTimeout(() => setBusy(false), dur);
    }, 240);
  }

  return (
    <div className="ask-card">
      <div className="ask-card__head">
        <span className="av"><img src="assets/pi-logo.svg" width="38" height="38" alt="PI" /></span>
        <div>
          <div className="nm">The Insider</div>
          <div className="st">Local · usually responds in seconds</div>
        </div>
        <span className="badge">Source-grounded</span>
      </div>

      <div className="ask-thread" ref={threadRef}>
        {thread.map((m) =>
          m.role === "user" ? (
            <div className="msg msg--user" key={m.id}><div className="msg__bubble">{m.text}</div></div>
          ) : (
            <PiMessage key={m.id} paras={m.paras} res={m.res} onStep={scrollDown} />
          )
        )}
      </div>

      <div className="ask-compose">
        <form className="ask-input" onSubmit={(e) => { e.preventDefault(); send(val); }}>
          <ISearch s={18} />
          <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="Plan a winter weekend for two in Red Hill, one winery lunch and an easy walk." aria-label="Ask The Insider" />
          <button className="ask-send" type="submit" disabled={!val.trim() || busy} aria-label="Send"><ISend s={17} /></button>
        </form>
        <div className="ask-suggests">
          {D.suggests.map((s) => (
            <button key={s} className="chip" disabled={busy} onClick={() => send(s)}>{s}</button>
          ))}
        </div>
        <div className="ask-foot">The Insider works from Peninsula Insider editorial research. Verify hours and bookings before you go.</div>
      </div>
    </div>
  );
}

function AskSection() {
  const D = window.PI.DATA.ask;
  return (
    <section className="band ask-band" id="ask">
      <div className="wrap">
        <div className="ask-grid">
          <div className="ask-intro reveal">
            <Eyebrow>Ask The Insider</Eyebrow>
            <h2 className="ask-intro__title">What are you <em>looking for?</em></h2>
            <p className="ask-intro__body" dangerouslySetInnerHTML={{ __html: D.intro[0] }} />
            <div className="ask-intro__who">
              <span className="av"><img src="assets/pi-logo.svg" width="52" height="52" alt="PI" /></span>
              <div>
                <div className="nm">The Insider</div>
                <div className="rl"><span className="live" /> Local · usually responds in seconds</div>
              </div>
            </div>
          </div>
          <div className="reveal" style={{ transitionDelay: "0.1s" }}>
            <AskInsider />
          </div>
        </div>
      </div>
    </section>
  );
}

window.AskSection = AskSection;
