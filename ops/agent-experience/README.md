# Agent experience v1

Owner: Peninsula Insider engineering and editorial. Target: at least 99/100 under the frozen `rubric-v1.json`, with every critical gate passing. This is a declared task scope, not universal reliability or a ranking promise.

## Publication contract

The sitemap is the export allowlist. The post-build generator also rejects private route prefixes, noindex pages, redirects, invalid canonical identity, and pages without main content and a heading. It does not walk the build directory. Every eligible canonical page gets an explicit `index.md` alternate. The Markdown preserves public main text and links, omitting imagery and interactive controls. HTML remains the citation destination. Null citation dates are unknown; generated timestamps are conversion times.

`/agents/manifest.json` advertises section catalogues, the full catalogue and the most recent representation comparison. Each record has a stable canonical identity, citation bundle and SHA-256 of its Markdown. The snapshot digest is over the ordered identity/hash pairs, without the build timestamp, so an unchanged rebuild has the same content identity.

`/agents/changes.json` compares the candidate with the previous publicly served catalogue retained before the production build. It does not turn an added page into a newly opened venue, or an absent record into a closure. A client may use it only when `fromSnapshot` matches its saved snapshot. Otherwise compare full catalogues. It is not a complete correction or closure history. Local builds without a baseline explicitly report `baselineAvailable: false`; they do not fabricate history. The release fails if the expected previous public baseline cannot be read or validated.

Use explicit Markdown URLs. Content negotiation is not implemented. Clients should honour Cache-Control, conditional ETags and Retry-After; guidance does not promise an unmeasured capacity limit. The live audit makes low-concurrency reads and conditional requests. It never load-tests production to provoke throttling.

## Checks and receipts

- `node --test next/scripts/agent-formats.test.mjs next/scripts/agent-scorecard.test.mjs`
- `node next/scripts/audit-agent-welcome.mjs --dist next/dist --report /tmp/agent-structural.json`
- `node next/scripts/audit-agent-welcome.mjs --base https://peninsulainsider.com.au --report /tmp/agent-live.json`
- Existing `audit-live-agent-readiness.mjs` additionally binds the public release to the expected source SHA and checks event currentness and private HTML exclusions.

The structural audit covers the entire sitemap, every Markdown representation, section partitions, hashes, citation metadata, event contracts and live cache/404 probes. Its results do not supply a full rubric score. Existing build and daily live workflows retain receipts and use the existing failure alert path.

## Independent evaluation

Freeze the rubric, task prompts, expected caveats, official factual sources, critical cases, stack versions, request/latency budgets and private holdout hashes before comparison. Keep raw traces and holdout answers outside the public repository. Preserve the original baseline when fixing failures; do not rewrite it to make the candidate pass. Score changes only against the same declared scope.

The original programme requires two independent evaluations. Each has 30 tasks on three actual documented agent/browser stacks, two fresh-session repetitions (cold and guide-assisted), and ten additional held-out tasks. The scorecard expects observed production evidence, measured metrics, exact source SHA and independent adjudication. An HTTP probe, synthetic fixture, unavailable provider or replay earns no agent-task credit. Test fixtures exercise the validator, not the site score. Hashes and assigned identity labels establish traceability, not factual truth; the independent reviewer must inspect the raw evidence.

The scorecard invocation and evidence schema are in `rubric-v1.json`. Unknown checks receive no credit. Privacy, permission consistency, supported high-consequence facts, truthful event status and consent override the aggregate score. Actual search visibility and return behaviour remain separate longer-term outcome measures.

When access, quota or an unresolved policy choice blocks an evaluation, retain that failed receipt and resume the same programme after the condition changes. Never choose paid fallback, alter access rights or lower the denominator to make it green.

## Rollback

Revert the bounded source release and rebuild through the normal workflow. Generated compact files disappear when the clean output is republished; canonical HTML, account state and editorial source records retain their existing ownership. Review factual corrections separately before reverting them. No account or training permission is granted by these formats.
