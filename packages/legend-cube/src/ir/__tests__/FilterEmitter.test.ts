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
  column,
  enumColumn,
  resolvedTable,
} from '../../__test-utils__/CubeTestNodes.js';
import {
  FilterOperator,
  getAvailableOperators,
} from '../../filter/FilterOperator.js';
import {
  ColumnComparisonFilter,
  CompositeFilter,
  CompositeFilterOperator,
  type FilterRule,
  type FilterValue,
  NotFilter,
} from '../../filter/FilterTree.js';
import { Connection } from '../../graph/Connection.js';
import { Query } from '../../graph/Query.js';
import { Filter } from '../../nodes/transforms/Filter.js';
import { Schema, SchemaColumn } from '../../schema/Schema.js';
import { OpaqueType } from '../../types/CubeType.js';
import type { LiteralValue } from '../../values/LiteralValue.js';
import { storeAccessor } from '../CubeIR.js';
import { emitFilter } from '../emitters/FilterEmitter.js';
import { printIR } from '../IRPrinter.js';
import { QueryEmitter } from '../QueryEmitter.js';

const P = 'meta::pure::precisePrimitives::';
const O = FilterOperator;
const SOURCE = '#>{test::Northwind.NORTHWIND.T}#';

// one column per type family
const COLUMNS: SchemaColumn[] = [
  column('b', 'Boolean', true),
  column('s', `${P}Varchar`, true, [10]),
  enumColumn('e', 'a::Region', ['EMEA', 'APAC'], true),
  column('i', `${P}SmallInt`, true),
  column('f', `${P}Double`, true),
  column('d', `${P}Numeric`, true, [10, 2]),
  column('n', 'Number', true),
  column('sd', 'StrictDate', true),
  column('dt', `${P}Timestamp`, true),
  column('dd', 'Date', true),
  column('st', 'StrictTime', true),
  column('v', 'meta::pure::metamodel::variant::Variant', true),
  new SchemaColumn('o', OpaqueType.get('x::Blob'), true),
];

const compare = (
  columnName: string,
  operator: FilterOperator,
  value?: FilterValue,
): ColumnComparisonFilter =>
  new ColumnComparisonFilter(columnName, operator, value);
const and = (...rules: FilterRule[]): CompositeFilter =>
  new CompositeFilter(CompositeFilterOperator.AND, rules);
const or = (...rules: FilterRule[]): CompositeFilter =>
  new CompositeFilter(CompositeFilterOperator.OR, rules);
const not = (rule: FilterRule): NotFilter => new NotFilter(rule);
const string = (value: string): LiteralValue => ({ kind: 'string', value });
const integer = (value: string): LiteralValue => ({ kind: 'integer', value });

/** The predicate the filter emits, as printed IR */
const predicate = (filter: FilterRule): string => {
  const text = printIR(
    new QueryEmitter(
      new Query(
        [
          resolvedTable('relational101', 'T', COLUMNS),
          new Filter('filter101', filter),
        ],
        [new Connection('relational101', 'filter101', 'tds')],
        'filter101',
      ),
    ).emitRelation('filter101'),
  );
  const prefix = `${SOURCE}->filter({row | `;
  expect(text.startsWith(prefix)).toBe(true);
  expect(text.endsWith('})')).toBe(true);
  return text.slice(prefix.length, -2);
};

// a value, and its printed literal, for each column
const VALUES: Record<string, [LiteralValue, string, LiteralValue, string]> = {
  b: [
    { kind: 'boolean', value: true },
    'true',
    { kind: 'boolean', value: false },
    'false',
  ],
  s: [string('x'), "'x'", string("it's"), "'it\\'s'"],
  e: [
    { kind: 'enum', value: 'EMEA' },
    'a::Region.EMEA',
    { kind: 'enum', value: 'APAC' },
    'a::Region.APAC',
  ],
  i: [integer('5'), '5', integer('-32768'), '-32768'],
  f: [
    { kind: 'float', value: '1000000' },
    '1000000.0',
    { kind: 'float', value: '32.38' },
    '32.38',
  ],
  d: [
    { kind: 'decimal', value: '1.5' },
    '1.5D',
    { kind: 'decimal', value: '1' },
    '1D',
  ],
  n: [
    { kind: 'decimal', value: '2' },
    '2D',
    { kind: 'decimal', value: '0.25' },
    '0.25D',
  ],
  sd: [
    { kind: 'strictDate', value: '1997-01-01' },
    '%1997-01-01',
    { kind: 'strictDate', value: '2024-02-29' },
    '%2024-02-29',
  ],
  dt: [
    { kind: 'dateTime', value: '2024-01-02T12:00:00' },
    '%2024-01-02T12:00:00',
    { kind: 'dateTime', value: '2024-01-02T12:00:00.5' },
    '%2024-01-02T12:00:00.5',
  ],
  dd: [
    { kind: 'strictDate', value: '1997-01-01' },
    '%1997-01-01',
    { kind: 'dateTime', value: '1997-01-01T10:00:00' },
    '%1997-01-01T10:00:00',
  ],
};

// how each operator reads, with C for the column, V for a value and L for a list
const TEMPLATES: Record<FilterOperator, string> = {
  [O.EQUAL]: '$row.C == V',
  [O.NOT_EQUAL]: '!($row.C == V)',
  [O.GREATER_THAN]: '$row.C > V',
  [O.GREATER_THAN_OR_EQUAL]: '$row.C >= V',
  [O.LESS_THAN]: '$row.C < V',
  [O.LESS_THAN_OR_EQUAL]: '$row.C <= V',
  [O.STARTS_WITH]: '$row.C->startsWith(V)',
  [O.DOES_NOT_START_WITH]: '!($row.C->startsWith(V))',
  [O.ENDS_WITH]: '$row.C->endsWith(V)',
  [O.DOES_NOT_END_WITH]: '!($row.C->endsWith(V))',
  [O.CONTAINS]: '$row.C->contains(V)',
  [O.DOES_NOT_CONTAIN]: '!($row.C->contains(V))',
  [O.IN]: '$row.C->in(L)',
  [O.NOT_IN]: '!($row.C->in(L))',
  [O.IS_EMPTY]: '$row.C->isEmpty()',
  [O.IS_NOT_EMPTY]: '!($row.C->isEmpty())',
};

describe(unitTest('Filter emission'), () => {
  const cases = COLUMNS.flatMap((schemaColumn) =>
    getAvailableOperators(schemaColumn.type).map(
      (operator) => [schemaColumn.name, operator] as [string, FilterOperator],
    ),
  );

  test('Covers every operator of every family', () => {
    // Boolean 4, String 12, enumeration 6, seven ordered families 10 each,
    // StrictTime, Variant and unknown 2 each
    expect(cases).toHaveLength(4 + 12 + 6 + 7 * 10 + 3 * 2);
  });

  test.each(cases)('Emits %s with %s', (columnName, operator) => {
    const values = VALUES[columnName];
    const [value, printed, other, otherPrinted] = values ?? [];
    const filterValue =
      operator === O.IN || operator === O.NOT_IN
        ? [value, other].filter((v): v is LiteralValue => v !== undefined)
        : value;
    expect(predicate(compare(columnName, operator, filterValue))).toBe(
      TEMPLATES[operator]
        .replace('C', columnName)
        .replace('V', printed ?? '')
        .replace('L', `[${printed}, ${otherPrinted}]`),
    );
  });

  test('Ignores a value on IsEmpty and IsNotEmpty', () => {
    expect(predicate(compare('s', O.IS_EMPTY, string('stray')))).toBe(
      '$row.s->isEmpty()',
    );
    expect(predicate(compare('i', O.IS_NOT_EMPTY, [integer('1')]))).toBe(
      '!($row.i->isEmpty())',
    );
  });

  test('Emits a list of one value as a list', () => {
    expect(predicate(compare('i', O.IN, [integer('1')]))).toBe(
      '$row.i->in([1])',
    );
  });

  test('Folds groups to the left; a group of one rule is that rule', () => {
    const a = compare('s', O.EQUAL, string('x'));
    const b = compare('i', O.GREATER_THAN, integer('5'));
    const c = compare('f', O.IS_EMPTY);
    expect(predicate(and(a, b, c))).toBe(
      "(($row.s == 'x') && ($row.i > 5)) && $row.f->isEmpty()",
    );
    expect(predicate(or(a, b))).toBe("($row.s == 'x') || ($row.i > 5)");
    expect(predicate(and(a))).toBe("$row.s == 'x'");
    expect(predicate(and(or(a)))).toBe("$row.s == 'x'");
    expect(predicate(or(a, and(b, c)))).toBe(
      "($row.s == 'x') || (($row.i > 5) && $row.f->isEmpty())",
    );
  });

  test('Pushes a Not over a group down to the leaves (De Morgan)', () => {
    const a = compare('s', O.EQUAL, string('x'));
    const b = compare('i', O.GREATER_THAN, integer('5'));
    const c = compare('f', O.IS_EMPTY);
    expect(predicate(not(and(a, b)))).toBe(
      "(!($row.s == 'x')) || (!($row.i > 5))",
    );
    expect(predicate(not(or(a, b)))).toBe(
      "(!($row.s == 'x')) && (!($row.i > 5))",
    );
    expect(predicate(not(and(a, or(b, c))))).toBe(
      "(!($row.s == 'x')) || ((!($row.i > 5)) && (!($row.f->isEmpty())))",
    );
    expect(predicate(and(a, not(or(b, c))))).toBe(
      "($row.s == 'x') && ((!($row.i > 5)) && (!($row.f->isEmpty())))",
    );
    // a group of one rule under a Not
    expect(predicate(not(and(b)))).toBe('!($row.i > 5)');
  });

  test('Cancels a double negation', () => {
    const a = compare('s', O.EQUAL, string('x'));
    const b = compare('i', O.GREATER_THAN, integer('5'));
    expect(predicate(not(not(a)))).toBe("$row.s == 'x'");
    expect(predicate(not(not(b)))).toBe('$row.i > 5');
    expect(predicate(not(not(and(a, b))))).toBe(
      "($row.s == 'x') && ($row.i > 5)",
    );
    expect(predicate(not(not(not(or(a, b)))))).toBe(
      "(!($row.s == 'x')) && (!($row.i > 5))",
    );
  });

  test('Negates a comparison through its operator, or keeps a not', () => {
    const pairs: [FilterOperator, FilterValue | undefined, string][] = [
      [O.EQUAL, string('x'), "!($row.s == 'x')"],
      [O.NOT_EQUAL, string('x'), "$row.s == 'x'"],
      [O.STARTS_WITH, string('x'), "!($row.s->startsWith('x'))"],
      [O.DOES_NOT_START_WITH, string('x'), "$row.s->startsWith('x')"],
      [O.ENDS_WITH, string('x'), "!($row.s->endsWith('x'))"],
      [O.DOES_NOT_END_WITH, string('x'), "$row.s->endsWith('x')"],
      [O.CONTAINS, string('x'), "!($row.s->contains('x'))"],
      [O.DOES_NOT_CONTAIN, string('x'), "$row.s->contains('x')"],
      [O.IN, [string('x')], "!($row.s->in(['x']))"],
      [O.NOT_IN, [string('x')], "$row.s->in(['x'])"],
      [O.IS_EMPTY, undefined, '!($row.s->isEmpty())'],
      [O.IS_NOT_EMPTY, undefined, '$row.s->isEmpty()'],
    ];
    pairs.forEach(([operator, value, expected]) =>
      expect(predicate(not(compare('s', operator, value)))).toBe(expected),
    );
    // never rewritten to the opposite comparison, which would drop NULL rows
    expect(predicate(not(compare('i', O.GREATER_THAN, integer('5'))))).toBe(
      '!($row.i > 5)',
    );
    expect(
      predicate(not(compare('i', O.GREATER_THAN_OR_EQUAL, integer('5')))),
    ).toBe('!($row.i >= 5)');
    expect(predicate(not(compare('i', O.LESS_THAN, integer('5'))))).toBe(
      '!($row.i < 5)',
    );
    expect(
      predicate(not(compare('i', O.LESS_THAN_OR_EQUAL, integer('5')))),
    ).toBe('!($row.i <= 5)');
  });

  test('Emits Boolean comparisons in full', () => {
    expect(
      predicate(compare('b', O.EQUAL, { kind: 'boolean', value: true })),
    ).toBe('$row.b == true');
    expect(
      predicate(compare('b', O.NOT_EQUAL, { kind: 'boolean', value: true })),
    ).toBe('!($row.b == true)');
  });

  test('Keeps values as they are', () => {
    expect(predicate(compare('s', O.CONTAINS, string(`50%_O'Brien`)))).toBe(
      "$row.s->contains('50%_O\\'Brien')",
    );
    expect(predicate(compare('s', O.EQUAL, string(' padded ')))).toBe(
      "$row.s == ' padded '",
    );
    expect(predicate(compare('s', O.EQUAL, string('')))).toBe("$row.s == ''");
  });

  test('Refuses what a valid filter never has', () => {
    const schema = new Schema(COLUMNS);
    const input = storeAccessor(['test::Northwind', 'NORTHWIND', 'T']);
    const emit = (filter: FilterRule | undefined): unknown =>
      emitFilter(new Filter('filter101', filter), [input], {
        inputSchemas: [schema],
        schema,
      });
    expect(() => emit(undefined)).toThrow(
      'Filter "filter101" needs an input and a filter to be emitted',
    );
    expect(() =>
      emit(compare('i', O.EQUAL, { kind: 'invalid', text: 'ten' })),
    ).toThrow('Filter "filter101" has a value that is not a SmallInt');
    expect(() => emit(compare('i', O.EQUAL, string('5')))).toThrow(
      'Filter "filter101" has a value that is not a SmallInt',
    );
    expect(() => emit(compare('nope', O.IS_EMPTY))).toThrow(
      'Filter "filter101" refers to a missing column "nope"',
    );
    expect(() => emit(and())).toThrow('Filter "filter101" has an empty group');
    expect(() => emit(compare('i', O.EQUAL))).toThrow(
      'Filter "filter101" has a comparison without a value',
    );
    expect(() => emit(compare('i', O.IN, integer('1')))).toThrow(
      'Filter "filter101" has an In without a list',
    );
  });
});
