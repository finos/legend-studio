# Studio Telemetry

How Legend Studio reports usage, and how to read those events when building dashboards.

Events are emitted through `TelemetryService.logEvent(eventType, data)`. Each `eventType` is a string constant on `LEGEND_STUDIO_APP_EVENT`, and `data` is a flat-ish JSON object whose shape is described below.

Studio's telemetry surface is less uniform than the query builder's: it grew feature-by-feature rather than around a single "session" object, so payload shapes vary between areas. The one shared piece is the **source info envelope** described next — most editor-scoped events carry it, and most dashboard queries start by slicing on it.

## The source info envelope

Every editor-originated Studio event carries an optional `sourceInfo` object that answers _where in Studio the event happened_ — a workspace edit vs. a read-only viewer surface. It is added by whatever `EditorMode` is active (see [EditorMode.ts](packages/legend-application-studio/src/stores/editor/EditorMode.ts)) and threaded through the telemetry helpers as `sourceInfo?: LegendSourceInfo | undefined`.

Unlike the query builder envelope, Studio's `sourceInfo` is **nested** — it lives under a top-level `sourceInfo` key rather than being spread flat. Address it as `data.sourceInfo.sourceType`, `data.sourceInfo.projectId`, etc.

`sourceType` is the discriminator:

| `sourceType`                             | Emitted from                            | Additional fields                                                                                                  |
| ---------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `legend-source-studio-project-workspace` | Standard workspace editor (main Studio) | `projectId`, `workspaceId`, `workspaceType`, `userId?` (USER workspaces only), `source?`, `patchReleaseVersionId?` |
| `legend-source-studio-showcase`          | Showcase viewer                         | `showcasePath`                                                                                                     |

Fields on the two variants live in [StandardEditorMode.ts](packages/legend-application-studio/src/stores/editor/StandardEditorMode.ts) (`WorkspaceProjectQuerySDLC`) and [ShowcaseViewerEditorMode.ts](packages/legend-application-studio/src/stores/showcase/ShowcaseViewerEditorMode.ts) (`ShowcaseViewerQuerySDLC`).

### Gotchas

- **`sourceInfo` may be absent.** Events fired before the editor mode initializes (e.g. very early failures, and the read-only project viewer / GAV viewer surfaces which do not emit a source info yet) carry no `sourceInfo`. Filter for it explicitly if a dashboard must scope to workspace edits: `WHERE data.sourceInfo.sourceType = 'legend-source-studio-project-workspace'`.
- **Non-editor events omit it by design.** Virtual assistant events, showcase manager launches, and search-initiated events fire outside any editor context and do not attach `sourceInfo`.
- **`userId` marks USER workspaces only.** GROUP workspaces have no owner, so `userId` is undefined — do not use it as a user-activity proxy.
- **Patch branches show up as `patchReleaseVersionId`.** A non-null value means the workspace targets a patch branch, not `main`.

## Event catalogue

Studio telemetry breaks into a few loosely coupled areas. All shapes below live in [LegendStudioTelemetryHelper.ts](packages/legend-application-studio/src/__lib__/LegendStudioTelemetryHelper.ts); event name constants live in [LegendStudioEvent.ts](packages/legend-application-studio/src/__lib__/LegendStudioEvent.ts).

### Graph & compilation

Fired around the "compile the model" lifecycle. Payloads reuse `GraphManagerOperationReport` (timings) plus a `dependenciesCount`.

| Event                                      | Payload                                                                                                                      |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `editor.compilation.compile-graph.launch`  | `sourceInfo?`                                                                                                                |
| `editor.form-mode.compilation.success`     | `sourceInfo?` · operation report · `dependenciesCount`                                                                       |
| `editor.form-mode.compilation.failure`     | `sourceInfo?` · `errorKind` (`compilation` / `engine` / `other`) · `errorMessage` · `fallbackToTextMode`                     |
| `editor.compilation.compile-text.launch`   | `sourceInfo?`                                                                                                                |
| `editor.text-mode.compilation.success`     | `sourceInfo?` · operation report · `dependenciesCount`                                                                       |
| `graph-manager.initialize-graph.launch`    | `sourceInfo?`                                                                                                                |
| `graph-manager.initialize-graph.success`   | `sourceInfo?` · `GraphInitializationReport`                                                                                  |
| `graph-manager.initialize-graph.failure`   | `sourceInfo?` · `errorKind` (`dependency` / `deserialization` / `network` / `other`) · `errorMessage` · `fallbackToTextMode` |
| `editor.test.test-data-generation.launch`  | `sourceInfo?`                                                                                                                |
| `editor.test.test-data-generation.success` | `sourceInfo?` · operation report · `dependenciesCount`                                                                       |
| `editor.test.test-data-generation.failure` | `sourceInfo?` · `errorMessage`                                                                                               |

Design notes:

- **`fallbackToTextMode` on form-mode compilation failure.** True when Studio could not reveal the error inline and redirected the user to text mode for debugging. A rising rate is a signal that specific element editors are failing to surface errors — worth splitting by `errorKind`.
- **Every form-mode `compile-graph.launch` gets a terminal event.** `errorKind: other` covers non-engine errors (e.g. network) that are re-thrown to the generic handler; they never fall back to text mode. The failure event is emitted _before_ the text-mode fallback runs, so it is recorded even if the mode switch itself fails.
- **`fallbackToTextMode` on graph init failure.** True only for the "other" bucket (the generic catch-all that redirects to text mode). `dependency`, `deserialization`, and `network` failures each have their own recovery paths and never fall back.
- **Text-mode compilation has no dedicated `launch`.** It shares `editor.compilation.compile-text.launch` with the pre-existing generic launch event.

Legacy generic buckets (`engine.manager.failure`, `sdlc.manager.failure`, `depot.manager.failure`, `application.failure.generic`) still catch failures further down the stack; the structured events above are the recommended surface for compilation, graph-init, and test-data-generation.

### Text mode session

The text-mode ("PURE grammar") authoring session is instrumented as a bounded session: an ENTER event opens it, a LEAVE event closes it and carries the aggregate counts, and a handful of intra-session events describe activity. Enums for `trigger`, `outcome`, `errorKind`, `source`, `direction`, `action`, and `status` are exported from the telemetry helper.

| Event                                      | Payload                                                                                                                                                         |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `editor.text-mode.enter`                   | `sourceInfo?` · `trigger` (`manual-toggle` / `fallback-graph-build-failure` / `fallback-form-compilation-failure` / `initial-lazy`) · `strict` · `elementPath?` |
| `editor.text-mode.leave`                   | `sourceInfo?` · `outcome` (`compiled-and-left` / `discarded`) · `durationMs` · `editCount` · `compilationCount`                                                 |
| `editor.text-mode.first-edit`              | `sourceInfo?` · `timeToFirstEditMs`                                                                                                                             |
| `editor.text-mode.strict.launch`           | `sourceInfo?`                                                                                                                                                   |
| `editor.text-mode.toggle-shortcut.invoked` | `sourceInfo?` · `source` (`button` / `keyboard-shortcut` / `context-menu`) · `direction` (`to-text` / `to-form`)                                                |
| `editor.text-mode.action`                  | `sourceInfo?` · `action` (`go-to-definition`) · `status` (`launch` / `success` / `error`) · `errorMessage?`                                                     |
| `editor.text-mode.compilation.failure`     | `sourceInfo?` · `errorKind` (`parser` / `compiler` / `other`) · `errorMessage`                                                                                  |

Design notes:

- **Session bounded by ENTER + LEAVE.** LEAVE is the only event that carries the aggregate `durationMs` / `editCount` / `compilationCount`. Sessions abandoned by tab-close never emit a LEAVE; that is the accepted trade-off — `beforeunload` delivery is unreliable and we intentionally don't emit a summary from it.
- **`first-edit` fires at most once per session.** Per-keystroke telemetry would be too chatty; the counters flush with LEAVE.
- **`trigger` distinguishes intent.** `manual-toggle` is a user choosing text mode; the `fallback-*` triggers mean the form mode failed and Studio dropped the user into text mode. Compare rates to find broken form editors.
- **`strict` means the strict-text (lazy) variant.** True on both ENTER and, for convenience, `strict.launch`.
- **`action.status='launch'` pairs with a later `success` / `error`.** Missing follow-ups mean the action never completed (user cancelled, crash, tab-close).
- **Legacy keyboard-shortcut events.** `editor.text-mode.action.keyboard.shortcut.go-to-element.{launch,success,error}` predates the unified `action` event and remains for backward compatibility with existing dashboards. New consumers should read `editor.text-mode.action` with `action='go-to-definition'`.

### Workspace SDLC (push / pull / conflicts)

Fired from workspace save (push local changes) and workspace update (pull). `mode` carries the graph editor mode at the moment of push (`form` / `text` / `strict-text`) so you can compare save behavior between form and text authors.

| Event                             | Payload                                                                                |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| `sdlc.local-changes-push.launch`  | `sourceInfo?` · `mode` · `changeCount`                                                 |
| `sdlc.local-changes-push.success` | `sourceInfo?` · `mode` · `changeCount` · `durationMs` · `revisionId?`                  |
| `sdlc.local-changes-push.failure` | `sourceInfo?` · `mode` · `changeCount` · `errorMessage`                                |
| `sdlc.local-changes-push.empty`   | `sourceInfo?` · `mode` (user clicked "push" with no pending changes — friction signal) |
| `sdlc.workspace-update.launch`    | `sourceInfo?`                                                                          |
| `sdlc.workspace-update.success`   | `sourceInfo?` · `status` · `durationMs`                                                |
| `sdlc.workspace-update.failure`   | `sourceInfo?` · `errorMessage`                                                         |

### SDLC review

Structured lifecycle around review actions (create / commit / close / reopen / approve) — a promotion of the callsites that used to only funnel failures through the generic `sdlc.manager.failure` bucket. Fires from two surfaces:

- **Author side** ([WorkspaceReviewState.ts](packages/legend-application-studio/src/stores/editor/sidebar-state/WorkspaceReviewState.ts)) — `create`, `commit`, `close` triggered from the sidebar review panel inside the workspace editor. Carries the standard `sourceInfo` envelope.
- **Reviewer side** ([ProjectReviewerStore.ts](packages/legend-application-studio/src/stores/project-reviewer/ProjectReviewerStore.ts)) — `approve`, `commit`, `reopen`, `close` triggered from the standalone `/review/:reviewId` route. No editor mode is active, so `sourceInfo` is undefined; `projectId` / `patchReleaseVersionId?` / `reviewId` are on the payload so events remain sliceable.

Enums exported from the telemetry helper: `SDLC_REVIEW_ACTION`, `SDLC_REVIEW_ROLE`.

| Event                        | Payload                                                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| `sdlc.review.action.launch`  | `sourceInfo?` · `action` · `role` · `projectId` · `patchReleaseVersionId?` · `reviewId?`                  |
| `sdlc.review.action.success` | `sourceInfo?` · `action` · `role` · `projectId` · `patchReleaseVersionId?` · `reviewId` · `durationMs`    |
| `sdlc.review.action.failure` | `sourceInfo?` · `action` · `role` · `projectId` · `patchReleaseVersionId?` · `reviewId?` · `errorMessage` |

Design notes:

- **`role` disambiguates the two surfaces even for the same `action`.** `commit` and `close` fire from both; `create` only from `author`; `approve` and `reopen` only from `reviewer`.
- **`sourceInfo` is only present on the author side.** The reviewer route has no editor mode. Address `projectId` / `patchReleaseVersionId?` / `reviewId` on the payload rather than under `sourceInfo` when slicing across roles.
- **`reviewId` is optional on `create.launch`** (no id assigned yet) and optional on `create.failure` (the server may have failed before assigning one). Populated everywhere else, including all `*.success` events.
- **`durationMs`** is wall-clock from `launch` to server response. It excludes user think-time.
- **Guardrail early-returns do not emit `launch`.** `createWorkspaceReview` short-circuits with a notification for snapshot-dependency workspaces or sandbox projects; `commitWorkspaceReview` does the same for snapshot deps and for the conflict-resolution-mode precheck. These paths never emit a lifecycle event, so `launch` remains a fair denominator for `success + failure`.
- **`sdlc.manager.failure` developer log stays in place.** The new failure event is emitted alongside — existing developer-console error logs continue.
- **Non-lifecycle review calls** (fetch review, fetch approvals, fetch comparison, refresh change detection, workspace recreation after commit) remain on the generic `sdlc.manager.failure` bucket. They are background reads, not user-triggered actions.

### Workspace setup

Structured lifecycle around user-triggered writes from the setup / project picker route ([WorkspaceSetupStore.ts](packages/legend-application-studio/src/stores/workspace-setup/WorkspaceSetupStore.ts)) — a promotion of the callsites that used to only funnel failures through `setup.workspace.failure` / `engine.manager.failure`, plus `create-project` and `import-project` flows that previously emitted no telemetry at all.

Enum exported from the telemetry helper: `SETUP_ACTION` — `create-sandbox-project` / `create-project` / `import-project` / `create-workspace`.

| Event                  | Payload                                                                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `setup.action.launch`  | `sourceInfo?` (always undefined) · `action` · `projectId?` · `workspaceType?` · `hasPatchReleaseVersion?`                  |
| `setup.action.success` | `sourceInfo?` (always undefined) · `action` · `projectId?` · `workspaceType?` · `hasPatchReleaseVersion?` · `durationMs`   |
| `setup.action.failure` | `sourceInfo?` (always undefined) · `action` · `projectId?` · `workspaceType?` · `hasPatchReleaseVersion?` · `errorMessage` |

Design notes:

- **`sourceInfo` is always undefined.** The setup screen runs before any editor mode is active. Slice on the payload's `action` / `projectId?` instead.
- **`projectId` is populated at launch for `create-workspace`** (the caller passes the target project up front). For the other three actions the id is only known once the server assigns it — it appears on `success` events but is absent from `launch` and `failure`.
- **`workspaceType` and `hasPatchReleaseVersion` are only populated for `create-workspace`.** They are omitted from the other three actions rather than carrying meaningless defaults.
- **Bail-out early-returns are not "failures".** `createSandboxProject` short-circuits when the user lacks sandbox access (a sandbox request modal opens instead) — that path emits no lifecycle event, so `launch` remains a fair denominator for `success + failure`.
- **`WORKSPACE_SETUP_FAILURE` and `ENGINE_MANAGER_FAILURE` developer logs stay in place** at the two callsites that had them; the new failure event is emitted alongside.
- **Read paths stay on generic buckets.** `initialize`, `initializeEngine`, `loadProjects`, `loadSandboxProject`, `changeProject` are background reads and continue to log through `SDLC_MANAGER_FAILURE` / `ENGINE_MANAGER_FAILURE` / `DEPOT_MANAGER_FAILURE` / `WORKSPACE_SETUP_FAILURE`.

### Ad-hoc workspace creation (editor bootstrap)

Structured lifecycle around the "Create workspace" recovery prompt in [EditorStore.ts](packages/legend-application-studio/src/stores/editor/EditorStore.ts) that fires when a user deep-links to a workspace that doesn't exist yet. Distinct bucket from `setup.action.create-workspace` — the callsite, error-handling, and legacy log bucket (`WORKSPACE_SETUP_FAILURE`) are different.

| Event                           | Payload                                                                                                                      |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `sdlc.workspace-create.launch`  | `sourceInfo?` (always undefined) · `projectId` · `workspaceId` · `workspaceType` · `hasPatchReleaseVersion`                  |
| `sdlc.workspace-create.success` | `sourceInfo?` (always undefined) · `projectId` · `workspaceId` · `workspaceType` · `hasPatchReleaseVersion` · `durationMs`   |
| `sdlc.workspace-create.failure` | `sourceInfo?` (always undefined) · `projectId` · `workspaceId` · `workspaceType` · `hasPatchReleaseVersion` · `errorMessage` |

Design notes:

- **`sourceInfo` is always undefined.** The recovery prompt fires before any editor mode is initialized. `projectId` / `workspaceId` / `workspaceType` are on the payload directly.
- **Two-outcome success.** The `success` event is emitted immediately before `navigator.reload()`, so it always reaches the telemetry service even though the page reloads right after.
- **Not the same as `setup.action.create-workspace`.** Setup fires from the setup / project picker route; this event fires from the editor bootstrap's not-found recovery path. Both may be present in a single user's session.
- **`WORKSPACE_SETUP_FAILURE` developer log stays in place** alongside the new failure event.

### Project configuration update

Structured lifecycle around user-triggered writes from the project configuration editor ([ProjectConfigurationEditorState.ts](packages/legend-application-studio/src/stores/editor/editor-state/project-configuration-editor-state/ProjectConfigurationEditorState.ts)). Promotion of the `sdlc.manager.failure` bucket for the three top-level entry points in the config editor.

Enum exported from the telemetry helper: `PROJECT_CONFIG_UPDATE_ACTION` — `update-configs` (dependency add/remove, platform configurations, run-dependency-tests toggle), `update-to-latest-structure` (structure version bump), `change-project-type` (managed / embedded toggle).

| Event                                  | Payload                                   |
| -------------------------------------- | ----------------------------------------- |
| `editor.project-config.update.launch`  | `sourceInfo?` · `action`                  |
| `editor.project-config.update.success` | `sourceInfo?` · `action` · `durationMs`   |
| `editor.project-config.update.failure` | `sourceInfo?` · `action` · `errorMessage` |

Design notes:

- **Single emission point.** All three top-level flows (`updateConfigs`, `updateToLatestStructure`, `changeProjectType`) funnel through the base `updateProjectConfiguration` flow, and that base method is where the lifecycle fires. Each caller passes its own `action` value — one event per user action, no double-counting.
- **`durationMs`** includes not just the `updateConfiguration` SDLC call but also the post-update workspace / revision refetch and `initMode()` — from the user's perspective, "updated" only means anything once the editor has re-rendered with the new config.
- **`sdlc.manager.failure` developer log stays in place** alongside the new failure event.
- **Read paths stay on the generic bucket.** `fectchAssociatedProjectsAndVersions` and `fetchLatestProjectStructureVersion` are background reads and continue to log through `SDLC_MANAGER_FAILURE`.

### Project overview actions

Structured lifecycle around user-triggered SDLC writes from the project overview sidebar ([ProjectOverviewState.ts](packages/legend-application-studio/src/stores/editor/sidebar-state/ProjectOverviewState.ts)). Promotion of the `sdlc.manager.failure` bucket for the five user-facing writes on that panel.

Enum exported from the telemetry helper: `PROJECT_OVERVIEW_ACTION` — `delete-workspace`, `update-project`, `create-version`, `release-patch`, `create-patch`.

| Event                                    | Payload                                                                                               |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `editor.project-overview.action.launch`  | `sourceInfo?` · `action` · `projectId` · `patchReleaseVersionId?` · `workspaceType?`                  |
| `editor.project-overview.action.success` | `sourceInfo?` · `action` · `projectId` · `patchReleaseVersionId?` · `workspaceType?` · `durationMs`   |
| `editor.project-overview.action.failure` | `sourceInfo?` · `action` · `projectId` · `patchReleaseVersionId?` · `workspaceType?` · `errorMessage` |

Design notes:

- **`sourceInfo` is populated** — the overview panel is only reachable from inside the workspace editor. `projectId` is also duplicated on the payload so slicers don't need to unpack `sourceInfo`.
- **`patchReleaseVersionId` is populated for `release-patch`** (the patch being released) and for `create-patch` (the source version the new patch branches from). Undefined for `update-project` and `create-version`; populated for `delete-workspace` only when the target workspace lives on a patch branch.
- **`workspaceType` is populated for `delete-workspace`** (the target workspace's type) and for `create-patch` (the workspace being seeded on the new patch branch). Undefined for the other three actions.
- **`create-patch` covers both SDLC calls.** The flow chains `createPatch` and `createWorkspace`; a single lifecycle event pair wraps both, so a failure in either call surfaces as a single `create-patch` failure with the wrapping error.
- **`durationMs`** is wall-clock from `launch` to the last SDLC call completing (plus the follow-up refetch for `create-version`). Navigation after `create-patch` is excluded — the success event fires before the redirect so it always reaches the telemetry service.
- **`sdlc.manager.failure` developer log stays in place** alongside the new failure event.
- **Read paths stay on the generic bucket.** `fetchProjectWorkspaces`, `fetchPatches`, `fetchLatestProjectVersion` are background reads and continue to log through `SDLC_MANAGER_FAILURE`.

### LegendAI suggest (service / dataspace / data product)

One unified family covers the "Suggest with AI" button on all three surfaces, discriminated by `surface` (`service` / `dataspace` / `data-product`). Every event after `launch` carries the `suggestionId` minted at launch, so a single suggestion can be followed from request to push. The lifecycle is driven by `LegendAISuggestTelemetryTracker` ([LegendAISuggestTelemetry.ts](packages/legend-application-studio/src/stores/editor/LegendAISuggestTelemetry.ts)) via the `useLegendAISuggestTelemetry` hook.

Common target fields: `sourceInfo?` · `surface` · `elementPath` · `accessPointGroupId?` (data product only — suggestions are launched per access point group). Identity fields (all events but `exposure`): target + `suggestionId` · `attempt` (1-based count of suggestions requested from that editor instance).

| Event                               | Payload (beyond target / identity)                                                                                                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `editor.legendai-suggest.exposure`  | `available` (suggester plugin installed) · `isReadOnly` — once per editor mount, only when `legendAIUrl` is configured                                                                                              |
| `editor.legendai-suggest.launch`    | `hadExistingText` · `existingLength` · `accessPointCount?`                                                                                                                                                          |
| `editor.legendai-suggest.success`   | `durationMs` · `definitionsLength` · `suggestionLength` · `confidence?` · `editedWhilePending` · `accessPointSuggestionCount?`                                                                                      |
| `editor.legendai-suggest.failure`   | `durationMs` · `stage` (`serialize` / `request`) · `errorKind` · `httpStatus?` · `errorMessage`                                                                                                                     |
| `editor.legendai-suggest.apply`     | `timeToDecisionMs` · `hadExistingText` · `existingLength` · `suggestionLength` · data product only: `matchStrategy` · `accessPointsUpdated` · `accessPointsRenamed` · `namesSanitized` · `accessPointCountMismatch` |
| `editor.legendai-suggest.discard`   | `timeToDecisionMs`                                                                                                                                                                                                  |
| `editor.legendai-suggest.abandon`   | `phase` (`pending` / `shown`) · `elapsedMs`                                                                                                                                                                         |
| `editor.legendai-suggest.persisted` | `retention` (`unchanged` / `edited` / `cleared` / `element-removed`) · `editRatio?` · `msSinceApply` · `supersededApplyCount`                                                                                       |

Enums exported from `@finos/legend-application-studio`: `LEGENDAI_SUGGEST_SURFACE`, `LEGENDAI_SUGGEST_STAGE`, `LEGENDAI_SUGGEST_ERROR_KIND`, `LEGENDAI_SUGGEST_ABANDON_PHASE`, `LEGENDAI_SUGGEST_RETENTION`, `LEGENDAI_SUGGEST_MATCH_STRATEGY`.

Design notes:

- **Funnel.** `exposure(available)` → `launch` → `success` → `apply` → `persisted(unchanged | edited)`. Each `launch` ends in exactly one of `success` / `failure`; each `success` ends in at most one of `apply` / `discard` / `abandon(shown)`.
- **`errorKind`.** `serialization` (grammar composition failed locally, `stage: serialize`), `entitlement` (HTTP 401/403 — the user needs LegendAI entitlements), `client` (other 4xx), `server` (5xx), `empty-response` (LegendAI answered with nothing to show; the user gets a warning toast), `other`.
- **`abandon`** fires when the editor unmounts (tab switch / close, mode switch) while a request is in flight (`pending`) or a suggestion is on screen (`shown`). A request that settles after a `pending` abandon still reports its `success` / `failure`, but can no longer be applied.
- **`editedWhilePending`** is true when the target text changed between launch and response — applying then overwrites the user's in-flight edit.
- **`persisted`** fires on the first successful push that includes the element after an apply, comparing the applied text with what was pushed. `editRatio` is a normalized Levenshtein distance (0 = same, 1 = fully rewritten), only set for `edited` and omitted for texts over 2000 characters. Only the latest apply per target is followed; earlier ones are counted in `supersededApplyCount`. Applies whose element is renamed before pushing are not reported. For data products the compared text is the group's title / description plus the id / title / description of each updated access point.
- **`confidence`** is model-reported: the description confidence for dataspaces, the matched group's confidence for data products, and absent for services (the service API returns plain text).
- **`definitionsLength`** is the size of the grammar sent to LegendAI — the element alone for services, the whole graph for dataspaces and data products — useful for correlating latency with input size.

Legacy per-surface families are still emitted alongside, unchanged, for existing dashboards:

| Family                                                                  | Payload                                                      |
| ----------------------------------------------------------------------- | ------------------------------------------------------------ |
| `editor.service-editor.legendai-suggest.{launch,apply,discard,failure}` | `servicePath` · `sourceInfo?` · `errorMessage` (failure)     |
| `editor.dataspace.legendai-suggest.{launch,apply,discard,failure}`      | `dataSpacePath` · `sourceInfo?` · `errorMessage` (failure)   |
| `editor.data-product.legendai-suggest.{launch,apply,discard,failure}`   | `dataProductPath` · `sourceInfo?` · `errorMessage` (failure) |

### Service registration

Fired from the three service-registration entry points: the per-service editor button (`single`), the sidebar bulk registration modal (`bulk`), and the standalone service query editor (`service-query-editor`). Every event carries the same `trigger` discriminator plus the target `executionMode` and `serviceCount` so dashboards can slice by entry point, environment, or fleet size without joining sources.

Enum exported from the telemetry helper: `SERVICE_REGISTRATION_TRIGGER`.

| Event                                        | Payload                                                                                                                                                                      |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `editor.service-editor.registration.launch`  | `sourceInfo?` · `trigger` · `executionMode?` · `serviceCount` · `activatePostRegistration`                                                                                   |
| `editor.service-editor.registration.success` | `sourceInfo?` · `trigger` · `executionMode?` · `serviceCount` · `activatePostRegistration` · `durationMs` · `registeredCount` · `failedCount` · `activationFailedCount?`     |
| `editor.service-editor.registration.failure` | `sourceInfo?` · `trigger` · `executionMode?` · `serviceCount` · `activatePostRegistration` · `errorMessage` · `registeredCount?` · `failedCount?` · `activationFailedCount?` |

Design notes:

- **`trigger` distinguishes entry point.** `single` = per-service editor button, `bulk` = sidebar bulk-register modal, `service-query-editor` = standalone dsl-service query editor.
- **`serviceCount` is always populated.** `1` for `single` / `service-query-editor`, N for `bulk` (the number of user-selected services in the batch).
- **`executionMode?` may be undefined at launch.** The single-service flow allows launching before the mode is chosen; the bulk and service-query-editor flows always populate it (bulk from the shared config panel, service-query-editor is always `SEMI_INTERACTIVE`).
- **`durationMs` on success includes the post-registration activation call** when `activatePostRegistration` is true. This is intentional: from a user's perspective, "registered" only means anything if activation succeeded.
- **Per-service outcome counts.** `single` / `service-query-editor` successes always carry `registeredCount: 1, failedCount: 0` (a failed registration throws and emits `failure`). `bulk` runs report the engine's per-service split: a run where no service registered emits `failure` (with the counts and the first service error as `errorMessage`); partial success emits `success`. `activationFailedCount` (bulk + `activatePostRegistration` only) counts registered services whose activation call rejected — bulk activations are awaited with `Promise.allSettled`, so one failed activation neither hides the results nor goes unhandled.
- **`registration.failure` is the same event constant that already backed `logService.error` calls.** Existing developer-console error logs continue; the failure event is now also emitted through the telemetry service so error rates are queryable alongside launches and successes.

### Service registration precheck

Fired when the service editor opens the registration modal and probes each configured environment to check whether the service pattern is already deployed. Each precheck run emits one `launch` and exactly one `success` or `failure`, so dashboards can measure precheck volume, duration, and error rate.

| Event                                              | Payload                                                                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `editor.service-editor.registration-check.launch`  | `sourceInfo?` · `servicePath` · `envCount`                                                                                |
| `editor.service-editor.registration-check.success` | `sourceInfo?` · `servicePath` · `envCount` · `durationMs` · `registeredEnvCount` · `errorCount` · `failedEnvs`            |
| `editor.service-editor.registration-check.failure` | `sourceInfo?` · `servicePath` · `envCount` · `durationMs` · `errorCount` · `failedEnvs` · `errorMessage` (last env error) |

Design notes:

- **Precheck is per-env in a loop, reported per run.** Per-env errors from `checkServiceRegisteredByPattern` are aggregated into `errorCount` / `failedEnvs` (the per-env developer-console warning under the same event name is unchanged).
- **`failure` means no env could be probed** (`errorCount == envCount`). Partial per-env errors still produce a `success`.
- **`registered=` bookkeeping.** `registeredEnvCount` is the number of envs where the service is already deployed; `envCount - registeredEnvCount - errorCount` is the "not yet deployed" bucket.

### Generation

Fired around model / artifact / element-schema generation. Two entry points share the same event family, discriminated by `mode`:

- `global` — the sidebar "Generate" button runs the project's generation spec, spanning both model generation and artifact generation as a single user action.
- `element-schema` — the "Generate" button on an element's external-format editor regenerates the schema for one element.

Enum exported from the telemetry helper: `GENERATION_MODE`.

| Event                       | Payload                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `editor.generation.launch`  | `sourceInfo?` · `mode` · `elementPath?` · `generationType?` · `enableArtifactGeneration?`                  |
| `editor.generation.success` | `sourceInfo?` · `mode` · `elementPath?` · `generationType?` · `enableArtifactGeneration?` · `durationMs`   |
| `editor.generation.failure` | `sourceInfo?` · `mode` · `elementPath?` · `generationType?` · `enableArtifactGeneration?` · `errorMessage` |

Design notes:

- **`elementPath` / `generationType` only carry values for `element-schema`**; for `global` they are undefined because a global run spans multiple elements and multiple generation types.
- **`enableArtifactGeneration` only carries a value for `global`.** It reflects the `GraphGenerationState.enableArtifactGeneration` flag at the moment the run was launched, and lets dashboards separate "generate models only" runs from "generate models + artifacts" runs. Undefined for `element-schema`.
- **A `global` run emits exactly one `success` or `failure`.** `generateModels`, `generateArtifacts`, and the deprecated file-generation flow each handle their own errors (the `notifyError` toast is the user-facing signal) and return them, so artifact generation still runs after a model generation failure. `globalGenerate` emits `failure` with the first sub-step error, or `success` when every step succeeded.
- **`editor.generation.failure` is the same constant that already backed `logService.error` calls.** Existing developer-console error logs continue; the telemetry event is now emitted alongside so error rate is queryable.

### Push to dev metadata

"Push to dev metadata" propagates a workspace's artifacts to the metadata service.

| Event                                      | Payload                                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `editor.metadata.push-to-metadata.launch`  | `sourceInfo?` · `groupId` · `artifactId` · `versionId?` · `ingestCount` · `dataProductCount`            |
| `editor.metadata.push-to-metadata.success` | `sourceInfo?` · `groupId` · `artifactId` · `versionId?` · `status` · `ingestCount` · `dataProductCount` |
| `editor.metadata.push-to-metadata.failure` | `sourceInfo?` · `errorMessage`                                                                          |

`ingestCount` and `dataProductCount` count the current project's own lakehouse elements only (`graph.ownIngests` / `graph.ownDataProducts`); elements coming from project dependencies are excluded.

### Workflow manager (SDLC pipelines)

The workflow manager sidebar surfaces SDLC pipelines / jobs and lives in three flavors — the workspace editor sidebar plus two read-only viewer surfaces (project, project-version). Every event carries `sourceInfo?` **and** a top-level `scope` discriminator (`workspace` / `project` / `project-version`) so dashboards can slice pipeline health per surface without joining on `sourceInfo.sourceType`.

Enums exported from the telemetry helper: `WORKFLOW_MANAGER_SCOPE`, `WORKFLOW_MANAGER_JOB_ACTION`.

| Event                                      | Payload                                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `workflow-manager.panel.open`              | `sourceInfo?` · `scope`                                                                          |
| `workflow-manager.panel.close`             | `sourceInfo?` · `scope` · `dwellMs`                                                              |
| `workflow-manager.fetch-workflows.launch`  | `sourceInfo?` · `scope`                                                                          |
| `workflow-manager.fetch-workflows.success` | `sourceInfo?` · `scope` · `durationMs` · `workflowCount` · `statusBreakdown`                     |
| `workflow-manager.fetch-workflows.failure` | `sourceInfo?` · `scope` · `errorMessage`                                                         |
| `workflow-manager.workflow.expand`         | `sourceInfo?` · `scope` · `workflowStatus`                                                       |
| `workflow-manager.workflow.refresh`        | `sourceInfo?` · `scope` · `workflowStatus`                                                       |
| `workflow-manager.fetch-jobs.launch`       | `sourceInfo?` · `scope`                                                                          |
| `workflow-manager.fetch-jobs.success`      | `sourceInfo?` · `scope` · `durationMs` · `jobCount` · `statusBreakdown`                          |
| `workflow-manager.fetch-jobs.failure`      | `sourceInfo?` · `scope` · `errorMessage`                                                         |
| `workflow-manager.job-action.launch`       | `sourceInfo?` · `scope` · `action` (`retry` / `cancel` / `run-manual`) · `jobName` · `jobStatus` |
| `workflow-manager.job-action.success`      | `sourceInfo?` · `scope` · `action` · `jobName` · `durationMs`                                    |
| `workflow-manager.job-action.failure`      | `sourceInfo?` · `scope` · `action` · `jobName` · `errorMessage`                                  |
| `workflow-manager.job-logs.open`           | `sourceInfo?` · `scope` · `jobName` · `jobStatus`                                                |
| `workflow-manager.job-logs.close`          | `sourceInfo?` · `scope` · `jobName` · `dwellMs` · `refreshCount`                                 |
| `workflow-manager.job-logs.refresh`        | `sourceInfo?` · `scope` · `jobName`                                                              |
| `workflow-manager.job-logs.fetch.success`  | `sourceInfo?` · `scope` · `jobName` · `durationMs` · `logSizeBytes`                              |
| `workflow-manager.job-logs.fetch.failure`  | `sourceInfo?` · `scope` · `jobName` · `errorMessage`                                             |

Design notes:

- **`statusBreakdown` is `Record<status, count>`.** Values come from `WorkflowStatus` / `WorkflowJobStatus` (uppercase enum names, e.g. `SUCCEEDED`, `FAILED`, `IN_PROGRESS`). It is shape-only — never raw workflow ids or names.
- **`workflow.expand` fires on open only.** Collapse does not emit an event, so `expand` counts are per-open (dashboard-friendly).
- **`job-action.launch` may be followed by `success` or `failure`.** Missing follow-ups mean the tab closed mid-action. All three actions (including `cancel`) await the underlying SDLC call, so a rejected call reports `failure`; `durationMs` covers the action plus the follow-up refresh.
- **`logSizeBytes` is the log length in bytes**, never the log content.
- **Read-only viewer surfaces attach `sourceInfo` too.** Since the project viewer's `getSourceInfo()` returns a `LegendProjectIdSourceInfo` / `LegendGAVSourceInfo` (see [ProjectViewerEditorMode.ts](packages/legend-application-studio/src/stores/project-view/ProjectViewerEditorMode.ts)), workflow-manager events fired from viewer surfaces carry the appropriate envelope. `scope` still distinguishes viewer flavors even before the graph loads (source info is undefined then).

### Service test suite run

Fired when a user runs a service test suite from the service editor's testable panel. Complements the existing `editor.service-editor.test-runner.failure` generic bucket with a structured lifecycle so dashboards can measure suite volume, pass rates, and duration.

Enum exported from the telemetry helper: `SERVICE_TEST_SUITE_RUN_MODE`.

| Event                                          | Payload                                                                                                                          |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `editor.service-editor.test-suite-run.launch`  | `sourceInfo?` · `servicePath` · `suiteId` · `mode` (`run-suite` / `run-failing`) · `testCount`                                   |
| `editor.service-editor.test-suite-run.success` | `sourceInfo?` · `servicePath` · `suiteId` · `mode` · `testCount` · `durationMs` · `passedCount` · `failedCount` · `erroredCount` |
| `editor.service-editor.test-suite-run.failure` | `sourceInfo?` · `servicePath` · `suiteId` · `mode` · `testCount` · `errorMessage`                                                |

Design notes:

- **`mode` distinguishes entry point.** `run-suite` = "Run" on the whole suite; `run-failing` = the "Run Failing" shortcut that re-runs only tests currently failing or errored.
- **`testCount` is the number of unit tests dispatched in the run**, not the number of tests defined on the suite. For `run-failing` this is the count of currently-failing tests; if it is `0` the flow still emits a launch/success pair.
- **`passedCount` / `failedCount` / `erroredCount` are shape-only** — they are derived from the returned `TestResult` list (`TestExecuted.testExecutionStatus`, `TestError`, plus per-key results on `MultiExecutionServiceTestResult`). No test ids or names are attached.
- **Failure event fires when the runner call itself throws**, e.g. engine unreachable or unexpected server error — not when individual tests fail. Per-test failures are surfaced through the success event's counts.

### Editor tabs

Fired around the lifecycle of Studio's editor tabs — the tab strip at the top of the workspace editor. Every open flow (explorer click, search result, go-to-definition, deep-link, cache-restore after a graph rebuild) routes through `EditorTabManagerState.openTab`; every close flow (tab X, close-others, close-all, cache-and-close during graph rebuild) routes through the matching close method. All of these fire structured telemetry so dashboards can answer "which element kinds are people editing, and for how long?".

Enums exported from the telemetry helper: `EDITOR_TAB_KIND`, `EDITOR_TAB_OPEN_TRIGGER`, `EDITOR_TAB_CLOSE_TRIGGER`. `elementKind` is a raw `PACKAGEABLE_ELEMENT_TYPE` string produced by [`EditorGraphState.getPackageableElementType`](packages/legend-application-studio/src/stores/editor/EditorGraphState.ts) — the same plugin-aware classifier used elsewhere in Studio (project search, element icons, global test runner). This means extension-provided element kinds (DataSpace, Diagram, DataQuality, ...) come through with their extension-declared labels rather than falling into a generic `other` bucket.

| Event              | Payload                                                                             |
| ------------------ | ----------------------------------------------------------------------------------- |
| `editor.tab.open`  | `sourceInfo?` · `tabKind` · `elementKind?` · `elementPath?` · `trigger`             |
| `editor.tab.close` | `sourceInfo?` · `tabKind` · `elementKind?` · `elementPath?` · `dwellMs` · `trigger` |

Design notes:

- **`tabKind`** buckets tabs into `element` / `entity-diff` / `artifact-generation` / `model-importer` / `project-configuration` / `end-to-end-workflow` / `other`. `other` catches extension-provided tabs (DataCube panels, showcase-hosted editors) — slice on nothing but count if you need the raw volume.
- **`elementKind` / `elementPath`** are populated only for `tabKind='element'`. `elementKind` is the raw `PACKAGEABLE_ELEMENT_TYPE` label (e.g. `'CLASS'`, `'MAPPING'`, `'SERVICE'`, `'BETA_DATA_PRODUCT'`). Extension-provided element kinds are labelled via their `getExtraElementClassifiers` plugin contribution, so DataSpace / Diagram / DataQuality tabs slice cleanly without needing `elementPath` as a workaround.
- **`trigger` on open** is `programmatic` by default (any store-initiated open), with `restore` reserved for tabs recreated by `recoverTabs` after a graph rebuild. Future work can thread additional triggers (`explorer-click`, `search-result`, `go-to-definition`, ...) from UI callsites without changing the event shape.
- **`trigger` on close** distinguishes intent: `user-close` (tab X or middle-click), `close-others`, `close-all`, `navigate-away` (`cacheAndClose` during graph rebuild — always followed by a batch of `restore`-triggered opens), and `programmatic`.
- **`dwellMs`** is cumulative time the tab was the active tab, not wall-clock since open. Tabs that were opened but never activated report `0`; tabs that were activated multiple times (e.g. user switches away and back) sum across all active windows. It does not currently gate on `document.visibilityState` — hidden browser tabs still accumulate. That is the accepted trade-off for keeping the accounting simple.
- **Open telemetry fires only on first open**, not on re-activation (clicking an already-open tab). Re-activation is inferred from the absence of an open event between two dwell windows. If you need "tab switch" separately, that is Phase 2 work.
- **Close order.** Bulk closes (`close-others`, `close-all`, `navigate-away`) emit one `close` event per non-pinned tab **before** the underlying tab array mutates, so each event carries the correct pre-close dwell.
- **Pinned tabs never emit close events** because the base tab manager silently no-ops the close call for them.

### Showcase manager

Not editor-scoped, so no `sourceInfo`.

| Event                                      | Payload                                                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `showcase.manager.launch`                  | `showcasesTotalCount` · `showcasesDevelopmentCount` · `entryPoint`                                   |
| `showcase.manager.showcase.project.launch` | `showcasePath` · `title?` · `isDevelopment?` · `entryPoint?` · `lineNumber?`                         |
| `showcase.manager.search.initiated`        | `searchText`                                                                                         |
| `showcase.manager.search.completed`        | `searchText` · `resultCount` · `showcaseMatchCount` · `textMatchCount` · `durationMs` · `hadResults` |
| `showcase.viewer.launch`                   | `showcasePath` · `title?` · `entryPoint?` (fires only on the deep-link `/showcase/:path` route)      |
| `showcase.viewer.close`                    | `showcasePath` · `dwellMs`                                                                           |
| `showcase.viewer.feedback.submit`          | `showcasePath` · `title?` · `vote` · `previousVote?` · `surface`                                     |
| `showcase.manager.init.failure`            | `errorMessage`                                                                                       |
| `showcase.manager.open.failure`            | `errorMessage` · `showcasePath`                                                                      |
| `showcase.manager.search.failure`          | `errorMessage` · `searchText`                                                                        |

`entryPoint` values:

- **Manager launch** (`SHOWCASE_MANAGER_ENTRY_POINT`): `activity-bar`, `workspace-setup`.
- **Showcase project launch** (`SHOWCASE_LAUNCH_ENTRY_POINT`): `explorer`, `search-showcase-match`, `search-code-match`, `deep-link`. The manager UI populates the first three; the deep-link viewer route populates the last (via `showcase.viewer.launch`, which is the only place `deep-link` appears).
- **Showcase feedback vote** (`SHOWCASE_FEEDBACK_VOTE`): `up`, `down`. `previousVote` is set on `showcase.viewer.feedback.submit` when the user changes an existing vote (retracting a vote does not emit an event).
- **Showcase feedback surface** (`SHOWCASE_FEEDBACK_SURFACE`): `deep-link-viewer` (status-bar widget on the `/showcase/:path` route), `assistant-panel` (footer widget inside the Studio-editor assistant showcases tab). The user's most recent vote per showcase is also cached in `UserDataService` under `studio-editor.showcase.feedback.votes` so the widget can pre-highlight it; there is no backend endpoint today.

Note: `showcase.manager.failure` still exists as a legacy generic bucket but is no longer emitted — it has been split into the three specific `*.failure` events above.

### Virtual assistant

Also non-editor. See [LegendStudioTelemetryHelper.ts](packages/legend-application-studio/src/__lib__/LegendStudioTelemetryHelper.ts) for the exact shapes; events come from the `APPLICATION_EVENT.VIRTUAL_ASSISTANT_*` namespace.

### Generic failures

Studio still funnels several categories of failure through generic buckets. When investigating errors, expect to grep on `errorMessage` in these events rather than a specific event name — splitting them into dedicated events is tracked as a TODO in [LegendStudioEvent.ts](packages/legend-application-studio/src/__lib__/LegendStudioEvent.ts).

| Event                                       | Origin                        |
| ------------------------------------------- | ----------------------------- |
| `application.failure.generic`               | Uncategorized                 |
| `setup.workspace.failure`                   | Workspace bootstrap           |
| `editor.package-tree-build.failure`         | Package tree                  |
| `editor.model-loader.failure`               | Model loader                  |
| `editor.database-builder.failure`           | Database builder              |
| `editor.database-model-builder.failure`     | Database → model builder      |
| `editor.service-editor.test-runner.failure` | Service tests                 |
| `editor.service-editor.test-setup.failure`  | Service test setup            |
| `editor.mapping-editor.test-runner.failure` | Mapping tests                 |
| `editor.external-format.failure`            | External format import/export |
| `engine.manager.failure`                    | Any engine client call        |
| `sdlc.manager.failure`                      | Any SDLC client call          |
| `depot.manager.failure`                     | Any depot client call         |
| `change-detection.failure`                  | Change detection              |

### Change detection

Change detection reports success timings for its internal phases (build hash indexes, compute changes, etc.). These are useful for perf regression tracking rather than product usage. See the `CHANGE_DETECTION_*` constants in [LegendStudioEvent.ts](packages/legend-application-studio/src/__lib__/LegendStudioEvent.ts).

## Worked example: who uses text mode, and how do they leave it?

> "How many workspace-edit sessions enter text mode over the last 30 days? Of those, how many left cleanly vs. discarded their changes?"

**Pick the events.** ENTER anchors the session; LEAVE carries the outcome. Since we care about workspace edits only, scope to `sourceInfo.sourceType = 'legend-source-studio-project-workspace'`.

```sql
SELECT
  data.sourceInfo.projectId AS project_id,
  COUNT(*) FILTER (WHERE event_type = 'editor.text-mode.enter')                                   AS entered,
  COUNT(*) FILTER (WHERE event_type = 'editor.text-mode.leave' AND data.outcome = 'compiled-and-left') AS left_clean,
  COUNT(*) FILTER (WHERE event_type = 'editor.text-mode.leave' AND data.outcome = 'discarded')    AS discarded,
  COUNT(DISTINCT user_id)                                                                         AS users
FROM telemetry_events
WHERE event_type IN ('editor.text-mode.enter', 'editor.text-mode.leave')
  AND data.sourceInfo.sourceType = 'legend-source-studio-project-workspace'
  AND event_time >= NOW() - INTERVAL '30' DAY
GROUP BY 1
ORDER BY entered DESC
```

Interpretation notes:

- `entered - (left_clean + discarded)` = sessions that never emitted a LEAVE (tab-close abandonments). Rising ratio there is the tab-close usage story — you cannot slice it further, that is the price of not using `beforeunload`.
- Break down by `data.trigger` on ENTER to separate _users choosing text mode_ (`manual-toggle`) from _fallbacks_ (`fallback-*`). A spike in fallbacks usually means the form editor is broken for some element kind.
- Join `editor.text-mode.leave.durationMs` and `editCount` / `compilationCount` to characterize the session shape (long-editing-few-compiles vs. short-and-many-compiles).

### Variations

**Fallback rate** — how often is the user pushed into text mode by a form failure?

```sql
SELECT
  data.trigger,
  COUNT(*) AS entered
FROM telemetry_events
WHERE event_type = 'editor.text-mode.enter'
  AND data.sourceInfo.sourceType = 'legend-source-studio-project-workspace'
GROUP BY 1
```

**Strict vs. non-strict adoption** — strict text mode is the new lazy-load variant; watch `data.strict`.

**Save behavior per mode** — join with `sdlc.local-changes-push.success` on `data.mode`:

```sql
SELECT
  data.mode,
  COUNT(*)                                                        AS pushes,
  APPROX_PERCENTILE(data.durationMs, 0.5)                         AS p50_push_ms,
  APPROX_PERCENTILE(data.changeCount, 0.5)                        AS p50_change_count
FROM telemetry_events
WHERE event_type = 'sdlc.local-changes-push.success'
  AND data.sourceInfo.sourceType = 'legend-source-studio-project-workspace'
GROUP BY 1
```

**Empty-push friction** — how often does someone click "push" with nothing to push?

```sql
SELECT
  data.mode,
  COUNT(*) AS empty_pushes,
  COUNT(DISTINCT user_id) AS users
FROM telemetry_events
WHERE event_type = 'sdlc.local-changes-push.empty'
GROUP BY 1
```

## Adding a new event

1. Add the constant to [LegendStudioEvent.ts](packages/legend-application-studio/src/__lib__/LegendStudioEvent.ts). Follow the existing area-prefixed naming (`editor.*`, `sdlc.*`, `showcase.*`, `engine.*`, `depot.*`, `change-detection.*`).
2. Add a `logEvent_*` static to [LegendStudioTelemetryHelper.ts](packages/legend-application-studio/src/__lib__/LegendStudioTelemetryHelper.ts). Accept `sourceInfo?: LegendSourceInfo | undefined` as an explicit parameter and spread it as the first property of the payload; downstream analytics rely on the envelope being nested under a top-level `sourceInfo` key.
3. Call it from the **UI callsite** where possible, so replays and background state mutations do not emit. In stores, guard with `this.editorStore.editorMode.getSourceInfo()` and let the helper's optional signature handle the "no editor mode yet" case.
4. Prefer enums for categorical fields (`trigger`, `outcome`, `errorKind`, `action`, `status`, `mode`, ...). String-typed slots become quickly-diverging free text in dashboards.
5. Keep payloads shape-only — counts, booleans, enums, element paths. Never user-entered values or full grammar contents. `errorMessage` is the exception, and consumers should treat it as best-effort text.
6. Add a unit test in [LegendStudioTelemetry.test.ts](packages/legend-application-studio/src/__lib__/__tests__/LegendStudioTelemetry.test.ts) asserting the emitted event name and payload shape.
7. Add a changeset entry describing the payload.

Telemetry must never break a user action. `logEvent` is designed to swallow errors, but keep callsite code defensive: read from safe accessors, prefer optional chaining, and never throw from within a `logEvent_*` helper.
