/**
 * Feature flags — toggle site features without removing code.
 *
 * SHOW_ASK_PI: the generated-answer concierge (PiChat, the platform API). Off.
 * SHOW_ASK_GUIDE: Ask PI answered from the published guides, in the browser.
 * With both false the Ask PI menu links to the paused page and site search.
 *
 * SHOW_HOME_COVER_SLIDESHOW is retained for legacy imports only. The homepage
 * now renders a static photograph; restoring motion requires an explicit design review.
 */
import expiryState from '../data/event-expiry-state.json';
import { occurrenceModelEnabled } from './event-occurrence.mjs';

// Fail closed while the public answer contract is rebuilt around claim-level
// editorial provenance. A live independent review on 2026-11-20 found that
// generated recommendations could add decision-critical details not supported
// by the linked PI pages. Search remains available across the site.
export const SHOW_ASK_PI = false;

// Ask PI from the guides: matches a question to published pages and shows what
// those pages say (lib/ask-guide.mjs over /ask/index.json, which
// scripts/generate-ask-index.mjs copies from the built pages). Nothing is
// generated, sent or stored. It never turns the concierge on: the two are
// separate code paths and SHOW_ASK_PI wins if both are ever set.
export const SHOW_ASK_GUIDE = true;
export const ASK_GUIDE_ON: boolean = SHOW_ASK_GUIDE && !SHOW_ASK_PI;

/**
 * PUBLIC_EVENT_OCCURRENCE_MODEL: the PI-008 occurrence model, three-state.
 *
 *   off   the previous renderer, always. This is the rollback: one env change
 *         in .github/workflows/build-and-deploy.yml, no revert, no redeploy of
 *         old code. Everything the model adds is additive, so turning it off
 *         returns the exact behaviour that shipped before it.
 *   on    the new model, always, even when the expiry job is unhealthy. Use
 *         this while debugging the job itself.
 *   unset the default. The new model runs only while the expiry job is alive.
 *
 * The default is an interlock, not a preference. scripts/expire-occurrences.mjs
 * writes src/data/event-expiry-state.json every night; if that heartbeat is
 * missing, reports a failure, or has gone quiet for a week, the site restores
 * the previous renderer on its own and says so in the build log. Degrading to
 * code that has been serving readers all year is the safe direction to fail.
 *
 * Follows the PUBLIC_NEWSLETTER_POPUP convention: a string sentinel read from
 * import.meta.env, flipped in the deploy workflow rather than in a commit.
 */
export const EVENT_OCCURRENCE_MODEL = occurrenceModelEnabled({
  flag: import.meta.env.PUBLIC_EVENT_OCCURRENCE_MODEL,
  health: expiryState,
});

/** Convenience for the call sites that only need the boolean. */
export const USE_OCCURRENCE_MODEL: boolean = EVENT_OCCURRENCE_MODEL.enabled;

if (!EVENT_OCCURRENCE_MODEL.enabled && EVENT_OCCURRENCE_MODEL.mode === 'auto') {
  // Loud on purpose. A silent fallback is the same class of bug as a silent
  // expiry: the site keeps rendering and nobody finds out for a month.
  console.warn(
    `[PI-008] occurrence model OFF (${EVENT_OCCURRENCE_MODEL.reason}); serving the previous ` +
      'What’s On renderer. Run: npm run events:expire'
  );
}

/** Legacy compatibility only; the homepage is now a static cover. */
export const SHOW_HOME_COVER_SLIDESHOW = false;
