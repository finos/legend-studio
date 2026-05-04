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
  BusinessMilestoning,
  BusinessSnapshotMilestoning,
  Column,
  type Database,
  type Join,
  type Milestoning,
  ProcessingMilestoning,
  ProcessingSnapshotMilestoning,
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
 * Placeholder shown while a join's Pure-code operation is loading or if
 * rendering failed. Same async-load pattern as filters and view-column
 * formulas — reused so the side panel and canvas tooltips stay in sync.
 */
export const JOIN_FORMULA_PLACEHOLDER = 'join [...]';

export const resolveJoinFormula = (
  formulas: ReadonlyMap<string, string>,
  joinName: string,
): string => formulas.get(joinName) ?? JOIN_FORMULA_PLACEHOLDER;

/**
 * Placeholder shown for view groupBy expressions while the engine render
 * is in flight or if rendering failed. Kept distinct from the column-mapping
 * placeholder so users can tell at a glance which kind of expression is
 * still loading.
 */
export const VIEW_GROUP_BY_FORMULA_PLACEHOLDER = 'group by [...]';

/**
 * Resolve the Pure-code formula for a single view groupBy column expression.
 * Keys mirror the loader in `DatabaseEditorState`:
 * `<schema>.<view>.groupBy[<index>]`. Falls back to the static placeholder
 * when the formula isn't ready yet.
 */
export const resolveViewGroupByFormula = (
  formulas: ReadonlyMap<string, string>,
  schemaName: string,
  viewName: string,
  index: number,
): string =>
  formulas.get(`${schemaName}.${viewName}.groupBy[${index}]`) ??
  VIEW_GROUP_BY_FORMULA_PLACEHOLDER;

/**
 * Lowercase, trimmed search-text matcher used by the side-panel tree.
 * Empty query matches everything (so consumers don't need a special case).
 * Match is case-insensitive substring \u2014 not fuzzy \u2014 because users
 * typically know the exact prefix of the schema/relation/column they're
 * looking for and substring keeps the "what matched" obvious.
 */
export const matchesSearch = (name: string, query: string): boolean => {
  if (!query) {
    return true;
  }
  return name.toLowerCase().includes(query);
};

/**
 * Renders a single `Milestoning` instance into a short, grammar-flavored
 * label and a longer human description. Mirrors the four concrete subclasses
 * the metamodel ships today:
 *
 *   - `BusinessMilestoning`         — `business[from..thru]` ("thru inclusive" tag)
 *   - `BusinessSnapshotMilestoning` — `business snapshot(<col>)`
 *   - `ProcessingMilestoning`       — `processing[in..out]` ("out inclusive" tag)
 *   - `ProcessingSnapshotMilestoning` — `processing snapshot(<col>)`
 *
 * Unknown subclasses (extension milestonings introduced via plugins) fall
 * back to the constructor name so the user at least sees "something is
 * configured here" instead of a silent omission.
 */
export interface MilestoningSummary {
  /** Short grammar-style label, e.g. `business[from..thru]`. */
  label: string;
  /** Longer human-readable description used as the tooltip. */
  description: string;
  /** Stable kind tag for styling: `business` | `processing` | `unknown`. */
  kind: 'business' | 'processing' | 'unknown';
}

export const summarizeMilestoning = (
  milestoning: Milestoning,
): MilestoningSummary => {
  if (milestoning instanceof BusinessMilestoning) {
    const inclusive = milestoning.thruIsInclusive ? ', thru inclusive' : '';
    return {
      label: `business[${milestoning.from}\u2026${milestoning.thru}]`,
      description: `Business milestoning on columns ${milestoning.from} \u2192 ${milestoning.thru}${inclusive}`,
      kind: 'business',
    };
  }
  if (milestoning instanceof BusinessSnapshotMilestoning) {
    return {
      label: `business snapshot(${milestoning.snapshotDate})`,
      description: `Business snapshot milestoning on column ${milestoning.snapshotDate}`,
      kind: 'business',
    };
  }
  if (milestoning instanceof ProcessingMilestoning) {
    const inclusive = milestoning.outIsInclusive ? ', out inclusive' : '';
    return {
      label: `processing[${milestoning.in}\u2026${milestoning.out}]`,
      description: `Processing milestoning on columns ${milestoning.in} \u2192 ${milestoning.out}${inclusive}`,
      kind: 'processing',
    };
  }
  if (milestoning instanceof ProcessingSnapshotMilestoning) {
    return {
      label: `processing snapshot(${milestoning.snapshotDate})`,
      description: `Processing snapshot milestoning on column ${milestoning.snapshotDate}`,
      kind: 'processing',
    };
  }
  // Plugin-defined milestoning kinds: surface the class name so the user
  // at least knows the table is milestoned even if we can't decode it.
  const className = milestoning.constructor.name;
  return {
    label: className,
    description: `Custom milestoning (${className})`,
    kind: 'unknown',
  };
};

/**
 * Whether a join's two endpoints are the same relation (e.g. a hierarchy
 * self-join: `Employee → Employee` on `managerId = id`). We treat any join
 * whose first alias pair has identical source/target relation ids as a
 * self-join — mirrors how `buildJoinEdges` matches endpoints.
 */
export const isSelfJoin = (join: Join): boolean => {
  const firstPair = join.aliases[0];
  if (!firstPair) {
    return false;
  }
  const source = firstPair.first.relation.value;
  const target = firstPair.second.relation.value;
  return (
    source.schema.name === target.schema.name && source.name === target.name
  );
};

/**
 * Whether either endpoint of a join lives outside `database` (i.e. resolves
 * to a relation owned by another, included, store). Used to surface a
 * "CROSS-DB" badge in the side panel and to render the canvas placeholder
 * node for the foreign endpoint.
 */
export const isCrossDatabaseJoin = (
  join: Join,
  database: Database,
): boolean => {
  const firstPair = join.aliases[0];
  if (!firstPair) {
    return false;
  }
  const sourceOwner = firstPair.first.relation.value.schema._OWNER;
  const targetOwner = firstPair.second.relation.value.schema._OWNER;
  return sourceOwner !== database || targetOwner !== database;
};

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
  /** True when both endpoints are the same relation (self-join). React Flow
   *  renders these as loop edges; we use this flag so the canvas can pick a
   *  distinct edge type / styling without re-walking aliases. */
  isSelfJoin: boolean;
  /** True when at least one endpoint is *not* in this database. The missing
   *  endpoint is rendered as a stub placeholder node instead of a real
   *  table-node so users can still see the relationship at a glance. */
  isCrossDatabase: boolean;
}

/** Synthetic relation id used for the placeholder node that stands in for a
 *  cross-database join's foreign endpoint. Includes the schema-qualified
 *  source path so the same foreign relation is reused across multiple joins
 *  rather than producing one stub per join. */
export const getForeignRelationStubId = (
  ownerPath: string,
  schemaName: string,
  relationName: string,
): string => `__foreign__:${ownerPath}::${schemaName}.${relationName}`;

export interface ForeignRelationStub {
  id: string;
  schemaName: string;
  relationName: string;
  ownerPath: string;
}

export interface DatabaseDiagramBuildResult {
  edges: DatabaseDiagramJoinEdge[];
  /** Foreign endpoints that need a placeholder node on the canvas. Empty
   *  when there are no cross-database joins. Deduplicated by stub id. */
  foreignStubs: ForeignRelationStub[];
}

/**
 * Walk all joins in the database and produce a deduplicated list of edges
 * between relations (tables and/or views), including self-joins (rendered
 * as loop edges) and cross-database joins (whose foreign endpoint becomes
 * a placeholder stub).
 *
 * Implementation notes:
 * - `Join.aliases` typically contains both directions `(A→B)` and `(B→A)` as a
 *   lookup optimization. We treat A↔B as a single edge and use the first alias.
 * - Self-joins (A↔A) are kept and flagged via `isSelfJoin` so the canvas can
 *   render a loop edge instead of skipping them.
 * - Joins whose endpoints reference relations outside this database (typically
 *   through `includes` / `includedStoreSpecifications`) are kept and flagged
 *   via `isCrossDatabase`. The foreign endpoint is replaced with a stub id so
 *   the caller can render a small placeholder node beside the in-DB endpoint.
 */
export const buildJoinEdges = (
  database: Database,
): DatabaseDiagramBuildResult => {
  const ownIds = new Set<string>();
  database.schemas.forEach((schema) => {
    schema.tables.forEach((table) => ownIds.add(getRelationId(table)));
    schema.views.forEach((view) => ownIds.add(getRelationId(view)));
  });

  const edges: DatabaseDiagramJoinEdge[] = [];
  const stubs = new Map<string, ForeignRelationStub>();
  database.joins.forEach((join: Join) => {
    const firstPair = join.aliases[0];
    if (!firstPair) {
      return;
    }
    const sourceRelation = firstPair.first.relation.value;
    const targetRelation = firstPair.second.relation.value;
    const rawSourceId = `${sourceRelation.schema.name}.${sourceRelation.name}`;
    const rawTargetId = `${targetRelation.schema.name}.${targetRelation.name}`;
    const sourceInOwn = ownIds.has(rawSourceId);
    const targetInOwn = ownIds.has(rawTargetId);

    // Resolve each endpoint to either its real node id (when in-DB) or a
    // stub id (when foreign). For pure self-joins we keep both ids as the
    // same real id so React Flow draws a loop on that node.
    let sourceId = rawSourceId;
    if (!sourceInOwn) {
      const ownerPath = sourceRelation.schema._OWNER.path;
      const stubId = getForeignRelationStubId(
        ownerPath,
        sourceRelation.schema.name,
        sourceRelation.name,
      );
      sourceId = stubId;
      if (!stubs.has(stubId)) {
        stubs.set(stubId, {
          id: stubId,
          schemaName: sourceRelation.schema.name,
          relationName: sourceRelation.name,
          ownerPath,
        });
      }
    }
    let targetId = rawTargetId;
    if (!targetInOwn) {
      const ownerPath = targetRelation.schema._OWNER.path;
      const stubId = getForeignRelationStubId(
        ownerPath,
        targetRelation.schema.name,
        targetRelation.name,
      );
      targetId = stubId;
      if (!stubs.has(stubId)) {
        stubs.set(stubId, {
          id: stubId,
          schemaName: targetRelation.schema.name,
          relationName: targetRelation.name,
          ownerPath,
        });
      }
    }

    edges.push({
      id: `join:${join.name}`,
      name: join.name,
      source: sourceId,
      target: targetId,
      join,
      isSelfJoin: sourceInOwn && targetInOwn && sourceId === targetId,
      isCrossDatabase: !sourceInOwn || !targetInOwn,
    });
  });
  return { edges, foreignStubs: Array.from(stubs.values()) };
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
