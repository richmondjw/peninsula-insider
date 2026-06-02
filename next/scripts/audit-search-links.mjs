#!/usr/bin/env node
/**
 * Live pi.search link audit.
 *
 * Queries the Supabase pi.search RPC for representative user searches and
 * verifies the top result URLs resolve on the public site. This is deliberately
 * independent from PageFind: it guards the live hybrid search corpus used by
 * /search/ and the search overlay.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

const args = process.argv.slice(2);
const opts = {
  limit: 10,
  failOnBroken: false,
  report: null,
  origin: process.env.PI_SITE_ORIGIN || 'https://peninsulainsider.com.au',
  supabaseUrl: process.env.PUBLIC_SUPABASE_URL || 'https://tjjhpvslpysfklwpqmgz.supabase.co',
  supabaseKey: process.env.PUBLIC_SUPABASE_ANON_KEY || '',
};

const defaultQueries = [
  'red hill',
  'sorrento',
  'winter wine',
  'dog friendly',
  'hot springs',
  'market',
  'birthday weekend',
  'corporate retreat',
  'winery tour',
  'moonah',
  'sunny ridge',
  'continental',
];

let queries = [...defaultQueries];

for (const arg of args) {
  if (arg === '--fail-on-broken') opts.failOnBroken = true;
  else if (arg.startsWith('--limit=')) opts.limit = Number.parseInt(arg.slice('--limit='.length), 10) || opts.limit;
  else if (arg.startsWith('--report=')) opts.report = arg.slice('--report='.length);
  else if (arg.startsWith('--query=')) queries.push(arg.slice('--query='.length));
  else if (arg.startsWith('--queries=')) queries = arg.slice('--queries='.length).split(',').map((q) => q.trim()).filter(Boolean);
}

async function loadPublicSupabaseKeyFromSite() {
  if (opts.supabaseKey) return opts.supabaseKey;
  const res = await fetch(`${opts.origin}/search/`);
  if (!res.ok) throw new Error(`Cannot load search page for public Supabase key (${res.status})`);
  const html = await res.text();
  const match = html.match(/const\s+SB_ANON_KEY\s*=\s*"([^"]+)"/);
  if (!match?.[1]) throw new Error('PUBLIC_SUPABASE_ANON_KEY missing and could not be discovered from /search/.');
  opts.supabaseKey = match[1];
  return opts.supabaseKey;
}

async function search(query) {
  const key = await loadPublicSupabaseKeyFromSite();
  const body = {
    q: query,
    filters: {},
    near_lat: null,
    near_lng: null,
    near_km: null,
    when_from: null,
    when_to: null,
    entity_types: null,
    query_embedding: null,
    result_limit: opts.limit,
    weight_lexical: 0.4,
    weight_vector: 0.4,
    weight_facet: 0.2,
  };
  const res = await fetch(`${opts.supabaseUrl}/rest/v1/rpc/search`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Profile': 'pi',
      'Content-Profile': 'pi',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`pi.search failed for "${query}" (${res.status}): ${text}`);
  }
  return await res.json();
}

async function checkUrl(href) {
  if (!href || typeof href !== 'string') return { url: String(href || ''), status: 'missing-href', ok: false };
  const url = href.startsWith('http') ? href : new URL(href, opts.origin).href;
  for (const method of ['HEAD', 'GET']) {
    try {
      const res = await fetch(url, { method, redirect: 'follow' });
      if (res.status >= 200 && res.status < 400) return { url, status: res.status, ok: true };
      if (method === 'GET') return { url, status: res.status, ok: false };
    } catch (err) {
      if (method === 'GET') return { url, status: `error: ${err.message}`, ok: false };
    }
  }
  return { url, status: 'unknown', ok: false };
}

function escapeMd(value) {
  return String(value ?? '').replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();
}

function renderMarkdown(results) {
  const broken = results.flatMap((q) => q.rows.filter((r) => !r.ok).map((r) => ({ query: q.query, ...r })));
  const lines = [];
  lines.push('# PI Search Link Audit');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Origin: ${opts.origin}`);
  lines.push(`Queries: ${results.length}`);
  lines.push(`Checked URLs: ${results.reduce((n, q) => n + q.rows.length, 0)}`);
  lines.push(`Broken URLs: ${broken.length}`);
  lines.push('');
  if (broken.length > 0) {
    lines.push('## Broken Links');
    lines.push('');
    lines.push('| Query | Title | Type | Slug | Href | Status |');
    lines.push('|---|---|---|---|---|---|');
    for (const row of broken) {
      lines.push(`| ${escapeMd(row.query)} | ${escapeMd(row.title)} | ${escapeMd(row.entity_type)} | ${escapeMd(row.entity_slug)} | ${escapeMd(row.href)} | ${escapeMd(row.status)} |`);
    }
    lines.push('');
  }
  lines.push('## Query Summary');
  lines.push('');
  lines.push('| Query | Results | Checked | Broken |');
  lines.push('|---|---:|---:|---:|');
  for (const q of results) {
    lines.push(`| ${escapeMd(q.query)} | ${q.resultCount} | ${q.rows.length} | ${q.rows.filter((r) => !r.ok).length} |`);
  }
  lines.push('');
  return lines.join('\n');
}

const results = [];
for (const query of queries) {
  const hits = await search(query);
  const rows = [];
  for (const hit of hits.slice(0, opts.limit)) {
    const checked = await checkUrl(hit.href);
    rows.push({
      title: hit.title,
      entity_type: hit.entity_type,
      entity_slug: hit.entity_slug,
      href: hit.href,
      ...checked,
    });
  }
  results.push({ query, resultCount: hits.length, rows });
}

const broken = results.flatMap((q) => q.rows.filter((r) => !r.ok).map((r) => ({ query: q.query, ...r })));
const markdown = renderMarkdown(results);

if (opts.report) {
  const reportPath = resolve(opts.report);
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, markdown, 'utf8');
}

console.log(markdown);

if (broken.length > 0 && opts.failOnBroken) {
  process.exitCode = 1;
}

