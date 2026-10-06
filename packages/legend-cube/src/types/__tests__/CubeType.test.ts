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
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import {
  EnumType,
  OpaqueType,
  PrimitiveType,
  resolveCubeType,
} from '../CubeType.js';
import { PRIMITIVE_TYPE_INFOS } from '../PrimitiveTypeRegistry.js';
import { TypeFamily } from '../TypeFamily.js';

const PRECISE = 'meta::pure::precisePrimitives::';

// Every primitive type the engine returns: [path, parameters, display name, family]
const PRIMITIVES: [string, number[], string, TypeFamily][] = [
  ['Boolean', [], 'Boolean', TypeFamily.BOOLEAN],
  ['String', [], 'String', TypeFamily.STRING],
  [`${PRECISE}Varchar`, [15], 'Varchar(15)', TypeFamily.STRING],
  // database views type every column as `Varchar(0)`
  [`${PRECISE}Varchar`, [0], 'Varchar(0)', TypeFamily.STRING],
  ['Number', [], 'Number', TypeFamily.NUMBER],
  ['Integer', [], 'Integer', TypeFamily.INTEGER],
  [`${PRECISE}TinyInt`, [], 'TinyInt', TypeFamily.INTEGER],
  [`${PRECISE}UTinyInt`, [], 'UTinyInt', TypeFamily.INTEGER],
  [`${PRECISE}SmallInt`, [], 'SmallInt', TypeFamily.INTEGER],
  [`${PRECISE}USmallInt`, [], 'USmallInt', TypeFamily.INTEGER],
  [`${PRECISE}Int`, [], 'Int', TypeFamily.INTEGER],
  [`${PRECISE}UInt`, [], 'UInt', TypeFamily.INTEGER],
  [`${PRECISE}BigInt`, [], 'BigInt', TypeFamily.INTEGER],
  [`${PRECISE}UBigInt`, [], 'UBigInt', TypeFamily.INTEGER],
  ['Float', [], 'Float', TypeFamily.FLOAT],
  [`${PRECISE}Float4`, [], 'Float4', TypeFamily.FLOAT],
  [`${PRECISE}Double`, [], 'Double', TypeFamily.FLOAT],
  ['Decimal', [], 'Decimal', TypeFamily.DECIMAL],
  [`${PRECISE}Numeric`, [10, 2], 'Numeric(10,2)', TypeFamily.DECIMAL],
  ['Date', [], 'Date', TypeFamily.DATE],
  ['StrictDate', [], 'StrictDate', TypeFamily.STRICT_DATE],
  ['DateTime', [], 'DateTime', TypeFamily.DATETIME],
  [`${PRECISE}Timestamp`, [], 'Timestamp', TypeFamily.DATETIME],
  ['StrictTime', [], 'StrictTime', TypeFamily.STRICT_TIME],
  [
    'meta::pure::metamodel::variant::Variant',
    [],
    'Variant',
    TypeFamily.VARIANT,
  ],
];

const formatParameters = (params: number[]): string =>
  params.length ? `(${params.join(',')})` : '';

describe(unitTest('Primitive types'), () => {
  test('The table covers every primitive in the registry', () => {
    expect(new Set(PRIMITIVES.map(([path]) => path))).toEqual(
      new Set(PRIMITIVE_TYPE_INFOS.map((info) => info.path)),
    );
  });

  test.each(PRIMITIVES)(
    'Resolves %s%j by full path and by short name',
    (path, params, displayName, family) => {
      const type = resolveCubeType(path, params);
      expect(type).toBeInstanceOf(PrimitiveType);
      expect(type.path).toBe(path);
      expect(type.family).toBe(family);
      expect(type.displayName).toBe(displayName);
      expect(type.toString()).toBe(displayName);
      expect(type.fullName).toBe(`${path}${formatParameters(params)}`);
      // interned: every way of getting the type gives the same instance
      const shortName = path.slice(path.lastIndexOf(':') + 1);
      expect(resolveCubeType(shortName, params)).toBe(type);
      expect(PrimitiveType.get(path, params)).toBe(type);
      expect(PrimitiveType.get(shortName, params)).toBe(type);
    },
  );

  test('Are interned by path and parameters', () => {
    const varchar5 = PrimitiveType.get('Varchar', [5]);
    expect(PrimitiveType.get('Varchar', [5])).toBe(varchar5);
    expect(varchar5.equals(PrimitiveType.get('Varchar', [5]))).toBe(true);
    expect(varchar5.equals(PrimitiveType.get('Varchar', [40]))).toBe(false);
    expect(varchar5.equals(PrimitiveType.get('String'))).toBe(false);
    expect(
      PrimitiveType.get('Numeric', [10, 2]).equals(
        PrimitiveType.get('Numeric', [10, 3]),
      ),
    ).toBe(false);
  });

  test('Keep their own copy of the parameters', () => {
    const params = [7];
    const type = PrimitiveType.get('Varchar', params);
    params[0] = 8;
    expect(type.displayName).toBe('Varchar(7)');
    expect(Object.isFrozen(type.params)).toBe(true);
  });

  test('Form the type hierarchy through their parents', () => {
    const chain = (type: PrimitiveType | undefined): string[] =>
      type ? [type.displayName, ...chain(type.parent)] : [];
    expect(chain(PrimitiveType.get('Varchar', [15]))).toEqual([
      'Varchar(15)',
      'String',
    ]);
    expect(chain(PrimitiveType.get('SmallInt'))).toEqual([
      'SmallInt',
      'Integer',
      'Number',
    ]);
    expect(chain(PrimitiveType.get('Float4'))).toEqual([
      'Float4',
      'Float',
      'Number',
    ]);
    expect(chain(PrimitiveType.get('Numeric', [10, 2]))).toEqual([
      'Numeric(10,2)',
      'Decimal',
      'Number',
    ]);
    expect(chain(PrimitiveType.get('Timestamp'))).toEqual([
      'Timestamp',
      'DateTime',
      'Date',
    ]);
    expect(chain(PrimitiveType.get('StrictDate'))).toEqual([
      'StrictDate',
      'Date',
    ]);
    expect(chain(PrimitiveType.get('StrictTime'))).toEqual(['StrictTime']);
    expect(chain(PrimitiveType.get('Variant'))).toEqual(['Variant']);
  });

  test.each<[string, number[]]>([
    ['Unknown', []],
    ['Varchar', []],
    ['Numeric', [10]],
    ['Varchar', [-1]],
    ['Varchar', [1.5]],
    ['String', [5]],
  ])('PrimitiveType.get() rejects %s%j', (path, params) => {
    expect(() => PrimitiveType.get(path, params)).toThrow();
  });
});

describe(unitTest('Opaque types'), () => {
  test.each<[string, number[], string]>([
    // unknown paths
    ['my::model::Unknown', [], 'Unknown'],
    ['my::model::Unknown', [3], 'Unknown(3)'],
    // known paths with parameters that don't fit
    ['Varchar', [], 'Varchar'],
    [`${PRECISE}Numeric`, [10], 'Numeric(10)'],
    ['Varchar', [-1], 'Varchar(-1)'],
    ['Varchar', [1.5], 'Varchar(1.5)'],
    ['String', [5], 'String(5)'],
  ])(
    'Resolving %s%j gives an opaque type, never an error',
    (path, params, displayName) => {
      const type = resolveCubeType(path, params);
      expect(type).toBeInstanceOf(OpaqueType);
      expect(type.family).toBe(TypeFamily.OPAQUE);
      expect(type.path).toBe(path);
      expect(type.displayName).toBe(displayName);
      expect(type.fullName).toBe(`${path}${formatParameters(params)}`);
      expect(resolveCubeType(path, params)).toBe(type);
    },
  );

  test('Are distinct from the primitive types', () => {
    expect(
      resolveCubeType('Varchar').equals(PrimitiveType.get('Varchar', [0])),
    ).toBe(false);
    expect(
      OpaqueType.get('my::Unknown').equals(OpaqueType.get('my::Unknown', [1])),
    ).toBe(false);
  });
});

describe(unitTest('Enumerations'), () => {
  test('Are equal when their paths are, whatever their values', () => {
    const color = new EnumType('my::model::Color', ['RED', 'GREEN']);
    expect(color.equals(new EnumType('my::model::Color', ['BLUE']))).toBe(true);
    expect(color.equals(new EnumType('my::other::Color', ['RED']))).toBe(false);
    expect(color.equals(PrimitiveType.get('String'))).toBe(false);
    expect(color.family).toBe(TypeFamily.ENUM);
    expect(color.displayName).toBe('Color');
    expect(color.toString()).toBe('Color');
    expect(color.fullName).toBe('my::model::Color');
    expect(color.values).toEqual(['RED', 'GREEN']);
  });

  test('Need a path and distinct values', () => {
    expect(() => new EnumType('', ['RED'])).toThrow();
    expect(() => new EnumType('my::model::Color', [])).toThrow();
    expect(() => new EnumType('my::model::Color', ['RED', 'RED'])).toThrow();
  });
});
