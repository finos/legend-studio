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

import { describe, expect, jest, test } from '@jest/globals';
import type { IR } from '@finos/legend-cube';
import { TracerService } from '@finos/legend-shared';
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../../../../CubeEngine.js';
import { V1_readCubeExpression } from '../V1_CubeExpression.js';
import { V1_readCubeValueSpecification } from '../V1_CubeLambdaReader.js';
import { V1_LegendCubeEngine } from '../V1_LegendCubeEngine.js';
import PARSES from './V1_CubeExpressionOutline.json' with { type: 'json' };

// The engine's Pure text of a lambda, checked by parsing it back
// (EXPRESSION-EDITOR.md, §2.4): the engine's text writer writes
// `equal(plus(a, 1), 3)` as `a + 1 == 3`, which reads `plus(a, equal(1, 3))`.
// The engine's parses are those captured from the local engine.

const parsed = (code: string): ReturnType<typeof V1_readCubeExpression> =>
  V1_readCubeExpression((PARSES as Record<string, unknown>)[code]);

/** The IR of the expression the code is */
const lambdaOf = (code: string): IR =>
  V1_readCubeValueSpecification(parsed(code).lambda);

/** An engine whose parse is the captured one of the code */
const newEngine = (): V1_LegendCubeEngine => {
  const engine = new V1_LegendCubeEngine(
    { baseUrl: 'http://localhost:6300/api' },
    new TracerService(),
  );
  jest
    .spyOn(engine, 'parseExpression')
    .mockImplementation(async (code) => parsed(code));
  return engine;
};

describe("The engine's Pure text, checked by parsing it back", () => {
  test('Gives a text that reads as its lambda as it is', async () => {
    expect(
      await newEngine().checkPure(
        lambdaOf('x | ($x.A + 1) == 3'),
        'x | ($x.A + 1) == 3',
      ),
    ).toEqual({
      text: 'x | ($x.A + 1) == 3',
      readsAsLambda: true,
      isRepaired: false,
    });
  });

  test('Puts back the parentheses of arithmetic compared the engine dropped, once the text so repaired reads as the lambda', async () => {
    expect(
      await newEngine().checkPure(
        lambdaOf('x | ($x.A + 1) == 3'),
        'x | $x.A + 1 == 3',
      ),
    ).toEqual({
      text: 'x | ($x.A + 1) == 3',
      readsAsLambda: true,
      isRepaired: true,
    });
  });

  test("Says the text reads otherwise where the parentheses, put back, don't make it the lambda", async () => {
    expect(
      await newEngine().checkPure(
        lambdaOf('x | $x.A * 2 + 1 == 3'),
        'x | $x.A + 1 == 3',
      ),
    ).toEqual({
      text: 'x | $x.A + 1 == 3',
      readsAsLambda: false,
      isRepaired: false,
    });
  });

  test("Says a text reads otherwise for a reason it doesn't know, and nothing of one it can't read back", async () => {
    // another expression altogether: no parentheses make it the lambda
    expect(
      await newEngine().checkPure(
        lambdaOf('x | $x.A != 3'),
        'x | $x.A == 1 && $x.B == 2',
      ),
    ).toEqual({
      text: 'x | $x.A == 1 && $x.B == 2',
      readsAsLambda: false,
      isRepaired: false,
    });
    const engine = newEngine();
    jest
      .spyOn(engine, 'parseExpression')
      .mockRejectedValue(
        new CubeEngineError(CubeEngineErrorKind.COMPILE, 'Unexpected token'),
      );
    expect(
      await engine.checkPure(lambdaOf('x | $x.A != 3'), 'x | $x.A !='),
    ).toEqual({
      text: 'x | $x.A !=',
      readsAsLambda: undefined,
      isRepaired: false,
    });
  });
});
