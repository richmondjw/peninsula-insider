/** IANA zone handles both AEST and AEDT without a scheduler or server rebuild. */
export function homeArtPeriod(now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Melbourne', hour: '2-digit', hourCycle: 'h23',
  }).format(now));
  return hour >= 6 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'afternoon' : 'evening';
}
