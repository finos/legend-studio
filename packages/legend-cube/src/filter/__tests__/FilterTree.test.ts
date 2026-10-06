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
import { column, enumColumn } from '../../__test-utils__/CubeTestNodes.js';
import { Schema } from '../../schema/Schema.js';
import type { LiteralValue } from '../../values/LiteralValue.js';
import {
  FILTER_OPERATOR_DESCRIPTIONS,
  FILTER_OPERATORS,
  FilterOperator,
  getFilterValueShape,
} from '../FilterOperator.js';
import {
  ColumnComparisonFilter,
  CompositeFilter,
  CompositeFilterOperator,
  type FilterRule,
  type FilterValue,
  type FilterValueItem,
  isFilterRule,
  isFilterValueList,
  NotFilter,
} from '../FilterTree.js';

const PRECISE = 'meta::pure::precisePrimitives::';
const O = FilterOperator;

const string = (value: string): LiteralValue => ({ kind: 'string', value });
const integer = (value: string): LiteralValue => ({ kind: 'integer', value });
const float = (value: string): LiteralValue => ({ kind: 'float', value });
const decimal = (value: string): LiteralValue => ({ kind: 'decimal', value });
const date = (value: string): LiteralValue => ({ kind: 'strictDate', value });
const dateTime = (value: string): LiteralValue => ({ kind: 'dateTime', value });
const boolean = (value: boolean): LiteralValue => ({ kind: 'boolean', value });
const enumValue = (value: string): LiteralValue => ({ kind: 'enum', value });
const invalid = (text: string): FilterValueItem => ({
  kind: 'invalid',
  text,
});

const and = (...rules: FilterRule[]): CompositeFilter =>
  new CompositeFilter(CompositeFilterOperator.AND, rules);
const or = (...rules: FilterRule[]): CompositeFilter =>
  new CompositeFilter(CompositeFilterOperator.OR, rules);
const compare = (
  columnName: string,
  operator: FilterOperator,
  value?: FilterValue,
): ColumnComparisonFilter =>
  new ColumnComparisonFilter(columnName, operator, value);

// Northwind ORDERS, as the engine types it, plus an enumeration and a flag
const ORDERS = new Schema([
  column('ORDER_ID', `${PRECISE}SmallInt`),
  column('CUSTOMER_ID', `${PRECISE}Varchar`, true, [5]),
  column('EMPLOYEE_ID', `${PRECISE}SmallInt`, true),
  column('ORDER_DATE', 'StrictDate', true),
  column('SHIPPED_AT', `${PRECISE}Timestamp`, true),
  column('FREIGHT', `${PRECISE}Double`, true),
  column('DISCOUNT', `${PRECISE}Numeric`, true, [10, 2]),
  column('SHIP_COUNTRY', `${PRECISE}Varchar`, true, [15]),
  column('PAID', 'Boolean'),
  column('NOTES', 'meta::pure::metamodel::variant::Variant', true),
  enumColumn('REGION', 'trading::Region', ['EMEA', 'APAC']),
]);

const errorsOf = (rule: FilterRule, schema = ORDERS): string[] => {
  const errors: string[] = [];
  const valid = rule.validate(schema, errors);
  expect(valid).toBe(errors.length === 0);
  // validating without collecting errors gives the same verdict
  expect(rule.validate(schema)).toBe(valid);
  return errors;
};

describe(unitTest('Filter comparisons'), () => {
  test('Default to Equal with no value, and are frozen', () => {
    const rule = new ColumnComparisonFilter('SHIP_COUNTRY');
    expect(rule.kind).toBe('comparison');
    expect(rule.operator).toBe(O.EQUAL);
    expect(rule.value).toBeUndefined();
    const values = [integer('1')];
    const list = compare('EMPLOYEE_ID', O.IN, values);
    values.push(integer('2'));
    expect(list.value).toEqual([integer('1')]);
    expect(Object.isFrozen(list.value)).toBe(true);
    expect(isFilterValueList(list.value)).toBe(true);
    expect(Object.isFrozen((list.value as LiteralValue[])[0])).toBe(true);
    expect(Object.isFrozen(compare('A', O.EQUAL, string('x')).value)).toBe(
      true,
    );
    // the rule freezes its own copies, never the caller's values
    const value = string('x');
    const single = compare('A', O.EQUAL, value);
    expect(single.value).not.toBe(value);
    expect(single.value).toEqual(value);
    expect(Object.isFrozen(value)).toBe(false);
    const item = integer('1');
    const items = [item];
    const inList = compare('EMPLOYEE_ID', O.IN, items);
    expect((inList.value as LiteralValue[])[0]).not.toBe(item);
    expect(Object.isFrozen(item)).toBe(false);
    expect(Object.isFrozen(items)).toBe(false);
  });

  test('Refuse what is not a column, an operator and values', () => {
    expect(() => new ColumnComparisonFilter(1 as unknown as string)).toThrow();
    expect(
      () => new ColumnComparisonFilter('A', 'Like' as FilterOperator),
    ).toThrow('Unknown filter operator "Like"');
    [
      'x',
      1,
      null,
      { kind: 'string' },
      { kind: 'string', value: 1 },
      { kind: 'boolean', value: 'true' },
      { kind: 'invalid', value: 'x' },
      { kind: 'invalid', text: 1 },
      { kind: 'invalid', text: null },
      { kind: 'text', value: 'x' },
      [string('a'), 'b'],
    ].forEach((value) =>
      expect(
        () => new ColumnComparisonFilter('A', O.EQUAL, value as FilterValue),
      ).toThrow('A filter value must be a value or a list of values'),
    );
    // a list with a hole has no value there
    const sparse: FilterValue[] = [];
    sparse[1] = string('a');
    expect(() => compare('A', O.IN, sparse as FilterValue)).toThrow(
      'A filter value must be a value or a list of values',
    );
    expect(() => compare('A', O.IN, [])).not.toThrow();
    expect(() => compare('A', O.EQUAL, invalid('abc'))).not.toThrow();
  });

  test('Keep their key through edits; new rules get new keys', () => {
    const rule = compare('A', O.EQUAL, string('x'));
    const edited = rule
      .withColumn('B')
      .withOperator(O.NOT_EQUAL)
      .withValue(string('y'));
    expect(edited.key).toBe(rule.key);
    expect(edited.columnName).toBe('B');
    expect(edited.operator).toBe(O.NOT_EQUAL);
    expect(edited.value).toEqual(string('y'));
    expect(rule.columnName).toBe('A');
    expect(compare('A', O.EQUAL).key).not.toBe(rule.key);
    expect(new ColumnComparisonFilter('A', O.EQUAL, undefined, 42).key).toBe(
      42,
    );
  });

  test('Need a column of the input schema', () => {
    expect(errorsOf(compare('SHIP_CITY', O.EQUAL, string('Paris')))).toEqual([
      'Filter column "SHIP_CITY" is not present in the input schema.',
    ]);
    expect(errorsOf(compare('', O.EQUAL, string('Paris')))).toEqual([
      'Filter column does not have a name.',
    ]);
  });

  test('Need an operator the column type offers', () => {
    expect(errorsOf(compare('ORDER_ID', O.CONTAINS, string('1')))).toEqual([
      'Filter operator "contains" is not supported for column "ORDER_ID" of type SmallInt.',
    ]);
    expect(errorsOf(compare('PAID', O.GREATER_THAN, boolean(true)))).toEqual([
      'Filter operator "is greater than" is not supported for column "PAID" of type Boolean.',
    ]);
    expect(errorsOf(compare('NOTES', O.EQUAL, string('x')))).toEqual([
      'Filter operator "is" is not supported for column "NOTES" of type Variant.',
    ]);
    expect(errorsOf(compare('REGION', O.STARTS_WITH, string('E')))).toEqual([
      'Filter operator "starts with" is not supported for column "REGION" of type Region.',
    ]);
    expect(errorsOf(compare('NOTES', O.IS_EMPTY))).toEqual([]);
  });

  test('Name parameterized types in full, without a nullable marker', () => {
    expect(errorsOf(compare('DISCOUNT', O.CONTAINS, string('1')))).toEqual([
      'Filter operator "contains" is not supported for column "DISCOUNT" of type Numeric(10,2).',
    ]);
    expect(
      errorsOf(compare('CUSTOMER_ID', O.GREATER_THAN, string('A'))),
    ).toEqual([
      'Filter operator "is greater than" is not supported for column "CUSTOMER_ID" of type Varchar(5).',
    ]);
    expect(errorsOf(compare('DISCOUNT', O.EQUAL, invalid('abc')))).toEqual([
      'Filter value "abc" is not a valid Numeric(10,2).',
    ]);
  });

  test('Need a value for a single-value operator', () => {
    expect(errorsOf(compare('ORDER_ID', O.EQUAL))).toEqual([
      'Filter value is required.',
    ]);
    // a list is not one value
    expect(errorsOf(compare('ORDER_ID', O.EQUAL, [integer('1')]))).toEqual([
      'Filter value is required.',
    ]);
    // the empty string is a String value
    expect(errorsOf(compare('SHIP_COUNTRY', O.EQUAL, string('')))).toEqual([]);
  });

  test('Need a non-empty list for In and NotIn', () => {
    [O.IN, O.NOT_IN].forEach((operator) => {
      expect(errorsOf(compare('EMPLOYEE_ID', operator))).toEqual([
        'Filter value is required.',
      ]);
      expect(errorsOf(compare('EMPLOYEE_ID', operator, []))).toEqual([
        'Filter value is required.',
      ]);
      expect(errorsOf(compare('EMPLOYEE_ID', operator, integer('1')))).toEqual([
        'Filter value is required.',
      ]);
      expect(
        errorsOf(
          compare('EMPLOYEE_ID', operator, [integer('1'), integer('4')]),
        ),
      ).toEqual([]);
      // one item is a list too
      expect(
        errorsOf(compare('EMPLOYEE_ID', operator, [integer('1')])),
      ).toEqual([]);
    });
  });

  test('Need no value for IsEmpty and IsNotEmpty, and ignore one', () => {
    [O.IS_EMPTY, O.IS_NOT_EMPTY].forEach((operator) => {
      expect(errorsOf(compare('SHIP_COUNTRY', operator))).toEqual([]);
      expect(errorsOf(compare('SHIP_COUNTRY', operator, invalid('x')))).toEqual(
        [],
      );
      expect(errorsOf(compare('ORDER_ID', operator, []))).toEqual([]);
    });
  });

  test.each<[string, string, FilterOperator, FilterValue]>([
    ['a String', 'SHIP_COUNTRY', O.STARTS_WITH, string(' Fr ')],
    ['a SmallInt', 'ORDER_ID', O.GREATER_THAN, integer('-32768')],
    ['a Double', 'FREIGHT', O.LESS_THAN, float('32.38')],
    ['a Numeric', 'DISCOUNT', O.GREATER_THAN, decimal('1.555')],
    ['a StrictDate', 'ORDER_DATE', O.GREATER_THAN_OR_EQUAL, date('1997-01-01')],
    [
      'a Timestamp',
      'SHIPPED_AT',
      O.LESS_THAN_OR_EQUAL,
      dateTime('1997-01-01T10:00:00.5'),
    ],
    ['a Boolean', 'PAID', O.NOT_EQUAL, boolean(false)],
    ['an enumeration value', 'REGION', O.EQUAL, enumValue('EMEA')],
  ])('Take %s value of the column type', (_, columnName, operator, value) => {
    expect(errorsOf(compare(columnName, operator, value))).toEqual([]);
  });

  test.each<[string, string, FilterValue, string]>([
    [
      'text for a number',
      'ORDER_ID',
      invalid('ten'),
      'Filter value "ten" is not a valid SmallInt.',
    ],
    [
      'a number too big for the type',
      'ORDER_ID',
      invalid('40000'),
      'Filter value "40000" is out of range for SmallInt.',
    ],
    [
      'a literal too big for the type',
      'ORDER_ID',
      integer('40000'),
      'Filter value "40000" is out of range for SmallInt.',
    ],
    [
      'a value of another kind',
      'ORDER_ID',
      string('7'),
      'Filter value "7" is not a valid SmallInt.',
    ],
    [
      'a number in non-canonical form',
      'FREIGHT',
      float('007'),
      'Filter value "007" is not a valid Double.',
    ],
    [
      'a date-time without seconds',
      'SHIPPED_AT',
      invalid('1997-01-01T10:00'),
      'Filter value "1997-01-01T10:00" is not a valid Timestamp.',
    ],
    [
      'an impossible date',
      'ORDER_DATE',
      date('1997-02-30'),
      'Filter value "1997-02-30" is not a valid StrictDate.',
    ],
    [
      'text for a Boolean',
      'PAID',
      invalid('yes'),
      'Filter value "yes" is not a valid Boolean.',
    ],
    [
      'a value outside the enumeration',
      'REGION',
      enumValue('AMER'),
      'Filter value "AMER" is not a valid Region.',
    ],
  ])('Refuse %s', (_, columnName, value, message) => {
    expect(errorsOf(compare(columnName, O.EQUAL, value))).toEqual([message]);
  });

  test('Take values as the column type allows them', () => {
    const schema = new Schema([
      column('DAY', 'Date', true),
      column('CODE', `${PRECISE}Varchar`, true, [0]),
      column('RATIO', 'Float'),
      column('AMOUNT', 'Decimal'),
      column('BIG', `${PRECISE}BigInt`),
      column('TEXT', 'String'),
    ]);
    // the abstract Date takes dates and date-times, item by item
    expect(
      errorsOf(
        compare('DAY', O.IN, [
          date('1997-01-01'),
          dateTime('1997-01-01T10:00:00'),
        ]),
        schema,
      ),
    ).toEqual([]);
    // no length check on Varchar: views are typed Varchar(0)
    expect(
      errorsOf(compare('CODE', O.EQUAL, string('a long value')), schema),
    ).toEqual([]);
    // a float a double can't hold is out of range; a decimal is not
    expect(
      errorsOf(compare('RATIO', O.LESS_THAN, invalid('1e400')), schema),
    ).toEqual(['Filter value "1e400" is out of range for Float.']);
    expect(
      errorsOf(compare('AMOUNT', O.LESS_THAN, decimal('1e400')), schema),
    ).toEqual([]);
    // integers beyond JavaScript's safe integers keep their digits
    const big = compare('BIG', O.GREATER_THAN, integer('9007199254740993'));
    expect(errorsOf(big, schema)).toEqual([]);
    expect(big.toString()).toBe('BIG is greater than 9007199254740993');
    expect(
      errorsOf(
        compare('AMOUNT', O.EQUAL, decimal('0.10000000000000000001')),
        schema,
      ),
    ).toEqual([]);
    // text with LIKE wildcards and quotes is kept as typed
    const raw = compare('TEXT', O.CONTAINS, string(`50%_O'Brien`));
    expect(errorsOf(raw, schema)).toEqual([]);
    expect(raw.value).toEqual(string(`50%_O'Brien`));
  });

  test('Check every item of a list, reporting each bad one', () => {
    expect(
      errorsOf(
        compare('EMPLOYEE_ID', O.NOT_IN, [
          integer('1'),
          invalid('two'),
          integer('99999'),
          string('4'),
        ]),
      ),
    ).toEqual([
      'Filter value "two" is not a valid SmallInt.',
      'Filter value "99999" is out of range for SmallInt.',
      'Filter value "4" is not a valid SmallInt.',
    ]);
  });

  test('Stop at the first failing step', () => {
    // an unknown column hides the operator and the value
    expect(errorsOf(compare('NOPE', O.CONTAINS, invalid('x')))).toHaveLength(1);
    // an unsupported operator hides the value
    expect(errorsOf(compare('PAID', O.IN, [invalid('x')]))).toEqual([
      'Filter operator "is in list of" is not supported for column "PAID" of type Boolean.',
    ]);
    // a missing value hides nothing else
    expect(errorsOf(compare('ORDER_ID', O.LESS_THAN))).toEqual([
      'Filter value is required.',
    ]);
  });

  test('Describe themselves with their values, or redacted without', () => {
    const descriptions = (rule: FilterRule): [string, string] => [
      rule.toString(),
      rule.toRedactedString(),
    ];
    expect(
      descriptions(compare('SHIP_COUNTRY', O.EQUAL, string('France'))),
    ).toEqual(['SHIP_COUNTRY is "France"', 'SHIP_COUNTRY is ?']);
    expect(
      descriptions(
        compare('ORDER_DATE', O.GREATER_THAN_OR_EQUAL, date('1997-01-01')),
      ),
    ).toEqual([
      'ORDER_DATE is greater than or equal 1997-01-01',
      'ORDER_DATE is greater than or equal ?',
    ]);
    expect(
      descriptions(compare('EMPLOYEE_ID', O.IN, [integer('1'), integer('4')])),
    ).toEqual([
      'EMPLOYEE_ID is in list of (1, 4)',
      'EMPLOYEE_ID is in list of ?',
    ]);
    expect(
      descriptions(compare('SHIP_COUNTRY', O.IS_EMPTY, string('x'))),
    ).toEqual(['SHIP_COUNTRY is empty', 'SHIP_COUNTRY is empty']);
    // no operator that takes no value shows one, even a stray one
    FILTER_OPERATORS.filter(
      (operator) => getFilterValueShape(operator) === 'none',
    ).forEach((operator) => {
      const text = `SHIP_COUNTRY ${FILTER_OPERATOR_DESCRIPTIONS[operator]}`;
      expect(
        descriptions(compare('SHIP_COUNTRY', operator, [string('stray')])),
      ).toEqual([text, text]);
    });
    expect(
      descriptions(compare('SHIP_COUNTRY', O.IS_NOT_EMPTY, string('x'))),
    ).toEqual(['SHIP_COUNTRY is not empty', 'SHIP_COUNTRY is not empty']);
    expect(descriptions(compare('PAID', O.EQUAL, boolean(true)))).toEqual([
      'PAID is true',
      'PAID is ?',
    ]);
    expect(descriptions(compare('ORDER_ID', O.EQUAL, invalid('ten')))).toEqual([
      'ORDER_ID is "ten"',
      'ORDER_ID is ?',
    ]);
    expect(
      descriptions(compare('REGION', O.NOT_EQUAL, enumValue('EMEA'))),
    ).toEqual(['REGION is not EMEA', 'REGION is not ?']);
    expect(
      descriptions(
        compare('SHIP_COUNTRY', O.NOT_IN, [
          string('a, b'),
          string('c'),
          invalid('x'),
        ]),
      ),
    ).toEqual([
      'SHIP_COUNTRY is not in list of ("a, b", "c", "x")',
      'SHIP_COUNTRY is not in list of ?',
    ]);
    expect(descriptions(new ColumnComparisonFilter(''))).toEqual([
      '(blank) is (blank)',
      '(blank) is ?',
    ]);
  });
});

describe(unitTest('Filter groups and negations'), () => {
  test('Groups join with And or Or', () => {
    expect(Object.values(CompositeFilterOperator)).toEqual(['And', 'Or']);
    expect(and().operator).toBe('And');
    expect(or().operator).toBe('Or');
  });

  test('Keep every message, even repeated ones, after those already given', () => {
    expect(
      errorsOf(
        and(compare('ORDER_ID', O.EQUAL), compare('EMPLOYEE_ID', O.EQUAL)),
      ),
    ).toEqual(['Filter value is required.', 'Filter value is required.']);
    expect(
      errorsOf(compare('EMPLOYEE_ID', O.NOT_IN, [invalid('x'), invalid('x')])),
    ).toEqual([
      'Filter value "x" is not a valid SmallInt.',
      'Filter value "x" is not a valid SmallInt.',
    ]);
    expect(
      errorsOf(
        and(
          compare('NOPE', O.EQUAL, string('x')),
          new NotFilter(compare('ORDER_ID', O.GREATER_THAN)),
        ),
      ),
    ).toEqual([
      'Filter column "NOPE" is not present in the input schema.',
      'Filter value is required.',
    ]);
    const errors = ['Before.'];
    or(compare('NOPE', O.IS_EMPTY)).validate(ORDERS, errors);
    expect(errors).toEqual([
      'Before.',
      'Filter column "NOPE" is not present in the input schema.',
    ]);
  });

  test('Groups need a rule and check every rule', () => {
    expect(and().kind).toBe('composite');
    expect(errorsOf(and())).toEqual(['Composite filter cannot be empty.']);
    expect(errorsOf(or(and()))).toEqual(['Composite filter cannot be empty.']);
    expect(
      errorsOf(
        and(
          compare('NOPE', O.EQUAL, string('x')),
          compare('SHIP_COUNTRY', O.EQUAL, string('France')),
          or(compare('ORDER_ID', O.EQUAL)),
        ),
      ),
    ).toEqual([
      'Filter column "NOPE" is not present in the input schema.',
      'Filter value is required.',
    ]);
  });

  test('Groups refuse an unknown operator or rules that are not rules', () => {
    expect(
      () => new CompositeFilter('Xor' as CompositeFilterOperator, []),
    ).toThrow('Unknown filter group operator "Xor"');
    expect(
      () =>
        new CompositeFilter(CompositeFilterOperator.AND, [
          {} as unknown as FilterRule,
        ]),
    ).toThrow();
    expect(
      () =>
        new CompositeFilter(
          CompositeFilterOperator.AND,
          'x' as unknown as FilterRule[],
        ),
    ).toThrow();
    expect(() => new NotFilter(undefined as unknown as FilterRule)).toThrow();
    // each part of a rule's shape is checked
    [
      { validate: () => true, toRedactedString: () => '' },
      { kind: 'comparison', validate: () => true },
      { kind: 'comparison', toRedactedString: () => '' },
      { kind: 'other', validate: () => true, toRedactedString: () => '' },
    ].forEach((notARule) => {
      expect(() => new NotFilter(notARule as unknown as FilterRule)).toThrow(
        'A filter negation must have a rule',
      );
      expect(
        () =>
          new CompositeFilter(CompositeFilterOperator.AND, [
            notARule as unknown as FilterRule,
          ]),
      ).toThrow('A filter group must have a list of rules');
    });
    ['', {}, undefined].forEach((notAList) =>
      expect(
        () =>
          new CompositeFilter(
            CompositeFilterOperator.AND,
            notAList as unknown as FilterRule[],
          ),
      ).toThrow('A filter group must have a list of rules'),
    );
    // a list with a hole has no rule there
    const sparse: FilterRule[] = [];
    sparse[1] = compare('A', O.IS_EMPTY);
    expect(
      () => new CompositeFilter(CompositeFilterOperator.AND, sparse),
    ).toThrow('A filter group must have a list of rules');
  });

  test('Groups and negations keep their key through edits', () => {
    const rule = compare('A', O.EQUAL, string('x'));
    const group = and(rule);
    const edited = group
      .withOperator(CompositeFilterOperator.OR)
      .withRules([rule, rule.withValue(string('y'))]);
    expect(edited.key).toBe(group.key);
    expect(edited.operator).toBe(CompositeFilterOperator.OR);
    expect(edited.rules).toHaveLength(2);
    expect(Object.isFrozen(edited.rules)).toBe(true);
    expect(group.rules).toHaveLength(1);
    const not = new NotFilter(rule);
    expect(not.kind).toBe('not');
    expect(not.withRule(group).key).toBe(not.key);
    expect(not.withRule(group).rule).toBe(group);
  });

  test('Groups change operator keeping their rules, and copy the rules given', () => {
    const a = compare('A', O.IS_EMPTY);
    const b = compare('B', O.IS_EMPTY);
    const group = and(a, b);
    const either = group.withOperator(CompositeFilterOperator.OR);
    expect(either.key).toBe(group.key);
    expect(either.operator).toBe(CompositeFilterOperator.OR);
    expect(either.rules).toHaveLength(2);
    expect(either.rules[0]).toBe(a);
    expect(either.rules[1]).toBe(b);
    expect(either.toString()).toBe('A is empty or B is empty');
    expect(group.operator).toBe(CompositeFilterOperator.AND);
    const rules = [a];
    const copied = new CompositeFilter(CompositeFilterOperator.AND, rules);
    rules.push(b);
    expect(copied.rules).toEqual([a]);
    expect(copied.rules).not.toBe(rules);
    expect(Object.isFrozen(rules)).toBe(false);
  });

  test('Tells filter rules from anything else', () => {
    expect(isFilterRule(compare('A', O.IS_EMPTY))).toBe(true);
    expect(isFilterRule(and())).toBe(true);
    expect(isFilterRule(new NotFilter(and()))).toBe(true);
    [null, undefined, 0, 'x', {}, []].forEach((value) =>
      expect(isFilterRule(value)).toBe(false),
    );
    expect(() => new NotFilter(null as unknown as FilterRule)).toThrow(
      'A filter negation must have a rule',
    );
    expect(
      () =>
        new CompositeFilter(CompositeFilterOperator.AND, [
          null as unknown as FilterRule,
        ]),
    ).toThrow('A filter group must have a list of rules');
  });

  test('A negation can negate a negation', () => {
    const greater = compare('ORDER_ID', O.GREATER_THAN, integer('5'));
    const twice = new NotFilter(new NotFilter(greater));
    expect(twice.rule.kind).toBe('not');
    expect(twice.withRule(twice.rule).key).toBe(twice.key);
    expect(twice.toString()).toBe('not (not (ORDER_ID is greater than 5))');
    expect(twice.toRedactedString()).toBe(
      'not (not (ORDER_ID is greater than ?))',
    );
    expect(errorsOf(twice)).toEqual([]);
    expect(
      errorsOf(
        new NotFilter(new NotFilter(compare('ORDER_ID', O.GREATER_THAN))),
      ),
    ).toEqual(['Filter value is required.']);
  });

  test('A negation checks its rule', () => {
    expect(
      errorsOf(new NotFilter(compare('ORDER_ID', O.GREATER_THAN))),
    ).toEqual(['Filter value is required.']);
    expect(
      errorsOf(
        new NotFilter(compare('ORDER_ID', O.GREATER_THAN, integer('5'))),
      ),
    ).toEqual([]);
  });

  test('Describe nested groups with parentheses', () => {
    const country = compare('SHIP_COUNTRY', O.EQUAL, string('France'));
    const late = compare('ORDER_DATE', O.GREATER_THAN, date('1997-01-01'));
    const employee = compare('EMPLOYEE_ID', O.IN, [integer('1'), integer('4')]);
    const filter = and(
      country,
      or(late, employee),
      or(late),
      new NotFilter(and(country, late)),
    );
    expect(filter.toString()).toBe(
      'SHIP_COUNTRY is "France" and (ORDER_DATE is greater than 1997-01-01 or EMPLOYEE_ID is in list of (1, 4)) and ORDER_DATE is greater than 1997-01-01 and not (SHIP_COUNTRY is "France" and ORDER_DATE is greater than 1997-01-01)',
    );
    expect(filter.toRedactedString()).toBe(
      'SHIP_COUNTRY is ? and (ORDER_DATE is greater than ? or EMPLOYEE_ID is in list of ?) and ORDER_DATE is greater than ? and not (SHIP_COUNTRY is ? and ORDER_DATE is greater than ?)',
    );
    expect(and().toString()).toBe('(blank)');
    expect(and().toRedactedString()).toBe('(blank)');
    expect(or(country, and()).toString()).toBe(
      'SHIP_COUNTRY is "France" or (blank)',
    );
  });

  test('Never put a value in the redacted description', () => {
    const secrets = ['Sécret', '123456789', '2001-09-11', 'APAC'];
    const filter = or(
      compare('SHIP_COUNTRY', O.CONTAINS, string(secrets[0] as string)),
      compare('ORDER_ID', O.NOT_IN, [integer(secrets[1] as string)]),
      new NotFilter(
        compare('ORDER_DATE', O.LESS_THAN, date(secrets[2] as string)),
      ),
      compare('REGION', O.EQUAL, invalid(secrets[3] as string)),
    );
    secrets.forEach((secret) => {
      expect(filter.toString()).toContain(secret);
      expect(filter.toRedactedString()).not.toContain(secret);
    });
  });
});
