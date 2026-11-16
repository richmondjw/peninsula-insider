// The prioritisation engine.
//
// Opportunity value is a product of upside, confidence and ease, discounted by
// risk and by how recently the same URL was touched. Every opportunity lands in
// exactly one action category so the daily cycle knows what, if anything, it is
// allowed to do about it.

import { clamp, daysBetween, round } from './util.mjs';

export const CATEGORIES = ['IGNORE', 'WATCH', 'AUTO-FIX', 'DRAFT', 'RESEARCH', 'NEW CONTENT', 'STRUCTURAL PROJECT'];

const SEVERITY_WEIGHT = { critical: 1.0, major: 0.65, minor: 0.3, noise: 0.05 };

/** The intervention a rule implies, and how hard it is to apply. */
const RULE_ACTIONS = {
  broken_internal_link: { action: 'fix_broken_internal_link', ease: 0.95, category: 'AUTO-FIX' },
  noindex_in_sitemap: { action: 'sitemap_remove_noindex', ease: 0.85, category: 'AUTO-FIX' },
  sitemap_duplicate_entry: { action: 'sitemap_dedupe', ease: 0.9, category: 'AUTO-FIX' },
  sitemap_url_missing_page: { action: 'sitemap_remove_dead_url', ease: 0.85, category: 'AUTO-FIX' },
  not_in_sitemap: { action: 'sitemap_include', ease: 0.8, category: 'STRUCTURAL PROJECT' },
  invalid_jsonld: { action: 'fix_malformed_jsonld', ease: 0.7, category: 'AUTO-FIX' },
  missing_alt: { action: 'add_missing_alt_from_known_caption', ease: 0.5, category: 'DRAFT' },
  missing_meta_description: { action: 'add_missing_meta_description', ease: 0.5, category: 'DRAFT' },
  meta_description_length: { action: 'rewrite_meta_description', ease: 0.45, category: 'DRAFT' },
  duplicate_meta_description: { action: 'rewrite_meta_description', ease: 0.4, category: 'DRAFT' },
  duplicate_title: { action: 'rewrite_title', ease: 0.35, category: 'DRAFT' },
  title_too_long: { action: 'rewrite_title', ease: 0.5, category: 'DRAFT' },
  title_too_short: { action: 'rewrite_title', ease: 0.5, category: 'DRAFT' },
  missing_title: { action: 'rewrite_title', ease: 0.6, category: 'DRAFT' },
  missing_h1: { action: 'add_h1', ease: 0.4, category: 'DRAFT' },
  multiple_h1: { action: 'fix_heading_structure', ease: 0.4, category: 'DRAFT' },
  heading_skip: { action: 'fix_heading_structure', ease: 0.5, category: 'DRAFT' },
  missing_canonical: { action: 'add_canonical', ease: 0.7, category: 'STRUCTURAL PROJECT' },
  canonical_mismatch: { action: 'review_canonical', ease: 0.3, category: 'RESEARCH' },
  orphan_page: { action: 'add_internal_link', ease: 0.6, category: 'DRAFT' },
  thin_content: { action: 'expand_or_consolidate', ease: 0.15, category: 'RESEARCH' },
  no_schema: { action: 'add_schema_from_verified_facts', ease: 0.4, category: 'DRAFT' },
};

/**
 * Turn technical findings into prioritised opportunities.
 * `severities` maps a finding index to a severity decision record.
 */
export async function prioritiseFindings(findings, { pages, service, ledger, searchAvailable }) {
  if (!findings.length) return [];

  const severityRecords = await service.decideBatch(
    'technical.issue_severity',
    findings.map((f) => ({
      rule: f.rule,
      impressions: pages[f.urlPath]?.search?.impressions ?? 0,
      hasSearchData: searchAvailable,
    })),
  );

  const safetyRecords = await service.decideBatch(
    'risk.autofix_safety',
    findings.map((f) => ({
      action: RULE_ACTIONS[f.rule]?.action ?? 'unknown',
      altersEditorialProse: ['expand_or_consolidate', 'rewrite_title', 'add_h1'].includes(RULE_ACTIONS[f.rule]?.action),
      introducesNewFact: ['add_missing_meta_description', 'add_schema_from_verified_facts'].includes(RULE_ACTIONS[f.rule]?.action),
    })),
  );

  // Group by URL+rule so one opportunity represents one problem on one page.
  const grouped = new Map();
  findings.forEach((f, i) => {
    const key = `${f.urlPath}::${f.rule}`;
    if (!grouped.has(key)) {
      grouped.set(key, { finding: f, count: 0, severity: severityRecords[i], safety: safetyRecords[i] });
    }
    grouped.get(key).count += 1;
  });

  const now = new Date().toISOString();
  const out = [];
  for (const { finding, count, severity, safety } of grouped.values()) {
    const page = pages[finding.urlPath];
    const meta = RULE_ACTIONS[finding.rule] ?? { action: 'unknown', ease: 0.2, category: 'WATCH' };
    const sev = severity.value?.severity ?? 'minor';

    const searchOpportunity = page?.search
      ? clamp(Math.log10(1 + (page.search.impressions ?? 0)) / 4)
      : 0.35; // neutral prior when no search data exists

    const strategicRelevance = STRATEGIC_WEIGHT[page?.pageType] ?? 0.5;
    const expectedImpact = SEVERITY_WEIGHT[sev] ?? 0.3;
    const confidence = round(Math.min(severity.confidence, safety.confidence), 3);
    const localContribution = clamp(((page?.towns?.length ?? 0) + (page?.venues?.length ?? 0)) / 10);

    // Discounts.
    const lastTouched = ledger?.lastInterventionFor(finding.urlPath);
    const daysSinceTouched = lastTouched ? daysBetween(lastTouched.date, now) : null;
    const cooldownPenalty = daysSinceTouched !== null && daysSinceTouched < (lastTouched.measurementWindowDays ?? 28) ? 0.35 : 1;
    const riskPenalty = safety.value?.decision === 'human_only' ? 0.8 : 1;
    const learning = ledger?.successRateFor(meta.action);
    // Observational learning is a bounded ranking hint, never a permission grant.
    const learningWeight = learning?.samples >= 3 ? 0.8 + 0.4 * learning.successRate : 1;

    const priority = round(
      (searchOpportunity * 0.25 + strategicRelevance * 0.2 + expectedImpact * 0.3 + localContribution * 0.1 + meta.ease * 0.15)
      * confidence * cooldownPenalty * riskPenalty * learningWeight, 4,
    );

    out.push({
      id: `${finding.rule}:${finding.urlPath}`,
      urlPath: finding.urlPath,
      url: page?.url ?? null,
      pageType: page?.pageType ?? 'unknown',
      rule: finding.rule,
      problem: finding.detail,
      occurrences: count,
      proposedAction: meta.action,
      severity: sev,
      category: categoryFor(meta, safety.value?.decision, sev, daysSinceTouched),
      priority,
      confidence,
      safety: safety.value?.decision ?? 'human_only',
      reversible: safety.value?.reversible ?? false,
      provider: severity.provider,
      signals: {
        searchOpportunity: round(searchOpportunity, 3),
        strategicRelevance,
        expectedImpact,
        ease: meta.ease,
        localContribution: round(localContribution, 3),
        cooldownPenalty,
        learningWeight,
        daysSinceLastIntervention: daysSinceTouched,
      },
      target: finding.target ?? null,
      anchor: finding.anchor ?? null,
      detectedAt: now,
    });
  }

  out.sort((a, b) => b.priority - a.priority);
  return out;
}

const STRATEGIC_WEIGHT = {
  home: 1.0, hub: 0.9, guide: 0.8, 'venue-or-guide': 0.75, 'place-or-guide': 0.75,
  place: 0.75, itinerary: 0.7, article: 0.65, event: 0.5, tour: 0.6,
  'quick-note': 0.25, page: 0.4, utility: 0.1, 'redirect-stub': 0.15,
};

function categoryFor(meta, safetyDecision, severity, daysSinceTouched) {
  if (severity === 'noise') return 'IGNORE';
  if (daysSinceTouched !== null && daysSinceTouched < 14) return 'WATCH';
  if (meta.category === 'AUTO-FIX' && safetyDecision !== 'auto_safe') return 'DRAFT';
  return meta.category;
}

export function summarisePriorities(opportunities) {
  const byCategory = {};
  const bySeverity = {};
  for (const o of opportunities) {
    byCategory[o.category] = (byCategory[o.category] ?? 0) + 1;
    bySeverity[o.severity] = (bySeverity[o.severity] ?? 0) + 1;
  }
  return { total: opportunities.length, byCategory, bySeverity };
}
