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
import { isSameCubeIR } from '@finos/legend-cube';
import { CUBE_ENGINE_TEST__grammarToJson_lambda } from '../../../../../__test-utils__/CubeEngineTestSupport.js';
import type { CubeCheckedPure } from '../../../../CubeEngine.js';
import { V1_createEngineBackedCubeEngine } from '../__test-utils__/V1_CubeEngineTestUtils.js';
import {
  V1_readCubeLambda,
  V1_readCubeValueSpecification,
} from '../V1_CubeLambdaReader.js';
import type { V1_LegendCubeEngine } from '../V1_LegendCubeEngine.js';

// The engine's Pure text of what Show Pure shows and Import Pure writes as
// an expression's code, checked against the engine itself
// (EXPRESSION-EDITOR.md, §2.4): its text writer writes a comparison's
// operands without parentheses, which Cube puts back

/** An engine whose calls go to the test engine */
const newEngine = (): V1_LegendCubeEngine =>
  V1_createEngineBackedCubeEngine().engine;

const COMPARISON = { readExpression: V1_readCubeValueSpecification };

describe("The engine's Pure text of a query, checked", () => {
  test('Puts back the parentheses the engine drops, in a filter and in a new column, the text then reading as the query', async () => {
    const engine = newEngine();
    const query = V1_readCubeLambda(
      await CUBE_ENGINE_TEST__grammarToJson_lambda(
        '|#>{test::Db.S.T}#->filter(x|($x.A + 1) == 3)->extend(~B:x|($x.A * 2) == 4)',
      ),
    );
    const text = await engine.renderPure(query);
    // the engine's own text drops them
    expect(text).toContain('$x.A + 1 == 3');
    expect(text).toContain('$x.A * 2 == 4');
    const checked = await engine.checkPure(query, text);
    expect(checked.isRepaired).toBe(true);
    expect(checked.readsAsLambda).toBe(true);
    expect(checked.text).toContain('($x.A + 1) == 3');
    expect(checked.text).toContain('($x.A * 2) == 4');
    // parsed again, the repaired text is the query
    expect(
      isSameCubeIR(
        query,
        V1_readCubeLambda(
          await CUBE_ENGINE_TEST__grammarToJson_lambda(checked.text),
        ),
        COMPARISON,
      ),
    ).toBe(true);
  });

  test("Leaves a query's text the engine writes right as it is, its values of each kind included", async () => {
    const engine = newEngine();
    const query = V1_readCubeLambda(
      await CUBE_ENGINE_TEST__grammarToJson_lambda(
        [
          "|#>{test::Db.S.T}#->filter(x|($x.A > 0) && ($x.B == 'b'))",
          "->filter(x|($x.S == 'it\\'s') && ($x.D >= %2024-01-31) && ($x.T < %2024-01-31T10:30:00))",
          '->extend(~C:x|$x.A + 1)->extend(~E:x|($x.N * 1.5D) - 2.25)->extend(~F:x|$x.A == -1)',
        ].join(''),
      ),
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
    const { lambda } = await engine.parseExpression(
      'x | ($x.A + 1) == 3',
      'cube:test',
    );
    const expression = V1_readCubeValueSpecification(lambda);
    const text = await engine.renderPure(expression);
    expect(text).toContain('$x.A + 1 == 3');
    const checked = await engine.checkPure(expression, text);
    expect([checked.isRepaired, checked.readsAsLambda]).toEqual([true, true]);
    expect(checked.text.trim()).toBe('x|($x.A + 1) == 3');
  });
});

/** Code on one line: the engine's writer breaks a long one */
const oneLine = (code: string): string => code.replace(/\s+/gu, ' ').trim();

/** An expression's code as the engine writes it, then as Cube checks it, each on one line */
const checkExpression = async (
  code: string,
): Promise<{ written: string; checked: CubeCheckedPure }> => {
  const engine = newEngine();
  const { lambda } = await engine.parseExpression(code, 'cube:test');
  const expression = V1_readCubeValueSpecification(lambda);
  const written = await engine.renderPure(expression);
  const checked = await engine.checkPure(expression, written);
  return {
    written: oneLine(written),
    checked: { ...checked, text: oneLine(checked.text) },
  };
};

describe('Each shape the engine writes without the parentheses it needs, put right', () => {
  test.each([
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
  ])('%s, written %s', async (code, engineText) => {
    const { written, checked } = await checkExpression(code);
    expect(written).toBe(engineText);
    expect(checked).toEqual({
      text: code,
      readsAsLambda: true,
      isRepaired: true,
    });
  });

  test("Says a chain of them reads otherwise, as it doesn't put one right", async () => {
    const { written, checked } = await checkExpression(
      'x|(($x.A == 1) == true) == false',
    );
    expect(written).toBe('x|$x.A == 1 == true == false');
    expect(checked).toEqual({
      text: written,
      readsAsLambda: false,
      isRepaired: false,
    });
  });
});
