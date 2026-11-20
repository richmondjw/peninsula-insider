#!/usr/bin/env node
/**
 * Hold whole conversations with PI on the live platform and print them.
 *
 * Builds each turn the way the chat does (the matcher, then talkPages()),
 * sends it to /concierge/pi/talk, and prints her reply, her picks and her
 * line on each. For a person to read: the platform has already checked every
 * sentence against the guides, but it cannot tell you whether she is good
 * company.
 *
 *   node scripts/talk-eval.mjs --dist dist --api https://<platform-api>
 *   --json report.json   keep the evidence
 *
 * `--dist` only needs ask/index.json; fetch the live one to test what readers get.
 * Exits 1 if a pick is not a published page.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { converse, talkPages, cardsFor } from '../src/lib/ask-pi.mjs';
import { melbourneDay } from '../src/lib/ask-guide.mjs';

const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const api = option('--api')?.replace(/\/$/, '');
if (!api) throw new Error('Give --api URL (the platform API origin)');
const index = JSON.parse(readFileSync(join(resolve(option('--dist') || 'dist'), 'ask/index.json'), 'utf8'));
const today = melbourneDay();
const TALKABLE = new Set(['results', 'named', 'place', 'none', 'help', 'nightlife', 'with']);

const CHATS = [
  ['hi PI, long week', 'taking my wife away for our anniversary, no idea where to start', 'she loves a long lunch and hates crowds', 'which of those is quieter?', 'and somewhere to stay near it?'],
  ["where's good for lunch in Red Hill?", "we've got a toddler", 'ok what about a walk after', 'anything worth reading before we go?'],
  ['who are you anyway?', "what's the capital of France?", 'who should I vote for?', 'fine. wineries with a view then', 'which one for a group of eight?'],
  ['we have one rainy Sunday in Sorrento with my parents', 'dad cannot walk far', 'somewhere for a drink after'],
];

/** Reads a stream to the end, noting when the first sentence event arrives. */
async function readAll(response, onFirstSentence) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    if (text.includes('event: sentence')) onFirstSentence();
  }
  return text;
}

const firsts = [];
const report = [];
let stray = 0;
let empty = 0;
const times = [];
for (const chat of CHATS) {
  console.log('\n==========');
  let state = null;
  let shown = [];
  const history = [];
  for (const message of chat) {
    const turn = converse(index, message, state, { today });
    state = turn?.state ?? state;
    console.log(`\nYOU: ${message}`);
    if (!turn || turn.reply.plan || !TALKABLE.has(turn.reply.kind)) {
      console.log(`PI:  ${turn?.reply.lead}   [answered on the site, no model: ${turn?.reply.kind}]`);
      history.push({ q: message, say: turn?.reply.lead });
      continue;
    }
    const pages = talkPages(index, message, history.map((item) => item.q), turn.reply, shown, { today });
    const started = Date.now();
    // The streaming route, read the way the chat reads it: a sentence at a time.
    const response = await fetch(`${api}/concierge/pi/talk/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', 'X-Session-Id': 'talk-eval' },
      body: JSON.stringify({ message, history: history.slice(-8), pages }),
    });
    const result = { say: null, picks: [], next: [], why: {} };
    let firstMs = 0;
    if (response.ok) {
      const said = [];
      let event = '';
      for (const line of (await readAll(response, () => { if (!firstMs) firstMs = Date.now() - started; })).split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) {
          const data = JSON.parse(line.slice(5).trim() || '{}');
          if (event === 'sentence') said.push(data.text);
          else if (event === 'meta') Object.assign(result, data);
        }
      }
      result.say = said.length ? said.join(' ') : null;
    }
    firsts.push(firstMs);
    const ms = Date.now() - started;
    times.push(ms);
    const tiles = cardsFor(index, result.picks);
    if ((result.picks || []).length !== tiles.length) stray += 1;
    if (!result.say) empty += 1;
    console.log(`PI:  ${result.say ?? `(no reply; the site would say: ${turn.reply.lead})`}`);
    console.log(`     [${response.status}, first words ${firstMs} ms, all ${ms} ms; sent ${pages.length} pages; picks: ${tiles.map((tile) => tile.title).join(', ') || 'none'}; picks the site did not send: ${tiles.filter((tile) => !pages.includes(tile.href)).map((tile) => tile.title).join(', ') || 'none'}; next: ${(result.next || []).join(' | ') || 'none'}]`);
    for (const tile of tiles) if (result.why?.[tile.href]) console.log(`     why ${tile.title}: ${result.why[tile.href]}`);
    report.push({ message, ms, say: result.say, picks: tiles.map((tile) => tile.href), why: result.why, next: result.next });
    history.push({ q: message, say: result.say ?? turn.reply.lead });
    shown = tiles.length ? tiles.map((tile) => tile.href) : pages.slice(0, 5);
  }
}
if (option('--json')) writeFileSync(resolve(option('--json')), JSON.stringify(report, null, 2) + '\n');
times.sort((a, b) => a - b);
const got = firsts.filter(Boolean).sort((a, b) => a - b);
console.log(`\nTalk eval: ${report.length} turns to the model, ${empty} with no reply. First words: median ${got[Math.floor(got.length / 2)] ?? 0} ms, slowest ${got.at(-1) ?? 0} ms. Whole reply: median ${times[Math.floor(times.length / 2)] ?? 0} ms, slowest ${times.at(-1) ?? 0} ms. ${stray} with a pick that is not a published page.`);
process.exit(stray ? 1 : 0);
