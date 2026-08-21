export function nextArtifactTabIndex(current: number, count: number, key: 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End'): number {
  if (count < 1) return 0;
  const last = count - 1;
  if (key === 'Home') return 0;
  if (key === 'End') return last;
  if (key === 'ArrowRight') return current === last ? 0 : current + 1;
  return current === 0 ? last : current - 1;
}
