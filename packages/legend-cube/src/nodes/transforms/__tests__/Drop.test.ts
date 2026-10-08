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
import { unitTest } from '../../../__test-utils__/CubeTestUtils.js';
import {
  column,
  resolvedTable,
} from '../../../__test-utils__/CubeTestNodes.js';
import { Connection } from '../../../graph/Connection.js';
import { Query } from '../../../graph/Query.js';
import { buildSchemasAndValidity } from '../../../inference/SchemaInference.js';
import {
  ERR_INCOMPLETE,
  ERR_SCHEMAS,
  MESSAGE_SIZE_MUST_BE_POSITIVE_WHOLE_NUMBER,
} from '../../../messages/CubeMessages.js';
import { Schema } from '../../../schema/Schema.js';
import { Drop } from '../Drop.js';
import { isPositiveWholeNumber } from '../RowSettings.js';

const ORDERS = new Schema([
  column('ORDER_ID', 'meta::pure::precisePrimitives::SmallInt'),
  column('SHIP_COUNTRY', 'meta::pure::precisePrimitives::Varchar', true, [15]),
]);

const errorsOf = (drop: Drop, schemas: Schema[] = [ORDERS]): string[] => {
  const errors: string[] = [];
  drop.validate(schemas, errors);
  return errors;
};

describe(unitTest('Drop'), () => {
  test('Has one input, keeps the input schema and drops rows from its start', () => {
    const drop = new Drop('drop101', 10);
    expect(drop.type).toBe('drop');
    expect(Drop.TYPE).toBe('drop');
    expect(drop.ports).toEqual(['tds']);
    expect(drop.size).toBe(10);
    expect(drop.validate([ORDERS])).toBe(true);
    expect(drop.schematize([ORDERS]) === ORDERS).toBe(true);
    expect(drop.describe()).toBe('Drop first 10 row(s)');
  });

  test('Defaults to 10 only through its definition, so an explicit undefined stays cleared', () => {
    expect(Drop.DEFAULT_SIZE).toBe(10);
    const cleared = new Drop('drop101', undefined);
    expect(cleared.size).toBeUndefined();
    expect(errorsOf(cleared)).toEqual([
      MESSAGE_SIZE_MUST_BE_POSITIVE_WHOLE_NUMBER,
    ]);
    expect(cleared.schematize([ORDERS])).toBeUndefined();
    expect(cleared.describe()).toBe('Drop first (blank) row(s)');
  });

  test.each([
    ['zero', 0],
    ['negative zero', -0],
    ['a negative size', -1],
    ['a fraction', 1.5],
    ['a size past safe integers', 2 ** 53],
    ['a size a double holds only roughly', 1e21],
  ])('Refuses %s with the spec message, and gives no schema', (_, size) => {
    const drop = new Drop('drop101', size);
    expect(drop.validate([ORDERS])).toBe(false);
    expect(errorsOf(drop)).toEqual([
      MESSAGE_SIZE_MUST_BE_POSITIVE_WHOLE_NUMBER,
    ]);
    expect(drop.schematize([ORDERS])).toBeUndefined();
  });

  test.each([1, 830, Number.MAX_SAFE_INTEGER])(
    'Accepts the size %s',
    (size) => {
      expect(errorsOf(new Drop('drop101', size))).toEqual([]);
      expect(isPositiveWholeNumber(size)).toBe(true);
    },
  );

  test.each([
    ['NaN', Number.NaN],
    ['an infinity', Number.POSITIVE_INFINITY],
    ['minus infinity', Number.NEGATIVE_INFINITY],
    ['a string', '10'],
    ['null', null],
  ])('Refuses %s as a size, which a saved spec could not hold', (_, size) => {
    expect(() => new Drop('drop101', size as number)).toThrow(
      `A drop's size must be a finite number or undefined`,
    );
  });

  test('Keeps its id and saved keys through edits', () => {
    const rest = { note: 'skip ten' };
    const drop = new Drop('drop101', 10, rest);
    const edited = drop.withSize(5);
    expect(edited).toBeInstanceOf(Drop);
    expect(edited === drop).toBe(false);
    expect(edited.id).toBe('drop101');
    expect(edited.size).toBe(5);
    expect(edited.rest).toBe(rest);
    expect(edited.key === drop.key).toBe(false);
    expect(drop.size).toBe(10);
    expect(drop.withSize(undefined).size).toBeUndefined();
  });

  test('Describes itself without hiding anything, since a size is not a value from the data', () => {
    expect(new Drop('drop101', 5).describeRedacted()).toBe(
      'Drop first 5 row(s)',
    );
    expect(new Drop('drop101', undefined).describeRedacted()).toBe(
      'Drop first (blank) row(s)',
    );
  });

  test('Needs exactly one input schema', () => {
    expect(() => new Drop('drop101', 10).validate([])).toThrow();
    expect(() =>
      new Drop('drop101', 10).schematize([ORDERS, ORDERS]),
    ).toThrow();
  });

  test('Reports a missing input, and an invalid size downstream, through inference', () => {
    const query = new Query(
      [
        resolvedTable('relational101', 'ORDERS', ORDERS.columns.slice()),
        new Drop('drop101', 0),
        new Drop('drop102', 5),
        new Drop('drop103', 5),
      ],
      [
        new Connection('relational101', 'drop101', 'tds'),
        new Connection('drop101', 'drop102', 'tds'),
      ],
      'drop102',
    );
    const { validity, schemas } = buildSchemasAndValidity(query);
    expect(validity.get('drop101')).toEqual([
      MESSAGE_SIZE_MUST_BE_POSITIVE_WHOLE_NUMBER,
    ]);
    expect(validity.get('drop102')).toEqual([ERR_SCHEMAS]);
    expect(validity.get('drop103')).toEqual([ERR_INCOMPLETE]);
    expect(schemas.get('drop101')).toBeUndefined();
  });
});
