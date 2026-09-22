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

| Event                                      | Payload                                                |
| ------------------------------------------ | ------------------------------------------------------ |
| `editor.compilation.compile-graph.launch`  | `sourceInfo?`                                          |
| `editor.form-mode.compilation.success`     | `sourceInfo?` · operation report · `dependenciesCount` |
| `editor.compilation.compile-text.launch`   | `sourceInfo?`                                          |
| `editor.text-mode.compilation.success`     | `sourceInfo?` · operation report · `dependenciesCount` |
| `graph-manager.initialize-graph.success`   | `sourceInfo?` · `GraphInitializationReport`            |
| `editor.test.test-data-generation.launch`  | `sourceInfo?`                                          |
| `editor.test.test-data-generation.success` | `sourceInfo?` · operation report · `dependenciesCount` |

Failures are aggregated under the generic buckets described in [Generic failures](#generic-failures).

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

### LegendAI suggest (service / dataspace / data product)

Three parallel event families — one per element type. Payload is uniform per family: the element path (`servicePath`, `dataSpacePath`, or `dataProductPath`) plus `sourceInfo?` plus `errorMessage` on failures. Together they answer "how often is AI suggest launched, and how often is a suggestion accepted vs. discarded".

| Family                                                                  | Events                    |
| ----------------------------------------------------------------------- | ------------------------- |
| `editor.service-editor.legendai-suggest.{launch,apply,discard,failure}` | Service editor AI suggest |
| `editor.dataspace.legendai-suggest.{launch,apply,discard,failure}`      | DataSpace AI suggest      |
| `editor.data-product.legendai-suggest.{launch,apply,discard,failure}`   | Data product AI suggest   |

Adoption per family = `apply / launch`; abandonment = `discard / launch`; error rate = `failure / launch`.

### Push to dev metadata

"Push to dev metadata" propagates a workspace's artifacts to the metadata service.

| Event                                      | Payload                                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `editor.metadata.push-to-metadata.launch`  | `sourceInfo?` · `groupId` · `artifactId` · `versionId?` · `ingestCount` · `dataProductCount`            |
| `editor.metadata.push-to-metadata.success` | `sourceInfo?` · `groupId` · `artifactId` · `versionId?` · `status` · `ingestCount` · `dataProductCount` |
| `editor.metadata.push-to-metadata.failure` | `sourceInfo?` · `errorMessage`                                                                          |

`ingestCount` and `dataProductCount` count the current project's own lakehouse elements only (`graph.ownIngests` / `graph.ownDataProducts`); elements coming from project dependencies are excluded.

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

| Event                                              | Origin                        |
| -------------------------------------------------- | ----------------------------- |
| `application.failure.generic`                      | Uncategorized                 |
| `setup.workspace.failure`                          | Workspace bootstrap           |
| `editor.package-tree-build.failure`                | Package tree                  |
| `editor.model-loader.failure`                      | Model loader                  |
| `editor.database-builder.failure`                  | Database builder              |
| `editor.database-model-builder.failure`            | Database → model builder      |
| `editor.service-editor.registration.failure`       | Service registration          |
| `editor.service-editor.registration-check.failure` | Service registration precheck |
| `editor.service-editor.test-runner.failure`        | Service tests                 |
| `editor.service-editor.test-setup.failure`         | Service test setup            |
| `editor.mapping-editor.test-runner.failure`        | Mapping tests                 |
| `editor.generation.failure`                        | Model generation              |
| `editor.external-format.failure`                   | External format import/export |
| `engine.manager.failure`                           | Any engine client call        |
| `sdlc.manager.failure`                             | Any SDLC client call          |
| `depot.manager.failure`                            | Any depot client call         |
| `change-detection.failure`                         | Change detection              |

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
