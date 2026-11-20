/**
 * Ask PI in the page: wires a conversation panel to lib/ask-guide.mjs.
 *
 * The conversation lives in this module's memory. Bundled modules are not
 * re-evaluated when Astro swaps the document, so it survives client-side
 * navigation (open a card, come back, the thread is still there) and is gone
 * on a full reload. Nothing is written to storage and the only request ever
 * made is a plain GET of /ask/index.json, which carries no part of a question.
 *
 * Replies are built with createElement and textContent only.
 */
import { ASK_MAX_LENGTH } from '../lib/ask-guide.mjs';
import { converse } from '../lib/ask-pi.mjs';

type Card = { href: string; title: string; meta: string; summary?: string; facts: [string, string][]; badge: string | null };
type Reply = { kind: string; lead: string; notes: string[]; cards: Card[]; links: { href: string; label: string }[]; chips: string[];
  aside?: string | null; plan?: { title: string; trip: string | null; stops: { label: string }[] } };
type Turn = { question: string; reply: Reply };

const MAX_TURNS = 12;
const turns: Turn[] = [];
let state: unknown = null;
let indexPromise: Promise<unknown> | null = null;
let busy = false;
let mounted: AbortController | undefined;

export function loadAskIndex(): Promise<unknown> {
  return (indexPromise ??= fetch('/ask/index.json', { credentials: 'omit' })
    .then((response) => {
      if (!response.ok) throw new Error('index ' + response.status);
      return response.json();
    })
    .then((index) => {
      if (index?.schemaVersion !== '1.0' || !Array.isArray(index.records) || !Array.isArray(index.places)) throw new Error('index shape');
      return index;
    })
    .catch((error) => {
      indexPromise = null;
      throw error;
    }));
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

function renderTurn(turn: Turn): HTMLElement {
  const article = el('article', 'ask-guide__turn');
  const question = el('p', 'ask-guide__question');
  question.append(el('span', 'ask-guide__sr', 'You asked: '), document.createTextNode(turn.question));
  article.append(question);

  const answer = el('div', 'ask-guide__answer');
  answer.dataset.askGuideKind = turn.reply.kind;
  answer.append(el('p', 'ask-guide__lead', turn.reply.lead));
  if (turn.reply.aside) answer.append(el('p', 'ask-guide__note', turn.reply.aside));
  // A plan is the same cards in her order, each headed by its part of the day.
  const plan = turn.reply.plan;
  if (plan) answer.append(el('p', 'ask-guide__meta', plan.title));

  if (turn.reply.cards.length) {
    const list = el('ul', 'ask-guide__cards');
    list.setAttribute('role', 'list');
    for (const [at, item] of turn.reply.cards.entries()) {
      const row = el('li', 'ask-guide__card');
      if (plan?.stops[at]) row.append(el('p', 'ask-guide__meta', plan.stops[at].label));
      const title = el('a', 'ask-guide__card-title', item.title);
      title.href = item.href;
      row.append(title);
      if (item.badge) row.append(el('strong', 'ask-guide__badge', item.badge));
      if (item.meta) row.append(el('p', 'ask-guide__meta', item.meta));
      if (item.summary) row.append(el('p', 'ask-guide__summary', item.summary));
      if (item.facts.length) {
        const facts = el('dl', 'ask-guide__facts');
        for (const [label, value] of item.facts) {
          const pair = el('div');
          pair.append(el('dt', undefined, label), el('dd', undefined, value));
          facts.append(pair);
        }
        row.append(facts);
      }
      list.append(row);
    }
    answer.append(list);
  }

  for (const note of turn.reply.notes) answer.append(el('p', 'ask-guide__note', note));

  const replyLinks = plan?.trip ? [{ href: plan.trip, label: 'Add these stops to My Trip' }, ...turn.reply.links] : turn.reply.links;
  if (replyLinks.length) {
    const links = el('ul', 'ask-guide__links');
    links.setAttribute('role', 'list');
    for (const item of replyLinks) {
      const link = el('a', undefined, item.label);
      link.href = item.href;
      const row = el('li');
      row.append(link);
      links.append(row);
    }
    answer.append(links);
  }

  if (turn.reply.chips.length) {
    const chips = el('div', 'ask-guide__chips');
    chips.setAttribute('role', 'group');
    chips.setAttribute('aria-label', 'Narrow or change this');
    for (const chip of turn.reply.chips) {
      const button = el('button', undefined, chip);
      button.type = 'button';
      button.dataset.askGuideChip = chip;
      chips.append(button);
    }
    answer.append(chips);
  }
  article.append(answer);
  return article;
}

function paint(root: HTMLElement, reveal: boolean) {
  const log = root.querySelector<HTMLElement>('[data-ask-guide-log]');
  const reset = root.querySelector<HTMLElement>('[data-ask-guide-reset]');
  const examples = root.querySelector<HTMLElement>('[data-ask-guide-examples]');
  if (!log) return;
  log.replaceChildren(...turns.map(renderTurn));
  // Only the latest reply offers chips: older ones would refine the wrong answer.
  log.querySelectorAll('.ask-guide__turn:not(:last-child) .ask-guide__chips').forEach((node) => node.remove());
  if (reset) reset.hidden = turns.length === 0;
  if (examples) examples.hidden = turns.length > 0;
  if (reveal) log.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
}

function paintAll(reveal: boolean) {
  document.querySelectorAll<HTMLElement>('[data-ask-guide-root]').forEach((root) => paint(root, reveal));
}

async function submit(root: HTMLElement, raw: string) {
  const question = raw.trim().slice(0, ASK_MAX_LENGTH);
  if (!question || busy) return;
  const input = root.querySelector<HTMLInputElement>('[data-ask-guide-input]');
  const status = root.querySelector<HTMLElement>('[data-ask-guide-status]');
  busy = true;
  if (status) status.textContent = 'Finding pages…';
  let reply: Reply;
  try {
    const index = await loadAskIndex();
    const result = converse(index, question, state, { pagePath: location.pathname, persona: document.querySelector<HTMLElement>('[data-ask-guide-root]')?.dataset.askGuidePersona !== 'off' });
    if (!result) return;
    state = result.state;
    reply = result.reply as Reply;
  } catch {
    reply = {
      kind: 'error',
      lead: 'I can’t load our guide index right now. Site search still works.',
      notes: [],
      cards: [],
      links: [{ href: '/search/?' + new URLSearchParams({ q: question }), label: 'Search the whole site for this' }],
      chips: [],
    };
  } finally {
    busy = false;
    if (status) status.textContent = '';
  }
  turns.push({ question, reply });
  while (turns.length > MAX_TURNS) turns.shift();
  if (input) input.value = '';
  paintAll(false);
  paint(root, true);
  input?.focus({ preventScroll: true });
}

export function clearAskConversation() {
  turns.length = 0;
  state = null;
  paintAll(false);
}

function mount() {
  mounted?.abort();
  mounted = new AbortController();
  const { signal } = mounted;
  document.querySelectorAll<HTMLElement>('[data-ask-guide-root]').forEach((root) => {
    const form = root.querySelector<HTMLFormElement>('[data-ask-guide-form]');
    const input = root.querySelector<HTMLInputElement>('[data-ask-guide-input]');
    if (!form || !input) return;
    root.dataset.askGuideReady = 'true';
    paint(root, false);

    form.addEventListener('submit', (event) => {
      // Without JavaScript this form is a plain search. With it, answer here.
      event.preventDefault();
      void submit(root, input.value);
    }, { signal });
    root.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null;
      const chip = target?.closest<HTMLElement>('[data-ask-guide-chip]');
      if (chip) { void submit(root, chip.dataset.askGuideChip ?? ''); return; }
      if (target?.closest('[data-ask-guide-reset]')) {
        clearAskConversation();
        input.focus({ preventScroll: true });
      }
    }, { signal });
    input.addEventListener('focus', () => { void loadAskIndex().catch(() => {}); }, { signal, once: true });

    // /ask/?q=... answers the question it was sent, once.
    if (root.dataset.askGuideAutostart === 'true' && !turns.length) {
      const sent = new URLSearchParams(location.search).get('q')?.trim();
      if (sent) void submit(root, sent);
    }
  });
}

mount();
document.addEventListener('astro:page-load', mount);
