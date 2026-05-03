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

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      selectedTab: observable,
      selectedRelation: observable,
      selectedColumn: observable,
      selectedJoin: observable,
      selectedFilter: observable,
      expandedSchemaIds: observable,
      expandedRelationIds: observable,
      panToSelectedRequestCounter: observable,
      viewColumnFormulas: observable,
      isLoadingViewColumnFormulas: observable,
      filterFormulas: observable,
      isLoadingFilterFormulas: observable,
      database: computed,
      setSelectedTab: action,
      setSelectedRelation: action,
      focusOnRelation: action,
      focusOnColumn: action,
      focusOnJoin: action,
      focusOnFilter: action,
      clearSelection: action,
      toggleSchemaExpanded: action,
      toggleRelationExpanded: action,
      expandAllSchemas: action,
      collapseAll: action,
      generateGrammarText: flow,
      loadViewColumnFormulas: flow,
      loadFilterFormulas: flow,
    });

    // Default: every schema starts expanded so the tree is immediately useful.
    this.database.schemas.forEach((schema) => {
      this.expandedSchemaIds.add(getSchemaNodeId(schema.name));
    });

    // Kick off the formula load eagerly. The flow is async and writes into
    // `viewColumnFormulas` when ready — components render with the placeholder
    // until then, so the UI is never blocked on this. Errors are logged and
    // swallowed; the placeholder remains.
    flowResult(this.loadViewColumnFormulas()).catch(noop());

    // Same for filter formulas — independent batched engine call so the two
    // loads run in parallel.
    flowResult(this.loadFilterFormulas()).catch(noop());
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
    // Note: `viewColumnFormulas` and `filterFormulas` deliberately do NOT
    // carry over. They're derived from operations on the new element and may
    // have changed; the constructor's `loadViewColumnFormulas()` and
    // `loadFilterFormulas()` kickoffs will refresh them. Until those resolve
    // the placeholder shows briefly.
    return next;
  }
}
