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
  AGGREGATION_SETTING_DEFAULTS,
  AggregationFunction,
  AggregationSetting,
  type AggregationUse,
  type ColumnAggregation,
  getAggregationAutoName,
  getAggregationDisplayName,
  getAggregationResultType,
  getAggregationSetting,
  getAvailableAggregations,
  GROUP_AGGREGATION_USE,
  isAggregationFunction,
  isAggregationFunctionOf,
  isAggregationNullable,
  isWindowFunction,
  isWindowRankFunction,
  isWindowRowFunction,
  needsWindowSort,
  takesAggregationColumn,
  validateColumnAggregation,
  WINDOW_RANK_FUNCTIONS,
  WINDOW_ROW_FUNCTIONS,
  WindowRankFunction,
  WindowRowFunction,
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
const errorsOf = (
  aggregations: readonly ColumnAggregation[],
  use?: AggregationUse,
): string[][] =>
  aggregations.map((_, index) => {
    const errors: string[] = [];
    const valid = validateColumnAggregation(
      aggregations,
      index,
      INPUT,
      errors,
      use,
    );
    expect(valid).toBe(errors.length === 0);
    return errors;
  });

const SORTED_WINDOW: AggregationUse = { kind: 'window', sorted: true };
const UNSORTED_WINDOW: AggregationUse = { kind: 'window', sorted: false };
const {
  RANK,
  DENSE_RANK,
  ROW_NUMBER,
  NTILE,
  PERCENT_RANK,
  CUMULATIVE_DISTRIBUTION,
} = WindowRankFunction;
const { LAG, LEAD, FIRST, LAST } = WindowRowFunction;

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

describe('Window functions', () => {
  test(
    unitTest('Knows the rank functions as saved, apart from the others'),
    () => {
      expect(Object.values(WindowRankFunction)).toEqual([
        'Rank',
        'DenseRank',
        'RowNumber',
        'NTile',
        'PercentRank',
        'CumulativeDistribution',
      ]);
      expect(WINDOW_RANK_FUNCTIONS).toEqual([
        RANK,
        DENSE_RANK,
        ROW_NUMBER,
        NTILE,
        PERCENT_RANK,
        CUMULATIVE_DISTRIBUTION,
      ]);
      expect(Object.isFrozen(WINDOW_RANK_FUNCTIONS)).toBe(true);
      WINDOW_RANK_FUNCTIONS.forEach((fn) => {
        expect(isWindowRankFunction(fn)).toBe(true);
        expect(isWindowFunction(fn)).toBe(true);
        expect(isAggregationFunction(fn)).toBe(false);
      });
      Object.values(AggregationFunction).forEach((fn) => {
        expect(isWindowRankFunction(fn)).toBe(false);
        expect(isWindowFunction(fn)).toBe(true);
      });
      ['rank', 'Denserank', 'Ntile', 'lag', 'Nth', ''].forEach((text) => {
        expect(isWindowRankFunction(text)).toBe(false);
        expect(isWindowRowFunction(text)).toBe(false);
        expect(isWindowFunction(text)).toBe(false);
      });
    },
  );

  test(
    unitTest('Knows the rank functions in a window, never in a Group'),
    () => {
      WINDOW_RANK_FUNCTIONS.forEach((fn) => {
        expect(isAggregationFunctionOf(fn, GROUP_AGGREGATION_USE)).toBe(false);
        expect(isAggregationFunctionOf(fn, UNSORTED_WINDOW)).toBe(true);
      });
      [SUM, COUNT_ROWS].forEach((fn) => {
        expect(isAggregationFunctionOf(fn, GROUP_AGGREGATION_USE)).toBe(true);
        expect(isAggregationFunctionOf(fn, SORTED_WINDOW)).toBe(true);
      });
      expect(isAggregationFunctionOf('Median', SORTED_WINDOW)).toBe(false);
      expect(GROUP_AGGREGATION_USE).toEqual({ kind: 'group' });
      expect(Object.isFrozen(GROUP_AGGREGATION_USE)).toBe(true);
    },
  );

  test(
    unitTest(
      'Shows Dense Rank and Row Number with a space, and gives the rank functions no column, Integer and never empty',
    ),
    () => {
      expect(WINDOW_RANK_FUNCTIONS.map(getAggregationDisplayName)).toEqual([
        'Rank',
        'Dense Rank',
        'Row Number',
        'NTile',
        'Percent Rank',
        'Cumulative Distribution',
      ]);
      WINDOW_RANK_FUNCTIONS.forEach((fn) => {
        const expected =
          fn === PERCENT_RANK || fn === CUMULATIVE_DISTRIBUTION
            ? 'Float'
            : 'Integer';
        expect(takesAggregationColumn(fn)).toBe(false);
        expect(isAggregationNullable(fn)).toBe(false);
        expect(needsWindowSort(fn)).toBe(true);
        expect(getAggregationResultType(fn, undefined)?.fullName).toBe(
          expected,
        );
        // a column given anyway changes nothing
        expect(
          getAggregationResultType(fn, PrimitiveType.get('String'))?.fullName,
        ).toBe(expected);
      });
    },
  );

  test(
    unitTest(
      'Names a rank function as shown in a window, and gives it no name in a Group',
    ),
    () => {
      expect(
        WINDOW_RANK_FUNCTIONS.map((fn) =>
          getAggregationAutoName(fn, undefined, UNSORTED_WINDOW),
        ),
      ).toEqual([
        'Rank',
        'Dense Rank',
        'Row Number',
        'NTile',
        'Percent Rank',
        'Cumulative Distribution',
      ]);
      expect(getAggregationAutoName(RANK, 'ID', SORTED_WINDOW)).toBe('Rank');
      WINDOW_RANK_FUNCTIONS.forEach((fn) => {
        expect(getAggregationAutoName(fn, undefined)).toBeUndefined();
        expect(getAggregationAutoName(fn, 'ID')).toBeUndefined();
        expect(
          getAggregationAutoName(fn, undefined, GROUP_AGGREGATION_USE),
        ).toBeUndefined();
      });
      // the other functions are named the same way in both
      expect(getAggregationAutoName(SUM, 'FREIGHT', SORTED_WINDOW)).toBe(
        'FREIGHT Sum',
      );
      expect(getAggregationAutoName(SUM, undefined, SORTED_WINDOW)).toBe(
        undefined,
      );
      expect(getAggregationAutoName(COUNT_ROWS, undefined, SORTED_WINDOW)).toBe(
        'Count Rows',
      );
      expect(
        getAggregationAutoName('Median', 'ID', SORTED_WINDOW),
      ).toBeUndefined();
    },
  );
});

describe('Window row functions', () => {
  test(
    unitTest(
      'Knows the row functions as saved, in a window only, each taking a column and a sort',
    ),
    () => {
      expect(Object.values(WindowRowFunction)).toEqual([
        'Lag',
        'Lead',
        'First',
        'Last',
      ]);
      expect(WINDOW_ROW_FUNCTIONS).toEqual([LAG, LEAD, FIRST, LAST]);
      expect(Object.isFrozen(WINDOW_ROW_FUNCTIONS)).toBe(true);
      WINDOW_ROW_FUNCTIONS.forEach((fn) => {
        expect(isWindowRowFunction(fn)).toBe(true);
        expect(isWindowRankFunction(fn)).toBe(false);
        expect(isWindowFunction(fn)).toBe(true);
        expect(isAggregationFunction(fn)).toBe(false);
        expect(isAggregationFunctionOf(fn, GROUP_AGGREGATION_USE)).toBe(false);
        expect(isAggregationFunctionOf(fn, UNSORTED_WINDOW)).toBe(true);
        expect(takesAggregationColumn(fn)).toBe(true);
        expect(needsWindowSort(fn)).toBe(true);
        expect(isAggregationNullable(fn)).toBe(true);
        expect(getAggregationDisplayName(fn)).toBe(fn);
        expect(getAggregationAutoName(fn, 'FREIGHT', SORTED_WINDOW)).toBe(
          `FREIGHT ${fn}`,
        );
        expect(
          getAggregationAutoName(fn, undefined, SORTED_WINDOW),
        ).toBeUndefined();
        expect(getAggregationAutoName(fn, 'FREIGHT')).toBeUndefined();
      });
      [SUM, COUNT_ROWS].forEach((fn) =>
        expect(needsWindowSort(fn)).toBe(false),
      );
    },
  );

  test(
    unitTest(
      "Gives a row function its column's own type, on any type a window can partition by",
    ),
    () => {
      const varchar = type(`${P}Varchar`, [15]);
      const region = new EnumType('test::Region', ['EMEA', 'APAC']);
      [
        type(`${P}Double`),
        varchar,
        type('StrictDate'),
        type('Boolean'),
        region,
      ].forEach((columnType) =>
        WINDOW_ROW_FUNCTIONS.forEach((fn) =>
          expect(
            getAggregationResultType(fn, columnType)?.equals(columnType),
          ).toBe(true),
        ),
      );
      [
        type('meta::pure::metamodel::variant::Variant'),
        OpaqueType.get('test::Geography'),
      ].forEach((columnType) =>
        expect(getAggregationResultType(LAG, columnType)).toBeUndefined(),
      );
      expect(getAggregationResultType(FIRST, undefined)).toBeUndefined();
    },
  );

  test(
    unitTest(
      "Knows Lag's and Lead's offset and NTile's bucket count, one row and four buckets by default",
    ),
    () => {
      expect(getAggregationSetting(LAG)).toBe(AggregationSetting.OFFSET);
      expect(getAggregationSetting(LEAD)).toBe(AggregationSetting.OFFSET);
      expect(getAggregationSetting(NTILE)).toBe(AggregationSetting.BUCKETS);
      [FIRST, LAST, RANK, PERCENT_RANK, SUM, 'Median'].forEach((fn) =>
        expect(getAggregationSetting(fn)).toBeUndefined(),
      );
      expect(AGGREGATION_SETTING_DEFAULTS).toEqual({ offset: 1, buckets: 4 });
      expect(Object.isFrozen(AGGREGATION_SETTING_DEFAULTS)).toBe(true);
    },
  );
});

describe('Window function validation', () => {
  test(
    unitTest(
      'Accepts the rank functions with no column in a sorted window, and every Group aggregation',
    ),
    () => {
      expect(
        errorsOf(
          [
            agg(RANK, undefined, 'Rank'),
            agg(DENSE_RANK, undefined, 'Dense Rank'),
            agg(ROW_NUMBER, undefined, 'Row Number'),
            agg(SUM, 'AMOUNT', 'AMOUNT Sum'),
            agg(COUNT_ROWS, undefined, 'Count Rows'),
          ],
          SORTED_WINDOW,
        ),
      ).toEqual([[], [], [], [], []]);
      // Count rows and the column functions need no sort
      expect(
        errorsOf(
          [agg(COUNT_ROWS, undefined, 'n'), agg(MAX, 'DT', 'DT Max')],
          UNSORTED_WINDOW,
        ),
      ).toEqual([[], []]);
    },
  );

  test(
    unitTest('Refuses a rank function in an unsorted window, on its row'),
    () => {
      expect(
        errorsOf(
          [
            agg(RANK, undefined, 'Rank'),
            agg(DENSE_RANK, undefined, 'Dense Rank'),
            agg(ROW_NUMBER, undefined, 'Row Number'),
          ],
          UNSORTED_WINDOW,
        ),
      ).toEqual([
        ['Aggregation function "Rank" requires at least one sort column.'],
        ['Aggregation function "DenseRank" requires at least one sort column.'],
        ['Aggregation function "RowNumber" requires at least one sort column.'],
      ]);
    },
  );

  test(
    unitTest(
      'Checks a rank function: known, then no column, then a sort, then its name',
    ),
    () => {
      expect(
        errorsOf(
          [
            // a column comes before the sort
            agg(RANK, 'ID', 'Rank'),
            // the sort before the name
            agg(DENSE_RANK, undefined, ''),
            agg(ROW_NUMBER, undefined, 'ID'),
            agg('rank', undefined, 'r'),
          ],
          UNSORTED_WINDOW,
        ),
      ).toEqual([
        ['Aggregation function "Rank" does not allow column.'],
        ['Aggregation function "DenseRank" requires at least one sort column.'],
        ['Aggregation function "RowNumber" requires at least one sort column.'],
        ['Aggregation function "rank" is unknown.'],
      ]);
      expect(
        errorsOf(
          [
            agg(RANK, '', 'Rank'),
            agg(DENSE_RANK, undefined, ''),
            agg(ROW_NUMBER, undefined, 'id'),
            agg(RANK, undefined, 'n'),
            agg(ROW_NUMBER, undefined, 'N'),
          ],
          SORTED_WINDOW,
        ),
      ).toEqual([
        ['Aggregation function "Rank" does not allow column.'],
        ['Aggregation output name cannot be empty.'],
        [
          'Aggregation output name "id" cannot be the same as input column name.',
        ],
        [
          'Aggregation output name "n" is already present in the output schema.',
        ],
        [
          'Aggregation output name "N" is already present in the output schema.',
        ],
      ]);
    },
  );

  test(
    unitTest(
      'Keeps a Group refusing the rank functions as unknown, sorted or not',
    ),
    () => {
      expect(
        errorsOf([
          agg(RANK, undefined, 'Rank'),
          agg(ROW_NUMBER, 'ID', 'Row Number'),
        ]),
      ).toEqual([
        ['Aggregation function "Rank" is unknown.'],
        ['Aggregation function "RowNumber" is unknown.'],
      ]);
      expect(
        errorsOf([agg(DENSE_RANK, undefined, 'x')], GROUP_AGGREGATION_USE),
      ).toEqual([['Aggregation function "DenseRank" is unknown.']]);
    },
  );

  test(
    unitTest(
      'Accepts the new functions in a sorted window, with their settings, and refuses them unsorted',
    ),
    () => {
      const functions = [
        { ...agg(LAG, 'AMOUNT', 'AMOUNT Lag'), offset: 1 },
        { ...agg(LEAD, 'NAME', 'NAME Lead'), offset: 3 },
        agg(FIRST, 'DT', 'DT First'),
        agg(LAST, 'REGION', 'REGION Last'),
        { ...agg(NTILE, undefined, 'NTile'), buckets: 4 },
        agg(PERCENT_RANK, undefined, 'Percent Rank'),
        agg(CUMULATIVE_DISTRIBUTION, undefined, 'Cumulative Distribution'),
      ];
      expect(errorsOf(functions, SORTED_WINDOW)).toEqual(
        functions.map(() => []),
      );
      expect(errorsOf(functions, UNSORTED_WINDOW)).toEqual(
        functions.map(({ function: fn }) => [
          `Aggregation function "${fn}" requires at least one sort column.`,
        ]),
      );
    },
  );

  test(
    unitTest(
      'Refuses an offset or a bucket count that is missing or not a whole number of at least 1, or on a function that takes none',
    ),
    () => {
      expect(
        errorsOf(
          [
            agg(LAG, 'AMOUNT', 'a'),
            { ...agg(LEAD, 'AMOUNT', 'b'), offset: 0 },
            { ...agg(LAG, 'AMOUNT', 'c'), offset: 1.5 },
            { ...agg(NTILE, undefined, 'd'), buckets: -2 },
            agg(NTILE, undefined, 'e'),
            { ...agg(NTILE, undefined, 'f'), buckets: 2, offset: 1 },
            { ...agg(SUM, 'AMOUNT', 'g'), offset: 1 },
            { ...agg(FIRST, 'AMOUNT', 'h'), buckets: 4 },
            { ...agg(LAG, 'AMOUNT', 'i'), offset: Number.MAX_SAFE_INTEGER },
          ],
          SORTED_WINDOW,
        ),
      ).toEqual([
        [
          'Aggregation function "Lag" needs an offset that is a whole number of at least 1.',
        ],
        [
          'Aggregation function "Lead" needs an offset that is a whole number of at least 1.',
        ],
        [
          'Aggregation function "Lag" needs an offset that is a whole number of at least 1.',
        ],
        [
          'Aggregation function "NTile" needs a bucket count that is a whole number of at least 1.',
        ],
        [
          'Aggregation function "NTile" needs a bucket count that is a whole number of at least 1.',
        ],
        ['Aggregation function "NTile" does not take an offset.'],
        ['Aggregation function "Sum" does not take an offset.'],
        ['Aggregation function "First" does not take a bucket count.'],
        [],
      ]);
    },
  );

  test(
    unitTest(
      'Checks a row function: a column of a type it can take, then a sort',
    ),
    () => {
      const withVariant = new Schema([
        ...INPUT.columns,
        column('V', 'meta::pure::metamodel::variant::Variant', true),
      ]);
      const errors: string[] = [];
      expect(
        validateColumnAggregation(
          [agg(LAST, 'V', 'v')],
          0,
          withVariant,
          errors,
          SORTED_WINDOW,
        ),
      ).toBe(false);
      expect(errors).toEqual([
        'Aggregation function "Last" is incompatible with column "V".',
      ]);
      expect(
        errorsOf(
          [
            { ...agg(LAG, undefined, 'a'), offset: 1 },
            agg(FIRST, 'NOPE', 'b'),
            agg(LAST, '', 'c'),
          ],
          UNSORTED_WINDOW,
        ),
      ).toEqual([
        ['Aggregation column does not have a name.'],
        ['Aggregation column "NOPE" is not present in the input schema.'],
        ['Aggregation column does not have a name.'],
      ]);
    },
  );

  test(unitTest("Checks a window's column functions as a Group's"), () => {
    expect(
      errorsOf(
        [
          agg(SUM, 'NAME', 'x'),
          agg(COUNT, undefined, 'y'),
          agg(COUNT_ROWS, 'ID', 'z'),
          agg(AVERAGE, 'NOPE', 'w'),
        ],
        SORTED_WINDOW,
      ),
    ).toEqual([
      ['Aggregation function "Sum" is incompatible with column "NAME".'],
      ['Aggregation column does not have a name.'],
      ['Aggregation function "CountRows" does not allow column.'],
      ['Aggregation column "NOPE" is not present in the input schema.'],
    ]);
  });
});
