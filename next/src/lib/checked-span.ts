/**
 * One phrase for when a collection's facts were last checked, for hub trust
 * lines: "checked October 2026" or "checked September to October 2026".
 * Only records with a real editorial check count (informationCheckedOn); a
 * bulk review stamp is not evidence. Returns '' when nothing has been checked,
 * so callers drop the clause rather than invent a date.
 */
import { informationCheckedOn } from './verification-date.mjs';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const label = (d: Date) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

export function checkedSpan(records: Array<unknown>, now = Date.now()): string {
  return spanOf(records.map((data) => informationCheckedOn(data, now) as Date | undefined), now);
}

/**
 * The same phrase from raw check dates (ISO strings or Dates), e.g. plan verifiedAt.
 * Says nothing unless at least `minCoverage` of the items carry a real check: a
 * date drawn from one record in forty would claim far more than was done.
 */
export function spanOf(input: Array<Date | string | undefined | null>, now = Date.now(), minCoverage = 0.75): string {
  const dates = input
    .map((d) => (d instanceof Date ? d : d ? new Date(d) : undefined))
    .filter((d): d is Date => Boolean(d) && Number.isFinite(d!.getTime()) && d!.getTime() <= now)
    .sort((a, b) => a.getTime() - b.getTime());
  if (!dates.length || dates.length < input.length * minCoverage) return '';
  const first = dates[0], last = dates[dates.length - 1];
  if (label(first) === label(last)) return `checked ${label(last)}`;
  const sameYear = first.getUTCFullYear() === last.getUTCFullYear();
  return `checked ${sameYear ? MONTHS[first.getUTCMonth()] : label(first)} to ${label(last)}`;
}
