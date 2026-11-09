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
import { type IR, isSameCubeIR } from '@finos/legend-cube';
import { CUBE_ENGINE_TEST__grammarToJson_lambda } from '../../../../../__test-utils__/CubeEngineTestSupport.js';
import { V1_createEngineBackedCubeEngine } from '../__test-utils__/V1_CubeEngineTestUtils.js';
import {
  V1_readCubeLambda,
  V1_readCubeValueSpecification,
} from '../V1_CubeLambdaReader.js';
import type { V1_LegendCubeEngine } from '../V1_LegendCubeEngine.js';

// The engine's Pure text of what Show Pure shows and Import Pure writes as
// an expression's code, checked against the engine itself
// (EXPRESSION-EDITOR.md, §2.4): its text writer writes a comparison's
// operands without parentheses, which Cube puts back. The texts repaired
// here are written as the writer writes them today, so these tests hold
// once the engine writes them right (§7): the engine's own text is only
// checked to read as the query, its parentheses dropped or not.

/** An engine whose calls go to the test engine */
const newEngine = (): V1_LegendCubeEngine =>
  V1_createEngineBackedCubeEngine().engine;

const COMPARISON = { readExpression: V1_readCubeValueSpecification };

/** The query the text is, as the engine parses it */
const queryOf = async (text: string): Promise<IR> =>
  V1_readCubeLambda(await CUBE_ENGINE_TEST__grammarToJson_lambda(text));

/** The expression the code is, as the engine parses it */
const expressionOf = async (
  engine: V1_LegendCubeEngine,
  code: string,
): Promise<IR> =>
  V1_readCubeValueSpecification(
    (await engine.parseExpression(code, 'cube:test')).lambda,
  );

const QUERY =
  '|#>{test::Db.S.T}#->filter(x|($x.A + 1) == 3)->extend(~B:x|($x.A * 2) == 4)';

describe("The engine's Pure text of a query, checked", () => {
  test("Puts back the parentheses the engine's writer drops, in a filter and in a new column, the text then reading as the query", async () => {
    const engine = newEngine();
    const query = await queryOf(QUERY);
    const checked = await engine.checkPure(
      query,
      '|#>{test::Db.S.T}#->filter(x|$x.A + 1 == 3)->extend(~B:x|$x.A * 2 == 4)',
    );
    expect(checked).toEqual({
      text: QUERY,
      readsAsLambda: true,
      isRepaired: true,
    });
    expect(isSameCubeIR(query, await queryOf(checked.text), COMPARISON)).toBe(
      true,
    );
  });

  test("Gives the engine's own text of a query, its parentheses dropped or not, as a text that reads as the query", async () => {
    const engine = newEngine();
    const query = await queryOf(QUERY);
    const checked = await engine.checkPure(
      query,
      await engine.renderPure(query),
    );
    expect(checked.readsAsLambda).toBe(true);
    expect(isSameCubeIR(query, await queryOf(checked.text), COMPARISON)).toBe(
      true,
    );
  });

  test("Leaves a query's text the engine writes right as it is, its values of each kind included", async () => {
    const engine = newEngine();
    const query = await queryOf(
      [
        "|#>{test::Db.S.T}#->filter(x|($x.A > 0) && ($x.B == 'b'))",
        "->filter(x|($x.S == 'it\\'s') && ($x.D >= %2024-01-31) && ($x.T < %2024-01-31T10:30:00))",
        '->extend(~C:x|$x.A + 1)->extend(~E:x|($x.N * 1.5D) - 2.25)->extend(~F:x|$x.A == -1)',
      ].join(''),
    );
    const text = await engine.renderPure(query);
    expect(await engine.checkPure(query, text)).toEqual({
      text,
      readsAsLambda: true,
      isRepaired: false,
    });
  });

  test("Puts them back in an expression's code, as Import Pure writes it", async () => {
    const engine = newEngine();
    const expression = await expressionOf(engine, 'x | ($x.A + 1) == 3');
    expect(await engine.checkPure(expression, 'x|$x.A + 1 == 3')).toEqual({
      text: 'x|($x.A + 1) == 3',
      readsAsLambda: true,
      isRepaired: true,
    });
  });
});

/** Each shape, as written, then as the engine's writer writes it today */
const SHAPES: [string, string][] = [
  // an operator before `==`
  ['x|($x.A > 1) == true', 'x|$x.A > 1 == true'],
  ['x|($x.A == 1) == true', 'x|$x.A == 1 == true'],
  ['x|($x.A && $x.B) == false', 'x|$x.A && $x.B == false'],
  ['x|($x.A || $x.B) == false', 'x|$x.A || $x.B == false'],
  ['x|(!$x.A) == true', 'x|!$x.A == true'],
  ['x|(-$x.A) == 3', 'x|-$x.A == 3'],
  ['x|($x.A + $x.B + 1) == 3', 'x|$x.A + $x.B + 1 == 3'],
  [
    'x|(($x.A > 1) && ($x.B > 2)) == true',
    'x|($x.A > 1) && ($x.B > 2) == true',
  ],
  // after `==`, only `&&` and `||` need them
  ['x|($x.A - 1) == $x.B + 1', 'x|$x.A - 1 == $x.B + 1'],
  ['x|($x.A > 1) == $x.B > 2', 'x|$x.A > 1 == $x.B > 2'],
  ['x|$x.F == ($x.A && $x.B)', 'x|$x.F == $x.A && $x.B'],
  [
    'x|$x.F == (($x.A > 1) && ($x.B < 2))',
    'x|$x.F == ($x.A > 1) && ($x.B < 2)',
  ],
  // a comparison after another
  ['x|$x.A >= ($x.B > 1)', 'x|$x.A >= $x.B > 1'],
];

describe('Each shape the engine writes without the parentheses it needs, put right', () => {
  test.each(SHAPES)('%s, written %s', async (code, written) => {
    const engine = newEngine();
    const expression = await expressionOf(engine, code);
    expect(await engine.checkPure(expression, written)).toEqual({
      text: code,
      readsAsLambda: true,
      isRepaired: true,
    });
  });

  test("Gives the engine's own text of each, its parentheses dropped or not, as a text that reads as the expression", async () => {
    const engine = newEngine();
    const read = await Promise.all(
      SHAPES.map(async ([code]) => {
        const expression = await expressionOf(engine, code);
        const checked = await engine.checkPure(
          expression,
          await engine.renderPure(expression),
        );
        return [
          code,
          checked.readsAsLambda,
          isSameCubeIR(
            expression,
            await expressionOf(engine, checked.text),
            COMPARISON,
          ),
        ];
      }),
    );
    expect(read).toEqual(SHAPES.map(([code]) => [code, true, true]));
  });

  test("Says a chain of them reads otherwise, as it doesn't put one right", async () => {
    const engine = newEngine();
    const expression = await expressionOf(
      engine,
      'x|(($x.A == 1) == true) == false',
    );
    expect(
      await engine.checkPure(expression, 'x|$x.A == 1 == true == false'),
    ).toEqual({
      text: 'x|$x.A == 1 == true == false',
      readsAsLambda: false,
      isRepaired: false,
    });
  });
});
