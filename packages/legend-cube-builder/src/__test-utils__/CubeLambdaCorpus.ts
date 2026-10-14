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
  CubeLambdaReadError,
  decodeCubeSpec,
  ExpressionFilter,
  getExpressionFilterSignature,
  lambda,
  QueryEmitter,
  RelationalTableSource,
  type CubeDocument,
  type CubeSourceStep,
  type IR,
  type Query,
} from '@finos/legend-cube';
import { readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

// The lambdas Cube writes for the core's saved spec samples (PLAN §10.3),
// for Import Pure's round trips (PLAN §11.18): for each node that can be
// written, as a matview saves it and as Show Pure shows a run of it

const FIXTURES = resolve(
  __dirname,
  '../../../legend-cube/src/spec/__tests__/fixtures',
);

export interface TEST__CubeLambdaSample {
  /** `<file>/<node id>` */
  readonly key: string;
  readonly document: CubeDocument;
  readonly nodeId: string;
  /** The node's relation, as a matview saves it: `{| <relation>}`, written with its rows' order */
  readonly relation: IR;
  /** A run of the node with no row limit, as Show Pure shows it: lets, the capture's sort, `from()` */
  readonly run: IR;
}

/** Every node of every sample that can be written, by key */
export const TEST__cubeLambdaSamples = (): TEST__CubeLambdaSample[] =>
  readdirSync(FIXTURES)
    .filter((file) => file.endsWith('.cube.json'))
    .sort()
    .flatMap((file) => {
      const { document } = decodeCubeSpec(
        JSON.parse(readFileSync(join(FIXTURES, file), 'utf-8')),
      );
      const runtime = document.context?.runtime;
      if (runtime === undefined) {
        return [];
      }
      const emitter = new QueryEmitter(document.query);
      return document.query.nodes
        .filter((node) => emitter.canEmit(node.id))
        .map((node) => ({
          key: `${file}/${node.id}`,
          document,
          nodeId: node.id,
          relation: lambda(
            [],
            [emitter.emitRelation(node.id, { withRowOrder: true })],
          ),
          run: new QueryEmitter(
            document.query.selected === node.id
              ? document.query
              : document.query.select(node.id),
          ).emitExecutionLambda({ runtime }),
        }));
    });

/** Each table of the lambda bound to the sample's own source of it, with its saved columns */
export const TEST__bindSampleSources =
  (document: CubeDocument) =>
  (source: IR): CubeSourceStep => {
    const table = document.query.nodes.find(
      (node): node is RelationalTableSource =>
        node instanceof RelationalTableSource &&
        source.k === 'storeAccessor' &&
        source.path.join('.') ===
          [node.database, node.schema, node.table].join('.'),
    );
    if (!table) {
      throw new CubeLambdaReadError(`No table for ${JSON.stringify(source)}`);
    }
    return {
      type: RelationalTableSource.TYPE,
      create: (id) =>
        new RelationalTableSource(
          id,
          {
            database: table.database,
            schema: table.schema,
            table: table.table,
          },
          table.resolution,
        ),
    };
  };

/**
 * The query with each Filter by Expression checked, as the editor has the
 * engine check them on import: the samples' conditions are all Booleans
 */
export const TEST__checkedAsTheEngineWould = (query: Query): Query =>
  query.nodes.reduce((checked, node) => {
    if (!(node instanceof ExpressionFilter) || !node.lambda) {
      return checked;
    }
    const [inputId] = checked.getInputIds(node.id);
    const input =
      inputId === undefined
        ? undefined
        : buildSchemasAndValidity(checked).schemas.get(inputId);
    return input
      ? checked.replace(
          node.withCheck({
            kind: 'checked',
            signature: getExpressionFilterSignature(input, node.lambda),
          }),
        )
      : checked;
  }, query);
