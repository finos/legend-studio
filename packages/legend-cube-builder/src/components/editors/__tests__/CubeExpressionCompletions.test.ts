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
import { PrimitiveType, SchemaColumn } from '@finos/legend-cube';
import type { CodeEditorCompletion } from '@finos/legend-lego/code-editor';
import type { CubeCodeCompletion } from '../../../graph-manager/CubeEngine.js';
import { TEST__functionCatalogue } from '../../../__test-utils__/CubeFunctionCatalogueTestUtils.js';
import {
  CUBE_ENGINE_COMPLETIONS_WAIT_MS,
  getCubeExpressionCompletions,
  getCubeExpressionCompletionSource,
  getCubeFunctionHoverSource,
  getCubeFunctionSignatureHelpSource,
  mergeCubeEngineCompletions,
  readCubeCallAtCursor,
} from '../CubeExpressionCompletions.js';

const COLUMNS = [
  new SchemaColumn('ORDER_ID', PrimitiveType.get('Integer'), false),
  new SchemaColumn('CITY', PrimitiveType.get('String'), true),
  new SchemaColumn('ship date', PrimitiveType.get('StrictDate'), false),
  new SchemaColumn('PAYLOAD', PrimitiveType.get('Variant'), true),
];

const labels = (text: string): string[] =>
  getCubeExpressionCompletions(text, COLUMNS).map((each) => each.label);

describe("A Pure expression's completions as it is typed", () => {
  test('Lists the columns after `$x.`, with their types, a name that is not an identifier quoted', () => {
    const completions = getCubeExpressionCompletions('x | $x.', COLUMNS);
    expect(completions.map((each) => each.label)).toEqual([
      'ORDER_ID',
      'CITY',
      'ship date',
      'PAYLOAD',
    ]);
    expect(completions.map((each) => each.insertText)).toEqual([
      'ORDER_ID',
      'CITY',
      "'ship date'",
      'PAYLOAD',
    ]);
    expect(completions.map((each) => each.detail)).toEqual([
      'Whole number',
      'Text, optional',
      'Date',
      'Variant, optional',
    ]);
    // what was typed of the name is replaced
    expect(
      getCubeExpressionCompletions('x | $x.CI', COLUMNS)[0]?.replaceLength,
    ).toBe(2);
  });

  test("Lists them after `$`, as the lambda's parameter and the column", () => {
    expect(labels('row | $')).toEqual([
      'row.ORDER_ID',
      'row.CITY',
      'row.ship date',
      'row.PAYLOAD',
    ]);
    const [first] = getCubeExpressionCompletions('row | $ro', COLUMNS);
    expect(first?.insertText).toBe('row.ORDER_ID');
    expect(first?.replaceLength).toBe(2);
    expect(labels('row | $x')).toEqual([]);
    // `x` until the parameter is written
    expect(labels('$')[0]).toBe('x.ORDER_ID');
  });

  test("Lists a column's functions after `->`: its type's, then every value's, `toOne()` first for an optional one", () => {
    expect(labels('x | $x.ORDER_ID->')).toEqual([
      'abs',
      'round',
      'floor',
      'ceiling',
      'toString',
      'isEmpty',
      'isNotEmpty',
      'in',
      'toOne',
    ]);
    expect(labels('x | $x.CITY->')).toEqual([
      'toOne',
      'contains',
      'startsWith',
      'endsWith',
      'toUpper',
      'toLower',
      'trim',
      'length',
      'substring',
      'indexOf',
      'isEmpty',
      'isNotEmpty',
      'in',
    ]);
    expect(labels("x | $x.'ship date'->ye")).toEqual([
      'year',
      'monthNumber',
      'dayOfMonth',
      'toString',
      'isEmpty',
      'isNotEmpty',
      'in',
      'toOne',
    ]);
    expect(labels('x | $x.PAYLOAD->')).toEqual(['toOne', 'get', 'to']);
    const [contains] = getCubeExpressionCompletions(
      'x | $x.CITY->toOne()->co',
      COLUMNS,
    );
    // after a call, nothing is known of the value's type
    expect(contains).toBeUndefined();
    const [snippet] = getCubeExpressionCompletions(
      'x | $x.CITY->sta',
      COLUMNS,
    ).filter((each) => each.label === 'startsWith');
    expect(snippet?.insertText).toBe("startsWith('${1}')");
    expect(snippet?.isSnippet).toBe(true);
    expect(snippet?.replaceLength).toBe(3);
  });

  test('Lists nothing elsewhere, e.g. in a string or after a call', () => {
    expect(labels("x | $x.CITY == 'a")).toEqual([]);
    expect(labels('x | 1 + ')).toEqual([]);
    // an unknown column: every value's functions only
    expect(labels('x | $x.NOT_THERE->')).toEqual([
      'isEmpty',
      'isNotEmpty',
      'in',
      'toOne',
    ]);
  });
});

describe("The engine's completions, after Cube's own", () => {
  const ENGINE: CubeCodeCompletion[] = [
    { completion: 'CITY', display: 'CITY' },
    { completion: 'contains(', display: 'contains(String[1])' },
    { completion: 'matches(', display: 'matches' },
  ];

  test('Come after them, those Cube offers already left out, completing the word being typed', () => {
    const own = getCubeExpressionCompletions('x | $x.CITY->', COLUMNS);
    const merged = mergeCubeEngineCompletions(own, ENGINE, 'x | $x.CITY->ma');
    expect(merged.slice(0, own.length)).toEqual(own);
    // contains is Cube's already
    expect(merged.slice(own.length)).toEqual([
      expect.objectContaining({ label: 'CITY', insertText: 'CITY' }),
      expect.objectContaining({
        label: 'matches',
        insertText: 'matches(',
        replaceLength: 2,
      }),
    ]);
  });

  const labelsOf = async (
    completions:
      | Promise<readonly CodeEditorCompletion[]>
      | readonly CodeEditorCompletion[],
  ): Promise<string[]> => (await completions).map((each) => each.label);

  test("Show Cube's own alone when the engine fails, completes no code, or takes too long", async () => {
    const own = labels('x | $x.');
    const failing = getCubeExpressionCompletionSource(COLUMNS, () =>
      Promise.reject(new Error('Unexpected token')),
    );
    expect(await labelsOf(failing.getCompletions('x | $x.'))).toEqual(own);
    const none = getCubeExpressionCompletionSource(COLUMNS, () =>
      Promise.resolve(undefined),
    );
    expect(await labelsOf(none.getCompletions('x | $x.'))).toEqual(own);
    jest.useFakeTimers();
    try {
      const slow = getCubeExpressionCompletionSource(
        COLUMNS,
        () => new Promise(() => undefined),
      );
      const completions = slow.getCompletions('x | $x.');
      jest.advanceTimersByTime(CUBE_ENGINE_COMPLETIONS_WAIT_MS);
      expect(await labelsOf(completions)).toEqual(own);
    } finally {
      jest.useRealTimers();
    }
    const engine = getCubeExpressionCompletionSource(COLUMNS, () =>
      Promise.resolve(ENGINE),
    );
    expect(await labelsOf(engine.getCompletions('x | $x.'))).toEqual([
      ...own,
      'contains(String[1])',
      'matches',
    ]);
  });
});

describe("The engine's function catalogue (EXPRESSION-EDITOR.md, round 1)", () => {
  const CATALOGUE = TEST__functionCatalogue();
  const completionsOf = (text: string): CodeEditorCompletion[] =>
    getCubeExpressionCompletions(text, COLUMNS, CATALOGUE);

  test("Offers every function of a column's type: Cube's own first, then the others by name, `toOne()` and `coalesce()` first for an optional one", () => {
    expect(completionsOf('x | $x.CITY->').map((each) => each.label)).toEqual([
      'toOne',
      'coalesce',
      'contains',
      'startsWith',
      'endsWith',
      'toUpper',
      'toLower',
      'trim',
      'length',
      // Cube's own, though the catalogue hasn't them
      'substring',
      'indexOf',
      'isEmpty',
      'isNotEmpty',
      'in',
      'lpad',
    ]);
    expect(
      completionsOf('x | $x.ORDER_ID->').map((each) => each.label),
    ).toEqual([
      'abs',
      'round',
      'floor',
      'ceiling',
      'toString',
      'isEmpty',
      'isNotEmpty',
      'in',
      'toOne',
      'coalesce',
    ]);
  });

  test('Gives each its signature and documentation, a call of its fewest parameters to fill, Cube’s own snippet first', () => {
    const byName = new Map(
      completionsOf('x | $x.CITY->').map((each) => [each.label, each]),
    );
    const contains = byName.get('contains');
    expect(contains?.insertText).toBe("contains('${1}')");
    expect(contains?.detail).toBe(
      'contains(source: String[1], val: String[1]): Boolean[1]',
    );
    // its one signature, which the detail writes, then what it does
    expect(contains?.documentation).toBe(
      'Whether `source` contains `val` anywhere within it.',
    );
    // the help opens as its arguments are written
    expect(contains?.opensSignatureHelp).toBe(true);
    expect(byName.get('toUpper')?.opensSignatureHelp).toBe(false);
    const lpad = byName.get('lpad');
    // its parameter named as the other signature names it
    expect(lpad?.insertText).toBe('lpad(${1:length})');
    expect(lpad?.isSnippet).toBe(true);
    expect(lpad?.detail).toBe(
      'lpad(String[1], Integer[1]): String[1] (+1 more)',
    );
    // each of its signatures, then what it does
    expect(lpad?.documentation).toBe(
      [
        '```pure',
        'lpad(str: String[1], length: Integer[1], char: String[1]): String[1]',
        '```',
        '',
        'Pads the beginning of a string.',
        '',
        '---',
        '',
        '```pure',
        'lpad(String[1], Integer[1]): String[1]',
        '```',
        '',
        'As `lpad`, padding with a space.',
      ].join('\n'),
    );
    // a text parameter quoted, a name for each placeholder
    const coalesce = byName.get('coalesce');
    expect(coalesce?.insertText).toBe('coalesce(${1:otherwise})');
    expect(
      completionsOf('x | $x.PAYLOAD->').find((each) => each.label === 'get')
        ?.insertText,
    ).toBe("get('${1}')");
  });

  test('Offers the functions of any value after a column it does not know', () => {
    expect(
      completionsOf('x | $x.NOT_THERE->').map((each) => each.label),
    ).toEqual(['isEmpty', 'isNotEmpty', 'in', 'toOne', 'coalesce']);
  });

  test("Shows a function's signatures and documentation over its name, as a call writes it", () => {
    const hover = getCubeFunctionHoverSource(CATALOGUE);
    expect(getCubeFunctionHoverSource(undefined)).toBeUndefined();
    const contains = hover?.getHover('contains', 'x | $x.CITY->', "('a')");
    expect(contains).toContain(
      '```pure\ncontains(source: String[1], val: String[1]): Boolean[1]\n```',
    );
    expect(contains).toContain(
      '```pure\ncontains(collection: Any[*], value: Any[1]): Boolean[1]\n```',
    );
    // written as `contains(…)` too
    expect(hover?.getHover('contains', 'x | ', '($x.CITY, 1)')).toBe(contains);
    // not a call, a column, a function it hasn't, in a string, or the platform's own
    expect(hover?.getHover('contains', 'x | $x.', ' == 1')).toBeUndefined();
    expect(hover?.getHover('CITY', 'x | $x.', '->')).toBeUndefined();
    expect(hover?.getHover('nope', 'x | $x.CITY->', '()')).toBeUndefined();
    expect(
      hover?.getHover('contains', "x | $x.CITY == 'a->", "()'"),
    ).toBeUndefined();
    expect(hover?.getHover('size', 'x | $x.CITY->', '()')).toBeUndefined();
  });

  test('Reads the call whose arguments the cursor is in, and which of them', () => {
    expect(readCubeCallAtCursor('x | $x.CITY->contains(')).toEqual({
      name: 'contains',
      isArrow: true,
      argument: 1,
    });
    expect(readCubeCallAtCursor('x | $x.CITY->lpad(3, ')).toEqual({
      name: 'lpad',
      isArrow: true,
      argument: 2,
    });
    expect(readCubeCallAtCursor('x | lpad($x.CITY, ')).toEqual({
      name: 'lpad',
      isArrow: false,
      argument: 1,
    });
    // a string's commas and brackets are its text; a call closed is passed
    expect(readCubeCallAtCursor("x | $x.CITY->contains('a, (b'")).toMatchObject(
      { name: 'contains', argument: 1 },
    );
    expect(
      readCubeCallAtCursor('x | lpad($x.CITY->toOne(), 3, '),
    ).toMatchObject({ name: 'lpad', argument: 2 });
    // in a list or a lambda, after a call, or in brackets of no call
    expect(readCubeCallAtCursor('x | $x.A->in([1, ')).toBeUndefined();
    expect(readCubeCallAtCursor("x | $x.CITY->contains('a')")).toBeUndefined();
    expect(readCubeCallAtCursor('x | ($x.A + ')).toBeUndefined();
  });

  test("Shows a call's signatures as its arguments are written, the shortest that takes them active, each parameter where its signature writes it", () => {
    const help = getCubeFunctionSignatureHelpSource(CATALOGUE);
    expect(getCubeFunctionSignatureHelpSource(undefined)).toBeUndefined();
    expect(help?.triggerCharacters).toEqual(['(', ',']);
    // one argument: the signature of two, not the first of three
    expect(help?.getSignatureHelp('x | $x.CITY->lpad(')?.activeSignature).toBe(
      1,
    );
    const lpad = help?.getSignatureHelp('x | $x.CITY->lpad(3, ');
    expect(lpad?.activeSignature).toBe(0);
    expect(lpad?.activeParameter).toBe(2);
    const [three, two] = lpad?.signatures ?? [];
    expect(three?.label).toBe(
      'lpad(str: String[1], length: Integer[1], char: String[1]): String[1]',
    );
    const textOf = (
      label: string | undefined,
      at: string | readonly [number, number] | undefined,
    ): string | undefined =>
      typeof at === 'string' ? at : label?.slice(at?.[0], at?.[1]);
    expect(
      three?.parameters.map((each) => textOf(three.label, each.label)),
    ).toEqual(['str: String[1]', 'length: Integer[1]', 'char: String[1]']);
    // a parameter's type, not the result's, though both are written alike
    expect(
      two?.parameters.map((each) => textOf(two.label, each.label)),
    ).toEqual(['String[1]', 'Integer[1]']);
    expect(two?.parameters[0]?.label).toEqual([5, 14]);
    // the signature taking as many arguments as are written
    const round = help?.getSignatureHelp('x | $x.FREIGHT->round(');
    expect(round?.activeSignature).toBe(1);
    const contains = help?.getSignatureHelp("x | $x.CITY->contains('");
    expect(contains?.activeParameter).toBe(1);
    expect(contains?.signatures[0]?.parameters[1]?.documentation).toBe(
      'the substring to look for.',
    );
    expect(help?.getSignatureHelp('x | nope(')).toBeUndefined();
    expect(help?.getSignatureHelp('x | $x.CITY')).toBeUndefined();
  });
});
