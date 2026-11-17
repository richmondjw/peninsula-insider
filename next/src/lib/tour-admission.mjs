/** Unsourced/disputed tours remain available as correction notices, not recommendations. */
export function isPublishableTour(data) {
  return data?.sourceStatus !== 'unsourced' && data?.sourceStatus !== 'disputed';
}
