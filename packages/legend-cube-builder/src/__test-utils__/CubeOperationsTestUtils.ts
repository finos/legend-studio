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

/** Runs the query up to its capture node, with this row limit */
export const TEST__runQuery = async (
  engine: CubeEngine,
  query: Query,
  rowLimit: number,
): Promise<CubeResult> => {
  TEST__expectValidQuery(query);
  return engine.execute(
    CUBE_NORTHWIND_MODEL,
    new QueryEmitter(query).emitExecutionLambda({
      rowLimit,
      runtime: CUBE_NORTHWIND_RUNTIME,
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
  const cube = TEST__inferredSchema(query, nodeId);
  const typed = (
    await engine.typeLambdas(
      CUBE_NORTHWIND_MODEL,
      new Map([[nodeId, new QueryEmitter(query).emitTypingLambda(nodeId)]]),
    )
  ).get(nodeId);
  expect(typed).toBeInstanceOf(Schema);
  const engineSchema = typed as Schema;
  expect(
    cube.columns.map((column) => [column.name, column.type.fullName]),
  ).toEqual(
    engineSchema.columns.map((column) => [column.name, column.type.fullName]),
  );
  cube.columns.forEach((column, index) => {
    if (engineSchema.columns[index]?.nullable) {
      expect([column.name, column.nullable]).toEqual([column.name, true]);
    }
  });
};
