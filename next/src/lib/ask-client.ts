/**
 * ask-client - the browser side of Ask PI, shared by the /ask page and the
 * PI chat drawer (components/PiChat.astro).
 *
 * - askPI() streams one answer from the concierge API (server-sent events).
 * - placeLinks() turns the API's recommendations into links that are known
 *   to exist, using /ask/pages.json (every public path, written after the
 *   build by scripts/generate-ask-pages.mjs). A stale path is corrected by
 *   its slug; anything else is dropped, so PI never links to a dead page.
 */

export type Rec = {
  title?: string;
  slug?: string;
  href?: string;
  why?: string;
  region?: string;
  hero_image?: string | null;
  hero_alt?: string;
};

export type Place = { href: string; title: string; why: string; section: string; image: string | null; alt: string };

export type AskHandlers = {
  onStage?: (stage: string) => void;
  onText?: (fullText: string) => void;
  onMeta?: (meta: { recommendations: Rec[]; follow_on: string[] }) => void;
};

/** What PI says while she works. Short, in her voice, never chatty filler. */
export const STAGE_LINES: Record<string, string> = {
  received: 'Reading your question…',
  retrieving: 'Checking my notebook…',
  reranking: 'Weighing up the options…',
  generating: 'Writing it down…',
  enriching: 'Checking the links…',
};

export const READER_ERROR = "I can't answer right now. Try search, or ask me again in a minute.";
export const RATE_LIMITED = "You've asked me a lot this hour. Give it a little while, or search the site.";

const SECTIONS: Record<string, string> = {
  eat: 'Eat & Drink', stay: 'Stay', wine: 'Wine', explore: 'Explore', plans: 'Plans',
  'whats-on': "What's On", events: "What's On", journal: 'Journal', places: 'Explore', escape: 'Plans',
};

export function sessionId(): string {
  try {
    let id = sessionStorage.getItem('pi-ask-session') || '';
    if (!id) { id = crypto.randomUUID(); sessionStorage.setItem('pi-ask-session', id); }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

let pages: Promise<Set<string>> | null = null;
export function loadPages(): Promise<Set<string>> {
  return (pages ??= fetch('/ask/pages.json')
    .then((r) => (r.ok ? r.json() : []))
    .then((l: string[]) => new Set(l))
    .catch(() => new Set<string>()));
}

function resolveHref(rec: Rec, known: Set<string>): string | null {
  const raw = (rec.href || '').trim();
  const path = raw.startsWith('/') ? raw.replace(/[?#].*$/, '').replace(/\/?$/, '/') : '';
  if (path && known.has(path)) return path;
  const slug = (path.split('/').filter(Boolean).pop() || rec.slug || '').toLowerCase();
  if (!slug) return null;
  const matches = [...known].filter((p) => p.endsWith(`/${slug}/`));
  return matches.length === 1 ? matches[0] : null;
}

/** Only same-site images or https images; anything else is dropped. */
function safeImage(src: unknown): string | null {
  if (typeof src !== 'string' || !src) return null;
  if (src.startsWith('/') && !src.startsWith('//')) return src;
  return /^https:\/\//.test(src) ? src : null;
}

export async function placeLinks(recs: Rec[], max = 5): Promise<Place[]> {
  const known = await loadPages();
  if (!known.size) return [];
  const out: Place[] = [];
  const seen = new Set<string>();
  for (const rec of recs) {
    const href = resolveHref(rec, known);
    if (!href || seen.has(href) || !rec.title) continue;
    seen.add(href);
    out.push({
      href,
      title: rec.title,
      why: rec.why || '',
      section: SECTIONS[href.split('/').filter(Boolean)[0] || ''] || '',
      image: safeImage(rec.hero_image),
      alt: rec.hero_alt || '',
    });
  }
  return out.slice(0, max);
}

/** Splits streamed prose into paragraphs. */
export function paragraphs(text: string): string[] {
  return text.split(/\n{2,}/).map((t) => t.trim()).filter(Boolean);
}

async function* sse(res: Response) {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, i);
      buf = buf.slice(i + 2);
      let event = 'message';
      let data = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      try { yield { event, data: data ? JSON.parse(data) : {} }; } catch { /* skip malformed */ }
    }
  }
}

/**
 * Streams one answer. Resolves with the full prose; throws an Error whose
 * message is safe to show a reader (AbortError passes through untouched).
 */
export async function askPI(api: string, query: string, handlers: AskHandlers, signal?: AbortSignal): Promise<string> {
  loadPages();
  let text = '';
  const res = await fetch(`${api}/concierge/ask/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'X-Session-Id': sessionId(),
      'X-Current-Page': location.pathname,
    },
    body: JSON.stringify({ query }),
    signal,
  }).catch((err) => {
    if ((err as Error).name === 'AbortError') throw err;
    throw new Error(READER_ERROR);
  });
  if (res.status === 429) throw new Error(RATE_LIMITED);
  if (!res.ok || !res.body) throw new Error(READER_ERROR);
  for await (const { event, data } of sse(res)) {
    if (event === 'status' && typeof data.stage === 'string') handlers.onStage?.(data.stage);
    else if (event === 'text' && typeof data.delta === 'string') {
      text += data.delta;
      handlers.onText?.(text);
    } else if (event === 'meta') {
      handlers.onMeta?.({
        recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
        follow_on: Array.isArray(data.follow_on) ? data.follow_on.filter((q: unknown) => typeof q === 'string') : [],
      });
    } else if (event === 'error') {
      throw new Error(typeof data.message === 'string' && data.message ? data.message : READER_ERROR);
    }
  }
  if (!text.trim()) throw new Error(READER_ERROR);
  return text;
}
