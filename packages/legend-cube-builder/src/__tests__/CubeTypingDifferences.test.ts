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
import { PrimitiveType, Schema, SchemaColumn } from '@finos/legend-cube';
import { TEST__typingDifferences } from '../__test-utils__/CubeOperationsTestUtils.js';

// The comparator the engine tests hold Cube's inference to (PLAN §11.5)

const P = 'meta::pure::precisePrimitives::';

const schema = (
  ...columns: [name: string, type: string, nullable: boolean, size?: number][]
): Schema =>
  new Schema(
    columns.map(
      ([name, type, nullable, size]) =>
        new SchemaColumn(
          name,
          PrimitiveType.get(`${P}${type}`, size === undefined ? [] : [size]),
          nullable,
        ),
    ),
  );

const ID_NAME = schema(['ID', 'BigInt', false], ['NAME', 'Varchar', true, 10]);

describe('Typing differences', () => {
  test('Finds none in the same schema', () => {
    expect(TEST__typingDifferences('k', ID_NAME, ID_NAME)).toEqual([]);
  });

  test.each<[string, Schema]>([
    [
      'another name',
      schema(['ID', 'BigInt', false], ['LABEL', 'Varchar', true, 10]),
    ],
    [
      'another order',
      schema(['NAME', 'Varchar', true, 10], ['ID', 'BigInt', false]),
    ],
    [
      'another type',
      schema(['ID', 'Int', false], ['NAME', 'Varchar', true, 10]),
    ],
    [
      'another parameter',
      schema(['ID', 'BigInt', false], ['NAME', 'Varchar', true, 20]),
    ],
    ['a missing column', schema(['ID', 'BigInt', false])],
  ])('Reports %s, whatever the nullability rule', (_, engine) => {
    [{}, { oneWay: true }, { widerNullable: ['ID', 'NAME'] }].forEach(
      (options) => {
        expect(TEST__typingDifferences('k', ID_NAME, engine, options)).toEqual([
          `k: columns [ID: ${P}BigInt, NAME: ${P}Varchar(10)], the engine's [${engine.columns
            .map((column) => `${column.name}: ${column.type.fullName}`)
            .join(', ')}]`,
        ]);
      },
    );
  });

  test('Reports a column Cube says is nullable that the engine says is not, and the other way round', () => {
    expect(
      TEST__typingDifferences(
        'k',
        schema(['ID', 'BigInt', true], ['NAME', 'Varchar', false, 10]),
        ID_NAME,
      ),
    ).toEqual([
      "k: ID is nullable, the engine's not nullable",
      "k: NAME is not nullable, the engine's nullable",
    ]);
  });

  test('Lets Cube be wider only where the case says, and requires it there', () => {
    const wider = schema(['ID', 'BigInt', true], ['NAME', 'Varchar', true, 10]);
    expect(
      TEST__typingDifferences('k', wider, ID_NAME, { widerNullable: ['ID'] }),
    ).toEqual([]);
    expect(
      TEST__typingDifferences('k', ID_NAME, ID_NAME, { widerNullable: ['ID'] }),
    ).toEqual(['k: ID should be nullable']);
    expect(
      TEST__typingDifferences('k', wider, ID_NAME, {
        widerNullable: ['NAME'],
      }),
    ).toEqual(["k: ID is nullable, the engine's not nullable"]);
  });

  test('Lets Cube be wider anywhere one way, never narrower', () => {
    expect(
      TEST__typingDifferences(
        'k',
        schema(['ID', 'BigInt', true], ['NAME', 'Varchar', true, 10]),
        ID_NAME,
        { oneWay: true },
      ),
    ).toEqual([]);
    expect(
      TEST__typingDifferences(
        'k',
        schema(['ID', 'BigInt', false], ['NAME', 'Varchar', false, 10]),
        ID_NAME,
        { oneWay: true },
      ),
    ).toEqual(["k: NAME is not nullable, the engine's nullable"]);
  });

  test('Reports a node Cube or the engine gives no schema', () => {
    expect(TEST__typingDifferences('k', undefined, ID_NAME)).toEqual([
      'k: Cube infers no schema',
    ]);
    expect(
      TEST__typingDifferences('k', ID_NAME, new Error('Compilation error')),
    ).toEqual(['k: the engine gives no schema (Compilation error)']);
  });
});
