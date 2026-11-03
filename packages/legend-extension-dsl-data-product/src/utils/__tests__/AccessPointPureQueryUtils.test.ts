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
  buildAccessPointAccessor,
  buildAccessPointPureQueryExample,
  printPureColumnName,
} from '../AccessPointPureQueryUtils.js';

const ACCESSOR = '#P{my::DataProduct.positions}#';

describe('AccessPointPureQueryUtils', () => {
  test('the accessor names the data product and the access point', () => {
    expect(buildAccessPointAccessor('my::DataProduct', 'positions', [])).toBe(
      ACCESSOR,
    );
  });

  test('the accessor of a parameterized access point names its parameters in parentheses', () => {
    expect(
      buildAccessPointAccessor('my::DataProduct', 'positions', [
        'businessDate',
        'clientAccountId',
      ]),
    ).toBe('#P{my::DataProduct.positions(businessDate, clientAccountId)}#');
  });

  test('a column name is quoted only when Pure would not read it as a name', () => {
    expect(printPureColumnName('BUSINESS_DATE')).toBe('BUSINESS_DATE');
    expect(printPureColumnName('_id2')).toBe('_id2');
    expect(printPureColumnName('Business Date')).toBe("'Business Date'");
    expect(printPureColumnName('2nd')).toBe("'2nd'");
    expect(printPureColumnName("client's")).toBe("'client\\'s'");
    expect(printPureColumnName('a\\b')).toBe("'a\\\\b'");
    expect(printPureColumnName('true')).toBe("'true'");
  });

  test('the example selects every column on one line when it fits', () => {
    expect(
      buildAccessPointPureQueryExample(ACCESSOR, [
        'BUSINESS_DATE',
        'Book Id',
        'QUANTITY',
      ]),
    ).toBe(
      `${ACCESSOR}\n  ->select(~[BUSINESS_DATE, 'Book Id', QUANTITY])\n  ->take(100)`,
    );
  });

  test('the example puts a long list of columns on lines of their own', () => {
    const columns = Array.from(
      { length: 20 },
      (_, index) => `COLUMN_NUMBER_${index + 1}`,
    );
    const example = buildAccessPointPureQueryExample(ACCESSOR, columns);
    const lines = example.split('\n');

    expect(lines.slice(0, 2)).toEqual([ACCESSOR, '  ->select(~[']);
    expect(lines.slice(-2)).toEqual(['  ])', '  ->take(100)']);
    const columnLines = lines.slice(2, -2);
    columnLines.forEach((line) => {
      expect(line.startsWith('    COLUMN_NUMBER_')).toBe(true);
      expect(line.length).toBeLessThanOrEqual(100);
    });
    expect(columnLines.join(' ').trim().split(/,?\s+/u)).toEqual(columns);
    // every column but the last ends with a comma
    expect(columnLines.join(' ').match(/,/gu)).toHaveLength(19);
  });

  test('the example selects no columns by name beyond 20 columns, or without any', () => {
    const columns = Array.from({ length: 21 }, (_, index) => `C${index + 1}`);
    expect(buildAccessPointPureQueryExample(ACCESSOR, columns)).toBe(
      `${ACCESSOR}\n  ->take(100)`,
    );
    expect(
      buildAccessPointPureQueryExample(ACCESSOR, columns.slice(0, 20)),
    ).toBe(
      `${ACCESSOR}\n  ->select(~[\n    ${columns.slice(0, 20).join(', ')}\n  ])\n  ->take(100)`,
    );
    expect(buildAccessPointPureQueryExample(ACCESSOR, [])).toBe(
      `${ACCESSOR}\n  ->take(100)`,
    );
  });
});
