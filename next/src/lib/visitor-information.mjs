/** Factual operator information. This block cannot carry editorial fields. */
export function visitorInformationSchema(z) {
  const web = z.string().url().refine(value => {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  }, 'Use an official HTTP(S) URL without credentials');
  const text = z.string().trim().min(1).max(1500);
  return z.object({
    status: z.enum(['pending', 'approved', 'rejected']),
    sourceUrl: web,
    submittedBy: text,
    checkedOn: z.coerce.date(),
    reviewedBy: text,
    accessibility: text.optional(),
    children: text.optional(),
    indoorOutdoor: z.enum(['indoor', 'outdoor', 'both']).optional(),
    menuUrl: web.optional(),
    socialLinks: z.array(z.object({ label: text, url: web }).strict()).max(6).default([]),
    video: z.object({ url: web, rightsConfirmed: z.literal(true), credit: text }).strict().optional(),
  }).strict();
}

/** Allowlist public facts; never spread an operator record into editorial data. */
export function approvedVisitorInformation(block, now = Date.now()) {
  if (!block || block.status !== 'approved' || !block.sourceUrl || !block.reviewedBy) return null;
  const checked = new Date(block.checkedOn).getTime();
  if (!Number.isFinite(checked) || checked > now) return null;
  return {
    accessibility: block.accessibility,
    children: block.children,
    indoorOutdoor: block.indoorOutdoor,
    menuUrl: block.menuUrl,
    socialLinks: block.socialLinks ?? [],
    video: block.video?.rightsConfirmed === true ? block.video : undefined,
  };
}
