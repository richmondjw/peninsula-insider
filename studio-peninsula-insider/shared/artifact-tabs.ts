export function nextArtifactTabIndex(current: number, count: number, key: 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End'): number {
  if (count < 1) return 0;
  const last = count - 1;
  if (key === 'Home') return 0;
  if (key === 'End') return last;
  if (key === 'ArrowRight') return current === last ? 0 : current + 1;
  return current === 0 ? last : current - 1;
}

export function focusTabAtIndex(
  tabs: ArrayLike<{ focus: () => void } | null | undefined>,
  index: number,
): void {
  tabs[index]?.focus();
}

export function rovingTabIndex(index: number, selectedIndex: number): 0 | -1 {
  return index === selectedIndex ? 0 : -1;
}
