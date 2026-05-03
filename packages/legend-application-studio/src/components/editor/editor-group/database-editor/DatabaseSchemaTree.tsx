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

import { observer } from 'mobx-react-lite';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  EyeIcon,
  FilterIcon,
  KeyIcon,
  PURE_DatabaseIcon,
  PURE_DatabaseSchemaIcon,
  PURE_DatabaseTableIcon,
  PURE_DatabaseTableJoinIcon,
  clsx,
} from '@finos/legend-art';
import type { Column, Schema, Table, View } from '@finos/legend-graph';

// `ColumnMapping` isn't re-exported from `@finos/legend-graph`; recover via
// indexed access on `View` so we keep types in sync without a deep import.
type ColumnMapping = View['columnMappings'][number];
import {
  type DatabaseEditorState,
  getRelationNodeId,
  getSchemaNodeId,
} from '../../../../stores/editor/editor-state/element-editor-state/DatabaseEditorState.js';
import {
  getColumnTypeLabel,
  getTableColumns,
  isPrimaryKey,
  resolveFilterFormula,
  resolveViewColumnFormula,
} from './DatabaseDiagramHelper.js';

/**
 * Renders one column under an expanded Table. Clicking focuses the column,
 * which (per `DatabaseEditorState.focusOnColumn`) selects the parent table,
 * marks the specific column, and requests a canvas pan.
 *
 * Columns aren't expandable — they're leaves of the tree.
 */
const DatabaseTreeTableColumnRow = observer(
  (props: {
    editorState: DatabaseEditorState;
    table: Table;
    column: Column;
  }) => {
    const { editorState, table, column } = props;
    const isSelected = editorState.selectedColumn === column;
    const isPK = isPrimaryKey(table, column.name);
    return (
      <button
        type="button"
        className={clsx('database-diagram__tree__column', {
          'database-diagram__tree__column--selected': isSelected,
          'database-diagram__tree__column--pk': isPK,
        })}
        onClick={() => editorState.focusOnColumn(table, column)}
        title={`${table.schema.name}.${table.name}.${column.name}: ${getColumnTypeLabel(column)}`}
      >
        <span className="database-diagram__tree__column__icon">
          {isPK ? (
            <KeyIcon />
          ) : (
            <span className="database-diagram__tree__column__bullet">•</span>
          )}
        </span>
        <span className="database-diagram__tree__column__name">
          {column.name}
        </span>
        <span className="database-diagram__tree__column__type">
          {getColumnTypeLabel(column)}
        </span>
      </button>
    );
  },
);

/**
 * Renders one column-mapping under an expanded View. Visually similar to a
 * table-column row but the secondary text is the formula placeholder rather
 * than a SQL type. Not selectable individually in the MVP — clicking just
 * focuses the parent view.
 */
const DatabaseTreeViewColumnRow = observer(
  (props: {
    editorState: DatabaseEditorState;
    view: View;
    columnMapping: ColumnMapping;
  }) => {
    const { editorState, view, columnMapping } = props;
    const isPK = isPrimaryKey(view, columnMapping.columnName);
    // Pull the live formula from the editor state. Re-renders when the
    // batched engine call resolves and updates `viewColumnFormulas`.
    const formula = resolveViewColumnFormula(
      editorState.viewColumnFormulas,
      view.schema.name,
      view.name,
      columnMapping.columnName,
    );
    return (
      <button
        type="button"
        className={clsx(
          'database-diagram__tree__column',
          'database-diagram__tree__column--view',
          {
            'database-diagram__tree__column--pk': isPK,
          },
        )}
        onClick={() => editorState.focusOnRelation(view)}
        title={`${view.schema.name}.${view.name}.${columnMapping.columnName}: ${formula}`}
      >
        <span className="database-diagram__tree__column__icon">
          {isPK ? (
            <KeyIcon />
          ) : (
            <span className="database-diagram__tree__column__bullet">•</span>
          )}
        </span>
        <span className="database-diagram__tree__column__name">
          {columnMapping.columnName}
        </span>
        <span className="database-diagram__tree__column__type">{formula}</span>
      </button>
    );
  },
);

/**
 * Renders one Table row plus (when expanded) its Column children. Clicking
 * the row both *selects the table on the canvas* (with a pan-to) AND toggles
 * expansion. Bundling these is intentional — when a user navigates to a
 * relation, they almost always want to see its columns too.
 */
const DatabaseTreeTableRow = observer(
  (props: { editorState: DatabaseEditorState; table: Table }) => {
    const { editorState, table } = props;
    const id = getRelationNodeId(table.schema.name, table.name);
    const isExpanded = editorState.expandedRelationIds.has(id);
    const isSelected = editorState.selectedRelation === table;
    const columns = getTableColumns(table);
    return (
      <div className="database-diagram__tree__table">
        <button
          type="button"
          className={clsx('database-diagram__tree__table__row', {
            'database-diagram__tree__table__row--selected': isSelected,
          })}
          onClick={() => {
            editorState.focusOnRelation(table);
            editorState.toggleRelationExpanded(id);
          }}
          title={`${table.schema.name}.${table.name}`}
        >
          <span className="database-diagram__tree__caret">
            {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </span>
          <PURE_DatabaseTableIcon />
          <span className="database-diagram__tree__table__name">
            {table.name}
          </span>
          <span className="database-diagram__tree__table__count">
            {columns.length}
          </span>
        </button>
        {isExpanded && (
          <div className="database-diagram__tree__table__children">
            {columns.map((column) => (
              <DatabaseTreeTableColumnRow
                key={column.name}
                editorState={editorState}
                table={table}
                column={column}
              />
            ))}
          </div>
        )}
      </div>
    );
  },
);

/**
 * Renders one View row plus (when expanded) its column-mapping children.
 * Visually distinct from the table row via the eye icon. Same click semantics
 * as tables (select + expand).
 */
const DatabaseTreeViewRow = observer(
  (props: { editorState: DatabaseEditorState; view: View }) => {
    const { editorState, view } = props;
    const id = getRelationNodeId(view.schema.name, view.name);
    const isExpanded = editorState.expandedRelationIds.has(id);
    const isSelected = editorState.selectedRelation === view;
    return (
      <div className="database-diagram__tree__table database-diagram__tree__table--view">
        <button
          type="button"
          className={clsx('database-diagram__tree__table__row', {
            'database-diagram__tree__table__row--selected': isSelected,
          })}
          onClick={() => {
            editorState.focusOnRelation(view);
            editorState.toggleRelationExpanded(id);
          }}
          title={`${view.schema.name}.${view.name} (view)`}
        >
          <span className="database-diagram__tree__caret">
            {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </span>
          <EyeIcon />
          <span className="database-diagram__tree__table__name">
            {view.name}
          </span>
          <span className="database-diagram__tree__table__count">
            {view.columnMappings.length}
          </span>
        </button>
        {isExpanded && (
          <div className="database-diagram__tree__table__children">
            {view.columnMappings.map((mapping) => (
              <DatabaseTreeViewColumnRow
                key={mapping.columnName}
                editorState={editorState}
                view={view}
                columnMapping={mapping}
              />
            ))}
          </div>
        )}
      </div>
    );
  },
);

/**
 * Renders one Schema header plus (when expanded) its Table and View children.
 * Tables come before views within each schema — both kinds are siblings in
 * the tree, distinguished only by icon and the column-row content.
 *
 * Schemas don't have a "selected" state — they only toggle.
 */
const DatabaseTreeSchemaRow = observer(
  (props: { editorState: DatabaseEditorState; schema: Schema }) => {
    const { editorState, schema } = props;
    const schemaId = getSchemaNodeId(schema.name);
    const isExpanded = editorState.expandedSchemaIds.has(schemaId);
    const totalChildren = schema.tables.length + schema.views.length;
    return (
      <div className="database-diagram__tree__schema">
        <button
          type="button"
          className="database-diagram__tree__schema__row"
          onClick={() => editorState.toggleSchemaExpanded(schemaId)}
        >
          <span className="database-diagram__tree__caret">
            {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </span>
          <PURE_DatabaseSchemaIcon />
          <span className="database-diagram__tree__schema__name">
            {schema.name}
          </span>
          <span className="database-diagram__tree__schema__count">
            {totalChildren}
          </span>
        </button>
        {isExpanded && (
          <div className="database-diagram__tree__schema__children">
            {schema.tables.map((table) => (
              <DatabaseTreeTableRow
                key={`table:${table.name}`}
                editorState={editorState}
                table={table}
              />
            ))}
            {schema.views.map((view) => (
              <DatabaseTreeViewRow
                key={`view:${view.name}`}
                editorState={editorState}
                view={view}
              />
            ))}
          </div>
        )}
      </div>
    );
  },
);

/**
 * The full side-panel tree. Renders schemas → (tables, views) → columns plus
 * a flat "Joins" section at the bottom (joins are cross-relation
 * relationships and don't naturally fit in the tree hierarchy).
 *
 * State (selection, expansion) lives entirely in `DatabaseEditorState` so it
 * survives reprocessing and so other components (the canvas) can react to it.
 */
export const DatabaseSchemaTree = observer(
  (props: { editorState: DatabaseEditorState }) => {
    const { editorState } = props;
    const { database } = editorState;
    return (
      <div className="database-diagram__side-panel">
        <div className="database-diagram__side-panel__section">
          <div className="database-diagram__side-panel__section__header">
            Schemas{' '}
            <span className="database-diagram__side-panel__section__count">
              ({database.schemas.length})
            </span>
          </div>
          {database.schemas.map((schema) => (
            <DatabaseTreeSchemaRow
              key={schema.name}
              editorState={editorState}
              schema={schema}
            />
          ))}
        </div>

        <div className="database-diagram__side-panel__section">
          <div className="database-diagram__side-panel__section__header">
            Joins{' '}
            <span className="database-diagram__side-panel__section__count">
              ({database.joins.length})
            </span>
          </div>
          {database.joins.map((join) => {
            const isSelected = editorState.selectedJoin === join;
            return (
              <button
                key={join.name}
                type="button"
                className={clsx('database-diagram__side-panel__join', {
                  'database-diagram__side-panel__join--selected': isSelected,
                })}
                onClick={() => editorState.focusOnJoin(join)}
                title={join.name}
              >
                <PURE_DatabaseTableJoinIcon />
                <span className="database-diagram__side-panel__join__name">
                  {join.name}
                </span>
              </button>
            );
          })}
        </div>

        {/*
         * Filters live at the database level (a flat `Database.filters[]`),
         * so they get their own bottom section — same shape as Joins. Each
         * row also surfaces the rendered Pure code below the name (italic
         * secondary line) so the operation logic is visible at a glance,
         * not just the filter's identifier. The formula is loaded async by
         * `loadFilterFormulas` and falls back to a placeholder until ready.
         */}
        <div className="database-diagram__side-panel__section">
          <div className="database-diagram__side-panel__section__header">
            Filters{' '}
            <span className="database-diagram__side-panel__section__count">
              ({database.filters.length})
            </span>
          </div>
          {database.filters.map((filter) => {
            const isSelected = editorState.selectedFilter === filter;
            const formula = resolveFilterFormula(
              editorState.filterFormulas,
              filter.name,
            );
            return (
              <button
                key={filter.name}
                type="button"
                className={clsx('database-diagram__side-panel__filter', {
                  'database-diagram__side-panel__filter--selected': isSelected,
                })}
                onClick={() => editorState.focusOnFilter(filter)}
                title={`${filter.name}: ${formula}`}
              >
                <span className="database-diagram__side-panel__filter__icon">
                  <FilterIcon />
                </span>
                <span className="database-diagram__side-panel__filter__body">
                  <span className="database-diagram__side-panel__filter__name">
                    {filter.name}
                  </span>
                  <span className="database-diagram__side-panel__filter__formula">
                    {formula}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/*
         * `database.includes` lists other Database elements whose schemas,
         * joins, and filters are reachable from this one. Clicking a row
         * opens that included database as its own element editor (a new
         * tab in the tab manager) — the user can then explore it with the
         * same form-mode editor. We surface that "opens elsewhere" intent
         * with the `ExternalLinkIcon` on the right; the rest of the side
         * panel selects in-place, so the icon is the visual cue that this
         * row behaves differently.
         */}
        {database.includes.length > 0 && (
          <div className="database-diagram__side-panel__section">
            <div className="database-diagram__side-panel__section__header">
              Included Stores{' '}
              <span className="database-diagram__side-panel__section__count">
                ({database.includes.length})
              </span>
            </div>
            {database.includes.map((ref) => {
              const path = ref.valueForSerialization ?? ref.value.path;
              return (
                <button
                  key={path}
                  type="button"
                  className="database-diagram__side-panel__included-store"
                  title={`${path}\n\n(click to open)`}
                  onClick={() =>
                    editorState.editorStore.graphEditorMode.openElement(
                      ref.value,
                    )
                  }
                >
                  <PURE_DatabaseIcon />
                  <span className="database-diagram__side-panel__included-store__path">
                    {path}
                  </span>
                  <span className="database-diagram__side-panel__included-store__open">
                    <ExternalLinkIcon />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  },
);
