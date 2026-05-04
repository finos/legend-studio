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

import dagre from '@dagrejs/dagre';
import { filterByType } from '@finos/legend-shared';
import {
  Column,
  type Database,
  type Join,
  type Schema,
  type Table,
  View,
  type RelationalOperationElement,
  stringifyDataType,
} from '@finos/legend-graph';

/**
 * Tables and Views are the two top-level "relations" a Database schema can
 * contain. They share a common metamodel ancestor (NamedRelation) and almost
 * the same on-canvas treatment, so most helpers and the React node component
 * accept either.
 */
export type DatabaseRelation = Table | View;

export const isView = (relation: DatabaseRelation): relation is View =>
  relation instanceof View;

/**
 * Stable identifier for a relation within a Database, encoded as
 * `<schema>.<name>`. Schema-qualified to disambiguate same-named relations
 * across schemas. Works for both Tables and Views.
 */
export const getRelationId = (relation: DatabaseRelation): string =>
  `${relation.schema.name}.${relation.name}`;

/**
 * Display string for a relational data type (e.g. `VARCHAR(40)`,
 * `DECIMAL(10,4)`). Wraps the upstream helper so the editor doesn't need to
 * know about RelationalDataType subclasses directly.
 */
export const getColumnTypeLabel = (column: Column): string =>
  stringifyDataType(column.type);

/**
 * `Relation.columns` is statically typed as `RelationalOperationElement[]`
 * (the broader supertype) but is populated with `Column` instances at runtime
 * for tables. Filter so the form-mode editor can rely on the narrower type
 * without casting at every call site.
 */
export const getTableColumns = (table: Table): Column[] =>
  table.columns.filter(filterByType(Column));

/**
 * Whether a column participates in a relation's primary key. Both Tables and
 * Views can declare a primary key (`primaryKey: Column[]`). For Views we
 * compare by name because a view's `columnMappings` carry their column name
 * directly rather than referencing the same `Column` instances.
 */
export const isPrimaryKey = (
  relation: DatabaseRelation,
  columnName: string,
): boolean => relation.primaryKey.some((pk) => pk.name === columnName);

/**
 * Placeholder text shown while view-column Pure-code formulas are still
 * loading (or if rendering them failed). Centralized so both the canvas
 * table node and the tree column row stay in sync.
 */
export const VIEW_COLUMN_FORMULA_PLACEHOLDER = 'calculate [...]';

/**
 * Resolve the Pure-code formula for a single view column mapping. Looks the
 * pre-rendered formula up by `<schema>.<view>.<column>` key in the map
 * populated by `DatabaseEditorState.loadViewColumnFormulas()`. Falls back to
 * a static placeholder when the formula isn't ready yet (initial load,
 * background re-render) or the engine couldn't render it.
 *
 * The map is passed in (not read directly here) so this module stays
 * framework-agnostic — DatabaseDiagramHelper has no MobX dependency.
 */
export const resolveViewColumnFormula = (
  formulas: ReadonlyMap<string, string>,
  schemaName: string,
  viewName: string,
  columnName: string,
): string =>
  formulas.get(`${schemaName}.${viewName}.${columnName}`) ??
  VIEW_COLUMN_FORMULA_PLACEHOLDER;

/**
 * Placeholder text shown while filter Pure-code formulas are still loading
 * (or if rendering them failed). Centralized so the side-panel filter row
 * has a sensible fallback during the brief async window.
 */
export const FILTER_FORMULA_PLACEHOLDER = 'filter [...]';

/**
 * Resolve the Pure-code formula for a single database-level filter. Filter
 * names are unique within a Database, so the lookup key is just the filter
 * name (no schema qualifier needed). Falls back to a static placeholder when
 * the formula isn't ready yet or the engine couldn't render it.
 */
export const resolveFilterFormula = (
  formulas: ReadonlyMap<string, string>,
  filterName: string,
): string => formulas.get(filterName) ?? FILTER_FORMULA_PLACEHOLDER;

/**
 * Number of column rows a relation's table-node will render. Tables expose
 * Column[] via `columns`, Views expose ColumnMapping[] via `columnMappings`.
 */
export const getRelationColumnCount = (relation: DatabaseRelation): number =>
  isView(relation)
    ? relation.columnMappings.length
    : getTableColumns(relation).length;

const collectColumnsFromOperation = (
  // The operation tree includes DynaFunction with parameters, TableAliasColumn,
  // Literal, etc. We descend it loosely to collect any column references.
  operation: RelationalOperationElement | undefined,
  acc: Set<Column>,
): void => {
  if (operation === undefined) {
    return;
  }
  // TableAliasColumn has a `column.value: Column`
  const candidate = operation as {
    column?: { value?: Column };
    parameters?: RelationalOperationElement[];
  };
  if (candidate.column?.value) {
    acc.add(candidate.column.value);
  }
  if (Array.isArray(candidate.parameters)) {
    candidate.parameters.forEach((p) => collectColumnsFromOperation(p, acc));
  }
};

/**
 * Identify columns that participate in any join in the database. Used to badge
 * columns as foreign keys in the table node.
 *
 * Note: in Pure relational, joins ARE the relationships — there is no separate
 * FK constraint on the column. A column is "FK-like" iff some join's operation
 * references it.
 */
export const collectForeignKeyColumns = (database: Database): Set<Column> => {
  const fkColumns = new Set<Column>();
  database.joins.forEach((join) => {
    collectColumnsFromOperation(join.operation, fkColumns);
  });
  return fkColumns;
};

export interface DatabaseDiagramJoinEdge {
  /** Stable id used by React Flow. */
  id: string;
  /** Join name (used as edge label). */
  name: string;
  /** Source relation id (`<schema>.<name>`). */
  source: string;
  /** Target relation id (`<schema>.<name>`). */
  target: string;
  /** Original `Join` reference for identity-based selection matching. */
  join: Join;
}

/**
 * Walk all joins in the database and produce a deduplicated list of edges
 * between relations (tables and/or views).
 *
 * Implementation notes:
 * - `Join.aliases` typically contains both directions `(A→B)` and `(B→A)` as a
 *   lookup optimization. We treat A↔B as a single edge and use the first alias.
 * - Self-joins (A↔A) are skipped for MVP.
 * - Joins whose endpoints reference relations not in this database (e.g.
 *   through `includes`) are skipped.
 */
export const buildJoinEdges = (
  database: Database,
): DatabaseDiagramJoinEdge[] => {
  const ownIds = new Set<string>();
  database.schemas.forEach((schema) => {
    schema.tables.forEach((table) => ownIds.add(getRelationId(table)));
    schema.views.forEach((view) => ownIds.add(getRelationId(view)));
  });

  const edges: DatabaseDiagramJoinEdge[] = [];
  database.joins.forEach((join: Join) => {
    const firstPair = join.aliases[0];
    if (!firstPair) {
      return;
    }
    const sourceRelation = firstPair.first.relation.value;
    const targetRelation = firstPair.second.relation.value;
    const sourceId = `${sourceRelation.schema.name}.${sourceRelation.name}`;
    const targetId = `${targetRelation.schema.name}.${targetRelation.name}`;
    if (sourceId === targetId) {
      return; // skip self-joins for MVP
    }
    if (!ownIds.has(sourceId) || !ownIds.has(targetId)) {
      return; // skip cross-database joins for MVP
    }
    edges.push({
      id: `join:${join.name}`,
      name: join.name,
      source: sourceId,
      target: targetId,
      join,
    });
  });
  return edges;
};

export interface LaidOutNode {
  id: string;
  x: number;
  y: number;
}

export interface DatabaseDiagramRelationNode {
  id: string;
  relation: DatabaseRelation;
  /** Estimated height in pixels — driven by column count for dagre layout. */
  estimatedHeight: number;
}

const NODE_WIDTH = 240;
const NODE_HEADER_HEIGHT = 36;
const NODE_COL_HEIGHT = 22;
const NODE_PADDING = 8;

export const estimateNodeHeight = (relation: DatabaseRelation): number =>
  NODE_HEADER_HEIGHT +
  getRelationColumnCount(relation) * NODE_COL_HEIGHT +
  NODE_PADDING;

/**
 * Run dagre on the relation/edge graph and return positions keyed by
 * relation id. Uses left-to-right layering, which suits ERDs better than
 * top-down.
 */
export const layoutDatabaseDiagram = (
  nodes: DatabaseDiagramRelationNode[],
  edges: DatabaseDiagramJoinEdge[],
): Map<string, LaidOutNode> => {
  const g = new dagre.graphlib.Graph<{ width: number; height: number }>();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'LR',
    nodesep: 60,
    ranksep: 120,
    marginx: 20,
    marginy: 20,
  });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: node.estimatedHeight });
  });
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const out = new Map<string, LaidOutNode>();
  nodes.forEach((node) => {
    const laidOut = g.node(node.id) as
      | { x: number; y: number; width: number; height: number }
      | undefined;
    if (laidOut) {
      // dagre returns center; React Flow expects top-left.
      out.set(node.id, {
        id: node.id,
        x: laidOut.x - laidOut.width / 2,
        y: laidOut.y - laidOut.height / 2,
      });
    } else {
      out.set(node.id, { id: node.id, x: 0, y: 0 });
    }
  });
  return out;
};

/**
 * Flat list of (schema, relation) pairs in deterministic order — used by the
 * canvas builder. Tables come before views within each schema (alphabetic
 * within each kind), so the canvas layout stays stable as a database grows.
 */
export const getOrderedRelations = (
  database: Database,
): { schema: Schema; relation: DatabaseRelation }[] => {
  const pairs: { schema: Schema; relation: DatabaseRelation }[] = [];
  database.schemas
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((schema) => {
      schema.tables
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((table) => pairs.push({ schema, relation: table }));
      schema.views
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((view) => pairs.push({ schema, relation: view }));
    });
  return pairs;
};
