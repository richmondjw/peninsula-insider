# Independent implementation review request

Review the exact commit containing this request, not merely the operating specification. The handoff report supplies the full candidate SHA and external run-report path; confirm `git rev-parse HEAD` matches before accepting evidence. Scope is offline milestone A only. No live release is requested.

Please inspect all changes under ops/ask-pi-quality, reproduce both commands in README, and challenge schema validation, evidence binding, answerable-task versus abstention scoring, malformed inputs, pagination/caps, deletions, CMS revision precedence, cancellation, partial failure, simulated crash/retry and rollback compatibility. Verify no workflow/API/index mutation, network/paid call or new raw-query retention was introduced.

The original baseline failed overnight-still-running. The candidate now changes the shared event-discovery helper to retain an actual running overnight occurrence after midnight; inspect that production-used helper and its new boundary tests as part of the full diff. The original fixture expectation remains unchanged. Three source-writer defects remain reproduced. Any claim that this fixes Ask PI ingestion/generation, evaluates a model, proves a durable transaction or activates autonomous governance is incorrect.

Keep reviewer-created holdout outside author-visible development fixtures. Record candidate SHA, fixture and evaluator versions, artifact hashes, reproduced command results, critical and noncritical findings, tested/untested surfaces and an explicit decision: offline package accepted, changes requested, or blocked. Do not approve live release from this package. Staging integration and live scheduled-execution gates remain separately pending.
