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
import { TypeFamily } from '@finos/legend-cube';
import {
  TEST__functionCatalogue,
  TEST__functionSignature,
} from '../../__test-utils__/CubeFunctionCatalogueTestUtils.js';
import {
  CubeFunction,
  CubeFunctionCatalogue,
  CubeFunctionCategory,
  getCubeFunctionCategory,
  parseCubeFunctionSignature,
  readCubeFunctionParameterNames,
} from '../CubeFunctionCatalogue.js';
import { withCubeOwnFunctions } from '../CubeOwnFunctions.js';

describe("Reading a signature as the engine's documentation writes it", () => {
  test('Reads its name, its parameters and what it returns', () => {
    expect(
      parseCubeFunctionSignature(
        'meta::pure::functions::string::contains(String[1], String[1]):Boolean[1]',
      ),
    ).toEqual({
      name: 'contains',
      parameters: [
        { type: 'String', multiplicity: '1' },
        { type: 'String', multiplicity: '1' },
      ],
      returnType: 'Boolean',
      returnMultiplicity: '1',
    });
  });

  test("Reads a lambda's or a relation's type as one parameter, an arrow's `>` not closing a bracket", () => {
    expect(
      parseCubeFunctionSignature(
        'meta::pure::functions::collection::contains(Z[*], Z[1], Function<{Z[1], Z[1]->Boolean[1]}>[1]):Boolean[1]',
      )?.parameters,
    ).toEqual([
      { type: 'Z', multiplicity: '*' },
      { type: 'Z', multiplicity: '1' },
      { type: 'Function<{Z[1], Z[1]->Boolean[1]}>', multiplicity: '1' },
    ]);
    expect(
      parseCubeFunctionSignature(
        'meta::pure::functions::relation::in(U[0..1], Relation<Z=(?:U)>[1]):Boolean[1]',
      )?.parameters,
    ).toEqual([
      { type: 'U', multiplicity: '0..1' },
      { type: 'Relation<Z=(?:U)>', multiplicity: '1' },
    ]);
    expect(
      parseCubeFunctionSignature(
        'meta::pure::functions::collection::map<T,V>(T[m], Function<{T[1]->V[1]}>[1]):V[m]',
      ),
    ).toEqual({
      name: 'map',
      parameters: [
        { type: 'T', multiplicity: 'm' },
        { type: 'Function<{T[1]->V[1]}>', multiplicity: '1' },
      ],
      returnType: 'V',
      returnMultiplicity: 'm',
    });
  });

  test("Reads nothing of text that isn't a signature", () => {
    expect(parseCubeFunctionSignature('contains')).toBeUndefined();
    expect(parseCubeFunctionSignature('contains(String[1])')).toBeUndefined();
    expect(
      parseCubeFunctionSignature('contains(String):Boolean[1]'),
    ).toBeUndefined();
  });

  test("Reads the parameters' names from the documentation's Parameters list", () => {
    expect(
      readCubeFunctionParameterNames(
        [
          'Whether `source` contains `val` anywhere within it.',
          '',
          '**Parameters**',
          '- `source` — the string to search in.',
          '- `val` — the substring to look for.',
          '',
          '**Returns** `true` if `val` occurs anywhere in `source`.',
        ].join('\n'),
      ),
    ).toEqual([
      { name: 'source', description: 'the string to search in.' },
      { name: 'val', description: 'the substring to look for.' },
    ]);
    expect(readCubeFunctionParameterNames('As `lpad`, with a space.')).toEqual(
      [],
    );
  });
});

describe('The functions a value can be passed to', () => {
  const namesFor = (family: TypeFamily | undefined): string[] =>
    TEST__functionCatalogue()
      .offersFor(family)
      .map((offer) => offer.function.name);

  test("Offers a text value its type's functions and any value's, not operators, lambdas, relations, or functions of many values but a row's", () => {
    expect(namesFor(TypeFamily.STRING)).toEqual([
      'contains',
      'lpad',
      'toUpper',
      'coalesce',
      'toOne',
      'isEmpty',
    ]);
    // the collection's contains takes many values first
    const [contains] = TEST__functionCatalogue().offersFor(TypeFamily.STRING);
    expect(contains?.signatures.map((each) => each.text)).toEqual([
      'contains(source: String[1], val: String[1]): Boolean[1]',
    ]);
  });

  test('Offers a number, a JSON value and a value of an unknown type theirs', () => {
    expect(namesFor(TypeFamily.FLOAT)).toEqual([
      'round',
      'coalesce',
      'toOne',
      'isEmpty',
    ]);
    expect(namesFor(TypeFamily.VARIANT)).toEqual([
      'coalesce',
      'toOne',
      'isEmpty',
      'get',
    ]);
    expect(namesFor(undefined)).toEqual(['coalesce', 'toOne', 'isEmpty']);
  });
});

describe('The functions to browse (EXPRESSION-EDITOR.md, round 2b)', () => {
  test('Lists the functions of values that give one value, by name: not operators, lambdas or relations', () => {
    const browsed = TEST__functionCatalogue().browse();
    expect(browsed.map((offer) => offer.function.name)).toEqual([
      'coalesce',
      'contains',
      'get',
      'isEmpty',
      'lpad',
      'round',
      'sum',
      'toOne',
      'toUpper',
    ]);
    expect(
      browsed.map((offer) =>
        getCubeFunctionCategory(offer.signatures[0] as never),
      ),
    ).toEqual([
      CubeFunctionCategory.EMPTY_VALUES,
      CubeFunctionCategory.TEXT,
      CubeFunctionCategory.JSON,
      CubeFunctionCategory.LISTS,
      CubeFunctionCategory.TEXT,
      CubeFunctionCategory.NUMBERS,
      CubeFunctionCategory.NUMBERS,
      CubeFunctionCategory.EMPTY_VALUES,
      CubeFunctionCategory.TEXT,
    ]);
    // both contains: of text, and of a list
    expect(
      browsed.find((offer) => offer.function.name === 'contains')?.signatures,
    ).toHaveLength(2);
  });

  test("Adds Cube's own substring and indexOf, documented with how their results differ by database, but where the engine has them", () => {
    const catalogue = withCubeOwnFunctions(TEST__functionCatalogue());
    const [substring] = catalogue.get('substring')?.signatures ?? [];
    expect(substring?.text).toBe(
      'substring(source: String[1], start: Integer[1], end: Integer[1]): String[1]',
    );
    expect(substring?.documentation).toContain(
      'On DuckDB, positions count from 1',
    );
    expect(catalogue.get('indexOf')?.signatures[0]?.documentation).toContain(
      'On H2 and DuckDB, positions count from 1, and 0 means it doesn’t appear',
    );
    expect(catalogue.browse().map((offer) => offer.function.name)).toContain(
      'substring',
    );
    // nothing added twice
    expect(
      withCubeOwnFunctions(catalogue).get('substring')?.signatures,
    ).toHaveLength(1);
  });

  test("Adds the text's indexOf beside the engine's indexOf of a list, first", () => {
    const listIndexOf = TEST__functionSignature(
      'meta::pure::functions::collection',
      'indexOf',
      [
        ['T', '*', 'set'],
        ['T', '1', 'value'],
      ],
      ['Integer', '1'],
      'The position of a value in a list.',
    );
    const catalogue = withCubeOwnFunctions(
      new CubeFunctionCatalogue([
        new CubeFunction(
          'indexOf',
          ['meta::pure::functions::collection'],
          [listIndexOf],
        ),
      ]),
    );
    const indexOf = catalogue.get('indexOf');
    expect(indexOf?.signatures.map((each) => each.text)).toEqual([
      'indexOf(source: String[1], toFind: String[1]): Integer[1]',
      'indexOf(set: T[*], value: T[1]): Integer[1]',
    ]);
    expect(indexOf?.packages).toEqual([
      'meta::pure::functions::string',
      'meta::pure::functions::collection',
    ]);
  });
});
