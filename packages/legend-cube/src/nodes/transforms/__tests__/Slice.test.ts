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
import { column } from '../../../__test-utils__/CubeTestNodes.js';
import {
  MESSAGE_MUST_BE_WHOLE_NUMBER,
  MESSAGE_START_ROW_INDEX_MUST_BE_LESS_THAN_STOP,
} from '../../../messages/CubeMessages.js';
import { Schema } from '../../../schema/Schema.js';
import { isRowIndex } from '../RowSettings.js';
import { Slice } from '../Slice.js';

const ORDERS = new Schema([
  column('ORDER_ID', 'meta::pure::precisePrimitives::SmallInt'),
]);

const START = MESSAGE_MUST_BE_WHOLE_NUMBER('Start row index');
const STOP = MESSAGE_MUST_BE_WHOLE_NUMBER('Stop row index');

const errorsOf = (slice: Slice): string[] => {
  const errors: string[] = [];
  slice.validate([ORDERS], errors);
  return errors;
};

describe(unitTest('Slice'), () => {
  test('Has one input, keeps the input schema and takes the rows of a range', () => {
    const slice = new Slice('slice101', 10, 20);
    expect(slice.type).toBe('slice');
    expect(Slice.TYPE).toBe('slice');
    expect(slice.ports).toEqual(['tds']);
    expect([slice.start, slice.stop]).toEqual([10, 20]);
    expect(errorsOf(slice)).toEqual([]);
    expect(slice.schematize([ORDERS]) === ORDERS).toBe(true);
  });

  test('Says the stop row is not kept', () => {
    expect(new Slice('slice101', 10, 20).describe()).toBe(
      'Take rows 10 to 20 (20 excluded)',
    );
    expect(new Slice('slice101', 0, 1).describe()).toBe(
      'Take rows 0 to 1 (1 excluded)',
    );
    expect(new Slice('slice101', 10, undefined).describe()).toBe(
      'Take rows 10 to (blank)',
    );
    expect(new Slice('slice101', undefined, 20).describe()).toBe(
      'Take rows (blank) to 20 (20 excluded)',
    );
    // a range is not a value from the data: nothing to hide
    expect(new Slice('slice101', 3, 5).describeRedacted()).toBe(
      'Take rows 3 to 5 (5 excluded)',
    );
  });

  test('Defaults to 10 and 20 only through its definition, so explicit undefineds stay cleared', () => {
    expect([Slice.DEFAULT_START, Slice.DEFAULT_STOP]).toEqual([10, 20]);
    const cleared = new Slice('slice101', undefined, undefined);
    expect([cleared.start, cleared.stop]).toEqual([undefined, undefined]);
    // both bounds are reported, the range is not
    expect(errorsOf(cleared)).toEqual([START, STOP]);
    expect(cleared.schematize([ORDERS])).toBeUndefined();
  });

  test.each<[string, number | undefined, number | undefined, string[]]>([
    ['a negative start', -1, 20, [START]],
    ['a fractional start', 1.5, 20, [START]],
    ['a start past safe integers', 2 ** 53, 2 ** 53 + 2, [START, STOP]],
    ['a cleared stop', 10, undefined, [STOP]],
    ['a negative stop', 0, -1, [STOP]],
    ['a fractional stop', 0, 2.5, [STOP]],
    [
      'a start equal to the stop',
      3,
      3,
      [MESSAGE_START_ROW_INDEX_MUST_BE_LESS_THAN_STOP],
    ],
    [
      'a start after the stop',
      5,
      3,
      [MESSAGE_START_ROW_INDEX_MUST_BE_LESS_THAN_STOP],
    ],
    ['both bounds invalid', -1, 1.5, [START, STOP]],
  ])('Reports %s, and gives no schema', (_, start, stop, messages) => {
    const slice = new Slice('slice101', start, stop);
    expect(errorsOf(slice)).toEqual(messages);
    expect(slice.validate([ORDERS])).toBe(false);
    expect(slice.schematize([ORDERS])).toBeUndefined();
  });

  test.each<[number, number]>([
    [0, 1],
    [0, 830],
    [-0, 1],
    [829, 830],
  ])('Accepts the range [%s, %s)', (start, stop) => {
    expect(errorsOf(new Slice('slice101', start, stop))).toEqual([]);
  });

  test('Takes a row index of 0, unlike a size', () => {
    expect(isRowIndex(0)).toBe(true);
    expect(isRowIndex(-1)).toBe(false);
    expect(isRowIndex(undefined)).toBe(false);
  });

  test.each([
    ['NaN', Number.NaN],
    ['an infinity', Number.POSITIVE_INFINITY],
    ['a string', '10'],
    ['null', null],
  ])('Refuses %s as a bound, which a saved spec could not hold', (_, value) => {
    expect(() => new Slice('slice101', value as number, 20)).toThrow(
      `A slice's start must be a finite number or undefined`,
    );
    expect(() => new Slice('slice101', 10, value as number)).toThrow(
      `A slice's stop must be a finite number or undefined`,
    );
  });

  test('Keeps its id and saved keys through edits', () => {
    const rest = { note: 'second page' };
    const slice = new Slice('slice101', 10, 20, rest);
    const edited = slice.withRange(20, 30);
    expect(edited).toBeInstanceOf(Slice);
    expect(edited.id).toBe('slice101');
    expect([edited.start, edited.stop]).toEqual([20, 30]);
    expect(edited.rest).toBe(rest);
    expect(edited.key === slice.key).toBe(false);
    expect([slice.start, slice.stop]).toEqual([10, 20]);
  });
});
