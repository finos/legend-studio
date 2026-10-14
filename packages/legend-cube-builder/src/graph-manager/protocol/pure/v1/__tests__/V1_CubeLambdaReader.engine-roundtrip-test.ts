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
import { isSameCubeIR, splitCubeLambda, type IR } from '@finos/legend-cube';
import { stringifyLosslessJSON, type PlainObject } from '@finos/legend-shared';
import {
  CUBE_ENGINE_TEST__grammarToJson_lambda,
  CUBE_ENGINE_TEST__jsonToGrammar_lambda,
} from '../../../../../__test-utils__/CubeEngineTestSupport.js';
import { TEST__cubeLambdaSamples } from '../../../../../__test-utils__/CubeLambdaCorpus.js';
import {
  V1_readCubeLambda,
  V1_readCubeValueSpecification,
} from '../V1_CubeLambdaReader.js';
import { V1_serializeCubeLambda } from '../V1_CubeLambdaSerializer.js';

// What Cube writes for the core's samples, through the engine's grammar and
// back (PLAN §11.18): the JSON Import Pure reads when a matview was edited as
// text, or when Pure text is pasted, is the engine's, not Cube's

const SAMPLES = TEST__cubeLambdaSamples();
const COMPARISON = {
  readExpression: (json: object): IR => V1_readCubeValueSpecification(json),
};

/** The lambda as the engine's grammar writes it, then parses it */
const throughGrammar = async (lambda: IR): Promise<unknown> =>
  CUBE_ENGINE_TEST__grammarToJson_lambda(
    await CUBE_ENGINE_TEST__jsonToGrammar_lambda(
      JSON.parse(
        stringifyLosslessJSON(V1_serializeCubeLambda(lambda)),
      ) as PlainObject,
    ),
  );

describe("Reading the engine's JSON of what Cube writes", () => {
  test.each(SAMPLES.map((sample) => [sample.key, sample] as const))(
    'Reads %s back through the grammar, as a matview and as Show Pure',
    async (_key, sample) => {
      const relation = V1_readCubeLambda(await throughGrammar(sample.relation));
      expect(isSameCubeIR(relation, sample.relation, COMPARISON)).toBe(true);

      const run = V1_readCubeLambda(await throughGrammar(sample.run));
      expect(isSameCubeIR(run, sample.run, COMPARISON)).toBe(true);
      // the run's from() comes off, its runtime kept
      expect(splitCubeLambda(run).runtime).toBe(
        sample.document.context?.runtime,
      );
    },
  );
});
