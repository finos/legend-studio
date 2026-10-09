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
import { column, enumColumn } from '../../../__test-utils__/CubeTestNodes.js';
import { unitTest } from '../../../__test-utils__/CubeTestUtils.js';
import { Schema } from '../../../schema/Schema.js';
import {
  type CubeType,
  EnumType,
  OpaqueType,
  PrimitiveType,
} from '../../../types/CubeType.js';
import {
  AggregationFunction,
  type ColumnAggregation,
  getAggregationAutoName,
  getAggregationDisplayName,
  getAggregationResultType,
  getAvailableAggregations,
  isAggregationFunction,
  isAggregationNullable,
  takesAggregationColumn,
  validateColumnAggregation,
} from '../Aggregation.js';

const P = 'meta::pure::precisePrimitives::';
const {
  COUNT,
  DISTINCT_COUNT,
  DISTINCT_VALUE,
  SUM,
  AVERAGE,
  MIN,
  MAX,
  COUNT_ROWS,
} = AggregationFunction;
const COLUMN_FUNCTIONS = [
  COUNT,
  DISTINCT_COUNT,
  DISTINCT_VALUE,
  SUM,
  AVERAGE,
  MIN,
  MAX,
] as const;

const type = (path: string, params: number[] = []): PrimitiveType =>
  PrimitiveType.get(path, params);

/**
 * Per type, each column function's result type (`undefined` where the type
 * doesn't offer it), PLAN §5.7 and §11.5: every family, every precise type
 */
const RESULT_TYPES: readonly [
  string,
  CubeType,
  Partial<Record<AggregationFunction, string>>,
][] = (() => {
  const counts = { [COUNT]: 'Integer', [DISTINCT_COUNT]: 'Integer' };
  const numbers = (sum: string, own: string) => ({
    ...counts,
    [DISTINCT_VALUE]: own,
    [SUM]: sum,
    [AVERAGE]: 'Float',
    [MIN]: sum,
    [MAX]: sum,
  });
  const dates = (minMax: string, own: string) => ({
    ...counts,
    [DISTINCT_VALUE]: own,
    [MIN]: minMax,
    [MAX]: minMax,
  });
  const distincts = (own: string) => ({ ...counts, [DISTINCT_VALUE]: own });
  const integer = (path: string): [string, CubeType, object] => [
    path,
    type(path),
    numbers('Integer', type(path).fullName),
  ];
  return [
    integer('Integer'),
    integer(`${P}TinyInt`),
    integer(`${P}UTinyInt`),
    integer(`${P}SmallInt`),
    integer(`${P}USmallInt`),
    integer(`${P}Int`),
    integer(`${P}UInt`),
    integer(`${P}BigInt`),
    integer(`${P}UBigInt`),
    ['Float', type('Float'), numbers('Float', 'Float')],
    ['Float4', type(`${P}Float4`), numbers('Float', `${P}Float4`)],
    ['Double', type(`${P}Double`), numbers('Float', `${P}Double`)],
    ['Decimal', type('Decimal'), numbers('Number', 'Decimal')],
    [
      'Numeric(10,2)',
      type(`${P}Numeric`, [10, 2]),
      numbers('Number', `${P}Numeric(10,2)`),
    ],
    ['Number', type('Number'), numbers('Number', 'Number')],
    ['StrictDate', type('StrictDate'), dates('StrictDate', 'StrictDate')],
    ['DateTime', type('DateTime'), dates('DateTime', 'DateTime')],
    ['Timestamp', type(`${P}Timestamp`), dates('DateTime', `${P}Timestamp`)],
    ['Date', type('Date'), dates('Date', 'Date')],
    ['StrictTime', type('StrictTime'), distincts('StrictTime')],
    ['Boolean', type('Boolean'), distincts('Boolean')],
    ['String', type('String'), distincts('String')],
    ['Varchar(15)', type(`${P}Varchar`, [15]), distincts(`${P}Varchar(15)`)],
    [
      'Variant',
      type('meta::pure::metamodel::variant::Variant'),
      { [COUNT]: 'Integer' },
    ],
    [
      'an enumeration',
      new EnumType('test::Region', ['EMEA', 'APAC']),
      { [COUNT]: 'Integer' },
    ],
    [
      'a type Cube does not know',
      OpaqueType.get('test::Geography'),
      { [COUNT]: 'Integer' },
    ],
  ] as [string, CubeType, Partial<Record<AggregationFunction, string>>][];
})();

describe('Aggregation functions', () => {
  test(unitTest('Knows the functions as saved, case and all'), () => {
    expect(Object.values(AggregationFunction)).toEqual([
      'Count',
      'DistinctCount',
      'DistinctValue',
      'Sum',
      'Average',
      'Min',
      'Max',
      'CountRows',
    ]);
    expect(isAggregationFunction('Sum')).toBe(true);
    expect(isAggregationFunction('CountRows')).toBe(true);
    // window-only until M5, so unknown here (PLAN §11.5, Q4)
    ['sum', 'Rank', 'DenseRank', 'Median', ''].forEach((text) =>
      expect(isAggregationFunction(text)).toBe(false),
    );
  });

  test(
    unitTest('Shows two-word functions with a space, any other text as it is'),
    () => {
      expect(
        [...Object.values(AggregationFunction), 'Rank', 'newerFunction'].map(
          getAggregationDisplayName,
        ),
      ).toEqual([
        'Count',
        'Distinct Count',
        'Distinct Value',
        'Sum',
        'Average',
        'Min',
        'Max',
        'Count Rows',
        'Rank',
        'newerFunction',
      ]);
    },
  );

  test(unitTest('Takes a column for every function but Count rows'), () => {
    expect(
      Object.values(AggregationFunction).filter(
        (aggregation) => !takesAggregationColumn(aggregation),
      ),
    ).toEqual([COUNT_ROWS]);
  });

  test(unitTest('Makes every output nullable but the counts'), () => {
    expect(
      Object.values(AggregationFunction).filter(
        (aggregation) => !isAggregationNullable(aggregation),
      ),
    ).toEqual([COUNT, DISTINCT_COUNT, COUNT_ROWS]);
  });

  test.each(RESULT_TYPES)(
    unitTest('Offers on %s exactly the functions it types, in the spec order'),
    (_, columnType, expected) => {
      expect(getAvailableAggregations(columnType)).toEqual(
        COLUMN_FUNCTIONS.filter((aggregation) => aggregation in expected),
      );
      expect(
        Object.fromEntries(
          COLUMN_FUNCTIONS.flatMap((aggregation) => {
            const result = getAggregationResultType(aggregation, columnType);
            return result ? [[aggregation, result.fullName]] : [];
          }),
        ),
      ).toEqual(expected);
    },
  );

  test(
    unitTest(
      'Types Count rows as Integer with no column, and a column function with none as nothing',
    ),
    () => {
      expect(getAggregationResultType(COUNT_ROWS, undefined)?.fullName).toBe(
        'Integer',
      );
      expect(
        getAggregationResultType(COUNT_ROWS, type('String'))?.fullName,
      ).toBe('Integer');
      COLUMN_FUNCTIONS.forEach((aggregation) =>
        expect(
          getAggregationResultType(aggregation, undefined),
        ).toBeUndefined(),
      );
    },
  );

  test(
    unitTest(
      'Names an aggregation after its column and how its function is shown',
    ),
    () => {
      expect(getAggregationAutoName(COUNT, 'ORDER_ID')).toBe('ORDER_ID Count');
      expect(getAggregationAutoName(DISTINCT_COUNT, 'SHIP_CITY')).toBe(
        'SHIP_CITY Distinct Count',
      );
      expect(getAggregationAutoName(DISTINCT_VALUE, 'Ship Country')).toBe(
        'Ship Country Distinct Value',
      );
      expect(getAggregationAutoName(SUM, 'FREIGHT')).toBe('FREIGHT Sum');
      expect(getAggregationAutoName(COUNT_ROWS, undefined)).toBe('Count Rows');
      expect(getAggregationAutoName(COUNT_ROWS, 'ORDER_ID')).toBe('Count Rows');
      // no name without a known function and, but for Count rows, a column
      expect(getAggregationAutoName(SUM, undefined)).toBeUndefined();
      expect(getAggregationAutoName(SUM, '')).toBeUndefined();
      expect(getAggregationAutoName('Rank', 'ORDER_ID')).toBeUndefined();
      expect(getAggregationAutoName('', 'ORDER_ID')).toBeUndefined();
    },
  );
});

const INPUT = new Schema([
  column('ID', `${P}BigInt`),
  column('NAME', `${P}Varchar`, true, [10]),
  enumColumn('REGION', 'test::Region', ['EMEA', 'APAC']),
  column('AMOUNT', `${P}Numeric`, true, [10, 2]),
  column('DT', 'StrictDate', true),
]);

const agg = (
  fn: string,
  aggregationColumn: string | undefined,
  name: string,
): ColumnAggregation => ({ column: aggregationColumn, function: fn, name });

/** The errors of each aggregation of the list, row by row */
const errorsOf = (aggregations: readonly ColumnAggregation[]): string[][] =>
  aggregations.map((_, index) => {
    const errors: string[] = [];
    const valid = validateColumnAggregation(aggregations, index, INPUT, errors);
    expect(valid).toBe(errors.length === 0);
    return errors;
  });

describe('Aggregation validation', () => {
  test(
    unitTest(
      'Accepts aggregations whose columns offer their functions, under names of their own',
    ),
    () => {
      expect(
        errorsOf([
          agg(COUNT, 'ID', 'ID Count'),
          agg(COUNT, 'REGION', 'REGION Count'),
          agg(DISTINCT_COUNT, 'NAME', 'NAME Distinct Count'),
          agg(DISTINCT_VALUE, 'NAME', 'NAME Distinct Value'),
          agg(SUM, 'AMOUNT', 'AMOUNT Sum'),
          agg(AVERAGE, 'ID', 'ID Average'),
          agg(MIN, 'DT', 'DT Min'),
          agg(MAX, 'DT', 'DT Max'),
          agg(COUNT_ROWS, undefined, 'Count Rows'),
          // spaces, quotes and non-ASCII letters, as in any column name
          agg(COUNT, 'ID', "Orders' total ¹"),
        ]),
      ).toEqual([[], [], [], [], [], [], [], [], [], []]);
    },
  );

  test.each<[string, ColumnAggregation, string]>([
    [
      'an empty function',
      agg('', 'ID', 'x'),
      'Aggregation function cannot be empty.',
    ],
    [
      'an unknown function',
      agg('Median', 'ID', 'x'),
      'Aggregation function "Median" is unknown.',
    ],
    [
      'a function in another case',
      agg('sum', 'ID', 'x'),
      'Aggregation function "sum" is unknown.',
    ],
    [
      'a window-only function',
      agg('Rank', undefined, 'x'),
      'Aggregation function "Rank" is unknown.',
    ],
    [
      'no column',
      agg(COUNT, undefined, 'x'),
      'Aggregation column does not have a name.',
    ],
    [
      'a column not picked yet',
      agg(SUM, '', 'x'),
      'Aggregation column does not have a name.',
    ],
    [
      'a column not in the input',
      agg(COUNT, 'MISSING', 'x'),
      'Aggregation column "MISSING" is not present in the input schema.',
    ],
    [
      'a column in another case',
      agg(COUNT, 'id', 'x'),
      'Aggregation column "id" is not present in the input schema.',
    ],
    [
      'Sum of a string',
      agg(SUM, 'NAME', 'x'),
      'Aggregation function "Sum" is incompatible with column "NAME".',
    ],
    [
      'Min of a string',
      agg(MIN, 'NAME', 'x'),
      'Aggregation function "Min" is incompatible with column "NAME".',
    ],
    [
      'Average of a date',
      agg(AVERAGE, 'DT', 'x'),
      'Aggregation function "Average" is incompatible with column "DT".',
    ],
    [
      'a distinct count of an enumeration',
      agg(DISTINCT_COUNT, 'REGION', 'x'),
      'Aggregation function "DistinctCount" is incompatible with column "REGION".',
    ],
    [
      'Count rows of a column',
      agg(COUNT_ROWS, 'ID', 'x'),
      'Aggregation function "CountRows" does not allow column.',
    ],
    [
      'Count rows of a blank column',
      agg(COUNT_ROWS, '', 'x'),
      'Aggregation function "CountRows" does not allow column.',
    ],
    [
      'Count rows with no name',
      agg(COUNT_ROWS, undefined, ''),
      'Aggregation output name cannot be empty.',
    ],
    [
      // a Group of a Group: the inner one's Count Rows is an input column
      'Count rows named like an input column',
      agg(COUNT_ROWS, undefined, 'id'),
      'Aggregation output name "id" cannot be the same as input column name.',
    ],
    [
      'an empty name',
      agg(COUNT, 'ID', ''),
      'Aggregation output name cannot be empty.',
    ],
    [
      'a name with a space at an end',
      agg(COUNT, 'ID', ' Total'),
      'Aggregation output name is not valid column name.',
    ],
    [
      'a name with a double quote',
      agg(COUNT, 'ID', 'a"b'),
      'Aggregation output name is not valid column name.',
    ],
    [
      'a name with a backslash',
      agg(COUNT, 'ID', 'a\\b'),
      'Aggregation output name is not valid column name.',
    ],
    [
      'the name of an input column',
      agg(COUNT, 'ID', 'NAME'),
      'Aggregation output name "NAME" cannot be the same as input column name.',
    ],
    [
      'the name of its own column',
      agg(COUNT, 'ID', 'ID'),
      'Aggregation output name "ID" cannot be the same as input column name.',
    ],
    [
      'an input column name in another case',
      agg(COUNT, 'ID', 'name'),
      'Aggregation output name "name" cannot be the same as input column name.',
    ],
    [
      'an input column name in fullwidth letters',
      agg(COUNT, 'ID', 'ＩＤ'),
      'Aggregation output name "ＩＤ" cannot be the same as input column name.',
    ],
  ])(unitTest('Reports %s, and stops there'), (_, aggregation, message) => {
    expect(errorsOf([aggregation])).toEqual([[message]]);
  });

  test(unitTest('Reports the first problem of a row only'), () => {
    expect(
      errorsOf([
        agg('Median', 'MISSING', ''),
        agg(SUM, 'MISSING', 'NAME'),
        agg(SUM, 'NAME', ''),
      ]),
    ).toEqual([
      ['Aggregation function "Median" is unknown.'],
      ['Aggregation column "MISSING" is not present in the input schema.'],
      ['Aggregation function "Sum" is incompatible with column "NAME".'],
    ]);
  });

  test(
    unitTest(
      'Reports every row whose name another row gives, in any case, but not a blank one',
    ),
    () => {
      expect(
        errorsOf([
          agg(COUNT, 'ID', 'Total'),
          agg(SUM, 'AMOUNT', 'TOTAL'),
          agg(COUNT_ROWS, undefined, 'Count Rows'),
          agg(MAX, 'DT', ''),
          agg(MIN, 'DT', ''),
        ]),
      ).toEqual([
        [
          'Aggregation output name "Total" is already present in the output schema.',
        ],
        [
          'Aggregation output name "TOTAL" is already present in the output schema.',
        ],
        [],
        ['Aggregation output name cannot be empty.'],
        ['Aggregation output name cannot be empty.'],
      ]);
    },
  );

  test(
    unitTest(
      'Reports names that meet only when folded, as SQL Server would: fullwidth letters, ß and SS',
    ),
    () => {
      expect(
        errorsOf([
          agg(COUNT, 'ID', 'Total'),
          agg(SUM, 'AMOUNT', 'Ｔｏｔａｌ'),
          agg(COUNT, 'NAME', 'Straße'),
          agg(SUM, 'ID', 'STRASSE'),
        ]),
      ).toEqual([
        [
          'Aggregation output name "Total" is already present in the output schema.',
        ],
        [
          'Aggregation output name "Ｔｏｔａｌ" is already present in the output schema.',
        ],
        [
          'Aggregation output name "Straße" is already present in the output schema.',
        ],
        [
          'Aggregation output name "STRASSE" is already present in the output schema.',
        ],
      ]);
    },
  );

  test(
    unitTest(
      'Judges a name invalid, then an input column, before another row gives it',
    ),
    () => {
      expect(
        errorsOf([agg(COUNT, 'ID', 'a"b'), agg(SUM, 'AMOUNT', 'a"b')]),
      ).toEqual([
        ['Aggregation output name is not valid column name.'],
        ['Aggregation output name is not valid column name.'],
      ]);
      expect(
        errorsOf([agg(COUNT, 'ID', 'NAME'), agg(SUM, 'AMOUNT', 'name')]),
      ).toEqual([
        [
          'Aggregation output name "NAME" cannot be the same as input column name.',
        ],
        [
          'Aggregation output name "name" cannot be the same as input column name.',
        ],
      ]);
    },
  );

  test(
    unitTest(
      'Validates without collecting errors, and refuses a row that is not there',
    ),
    () => {
      const list = [agg(SUM, 'NAME', 'x')];
      expect(validateColumnAggregation(list, 0, INPUT)).toBe(false);
      expect(() => validateColumnAggregation(list, 1, INPUT)).toThrow(
        'An aggregation list has no aggregation 1',
      );
    },
  );
});
