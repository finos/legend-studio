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

import { unitTest } from '@finos/legend-shared/test';
import { describe, expect, test } from '@jest/globals';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  type DataCubeJsonSample,
  DataCubeJsonScalarKind,
  DataCubeJsonShapeReader,
  describeDataCubeJsonShape,
  getDataCubeJsonScalarKind,
  getDataCubeJsonTopValues,
} from '../DataCubeJsonShape.js';

function inferDataCubeJsonShape(
  values: unknown[],
  complete = false,
): DataCubeJsonSample {
  const reader = new DataCubeJsonShapeReader();
  values.forEach((value) => reader.add(value));
  return reader.result(complete);
}

const kindOf = (values: string[]) =>
  getDataCubeJsonScalarKind(
    guaranteeNonNullable(
      inferDataCubeJsonShape(
        values.map((value) => `{"v":${value}}`),
      ).shape.fields.get('v'),
    ),
  );

describe(unitTest(`Variant: inferring the shape of JSON documents`), () => {
  test(`infers the kind of a value conservatively`, () => {
    expect(kindOf(['1', '2'])).toBe(DataCubeJsonScalarKind.INTEGER);
    expect(kindOf(['1', '2.5'])).toBe(DataCubeJsonScalarKind.FLOAT);
    expect(kindOf(['true', 'false'])).toBe(DataCubeJsonScalarKind.BOOLEAN);
    expect(kindOf(['"2025-01-02"'])).toBe(DataCubeJsonScalarKind.DATE);
    expect(kindOf(['"2025-01-02T10:00:00"'])).toBe(
      DataCubeJsonScalarKind.DATETIME,
    );
    expect(kindOf(['"2025-01-02"', '"2025-01-02T10:00:00"'])).toBe(
      DataCubeJsonScalarKind.TEXT,
    );
    expect(kindOf(['1', '"a"'])).toBe(DataCubeJsonScalarKind.TEXT);
    expect(kindOf(['92233720368547758070'])).toBe(DataCubeJsonScalarKind.TEXT);
    expect(kindOf(['null'])).toBeUndefined();
  });

  test(`reads any mix of kinds other than integers and floats as text`, () => {
    expect(kindOf(['true', '"a"'])).toBe(DataCubeJsonScalarKind.TEXT);
    expect(kindOf(['true', '1'])).toBe(DataCubeJsonScalarKind.TEXT);
    expect(kindOf(['"2025-01-02"', 'false'])).toBe(DataCubeJsonScalarKind.TEXT);
    expect(kindOf(['1', '2.5', 'true'])).toBe(DataCubeJsonScalarKind.TEXT);
    expect(kindOf(['true', 'null'])).toBe(DataCubeJsonScalarKind.BOOLEAN);
  });

  test(`reads a whole number as an integer only up to 9223372036854775807 either way`, () => {
    expect(kindOf(['9223372036854775807'])).toBe(
      DataCubeJsonScalarKind.INTEGER,
    );
    expect(kindOf(['9223372036854775808'])).toBe(DataCubeJsonScalarKind.TEXT);
    expect(kindOf(['-9223372036854775807'])).toBe(
      DataCubeJsonScalarKind.INTEGER,
    );
    expect(kindOf(['-9223372036854775808'])).toBe(DataCubeJsonScalarKind.TEXT);
    expect(kindOf(['9223372036854775808.5'])).toBe(
      DataCubeJsonScalarKind.FLOAT,
    );
  });

  test(`counts the values read, including the empty ones`, () => {
    const sample = inferDataCubeJsonShape(
      ['{"a":1}', null, 'not json', '{"a":null}', { a: 2 }],
      true,
    );
    expect(sample.rows).toBe(5);
    expect(sample.complete).toBe(true);
    const field = guaranteeNonNullable(sample.shape.fields.get('a'));
    expect(field.present).toBe(3);
    expect(field.nulls).toBe(1);
    expect(getDataCubeJsonTopValues(field)).toEqual(['1', '2']);
  });

  test(`describes what each position held`, () => {
    const sample = inferDataCubeJsonShape([
      '{"name":"a","items":[{"sku":"x"}],"tags":[],"misc":1,"none":null}',
      '{"name":"b","items":[],"tags":[],"misc":{"k":1},"none":null}',
    ]);
    const field = (key: string) =>
      guaranteeNonNullable(sample.shape.fields.get(key));
    expect(describeDataCubeJsonShape(sample.shape)).toBe('object');
    expect(describeDataCubeJsonShape(field('name'))).toBe('text');
    expect(describeDataCubeJsonShape(field('items'))).toBe('array of object');
    expect(describeDataCubeJsonShape(field('tags'))).toBe('array of nothing');
    expect(describeDataCubeJsonShape(field('misc'))).toBe('integer or object');
    expect(describeDataCubeJsonShape(field('none'))).toBe('always null');
  });
});
