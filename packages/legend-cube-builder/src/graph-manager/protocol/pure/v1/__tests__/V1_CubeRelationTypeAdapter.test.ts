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
import { OpaqueType, PrimitiveType, TypeFamily } from '@finos/legend-cube';
import type { PlainObject } from '@finos/legend-shared';
import { V1_buildCubeSchema } from '../V1_CubeRelationTypeAdapter.js';

const P = 'meta::pure::precisePrimitives::';

/** A relation type column, as the engine writes it */
const column = (
  name: string,
  path: string,
  params: unknown[] = [],
  lowerBound = 0,
): object => ({
  name,
  genericType: {
    rawType: { _type: 'packageableType', fullPath: path },
    typeArguments: [],
    multiplicityArguments: [],
    typeVariableValues: params,
  },
  multiplicity: { lowerBound, upperBound: 1 },
});

const relationType = (...columns: object[]): PlainObject => ({
  _type: 'relationType',
  columns,
});

describe('Cube relation type adapter', () => {
  test('Reads each column in order, with its type, parameters and nullability', () => {
    const schema = V1_buildCubeSchema(
      relationType(
        column('ORDER_ID', `${P}SmallInt`, [], 1),
        column('CUSTOMER_ID', `${P}Varchar`, [{ _type: 'integer', value: 5 }]),
        column('FREIGHT', `${P}Numeric`, [
          { _type: 'integer', value: 10 },
          { _type: 'integer', value: 2 },
        ]),
        column('ORDER_DATE', 'StrictDate'),
      ),
    );
    expect(
      schema.columns.map((schemaColumn) => [
        schemaColumn.name,
        schemaColumn.type,
        schemaColumn.nullable,
      ]),
    ).toEqual([
      ['ORDER_ID', PrimitiveType.get(`${P}SmallInt`), false],
      ['CUSTOMER_ID', PrimitiveType.get(`${P}Varchar`, [5]), true],
      ['FREIGHT', PrimitiveType.get(`${P}Numeric`, [10, 2]), true],
      ['ORDER_DATE', PrimitiveType.get('StrictDate'), true],
    ]);
  });

  test('Keeps column names as the engine gives them, unquoted', () => {
    expect(
      V1_buildCubeSchema(relationType(column('Unit Price', 'Float'))).columns[0]
        ?.name,
    ).toBe('Unit Price');
  });

  test('Reads a type it does not know, or parameters that do not fit, as an opaque type', () => {
    const schema = V1_buildCubeSchema(
      relationType(
        column('SHAPE', 'my::geo::Polygon', [{ _type: 'integer', value: 3 }]),
        column('CODE', `${P}Varchar`),
      ),
    );
    expect(schema.columns.map((schemaColumn) => schemaColumn.type)).toEqual([
      OpaqueType.get('my::geo::Polygon', [3]),
      OpaqueType.get(`${P}Varchar`),
    ]);
    expect(schema.columns[0]?.type.family).toBe(TypeFamily.OPAQUE);
  });

  test("Refuses a type parameter that isn't an integer", () => {
    expect(() =>
      V1_buildCubeSchema(
        relationType(
          column('C', `${P}Varchar`, [{ _type: 'string', value: '5' }]),
        ),
      ),
    ).toThrow(`Column "C" has a type parameter Cube can't read`);
  });

  test('Reads an empty relation type as an empty schema', () => {
    expect(V1_buildCubeSchema(relationType()).columns).toEqual([]);
  });
});
