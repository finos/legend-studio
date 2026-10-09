/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { expect } from '@jest/globals';
import {
  buildSchemasAndValidity,
  Connection,
  createNodeRegistry,
  Query,
  type QueryNode,
  QueryEmitter,
  RelationalTableSource,
  Schema,
} from '@finos/legend-cube';
import type {
  CubeEngine,
  CubeResult,
  CubeResultValue,
} from '../graph-manager/CubeEngine.js';
import {
  CUBE_NORTHWIND_DATABASE,
  CUBE_NORTHWIND_MODEL,
  CUBE_NORTHWIND_RUNTIME,
} from '../stores/fixtures/CubeNorthwindModel.js';

// Helpers for engine tests of operations on the Cube Northwind fixture,
// through the engine port only (no V1 classes), so any CubeEngine works

/** A table of the Cube Northwind model, not resolved yet */
export const TEST__northwindTable = (
  id: string,
  table: string,
  schema = 'NORTHWIND',
): RelationalTableSource =>
  new RelationalTableSource(id, {
    database: CUBE_NORTHWIND_DATABASE,
    schema,
    table,
  });

/** The sources, resolved through the engine as the editor resolves them */
export const TEST__resolveSources = async (
  engine: CubeEngine,
  sources: readonly RelationalTableSource[],
): Promise<RelationalTableSource[]> => {
  const typed = await engine.resolveSchemas(
    CUBE_NORTHWIND_MODEL,
    new Map(
      sources.map((source) => [
        source.id,
        [source.database, source.schema, source.table] as const,
      ]),
    ),
  );
  return sources.map((source) => {
    const schema = typed.get(source.id);
    if (!(schema instanceof Schema)) {
      throw schema ?? new Error(`No schema for ${source.id}`);
    }
    return source.withResolution({ kind: 'resolved', schema });
  });
};

/** A chain of nodes, each feeding the next on its first port, captured at the last */
export const TEST__chainOf = (nodes: readonly QueryNode[]): Query =>
  new Query(
    nodes,
    nodes
      .slice(1)
      .map(
        (node, index) =>
          new Connection(
            (nodes[index] as QueryNode).id,
            node.id,
            node.ports[0] as string,
          ),
      ),
    nodes.at(-1)?.id,
  );

/** Every node of the query is valid */
export const TEST__expectValidQuery = (query: Query): void => {
  const { validity } = buildSchemasAndValidity(
    query,
    createNodeRegistry().queryRules,
  );
  expect([...validity].filter(([, errors]) => errors.length)).toEqual([]);
};

/**
 * Runs the query up to its capture node, with this row limit; with a database
 * type, written as for that database (on the fixture's H2 all the same, so a
 * workaround's rows can be checked)
 */
export const TEST__runQuery = async (
  engine: CubeEngine,
  query: Query,
  rowLimit: number,
  databaseType?: string,
): Promise<CubeResult> => {
  TEST__expectValidQuery(query);
  return engine.execute(
    CUBE_NORTHWIND_MODEL,
    new QueryEmitter(query).emitExecutionLambda({
      rowLimit,
      runtime: CUBE_NORTHWIND_RUNTIME,
      databaseType,
    }),
  );
};

/** The values of one column of a result */
export const TEST__columnValues = (
  result: CubeResult,
  column: string,
): CubeResultValue[] => {
  const index = result.columns.indexOf(column);
  expect(index).toBeGreaterThanOrEqual(0);
  return result.rows.map((row) => row[index] ?? null);
};

/** The schema Cube infers for a node of the query, its capture node by default */
export const TEST__inferredSchema = (
  query: Query,
  nodeId = query.selected ?? '',
): Schema => {
  const schema = buildSchemasAndValidity(
    query,
    createNodeRegistry().queryRules,
  ).schemas.get(nodeId);
  expect(schema).toBeDefined();
  return schema as Schema;
};

/** A node of a query to type with the engine, under a key of its own */
export interface TEST__TypingTarget {
  key: string;
  query: Query;
  nodeId: string;
}

/**
 * Every node of the query that can be emitted, keyed `<prefix>/<node id>`, in
 * the query's node order
 */
export const TEST__emittableNodes = (
  prefix: string,
  query: Query,
): TEST__TypingTarget[] => {
  const emitter = new QueryEmitter(query);
  return query.nodes
    .filter((node) => emitter.canEmit(node.id))
    .map((node) => ({ key: `${prefix}/${node.id}`, query, nodeId: node.id }));
};

/** The engine's schema of each target, in one engine call */
export const TEST__engineSchemas = async (
  engine: CubeEngine,
  targets: readonly TEST__TypingTarget[],
): Promise<Map<string, Schema | Error>> =>
  engine.typeLambdas(
    CUBE_NORTHWIND_MODEL,
    new Map(
      targets.map(({ key, query, nodeId }) => [
        key,
        new QueryEmitter(query).emitTypingLambda(nodeId),
      ]),
    ),
  );

/**
 * How Cube's schema of a node differs from the engine's, one line per
 * difference: names, positions and types with their parameters must be the
 * same. Nullability must be the same too, except on the columns in
 * `widerNullable`, where the engine misreports it (outer-join padding, the
 * FULL merged key: PLAN §4.7, §11.5) and Cube must say nullable. With
 * `oneWay`, Cube may be wider on any column.
 */
export const TEST__typingDifferences = (
  key: string,
  cube: Schema | undefined,
  engineSchema: Schema | Error | undefined,
  options: {
    widerNullable?: readonly string[] | undefined;
    oneWay?: boolean | undefined;
  } = {},
): string[] => {
  if (!cube) {
    return [`${key}: Cube infers no schema`];
  }
  if (!(engineSchema instanceof Schema)) {
    return [`${key}: the engine gives no schema (${engineSchema?.message})`];
  }
  const describe = (schema: Schema): string[] =>
    schema.columns.map((column) => `${column.name}: ${column.type.fullName}`);
  if (describe(cube).join() !== describe(engineSchema).join()) {
    return [
      `${key}: columns [${describe(cube).join(', ')}], the engine's [${describe(engineSchema).join(', ')}]`,
    ];
  }
  const wider = new Set(options.widerNullable ?? []);
  return cube.columns.flatMap((column, index) => {
    const engineNullable = engineSchema.columns[index]?.nullable === true;
    if (wider.has(column.name)) {
      return column.nullable
        ? []
        : [`${key}: ${column.name} should be nullable`];
    }
    return column.nullable === engineNullable ||
      (options.oneWay && column.nullable)
      ? []
      : [
          `${key}: ${column.name} is ${column.nullable ? '' : 'not '}nullable, the engine's ${engineNullable ? '' : 'not '}nullable`,
        ];
  });
};

/**
 * The engine types the node as Cube infers it: the same names, in the same
 * order, of the same types and parameters. Cube's nullability may only be
 * wider, since the engine misreports it after outer joins (PLAN §4.7).
 */
export const TEST__expectEngineTyping = async (
  engine: CubeEngine,
  query: Query,
  nodeId = query.selected ?? '',
): Promise<void> => {
  const typed = await TEST__engineSchemas(engine, [
    { key: nodeId, query, nodeId },
  ]);
  expect(
    TEST__typingDifferences(
      nodeId,
      TEST__inferredSchema(query, nodeId),
      typed.get(nodeId),
      { oneWay: true },
    ),
  ).toEqual([]);
};
