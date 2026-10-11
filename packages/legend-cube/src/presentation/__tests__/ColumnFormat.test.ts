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
  type ColumnFormat,
  ColumnFormatStyle,
  getColumnFormat,
  isColumnFormatStyle,
  setColumnFormat,
} from '../ColumnFormat.js';

const format = (init: Partial<ColumnFormat>): ColumnFormat => ({
  style: ColumnFormatStyle.NUMBER,
  grouping: false,
  redIfNegative: false,
  parenthesesIfNegative: false,
  ...init,
});

const USD = format({ style: ColumnFormatStyle.CURRENCY, currency: 'USD' });
const TWO_PLACES = format({ decimalPlaces: 2, grouping: true });

describe(unitTest('Column formats'), () => {
  test("Gives a column its own format, in any case, else every number column's", () => {
    const hints = [{ format: TWO_PLACES }, { column: 'price', format: USD }];
    expect(getColumnFormat(hints, 'PRICE')).toBe(USD);
    expect(getColumnFormat(hints, 'QUANTITY')).toBe(TWO_PLACES);
    expect(getColumnFormat([], 'PRICE')).toBeUndefined();
  });

  test("Sets and removes a column's format, keeping the others", () => {
    const one = setColumnFormat([], 'PRICE', USD);
    expect(one).toEqual([{ column: 'PRICE', format: USD }]);
    const two = setColumnFormat(one, 'QUANTITY', TWO_PLACES);
    expect(setColumnFormat(two, 'Price', TWO_PLACES)).toEqual([
      { column: 'QUANTITY', format: TWO_PLACES },
      { column: 'Price', format: TWO_PLACES },
    ]);
    expect(setColumnFormat(two, 'PRICE', undefined)).toEqual([
      { column: 'QUANTITY', format: TWO_PLACES },
    ]);
  });

  test('Applies a format to every number column in place of their own, and removes only that one', () => {
    const own = [{ column: 'PRICE', format: USD }];
    expect(setColumnFormat(own, undefined, TWO_PLACES)).toEqual([
      { format: TWO_PLACES },
    ]);
    const both = [...own, { format: TWO_PLACES }];
    expect(setColumnFormat(both, undefined, undefined)).toEqual(own);
  });

  test('Knows its three styles, and no other', () => {
    expect(['number', 'currency', 'percent'].every(isColumnFormatStyle)).toBe(
      true,
    );
    expect(isColumnFormatStyle('scientific')).toBe(false);
  });
});
