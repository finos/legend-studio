# Theming

This doc tracks the theming architecture and any decisions/visual shifts made
during the dark-only → multi-theme migration of `legend-application-studio`.

## Architecture

Two-tier CSS variable system in `legend-art`:

```
Palette tokens (physical)   →   Semantic tokens (role-based)   →   Components
--color-dark-grey-50            --color-bg-app                     .editor { background: var(--color-bg-app); }
```

- **Palette tokens** — `packages/legend-art/style/base/_variables.scss`. Raw colors. Components must not reference these directly.
- **Semantic tokens** — `packages/legend-art/style/base/themes/_semantic-tokens.scss`. The vocabulary components use. `:root` defaults to the dark mapping for backward compatibility.
- **Theme mappings** — `_theme-default-dark.scss`, `_theme-default-light.scss`. Each maps every semantic token to a palette value, scoped to a class on `<body>` (e.g. `.theme__default-dark`).

To add a new theme:

1. Create `_theme-<name>.scss` mapping every semantic token.
2. Register it in `packages/legend-application/src/__lib__/LegendApplicationColorTheme.ts`.
3. Plumb the className through.
4. Add the key to the host app's supported-themes allow-list (e.g. `STUDIO_SUPPORTED_COLOR_THEMES` in `ActivityBar.tsx`).

No component file changes required.

## Where theme switching lives

Studio surfaces theme switching as a **one-click moon/sun toggle** in the activity bar and again on the workspace setup page (`ColorThemeToggle` in `packages/legend-application-studio/src/components/editor/ActivityBar.tsx`). Clicking flips between `DEFAULT_DARK` and `DEFAULT_LIGHT` and persists via `layoutService.setColorTheme(..., { persist: true })`. The icon shows the _destination_ theme (sun while in dark, moon while in light) and is wrapped in `observer`, so the active theme is reactive.

The toggle only renders when both endpoints of the flip are actually exposed — it reuses the same `STUDIO_SUPPORTED_COLOR_THEMES` allow-list and `STUDIO_NON_PRODUCTION_COLOR_THEMES` / `NonProductionFeatureFlag` gating documented below. The Color Theme list that previously lived in the Settings (cog) menu has been removed; the toggle is now the sole theme-switching entry point.

**Non-production gating.** Themes that are still being stabilized are additionally listed in `STUDIO_NON_PRODUCTION_COLOR_THEMES` and are hidden from the toggle unless the `NonProductionFeatureFlag` config option is enabled. The light theme (`DEFAULT_LIGHT`) is currently gated this way, so the moon/sun toggle only appears in dev/QA environments (where the flag is on) and stays hidden in production. To promote a theme to production, remove its key from `STUDIO_NON_PRODUCTION_COLOR_THEMES`. Note: gating only controls _visibility_ of the toggle — a theme that a user already persisted (via the settings key `application.layout.colorTheme`) still loads on next visit, but persisted settings are per-origin so dev selections don't leak into a separate production origin.

## Semantic token vocabulary

See `_semantic-tokens.scss` for the authoritative list with inline docs. Categories:

- **Surfaces** — `bg-app`, `bg-panel`, `bg-panel-header`, `bg-chrome`, `bg-elevated`, `bg-input`, `bg-hover`, `bg-selected`, `bg-tag`, `bg-overlay`
- **Text** — `text-primary`, `text-secondary`, `text-muted`, `text-disabled`, `text-inverted`, `text-on-accent`, `text-link`
- **Borders** — `border-subtle`, `border-default`, `border-strong`, `border-focus`
- **Accents** — `accent`, `accent-hover`, `accent-subtle`
- **Status** — `status-error[-bg]`, `status-warn[-bg]`, `status-success[-bg]`, `status-info`
- **Interaction on accent surfaces** — `state-hover-on-accent`, `state-disabled-on-accent`
- **Active indicator** — `active-indicator` (tab underlines, focused rails — distinct from `accent`)
- **Category / brand** — `category-generation`, `category-experimental`, `category-class`, `category-enumeration`, `category-primitive` (all theme-agnostic; encode meaning, not style)
- **Misc** — `shadow`

## Legacy escape hatches

### Brand / category colors

Some colors encode _meaning_ rather than style — for example, native vs generated Legend elements use a fixed blue and pink in both light and dark themes so users learn the visual code regardless of which theme they prefer. These are exposed as their own semantic tokens (e.g. `--color-category-generation`) that resolve to the same palette value in every theme. New brand colors should follow this pattern: token in `_semantic-tokens.scss`, identical mapping in every `_theme-*.scss`. Never use physical palette tokens directly in components.

### Local-theme retirement

Three editors had local theme-forcing mechanisms that pre-dated the framework's theme system. All have now been retired:

**Database editor** — used to ship its own sun/moon toggle button + `DATABASE_EDITOR_THEME` localStorage key + `.database-editor--light` SCSS modifier. Removed the toggle, the user-data helpers, the modifier block, and migrated the body to semantic tokens.

**Mapping editor** — used to wrap its root in `mapping__theme__dark` (unconditionally) with a corresponding SCSS override block. Removed the className and the SCSS block; base styles now adapt via semantic tokens.

**UML editor + tagged-value-editor + stereotype-selector** — base styles were light-first with `.X--dark` modifier blocks that `FunctionEditor` triggered to force a dark embedded UML view. Removed the `--dark` modifier classes from React + SCSS; both the dedicated UMLEditor and the embedded FunctionEditor view now follow the active theme.

In all three cases the pattern was: tokenize the body, delete the wrapper. The `darkTheme` prop on `TaggedValueEditor` / `StereotypeSelector` is still passed by FunctionEditor because it also drives Monaco editor's dark mode and `btn--dark` / `input--dark` legacy classes — those will be retired in Phase 3 alongside other Monaco/canvas integration.

### Database editor specifics

Detailed change list for the database editor retirement:

- `DatabaseEditor.tsx`: removed the toggle button, the `database-editor--light` className conditional, and `SunIcon`/`MoonIcon` imports.
- `DatabaseEditorState.ts`: removed `theme` observable, `toggleTheme` action, persistence hydration, and reprocess copy.
- `LegendStudioUserDataHelper.ts`: removed `DATABASE_EDITOR_THEME` key and its get/set helpers.
- `_database-editor.scss`: removed the `.database-editor--light` override block and the `.database-editor__theme-toggle` styles; body now uses semantic tokens directly so it follows the global theme.

### Testable category palette (pending tokenization)

Service-editor, function-editor, and testable-editor use a recurring 4-color palette to label test-related entity types:

- `pink-200` — parameters / params
- `pink-500` — test suites
- `purple-200` / `purple-400` — tests
- `yellow-500` — assertions

These currently appear as **direct palette tokens inside documented "category labels" blocks** at the top of each file. They are theme-agnostic by design (the same colors should appear in both light and dark theme — they're a memorized brand palette like generation-pink). They are not yet promoted to semantic tokens because the same palette appears in `legend-query-builder` and several extensions; tokenization should happen in one sweep once we migrate those packages. See `_service-editor.scss` header for the longer note.

### `.panel__*--dark` / `.panel__*--light` modifiers

Defined in `packages/legend-art/style/base/_panel.scss`. Inside these modifier blocks we intentionally use **physical palette tokens** to force a specific look regardless of the active theme. This is the one documented exception to the "components only use semantic tokens" rule.

The modifiers pre-date real theming. Newly written code should not use them — let the active theme drive colors. A future PR can sweep consumers off them and remove the modifier blocks.

## Color shifts introduced during migration

Tracked for design review. Each entry: what was, what is, why, where to revert if wrong.

### 1. `--color-text-disabled` (dark theme) — refined

- **Before:** `dark-grey-500` (#9a9a9a)
- **After:** `dark-grey-400` (#737373)
- **Why:** original mapping was too bright; disabled controls should recede into the bg, not stand out
- **Affected:** all components using `--color-text-disabled` after migration
- **Revert:** change `_theme-default-dark.scss`

### 2. Activity bar review-changes indicator dot

- **Before:** `yellow-300` (#e2a700, mustard)
- **After:** `--color-status-warn` → `yellow-200` (#fbbc05, goldenrod) in dark
- **Why:** semantic warn rather than physical token; barely perceptible visual diff
- **Affected:** `_activity-bar.scss` review-changes indicator
- **Revert:** change `_theme-default-dark.scss` or restore physical token in `_activity-bar.scss`

### 3. Status bar problems-hover background

- **Before:** `blue-50` (#1c89d2, fixed lighter blue)
- **After:** `--color-state-hover-on-accent` → `light-shade-50` (translucent white overlay) in dark
- **Why:** unified hover technique across the status bar; works in light theme too
- **Affected:** `_status-bar.scss` `__problems:hover`
- **Revert:** restore fixed blue value or add a dedicated `--color-accent-strong`

### 4. Side bar viewer-mode badge text

- **Before:** `dark-grey-280` (#404040)
- **After:** `--color-text-inverted` → `dark-grey-50` (#1e1e1e) in dark
- **Why:** semantic for "dark text on luminous fill"; slightly darker, reads better on yellow
- **Affected:** `_side-bar.scss` viewer-mode badge
- **Revert:** restore physical token

### 5. Explorer "needs config" icon — **most visible shift**

- **Before:** `orange-100` (#e97f49)
- **After:** `--color-status-warn` → `yellow-200` in dark
- **Why:** avoided adding `--color-status-attention` for a single-use case
- **Affected:** `_explorer.scss` `__config__icon`
- **Revert if:** orange "attention/setup-needed" semantic ends up appearing in ≥3 places — at that point add `--color-status-attention` (orange) as a 4th severity tier and re-map this one

### 6. Panel active-tab underline — **resolved with new token**

- **Before:** `yellow-200` hard-coded (intentionally meant to pop against dark surfaces)
- **After:** `--color-active-indicator` → `yellow-200` in dark, `blue-200` in light
- **Why:** preserved the "pops on dark" intent in dark theme; yellow doesn't pop on light, so swap to vivid blue there
- **Affected:** `_panel.scss` active-tab underline; any future "active indicator" use

### 7. Panel `list-selector` error item backgrounds

- **Before:** `red-500` (#5a1d1d, opaque dark red) for error; `red-400` (#800404) for selected+error
- **After:** `--color-status-error-bg` (translucent red overlay) and `--color-status-error` (vivid red)
- **Why:** semantic, theme-aware; less loud than the original
- **Affected:** `_panel.scss` `panel__list-selector` error variants
- **Revert if:** the loud original red was intentional severity signaling

### 8. Panel content title text

- **Before:** `light-grey-100` (#efefef)
- **After:** `--color-text-primary` → `light-grey-0` (#fafafa) in dark
- **Why:** title text should be most prominent; semantic-correct
- **Affected:** `_panel.scss` title content
- **Trivial shift, unlikely to need revert**

### 9. Editor-group text-mode CTA button

- **Before:** `light-blue-50` (#6391d0, steel blue)
- **After:** `--color-accent` → `blue-200` (#08629e, navy) in dark
- **Why:** primary CTA color; `light-blue-50` is too sparse (2 uses) to merit its own token
- **Affected:** `_editor-group.scss` `text-mode-btn`
- **Revert if:** the steel-blue treatment was intentional — at that point introduce `--color-accent-soft`

### 10. Editor-group view-mode "native" group

- **Before:** `blue-100` (#007acc, hard fixed)
- **After:** `--color-status-info` → `blue-100` in dark
- **Why:** "native" elements are an informational category; semantic fits
- **Affected:** `_editor-group.scss` `__option__group--native`
- **No visual shift in dark theme**

## Migration tracker

Files completed in Phase 2:

- [x] `packages/legend-application-studio/style/components/editor/_activity-bar.scss`
- [x] `packages/legend-application-studio/style/components/editor/_status-bar.scss`
- [x] `packages/legend-application-studio/style/components/editor/_side-bar.scss`
- [x] `packages/legend-application-studio/style/components/editor/side-bar/_explorer.scss`
- [x] `packages/legend-art/style/base/_panel.scss`
- [x] `packages/legend-application-studio/style/components/_editor.scss` (editor shell)
- [x] `packages/legend-application-studio/style/components/editor/_editor-group.scss` (central tab strip)
- [x] `packages/legend-application-studio/style/components/editor/side-bar/_local-changes.scss`
- [x] `packages/legend-application-studio/style/components/editor/side-bar/_workspace-updater.scss`
- [x] `packages/legend-application-studio/style/components/editor/side-bar/_workspace-review.scss`
- [x] `packages/legend-application-studio/style/components/editor/side-bar/_diff-panel.scss`
- [x] `packages/legend-application-studio/style/components/editor/side-bar/_global_test_runner.scss`
- [x] `packages/legend-application-studio/style/components/editor/side-bar/_workflow-manager.scss`
- [x] `packages/legend-application-studio/style/components/editor/side-bar/_bulk-service-registration.scss`
- [x] `packages/legend-application-studio/style/components/editor/side-bar/_end-to-end-workflow.scss`
- [x] `packages/legend-application-studio/style/components/editor/side-bar/_project-overview.scss`
- [x] `packages/legend-application-studio/style/components/editor/side-bar/_dev-metadata-panel.scss`
- [x] `packages/legend-application-studio/style/components/editor/command/project-search.scss`
- [x] `packages/legend-application-studio/style/components/editor/_panel-group.scss`
- [x] `packages/legend-application-studio/style/components/editor/_connection-editor.scss`
- [x] `packages/legend-application-studio/style/components/editor/_runtime-editor.scss`
- [x] `packages/legend-application-studio/style/components/editor/_function-editor.scss`
- [x] `packages/legend-application-studio/style/components/editor/_service-editor.scss`
- [x] `packages/legend-application-studio/style/components/editor/_function-activator-editor.scss`
- [x] `packages/legend-application-studio/style/components/editor/_hosted-service-function-activator-editor.scss`
- [x] `packages/legend-application-studio/style/components/editor/_mem-sql-function-activator-editor.scss`
- [x] `packages/legend-application-studio/style/components/editor/_snowflake-app-function-activator-editor.scss`
- [x] `packages/legend-application-studio/style/components/editor/_snowflake-m2m-udf-function-activator-editor.scss`
- [x] `packages/legend-application-studio/style/components/_dev-tool-panel.scss`
- [x] `packages/legend-application-studio/style/components/_not-found-screen.scss`
- [x] `packages/legend-application-studio/style/components/_review.scss`
- [x] `packages/legend-application-studio/style/components/_showcase-manager.scss`
- [x] `packages/legend-application-studio/style/components/_workspace-setup.scss`
- [x] `packages/legend-application-studio/style/components/workspace-setup/_workspace-selector.scss`
- [x] `packages/legend-application-studio/style/components/workspace-setup/_project-selector.scss`
- [x] `packages/legend-application-studio/style/components/workspace-setup/_create-project-modal.scss`
- [x] `packages/legend-application-studio/style/components/editor/_testable-editor.scss`
- [x] `packages/legend-application-studio/style/components/editor/_data-product-editor.scss`
- [x] `packages/legend-application-studio/style/components/editor/_external-format-editor.scss`
- [x] `packages/legend-application-studio/style/components/editor/_project-configuration-editor.scss`
- [x] `packages/legend-application-studio/style/components/editor/_data-editor.scss`
- [x] `packages/legend-application-studio/style/components/editor/_database-editor.scss` (also removed local sun/moon theme toggle + `DATABASE_EDITOR_THEME` user-data key — see "Local-theme retirement" below)
- [x] `packages/legend-application-studio/style/components/editor/_mapping-editor.scss` (also removed `.mapping__theme__dark` SCSS block + the always-on wrapper className in `MappingEditor.tsx`)
- [x] `packages/legend-application-studio/style/components/editor/mapping-editor/_mapping-explorer.scss`
- [x] `packages/legend-application-studio/style/components/editor/mapping-editor/_mapping-test-explorer.scss`
- [x] `packages/legend-application-studio/style/components/editor/mapping-editor/_mapping-test-editor.scss`
- [x] `packages/legend-application-studio/style/components/editor/mapping-editor/_mapping-element-editor.scss`
- [x] `packages/legend-application-studio/style/components/editor/mapping-editor/_property-mapping-editor.scss`
- [x] `packages/legend-application-studio/style/components/editor/mapping-editor/_enumeration-mapping-editor.scss`
- [x] `packages/legend-application-studio/style/components/editor/mapping-editor/_operation-mapping-editor.scss`
- [x] `packages/legend-application-studio/style/components/editor/mapping-editor/_source-panel.scss`
- [x] `packages/legend-application-studio/style/components/editor/mapping-editor/_type-tree.scss`
- [x] `packages/legend-application-studio/style/components/editor/mapping-editor/_class-mapping-editor.scss`
- [x] `packages/legend-application-studio/style/components/editor/mapping-editor/_relation-source-tree.scss`
- [x] `packages/legend-application-studio/style/components/editor/_query-builder-dialog.scss`
- [x] `packages/legend-application-studio/style/components/editor/_file-generation-viewer.scss`
- [x] `packages/legend-application-studio/style/components/editor/_unsupported-element-editor.scss`
- [x] `packages/legend-application-studio/style/components/editor/_sample-data-generator.scss`
- [x] `packages/legend-application-studio/style/components/editor/_entity-diff-view.scss`
- [x] `packages/legend-application-studio/style/components/editor/_lakehouse_runtime-editor.scss`
- [x] `packages/legend-application-studio/style/components/editor/ingest-definition-editor.scss`
- [x] `packages/legend-application-studio/style/components/editor/panel-group/_sql-playground.scss`
- [x] `packages/legend-application-studio/style/components/editor/_model-loader.scss`
- [x] `packages/legend-application-studio/style/components/editor/_workspace-sync-conflict-resolver.scss`
- [x] `packages/legend-application-studio/style/components/editor/_generation-spec-editor.scss`
- [x] `packages/legend-application-studio/style/components/editor/_file-generation-editor.scss`
- [x] `packages/legend-application-studio/style/components/editor/_entity-change-conflict-editor.scss`
- [x] `packages/legend-application-studio/style/components/editor/_database-builder.scss`

**Phase 2 SCSS migration complete.** All `--color-dark-grey-*` and `--color-light-grey-*` references in `legend-application-studio/style/` have been replaced with semantic tokens. Remaining `--color-{red,green,blue,yellow,orange,pink,purple,magenta,lime,mauve}-*` references are documented brand/category/status colors held stable across themes.

## Phase 3 — special cases

### Monaco code-editor theme sync

Monaco's syntax-highlighting theme is process-global (`monaco.editor.setTheme(...)` affects every instance), so a single setup point is enough to make every code editor in the app follow the active app theme.

- **`legend-code-editor`** exposes a `getCodeEditorThemeForAppTheme(isLight: boolean): CODE_EDITOR_THEME` helper — the single source of truth for "which Monaco theme matches the app's current color theme". Currently maps to `GITHUB_LIGHT` / `DEFAULT_DARK`. Future themes (high-contrast, etc.) only need to update this one mapping.
- **`legend-lego`'s `configureCodeEditorComponent`** subscribes to the layout service's `TEMPORARY__isLightColorThemeEnabled` via a long-lived `autorun` and calls `monaco.editor.setTheme(...)` on every change. This runs once during app boot (setting the initial theme correctly) and then re-runs whenever the user picks a new color theme.
- **Studio editors that create Monaco instances** (`GrammarTextEditor`, `EntityChangeConflictEditor`) now pick the right theme at creation time via `getCodeEditorThemeForAppTheme`, so there's no flash of dark on light pages before the global sync kicks in.

The same mechanism also reaches query-builder, data-cube, data-product, pure-ide etc., since they all share the same `configureCodeEditorComponent`. Per-editor reactive `useEffect`s that call `editor.updateOptions({theme: ...})` (e.g. in `LambdaEditor`) are now redundant — kept for now to avoid touching unrelated code, but they can be deleted in a follow-up.

### Diagram canvas (ReactFlow)

`DatabaseDiagramCanvas` now passes `colorMode={isLight ? 'light' : 'dark'}` to `<ReactFlow>`. ReactFlow swaps its built-in `--xy-*` variables (canvas bg, controls, minimap, edges, dot pattern) automatically — no need to override individual variables in our theme files. The class-level overrides in `_database-editor.scss` (which use semantic tokens) layer on top to color the table-node cards and edges using studio's vocabulary.

We grepped studio for `getComputedStyle` usage to look for JS code reading theme tokens directly — the only hit is in `CustomSelectorInput.tsx` for font sizing. No canvas code reads colors via JS; the original "Phase 3 — diagram canvas" scope turned out to be smaller than the planning doc suggested.

### Legacy `--dark` modifier classes (`btn--dark`, `input--dark`, `selector-input--dark`)

These were "forced dark" SCSS modifiers triggered by a `darkMode` prop on many React components (~60 files, 170+ usages). Each modifier had its own body of physical dark-color overrides paralleling a light-default base.

The modifier blocks have been migrated to use semantic tokens, so they now produce theme-aware styling that **matches the base in every theme**. The modifier classes are preserved as backward-compat aliases so consumers passing `darkMode={true}` keep working — but they no longer do anything different from the base class.

Files migrated:

- `packages/legend-art/style/base/_input.scss`
- `packages/legend-art/style/base/_button.scss`
- `packages/legend-art/style/components/_selector-input.scss`
- `packages/legend-art/style/base/_menu.scss` — dropdown/context menus (used by activity-bar cog, right-click menus, MUI menus, etc.)
- `packages/legend-art/style/base/_modal.scss` — modal header/footer + `.modal--dark` modifier
- `packages/legend-art/style/base/_table.scss` — generic tables
- `packages/legend-art/style/base/_divider.scss` — divider-with-text component
- `packages/legend-art/style/base/_common.scss` — DnD drag handles, drop placeholders, drag preview
- `packages/legend-art/style/components/_input.scss` — input validation indicators + error variant
- `packages/legend-art/style/components/_badge.scss` — neutral badges
- `packages/legend-art/style/components/_icon-selector.scss` — icon picker
- `packages/legend-art/style/components/_icon.scss` — generic icon styles
- `packages/legend-art/style/components/_markdown-viewer.scss` — markdown rendering surface
- `packages/legend-art/style/components/_blank-panel-placeholder.scss` — "empty panel" placeholder UI
- `packages/legend-art/style/reset/_react-reflex.scss` — resizable-panel splitter colors (including a regression fix restoring `.reflex-container.vertical > .reflex-splitter` width/min-width/margin/cursor, which was accidentally dropped and made Studio side/showcase splitter affordances hard to see/use in light theme)
- `packages/legend-art/style/reset/muiOverrides.scss` — MUI tooltips/menus/popovers/dialogs/cards/steppers/radios

After the legend-art sweep, the only remaining `var(--color-(dark|light)-grey-*)` references in `legend-art/style/` are:

- `base/_variables.scss` — palette definitions (legitimate)
- `base/themes/_*.scss` — theme mappings (legitimate, theme registry)
- `base/_panel.scss` — only inside the documented `.panel__*--dark` / `.panel__*--light` legacy escape-hatch blocks

Follow-up cleanup (separate PR): drop the `darkMode` prop from React components, remove the `*--dark` className conditionals, and finally delete the now-redundant modifier blocks. ~60 files touched, but mechanical — each call site loses one prop.

### Still pending in Phase 3

- The `darkMode` prop sweep itself (the React-side cleanup described above) — not started; SCSS side is now ready for it.
- [x] `packages/legend-application-studio/style/components/editor/_uml-editor.scss`
- [x] `packages/legend-application-studio/style/components/editor/uml-editor/_uml-element-editor.scss`
- [x] `packages/legend-application-studio/style/components/editor/uml-editor/_class-editor.scss`F
- [x] `packages/legend-application-studio/style/components/editor/uml-editor/_tagged-value-editor.scss`
- [x] `packages/legend-application-studio/style/components/editor/uml-editor/_stereotype-selector.scss`
- [x] `packages/legend-application-studio/style/components/editor/uml-editor/_profile-editor.scss` (already legacy-semantic-only — no migration needed)
- [x] `packages/legend-application-studio/style/components/editor/uml-editor/_enum-editor.scss` (already legacy-semantic-only — no migration needed)

Still dark-only (see `Migration tracker` to mark off).

## Phase 4 — Query Builder & override-file retirement

### Status

- **`legend-query-builder` — tokenized (Option A, Phases 1–2 done; pending visual QA).** All UI-chrome palette refs across the 18 SCSS files are now semantic tokens (645 semantic refs, up from ~0). The ~208 palette refs that remain are intentional escape hatches: ag-grid `--ag-*` blocks, `--dark`/`--light` modifier blocks, stripe gradients, stable categorical/brand colors (viz node schemes, SQL syntax colors, type badges, query/test labels, the green action button), inverse-trap dark-text-on-colored-chips, and translucent `shade-*` overlays. Three latent undefined-variable bugs were fixed in passing (`--color-dark-grey-0`, `--color-dark-grey-180`, `--color-light-grey-500`). **Still pending:** light-theme visual QA in Studio (Phase 3) and retirement of `light-mode.scss` (see coupling note below).
- **Extensions — migrated (done):** `dsl-data-product`, `dsl-data-quality`, `dsl-data-space`, `dsl-data-space-studio`, `dsl-diagram`, `dsl-service`, `dsl-text`, `store-service-store`, `application-studio-depot-dashboard`.
- **`legend-application-query/style/light-mode.scss`** — the legacy 2,036-line `theme__legacy-light` override file. Repaints ~227 Query-Builder selectors for the Query app only. To be **retired** once QB is tokenized.

### Recent applied fixes (June 2026)

- **Query Builder tokenization (Option A, Phases 1–2):** swept all 18 `legend-query-builder` SCSS files from physical palette refs to semantic tokens (~645 semantic refs). Phase 1 was the mechanical grey→`bg-*`/`text-*`/`border-*` pass; Phase 2 was the judgment pass — type badges → `category-*`, error states → `status-*`, tab underlines → `active-indicator`, focus rings → `border-focus`, muted text → `text-muted`/`text-secondary`, disabled controls → `text-disabled`. Stable categorical colors (viz node schemes, SQL syntax colors, query/test labels, the green action button), inverse-trap dark-text-on-colored-chips, ag-grid blocks, and translucent overlays were deliberately left as palette. Fixed 3 latent undefined-variable references (`--color-dark-grey-0/-180`, `--color-light-grey-500`). Dark-theme appearance shifts in a few intentional ways (muted greys conform to the brighter semantic `text-muted`; error fields adopt the canonical subtle-bg + red-border treatment). Pending: Studio light-theme visual QA and `light-mode.scss` retirement.
- **Studio splitter affordance regression (light theme):** restored missing vertical splitter base style in `packages/legend-art/style/reset/_react-reflex.scss` (`.reflex-container.vertical > .reflex-splitter` sizing/hit-area rule) after a regression introduced during light-theme work.
- **Function Editor lambda dark-island fix:** tokenized the shared lambda editor surface/error/popup styles in `packages/legend-query-builder/style/shared/_lambda-editor.scss`; `lambda-editor--dark` is now a compatibility alias that follows the active app theme instead of forcing dark palette colors.
- **Prominent theme toggle:** added `ColorThemeToggle` (moon/sun icon button) to the Studio activity bar and the workspace setup page so users can flip themes in one click. Removed the redundant Color Theme list from the Settings (cog) menu — the toggle is now the sole entry point. Same gating as before: only renders when both `DEFAULT_DARK` and `DEFAULT_LIGHT` are exposed (i.e. respects `NonProductionFeatureFlag`).
- **Activity-bar layout — flex column:** `_activity-bar.scss` now uses `display: flex; flex-direction: column;` with `flex: 1 1 auto; min-height: 0` on `.activity-bar__items` and `flex-shrink: 0` on `__menu` / `__item`. Replaces the brittle `calc(100% - 13.4rem)` reservation that had to be retuned every time a bottom button was added (and which hid the Settings cog the moment the theme toggle was inserted). Any number of bottom buttons now stays anchored visible without further CSS changes.
- **Legend Query selector dropdown locked-dark fixes:** several base selector-input rules in `packages/legend-art/style/components/_selector-input.scss` (dropdown indicator, option hover, option selected) and the base `.packageable-element-option-label__tag` rule in `packages/legend-lego/style/graph-editor/_packageable-element-option-label.scss` were migrated to semantic tokens (`--color-bg-input`, `--color-text-secondary`, `--color-accent-subtle`, `--color-bg-selected`, `--color-bg-tag`, `--color-text-muted`, `--color-border-default`) during Phase 3. Legend Query's legacy `theme__legacy-light` override file (`packages/legend-application-query/style/light-mode.scss`) does not remap the semantic-token layer — it only repaints specific selectors — so semantic tokens fall through to their `:root` (dark) defaults. This left QB's base-mode selectors (which QB opts into via `darkMode={!TEMPORARY__isLightColorThemeEnabled}`) with a dark dropdown indicator, dark option hover/selected states, and a dark entity full-path tag. Added local overrides under `.theme__legacy-light` restoring the previous physical palette colors. This is a stop-gap; the clean fix is Option A in Phase 4 (tokenize QB and retire `light-mode.scss`). Expect more bugs of this exact shape until then — anywhere the base SCSS gets tokenized, the legacy override has to be patched in parallel.
- **Class Editor locked-dark selectors + multiplicity bound:** `ClassEditor.tsx` was rendering `CustomSelectorInput` instances (supertype picker, profile / tagged-value / actual-tagged-value, stereotype, and the property detail panel's property-aggregation, property-tagged-values, property-stereotype) without a `darkMode` prop, so they used the base (light-default) selector styling and rendered as white dropdowns inside the (still-dark-in-prod) class editor. Each call site now passes `darkMode={!applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled}`, matching the pattern used in `ProjectSearchCommand.tsx`. Separately, `&__multiplicity-bound` in `_class-editor.scss` was hard-coded to a light fill that made the lower/upper bound digits unreadable in dark; both the enabled and `[disabled]` states (and the `*` upper-bound display) now use `--color-bg-input` / `--color-bg-panel` + `--color-text-primary`, with `-webkit-text-fill-color` + `opacity: 1` on the disabled state to defeat the browser's default text fade.
- **Depot Dashboard grid + selector locked-dark fix:** `packages/legend-extension-application-studio-depot-dashboard/src/components/DepotDashboard.tsx` no longer hardcodes `ag-theme-balham-dark` / `darkMode={true}`. Both the AG-Grid wrapper and the element-type `CustomSelectorInput` now derive `darkMode` from `applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled` and apply `ag-theme-balham` / `ag-theme-balham-dark` conditionally, matching the convention used in `DatabaseBuilderWizard`, `QueryBuilderTDSGridResult`, `SQLPlaygroundGrid`, etc. The component is already an `observer`, so theme flips repaint live.

### Why QB is dark in Studio's light theme — two mechanisms that don't meet

|                 | Studio (token system)                               | Query app (legacy override)                                          |
| --------------- | --------------------------------------------------- | -------------------------------------------------------------------- |
| Component SCSS  | semantic tokens (`var(--color-bg-panel)`)           | hardcoded dark palette (`var(--color-dark-grey-50)`)                 |
| Light theme     | body class `theme__default-light` **remaps tokens** | `light-mode.scss` **repaints** selectors under `theme__legacy-light` |
| Source of truth | one (the token)                                     | two (dark value + light override)                                    |

QB uses the legacy mechanism, but the override file (a) lives in `legend-application-query`, which Studio doesn't load, and (b) is scoped to a _different_ theme key (`theme__legacy-light`, not `theme__default-light`). So it can't help Studio even in principle.

### Recommended fix — Option A: tokenize QB (same playbook as Phases 2–3)

Convert all palette refs to semantic tokens; then QB themes automatically under any theme, in both apps, and `light-mode.scss` can be deleted.

The bulk swap is fast (context-aware script). The real effort is the **review passes**, heavier here than anywhere else in the repo because QB is badge/chip-dense:

1. **Bulk tokenize** via the context-aware palette→semantic script (`background:`→`bg-*`, `color:`→`text-*`, `border:`→`border-*`).
2. **Brand/category color audit** — QB is full of type badges (PK/FK, class, enumeration, derived-property, milestoning, filter/post-filter operator chips, column badges). These must stay **theme-stable** (`--color-category-*` or kept as palette), _not_ be swapped to neutral tokens. Biggest manual chunk.
3. **`text-on-accent` trap audit** — saturated badges pair light text with colored fills; `--color-text-on-accent` is correct _only_ on saturated fills, wrong on neutral surfaces (causes white-on-light-grey in light theme). Check every badge.
4. **ag-grid blocks** (in `_query-builder.scss`, `_sql-playground.scss`, `data-access-overview.scss`) — leave as palette, like every other grid.
5. **Build + visual QA in light theme**: explorer tree, filter/post-filter trees, projection grid, value-spec editors, lambda editor, exec-plan viewer, lineage viewer, SQL playground.

**Coupling:** tokenize QB **and** retire `light-mode.scss` in the same change, so there's no window where the override double-paints the now-token-aware components.

> Option B (fast, not recommended): re-scope `theme__legacy-light` → `theme__default-light` and load it in Studio. ~½ day, but perpetuates the two-source-of-truth burden and gives QB a _different_ light look than the rest of Studio. Only if QB light is needed before Option A can be scheduled.

### Tracker (file checklist — tokenizable palette refs)

All 18 files tokenized (Phases 1–2). Remaining palette refs in each are intentional escape hatches (ag-grid, `--dark`/`--light` blocks, stripe gradients, stable brand/category/syntax colors, inverse-trap dark-on-color chips, translucent overlays).

- [x] `_query-builder.scss`
- [x] `_query-builder-projection.scss`
- [x] `shared/_value-spec-editor.scss`
- [x] `_lineage-viewer.scss` (viz node-color scheme intentionally kept as stable palette)
- [x] `_query-builder-filter.scss` (type badges → `category-*`; tree connectors → `border-strong`)
- [x] `_query-builder-olap.scss`
- [x] `_execution-plan-viewer.scss` (option-group node colors kept stable)
- [x] `_query-builder-explorer.scss`
- [x] `shared/_query-loader.scss`
- [x] `shared/_lambda-editor.scss` (master's targeted pass; `dark-grey-0` highlight-text bug fixed → `dark-grey-50`)
- [x] `_query-builder-post-filter.scss`
- [x] `_query-builder-graph-fetch-tree.scss`
- [x] `_query-builder-property-search-panel.scss`
- [x] `_sql-playground.scss` (SQL syntax-highlight colors kept stable; ag-grid block kept)
- [x] `data-access-overview.scss` (ag-grid block + stripe gradient kept)
- [x] `_query-builder-functions-explorer.scss`
- [x] `_query-builder-setup.scss`
- [x] `_query-builder-service-plugin.scss`
- [ ] Retire `legend-application-query/style/light-mode.scss` (2,036 lines) — **still required** (see coupling note).

> **Coupling caveat (legend-application-query legacy-light).** Now that QB base rules reference semantic tokens, any selector **not** repainted by `light-mode.scss` will resolve to the `:root` (dark) token default under `theme__legacy-light` in the Query app — the exact "dark-island in light" shape documented above, but inverted. Until `light-mode.scss` remaps the semantic-token layer (or is retired), expect to patch it in parallel for QB selectors surfaced during Query-app light QA. Studio's `theme__default-light` is unaffected (it maps every token).

### Downstream consumers

Repos that extend Studio extensions need to do the same palette→semantic migration in their own SCSS. The portable contract + recipe for them lives in **`packages/legend-art/THEMING.md`** (ships with the published `@finos/legend-art` module). Keep that guide in sync if the token vocabulary changes.

## Verifying changes

1. `cd packages/legend-application-studio && npx tsc --noEmit -p tsconfig.json` — ts compiles
2. `npx sass packages/legend-application-studio/style/index.scss /tmp/out.css --load-path=...` — SCSS compiles
3. Run studio, click the moon/sun toggle in the activity bar (or on the workspace setup page) to flip between Default Dark and Default Light
4. Per-PR: grep migrated files for `var(--color-(dark|light|blue|red|...)-...)` — should be empty unless inside a documented legacy modifier block
