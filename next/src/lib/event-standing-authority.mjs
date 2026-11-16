// James's standing instruction replaces publication approval only, never fact checks.
export const EVENT_AUTHORITY = Object.freeze({
  id: 'pi-routine-events-2026-11-01',
  by: 'James',
  at: '2026-11-01T10:13:33.000Z',
  scope: 'verified-routine-pi-website-events',
  source: 'Sentinel_d25f9be50a808191af4932dd34f3ee8f',
});
export const EVENT_PUBLISHER = 'PI routine event publisher';
export function validEventAuthority(value, now = new Date()) {
  return Boolean(value && Object.entries(EVENT_AUTHORITY).every(([key, expected]) => value[key] === expected)
    && Number.isFinite(+new Date(now)) && +new Date(now) >= Date.parse(EVENT_AUTHORITY.at));
}
