/**
 * Feature flags — toggle site features without removing code.
 *
 * SHOW_ASK_PI: false hides all Ask PI / concierge entry points sitewide.
 * Re-enable by setting to true and rebuilding.
 *
 * SHOW_HOME_COVER_SLIDESHOW: false renders the homepage cover as a single
 * still photograph - slide 1 of the deck, no controls, no client JS. true
 * cross-fades the whole deck in src/data/home-cover-deck.json with autoplay,
 * arrows, dots and swipe.
 */
import expiryState from '../data/event-expiry-state.json';
import { occurrenceModelEnabled } from './event-occurrence.mjs';

export const SHOW_ASK_PI = false;

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
 * Follows the PUBLIC_ACCESS_GATE convention: a string sentinel read from
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

/**
 * Homepage cover slideshow (2026-09-18). Kill switch: set to false and the
 * cover returns to the still photograph it was before, with no client JS on
 * the page. The deck itself lives in src/data/home-cover-deck.json.
 */
export const SHOW_HOME_COVER_SLIDESHOW = true;
