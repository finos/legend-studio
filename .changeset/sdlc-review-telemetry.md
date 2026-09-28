---
'@finos/legend-application-studio': patch
---

Add a structured `sdlc.review.action.{launch,success,failure}` telemetry
lifecycle around SDLC review actions (create / commit / close / reopen /
approve). Fires from both the workspace author side (WorkspaceReviewState —
carries `sourceInfo` from the workspace editor) and the reviewer side
(ProjectReviewerStore — no editor mode, so `sourceInfo` is undefined;
`projectId`, `patchReleaseVersionId?`, and `reviewId` are carried on the
payload so reviewer-side events remain sliceable).

Payloads carry `action`, `role` (`author` / `reviewer`), `projectId`,
`patchReleaseVersionId?`, plus `reviewId` (optional on `create` launch /
failure, populated everywhere else), `durationMs` on success, and
`errorMessage` on failure. The existing `sdlc.manager.failure` developer
error log is left in place for backward compatibility.

Guardrail early-returns (snapshot dependencies, sandbox project, conflict
resolution mode) do not emit a `launch`, so `launch` counts remain a fair
denominator for `success + failure`.
