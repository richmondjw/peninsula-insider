import type { ArtifactVersion, FoundryRun } from './contracts.js';

export function patchReadiness(run: FoundryRun, refreshInProgress: boolean): { ready: boolean; reason: string } {
  if (refreshInProgress) return { ready: false, reason: 'Astro patch blocked while a source refresh is active.' };
  const article = run.artifactPack.completed.find((artifact) => artifact.type === 'article_draft');
  const metadata = run.artifactPack.completed.find((artifact) => artifact.type === 'article_metadata');
  if (!article || !metadata) return { ready: false, reason: 'Astro patch needs both Article and Article metadata.' };
  const accepted = (artifact: ArtifactVersion) => run.artifactPack.reviews.some((review) => (
    review.artifactId === artifact.id && review.artifactVersion === artifact.version && review.status === 'current'
    && review.decision === 'accepted' && Boolean(review.receiptHash)
  ));
  if (!accepted(article)) return { ready: false, reason: 'Review and accept the current Article before creating an Astro patch.' };
  if (!accepted(metadata)) return { ready: false, reason: 'Review and accept the current Article metadata before creating an Astro patch.' };
  const rightsBound = metadata.dependencies.some((dependency) => dependency.kind === 'media_rights');
  const dependenciesCurrent = metadata.gateResults.some((gate) => gate.gate === 'dependency_current' && gate.passed);
  if (!rightsBound || !dependenciesCurrent) return { ready: false, reason: 'Astro patch needs a current exact hero asset, placement, rights and release binding.' };
  if (metadata.gateResults.some((gate) => gate.blocking && !gate.passed)) return { ready: false, reason: 'Resolve the blocking Article metadata gates before creating an Astro patch.' };
  return { ready: true, reason: 'Article, metadata and exact hero rights are current.' };
}
