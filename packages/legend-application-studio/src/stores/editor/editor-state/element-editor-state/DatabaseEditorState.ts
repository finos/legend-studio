/**
 * Copyright (c) 2020-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import { ElementEditorState } from './ElementEditorState.js';
import {
  type GeneratorFn,
  LogEvent,
  assertErrorThrown,
  guaranteeType,
  noop,
} from '@finos/legend-shared';
import {
  type Column,
  Database,
  type Filter,
  GRAPH_MANAGER_EVENT,
  type Join,
  type PackageableElement,
  type RawRelationalOperationElement,
  type Table,
  type View,
} from '@finos/legend-graph';
import type { EditorStore } from '../../EditorStore.js';
import { LegendStudioUserDataHelper } from '../../../../__lib__/LegendStudioUserDataHelper.js';

/**
 * Top-level tabs inside the Database form-mode editor. `VIEW` shows the ERD
 * canvas; `GRAMMAR` shows a read-only preview of the same Pure DSL grammar
 * that the global Text Mode would render.
 */
export enum DATABASE_EDITOR_TAB {
  VIEW = 'VIEW',
  GRAMMAR = 'GRAMMAR',
}

/**
 * Stable id for an element of the schema tree. We use a string id (rather than
 * holding object references) so the side-panel's expand/collapse state can
 * survive reprocessing without any cross-instance bookkeeping.
 *
 * Tables and Views share the same id namespace because they share the same
 * `<schema>.<name>` qualifier — the metamodel doesn't allow a table and a view
 * to collide on name within a schema.
 */
export const getSchemaNodeId = (schemaName: string): string => schemaName;
export const getRelationNodeId = (
  schemaName: string,
  relationName: string,
): string => `${schemaName}.${relationName}`;

/**
 * Stable key used to look up the Pure-code formula for a single view column
 * inside `DatabaseEditorState.viewColumnFormulas`. Joins schema, view, and
 * column so it survives reprocessing and can't collide across schemas.
 */
export const getViewColumnFormulaKey = (
  schemaName: string,
  viewName: string,
  columnName: string,
): string => `${schemaName}.${viewName}.${columnName}`;

/**
 * Stable key used to look up the Pure-code formula for a single filter inside
 * `DatabaseEditorState.filterFormulas`. Filter names are unique within a
 * Database (they live as a flat `Database.filters: Filter[]`), so the name
 * alone is sufficient — no schema qualifier needed.
 */
export const getFilterFormulaKey = (filterName: string): string => filterName;

/**
 * Stable key used to look up the Pure-code formula for a single join. Join
 * names are unique within a Database (they live as a flat
 * `Database.joins: Join[]`), so the name alone is sufficient. Mirrors the
 * filter helper above.
 */
export const getJoinFormulaKey = (joinName: string): string => joinName;

/**
 * Stable key used to look up the Pure-code formula for a single view's
 * groupBy column expression. Views are scoped to a schema and groupBy
 * positions matter (the engine renders them in declaration order), so the
 * key includes both the schema-qualified view name and the position index.
 */
export const getViewGroupByFormulaKey = (
  schemaName: string,
  viewName: string,
  index: number,
): string => `${schemaName}.${viewName}.groupBy[${index}]`;

/**
 * Walk the V1-shaped Database entity content and collect every view's column
 * mapping operations into a Map keyed by `<schema>.<view>.<column>`. The
 * traversal mirrors the V1_Database / V1_Schema / V1_View / V1_ColumnMapping
 * shape — anything that doesn't match that shape is skipped silently.
 *
 * We use loose typing because the entity content is `Record<PropertyKey,
 * unknown>` and the V1 protocol types aren't exported from `@finos/legend-
 * graph` for direct use here.
 */
const collectRawViewColumnOperations = (
  content: unknown,
): Map<string, RawRelationalOperationElement> => {
  const out = new Map<string, RawRelationalOperationElement>();
  const dbContent = content as { schemas?: unknown[] } | undefined;
  if (!dbContent || !Array.isArray(dbContent.schemas)) {
    return out;
  }
  for (const schemaJson of dbContent.schemas) {
    const schema = schemaJson as
      | { name?: string; views?: unknown[] }
      | undefined;
    if (!schema || typeof schema.name !== 'string') {
      continue;
    }
    const views = Array.isArray(schema.views) ? schema.views : [];
    for (const viewJson of views) {
      const view = viewJson as
        | { name?: string; columnMappings?: unknown[] }
        | undefined;
      if (!view || typeof view.name !== 'string') {
        continue;
      }
      const mappings = Array.isArray(view.columnMappings)
        ? view.columnMappings
        : [];
      for (const mappingJson of mappings) {
        const mapping = mappingJson as
          | { name?: string; operation?: unknown }
          | undefined;
        if (
          !mapping ||
          typeof mapping.name !== 'string' ||
          typeof mapping.operation !== 'object' ||
          mapping.operation === null
        ) {
          continue;
        }
        out.set(
          getViewColumnFormulaKey(schema.name, view.name, mapping.name),
          mapping.operation,
        );
      }
    }
  }
  return out;
};

/**
 * Walk the V1-shaped Database entity content and collect every view's
 * groupBy column expressions into a Map keyed by
 * `<schema>.<view>.groupBy[<index>]`. The V1 shape is
 *   `schemas[].views[].groupBy.columns[]: RawRelationalOperationElement`.
 * Anything that doesn't match that shape is skipped silently. Same loose
 * typing as the column-mapping walker above.
 */
const collectRawViewGroupByOperations = (
  content: unknown,
): Map<string, RawRelationalOperationElement> => {
  const out = new Map<string, RawRelationalOperationElement>();
  const dbContent = content as { schemas?: unknown[] } | undefined;
  if (!dbContent || !Array.isArray(dbContent.schemas)) {
    return out;
  }
  for (const schemaJson of dbContent.schemas) {
    const schema = schemaJson as
      | { name?: string; views?: unknown[] }
      | undefined;
    if (!schema || typeof schema.name !== 'string') {
      continue;
    }
    const views = Array.isArray(schema.views) ? schema.views : [];
    for (const viewJson of views) {
      // V1 protocol stores `View.groupBy` as a flat array of operation
      // elements (see `V1_View.groupBy: V1_RelationalOperationElement[]`),
      // NOT wrapped in `{ columns: [...] }` like the metamodel side. The
      // serializer drops the field entirely when there are no group-by
      // columns, so `view.groupBy` may legitimately be undefined.
      const view = viewJson as
        | { name?: string; groupBy?: unknown[] }
        | undefined;
      if (
        !view ||
        typeof view.name !== 'string' ||
        !Array.isArray(view.groupBy)
      ) {
        continue;
      }
      view.groupBy.forEach((opJson, index) => {
        if (typeof opJson !== 'object' || opJson === null) {
          return;
        }
        out.set(
          getViewGroupByFormulaKey(
            schema.name as string,
            view.name as string,
            index,
          ),
          opJson,
        );
      });
    }
  }
  return out;
};

/**
 * Walk the V1-shaped Database entity content and collect every filter's
 * operation into a Map keyed by filter name. Filters live at the database
 * level (a flat `filters[]` on the V1 root), unlike views which are nested
 * inside schemas — so this walker is shallower than
 * `collectRawViewColumnOperations`.
 *
 * Anything that doesn't match the expected `{ name, operation }` shape is
 * skipped silently. Loose typing for the same reason as the view walker:
 * entity content is `Record<PropertyKey, unknown>`.
 */
const collectRawFilterOperations = (
  content: unknown,
): Map<string, RawRelationalOperationElement> => {
  const out = new Map<string, RawRelationalOperationElement>();
  const dbContent = content as { filters?: unknown[] } | undefined;
  if (!dbContent || !Array.isArray(dbContent.filters)) {
    return out;
  }
  for (const filterJson of dbContent.filters) {
    const filter = filterJson as
      | { name?: string; operation?: unknown }
      | undefined;
    if (
      !filter ||
      typeof filter.name !== 'string' ||
      typeof filter.operation !== 'object' ||
      filter.operation === null
    ) {
      continue;
    }
    out.set(getFilterFormulaKey(filter.name), filter.operation);
  }
  return out;
};

/**
 * Walk the V1-shaped Database entity content and collect every join's
 * operation into a Map keyed by join name. Joins live at the database level
 * (a flat `joins[]` on the V1 root) under the shape `{ name, operation }`,
 * mirroring filters. Anything that doesn't match the expected shape is
 * skipped silently.
 */
const collectRawJoinOperations = (
  content: unknown,
): Map<string, RawRelationalOperationElement> => {
  const out = new Map<string, RawRelationalOperationElement>();
  const dbContent = content as { joins?: unknown[] } | undefined;
  if (!dbContent || !Array.isArray(dbContent.joins)) {
    return out;
  }
  for (const joinJson of dbContent.joins) {
    const join = joinJson as { name?: string; operation?: unknown } | undefined;
    if (
      !join ||
      typeof join.name !== 'string' ||
      typeof join.operation !== 'object' ||
      join.operation === null
    ) {
      continue;
    }
    out.set(getJoinFormulaKey(join.name), join.operation);
  }
  return out;
};

/**
 * View-only form mode for `Database` elements. Renders an ERD-style canvas
 * (tables as nodes, joins as edges) plus a side-panel tree of schemas/tables/
 * columns. A second tab shows the same grammar that Text Mode would show.
 *
 * Layout positions are derived per-render via dagre and not persisted yet —
 * persistence + edit support are intended follow-ups.
 */
export class DatabaseEditorState extends ElementEditorState {
  selectedTab: DATABASE_EDITOR_TAB = DATABASE_EDITOR_TAB.VIEW;

  // ---- Selection -----------------------------------------------------------
  // Mutually exclusive selection axes:
  //   - `selectedRelation` (+ optional `selectedColumn`): a Table or View is
  //     the focus. Drives the blue ring on the canvas node and side-panel row.
  //   - `selectedJoin`: a join is the focus. Drives the yellow edge style on
  //     the canvas and yellow rings on both endpoint relations ("join
  //     endpoints"), plus the side-panel join row highlight.
  //   - `selectedFilter`: a database-level filter is the focus. Filters don't
  //     have a canvas representation in the MVP — they live in the side panel
  //     only — so this only drives the side-panel row highlight.
  // Setting one clears the others — see action implementations below.
  //
  // `selectedColumn` is only meaningful when `selectedRelation` is a Table —
  // for views, column-mappings aren't `Column` instances and we don't support
  // per-mapping highlight in the MVP.
  selectedRelation: Table | View | undefined;
  selectedColumn: Column | undefined;
  selectedJoin: Join | undefined;
  selectedFilter: Filter | undefined;

  // For views (which have `columnMappings`, not `Column` instances), column
  // selection is tracked by name. Mutually exclusive with `selectedColumn`
  // — a relation is either a Table (use `selectedColumn`) or a View (use
  // `selectedViewColumnName`); never both. Always `undefined` when the
  // selected relation is a Table.
  selectedViewColumnName: string | undefined;

  // ---- Side-panel expansion -----------------------------------------------
  // Schemas default to expanded so users immediately see their relations;
  // tables/views default to collapsed so the tree isn't overwhelming on
  // large databases.
  expandedSchemaIds = new Set<string>();
  expandedRelationIds = new Set<string>();

  // ---- Pan-to-selected trigger --------------------------------------------
  // Selecting a row in the side panel should pan the canvas to that table;
  // selecting a node directly on the canvas should NOT (the user is already
  // looking at it). Rather than coupling the two components through callbacks,
  // we increment this counter on side-panel actions and let the canvas
  // observe it via `useEffect`.
  panToSelectedRequestCounter = 0;

  // ---- Canvas action triggers --------------------------------------------
  // Same counter pattern as `panToSelectedRequestCounter` for one-shot
  // actions the side-panel header / canvas toolbar fire and the canvas
  // executes. Counters (rather than booleans) so identical successive
  // requests still trigger.
  fitAllRequestCounter = 0;
  resetLayoutRequestCounter = 0;

  // ---- Tree search --------------------------------------------------------
  // User-entered filter applied to the schema tree (schema / table / view /
  // column names). Empty string = no filter. Lowercase comparison is done
  // at the consumer side via `searchTextLowerCase` so we don't pay the
  // toLowerCase cost in every row render.
  searchText = '';

  // ---- View-column Pure-code formulas -------------------------------------
  // Populated lazily by `loadViewColumnFormulas()` (one batched engine call
  // per Database load). Until populated — or for column mappings the engine
  // can't render — the UI falls back to the static placeholder
  // ("calculate [...]") so views always render something useful.
  // Keyed by `getViewColumnFormulaKey(schema, view, column)`.
  viewColumnFormulas = new Map<string, string>();
  isLoadingViewColumnFormulas = false;

  // ---- Filter Pure-code formulas ------------------------------------------
  // Same pattern as `viewColumnFormulas` but for `Database.filters[].operation`.
  // Populated lazily by `loadFilterFormulas()` in a single batched engine call.
  // Keyed by filter name (filters are unique within a database).
  filterFormulas = new Map<string, string>();
  isLoadingFilterFormulas = false;

  // ---- Join Pure-code formulas --------------------------------------------
  // Same pattern as `viewColumnFormulas` and `filterFormulas` but for
  // `Database.joins[].operation`. Populated lazily by `loadJoinFormulas()` in
  // a single batched engine call. Surfaced in the side panel under each join
  // row and in the canvas "selected join" floating card.
  joinFormulas = new Map<string, string>();
  isLoadingJoinFormulas = false;

  // ---- View groupBy Pure-code formulas ------------------------------------
  // Same pattern as `viewColumnFormulas` but for `View.groupBy.columns`.
  // Populated lazily by `loadViewGroupByFormulas()` in a single batched
  // engine call. Keyed by `<schema>.<view>.groupBy[<index>]` so positional
  // order is preserved (groupBy expressions are positional).
  viewGroupByFormulas = new Map<string, string>();
  isLoadingViewGroupByFormulas = false;

  // ---- Layout -------------------------------------------------------------
  // Side-panel (schema tree) is user-resizable on the canvas. We keep its
  // collapsed state on the editor state so it survives tab switches and so
  // a future toggle button outside the panel can drive it. Width is owned
  // by `react-reflex` and not tracked here — only the binary collapse flag.
  isSidePanelCollapsed = false;

  // ---- Theme --------------------------------------------------------------
  // The wider Studio app is dark-mode-only today. We allow this editor (and
  // only this editor) to opt into a light theme via a toolbar toggle. The
  // setting lives on the editor state so it survives tab switches and
  // recompiles within the same session, and is persisted per-user via
  // `UserDataService` (localStorage) so the choice survives reloads.
  // TODO: when Studio adopts app-wide theming via `LayoutService` (Query
  // already does this with `setColorTheme(..., { persist: true })`), drop
  // this local observable + persistence and react to
  // `applicationStore.layoutService.currentColorTheme` instead so this
  // editor stays in sync with the rest of the app.
  theme: 'dark' | 'light' = 'dark';

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      selectedTab: observable,
      selectedRelation: observable,
      selectedColumn: observable,
      selectedViewColumnName: observable,
      selectedJoin: observable,
      selectedFilter: observable,
      expandedSchemaIds: observable,
      expandedRelationIds: observable,
      panToSelectedRequestCounter: observable,
      fitAllRequestCounter: observable,
      resetLayoutRequestCounter: observable,
      searchText: observable,
      viewColumnFormulas: observable,
      isLoadingViewColumnFormulas: observable,
      filterFormulas: observable,
      isLoadingFilterFormulas: observable,
      joinFormulas: observable,
      isLoadingJoinFormulas: observable,
      viewGroupByFormulas: observable,
      isLoadingViewGroupByFormulas: observable,
      isSidePanelCollapsed: observable,
      theme: observable,
      database: computed,
      setSelectedTab: action,
      setSelectedRelation: action,
      focusOnRelation: action,
      focusOnColumn: action,
      focusOnViewColumn: action,
      focusOnJoin: action,
      focusOnFilter: action,
      clearSelection: action,
      toggleSchemaExpanded: action,
      toggleRelationExpanded: action,
      expandAllSchemas: action,
      collapseAll: action,
      setSidePanelCollapsed: action,
      toggleSidePanelCollapsed: action,
      toggleTheme: action,
      setSearchText: action,
      requestFitAll: action,
      requestResetLayout: action,
      generateGrammarText: flow,
      loadViewColumnFormulas: flow,
      loadFilterFormulas: flow,
      loadJoinFormulas: flow,
      loadViewGroupByFormulas: flow,
    });

    // Default: every schema starts expanded so the tree is immediately useful.
    this.database.schemas.forEach((schema) => {
      this.expandedSchemaIds.add(getSchemaNodeId(schema.name));
    });

    // Hydrate the persisted theme preference (if any). Falls through to the
    // default 'dark' when the user has never set it. Done synchronously in
    // the constructor so the first render already reflects the stored choice.
    const persistedTheme = LegendStudioUserDataHelper.databaseEditor_getTheme(
      this.editorStore.applicationStore.userDataService,
    );
    if (persistedTheme) {
      this.theme = persistedTheme;
    }

    // Kick off the formula load eagerly. The flow is async and writes into
    // `viewColumnFormulas` when ready — components render with the placeholder
    // until then, so the UI is never blocked on this. Errors are logged and
    // swallowed; the placeholder remains.
    flowResult(this.loadViewColumnFormulas()).catch(noop());

    // Same for filter formulas — independent batched engine call so the two
    // loads run in parallel.
    flowResult(this.loadFilterFormulas()).catch(noop());

    // And join formulas — third independent batched engine call. All three
    // are fire-and-forget on construction; consumers fall back to the
    // placeholder text until they resolve.
    flowResult(this.loadJoinFormulas()).catch(noop());

    // And view-groupBy formulas — fourth independent batched engine call.
    // Only fires for databases that actually have at least one view with a
    // groupBy; the loader bails out otherwise.
    flowResult(this.loadViewGroupByFormulas()).catch(noop());
  }

  get database(): Database {
    return guaranteeType(
      this.element,
      Database,
      'Element inside database editor state must be a Database',
    );
  }

  // -------------------------------------------------------------------------
  // Tab navigation
  // -------------------------------------------------------------------------

  setSelectedTab(tab: DATABASE_EDITOR_TAB): void {
    this.selectedTab = tab;
    if (tab === DATABASE_EDITOR_TAB.GRAMMAR) {
      // Lazily regenerate so the grammar preview always matches the current
      // metamodel state. Errors are swallowed — the flow itself writes a
      // diagnostic comment into `textContent` on failure.
      flowResult(this.generateGrammarText()).catch(noop());
    }
  }

  /**
   * Generate the Pure grammar for the underlying Database element and store
   * it in `textContent`. Mirrors `generateElementGrammar()` from the base
   * class but is kept local so the consumer doesn't need to know about the
   * inherited flow.
   */
  *generateGrammarText(): ReturnType<
    DatabaseEditorState['generateElementGrammar']
  > {
    yield flowResult(this.generateElementGrammar());
  }

  /**
   * Render every view column-mapping's relational operation as Pure code, in
   * a single batched engine call.
   *
   * Strategy: rather than transform metamodel `RelationalOperationElement`
   * instances by hand (the V1 transformer isn't a public export), we rely on
   * `elementToEntity(database)` which serializes the Database to its V1 JSON
   * form synchronously. The resulting `entity.content` already contains the
   * raw operations under
   *   `schemas[].views[].columnMappings[].operation`
   * — exactly the shape `relationalOperationElementToPureCode` expects. We
   * walk that JSON, build a Map keyed by `<schema>.<view>.<column>`, and let
   * the engine return the rendered Pure code.
   *
   * On any failure (network/server/serialization), the partial map (possibly
   * empty) stays in place and consumers fall back to the placeholder.
   */
  *loadViewColumnFormulas(): GeneratorFn<void> {
    // Skip the round-trip entirely if the database has no views.
    const hasAnyView = this.database.schemas.some(
      (schema) => schema.views.length > 0,
    );
    if (!hasAnyView) {
      return;
    }
    this.isLoadingViewColumnFormulas = true;
    try {
      const entity =
        this.editorStore.graphManagerState.graphManager.elementToEntity(
          this.database,
          { pruneSourceInformation: true },
        );
      const operations = collectRawViewColumnOperations(entity.content);
      if (operations.size === 0) {
        return;
      }
      const rendered =
        (yield this.editorStore.graphManagerState.graphManager.relationalOperationElementToPureCode(
          operations,
        )) as Map<string, string>;
      // Replace the whole map atomically so consumers (which read it as a
      // computed dependency) re-render once.
      this.viewColumnFormulas = new Map(rendered);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
        `Couldn't render view-column formulas for database ${this.database.path}`,
        error,
      );
    } finally {
      this.isLoadingViewColumnFormulas = false;
    }
  }

  /**
   * Render every database-level filter's relational operation as Pure code, in
   * a single batched engine call.
   *
   * Same strategy as `loadViewColumnFormulas`: serialize the database to its
   * V1 JSON via `elementToEntity` and walk the `filters[]` array on the root
   * for `{ name, operation }` pairs. Filter names are unique within a
   * Database, so the lookup key is just the filter name.
   *
   * On any failure (network/server/serialization), the partial map (possibly
   * empty) stays in place and consumers fall back to the placeholder.
   */
  *loadFilterFormulas(): GeneratorFn<void> {
    // Skip the round-trip entirely if the database has no filters.
    if (this.database.filters.length === 0) {
      return;
    }
    this.isLoadingFilterFormulas = true;
    try {
      const entity =
        this.editorStore.graphManagerState.graphManager.elementToEntity(
          this.database,
          { pruneSourceInformation: true },
        );
      const operations = collectRawFilterOperations(entity.content);
      if (operations.size === 0) {
        return;
      }
      const rendered =
        (yield this.editorStore.graphManagerState.graphManager.relationalOperationElementToPureCode(
          operations,
        )) as Map<string, string>;
      // Replace the whole map atomically so consumers (which read it as a
      // computed dependency) re-render once.
      this.filterFormulas = new Map(rendered);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
        `Couldn't render filter formulas for database ${this.database.path}`,
        error,
      );
    } finally {
      this.isLoadingFilterFormulas = false;
    }
  }

  /**
   * Render every join's relational operation as Pure code, in a single
   * batched engine call. Same strategy as `loadFilterFormulas`: serialize
   * the database to its V1 JSON via `elementToEntity` and walk the
   * `joins[]` array on the root for `{ name, operation }` pairs. Join
   * names are unique within a Database, so the lookup key is just the
   * join name.
   *
   * On any failure (network/server/serialization), the partial map
   * (possibly empty) stays in place and consumers fall back to the
   * placeholder.
   */
  *loadJoinFormulas(): GeneratorFn<void> {
    if (this.database.joins.length === 0) {
      return;
    }
    this.isLoadingJoinFormulas = true;
    try {
      const entity =
        this.editorStore.graphManagerState.graphManager.elementToEntity(
          this.database,
          { pruneSourceInformation: true },
        );
      const operations = collectRawJoinOperations(entity.content);
      if (operations.size === 0) {
        return;
      }
      const rendered =
        (yield this.editorStore.graphManagerState.graphManager.relationalOperationElementToPureCode(
          operations,
        )) as Map<string, string>;
      this.joinFormulas = new Map(rendered);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
        `Couldn't render join formulas for database ${this.database.path}`,
        error,
      );
    } finally {
      this.isLoadingJoinFormulas = false;
    }
  }

  /**
   * Render every view's groupBy column expressions as Pure code, in a
   * single batched engine call. Same strategy as `loadViewColumnFormulas`:
   * serialize the database to its V1 JSON via `elementToEntity` and walk
   * the `schemas[].views[].groupBy.columns[]` arrays for raw operations.
   *
   * Skips the round-trip entirely when no view declares a groupBy. On any
   * failure the partial map (possibly empty) stays in place and consumers
   * fall back to the static placeholder.
   */
  *loadViewGroupByFormulas(): GeneratorFn<void> {
    const hasAnyGroupBy = this.database.schemas.some((schema) =>
      schema.views.some((view) => Boolean(view.groupBy)),
    );
    if (!hasAnyGroupBy) {
      return;
    }
    this.isLoadingViewGroupByFormulas = true;
    try {
      const entity =
        this.editorStore.graphManagerState.graphManager.elementToEntity(
          this.database,
          { pruneSourceInformation: true },
        );
      const operations = collectRawViewGroupByOperations(entity.content);
      if (operations.size === 0) {
        return;
      }
      const rendered =
        (yield this.editorStore.graphManagerState.graphManager.relationalOperationElementToPureCode(
          operations,
        )) as Map<string, string>;
      this.viewGroupByFormulas = new Map(rendered);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
        `Couldn't render view-groupBy formulas for database ${this.database.path}`,
        error,
      );
    } finally {
      this.isLoadingViewGroupByFormulas = false;
    }
  }

  // -------------------------------------------------------------------------
  // Selection
  // -------------------------------------------------------------------------

  /**
   * Plain relation selection — used when the user clicks directly on a node
   * on the canvas. Doesn't trigger a pan because the user is already looking
   * at the node they clicked. Clears any active join/filter selection
   * (selecting a relation moves us out of those focus modes).
   */
  setSelectedRelation(relation: Table | View | undefined): void {
    this.selectedRelation = relation;
    this.selectedColumn = undefined;
    this.selectedViewColumnName = undefined;
    this.selectedJoin = undefined;
    this.selectedFilter = undefined;
  }

  /**
   * Side-panel relation click — selects the relation AND requests a pan so
   * the canvas centers on it. Works identically for tables and views.
   */
  focusOnRelation(relation: Table | View): void {
    this.selectedRelation = relation;
    this.selectedColumn = undefined;
    this.selectedViewColumnName = undefined;
    this.selectedJoin = undefined;
    this.selectedFilter = undefined;
    this.panToSelectedRequestCounter++;
  }

  /**
   * Side-panel column click — selects the parent table, the specific column,
   * and requests a pan. Inside the table-node component this drives the
   * single-row highlight. Only meaningful for tables; view column-mappings
   * use `focusOnRelation` for now.
   */
  focusOnColumn(table: Table, column: Column): void {
    this.selectedRelation = table;
    this.selectedColumn = column;
    this.selectedViewColumnName = undefined;
    this.selectedJoin = undefined;
    this.selectedFilter = undefined;
    this.panToSelectedRequestCounter++;
  }

  /**
   * Side-panel view column-mapping click \u2014 selects the parent view AND
   * the specific column-mapping by name (views don't have `Column` refs).
   * Drives the per-row highlight inside the view's canvas node, mirroring
   * how `focusOnColumn` works for tables.
   */
  focusOnViewColumn(view: View, columnMappingName: string): void {
    this.selectedRelation = view;
    this.selectedColumn = undefined;
    this.selectedViewColumnName = columnMappingName;
    this.selectedJoin = undefined;
    this.selectedFilter = undefined;
    this.panToSelectedRequestCounter++;
  }

  /**
   * Side-panel join click (or canvas edge click) — selects the join and
   * requests a pan that fits BOTH endpoint relations in view. We clear the
   * relation/column selection because join-mode is its own focus state with
   * its own visual treatment (yellow rings on the two endpoints rather than
   * a single blue ring on one).
   */
  focusOnJoin(join: Join): void {
    this.selectedRelation = undefined;
    this.selectedColumn = undefined;
    this.selectedViewColumnName = undefined;
    this.selectedJoin = join;
    this.selectedFilter = undefined;
    this.panToSelectedRequestCounter++;
  }

  /**
   * Side-panel filter click — selects the filter. Filters don't have a
   * canvas representation in the MVP (they live at the database level rather
   * than tied to a specific table/edge), so this only highlights the row in
   * the side panel; no pan is requested. Other selection axes are cleared so
   * the highlight states stay mutually exclusive.
   */
  focusOnFilter(filter: Filter): void {
    this.selectedRelation = undefined;
    this.selectedColumn = undefined;
    this.selectedViewColumnName = undefined;
    this.selectedJoin = undefined;
    this.selectedFilter = filter;
  }

  /**
   * Clear all selections. Called from the canvas pane click handler so that
   * clicking empty space deselects everything regardless of which selection
   * axis is active.
   */
  clearSelection(): void {
    this.selectedRelation = undefined;
    this.selectedColumn = undefined;
    this.selectedViewColumnName = undefined;
    this.selectedJoin = undefined;
    this.selectedFilter = undefined;
  }

  // -------------------------------------------------------------------------
  // Expand/collapse
  // -------------------------------------------------------------------------

  toggleSchemaExpanded(id: string): void {
    if (this.expandedSchemaIds.has(id)) {
      this.expandedSchemaIds.delete(id);
    } else {
      this.expandedSchemaIds.add(id);
    }
  }

  toggleRelationExpanded(id: string): void {
    if (this.expandedRelationIds.has(id)) {
      this.expandedRelationIds.delete(id);
    } else {
      this.expandedRelationIds.add(id);
    }
  }

  expandAllSchemas(): void {
    this.database.schemas.forEach((schema) => {
      this.expandedSchemaIds.add(getSchemaNodeId(schema.name));
    });
  }

  collapseAll(): void {
    this.expandedSchemaIds.clear();
    this.expandedRelationIds.clear();
  }

  /**
   * Set the side panel's collapsed state directly. Useful for syncing the
   * state when the user drags the splitter all the way down (i.e., the
   * panel sets itself to collapsed in response to a resize event).
   */
  setSidePanelCollapsed(collapsed: boolean): void {
    this.isSidePanelCollapsed = collapsed;
  }

  /**
   * Flip the side panel's collapsed state. Driven by the explicit toggle
   * button in the panel header (and the chevron rendered when collapsed).
   */
  toggleSidePanelCollapsed(): void {
    this.isSidePanelCollapsed = !this.isSidePanelCollapsed;
  }

  /**
   * Flip the editor's local theme between dark (the Studio default) and
   * light. Scoped to this editor only — the rest of Studio remains in its
   * configured theme. The toggle is exposed via a button in the editor's
   * tab header. The new value is persisted to `UserDataService` so the
   * choice survives reloads.
   */
  toggleTheme(): void {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    LegendStudioUserDataHelper.databaseEditor_setTheme(
      this.editorStore.applicationStore.userDataService,
      this.theme,
    );
  }

  /**
   * Set the tree search/filter text. Empty string means \u201cno filter\u201d.
   * The schema-tree consumer derives a lowercase form per render rather
   * than computing it here so identical successive sets stay cheap.
   */
  setSearchText(text: string): void {
    this.searchText = text;
  }

  /**
   * Bump the fit-all counter. The canvas observes this and runs
   * `fitView()` over the full graph (no `nodes` filter).
   */
  requestFitAll(): void {
    this.fitAllRequestCounter++;
  }

  /**
   * Bump the reset-layout counter. The canvas observes this and re-runs
   * dagre over the current nodes/edges, undoing any user-initiated drags.
   */
  requestResetLayout(): void {
    this.resetLayoutRequestCounter++;
  }

  override reprocess(
    newElement: Database,
    editorStore: EditorStore,
  ): DatabaseEditorState {
    const next = new DatabaseEditorState(editorStore, newElement);
    // Preserve UX state across recompiles — a recompile shouldn't snap users
    // back to the View tab or collapse everything.
    next.selectedTab = this.selectedTab;
    next.expandedSchemaIds = new Set(this.expandedSchemaIds);
    next.expandedRelationIds = new Set(this.expandedRelationIds);
    next.isSidePanelCollapsed = this.isSidePanelCollapsed;
    next.theme = this.theme;
    // Note: `viewColumnFormulas` and `filterFormulas` deliberately do NOT
    // carry over. They're derived from operations on the new element and may
    // have changed; the constructor's `loadViewColumnFormulas()` and
    // `loadFilterFormulas()` kickoffs will refresh them. Until those resolve
    // the placeholder shows briefly.
    return next;
  }
}
