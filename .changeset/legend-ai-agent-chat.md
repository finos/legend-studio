---
'@finos/legend-art': patch
'@finos/legend-lego': minor
'@finos/legend-shared': patch
'@finos/legend-server-sdlc': patch
'@finos/legend-server-depot': patch
'@finos/legend-application-studio': patch
'@finos/legend-extension-dsl-data-space': patch
'@finos/legend-extension-dsl-data-space-studio': patch
'@finos/legend-extension-dsl-data-product': patch
'@finos/legend-application-marketplace': patch
---

Legend AI agent chats, built on shared code:

- `@finos/legend-lego/legend-ai`: chat modes (a plugin implementing `getExtraLegendAIChatModeConfigs()` gets a switch in the chat header and renders the chat body for the data product the chat was opened from); the chat's building blocks as exported components (`LegendAIThinkingSteps`, `LegendAIElapsedTime`, the message views, `LegendAIConversation`, `LegendAIChatComposer`, `LegendAIAttachButton`, `LegendAIProcessPanel`, `LegendAIActionCard` and friends), which `LegendAIChat` now renders with; `LegendAIConversationState`; and an A2A `message/stream` client (`A2AMessageStreamClient`; its stream parsing stays internal). The user message's view is `LegendAIUserMessageView`, the class of the same name unchanged; tables take the chat's theme colours from where they are shown, and follow a theme switch. The data space and data product viewers pass their plugins' modes.
- `@finos/legend-art`: `MARKDOWN_DEFAULT_COMPONENTS`, what `MarkdownTextViewer` renders with unless given its own `components` (which replace them): a caller adding one keeps mermaid diagrams by spreading it in.
- `@finos/legend-shared`: `downloadBlob`, which `downloadFileUsingDataURI` now uses; the object URL is released after the download.
- `@finos/legend-server-sdlc`: review-workflow helpers on `SDLCServerClientHelper`: `isAuthorized`, `getSignInUrl`, `assertCanCreateReview`, `findWorkspace`, `getOrCreateGroupWorkspace`, `commitEntityChanges` (`WorkspaceOutdatedError` on conflict), `findOpenReview`, `findOrCreateReview` and `pushToReview`, which works the changes out from the entities of the revision it then pins the commit to, and keeps a workspace it created once the commit is made.
- `@finos/legend-server-depot`: `buildProjectDependencyCoordinates`, `collectIndexedDependencyEntities`, `analyzeDependencyConflicts`, `resolveSDLCProjectId` and `getWorkspaceIdFromSnapshotVersion`, so apps other than Studio build a dependency graph the way Studio does; Studio's `EditorGraphState` uses them.
- `@finos/legend-extension-dsl-data-space`: `previewDataSpace`, the DataSpace viewer over a model's built graph, which Studio's editor preview (`@finos/legend-extension-dsl-data-space-studio`) now uses; `previewDataSpaceFromEntities`, which builds the graph from entities first, to preview a DataSpace that exists only as entities; and `findDataSpaceEntity`, which takes the DataSpace asked for or the only one, never another in its place.
- `@finos/legend-application-marketplace`: `getStudioInstanceUrl` on its config, and exported links to a Studio workspace and review.
