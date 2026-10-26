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
  type JsonObject,
  PrimitiveType,
  SchemaColumn,
  TypeFamily,
} from '@finos/legend-cube';
import { TEST__functionCatalogue } from '../../../../../__test-utils__/CubeFunctionCatalogueTestUtils.js';
import {
  type CubeExpressionOutline,
  type CubeOutlinePart,
  CubeOutlinePartKind,
  CubePrecedenceTrapKind,
  applyCubeCodeEdits,
  findCubePrecedenceTraps,
  getCubeCoalesceEdit,
  getCubeOutlineRows,
  getCubePrecedenceFixEdits,
  getCubeToOneEdit,
} from '../../../../CubeExpressionOutline.js';
import { V1_readCubeExpression } from '../V1_CubeExpression.js';
import { V1_buildCubeExpressionOutline } from '../V1_CubeExpressionOutline.js';
import PARSES from './V1_CubeExpressionOutline.json' with { type: 'json' };

// the engine's parses of expressions, their source information returned
// (grammar to JSON on the local engine, 2026-10-26)
const outlineOf = (code: string, located = true): CubeExpressionOutline => {
  const parsed = V1_readCubeExpression(
    (PARSES as Record<string, unknown>)[code],
  );
  const outline = V1_buildCubeExpressionOutline(
    located ? parsed.located : parsed.lambda,
    code,
  );
  if (!outline) {
    throw new Error(`No outline of ${code}`);
  }
  return outline;
};

/** A part as its kind, its label and its parts */
const shape = (part: CubeOutlinePart): unknown =>
  part.parts.length
    ? [part.kind, part.label, ...part.parts.map(shape)]
    : [part.kind, part.label];

const { COLUMN, VALUE, CALL, OPERATOR, LIST, LAMBDA, TYPE } =
  CubeOutlinePartKind;

describe("An expression's outline, read from the engine's parse", () => {
  test('Reads columns, values, calls and operators, each where it is in the code', () => {
    const code =
      "x | $x.COMPETITION->contains('Open') && ($x.VIEWERS > 1000000)";
    const outline = outlineOf(code);
    expect(outline.parameter).toBe('x');
    expect(outline.isLocated).toBe(true);
    expect(shape(outline.root)).toEqual([
      OPERATOR,
      '&&',
      [CALL, 'contains', [COLUMN, 'COMPETITION'], [VALUE, "'Open'"]],
      [OPERATOR, '>', [COLUMN, 'VIEWERS'], [VALUE, '1000000']],
    ]);
    const [contains, greater] = outline.root.parts as CubeOutlinePart[];
    // a call's parentheses included, though the engine places it at its name
    expect(outline.textOf(contains as CubeOutlinePart)).toBe(
      "$x.COMPETITION->contains('Open')",
    );
    expect(contains?.isArrow).toBe(true);
    expect(outline.textOf(greater as CubeOutlinePart)).toBe(
      '$x.VIEWERS > 1000000',
    );
    expect(greater?.parts[1]?.valueType).toBe('Integer');
  });

  test('Reads `a + b` as one operator of two operands, `!=` as one, and a unary minus, a list, a lambda and a type', () => {
    expect(shape(outlineOf('x | $x.A / 2 - 1').root)).toEqual([
      OPERATOR,
      '-',
      [OPERATOR, '/', [COLUMN, 'A'], [VALUE, '2']],
      [VALUE, '1'],
    ]);
    const notEqual = outlineOf('x | $x.A != 3').root;
    expect(shape(notEqual)).toEqual([
      OPERATOR,
      '!=',
      [COLUMN, 'A'],
      [VALUE, '3'],
    ]);
    expect(notEqual.functionName).toBe('notEqual');
    expect(shape(outlineOf('x | -1->abs()').root)).toEqual([
      OPERATOR,
      '-',
      [CALL, 'abs', [VALUE, '1']],
    ]);
    expect(shape(outlineOf('x | $x.A->in([1, 2])').root)).toEqual([
      CALL,
      'in',
      [COLUMN, 'A'],
      [LIST, '[…]', [VALUE, '1'], [VALUE, '2']],
    ]);
    const choice = outlineOf("x | if($x.A > 1, |'a', |'b')");
    expect(shape(choice.root)).toEqual([
      CALL,
      'if',
      [OPERATOR, '>', [COLUMN, 'A'], [VALUE, '1']],
      [LAMBDA, '|…', [VALUE, "'a'"]],
      [LAMBDA, '|…', [VALUE, "'b'"]],
    ]);
    expect(choice.root.isArrow).toBe(false);
    expect(choice.textOf(choice.root)).toBe("if($x.A > 1, |'a', |'b')");
    expect(
      shape(outlineOf("x | $x.PAYLOAD->get('k')->to(@String)").root),
    ).toEqual([
      CALL,
      'to',
      [CALL, 'get', [COLUMN, 'PAYLOAD'], [VALUE, "'k'"]],
      [TYPE, '@String'],
    ]);
    expect(shape(outlineOf("x | $x.'ship date'->year()").root)).toEqual([
      CALL,
      'year',
      [COLUMN, 'ship date'],
    ]);
    expect(shape(outlineOf('row | $row.A + 1').root)).toEqual([
      OPERATOR,
      '+',
      [COLUMN, 'A'],
      [VALUE, '1'],
    ]);
  });

  test('Reads an expression on several lines, its parts placed on them', () => {
    const outline = outlineOf('x | $x.price\n  * $x.amount\n  + 1 == 3');
    const [times] = outline.root.parts as CubeOutlinePart[];
    expect(times?.extent).toEqual({
      startLine: 1,
      startColumn: 5,
      endLine: 2,
      endColumn: 13,
    });
    expect(outline.textOf(times as CubeOutlinePart)).toBe(
      '$x.price * $x.amount',
    );
  });

  test('Reads an expression as a column stores it, without places: its parts, nothing to show or fix in the code', () => {
    const outline = outlineOf(
      "x | $x.COMPETITION->contains('Open') && ($x.VIEWERS > 1000000)",
      false,
    );
    expect(outline.isLocated).toBe(false);
    expect(shape(outline.root)).toEqual([
      OPERATOR,
      '&&',
      [CALL, 'contains', [COLUMN, 'COMPETITION'], [VALUE, "'Open'"]],
      [OPERATOR, '>', [COLUMN, 'VIEWERS'], [VALUE, '1000000']],
    ]);
    expect(
      findCubePrecedenceTraps(outlineOf('x | $x.A + 1 == 3', false)),
    ).toEqual([]);
  });

  test('Reads nothing but a lambda of one expression', () => {
    expect(
      V1_buildCubeExpressionOutline({ _type: 'integer', value: 1 }, '1'),
    ).toBeUndefined();
    expect(
      V1_buildCubeExpressionOutline(
        { _type: 'lambda', body: [], parameters: [] } as JsonObject,
        '|',
      ),
    ).toBeUndefined();
  });
});

describe('Precedence traps', () => {
  const fixed = (code: string): string =>
    applyCubeCodeEdits(
      code,
      getCubePrecedenceFixEdits(findCubePrecedenceTraps(outlineOf(code))),
    );

  test('Finds arithmetic before a comparison, and says how Pure reads it and what was meant', () => {
    const [trap, ...others] = findCubePrecedenceTraps(
      outlineOf('x | $x.A + 1 == 3'),
    );
    expect(others).toEqual([]);
    expect(trap?.kind).toBe(CubePrecedenceTrapKind.ARITHMETIC_THEN_COMPARISON);
    expect(trap?.readAs).toBe('$x.A + (1 == 3)');
    expect(trap?.meant).toBe('($x.A + 1) == 3');
    expect(fixed('x | $x.A + 1 == 3')).toBe('x | ($x.A + 1) == 3');
    expect(fixed('x | $x.A * 2 + 1 == 3')).toBe('x | ($x.A * 2 + 1) == 3');
    expect(fixed('x | $x.price\n  * $x.amount\n  + 1 == 3')).toBe(
      'x | ($x.price\n  * $x.amount\n  + 1) == 3',
    );
  });

  test('Finds `&&` or `!` before a comparison', () => {
    const [logic] = findCubePrecedenceTraps(
      outlineOf('x | $x.A > 0 && $x.A < 30'),
    );
    expect(logic?.kind).toBe(CubePrecedenceTrapKind.LOGIC_THEN_COMPARISON);
    expect(logic?.readAs).toBe('($x.A > 0 && $x.A) < 30');
    expect(logic?.meant).toBe('$x.A > 0 && ($x.A < 30)');
    expect(fixed('x | $x.A > 0 && $x.A < 30')).toBe(
      'x | $x.A > 0 && ($x.A < 30)',
    );
    const [negation] = findCubePrecedenceTraps(outlineOf('x | !$x.A > 3'));
    expect(negation?.kind).toBe(CubePrecedenceTrapKind.NOT_THEN_COMPARISON);
    expect(negation?.readAs).toBe('(!$x.A) > 3');
    expect(fixed('x | !$x.A > 3')).toBe('x | !($x.A > 3)');
  });

  test('Fixes every trap at once', () => {
    const code = 'x | $x.A > 0 && $x.B > 1 && $x.C > 2';
    expect(findCubePrecedenceTraps(outlineOf(code))).toHaveLength(2);
    expect(fixed(code)).toBe('x | $x.A > 0 && ($x.B > 1) && ($x.C > 2)');
  });

  test('Finds none where the code reads as written, or was put in parentheses so', () => {
    [
      'x | $x.A + (1 == 3)',
      'x | ($x.A > 0 && $x.A) < 30',
      'x | ($x.A + 1) == 3',
      'x | ($x.A > 0) && ($x.A < 30)',
      'x | $x.A == 1 && $x.B == 2',
      'x | $x.A != 3',
      "x | $x.COMPETITION->contains('Open') && ($x.VIEWERS > 1000000)",
      'x | $x.A / 2 - 1',
    ].forEach((code) =>
      expect([code, findCubePrecedenceTraps(outlineOf(code))]).toEqual([
        code,
        [],
      ]),
    );
  });
});

describe("The outline's parts: roles, types, and a value that can be empty where one is needed", () => {
  const COLUMNS = [
    new SchemaColumn('A', PrimitiveType.get('Integer'), true),
    new SchemaColumn('B', PrimitiveType.get('Boolean'), true),
    new SchemaColumn('price', PrimitiveType.get('Float'), true),
    new SchemaColumn('amount', PrimitiveType.get('Integer'), true),
    new SchemaColumn('CITY', PrimitiveType.get('String'), true),
    new SchemaColumn('COMPETITION', PrimitiveType.get('String'), false),
  ];
  const rowsOf = (code: string): ReturnType<typeof getCubeOutlineRows> =>
    getCubeOutlineRows(outlineOf(code), COLUMNS, TEST__functionCatalogue());
  const summary = (rows: ReturnType<typeof getCubeOutlineRows>): unknown[] =>
    rows.map((row) => [
      row.depth,
      row.role ?? '',
      row.part.label,
      row.family ?? '',
      row.needsValue ? 'needs a value' : '',
    ]);

  test('Flags an optional column in arithmetic, not one taken by toOne() nor one compared', () => {
    expect(summary(rowsOf('x | $x.price->toOne() * $x.amount'))).toEqual([
      [0, '', '*', TypeFamily.NUMBER, ''],
      [1, 'left', 'toOne', TypeFamily.FLOAT, ''],
      [2, 'values', 'price', TypeFamily.FLOAT, ''],
      [1, 'right', 'amount', TypeFamily.INTEGER, 'needs a value'],
    ]);
    expect(summary(rowsOf('x | $x.A > 0 && $x.A < 30'))).toEqual([
      [0, '', '<', TypeFamily.BOOLEAN, ''],
      [1, 'left', '&&', TypeFamily.BOOLEAN, ''],
      [2, 'left', '>', TypeFamily.BOOLEAN, ''],
      [3, 'left', 'A', TypeFamily.INTEGER, ''],
      [3, 'right', '0', TypeFamily.INTEGER, ''],
      [2, 'right', 'A', TypeFamily.INTEGER, 'needs a value'],
      [1, 'right', '30', TypeFamily.INTEGER, ''],
    ]);
    expect(summary(rowsOf('x | true || $x.B'))).toEqual([
      [0, '', '||', TypeFamily.BOOLEAN, ''],
      [1, 'left', 'true', TypeFamily.BOOLEAN, ''],
      [1, 'right', 'B', TypeFamily.BOOLEAN, 'needs a value'],
    ]);
  });

  test("Names a call's arguments as its signature does, and flags an optional one where every signature takes one value", () => {
    expect(summary(rowsOf("x | $x.CITY->lpad(10, '.')->toUpper()"))).toEqual([
      [0, '', 'toUpper', TypeFamily.STRING, ''],
      [1, 'source', 'lpad', TypeFamily.STRING, ''],
      [2, 'str', 'CITY', TypeFamily.STRING, 'needs a value'],
      [2, 'length', '10', TypeFamily.INTEGER, ''],
      [2, 'char', "'.'", TypeFamily.STRING, ''],
    ]);
    expect(
      summary(
        rowsOf(
          "x | $x.COMPETITION->contains('Open') && ($x.VIEWERS > 1000000)",
        ),
      ).slice(0, 4),
    ).toEqual([
      [0, '', '&&', TypeFamily.BOOLEAN, ''],
      [1, 'left', 'contains', TypeFamily.BOOLEAN, ''],
      [2, 'source', 'COMPETITION', TypeFamily.STRING, ''],
      [2, 'val', "'Open'", TypeFamily.STRING, ''],
    ]);
  });

  test('Gives the edits that take the one value, or a default, of an optional part', () => {
    const code = 'x | $x.price->toOne() * $x.amount';
    const amount = getCubeOutlineRows(outlineOf(code), COLUMNS, undefined).find(
      (row) => row.part.label === 'amount',
    );
    const part = amount?.part as CubeOutlinePart;
    expect(
      applyCubeCodeEdits(
        code,
        [getCubeToOneEdit(part)].filter(Boolean) as never,
      ),
    ).toBe('x | $x.price->toOne() * $x.amount->toOne()');
    expect(
      applyCubeCodeEdits(
        code,
        [getCubeCoalesceEdit(part, amount?.family)].filter(Boolean) as never,
      ),
    ).toBe('x | $x.price->toOne() * $x.amount->coalesce(0)');
    const city = "x | $x.CITY->lpad(10, '.')->toUpper()";
    const cityPart = outlineOf(city).root.parts[0]?.parts[0] as CubeOutlinePart;
    expect(
      applyCubeCodeEdits(city, [
        getCubeCoalesceEdit(cityPart, TypeFamily.STRING),
      ] as never),
    ).toBe("x | $x.CITY->coalesce('')->lpad(10, '.')->toUpper()");
    // no default for a date
    expect(
      getCubeCoalesceEdit(cityPart, TypeFamily.STRICT_DATE),
    ).toBeUndefined();
  });
});
