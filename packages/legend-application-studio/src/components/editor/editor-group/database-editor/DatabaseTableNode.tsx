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

import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  EyeIcon,
  KeyIcon,
  PURE_DatabaseIcon,
  PURE_DatabaseTableIcon,
  clsx,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import type { ReactElement } from 'react';
import type { Column, Table, View } from '@finos/legend-graph';
import {
  getColumnTypeLabel,
  getTableColumns,
  isPrimaryKey,
  resolveViewColumnFormula,
  resolveViewGroupByFormula,
  summarizeMilestoning,
} from './DatabaseDiagramHelper.js';
import { DatabaseAnnotationDisplay } from './DatabaseAnnotationDisplay.js';

/**
 * Discriminator for the two relation kinds the canvas renders. Drives icon
 * choice, column-row content (type vs. formula), and the SCSS color tint.
 */
export type DatabaseTableNodeKind = 'table' | 'view';

export interface DatabaseTableNodeData extends Record<string, unknown> {
  /** The underlying Table or View — narrow with `kind` before accessing
   *  kind-specific fields like `Table.primaryKey` or `View.columnMappings`. */
  relation: Table | View;
  kind: DatabaseTableNodeKind;
  schemaName: string;
  /** True when THIS relation is the currently selected one (blue ring). */
  isSelected: boolean;
  /** True when THIS relation is one of the two endpoints of the currently
   *  selected join (yellow ring — visually distinct from blue selection). */
  isJoinEndpoint: boolean;
  /** Columns that participate in any join in the database. Used to tint
   *  table columns in blue ("FK-like"). Doesn't apply to views. */
  fkColumns: Set<Column>;
  /** Column currently focused via the side-panel. Drives the single-row
   *  highlight inside the matching table node. Tables only — views use
   *  `selectedViewColumnName` since their "columns" are mapping names. */
  selectedColumn: Column | undefined;
  /** Name of the view column-mapping currently focused via the side panel.
   *  Mirrors `selectedColumn` but for views, where mappings don't have
   *  `Column` instances. Always `undefined` for table-kind nodes. */
  selectedViewColumnName: string | undefined;
  /**
   * Lookup table for view-column Pure-code formulas, keyed by
   *  `<schema>.<view>.<column>`. Forwarded from the editor state via the
   *  canvas. Empty until `loadViewColumnFormulas` resolves; consumers fall
   *  back to a static placeholder per `resolveViewColumnFormula`. Empty for
   *  table-kind nodes (we still pass it for prop-shape stability).
   */
  viewColumnFormulas: ReadonlyMap<string, string>;
  /**
   * Lookup table for view groupBy Pure-code expressions, keyed by
   *  `<schema>.<view>.groupBy[<index>]`. Forwarded from the editor state
   *  via the canvas alongside `viewColumnFormulas`; same lazy-load story
   *  with a separate static placeholder per `resolveViewGroupByFormula`.
   *  Empty for table-kind nodes and for views with no groupBy.
   */
  viewGroupByFormulas: ReadonlyMap<string, string>;
}

/**
 * View-only React Flow node representing a single relation (Table or View).
 *
 * Layout: header (icon + relation name + schema badge + optional VIEW tag) +
 * a list of column rows. Each row is a fixed-height grid:
 *   - Tables: [PK key icon | column name | column type]
 *   - Views:  [bullet       | column name | formula placeholder]
 *
 * Two invisible Handles (left/right) let React Flow route edges into either
 * side of the box without committing to a specific column anchor.
 */
export const DatabaseTableNode = observer(
  (props: NodeProps & { data: DatabaseTableNodeData }) => {
    const {
      relation,
      kind,
      schemaName,
      isSelected,
      isJoinEndpoint,
      fkColumns,
      selectedColumn,
      selectedViewColumnName,
      viewColumnFormulas,
      viewGroupByFormulas,
    } = props.data;
    const isViewKind = kind === 'view';
    return (
      <div
        className={clsx('database-diagram__table-node', {
          'database-diagram__table-node--selected': isSelected,
          'database-diagram__table-node--join-endpoint': isJoinEndpoint,
          'database-diagram__table-node--view': isViewKind,
        })}
      >
        <Handle
          type="target"
          position={Position.Left}
          className="database-diagram__table-node__handle"
          isConnectable={false}
        />
        <Handle
          type="source"
          position={Position.Right}
          className="database-diagram__table-node__handle"
          isConnectable={false}
        />

        <div className="database-diagram__table-node__header">
          <div className="database-diagram__table-node__header__icon">
            {isViewKind ? <EyeIcon /> : <PURE_DatabaseTableIcon />}
          </div>
          <div className="database-diagram__table-node__header__name">
            {relation.name}
          </div>
          {isViewKind && (
            <div className="database-diagram__table-node__header__kind-tag">
              VIEW
            </div>
          )}
          {isViewKind && renderViewMetadataTags(relation as View)}
          {!isViewKind && renderMilestoningTags(relation as Table)}
          <div className="database-diagram__table-node__header__schema">
            {schemaName}
          </div>
          {/*
           * Compact annotation badge — shows only the count plus a tag
           * icon, with the full content surfaced via tooltip. The header
           * row is dense (icon, name, kind tag, schema) so we deliberately
           * pick the compact layout here rather than rendering pills.
           */}
          <DatabaseAnnotationDisplay
            stereotypes={relation.stereotypes}
            taggedValues={relation.taggedValues}
            layout="compact"
          />
        </div>

        <div className="database-diagram__table-node__columns">
          {isViewKind
            ? renderViewColumns(
                relation as View,
                viewColumnFormulas,
                selectedViewColumnName,
              )
            : renderTableColumns(relation as Table, fkColumns, selectedColumn)}
        </div>
        {isViewKind &&
          renderViewGroupBySection(relation as View, viewGroupByFormulas)}
      </div>
    );
  },
);

// Function declarations (not const arrow) so they're hoisted and the React
// component above can call them without triggering `no-use-before-define`.
function renderTableColumns(
  table: Table,
  fkColumns: Set<Column>,
  selectedColumn: Column | undefined,
): ReactElement[] {
  return getTableColumns(table).map((column) => {
    const isPk = isPrimaryKey(table, column.name);
    const isFk = fkColumns.has(column);
    const isFocused = selectedColumn === column;
    return (
      <div
        key={column.name}
        className={clsx('database-diagram__table-node__column', {
          'database-diagram__table-node__column--pk': isPk,
          'database-diagram__table-node__column--fk': isFk,
          'database-diagram__table-node__column--nullable':
            column.nullable === true,
          'database-diagram__table-node__column--focused': isFocused,
        })}
        title={column.nullable ? `${column.name} (nullable)` : column.name}
      >
        <div className="database-diagram__table-node__column__key">
          {isPk ? <KeyIcon /> : null}
        </div>
        <div className="database-diagram__table-node__column__name">
          {column.name}
        </div>
        <div className="database-diagram__table-node__column__type">
          {getColumnTypeLabel(column)}
        </div>
      </div>
    );
  });
}

/**
 * View columns are defined by `view.columnMappings` rather than `Column[]`.
 * Each mapping carries the column name and a relational operation that
 * computes the value. We render the Pure code returned by the engine (cached
 * in `DatabaseEditorState.viewColumnFormulas`); while it's still loading we
 * fall back to a placeholder so the layout stays stable.
 *
 * The `title` attribute also surfaces the formula for tooltip-on-hover, since
 * complex formulas may not fit in the 1-line display.
 */
function renderViewColumns(
  view: View,
  formulas: ReadonlyMap<string, string>,
  selectedViewColumnName: string | undefined,
): ReactElement[] {
  return view.columnMappings.map((mapping) => {
    const isPk = isPrimaryKey(view, mapping.columnName);
    const isFocused = selectedViewColumnName === mapping.columnName;
    const formula = resolveViewColumnFormula(
      formulas,
      view.schema.name,
      view.name,
      mapping.columnName,
    );
    return (
      <div
        key={mapping.columnName}
        className={clsx('database-diagram__table-node__column', {
          'database-diagram__table-node__column--pk': isPk,
          'database-diagram__table-node__column--view': true,
          'database-diagram__table-node__column--focused': isFocused,
        })}
        title={`${mapping.columnName}: ${formula}`}
      >
        <div className="database-diagram__table-node__column__key">
          {isPk ? <KeyIcon /> : null}
        </div>
        <div className="database-diagram__table-node__column__name">
          {mapping.columnName}
        </div>
        <div className="database-diagram__table-node__column__type">
          {formula}
        </div>
      </div>
    );
  });
}

/**
 * Render the secondary view-metadata tags shown next to the primary "VIEW"
 * tag in the canvas node header. These mirror the tags rendered in the
 * schema tree's view row (see `DatabaseTreeViewRow`) so the two surfaces
 * stay in sync.
 *
 * Returns `null` when the view has none of these features set, so the
 * header stays compact for "plain" views.
 */
function renderViewMetadataTags(view: View): ReactElement | null {
  const groupByCount = view.groupBy?.columns.length ?? 0;
  const hasDistinct = view.distinct === true;
  const hasFilter = Boolean(view.filter);
  const hasGroupBy = groupByCount > 0;
  if (!hasDistinct && !hasFilter && !hasGroupBy) {
    return null;
  }
  return (
    <>
      {hasDistinct && (
        <div
          className="database-diagram__table-node__header__kind-tag database-diagram__table-node__header__kind-tag--distinct"
          title="View applies DISTINCT"
        >
          DISTINCT
        </div>
      )}
      {hasFilter && view.filter && (
        <div
          className="database-diagram__table-node__header__kind-tag database-diagram__table-node__header__kind-tag--filtered"
          title={`Filtered by ${
            view.filter.filter.ownerReference.valueForSerialization ?? ''
          }.${view.filter.filterName}`}
        >
          FILTERED
        </div>
      )}
      {hasGroupBy && (
        <div
          className="database-diagram__table-node__header__kind-tag database-diagram__table-node__header__kind-tag--grouped"
          title={`GROUP BY ${groupByCount} expression${groupByCount === 1 ? '' : 's'}`}
        >
          {`GROUP BY (${groupByCount})`}
        </div>
      )}
    </>
  );
}

/**
 * Compact header tags surfacing a table's `milestoning` configuration.
 * One tag per Milestoning entry (a table can declare both business and
 * processing milestoning). The tag color follows the kind classifier from
 * `summarizeMilestoning` so business and processing read distinctly.
 *
 * Returns `null` for non-milestoned tables to keep the header compact \u2014
 * the vast majority of tables are not milestoned.
 */
function renderMilestoningTags(table: Table): ReactElement | null {
  if (table.milestoning.length === 0) {
    return null;
  }
  return (
    <>
      {table.milestoning.map((milestoning) => {
        const summary = summarizeMilestoning(milestoning);
        return (
          <div
            // The label is content-derived (e.g. `business[from…thru]`)
            // and is unique per milestoning declaration on a single table
            // — the metamodel has no other stable identifier.
            key={summary.label}
            className={clsx(
              'database-diagram__table-node__header__kind-tag',
              `database-diagram__table-node__header__kind-tag--milestoned-${summary.kind}`,
            )}
            title={summary.description}
          >
            {summary.label}
          </div>
        );
      })}
    </>
  );
}

/**
 * Footer rendered under the column rows when a view declares `groupBy`.
 * Lists each grouping expression as one row of Pure code (lazy-resolved
 * from `viewGroupByFormulas` — falls back to a placeholder while the
 * batched engine call is in flight).
 *
 * Returns `null` for views with no groupBy and for table-kind nodes, so the
 * footer doesn't add visual weight to nodes that don't need it.
 */
function renderViewGroupBySection(
  view: View,
  formulas: ReadonlyMap<string, string>,
): ReactElement | null {
  const columns = view.groupBy?.columns ?? [];
  if (columns.length === 0) {
    return null;
  }
  return (
    <div
      className="database-diagram__table-node__group-by"
      title={`GROUP BY (${columns.length})`}
    >
      <div className="database-diagram__table-node__group-by__header">
        GROUP BY
      </div>
      {columns.map((_, index) => {
        const formula = resolveViewGroupByFormula(
          formulas,
          view.schema.name,
          view.name,
          index,
        );
        return (
          <div
            // The resolved formula text is the only content-derived stable
            // identity for groupBy expressions — the metamodel exposes
            // them as an unnamed flat list.
            key={formula}
            className="database-diagram__table-node__group-by__row"
            title={formula}
          >
            <span className="database-diagram__table-node__group-by__index">
              {`[${index}]`}
            </span>
            <span className="database-diagram__table-node__group-by__formula">
              {formula}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Data attached to the placeholder node that stands in for a relation that
 * lives in another database (cross-database join endpoint). Rendered
 * smaller and visually distinct so users can tell at a glance that the
 * actual relation isn't part of this database's schema tree.
 */
export interface DatabaseForeignRelationStubNodeData
  extends Record<string, unknown> {
  schemaName: string;
  relationName: string;
  /** Path of the database that actually owns the relation. Surfaced in the
   *  tooltip so users know where to navigate to see the real definition. */
  ownerPath: string;
  isJoinEndpoint: boolean;
}

/**
 * Compact stub rendered when a join references a relation in another
 * database. Shows the schema/name plus the owning database path, with a
 * dashed border to distinguish it from real in-database table nodes. Two
 * invisible Handles let React Flow attach edges to either side. Not
 * selectable — the canvas swallows clicks on stubs.
 */
export const DatabaseForeignRelationStubNode = observer(
  (props: NodeProps & { data: DatabaseForeignRelationStubNodeData }) => {
    const { schemaName, relationName, ownerPath, isJoinEndpoint } = props.data;
    return (
      <div
        className={clsx(
          'database-diagram__table-node',
          'database-diagram__table-node--foreign-stub',
          {
            'database-diagram__table-node--join-endpoint': isJoinEndpoint,
          },
        )}
        title={`${schemaName}.${relationName}\n(in database: ${ownerPath})`}
      >
        <Handle
          type="target"
          position={Position.Left}
          className="database-diagram__table-node__handle"
          isConnectable={false}
        />
        <Handle
          type="source"
          position={Position.Right}
          className="database-diagram__table-node__handle"
          isConnectable={false}
        />
        <div className="database-diagram__table-node__header">
          <div className="database-diagram__table-node__header__icon">
            <PURE_DatabaseIcon />
          </div>
          <div className="database-diagram__table-node__header__name">
            {`${schemaName}.${relationName}`}
          </div>
        </div>
        <div className="database-diagram__table-node__foreign-stub__owner">
          {ownerPath}
        </div>
      </div>
    );
  },
);
