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
  CubeJsonScalarKind,
  type CubeJsonShape,
  describeCubeJsonShape,
  getCubeJsonScalarType,
  getCubeJsonTopValues,
  inferCubeJsonShape,
} from '../CubeJsonShape.js';

/** The shape of one position's values, each given as its JSON */
const shapeOf = (...values: string[]): CubeJsonShape =>
  inferCubeJsonShape(values.map((value) => `{"v": ${value}}`)).shape.fields.get(
    'v',
  ) as CubeJsonShape;

describe('The shape of a Variant column’s documents (PLAN §11.20)', () => {
  test('Counts the rows read, the empty ones and those that are not JSON, and how often each field is there', () => {
    const sample = inferCubeJsonShape([
      '{"a": 1, "b": {"c": "x"}}',
      '{"a": null}',
      null,
      'not json',
    ]);
    expect(sample.rows).toBe(4);
    expect(sample.unreadable).toBe(1);
    expect(sample.complete).toBe(false);
    const { shape } = sample;
    expect(shape.present).toBe(2);
    expect(shape.objects).toBe(2);
    expect([...shape.fields.keys()]).toEqual(['a', 'b']);
    expect(shape.fields.get('a')).toMatchObject({ present: 2, nulls: 1 });
    expect(shape.fields.get('b')?.fields.get('c')?.present).toBe(1);
  });

  test('Reads numbers by their text: 1 is a whole number, 1.0 a fraction, and a whole number past 64 bits is text', () => {
    expect(getCubeJsonScalarType(shapeOf('1', '2'))).toBe(
      CubeJsonScalarKind.INTEGER,
    );
    expect(getCubeJsonScalarType(shapeOf('1.0'))).toBe(
      CubeJsonScalarKind.FLOAT,
    );
    expect(getCubeJsonScalarType(shapeOf('9223372036854775807'))).toBe(
      CubeJsonScalarKind.INTEGER,
    );
    expect(getCubeJsonScalarType(shapeOf('9223372036854775808'))).toBe(
      CubeJsonScalarKind.TEXT,
    );
  });

  test('Picks one type conservatively: whole numbers with fractions are numbers, any other mix is text', () => {
    expect(getCubeJsonScalarType(shapeOf('1', '2.5'))).toBe(
      CubeJsonScalarKind.FLOAT,
    );
    // "7" is text: a string, though it looks like a number
    expect(getCubeJsonScalarType(shapeOf('12.5', '"7"'))).toBe(
      CubeJsonScalarKind.TEXT,
    );
    expect(getCubeJsonScalarType(shapeOf('"2024-01-31"', '"2024-02-29"'))).toBe(
      CubeJsonScalarKind.DATE,
    );
    expect(
      getCubeJsonScalarType(
        shapeOf('"2024-01-31T10:00:00Z"', '"2024-01-31 10:00"'),
      ),
    ).toBe(CubeJsonScalarKind.DATETIME);
    // dates only when every value is one
    expect(
      getCubeJsonScalarType(shapeOf('"2024-01-31"', '"2024-01-31T10:00:00Z"')),
    ).toBe(CubeJsonScalarKind.TEXT);
    expect(getCubeJsonScalarType(shapeOf('"2024-01-31"', '"soon"'))).toBe(
      CubeJsonScalarKind.TEXT,
    );
    expect(getCubeJsonScalarType(shapeOf('true', '1'))).toBe(
      CubeJsonScalarKind.TEXT,
    );
    expect(getCubeJsonScalarType(shapeOf('null'))).toBeUndefined();
  });

  test('Gives the most frequent values first, then by text', () => {
    expect(
      getCubeJsonTopValues(
        shapeOf('"b"', '"a"', '"b"', '"c"', '"a"', '"b"'),
        2,
      ),
    ).toEqual(['b', 'a']);
  });

  test('Says what a position held, its arrays’ elements included', () => {
    expect(describeCubeJsonShape(shapeOf('"x"'))).toBe('text');
    expect(describeCubeJsonShape(shapeOf('{"a": 1}'))).toBe('object');
    expect(describeCubeJsonShape(shapeOf('[{"a": 1}]', '[]'))).toBe(
      'list of object',
    );
    expect(describeCubeJsonShape(shapeOf('[1, 2.5]'))).toBe('list of number');
    expect(describeCubeJsonShape(shapeOf('[]'))).toBe('list of nothing');
    expect(describeCubeJsonShape(shapeOf('1', '{"a": 1}'))).toBe(
      'whole number or object',
    );
    expect(describeCubeJsonShape(shapeOf('null'))).toBe('always empty');
  });

  test('Keeps the shortest and longest array seen', () => {
    expect(shapeOf('[1]', '[1, 2, 3]', '[]')).toMatchObject({
      arrays: 3,
      minLength: 0,
      maxLength: 3,
    });
  });
});
