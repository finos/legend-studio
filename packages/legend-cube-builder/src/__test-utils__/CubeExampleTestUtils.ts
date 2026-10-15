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

import {
  buildSchemasAndValidity,
  createNodeRegistry,
  Extend,
  type ModelContext,
  Query,
  RelationalTableSource,
  Schema,
} from '@finos/legend-cube';
import type { CubeEngine } from '../graph-manager/CubeEngine.js';
import {
  buildCubeExtendTypingLambdas,
  readCubeExtendTyping,
} from '../stores/CubeExtendTyping.js';
import type { CubeExample } from '../stores/CubeExamples.js';

/**
 * The query with each Extend typed by the engine, in node order, as the
 * editor types them in the background
 */
export const TEST__typeExtendsOnEngine = async (
  engine: CubeEngine,
  model: ModelContext,
  input: Query,
): Promise<Query> => {
  const registry = createNodeRegistry();
  let query = input;
  for (const node of query.nodes) {
    if (node instanceof Extend) {
      const columns = node.columns.map(({ name, lambda }) => ({
        name,
        lambda: lambda as NonNullable<typeof lambda>,
      }));
      const [inputId] = query.getInputIds(node.id);
      const answers = await engine.typeLambdas(
        model,
        buildCubeExtendTypingLambdas(query, node, columns, registry, false),
      );
      const { typing } = readCubeExtendTyping(
        answers,
        node,
        buildSchemasAndValidity(query, registry.queryRules).schemas.get(
          inputId ?? '',
        ) as Schema,
        columns,
        undefined,
      );
      query = query.replace(
        new Extend(node.id, node.columns, typing, node.rest),
      );
    }
  }
  return query;
};

/**
 * An example's cube as opening it types it, on the engine: its tables, then
 * each Extend, in node order, as the editor types it in the background (an
 * Extend parsing JSON, PLAN §11.20)
 */
export const TEST__openExampleOnEngine = async (
  engine: CubeEngine,
  example: CubeExample,
): Promise<{ model: ModelContext; runtime: string; query: Query }> => {
  const document = example.createDocument();
  const model = document.context?.model;
  const runtime = document.context?.runtime;
  if (!model || !runtime) {
    throw new Error(`Example ${example.id} has no model or runtime`);
  }
  const sources = document.query.nodes.filter(
    (node): node is RelationalTableSource =>
      node instanceof RelationalTableSource,
  );
  const typed = await engine.resolveSchemas(
    model,
    new Map(
      sources.map((source) => [
        source.id,
        [source.database, source.schema, source.table] as const,
      ]),
    ),
  );
  const query = new Query(
    document.query.nodes.map((node) => {
      if (!(node instanceof RelationalTableSource)) {
        return node;
      }
      const schema = typed.get(node.id);
      if (!(schema instanceof Schema)) {
        throw schema ?? new Error(`No schema for ${node.id}`);
      }
      return node.withResolution({ kind: 'resolved', schema });
    }),
    document.query.connections,
    document.query.selected,
  );
  return {
    model,
    runtime,
    query: await TEST__typeExtendsOnEngine(engine, model, query),
  };
};
