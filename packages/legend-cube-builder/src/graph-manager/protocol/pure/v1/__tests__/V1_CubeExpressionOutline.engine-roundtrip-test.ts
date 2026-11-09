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
import { parseLosslessJSON } from '@finos/legend-shared';
import { CUBE_ENGINE_TEST__grammarToJson_valueSpecification } from '../../../../../__test-utils__/CubeEngineTestSupport.js';
import {
  type CubeExpressionOutline,
  type CubeOutlinePart,
  applyCubeCodeEdits,
  findCubePrecedenceTraps,
  getCubePrecedenceFixEdits,
  getCubeToOneEdit,
} from '../../../../CubeExpressionOutline.js';
import { V1_readCubeExpression } from '../V1_CubeExpression.js';
import { V1_buildCubeExpressionOutline } from '../V1_CubeExpressionOutline.js';

// The precedence fixes through the engine's grammar (EXPRESSION-EDITOR.md,
// round 2): the code a fix writes parses as was meant, with no trap left

const outlineOf = async (code: string): Promise<CubeExpressionOutline> => {
  const response = await CUBE_ENGINE_TEST__grammarToJson_valueSpecification(
    code,
    'expressionFilter101:condition',
  );
  expect(response.ok).toBe(true);
  const { located } = V1_readCubeExpression(
    parseLosslessJSON(await response.text()),
  );
  const outline = V1_buildCubeExpressionOutline(located, code);
  if (!outline) {
    throw new Error(`No outline of ${code}`);
  }
  return outline;
};

/** A part as its labels, its parts in brackets */
const shapeOf = (part: CubeOutlinePart): string =>
  part.parts.length
    ? `${part.label}(${part.parts.map(shapeOf).join(', ')})`
    : part.label;

describe('Precedence fixes, parsed by the engine', () => {
  test.each([
    ['x | $x.A + 1 == 3', 'x | ($x.A + 1) == 3', '==(+(A, 1), 3)'],
    [
      'x | $x.A * 2 + 1 == 3',
      'x | ($x.A * 2 + 1) == 3',
      '==(+(*(A, 2), 1), 3)',
    ],
    [
      'x | $x.A > 0 && $x.A < 30',
      'x | $x.A > 0 && ($x.A < 30)',
      '&&(>(A, 0), <(A, 30))',
    ],
    [
      'x | $x.A > 0 && $x.B > 1 && $x.C > 2',
      'x | $x.A > 0 && ($x.B > 1) && ($x.C > 2)',
      '&&(&&(>(A, 0), >(B, 1)), >(C, 2))',
    ],
    ['x | !$x.A > 3', 'x | !($x.A > 3)', '!(>(A, 3))'],
    [
      'x | $x.price\n  * $x.amount\n  + 1 == 3',
      'x | ($x.price\n  * $x.amount\n  + 1) == 3',
      '==(+(*(price, amount), 1), 3)',
    ],
  ])(
    'Fixes %j as %j, which the engine reads as %s',
    async (code, fixed, shape) => {
      const traps = findCubePrecedenceTraps(await outlineOf(code));
      expect(traps.length).toBeGreaterThan(0);
      const written = applyCubeCodeEdits(
        code,
        getCubePrecedenceFixEdits(traps),
      );
      expect(written).toBe(fixed);
      const again = await outlineOf(written);
      expect(shapeOf(again.root)).toBe(shape);
      expect(findCubePrecedenceTraps(again)).toEqual([]);
    },
  );

  test("Takes a part's one value with ->toOne(), which the engine reads around that part", async () => {
    const code = "x | $x.CITY->lpad(10, '.')->toUpper() + $x.B";
    const outline = await outlineOf(code);
    const lpad = outline.root.parts[0]?.parts[0] as CubeOutlinePart;
    const edit = getCubeToOneEdit(lpad);
    const written = applyCubeCodeEdits(code, edit ? [edit] : []);
    expect(written).toBe(
      "x | $x.CITY->lpad(10, '.')->toOne()->toUpper() + $x.B",
    );
    expect(shapeOf((await outlineOf(written)).root)).toBe(
      "+(toUpper(toOne(lpad(CITY, 10, '.'))), B)",
    );
  });
});
