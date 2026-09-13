/**
 * Search-query privacy contract (action register A13). Run from next/:
 *
 *   node --test scripts/search-query-privacy.test.mjs
 *
 * Until 2026-09-14 both search surfaces POSTed the reader's raw query string
 * to pi.site_search_queries on every search, for every reader, regardless of
 * whether they had accepted or refused the consent banner - and each row
 * carried a session id, plus an auth UID when the reader was signed in. Search
 * text is personal data: people type names, addresses, medical and financial
 * terms into a search box with no expectation that any of it is kept.
 *
 * These assertions encode the RULE, not a snapshot of today's source. The rule
 * is structural and deliberately harsh:
 *
 *   The function that writes to pi.site_search_queries must not be ABLE to see
 *   the query text.
 *
 * Not "must not currently send it" - must not be able to. So the function is
 * checked for both halves: it may not take the text as a parameter, and it may
 * not reach for it from its body. A logger that cannot see the text cannot
 * leak it, cannot hash it (a hash is still a join key), and cannot keep a
 * prefix of it (a prefix is still the text).
 *
 * Source-structure assertions, not behaviour: these are inline `.astro`
 * scripts with nothing importable to exercise, the same constraint
 * client-listener-hygiene.test.mjs works under.
 *
 * Adding a third search surface does not need this file edited. It is
 * discovered by its reference to the table, and held to the same rule.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NEXT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(NEXT_DIR, 'src');
const REPO_DIR = path.resolve(NEXT_DIR, '..');
const MIGRATIONS_DIR = path.join(REPO_DIR, 'ops', 'migrations');

/** The table whose every write is governed by this contract. */
const TABLE = 'site_search_queries';

/**
 * Identifiers that carry, or plausibly carry, what the reader typed. Matched
 * as whole words against a comment-stripped body, so `result_count` and the
 * DOM lookups neutralised below do not trip them.
 */
const QUERY_BEARING = /\b(q|query|queries|rawQuery|searchQuery|term|terms|searchTerm|keyword|keywords|phrase|typed|input|needle)\b/;

/** Allowed to contain the letters of "query" because they are DOM plumbing. */
const DOM_QUERY_METHODS = /\bquerySelectorAll?\b/g;

function walk(dir, exts, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      walk(full, exts, out);
    } else if (exts.some((e) => entry.name.endsWith(e))) {
      out.push(full);
    }
  }
  return out;
}

const rel = (file) => path.relative(REPO_DIR, file).split(path.sep).join('/');

/**
 * Drop line and block comments, so prose explaining the rule cannot itself
 * break the rule.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}

/**
 * Every `function name(params) { ... }` declaration in a source string, with
 * its body matched by brace balance rather than by regex.
 */
function functionDeclarations(src) {
  const out = [];
  const decl = /function\s+([A-Za-z0-9_$]+)\s*\(([^)]*)\)\s*\{/g;
  let match;
  while ((match = decl.exec(src)) !== null) {
    const open = src.indexOf('{', match.index + match[0].length - 1);
    let depth = 0;
    for (let i = open; i < src.length; i += 1) {
      if (src[i] === '{') depth += 1;
      else if (src[i] === '}') {
        depth -= 1;
        if (depth === 0) {
          out.push({
            name: match[1],
            params: match[2].split(',').map((p) => p.trim()).filter(Boolean),
            body: src.slice(open, i + 1),
          });
          break;
        }
      }
    }
  }
  return out;
}

/** Source files that write to, or even mention, the search-log table. */
function surfacesTouchingTable() {
  return walk(SRC_DIR, ['.astro', '.ts', '.tsx', '.js', '.mjs'])
    .filter((file) => fs.readFileSync(file, 'utf8').includes(TABLE));
}

test(`at least one surface still writes to pi.${TABLE}`, () => {
  // A guard on the guard: if the table reference is renamed or removed, every
  // assertion below would pass vacuously. Fail loudly instead, so whoever
  // moves it has to come back here and re-point the rule.
  const files = surfacesTouchingTable();
  assert.ok(
    files.length > 0,
    `No file under next/src references ${TABLE}. If search logging moved, ` +
      're-point scripts/search-query-privacy.test.mjs at its new home rather ' +
      'than deleting this file.',
  );
});

test('the search logger cannot receive the query text', () => {
  for (const file of surfacesTouchingTable()) {
    const src = stripComments(fs.readFileSync(file, 'utf8'));
    const loggers = functionDeclarations(src).filter((fn) => fn.body.includes(TABLE));

    assert.ok(
      loggers.length > 0,
      `${rel(file)} references ${TABLE} outside any named function; this rule ` +
        'can only inspect a named function. Wrap the write in one.',
    );

    for (const fn of loggers) {
      for (const param of fn.params) {
        const name = param.replace(/=.*$/, '').trim();
        assert.ok(
          !QUERY_BEARING.test(name),
          `${rel(file)}: ${fn.name}() takes "${name}", which reads as the ` +
            "reader's query text. The logger must not be given it.",
        );
      }
    }
  }
});

test('the search logger cannot reach for the query text', () => {
  for (const file of surfacesTouchingTable()) {
    const src = stripComments(fs.readFileSync(file, 'utf8'));
    const loggers = functionDeclarations(src).filter((fn) => fn.body.includes(TABLE));

    for (const fn of loggers) {
      const body = fn.body.replace(DOM_QUERY_METHODS, ' ');
      const hit = QUERY_BEARING.exec(body);
      assert.equal(
        hit,
        null,
        `${rel(file)}: ${fn.name}() references "${hit && hit[1]}". Whatever it ` +
          'holds, the logger must not touch it - not the text, not a hash of ' +
          'it (a hash is still a join key), not a prefix of it.',
      );
    }
  }
});

test('no caller hands the query text to the search logger', () => {
  for (const file of surfacesTouchingTable()) {
    const src = stripComments(fs.readFileSync(file, 'utf8'));
    const loggers = functionDeclarations(src).filter((fn) => fn.body.includes(TABLE));

    for (const fn of loggers) {
      const call = new RegExp(String.raw`(?<!function\s)\b${fn.name}\s*\(([^)]*)\)`, 'g');
      let match;
      while ((match = call.exec(src)) !== null) {
        for (const arg of match[1].split(',').map((a) => a.trim()).filter(Boolean)) {
          assert.ok(
            !QUERY_BEARING.test(arg),
            `${rel(file)}: ${fn.name}(${match[1]}) passes "${arg}", which reads ` +
              "as the reader's query text.",
          );
          assert.ok(
            !/\.value\b/.test(arg),
            `${rel(file)}: ${fn.name}(${match[1]}) passes "${arg}", reading ` +
              'straight off an input element.',
          );
        }
      }
    }
  }
});

test('the database refuses raw query text too', () => {
  // Client discipline alone is one deploy away from being undone. The schema
  // has to say no as well, so a future client that starts sending the text
  // gets an error rather than a silent write.
  const migrations = walk(MIGRATIONS_DIR, ['.sql']);
  const constraining = migrations.filter((file) => {
    const sql = fs.readFileSync(file, 'utf8').toLowerCase();
    return sql.includes(TABLE) && /check\s*\(\s*query\s+is\s+null\s*\)/.test(sql);
  });

  assert.ok(
    constraining.length > 0,
    `No migration in ops/migrations constrains pi.${TABLE}.query to null. ` +
      'The privacy contract is meant to hold in the schema, not only in the ' +
      'client bundle.',
  );
});
