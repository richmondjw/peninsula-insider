// Asset-register notes are provenance, not public navigation targets.
export function publicImageSourceUrl(value) {
  if (typeof value !== 'string' || !/^https?:\/\/[^\s]+$/i.test(value)) return null;
  try {
    const url = new URL(value);
    return url.hostname && !url.username && !url.password ? value : null;
  } catch { return null; }
}
