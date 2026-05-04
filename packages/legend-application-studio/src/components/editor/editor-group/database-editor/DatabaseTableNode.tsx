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
} from './DatabaseDiagramHelper.js';

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
   *  highlight inside the matching table node. Tables only — views don't
   *  participate in column-level selection in the MVP. */
  selectedColumn: Column | undefined;
  /**
   * Lookup table for view-column Pure-code formulas, keyed by
   *  `<schema>.<view>.<column>`. Forwarded from the editor state via the
   *  canvas. Empty until `loadViewColumnFormulas` resolves; consumers fall
   *  back to a static placeholder per `resolveViewColumnFormula`. Empty for
   *  table-kind nodes (we still pass it for prop-shape stability).
   */
  viewColumnFormulas: ReadonlyMap<string, string>;
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
      viewColumnFormulas,
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
          <div className="database-diagram__table-node__header__schema">
            {schemaName}
          </div>
        </div>

        <div className="database-diagram__table-node__columns">
          {isViewKind
            ? renderViewColumns(relation as View, viewColumnFormulas)
            : renderTableColumns(relation as Table, fkColumns, selectedColumn)}
        </div>
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
): ReactElement[] {
  return view.columnMappings.map((mapping) => {
    const isPk = isPrimaryKey(view, mapping.columnName);
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
