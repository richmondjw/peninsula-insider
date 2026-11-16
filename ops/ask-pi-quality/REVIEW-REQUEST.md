# Independent implementation review request

Review the exact commit containing this request, not merely the operating specification. The handoff report supplies the full candidate SHA and external run-report path; confirm `git rev-parse HEAD` matches before accepting evidence. Scope is offline milestone A only. No live release is requested.

Please inspect all changes under ops/ask-pi-quality, reproduce both commands in README, and challenge schema validation, evidence binding, answerable-task versus abstention scoring, malformed inputs, pagination/caps, deletions, CMS revision precedence, cancellation, partial failure, simulated crash/retry and rollback compatibility. Verify no workflow/API/index mutation, network/paid call or new raw-query retention was introduced.

Expected baseline: code tests pass, while the fixture report fails the overnight-still-running case. Three source-writer defects remain reproduced. Any claim that this is a live repair, a model evaluation, a tested durable transaction or autonomous governance is incorrect.

Keep reviewer-created holdout outside author-visible development fixtures. Record candidate SHA, fixture and evaluator versions, artifact hashes, reproduced command results, critical and noncritical findings, tested/untested surfaces and an explicit decision: offline package accepted, changes requested, or blocked. Do not approve live release from this package. Staging integration and live scheduled-execution gates remain separately pending.
