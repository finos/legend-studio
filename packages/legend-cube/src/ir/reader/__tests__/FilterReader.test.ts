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
import { FilterOperator } from '../../../filter/FilterOperator.js';
import {
  ColumnComparisonFilter,
  CompositeFilter,
  CompositeFilterOperator,
  type FilterRule,
  NotFilter,
} from '../../../filter/FilterTree.js';
import {
  collection,
  columnAccess,
  enumValue,
  func,
  type IR,
  lambda,
  literal,
} from '../../CubeIR.js';
import { readFilterCondition } from '../FilterReader.js';

const col = (name: string, row = 'x'): IR => columnAccess(row, name);
const text = (value: string): IR => literal({ kind: 'string', value });
const int = (value: string): IR => literal({ kind: 'integer', value });
const condition = (predicate: IR, row = 'x'): IR => lambda([row], [predicate]);

/** A rule's shape, its keys aside */
const shape = (rule: FilterRule | undefined): unknown => {
  if (rule instanceof ColumnComparisonFilter) {
    return [rule.columnName, rule.operator, rule.value];
  }
  if (rule instanceof CompositeFilter) {
    return [rule.operator, rule.rules.map(shape)];
  }
  if (rule instanceof NotFilter) {
    return ['Not', shape(rule.rule)];
  }
  return rule;
};

describe("Reading a Filter's condition", () => {
  test('Reads comparisons, lists and enumeration values', () => {
    expect(
      shape(
        readFilterCondition(
          condition(
            func('and', [
              func('and', [
                func('equal', [col('DESK'), text('A')]),
                func('in', [
                  col('KIND'),
                  collection([
                    enumValue('demo::Kind', 'BUY'),
                    enumValue('demo::Kind', 'SELL'),
                  ]),
                ]),
              ]),
              func('greaterThanEqual', [col('QTY'), int('-5')]),
            ]),
          ),
        )?.rule,
      ),
    ).toEqual([
      CompositeFilterOperator.AND,
      [
        ['DESK', FilterOperator.EQUAL, { kind: 'string', value: 'A' }],
        [
          'KIND',
          FilterOperator.IN,
          [
            { kind: 'enum', value: 'BUY' },
            { kind: 'enum', value: 'SELL' },
          ],
        ],
        [
          'QTY',
          FilterOperator.GREATER_THAN_OR_EQUAL,
          { kind: 'integer', value: '-5' },
        ],
      ],
    ]);
  });

  test("Reads Cube's negation that keeps the empty rows as one rule, even first in a group", () => {
    const keeping = func('or', [
      func('isEmpty', [col('DESK')]),
      func('not', [func('equal', [col('DESK'), text('A')])]),
    ]);
    const alone = readFilterCondition(condition(keeping));
    expect(shape(alone?.rule)).toEqual([
      'DESK',
      FilterOperator.NOT_EQUAL,
      { kind: 'string', value: 'A' },
    ]);
    expect(alone?.hasPlainNegation).toBe(false);
    // first in an Or group, which Cube folds to the left
    const grouped = readFilterCondition(
      condition(func('or', [keeping, func('equal', [col('QTY'), int('1')])])),
    );
    expect(shape(grouped?.rule)).toEqual([
      CompositeFilterOperator.OR,
      [
        ['DESK', FilterOperator.NOT_EQUAL, { kind: 'string', value: 'A' }],
        ['QTY', FilterOperator.EQUAL, { kind: 'integer', value: '1' }],
      ],
    ]);
  });

  test('Tells a plain negation apart, which reads the same rows only on a column that is never empty', () => {
    const plain = readFilterCondition(
      condition(func('not', [func('equal', [col('DESK'), text('A')])])),
    );
    expect(shape(plain?.rule)).toEqual([
      'DESK',
      FilterOperator.NOT_EQUAL,
      { kind: 'string', value: 'A' },
    ]);
    expect(plain?.hasPlainNegation).toBe(true);
    // an ordering has no negated operator
    expect(
      shape(
        readFilterCondition(
          condition(func('not', [func('greaterThan', [col('QTY'), int('5')])])),
        )?.rule,
      ),
    ).toEqual([
      'Not',
      ['QTY', FilterOperator.GREATER_THAN, { kind: 'integer', value: '5' }],
    ]);
    // IsNotEmpty is Cube's own, whatever the column
    const notEmpty = readFilterCondition(
      condition(func('not', [func('isEmpty', [col('DESK')])])),
    );
    expect(shape(notEmpty?.rule)).toEqual([
      'DESK',
      FilterOperator.IS_NOT_EMPTY,
      undefined,
    ]);
    expect(notEmpty?.hasPlainNegation).toBe(false);
  });

  test("Reads nothing for a condition Cube's Filter doesn't write", () => {
    // two columns
    expect(
      readFilterCondition(condition(func('equal', [col('A'), col('B')]))),
    ).toBeUndefined();
    // a function of a column
    expect(
      readFilterCondition(
        condition(func('equal', [func('toUpper', [col('A')]), text('X')])),
      ),
    ).toBeUndefined();
    // another row's column
    expect(
      readFilterCondition(condition(func('equal', [col('A', 'y'), text('X')]))),
    ).toBeUndefined();
    expect(
      readFilterCondition(lambda(['x', 'y'], [text('X')])),
    ).toBeUndefined();
  });
});
