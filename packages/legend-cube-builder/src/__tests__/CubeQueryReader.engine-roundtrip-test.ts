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

import { describe, expect, test } from '@jest/globals';
import {
  CubeDocument,
  isSameCubeIR,
  lambda,
  Query,
  QueryEmitter,
  readCubeQuery,
  RelationalTableSource,
  Schema,
  splitCubeLambda,
  type IR,
} from '@finos/legend-cube';
import { stringifyLosslessJSON, type PlainObject } from '@finos/legend-shared';
import {
  CUBE_ENGINE_TEST__grammarToJson_lambda,
  CUBE_ENGINE_TEST__jsonToGrammar_lambda,
} from '../__test-utils__/CubeEngineTestSupport.js';
import {
  TEST__bindSampleSources,
  TEST__checkedAsTheEngineWould,
  TEST__cubeLambdaSamples,
} from '../__test-utils__/CubeLambdaCorpus.js';
import {
  CUBE_EXPRESSION_CODEC,
  readCubeLambdaJson,
} from '../graph-manager/protocol/pure/CubeEngineBuilder.js';
import { V1_serializeCubeLambda } from '../graph-manager/protocol/pure/v1/V1_CubeLambdaSerializer.js';
import { V1_createEngineBackedCubeEngine } from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeEngineTestUtils.js';
import { CUBE_EXAMPLES } from '../stores/CubeExamples.js';

// Import Pure's round trip (PLAN §11.18) on the engine's JSON: what Cube
// writes for each node of the core's samples, through the engine's grammar
// and back, as a matview edited as text comes back, reads into the steps
// that wrote it, which Cube writes the same way again

const SAMPLES = TEST__cubeLambdaSamples();

const throughGrammar = async (written: IR): Promise<unknown> =>
  CUBE_ENGINE_TEST__grammarToJson_lambda(
    await CUBE_ENGINE_TEST__jsonToGrammar_lambda(
      JSON.parse(
        stringifyLosslessJSON(V1_serializeCubeLambda(written)),
      ) as PlainObject,
    ),
  );

/** Reads the lambda through the grammar into steps, and writes it again: the lambda written, the same */
const expectReadBack = async (
  document: CubeDocument,
  written: IR,
  isRun: boolean,
): Promise<void> => {
  const parts = splitCubeLambda(
    readCubeLambdaJson(await throughGrammar(written)),
  );
  const { query, rewritten } = readCubeQuery(parts, {
    bindSource: TEST__bindSampleSources(document),
    expressions: CUBE_EXPRESSION_CODEC,
  });
  expect(rewritten).toEqual([]);
  const emitter = new QueryEmitter(TEST__checkedAsTheEngineWould(query));
  const selected = query.selected as string;
  const again = isRun
    ? emitter.emitExecutionLambda({ runtime: parts.runtime as string })
    : lambda([], [emitter.emitRelation(selected, { withRowOrder: true })]);
  expect(
    isSameCubeIR(again, written, {
      readExpression: CUBE_EXPRESSION_CODEC.read,
    }),
  ).toBe(true);
};

describe("Reading the steps of the engine's JSON", () => {
  test.each(SAMPLES.map((sample) => [sample.key, sample] as const))(
    'Reads %s through the grammar into steps Cube writes the same way, as a matview and as Show Pure',
    async (_key, sample) => {
      await expectReadBack(sample.document, sample.relation, false);
      await expectReadBack(sample.document, sample.run, true);
    },
  );
});

describe('Reading the examples back', () => {
  test.each(CUBE_EXAMPLES.map((example) => [example.id, example] as const))(
    'Reads every node of example %s through the grammar into steps Cube writes the same way',
    async (_id, example) => {
      const { engine } = V1_createEngineBackedCubeEngine();
      const opened = example.createDocument();
      const { context } = opened;
      if (!context?.runtime) {
        throw new Error(`Example ${example.id} has no runtime`);
      }
      // its tables typed by the engine, as opening it does
      const sources = opened.query.nodes.filter(
        (node): node is RelationalTableSource =>
          node instanceof RelationalTableSource,
      );
      const typed = await engine.resolveSchemas(
        context.model,
        new Map(
          sources.map((source) => [
            source.id,
            [source.database, source.schema, source.table] as const,
          ]),
        ),
      );
      const query = new Query(
        opened.query.nodes.map((node) =>
          node instanceof RelationalTableSource &&
          typed.get(node.id) instanceof Schema
            ? node.withResolution({
                kind: 'resolved',
                schema: typed.get(node.id) as Schema,
              })
            : node,
        ),
        opened.query.connections,
        opened.query.selected,
      );
      const document = new CubeDocument({ context, query });
      const emitter = new QueryEmitter(query);
      const nodes = query.nodes.filter((node) => emitter.canEmit(node.id));
      expect(nodes.length).toBe(query.nodes.length);
      for (const node of nodes) {
        await expectReadBack(
          document,
          lambda([], [emitter.emitRelation(node.id, { withRowOrder: true })]),
          false,
        );
        await expectReadBack(
          document,
          new QueryEmitter(
            query.selected === node.id ? query : query.select(node.id),
          ).emitExecutionLambda({ runtime: context.runtime }),
          true,
        );
      }
    },
  );
});
