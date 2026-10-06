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

import { expect, test } from '@jest/globals';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import { Schema } from '../../schema/Schema.js';
import {
  ensureSchemas,
  validate,
  validateAllItems,
} from '../ValidationUtils.js';

test(
  unitTest('validate() records the message only when the check fails'),
  () => {
    const errors: string[] = [];
    expect(validate(true, 'not shown', errors)).toBe(true);
    expect(validate(false, 'shown', errors)).toBe(false);
    expect(validate(false, 'no list to record it in')).toBe(false);
    expect(errors).toEqual(['shown']);
  },
);

test(
  unitTest('validate() stops at the first failure when chained with &&'),
  () => {
    const errors: string[] = [];
    const valid =
      validate(false, 'first', errors) && validate(false, 'second', errors);
    expect(valid).toBe(false);
    expect(errors).toEqual(['first']);
  },
);

test(
  unitTest('validateAllItems() checks every item, even after a failure'),
  () => {
    const errors: string[] = [];
    const checked: number[] = [];
    const valid = validateAllItems([1, -2, 3, -4], (item) => {
      checked.push(item);
      return validate(item > 0, `${item} is not positive`, errors);
    });
    expect(valid).toBe(false);
    expect(checked).toEqual([1, -2, 3, -4]);
    expect(errors).toEqual(['-2 is not positive', '-4 is not positive']);
    expect(validateAllItems([1, 2], (item) => item > 0)).toBe(true);
    expect(validateAllItems([], () => false)).toBe(true);
  },
);

test(unitTest('ensureSchemas() needs one schema per port'), () => {
  const schema = new Schema([]);
  expect(ensureSchemas([schema], ['tds'])).toEqual([schema]);
  expect(ensureSchemas([], [])).toEqual([]);
  expect(() => ensureSchemas([schema], ['tds1', 'tds2'])).toThrow();
  expect(() => ensureSchemas([schema, schema], ['tds'])).toThrow();
});

test(unitTest('ensureSchemas() needs a schema in every slot'), () => {
  const schema = new Schema([]);
  const sparse: Schema[] = [];
  sparse[1] = schema;
  [
    [undefined],
    [null],
    [{}],
    [{ columns: [] }],
    [{ columns: [], equals: () => true }],
    [{ columns: [], lookup: () => undefined }],
    ['x'],
    new Array(1),
  ].forEach((slots) =>
    expect(() => ensureSchemas(slots as unknown as Schema[], ['tds'])).toThrow(
      /^The input schema for port "tds" is not a schema$/u,
    ),
  );
  expect(() => ensureSchemas(sparse, ['tds1', 'tds2'])).toThrow(
    /port "tds1" is not a schema/u,
  );
});
