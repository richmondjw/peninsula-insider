#!/usr/bin/env node
/**
 * PI's nightly exam.
 *
 * Holds the conversations in tests/ask-eval/questions.json with the live
 * platform, built the way the chat builds them (the matcher, then
 * talkPages()), and marks every reply:
 *
 *   reply     she said something
 *   pick      she named a published page when she should, and none when she should not
 *   mentions  her words match what the question was about
 *   never     her words avoid what that question must not get (a price, a bluff)
 *   voice     no banned word, price, clock time, weekday or claim to have been somewhere
 *
 * It measures; it does not prove she is good company. Read the replies in the
 * report. The pass mark exists so that a change which makes her worse is seen
 * the next morning rather than by a reader.
 *
 *   node scripts/ask-eval.mjs --dist dist --api https://<platform-api> --out reports/ask-eval
 *   --pass 0.8     exit 1 below this share of turns passing (default: report only)
 *   --only thread  run one tag
 *   --jobs 2       conversations at a time (kept low: readers share the same model allowance)
 */
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { converse, talkPages, cardsFor, hasSubject, declines } from '../src/lib/ask-pi.mjs';
import { melbourneDay } from '../src/lib/ask-guide.mjs';

const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const api = option('--api')?.replace(/\/$/, '');
if (!api) throw new Error('Give --api URL (the platform API origin)');
const here = dirname(fileURLToPath(import.meta.url));
const index = JSON.parse(readFileSync(join(resolve(option('--dist') || 'dist'), 'ask/index.json'), 'utf8'));
const set = JSON.parse(readFileSync(join(here, '../tests/ask-eval/questions.json'), 'utf8'));
const only = option('--only');
const jobs = Number(option('--jobs') || 2);
const passMark = option('--pass') ? Number(option('--pass')) : null;
const today = melbourneDay();
const TALKABLE = new Set(['results', 'named', 'place', 'none', 'help', 'nightlife', 'with']);

// Her house rules, the same list the platform gives her (apps/api/src/lib/pi-talk.ts, CHARACTER).
const VOICE = [
  ['flat opener', /^(?:sounds? (?:like|good)|got it|alright|all right|okay|ok|sure(?: thing)?|great|nice choice|understood)\b/i],
  ['banned word', /\b(?:stunning|amazing|incredible|breathtaking|idyllic|picturesque|nestled|must-visit|hidden gem|perfect for|something for everyone|unforgettable|vibes?|awesome|folks)\b/i],
  ['help-desk line', /\b(?:great question|happy to help|certainly!|i hope this helps|enjoy your trip)\b/i],
  ['says what she is', /\b(?:as an ai|i am an ai|i'm an ai|language model|chatbot)\b/i],
  ['em dash', /—/],
  ['price', /\$\s?\d/],
  ['clock time', /\b\d{1,2}(?::\d{2})?\s?(?:am|pm)\b/i],
  ['weekday', /\b(?:mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?|sundays?)\b/i],
  ['claims a visit', /\b(?:i (?:went|visited|ate|stayed|tried|had (?:the|a|lunch|dinner))|when i was (?:there|at)|last time i)\b/i],
];

async function say(body) {
  const started = Date.now();
  let first = 0;
  const out = { say: null, picks: [], status: 0, firstMs: 0, ms: 0 };
  try {
    const response = await fetch(`${api}/concierge/pi/talk/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', 'X-Session-Id': `eval-${Math.random().toString(36).slice(2, 10)}` },
      body: JSON.stringify({ ...body, source: 'eval' }),
      signal: AbortSignal.timeout(45000),
    });
    out.status = response.status;
    if (response.ok) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let text = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        if (!first && text.includes('event: sentence')) first = Date.now() - started;
      }
      const said = [];
      let event = '';
      for (const line of text.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) {
          const data = JSON.parse(line.slice(5).trim() || '{}');
          if (event === 'sentence') said.push(data.text);
          else if (event === 'meta') out.picks = data.picks || [];
        }
      }
      out.say = said.length ? said.join(' ') : null;
    }
  } catch (error) { out.error = String(error.message || error).slice(0, 120); }
  out.firstMs = first;
  out.ms = Date.now() - started;
  return out;
}

function mark(turn, expect, weekdayAsked) {
  const faults = [];
  const text = turn.say || '';
  if (turn.bySite) return faults; // an authored reply: its lines are tested in src/lib/ask-pi.test.mjs
  if (!text) return ['no reply'];
  if (expect.pick === true && !turn.tiles.length) faults.push('named no place');
  if (expect.pick === false && turn.tiles.length) faults.push(`named a place (${turn.tiles.join(', ')})`);
  if (expect.mentions && !new RegExp(expect.mentions, 'i').test(text)) faults.push(`did not mention /${expect.mentions}/`);
  if (expect.never && new RegExp(expect.never, 'i').test(text)) faults.push(`said what it must not: ${text.match(new RegExp(expect.never, 'i'))[0]}`);
  if (!expect.fixed) for (const [name, pattern] of VOICE) {
    // A weekday the reader named themselves may be said back to them.
    if (name === 'weekday' && weekdayAsked) continue;
    const hit = text.match(pattern);
    if (hit) faults.push(`${name}: ${hit[0]}`);
  }
  return faults;
}

async function hold(conversation) {
  let state = null;
  let shown = [];
  const history = [];
  const turns = [];
  for (const { q, expect = {} } of conversation.turns) {
    const matched = converse(index, q, state, { today });
    state = matched?.state ?? state;
    const asked = history.map((item) => item.q);
    let turn;
    if (!matched || matched.reply.plan || !TALKABLE.has(matched.reply.kind)) {
      turn = { q, say: matched?.reply.lead ?? null, tiles: (matched?.reply.cards || []).map((card) => card.title), bySite: true, ms: 0, firstMs: 0 };
    } else {
      const pages = talkPages(index, q, asked, matched.reply, shown, { today });
      // What the chat sends: true when the message names no town or kind of place of its own.
      const followUp = !hasSubject(index, q, { today });
      const got = await say({ message: q, history: history.slice(-8), pages, followUp });
      // What the reader would see: her picks, or the guides' matches when she named nowhere for a real question.
      let cards = cardsFor(index, got.picks);
      if (got.say && !declines(got.say) && !cards.length && ['results', 'named', 'place'].includes(matched.reply.kind) && matched.reply.cards.length && hasSubject(index, q, { today })) cards = matched.reply.cards.slice(0, 3);
      turn = { q, say: got.say, tiles: cards.map((card) => card.title), named: cardsFor(index, got.picks).length, ms: got.ms, firstMs: got.firstMs, status: got.status, error: got.error };
      shown = cards.length ? cards.map((card) => card.href) : pages.slice(0, 5);
    }
    turn.faults = mark(turn, expect, /day\b/i.test([...asked, q].join(' ')));
    turn.tag = conversation.tag;
    turns.push(turn);
    history.push({ q, say: turn.say ?? matched?.reply.lead });
  }
  return turns;
}

const conversations = set.conversations.filter((item) => !only || item.tag === only);
const results = [];
for (let at = 0; at < conversations.length; at += jobs) {
  const batch = await Promise.all(conversations.slice(at, at + jobs).map(hold));
  results.push(...batch.flat());
  process.stderr.write(`${Math.min(at + jobs, conversations.length)}/${conversations.length} conversations\n`);
}

const model = results.filter((turn) => !turn.bySite);
const passed = results.filter((turn) => !turn.faults.length);
const median = (list) => { const sorted = list.filter(Boolean).sort((a, b) => a - b); return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0; };
const tags = [...new Set(results.map((turn) => turn.tag))];
const kinds = new Map();
for (const turn of results) for (const fault of turn.faults) { const kind = fault.split(':')[0].split(' (')[0]; kinds.set(kind, (kinds.get(kind) || 0) + 1); }
const share = results.length ? passed.length / results.length : 0;
const clean = (text) => String(text ?? '').replace(/\s+/g, ' ').replace(/\|/g, '/');
const summary = {
  generatedAt: new Date().toISOString(), api, indexGeneratedAt: index.generatedAt, turns: results.length, byModel: model.length,
  passed: passed.length, share: Number(share.toFixed(3)),
  firstWordsMs: median(model.map((turn) => turn.firstMs)), wholeReplyMs: median(model.map((turn) => turn.ms)), slowestMs: Math.max(0, ...model.map((turn) => turn.ms)),
  byTag: Object.fromEntries(tags.map((tag) => { const list = results.filter((turn) => turn.tag === tag); return [tag, { turns: list.length, passed: list.filter((turn) => !turn.faults.length).length }]; })),
  faults: Object.fromEntries([...kinds.entries()].sort((a, b) => b[1] - a[1])),
};
const md = [
  `# PI's exam, ${summary.generatedAt.slice(0, 10)}`, '',
  `${summary.passed} of ${summary.turns} turns passed (${Math.round(share * 100)}%). ${summary.byModel} were written by the model; the rest are her authored lines. First words in ${summary.firstWordsMs} ms (median), whole reply in ${summary.wholeReplyMs} ms, slowest ${summary.slowestMs} ms.`, '',
  '| Kind of question | Passed | Turns |', '| --- | ---: | ---: |', ...tags.map((tag) => `| ${tag} | ${summary.byTag[tag].passed} | ${summary.byTag[tag].turns} |`), '',
  '| What went wrong | Turns |', '| --- | ---: |', ...(Object.keys(summary.faults).length ? Object.entries(summary.faults).map(([fault, n]) => `| ${fault} | ${n} |`) : ['| nothing | 0 |']), '',
  '## Turns that failed', '',
  ...results.filter((turn) => turn.faults.length).flatMap((turn) => [`**${clean(turn.q)}** (${turn.tag})`, '', `> ${clean(turn.say) || '(no reply)'}`, '', `Failed: ${turn.faults.join('; ')}.${turn.error ? ` Error: ${turn.error}.` : ''}`, '']),
  '## Every reply', '', '| Asked | She said | Tiles | ms |', '| --- | --- | --- | ---: |',
  ...results.map((turn) => `| ${clean(turn.q)} | ${clean(turn.say).slice(0, 400)} | ${clean(turn.tiles.join(', '))} | ${turn.ms || ''} |`), '',
].join('\n');

const outDir = resolve(option('--out') || 'reports/ask-eval');
mkdirSync(outDir, { recursive: true });
const stamp = summary.generatedAt.slice(0, 10);
writeFileSync(join(outDir, `ask-eval-${stamp}.md`), md);
writeFileSync(join(outDir, `ask-eval-${stamp}.json`), JSON.stringify({ summary, turns: results }, null, 2) + '\n');
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md.split('## Every reply')[0]);
console.log(md.split('## Turns that failed')[0]);
if (passMark !== null && share < passMark) { console.error(`Below the pass mark: ${Math.round(share * 100)}% against ${Math.round(passMark * 100)}%.`); process.exit(1); }
