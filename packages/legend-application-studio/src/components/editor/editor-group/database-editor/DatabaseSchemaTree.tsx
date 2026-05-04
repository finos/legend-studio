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
import { useState } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CompressIcon,
  CopyIcon,
  ExpandAllIcon,
  ExternalLinkIcon,
  EyeIcon,
  FilterIcon,
  KeyIcon,
  PURE_DatabaseIcon,
  PURE_DatabaseSchemaIcon,
  PURE_DatabaseTableIcon,
  PURE_DatabaseTableJoinIcon,
  PURE_DataProductIcon,
  SearchIcon,
  TimesIcon,
  clsx,
} from '@finos/legend-art';
import {
  type Column,
  type FilterMapping,
  type GroupByMapping,
  type IncludeStore,
  type Schema,
  type Table,
  type View,
} from '@finos/legend-graph';
import { DatabaseAnnotationDisplay } from './DatabaseAnnotationDisplay.js';
import {
  type DatabaseEditorState,
  getRelationNodeId,
  getSchemaNodeId,
} from '../../../../stores/editor/editor-state/element-editor-state/DatabaseEditorState.js';
import {
  getColumnTypeLabel,
  getTableColumns,
  isCrossDatabaseJoin,
  isPrimaryKey,
  isSelfJoin,
  matchesSearch,
  resolveFilterFormula,
  resolveJoinFormula,
  resolveViewColumnFormula,
  resolveViewGroupByFormula,
  summarizeMilestoning,
} from './DatabaseDiagramHelper.js';

// `ColumnMapping` isn't re-exported from `@finos/legend-graph` (it's only
// useful in the context of a Table/View, never standalone). Recover it via
// indexed access on `View` so we stay in sync without a deep import path.
type ColumnMapping = View['columnMappings'][number];

/**
 * Small inline copy-to-clipboard button rendered next to rendered Pure code
 * (filter/join/view-column/groupBy formulas). Two-state visual: shows the
 * default copy icon, briefly flips to a "Copied!" label after a successful
 * write, then resets. Click stops propagation so the surrounding row's
 * click handler (which usually selects/focuses the row) doesn't fire.
 */
const CopyFormulaButton: React.FC<{ value: string; label?: string }> = ({
  value,
  label = 'Copy',
}) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={clsx('database-diagram__copy-btn', {
        'database-diagram__copy-btn--copied': copied,
      })}
      title={copied ? 'Copied!' : label}
      onClick={(event) => {
        event.stopPropagation();
        // `navigator.clipboard` may be unavailable in test/insecure contexts;
        // fall through silently in that case rather than throwing.
        navigator.clipboard
          .writeText(value)
          .then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          })
          .catch(() => {
            /* no-op \u2014 copy failures are non-fatal */
          });
      }}
    >
      <CopyIcon />
    </button>
  );
};

/**
 * Pure-CSS shimmer placeholder shown in place of formula text while the
 * batched engine call is still in flight. We swap from skeleton to text
 * once the corresponding `is...Loading` flag flips false on the editor
 * state. Compact one-line bar so layout doesn't shift on resolve.
 */
const FormulaSkeleton: React.FC = () => (
  <span
    className="database-diagram__skeleton"
    aria-label="Loading formula"
    aria-busy={true}
  />
);

/**
 * Empty-state row shown when a side-panel section has zero rows of its
 * primary kind (e.g. a database with no joins). Lighter than rendering
 * nothing because users sometimes wonder if the panel is broken when a
 * section is silently absent.
 */
const EmptySectionRow: React.FC<{ message: string }> = ({ message }) => (
  <div className="database-diagram__side-panel__empty">{message}</div>
);

/**
 * Predicates that determine whether a tree node should be rendered under
 * the current search filter. A node is shown when it OR any descendant
 * matches the (already lowercased) query. Empty query short-circuits so
 * everything is shown, which keeps the no-filter render path cheap.
 */
const relationMatchesSearch = (rel: Table | View, query: string): boolean => {
  if (!query) {
    return true;
  }
  if (matchesSearch(rel.name, query)) {
    return true;
  }
  // For tables walk Column.name; for views walk ColumnMapping.columnName.
  // Either way the comparison is a flat substring on visible identifiers.
  if ('columnMappings' in rel) {
    return rel.columnMappings.some((m) => matchesSearch(m.columnName, query));
  }
  return getTableColumns(rel).some((c) => matchesSearch(c.name, query));
};

const schemaMatchesSearch = (schema: Schema, query: string): boolean => {
  if (!query) {
    return true;
  }
  if (matchesSearch(schema.name, query)) {
    return true;
  }
  return (
    schema.tables.some((t) => relationMatchesSearch(t, query)) ||
    schema.views.some((v) => relationMatchesSearch(v, query))
  );
};

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
          {column.nullable === true && (
            <span
              className="database-diagram__tree__column__nullable"
              title="Nullable"
            >
              ?
            </span>
          )}
        </span>
        <span className="database-diagram__tree__column__type">
          {getColumnTypeLabel(column)}
        </span>
        <DatabaseAnnotationDisplay
          stereotypes={column.stereotypes}
          taggedValues={column.taggedValues}
          layout="compact"
        />
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
    const isSelected =
      editorState.selectedRelation === view &&
      editorState.selectedViewColumnName === columnMapping.columnName;
    // Pull the live formula from the editor state. Re-renders when the
    // batched engine call resolves and updates `viewColumnFormulas`.
    const formula = resolveViewColumnFormula(
      editorState.viewColumnFormulas,
      view.schema.name,
      view.name,
      columnMapping.columnName,
    );
    const isLoading =
      editorState.isLoadingViewColumnFormulas &&
      !editorState.viewColumnFormulas.has(
        `${view.schema.name}.${view.name}.${columnMapping.columnName}`,
      );
    return (
      <button
        type="button"
        className={clsx(
          'database-diagram__tree__column',
          'database-diagram__tree__column--view',
          {
            'database-diagram__tree__column--pk': isPK,
            'database-diagram__tree__column--selected': isSelected,
          },
        )}
        onClick={() =>
          editorState.focusOnViewColumn(view, columnMapping.columnName)
        }
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
        <span className="database-diagram__tree__column__type">
          {isLoading ? <FormulaSkeleton /> : formula}
        </span>
        {!isLoading && (
          <CopyFormulaButton value={formula} label="Copy formula" />
        )}
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
    const query = editorState.searchText.trim().toLowerCase();
    if (!relationMatchesSearch(table, query)) {
      return null;
    }
    const id = getRelationNodeId(table.schema.name, table.name);
    // When a filter is active force-expand the row so matches deeper in
    // the tree are immediately visible without an extra click.
    const isExpanded = query !== '' || editorState.expandedRelationIds.has(id);
    const isSelected = editorState.selectedRelation === table;
    const columns = getTableColumns(table);
    // When filtering, only show columns that match the query (or all
    // columns if the table itself matched by name).
    const tableNameMatches = matchesSearch(table.name, query);
    const visibleColumns =
      query === '' || tableNameMatches
        ? columns
        : columns.filter((c) => matchesSearch(c.name, query));
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
          <DatabaseAnnotationDisplay
            stereotypes={table.stereotypes}
            taggedValues={table.taggedValues}
            layout="compact"
          />
        </button>
        {isExpanded && (
          <div className="database-diagram__tree__table__children">
            {/*
             * Milestoning meta-rows: one per `Milestoning` declaration.
             * Read-only — click does nothing because there is no canvas
             * sub-element to focus on (the tag is rendered on the table
             * node header, which is already shown when the parent row is
             * selected).
             */}
            {table.milestoning.map((milestoning) => {
              const summary = summarizeMilestoning(milestoning);
              return (
                <div
                  // Label is content-derived and unique per milestoning
                  // declaration on a single table.
                  key={summary.label}
                  className={clsx(
                    'database-diagram__tree__table__meta-row',
                    `database-diagram__tree__table__meta-row--milestoning-${summary.kind}`,
                  )}
                  title={summary.description}
                >
                  <span className="database-diagram__tree__table__meta-row__label">
                    milestoning
                  </span>
                  <span className="database-diagram__tree__table__meta-row__value">
                    {summary.label}
                  </span>
                </div>
              );
            })}
            {visibleColumns.map((column) => (
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
 * Renders the View → Filter mapping reference under an expanded view. Shows
 * `<owning-database>.<filterName>`. When the referenced filter belongs to
 * the database currently being edited, clicking navigates to it via
 * `focusOnFilter`; cross-database references are non-interactive (filters
 * from other databases aren't reachable from this editor).
 */
const DatabaseTreeViewFilterRow = observer(
  (props: {
    editorState: DatabaseEditorState;
    view: View;
    filterMapping: FilterMapping;
  }) => {
    const { editorState, view, filterMapping } = props;
    const ownerPath =
      filterMapping.filter.ownerReference.valueForSerialization ?? '';
    const filterValue = filterMapping.filter.value;
    // Filters live on a Database; if the owning DB matches the one we're
    // editing we can navigate. Otherwise the row is informational.
    const isLocal = filterValue.owner === editorState.database;
    const display = `${ownerPath}.${filterMapping.filterName}`;
    const formula = isLocal
      ? resolveFilterFormula(editorState.filterFormulas, filterValue.name)
      : undefined;
    return (
      <button
        type="button"
        className={clsx(
          'database-diagram__tree__column',
          'database-diagram__tree__column--view',
          'database-diagram__tree__column--view-meta',
        )}
        onClick={() => {
          if (isLocal) {
            editorState.focusOnFilter(filterValue);
          } else {
            editorState.focusOnRelation(view);
          }
        }}
        disabled={!isLocal}
        title={
          formula
            ? `${display}: ${formula}`
            : `${display}${isLocal ? '' : ' (external)'}`
        }
      >
        <span className="database-diagram__tree__column__icon">
          <FilterIcon />
        </span>
        <span className="database-diagram__tree__column__name">filter</span>
        <span className="database-diagram__tree__column__type">{display}</span>
      </button>
    );
  },
);

/**
 * Renders one row per `View.groupBy.columns[i]` Pure expression. Each row
 * lazily reads its rendered formula from `viewGroupByFormulas` — until the
 * batched engine call resolves it falls back to a static placeholder.
 *
 * Rows aren't clickable: the underlying RelationalOperationElement isn't a
 * navigable graph node and the parent view is already focused via the
 * surrounding tree row.
 */
const DatabaseTreeViewGroupByRow = observer(
  (props: { editorState: DatabaseEditorState; view: View; index: number }) => {
    const { editorState, view, index } = props;
    const formula = resolveViewGroupByFormula(
      editorState.viewGroupByFormulas,
      view.schema.name,
      view.name,
      index,
    );
    const isLoading =
      editorState.isLoadingViewGroupByFormulas &&
      !editorState.viewGroupByFormulas.has(
        `${view.schema.name}.${view.name}.groupBy[${index}]`,
      );
    return (
      <div
        className={clsx(
          'database-diagram__tree__column',
          'database-diagram__tree__column--view',
          'database-diagram__tree__column--view-meta',
          'database-diagram__tree__column--readonly',
        )}
        title={`group by [${index}]: ${formula}`}
      >
        <span className="database-diagram__tree__column__icon">
          <span className="database-diagram__tree__column__bullet">·</span>
        </span>
        <span className="database-diagram__tree__column__name">{`[${index}]`}</span>
        <span className="database-diagram__tree__column__type">
          {isLoading ? <FormulaSkeleton /> : formula}
        </span>
        {!isLoading && (
          <CopyFormulaButton value={formula} label="Copy expression" />
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
    const query = editorState.searchText.trim().toLowerCase();
    if (!relationMatchesSearch(view, query)) {
      return null;
    }
    const id = getRelationNodeId(view.schema.name, view.name);
    // Same auto-expand-on-filter behavior as tables.
    const isExpanded = query !== '' || editorState.expandedRelationIds.has(id);
    const isSelected = editorState.selectedRelation === view;
    const groupBy: GroupByMapping | undefined = view.groupBy;
    const groupByCount = groupBy?.columns.length ?? 0;
    const viewNameMatches = matchesSearch(view.name, query);
    const visibleMappings =
      query === '' || viewNameMatches
        ? view.columnMappings
        : view.columnMappings.filter((m) => matchesSearch(m.columnName, query));
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
          {view.distinct === true && (
            <span
              className="database-diagram__tree__table__view-tag database-diagram__tree__table__view-tag--distinct"
              title="View applies DISTINCT"
            >
              DISTINCT
            </span>
          )}
          {view.filter && (
            <span
              className="database-diagram__tree__table__view-tag database-diagram__tree__table__view-tag--filtered"
              title={`Filtered by ${
                view.filter.filter.ownerReference.valueForSerialization ?? ''
              }.${view.filter.filterName}`}
            >
              FILTERED
            </span>
          )}
          {groupByCount > 0 && (
            <span
              className="database-diagram__tree__table__view-tag database-diagram__tree__table__view-tag--grouped"
              title={`GROUP BY ${groupByCount} expression${groupByCount === 1 ? '' : 's'}`}
            >
              {`GROUP BY (${groupByCount})`}
            </span>
          )}
          <DatabaseAnnotationDisplay
            stereotypes={view.stereotypes}
            taggedValues={view.taggedValues}
            layout="compact"
          />
        </button>
        {isExpanded && (
          <div className="database-diagram__tree__table__children">
            {visibleMappings.map((mapping) => (
              <DatabaseTreeViewColumnRow
                key={mapping.columnName}
                editorState={editorState}
                view={view}
                columnMapping={mapping}
              />
            ))}
            {/* Filter / groupBy meta-rows hidden under search to keep the
             * filtered result set tightly scoped to name matches. */}
            {query === '' && view.filter && (
              <DatabaseTreeViewFilterRow
                editorState={editorState}
                view={view}
                filterMapping={view.filter}
              />
            )}
            {query === '' &&
              groupBy?.columns.map((_, index) => (
                <DatabaseTreeViewGroupByRow
                  // Ordering is the only identity for groupBy columns.
                  // eslint-disable-next-line react/no-array-index-key
                  key={`groupBy:${index}`}
                  editorState={editorState}
                  view={view}
                  index={index}
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
    const query = editorState.searchText.trim().toLowerCase();
    if (!schemaMatchesSearch(schema, query)) {
      return null;
    }
    const schemaId = getSchemaNodeId(schema.name);
    // Force-expand under search so matches are immediately visible.
    const isExpanded =
      query !== '' || editorState.expandedSchemaIds.has(schemaId);
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
          <DatabaseAnnotationDisplay
            stereotypes={schema.stereotypes}
            taggedValues={schema.taggedValues}
            layout="compact"
          />
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
 * Renders one Lakehouse `IncludeStore` reference: an `ExternalLinkIcon`-
 * suffixed button whose body shows the generator element path and a small
 * `storeType` badge to differentiate the kinds of generator (DataProduct vs
 * IngestDefinition vs whatever future types appear). Clicking opens the
 * generator element in a new tab — same affordance as the classic
 * "Included Stores" rows above. Kept as a named sub-component (not an
 * inline IIFE) so the JSX in `DatabaseSchemaTree` stays readable.
 */
const LakehouseStoreRow = observer(
  (props: { editorState: DatabaseEditorState; spec: IncludeStore }) => {
    const { editorState, spec } = props;
    const path =
      spec.packageableElementPointer.valueForSerialization ??
      spec.packageableElementPointer.value.path;
    return (
      <button
        type="button"
        className="database-diagram__side-panel__included-store"
        title={`${path}\n(generator: ${spec.storeType})\n\n(click to open)`}
        onClick={() =>
          editorState.editorStore.graphEditorMode.openElement(
            spec.packageableElementPointer.value,
          )
        }
      >
        <PURE_DataProductIcon />
        <span className="database-diagram__side-panel__included-store__path">
          {path}
        </span>
        <span className="database-diagram__side-panel__included-store__type">
          {spec.storeType}
        </span>
        <span className="database-diagram__side-panel__included-store__open">
          <ExternalLinkIcon />
        </span>
      </button>
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
    const query = editorState.searchText.trim().toLowerCase();
    // Pre-compute filtered counts so each section header surfaces "showing
    // N of M" feedback when the user is filtering. Cheap walks on the
    // already-typed query \u2014 we don't memoize because the per-render cost
    // is dominated by row JSX, not these filters.
    const visibleSchemas =
      query === ''
        ? database.schemas
        : database.schemas.filter((s) => schemaMatchesSearch(s, query));
    const visibleJoins =
      query === ''
        ? database.joins
        : database.joins.filter((j) => matchesSearch(j.name, query));
    const visibleFilters =
      query === ''
        ? database.filters
        : database.filters.filter((f) => matchesSearch(f.name, query));
    return (
      <div className="database-diagram__side-panel">
        {/*
         * Toolbar: search box + expand-all / collapse-all buttons. Sits at
         * the top of the panel above all sections so it stays reachable
         * even when the panel is scrolled deep into a large schema list.
         */}
        <div className="database-diagram__side-panel__toolbar">
          <div className="database-diagram__side-panel__search">
            <SearchIcon />
            <input
              type="text"
              className="database-diagram__side-panel__search__input"
              placeholder="Filter schemas, tables, columns..."
              value={editorState.searchText}
              onChange={(e) => editorState.setSearchText(e.target.value)}
              spellCheck={false}
            />
            {editorState.searchText !== '' && (
              <button
                type="button"
                className="database-diagram__side-panel__search__clear"
                title="Clear filter"
                onClick={() => editorState.setSearchText('')}
              >
                <TimesIcon />
              </button>
            )}
          </div>
          <button
            type="button"
            className="database-diagram__side-panel__toolbar__btn"
            title="Expand all schemas"
            onClick={() => editorState.expandAllSchemas()}
          >
            <ExpandAllIcon />
          </button>
          <button
            type="button"
            className="database-diagram__side-panel__toolbar__btn"
            title="Collapse all"
            onClick={() => editorState.collapseAll()}
          >
            <CompressIcon />
          </button>
        </div>

        {(database.stereotypes.length > 0 ||
          database.taggedValues.length > 0) && (
          <div className="database-diagram__side-panel__section">
            <div className="database-diagram__side-panel__section__header">
              Annotations
            </div>
            <div className="database-diagram__side-panel__annotations">
              <DatabaseAnnotationDisplay
                stereotypes={database.stereotypes}
                taggedValues={database.taggedValues}
                layout="block"
              />
            </div>
          </div>
        )}
        <div className="database-diagram__side-panel__section">
          <div className="database-diagram__side-panel__section__header">
            Schemas{' '}
            <span className="database-diagram__side-panel__section__count">
              {query === ''
                ? `(${database.schemas.length})`
                : `(${visibleSchemas.length}/${database.schemas.length})`}
            </span>
          </div>
          {database.schemas.length === 0 ? (
            <EmptySectionRow message="No schemas defined." />
          ) : visibleSchemas.length === 0 ? (
            <EmptySectionRow message="No schemas match the current filter." />
          ) : (
            database.schemas.map((schema) => (
              <DatabaseTreeSchemaRow
                key={schema.name}
                editorState={editorState}
                schema={schema}
              />
            ))
          )}
        </div>

        <div className="database-diagram__side-panel__section">
          <div className="database-diagram__side-panel__section__header">
            Joins{' '}
            <span className="database-diagram__side-panel__section__count">
              {query === ''
                ? `(${database.joins.length})`
                : `(${visibleJoins.length}/${database.joins.length})`}
            </span>
          </div>
          {database.joins.length === 0 ? (
            <EmptySectionRow message="No joins defined." />
          ) : visibleJoins.length === 0 ? (
            <EmptySectionRow message="No joins match the current filter." />
          ) : (
            visibleJoins.map((join) => {
              const isSelected = editorState.selectedJoin === join;
              const formula = resolveJoinFormula(
                editorState.joinFormulas,
                join.name,
              );
              const isLoading =
                editorState.isLoadingJoinFormulas &&
                !editorState.joinFormulas.has(join.name);
              const selfJoin = isSelfJoin(join);
              const crossDb = !selfJoin && isCrossDatabaseJoin(join, database);
              return (
                <button
                  key={join.name}
                  type="button"
                  className={clsx('database-diagram__side-panel__join', {
                    'database-diagram__side-panel__join--selected': isSelected,
                  })}
                  onClick={() => editorState.focusOnJoin(join)}
                  title={`${join.name}: ${formula}`}
                >
                  <span className="database-diagram__side-panel__join__icon">
                    <PURE_DatabaseTableJoinIcon />
                  </span>
                  <span className="database-diagram__side-panel__join__body">
                    <span className="database-diagram__side-panel__join__name">
                      {join.name}
                      {selfJoin && (
                        <span
                          className="database-diagram__side-panel__join__marker database-diagram__side-panel__join__marker--self"
                          title="Self-join (source and target are the same relation)"
                        >
                          SELF
                        </span>
                      )}
                      {crossDb && (
                        <span
                          className="database-diagram__side-panel__join__marker database-diagram__side-panel__join__marker--cross-db"
                          title="Cross-database join (one or both endpoints live in an included store)"
                        >
                          CROSS-DB
                        </span>
                      )}
                    </span>
                    {/*
                     * Rendered Pure code under the join name — same visual
                     * treatment as filter rows. Empty/missing formulas fall
                     * back to a placeholder so the row height stays uniform.
                     */}
                    <span className="database-diagram__side-panel__join__formula">
                      {isLoading ? <FormulaSkeleton /> : formula}
                    </span>
                  </span>
                  {!isLoading && (
                    <CopyFormulaButton
                      value={formula}
                      label="Copy join formula"
                    />
                  )}
                </button>
              );
            })
          )}
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
              {query === ''
                ? `(${database.filters.length})`
                : `(${visibleFilters.length}/${database.filters.length})`}
            </span>
          </div>
          {database.filters.length === 0 ? (
            <EmptySectionRow message="No filters defined." />
          ) : visibleFilters.length === 0 ? (
            <EmptySectionRow message="No filters match the current filter." />
          ) : (
            visibleFilters.map((filter) => {
              const isSelected = editorState.selectedFilter === filter;
              const formula = resolveFilterFormula(
                editorState.filterFormulas,
                filter.name,
              );
              const isLoading =
                editorState.isLoadingFilterFormulas &&
                !editorState.filterFormulas.has(filter.name);
              return (
                <button
                  key={filter.name}
                  type="button"
                  className={clsx('database-diagram__side-panel__filter', {
                    'database-diagram__side-panel__filter--selected':
                      isSelected,
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
                      {isLoading ? <FormulaSkeleton /> : formula}
                    </span>
                  </span>
                  {!isLoading && (
                    <CopyFormulaButton
                      value={formula}
                      label="Copy filter formula"
                    />
                  )}
                </button>
              );
            })
          )}
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

        {/*
         * `database.includedStoreSpecifications` is the newer Lakehouse-
         * oriented include list — references to a `DataProduct` or
         * `IngestDefinition` whose generated database schemas/joins/filters
         * become reachable from this one. Distinct from `database.includes`
         * (classic DB→DB inclusion) so it gets its own section. Each row
         * shows the generator element path and tags it with `storeType` so
         * users can tell DataProduct-backed includes from ingest-backed
         * ones at a glance. Clicking opens the generator element editor.
         */}
        {database.includedStoreSpecifications.length > 0 && (
          <div className="database-diagram__side-panel__section">
            <div className="database-diagram__side-panel__section__header">
              Lakehouse Stores{' '}
              <span className="database-diagram__side-panel__section__count">
                ({database.includedStoreSpecifications.length})
              </span>
            </div>
            {database.includedStoreSpecifications.map((spec) => (
              <LakehouseStoreRow
                key={`${spec.storeType}:${spec.packageableElementPointer.value.path}`}
                editorState={editorState}
                spec={spec}
              />
            ))}
          </div>
        )}
      </div>
    );
  },
);
