#!/usr/bin/env node
/**
 * Try Ask PI from a terminal against a built index.
 *   node scripts/ask-try.mjs "lunch in red hill" "in flinders" "show more"
 * Each argument is one turn of the same conversation. --page /eat/rare-hare/
 * sets the page the reader is on; --today 2026-11-20 pins the date.
 */
import { readFileSync } from 'node:fs';
import { ask } from '../src/lib/ask-guide.mjs';

const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? args.splice(args.indexOf(name), 2)[1] : undefined);
const index = JSON.parse(readFileSync(option('--index') || 'dist/ask/index.json', 'utf8'));
const context = { pagePath: option('--page'), today: option('--today') };
let state = null;
for (const question of args) {
  const turn = ask(index, question, state, context);
  console.log(`\nYou: ${question}`);
  if (!turn) { console.log('  (not answerable: empty or too long)'); continue; }
  state = turn.state;
  const { reply } = turn;
  console.log(`PI [${reply.kind}]: ${reply.lead}`);
  for (const item of reply.cards) {
    console.log(`  • ${item.title}${item.badge ? ` [${item.badge}]` : ''}  (${item.meta})  ${item.href}`);
    if (item.summary) console.log(`      ${item.summary}`);
    for (const [label, value] of item.facts) console.log(`      ${label}: ${value}`);
  }
  for (const note of reply.notes) console.log(`  note: ${note}`);
  for (const link of reply.links) console.log(`  link: ${link.label} -> ${link.href}`);
  if (reply.chips.length) console.log(`  chips: ${reply.chips.join(' | ')}`);
}
