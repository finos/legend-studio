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
import { Schema, SchemaColumn } from '../../schema/Schema.js';
import { OpaqueType, PrimitiveType } from '../../types/CubeType.js';
import { Filter } from '../../nodes/transforms/Filter.js';
import type { LiteralValue } from '../../values/LiteralValue.js';
import {
  buildQuickFilterRule,
  changeFilterColumn,
  changeFilterOperator,
  negateFilter,
  normalizeFilter,
  rereadFilterValues,
  unwrapFilter,
} from '../FilterBuilder.js';
import { FILTER_OPERATORS, FilterOperator } from '../FilterOperator.js';
import {
  ColumnComparisonFilter,
  CompositeFilter,
  CompositeFilterOperator,
  type FilterRule,
  type FilterValue,
  type FilterValueItem,
  NotFilter,
  UnsupportedFilter,
} from '../FilterTree.js';

const PRECISE = 'meta::pure::precisePrimitives::';
const O = FilterOperator;

const string = (value: string): LiteralValue => ({ kind: 'string', value });
const integer = (value: string): LiteralValue => ({ kind: 'integer', value });

const SCHEMA = new Schema([
  column('SHIP_NAME', `${PRECISE}Varchar`, true, [40]),
  column('SHIP_CITY', `${PRECISE}Varchar`, true, [15]),
  column('NOTES', 'String', true),
  column('ORDER_ID', `${PRECISE}SmallInt`),
  column('EMPLOYEE_ID', `${PRECISE}Int`, true),
  column('FREIGHT', `${PRECISE}Double`, true),
  column('ORDER_DATE', 'StrictDate', true),
  enumColumn('REGION', 'trading::Region', ['EMEA', 'APAC']),
  enumColumn('ZONE', 'trading::Zone', ['EMEA', 'NORTH']),
  column('SHIPPED_AT', 'DateTime', true),
  column('LOADED_AT', `${PRECISE}Timestamp`, true),
  column('DAY', 'Date', true),
  column('TINY', `${PRECISE}TinyInt`),
  column('PAYLOAD', 'meta::pure::metamodel::variant::Variant', true),
  column('AT', 'StrictTime', true),
]);

const compare = (
  columnName: string,
  operator: FilterOperator,
  value?: FilterValue,
): ColumnComparisonFilter =>
  new ColumnComparisonFilter(columnName, operator, value);

/** The rule's structure, without keys */
const shape = (rule: FilterRule): unknown => {
  switch (rule.kind) {
    case 'comparison': {
      const c = rule as ColumnComparisonFilter;
      return { column: c.columnName, operator: c.operator, value: c.value };
    }
    case 'composite': {
      const g = rule as CompositeFilter;
      return { op: g.operator, rules: g.rules.map(shape) };
    }
    case 'not':
      return { not: shape((rule as NotFilter).rule) };
    default:
      return { unsupported: (rule as UnsupportedFilter).json };
  }
};

/** Every key in the tree, rule first */
const keys = (rule: FilterRule): number[] => {
  switch (rule.kind) {
    case 'composite':
      return [rule.key, ...(rule as CompositeFilter).rules.flatMap(keys)];
    case 'not':
      return [rule.key, ...keys((rule as NotFilter).rule)];
    default:
      return [rule.key];
  }
};

describe(unitTest('Normalizing and unwrapping the root'), () => {
  test('No filter becomes an And group with one blank row', () => {
    const root = normalizeFilter(undefined);
    expect(shape(root)).toEqual({
      op: 'And',
      rules: [{ column: '', operator: 'Equal', value: undefined }],
    });
    // and a new one each time
    expect(normalizeFilter().key).not.toBe(root.key);
  });

  test('A comparison or a negation is wrapped in an And group', () => {
    const rule = compare('ORDER_ID', O.EQUAL, integer('1'));
    const root = normalizeFilter(rule);
    expect(root.operator).toBe(CompositeFilterOperator.AND);
    expect(root.rules).toEqual([rule]);
    expect(root.rules[0]).toBe(rule);
    const not = new NotFilter(
      new CompositeFilter(CompositeFilterOperator.OR, [rule]),
    );
    expect(normalizeFilter(not).rules[0]).toBe(not);
    // the wrapper is a new group
    expect(root.key).not.toBe(rule.key);
    expect(normalizeFilter(not).key).not.toBe(not.key);
    [rule, not].forEach((wrapped) => {
      const all = keys(normalizeFilter(wrapped));
      expect(new Set(all).size).toBe(all.length);
    });
  });

  test('A group stays as it is', () => {
    const group = new CompositeFilter(CompositeFilterOperator.OR, []);
    expect(normalizeFilter(group)).toBe(group);
  });

  test('A top-level group with one rule unwraps to that rule', () => {
    const rule = compare('ORDER_ID', O.EQUAL, integer('1'));
    expect(
      unwrapFilter(new CompositeFilter(CompositeFilterOperator.OR, [rule])),
    ).toBe(rule);
    // groups with no rule, or more than one, stay
    const empty = new CompositeFilter(CompositeFilterOperator.AND, []);
    expect(unwrapFilter(empty)).toBe(empty);
    const two = new CompositeFilter(CompositeFilterOperator.AND, [
      rule,
      rule.withValue(integer('2')),
    ]);
    expect(unwrapFilter(two)).toBe(two);
    // non-groups stay
    expect(unwrapFilter(rule)).toBe(rule);
    const not = new NotFilter(rule);
    expect(unwrapFilter(not)).toBe(not);
  });

  test('Only the top level unwraps', () => {
    const rule = compare('ORDER_ID', O.EQUAL, integer('1'));
    const inner = new CompositeFilter(CompositeFilterOperator.OR, [rule]);
    const outer = new CompositeFilter(CompositeFilterOperator.AND, [
      inner,
      rule,
    ]);
    expect(unwrapFilter(outer)).toBe(outer);
    expect(
      unwrapFilter(new CompositeFilter(CompositeFilterOperator.AND, [inner])),
    ).toBe(inner);
  });

  test.each<[string, FilterRule]>([
    ['a comparison', compare('ORDER_ID', O.EQUAL, integer('1'))],
    [
      'a group of two',
      new CompositeFilter(CompositeFilterOperator.OR, [
        compare('ORDER_ID', O.EQUAL, integer('1')),
        compare('SHIP_NAME', O.IS_EMPTY),
      ]),
    ],
    ['an empty group', new CompositeFilter(CompositeFilterOperator.AND, [])],
    [
      'an unsupported rule',
      new UnsupportedFilter({ column: 'FREIGHT', operator: 'Between' }),
    ],
    [
      'a negated group',
      new NotFilter(
        new CompositeFilter(CompositeFilterOperator.AND, [
          compare('ORDER_ID', O.GREATER_THAN, integer('1')),
        ]),
      ),
    ],
  ])('Round-trips %s through normalize and unwrap', (_, rule) => {
    expect(shape(unwrapFilter(normalizeFilter(rule)))).toEqual(shape(rule));
    const root = normalizeFilter(rule);
    expect(shape(normalizeFilter(unwrapFilter(root)))).toEqual(shape(root));
  });

  test('No filter does not round-trip: it comes back as a blank row', () => {
    expect(shape(unwrapFilter(normalizeFilter()))).toEqual({
      column: '',
      operator: 'Equal',
      value: undefined,
    });
  });
});

describe(unitTest('Changing a row'), () => {
  test('A row without a value moves to a column of the same family as it is', () => {
    const blank = compare('SHIP_NAME', O.STARTS_WITH);
    const moved = changeFilterColumn(blank, 'SHIP_CITY', SCHEMA);
    expect(moved.key).toBe(blank.key);
    expect(moved.operator).toBe(O.STARTS_WITH);
    expect(moved.value).toBeUndefined();
    expect(moved.toString()).toBe('SHIP_CITY starts with (blank)');
    const list = compare('ORDER_ID', O.IN);
    expect(
      changeFilterColumn(list, 'EMPLOYEE_ID', SCHEMA).value,
    ).toBeUndefined();
  });

  test('A column of the same family keeps the operator and the value', () => {
    const rule = compare('SHIP_NAME', O.STARTS_WITH, string('Vins'));
    const changed = changeFilterColumn(rule, 'SHIP_CITY', SCHEMA);
    expect(changed.key).toBe(rule.key);
    expect(changed.columnName).toBe('SHIP_CITY');
    expect(changed.operator).toBe(O.STARTS_WITH);
    expect(changed.value).toEqual(string('Vins'));
    // Varchar(n) and String are the same family
    expect(changeFilterColumn(rule, 'NOTES', SCHEMA).value).toEqual(
      string('Vins'),
    );
    // SmallInt and Int too
    const id = compare('ORDER_ID', O.IN, [integer('1')]);
    expect(changeFilterColumn(id, 'EMPLOYEE_ID', SCHEMA).operator).toBe(O.IN);
  });

  test('A column of another family resets to Equal and clears the value', () => {
    const rule = compare('ORDER_ID', O.GREATER_THAN, integer('5'));
    [
      changeFilterColumn(rule, 'FREIGHT', SCHEMA),
      changeFilterColumn(rule, 'SHIP_NAME', SCHEMA),
      changeFilterColumn(rule, 'ORDER_DATE', SCHEMA),
    ].forEach((changed) => {
      expect(changed.key).toBe(rule.key);
      expect(changed.operator).toBe(O.EQUAL);
      expect(changed.value).toBeUndefined();
    });
    expect(changeFilterColumn(rule, 'FREIGHT', SCHEMA).columnName).toBe(
      'FREIGHT',
    );
    // StrictDate, DateTime and Date are three families
    const date = compare('ORDER_DATE', O.GREATER_THAN, {
      kind: 'strictDate',
      value: '1997-01-01',
    });
    ['SHIPPED_AT', 'DAY'].forEach((columnName) => {
      const changed = changeFilterColumn(date, columnName, SCHEMA);
      expect(changed.key).toBe(date.key);
      expect(changed.operator).toBe(O.EQUAL);
      expect(changed.value).toBeUndefined();
    });
    // Timestamp and DateTime are one
    const at = compare('LOADED_AT', O.LESS_THAN, {
      kind: 'dateTime',
      value: '1997-01-01T10:00:00',
    });
    const moved = changeFilterColumn(at, 'SHIPPED_AT', SCHEMA);
    expect(moved.operator).toBe(O.LESS_THAN);
    expect(moved.value).toEqual(at.value);
  });

  test('Text that was invalid is read again for the new column', () => {
    // 300 is out of range for TinyInt, and fine for SmallInt
    const rule = compare('TINY', O.EQUAL, { kind: 'invalid', text: '300' });
    expect(rule.validate(SCHEMA)).toBe(false);
    const moved = changeFilterColumn(rule, 'ORDER_ID', SCHEMA);
    expect(moved.key).toBe(rule.key);
    expect(moved.value).toEqual(integer('300'));
    expect(moved.validate(SCHEMA)).toBe(true);
    // each item of a list; literals stay as they are; still-invalid text stays
    const list = compare('TINY', O.IN, [
      integer('1'),
      { kind: 'invalid', text: '+0300' },
      { kind: 'invalid', text: 'abc' },
    ]);
    expect(changeFilterColumn(list, 'ORDER_ID', SCHEMA).value).toEqual([
      integer('1'),
      integer('300'),
      { kind: 'invalid', text: 'abc' },
    ]);
    // and back: 300 is invalid again, as out of range
    const back = changeFilterColumn(moved, 'TINY', SCHEMA);
    expect(back.value).toEqual(integer('300'));
    const errors: string[] = [];
    back.validate(SCHEMA, errors);
    expect(errors).toEqual(['Filter value "300" is out of range for TinyInt.']);
  });

  test('Another enumeration resets too; the same one does not', () => {
    const rule = compare('REGION', O.NOT_EQUAL, {
      kind: 'enum',
      value: 'EMEA',
    });
    const zone = changeFilterColumn(rule, 'ZONE', SCHEMA);
    expect(zone.operator).toBe(O.EQUAL);
    expect(zone.value).toBeUndefined();
    const same = new Schema([
      ...SCHEMA.columns,
      enumColumn('HOME_REGION', 'trading::Region', ['EMEA', 'APAC']),
    ]);
    const home = changeFilterColumn(rule, 'HOME_REGION', same);
    expect(home.operator).toBe(O.NOT_EQUAL);
    expect(home.value).toEqual({ kind: 'enum', value: 'EMEA' });
  });

  test('A column whose type has no Equal resets to its first operator', () => {
    const rule = compare('SHIP_NAME', O.CONTAINS, string('x'));
    ['PAYLOAD', 'AT'].forEach((columnName) => {
      const changed = changeFilterColumn(rule, columnName, SCHEMA);
      expect(changed.operator).toBe(O.IS_EMPTY);
      expect(changed.value).toBeUndefined();
      expect(changed.validate(SCHEMA)).toBe(true);
    });
  });

  test('A blank or unknown column, before or after, resets', () => {
    const blank = new ColumnComparisonFilter('', O.NOT_EQUAL, string('x'));
    expect(changeFilterColumn(blank, 'SHIP_NAME', SCHEMA).operator).toBe(
      O.EQUAL,
    );
    const rule = compare('SHIP_NAME', O.CONTAINS, string('x'));
    const gone = changeFilterColumn(rule, 'NOPE', SCHEMA);
    expect(gone.columnName).toBe('NOPE');
    expect(gone.operator).toBe(O.EQUAL);
    expect(gone.value).toBeUndefined();
  });

  test('An operator taking the same shape of value keeps the value', () => {
    const rule = compare('ORDER_ID', O.EQUAL, integer('5'));
    const changed = changeFilterOperator(rule, O.GREATER_THAN);
    expect(changed.key).toBe(rule.key);
    expect(changed.operator).toBe(O.GREATER_THAN);
    expect(changed.value).toEqual(integer('5'));
    const list = compare('ORDER_ID', O.IN, [integer('1')]);
    expect(changeFilterOperator(list, O.NOT_IN).value).toEqual([integer('1')]);
  });

  test('An operator taking another shape of value clears it', () => {
    const single = compare('ORDER_ID', O.EQUAL, integer('5'));
    const list = compare('ORDER_ID', O.IN, [integer('5')]);
    // stale values on empty operators, e.g. from a hand-edited spec
    const empty = compare('ORDER_ID', O.IS_EMPTY, integer('5'));
    const notEmpty = compare('ORDER_ID', O.IS_NOT_EMPTY, [integer('5')]);
    (
      [
        [single, O.IN],
        [single, O.IS_NOT_EMPTY],
        [list, O.EQUAL],
        [list, O.IS_EMPTY],
        [empty, O.EQUAL],
        [empty, O.NOT_IN],
        [notEmpty, O.IN],
      ] as [ColumnComparisonFilter, FilterOperator][]
    ).forEach(([rule, operator]) => {
      const changed = changeFilterOperator(rule, operator);
      expect(changed.operator).toBe(operator);
      expect(changed.value).toBeUndefined();
    });
    // between the two empty operators the (ignored) value stays
    expect(changeFilterOperator(notEmpty, O.IS_EMPTY).value).toEqual([
      integer('5'),
    ]);
    expect(changeFilterOperator(single, O.IN).key).toBe(single.key);
    expect(changeFilterOperator(single, O.IN).columnName).toBe('ORDER_ID');
  });
});

describe(unitTest('Negating a rule'), () => {
  test('A comparison with a negated operator takes it, keeping its value', () => {
    const pairs: [FilterOperator, FilterOperator][] = [
      [O.EQUAL, O.NOT_EQUAL],
      [O.CONTAINS, O.DOES_NOT_CONTAIN],
      [O.IN, O.NOT_IN],
      [O.IS_EMPTY, O.IS_NOT_EMPTY],
    ];
    pairs.forEach(([positive, negative]) => {
      const rule = compare('SHIP_NAME', positive, string('x'));
      const negated = negateFilter(rule) as ColumnComparisonFilter;
      expect(negated.kind).toBe('comparison');
      expect(negated.key).toBe(rule.key);
      expect(negated.operator).toBe(negative);
      expect(negated.value).toEqual(string('x'));
      expect((negateFilter(negated) as ColumnComparisonFilter).operator).toBe(
        positive,
      );
    });
  });

  test('Other rules are wrapped in a Not, and a Not unwraps', () => {
    const greater = compare('ORDER_ID', O.GREATER_THAN, integer('5'));
    const not = negateFilter(greater) as NotFilter;
    expect(not.kind).toBe('not');
    expect(not.rule).toBe(greater);
    expect(negateFilter(not)).toBe(greater);
    const group = new CompositeFilter(CompositeFilterOperator.AND, [greater]);
    expect((negateFilter(group) as NotFilter).rule).toBe(group);
    // exactly one Not comes off a Not over a Not
    const twice = new NotFilter(new NotFilter(greater));
    expect(negateFilter(twice)).toBe(twice.rule);
    const thrice = new NotFilter(twice);
    expect(negateFilter(thrice)).toBe(thrice.rule);
  });

  test('Every operator negates twice back to itself', () => {
    FILTER_OPERATORS.forEach((operator) => {
      const rule = compare('SHIP_NAME', operator);
      expect(shape(negateFilter(negateFilter(rule)))).toEqual(shape(rule));
    });
  });
});

describe(unitTest('Helpers are pure'), () => {
  test('Leave their input as it was, and give a new rule for any change', () => {
    const rule = compare('ORDER_ID', O.EQUAL, integer('5'));
    const greater = compare('ORDER_ID', O.GREATER_THAN, integer('5'));
    const group = new CompositeFilter(CompositeFilterOperator.AND, [rule]);
    const inputs: FilterRule[] = [rule, greater, group];
    const before = inputs.map(shape);
    const results = [
      changeFilterColumn(rule, 'EMPLOYEE_ID', SCHEMA),
      changeFilterColumn(rule, 'SHIP_NAME', SCHEMA),
      changeFilterOperator(rule, O.NOT_EQUAL),
      changeFilterOperator(rule, O.IN),
      negateFilter(rule),
      negateFilter(greater),
      normalizeFilter(rule),
      unwrapFilter(group),
    ];
    expect(inputs.map(shape)).toEqual(before);
    results.slice(0, 7).forEach((result) => {
      expect(result).not.toBe(rule);
      expect(result).not.toBe(greater);
    });
    expect(unwrapFilter(group)).toBe(rule);
  });
});

describe(unitTest('Keys'), () => {
  test('Stay unique across a tree built with the helpers', () => {
    // the editor's steps: start, fill the row, add rows, negate one, group
    let root = normalizeFilter();
    const [blank] = root.rules as ColumnComparisonFilter[];
    const row = changeFilterOperator(
      changeFilterColumn(blank as ColumnComparisonFilter, 'ORDER_ID', SCHEMA),
      O.GREATER_THAN,
    ).withValue(integer('5'));
    root = root.withRules([
      row,
      compare('SHIP_NAME', O.CONTAINS, string('x')),
      new CompositeFilter(CompositeFilterOperator.OR, [
        compare('FREIGHT', O.LESS_THAN, { kind: 'float', value: '1' }),
      ]),
    ]);
    root = root.withRules(root.rules.map(negateFilter));
    const all = keys(root);
    expect(new Set(all).size).toBe(all.length);
    // an edit keeps the row's key
    expect(row.key).toBe((blank as ColumnComparisonFilter).key);
    expect(keys(unwrapFilter(root))).toEqual(all);
  });
});

describe(unitTest('Unsupported rules in the editor'), () => {
  // a rule saved by a newer version, with an operator this version doesn't have
  const BETWEEN = {
    column: 'FREIGHT',
    operator: 'Between',
    value: [
      { kind: 'float', value: '10' },
      { kind: 'float', value: '20' },
    ],
  };

  test('Normalizing wraps an unsupported rule in an And group, and unwrapping gives it back', () => {
    const rule = new UnsupportedFilter(BETWEEN);
    const root = normalizeFilter(rule);
    expect(root.kind).toBe('composite');
    expect(root.operator).toBe(CompositeFilterOperator.AND);
    expect(root.rules).toHaveLength(1);
    expect(root.rules[0]).toBe(rule);
    // the wrapper is a new group
    expect(root.key).not.toBe(rule.key);
    expect(unwrapFilter(root)).toBe(rule);
    expect(unwrapFilter(rule)).toBe(rule);
    // a group with an unsupported rule among others stays as it is
    const group = new CompositeFilter(CompositeFilterOperator.OR, [
      rule,
      compare('ORDER_ID', O.EQUAL, integer('1')),
    ]);
    expect(normalizeFilter(group)).toBe(group);
    expect(unwrapFilter(group)).toBe(group);
    // so is one nested below the top
    const nested = new CompositeFilter(CompositeFilterOperator.AND, [
      new CompositeFilter(CompositeFilterOperator.OR, [rule]),
      compare('ORDER_ID', O.IS_EMPTY),
    ]);
    expect(unwrapFilter(nested)).toBe(nested);
  });

  test('Negating wraps an unsupported rule in a Not, and negating that gives it back', () => {
    const rule = new UnsupportedFilter(BETWEEN);
    const negated = negateFilter(rule) as NotFilter;
    expect(negated.kind).toBe('not');
    expect(negated).toBeInstanceOf(NotFilter);
    expect(negated.rule).toBe(rule);
    expect(negated.key).not.toBe(rule.key);
    expect(negateFilter(negated)).toBe(rule);
    // its JSON is left as it was
    expect(rule.json).toEqual(BETWEEN);
    expect(shape(negateFilter(negateFilter(rule)))).toEqual({
      unsupported: BETWEEN,
    });
  });

  test('Keys stay unique in a tree holding unsupported rules', () => {
    const rule = new UnsupportedFilter(BETWEEN);
    const root = normalizeFilter(rule).withRules([
      negateFilter(rule),
      compare('ORDER_ID', O.EQUAL, integer('1')),
      new UnsupportedFilter({ op: 'xor', rules: [] }),
    ]);
    const all = keys(root);
    expect(all).toHaveLength(5);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe(unitTest('Reading invalid values again'), () => {
  const invalid = (text: string): FilterValueItem => ({
    kind: 'invalid',
    text,
  });

  test('Reads text that was invalid as a value of the column type it now has', () => {
    const rule = compare('ORDER_ID', O.EQUAL, invalid('300'));
    const reread = rereadFilterValues(rule, SCHEMA) as ColumnComparisonFilter;
    expect(reread.value).toEqual(integer('300'));
    expect(reread.key).toBe(rule.key);
    // too large for a TinyInt
    const tiny = compare('TINY', O.EQUAL, invalid('300'));
    expect(rereadFilterValues(tiny, SCHEMA)).toBe(tiny);
  });

  test('Reads each invalid item of a list, and keeps the others', () => {
    const rule = compare('ORDER_ID', O.IN, [
      integer('1'),
      invalid('2'),
      invalid('two'),
    ]);
    const reread = rereadFilterValues(rule, SCHEMA) as ColumnComparisonFilter;
    expect(reread.value).toEqual([integer('1'), integer('2'), invalid('two')]);
  });

  test('Gives back the rule itself when nothing is read again', () => {
    const rules = [
      compare('ORDER_ID', O.EQUAL, integer('3')),
      compare('ORDER_ID', O.EQUAL, invalid('three')),
      compare('ORDER_ID', O.IN, [integer('1'), invalid('x')]),
      compare('NOPE', O.EQUAL, invalid('300')),
      compare('ORDER_ID', O.IS_EMPTY),
      new UnsupportedFilter({ op: 'someday' }),
    ];
    rules.forEach((rule) =>
      expect(rereadFilterValues(rule, SCHEMA)).toBe(rule),
    );
    const group = new CompositeFilter(CompositeFilterOperator.OR, rules);
    expect(rereadFilterValues(group, SCHEMA)).toBe(group);
    const not = new NotFilter(group);
    expect(rereadFilterValues(not, SCHEMA)).toBe(not);
  });

  test('Reads values again inside groups and negations, keeping each key', () => {
    const fixed = compare('ORDER_ID', O.EQUAL, invalid('7'));
    const kept = compare('SHIP_CITY', O.EQUAL, string('Paris'));
    const group = new CompositeFilter(CompositeFilterOperator.AND, [
      kept,
      new NotFilter(fixed),
    ]);
    const reread = rereadFilterValues(group, SCHEMA) as CompositeFilter;
    expect(reread.key).toBe(group.key);
    expect(reread.rules[0]).toBe(kept);
    const not = reread.rules[1] as NotFilter;
    expect(not.key).toBe((group.rules[1] as NotFilter).key);
    expect((not.rule as ColumnComparisonFilter).value).toEqual(integer('7'));
    expect(reread.validate(SCHEMA)).toBe(true);
  });
});

describe(unitTest('Quick filter from a grid cell'), () => {
  const type = (path: string, params: number[] = []): PrimitiveType =>
    PrimitiveType.get(path, params);
  /** The rule's operator and value, or undefined */
  const quick = (
    columnType: Parameters<typeof buildQuickFilterRule>[1],
    cell: Parameters<typeof buildQuickFilterRule>[2],
  ): [FilterOperator, FilterValue | undefined] | undefined => {
    const rule = buildQuickFilterRule('C', columnType, cell);
    expect(rule?.columnName ?? 'C').toBe('C');
    return rule && [rule.operator, rule.value];
  };

  test.each<
    [
      string,
      Parameters<typeof buildQuickFilterRule>[1],
      string | number | boolean,
      LiteralValue,
    ]
  >([
    ['a string', type(`${PRECISE}Varchar`, [15]), 'France', string('France')],
    ['an empty string, a value', type('String'), '', string('')],
    ['a string with spaces, untrimmed', type('String'), ' a ', string(' a ')],
    ['a boolean', type('Boolean'), true, { kind: 'boolean', value: true }],
    [
      'an integer, as exact text',
      type(`${PRECISE}SmallInt`),
      '10248',
      { kind: 'integer', value: '10248' },
    ],
    [
      'an integer past 2^53, still exact',
      type(`${PRECISE}BigInt`),
      '9007199254740993',
      { kind: 'integer', value: '9007199254740993' },
    ],
    [
      'a decimal, as written',
      type(`${PRECISE}Numeric`, [10, 2]),
      '12.30',
      { kind: 'decimal', value: '12.30' },
    ],
    [
      'a float, a number',
      type(`${PRECISE}Double`),
      32.38,
      { kind: 'float', value: '32.38' },
    ],
    [
      'a date',
      type('StrictDate'),
      '1996-07-04',
      { kind: 'strictDate', value: '1996-07-04' },
    ],
    [
      'a timestamp, its +0000 dropped',
      type(`${PRECISE}Timestamp`),
      '2024-02-29T13:45:12.123456000+0000',
      { kind: 'dateTime', value: '2024-02-29T13:45:12.123456000' },
    ],
  ])('Filters on %s with Equal', (_, columnType, cell, value) => {
    expect(quick(columnType, cell)).toEqual([O.EQUAL, value]);
  });

  test('Filters on an enumeration value only when the enumeration lists it', () => {
    const region = enumColumn('C', 'test::Region', ['EMEA', 'APAC']).type;
    expect(quick(region, 'EMEA')).toEqual([
      O.EQUAL,
      { kind: 'enum', value: 'EMEA' },
    ]);
    expect(quick(region, 'LATAM')).toBeUndefined();
  });

  test.each<[string, Parameters<typeof buildQuickFilterRule>[1]]>([
    ['a string', type('String')],
    ['an integer', type('Integer')],
    ['a Variant', type('Variant')],
    ['a StrictTime', type('StrictTime')],
    ['a type Cube does not know', OpaqueType.get('my::model::Blob')],
  ])('Filters a null cell of %s with Is Empty', (_, columnType) => {
    expect(quick(columnType, null)).toEqual([O.IS_EMPTY, undefined]);
  });

  test.each<
    [
      string,
      Parameters<typeof buildQuickFilterRule>[1],
      string | number | boolean,
    ]
  >([
    ['a StrictTime, which has no Equal', type('StrictTime'), '10:30:00'],
    ['a Variant', type('Variant'), '{"a": 1}'],
    ['a type Cube does not know', OpaqueType.get('my::model::Blob'), 'x'],
    ['an integer that is not one', type('Integer'), 'abc'],
    ['a blank number', type('Integer'), ' '],
  ])('Builds no filter for %s', (_, columnType, cell) => {
    expect(quick(columnType, cell)).toBeUndefined();
  });

  test('Builds a rule that a Filter on a schema with the column finds valid', () => {
    const columnType = type(`${PRECISE}Varchar`, [15]);
    const rule = buildQuickFilterRule('SHIP_COUNTRY', columnType, 'France');
    const errors: string[] = [];
    new Filter('filter101', rule).validate(
      [new Schema([new SchemaColumn('SHIP_COUNTRY', columnType, true)])],
      errors,
    );
    expect(errors).toEqual([]);
  });
});
