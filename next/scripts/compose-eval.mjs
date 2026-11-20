#!/usr/bin/env node
/**
 * Read what PI writes when she composes a plan, before readers do.
 *
 * Builds real plans from the Ask index the way the chat does, sends each to
 * the platform's /concierge/pi/compose, and prints her opening and her line
 * for every stop beside the page it is about. The platform has already
 * checked each line against that page; this is for a person to read the
 * result and decide whether SHOW_ASK_COMPOSE can be switched on.
 *
 *   node scripts/compose-eval.mjs --dist dist --api https://<platform-api>
 *   --json report.json   keep the evidence
 *
 * The endpoint must be on (CONCIERGE_COMPOSE_ENABLED=1), and the platform
 * reads pages from the live site, so run this against an index built from
 * what is published. Exits 1 if a reply is unusable or names a page that was
 * not offered; it cannot judge whether a line is good.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { converse, composeRequest, applyCompose } from '../src/lib/ask-pi.mjs';
import { melbourneDay } from '../src/lib/ask-guide.mjs';

const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const api = option('--api')?.replace(/\/$/, '');
if (!api) throw new Error('Give --api URL (the platform API origin)');
const index = JSON.parse(readFileSync(join(resolve(option('--dist') || 'dist'), 'ask/index.json'), 'utf8'));
const today = melbourneDay();

const ASKS = [
  ['plan a day in Mornington for the two of us, the whole day'],
  ['plan half a day in Red Hill with a toddler who naps at one'],
  ['plan a morning in Flinders, just me, I have had a long week'],
  ['Create me a plan', 'A group', 'Sorrento', 'The whole day'],
  ["plan a day in Main Ridge for mum's 70th, the whole day"],
  ['Surprise me'],
  ['plan a day in Merricks for the two of us, the whole day', 'Rainy day rescue'],
  ['Settle an argument: I want a long lunch but she wants a coastal walk'],
  ['plan a cheap day in Dromana with the kids, the whole day'],
  ['plan a day in Balnarring for a hens party of ten, the whole day'],
];

const report = [];
let failures = 0;
for (const asks of ASKS) {
  let state = null;
  let turn = null;
  for (const question of asks) { turn = converse(index, question, state, { today }); state = turn.state; }
  const question = asks.join(' / ');
  const request = composeRequest(state);
  if (!turn.reply.plan || !request) { console.log(`\n# ${question}\n  (no plan: ${turn.reply.lead})`); continue; }
  const started = Date.now();
  const response = await fetch(`${api}/concierge/pi/compose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Session-Id': 'compose-eval' },
    body: JSON.stringify({ question: asks[0], title: request.title, slots: request.slots, history: [] }),
  });
  const result = response.ok ? await response.json() : null;
  const applied = result ? applyCompose(index, state, request, result) : null;
  const offered = new Set(request.slots.flatMap((slot) => slot.options));
  const stray = (result?.picks || []).filter((pick) => !offered.has(pick));
  if (!applied || stray.length) failures += 1;
  console.log(`\n# ${question}   [${response.status}, ${Date.now() - started} ms]`);
  if (!applied) { console.log(`  UNUSABLE: ${JSON.stringify(result)}`); report.push({ question, status: response.status, result }); continue; }
  if (stray.length) console.log(`  PICKED A PAGE THAT WAS NOT OFFERED: ${stray.join(', ')}`);
  console.log(`  Opening: ${applied.opening || `(none; her authored line stays: ${turn.reply.lead})`}`);
  for (const stop of applied.plan.stops) {
    console.log(`  ${stop.label}: ${stop.card.title} (${stop.card.meta})`);
    console.log(`     her line: ${stop.line || '(none passed the check)'}`);
    console.log(`     the page: ${stop.card.summary || '(no summary)'}`);
  }
  report.push({ question, ms: Date.now() - started, opening: applied.opening, stops: applied.plan.stops.map((stop) => ({ label: stop.label, href: stop.card.href, line: stop.line, summary: stop.card.summary })) });
}
if (option('--json')) writeFileSync(resolve(option('--json')), JSON.stringify(report, null, 2) + '\n');
const stops = report.flatMap((entry) => entry.stops || []);
console.log(`\nCompose eval: ${report.length} plans, ${report.filter((entry) => entry.opening).length} with an opening, ${stops.filter((stop) => stop.line).length} of ${stops.length} stops with a line, ${failures} unusable.`);
process.exit(failures ? 1 : 0);
