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
  listOrigins,
  stripOrigins,
} from '../../__test-utils__/CubeIRTestUtils.js';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import {
  column,
  enumColumn,
  resolvedTable,
} from '../../__test-utils__/CubeTestNodes.js';
import {
  FilterOperator,
  getAvailableOperators,
  isOperatorAvailable,
} from '../../filter/FilterOperator.js';
import {
  ColumnComparisonFilter,
  CompositeFilter,
  CompositeFilterOperator,
  type FilterRule,
  type FilterValue,
  isFilterValueList,
  NotFilter,
} from '../../filter/FilterTree.js';
import { Connection } from '../../graph/Connection.js';
import { Query } from '../../graph/Query.js';
import { Filter } from '../../nodes/transforms/Filter.js';
import { Join, JoinType } from '../../nodes/transforms/Join.js';
import { Schema, SchemaColumn } from '../../schema/Schema.js';
import { OpaqueType } from '../../types/CubeType.js';
import type { LiteralValue } from '../../values/LiteralValue.js';
import { type IR, storeAccessor } from '../CubeIR.js';
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

// columns that are NOT NULL, where a negation needs no `isEmpty`
const REQUIRED_COLUMNS: SchemaColumn[] = [
  column('s', `${P}Varchar`, false, [10]),
  column('i', `${P}SmallInt`, false),
  column('f', `${P}Double`, false),
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

/** The relation the filter emits, over a table of the given columns */
const emitIR = (filter: FilterRule, columns: SchemaColumn[] = COLUMNS): IR =>
  new QueryEmitter(
    new Query(
      [
        resolvedTable('relational101', 'T', columns),
        new Filter('filter101', filter),
      ],
      [new Connection('relational101', 'filter101', 'tds')],
      'filter101',
    ),
  ).emitRelation('filter101');

/** The predicate the filter emits, as printed IR */
const predicate = (
  filter: FilterRule,
  columns: SchemaColumn[] = COLUMNS,
): string => {
  const text = printIR(emitIR(filter, columns));
  const prefix = `${SOURCE}->filter({row | `;
  expect(text.startsWith(prefix)).toBe(true);
  expect(text.endsWith('})')).toBe(true);
  return text.slice(prefix.length, -2);
};

/** The predicate the filter emits on NOT NULL columns */
const required = (filter: FilterRule): string =>
  predicate(filter, REQUIRED_COLUMNS);

/** Every node of the IR, in tree order */
const allNodes = (ir: IR): IR[] => {
  switch (ir.k) {
    case 'func':
      return [ir, ...ir.params.flatMap(allNodes)];
    case 'property':
      return [ir, ...allNodes(ir.receiver)];
    case 'lambda':
      return [ir, ...ir.body.flatMap(allNodes)];
    case 'collection':
      return [ir, ...ir.values.flatMap(allNodes)];
    default:
      return [ir];
  }
};

type ValueNode = Extract<IR, { k: 'literal' | 'enumValue' }>;

/** The literals and enumeration values of the IR, in tree order */
const valueNodes = (ir: IR): ValueNode[] =>
  allNodes(ir).filter(
    (node): node is ValueNode => node.k === 'literal' || node.k === 'enumValue',
  );

/** The values of the IR's literals, in tree order */
const literalValues = (ir: IR): LiteralValue[] =>
  allNodes(ir).flatMap((node) => (node.k === 'literal' ? [node.value] : []));

/** The names of the IR's column accesses, in tree order */
const propertyNames = (ir: IR): string[] =>
  allNodes(ir).flatMap((node) => (node.k === 'property' ? [node.name] : []));

/** The items of a filter rule's value list */
const listOf = (rule: ColumnComparisonFilter): readonly unknown[] =>
  isFilterValueList(rule.value) ? rule.value : [];

const VALUE_ORIGIN = { nodeId: 'filter101', role: 'value' };

/** The predicate of the filter a relation ends with, as printed IR */
const printPredicate = (ir: IR): string => {
  const fn = ir.k === 'func' && ir.name === 'filter' ? ir.params[1] : undefined;
  const body = fn?.k === 'lambda' ? fn.body : [];
  expect(body).toHaveLength(1);
  return body.map((node) => printIR(node)).join('');
};

const varchar = (name: string, nullable = false): SchemaColumn =>
  column(name, `${P}Varchar`, nullable, [10]);

// two tables whose columns are all NOT NULL; they share only the key CODE
const LEFT_COLUMNS: SchemaColumn[] = [
  varchar('CODE'),
  varchar('NAME'),
  column('QTY', `${P}SmallInt`),
];
const RIGHT_COLUMNS: SchemaColumn[] = [
  varchar('CODE'),
  varchar('CITY'),
  column('SCORE', `${P}SmallInt`),
];

/** The predicate the filter emits after `L ⋈ R` on CODE, as printed IR */
const afterJoin = (
  joinType: JoinType,
  filter: FilterRule,
  rightColumns: SchemaColumn[] = RIGHT_COLUMNS,
): string =>
  printPredicate(
    new QueryEmitter(
      new Query(
        [
          resolvedTable('relational101', 'L', LEFT_COLUMNS),
          resolvedTable('relational102', 'R', rightColumns),
          new Join('join101', {
            leftColumns: ['CODE'],
            rightColumns: ['CODE'],
            joinType,
          }),
          new Filter('filter101', filter),
        ],
        [
          new Connection('relational101', 'join101', 'leftTds'),
          new Connection('relational102', 'join101', 'rightTds'),
          new Connection('join101', 'filter101', 'tds'),
        ],
        'filter101',
      ),
    ).emitRelation('filter101'),
  );

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

// how each operator reads on a nullable column, with C for the column, V for
// a value and L for a list; a negation keeps NULL rows with `isEmpty`
const TEMPLATES: Record<FilterOperator, string> = {
  [O.EQUAL]: '$row.C == V',
  [O.NOT_EQUAL]: '$row.C->isEmpty() || (!($row.C == V))',
  [O.GREATER_THAN]: '$row.C > V',
  [O.GREATER_THAN_OR_EQUAL]: '$row.C >= V',
  [O.LESS_THAN]: '$row.C < V',
  [O.LESS_THAN_OR_EQUAL]: '$row.C <= V',
  [O.STARTS_WITH]: '$row.C->startsWith(V)',
  [O.DOES_NOT_START_WITH]: '$row.C->isEmpty() || (!($row.C->startsWith(V)))',
  [O.ENDS_WITH]: '$row.C->endsWith(V)',
  [O.DOES_NOT_END_WITH]: '$row.C->isEmpty() || (!($row.C->endsWith(V)))',
  [O.CONTAINS]: '$row.C->contains(V)',
  [O.DOES_NOT_CONTAIN]: '$row.C->isEmpty() || (!($row.C->contains(V)))',
  [O.IN]: '$row.C->in(L)',
  [O.NOT_IN]: '$row.C->isEmpty() || (!($row.C->in(L)))',
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
        .replaceAll('C', columnName)
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
    expect(required(not(and(a, b)))).toBe(
      "(!($row.s == 'x')) || (!($row.i > 5))",
    );
    expect(required(not(or(a, b)))).toBe(
      "(!($row.s == 'x')) && (!($row.i > 5))",
    );
    expect(required(not(and(a, or(b, c))))).toBe(
      "(!($row.s == 'x')) || ((!($row.i > 5)) && (!($row.f->isEmpty())))",
    );
    expect(required(and(a, not(or(b, c))))).toBe(
      "($row.s == 'x') && ((!($row.i > 5)) && (!($row.f->isEmpty())))",
    );
    // a group of one rule under a Not
    expect(required(not(and(b)))).toBe('!($row.i > 5)');
  });

  test('Cancels a double negation', () => {
    const a = compare('s', O.EQUAL, string('x'));
    const b = compare('i', O.GREATER_THAN, integer('5'));
    expect(required(not(not(a)))).toBe("$row.s == 'x'");
    expect(required(not(not(b)))).toBe('$row.i > 5');
    expect(required(not(not(and(a, b))))).toBe(
      "($row.s == 'x') && ($row.i > 5)",
    );
    expect(required(not(not(not(or(a, b)))))).toBe(
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
      expect(required(not(compare('s', operator, value)))).toBe(expected),
    );
    // never rewritten to the opposite comparison, which would drop NULL rows
    expect(required(not(compare('i', O.GREATER_THAN, integer('5'))))).toBe(
      '!($row.i > 5)',
    );
    expect(
      required(not(compare('i', O.GREATER_THAN_OR_EQUAL, integer('5')))),
    ).toBe('!($row.i >= 5)');
    expect(required(not(compare('i', O.LESS_THAN, integer('5'))))).toBe(
      '!($row.i < 5)',
    );
    expect(
      required(not(compare('i', O.LESS_THAN_OR_EQUAL, integer('5')))),
    ).toBe('!($row.i <= 5)');
  });

  test('Keeps NULL rows in every negation of a nullable column, except IsNotEmpty', () => {
    const a = compare('s', O.EQUAL, string('x'));
    const b = compare('i', O.GREATER_THAN, integer('5'));
    const c = compare('f', O.IS_EMPTY);
    // an operator without a negated one
    expect(predicate(not(b))).toBe('$row.i->isEmpty() || (!($row.i > 5))');
    // a negated operator, through a Not
    expect(predicate(not(compare('s', O.CONTAINS, string('x'))))).toBe(
      "$row.s->isEmpty() || (!($row.s->contains('x')))",
    );
    // De Morgan: each negated leaf keeps its own NULL rows
    expect(predicate(not(and(a, b)))).toBe(
      "($row.s->isEmpty() || (!($row.s == 'x'))) || ($row.i->isEmpty() || (!($row.i > 5)))",
    );
    expect(predicate(not(or(a, c)))).toBe(
      "($row.s->isEmpty() || (!($row.s == 'x'))) && (!($row.f->isEmpty()))",
    );
    // IsNotEmpty drops NULL rows, however it is written
    expect(predicate(compare('s', O.IS_NOT_EMPTY))).toBe(
      '!($row.s->isEmpty())',
    );
    expect(predicate(not(compare('s', O.IS_EMPTY)))).toBe(
      '!($row.s->isEmpty())',
    );
    expect(predicate(not(compare('s', O.IS_NOT_EMPTY)))).toBe(
      '$row.s->isEmpty()',
    );
    // a double negation is positive, so it drops them
    expect(predicate(not(compare('s', O.NOT_EQUAL, string('x'))))).toBe(
      "$row.s == 'x'",
    );
    expect(predicate(not(not(b)))).toBe('$row.i > 5');
    // a NOT NULL column has none to keep
    expect(required(not(b))).toBe('!($row.i > 5)');
    expect(required(compare('s', O.DOES_NOT_CONTAIN, string('x')))).toBe(
      "!($row.s->contains('x'))",
    );
  });

  test('Emits Boolean comparisons in full', () => {
    expect(
      predicate(compare('b', O.EQUAL, { kind: 'boolean', value: true })),
    ).toBe('$row.b == true');
    expect(
      predicate(compare('b', O.NOT_EQUAL, { kind: 'boolean', value: true })),
    ).toBe('$row.b->isEmpty() || (!($row.b == true))');
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
    // a backslash in a LIKE pattern, however the pattern is reached
    const backslash = 'Filter "filter101" has a backslash in a pattern';
    expect(() => emit(compare('s', O.STARTS_WITH, string('CORP\\')))).toThrow(
      backslash,
    );
    expect(() =>
      emit(compare('s', O.DOES_NOT_CONTAIN, string('a\\b'))),
    ).toThrow(backslash);
    expect(() =>
      emit(
        not(
          and(
            compare('s', O.ENDS_WITH, string('\\')),
            compare('b', O.IS_EMPTY),
          ),
        ),
      ),
    ).toThrow(backslash);
  });

  test('Never emits a backslash in a LIKE pattern, and keeps it elsewhere', () => {
    // validation makes the node invalid, so it can't be emitted
    const emitter = (filter: FilterRule): QueryEmitter =>
      new QueryEmitter(
        new Query(
          [
            resolvedTable('relational101', 'T', COLUMNS),
            new Filter('filter101', filter),
          ],
          [new Connection('relational101', 'filter101', 'tds')],
          'filter101',
        ),
      );
    [
      compare('s', O.STARTS_WITH, string('CORP\\')),
      compare('s', O.DOES_NOT_END_WITH, string('a\\b')),
      not(compare('s', O.CONTAINS, string('C:\\data'))),
    ].forEach((filter) => {
      expect(emitter(filter).canEmit('filter101')).toBe(false);
      expect(() => emitter(filter).emitRelation('filter101')).toThrow(
        'cannot contain a backslash',
      );
    });
    // Equal and In compare the value as it is
    expect(predicate(compare('s', O.EQUAL, string('CORP\\BLONP')))).toBe(
      "$row.s == 'CORP\\\\BLONP'",
    );
    expect(predicate(compare('s', O.NOT_IN, [string('a\\b')]))).toBe(
      "$row.s->isEmpty() || (!($row.s->in(['a\\\\b'])))",
    );
  });

  test('Keeps big integers and long decimals digit for digit', () => {
    const numbers = [
      column('big', `${P}BigInt`, true),
      column('num', `${P}Numeric`, true, [38, 20]),
      column('dbl', `${P}Double`, true),
    ];
    const numberCases: [string, LiteralValue, string][] = [
      // 2^53 + 1, which a JavaScript number rounds to 2^53
      ['big', integer('9007199254740993'), '9007199254740993'],
      [
        'num',
        { kind: 'decimal', value: '0.10000000000000000001' },
        '0.10000000000000000001D',
      ],
      [
        'dbl',
        { kind: 'float', value: '1.00000000000000000001' },
        '1.00000000000000000001',
      ],
    ];
    numberCases.forEach(([columnName, value, printed]) => {
      const equal = compare(columnName, O.EQUAL, value);
      const inList = compare(columnName, O.IN, [value]);
      expect(predicate(equal, numbers)).toBe(
        `$row.${columnName} == ${printed}`,
      );
      expect(predicate(inList, numbers)).toBe(
        `$row.${columnName}->in([${printed}])`,
      );
      // the literal is the filter's own value, never read as a number; the
      // filter stores a frozen copy of what it is given, so that is the one
      const [equalValue] = literalValues(emitIR(equal, numbers));
      expect(equalValue).toEqual(value);
      expect(equalValue).toBe(equal.value);
      const listValues = literalValues(emitIR(inList, numbers));
      expect(listValues).toEqual([value]);
      expect(listValues[0]).toBe(listOf(inList)[0]);
    });
  });

  const valueCases = Object.entries(VALUES).flatMap(([columnName, values]) =>
    [O.EQUAL, O.IN]
      .filter((operator) =>
        COLUMNS.some(
          (schemaColumn) =>
            schemaColumn.name === columnName &&
            isOperatorAvailable(operator, schemaColumn.type),
        ),
      )
      .map(
        (operator) =>
          [columnName, operator, values] as [
            string,
            FilterOperator,
            [LiteralValue, string, LiteralValue, string],
          ],
      ),
  );

  test.each(valueCases)(
    'Emits the values of %s with %s as typed IR nodes',
    (columnName, operator, [value, , other]) => {
      const items = operator === O.IN ? [value, other] : [value];
      const rule = compare(
        columnName,
        operator,
        operator === O.IN ? items : value,
      );
      const ir = emitIR(rule);
      // an enumeration value takes its path from the column's type
      expect(valueNodes(ir)).toEqual(
        items.map((item) =>
          item.kind === 'enum'
            ? {
                k: 'enumValue',
                enumPath: 'a::Region',
                value: item.value,
                origin: VALUE_ORIGIN,
              }
            : { k: 'literal', value: item, origin: VALUE_ORIGIN },
        ),
      );
      // the emitter takes the filter's own values, as they are
      const stored = isFilterValueList(rule.value) ? rule.value : [rule.value];
      literalValues(ir).forEach((emitted, index) =>
        expect(emitted).toBe(stored[index]),
      );
    },
  );

  test("Keeps each date literal's kind, which the printed text does not show", () => {
    const strictDate: LiteralValue = {
      kind: 'strictDate',
      value: '1997-01-01',
    };
    const dateTime: LiteralValue = {
      kind: 'dateTime',
      value: '1997-01-01T10:00:00',
    };
    const literalNode = (value: LiteralValue): IR => ({
      k: 'literal',
      value,
      origin: VALUE_ORIGIN,
    });
    const dateCases: [string, LiteralValue][] = [
      ['sd', strictDate],
      ['dt', dateTime],
      // the abstract Date takes either kind
      ['dd', strictDate],
      ['dd', dateTime],
    ];
    dateCases.forEach(([columnName, value]) => {
      const equal = compare(columnName, O.EQUAL, value);
      const inList = compare(columnName, O.IN, [value]);
      expect(valueNodes(emitIR(equal))).toEqual([literalNode(value)]);
      expect(literalValues(emitIR(equal))[0]).toBe(equal.value);
      expect(valueNodes(emitIR(inList))).toEqual([literalNode(value)]);
      expect(literalValues(emitIR(inList))[0]).toBe(listOf(inList)[0]);
    });
    // a list on a Date column may mix the two
    const mixed = compare('dd', O.IN, [strictDate, dateTime]);
    expect(valueNodes(emitIR(mixed))).toEqual([
      literalNode(strictDate),
      literalNode(dateTime),
    ]);
    expect(predicate(mixed)).toBe(
      '$row.dd->in([%1997-01-01, %1997-01-01T10:00:00])',
    );
    // an enumeration value is not a literal
    expect(
      valueNodes(
        emitIR(compare('e', O.EQUAL, { kind: 'enum', value: 'EMEA' })),
      ),
    ).toEqual([
      {
        k: 'enumValue',
        enumPath: 'a::Region',
        value: 'EMEA',
        origin: { nodeId: 'filter101', role: 'value' },
      },
    ]);
  });

  test('Quotes column names that are not identifiers, and keeps them as they are in the IR', () => {
    const columns = [
      column('c.d', `${P}SmallInt`),
      column('a b', `${P}Varchar`, true, [10]),
    ];
    const dotted = compare('c.d', O.EQUAL, integer('3'));
    expect(predicate(dotted, columns)).toBe("$row.'c.d' == 3");
    expect(propertyNames(emitIR(dotted, columns))).toEqual(['c.d']);
    const spaced = compare('a b', O.NOT_EQUAL, string('x'));
    expect(predicate(spaced, columns)).toBe(
      "$row.'a b'->isEmpty() || (!($row.'a b' == 'x'))",
    );
    expect(propertyNames(emitIR(spaced, columns))).toEqual(['a b', 'a b']);
  });

  test('Marks every part of the filter with the part it is', () => {
    const ir = emitIR(
      and(
        // a negative operator on a nullable column, so with its NULL guard
        compare('s', O.NOT_EQUAL, string('x')),
        // a Not over an operator without a negated one
        not(compare('i', O.GREATER_THAN, integer('5'))),
        compare('f', O.IS_EMPTY),
        compare('i', O.IN, [integer('1'), integer('2')]),
        or(
          compare('e', O.IN, [
            { kind: 'enum', value: 'EMEA' },
            { kind: 'enum', value: 'APAC' },
          ]),
          compare('b', O.EQUAL, { kind: 'boolean', value: true }),
        ),
      ),
    );
    expect(listOrigins(ir)).toEqual([
      'filter@filter101:filter',
      `${SOURCE}@relational101:accessor`,
      // the And of five rules, folded left
      'and@filter101:predicate',
      'and@filter101:predicate',
      'and@filter101:predicate',
      'and@filter101:predicate',
      // s NotEqual 'x', guarded
      'or@filter101:predicate',
      'isEmpty@filter101:predicate',
      '.s@filter101:column',
      'not@filter101:predicate',
      'equal@filter101:predicate',
      '.s@filter101:column',
      "'x'@filter101:value",
      // Not(i > 5), guarded
      'or@filter101:predicate',
      'isEmpty@filter101:predicate',
      '.i@filter101:column',
      'not@filter101:predicate',
      'greaterThan@filter101:predicate',
      '.i@filter101:column',
      '5@filter101:value',
      // f IsEmpty
      'isEmpty@filter101:predicate',
      '.f@filter101:column',
      // i In [1, 2]
      'in@filter101:predicate',
      '.i@filter101:column',
      '1@filter101:value',
      '2@filter101:value',
      // (e In [EMEA, APAC]) Or (b == true)
      'or@filter101:predicate',
      'in@filter101:predicate',
      '.e@filter101:column',
      'a::Region.EMEA@filter101:value',
      'a::Region.APAC@filter101:value',
      'equal@filter101:predicate',
      '.b@filter101:column',
      'true@filter101:value',
    ]);
    // origins are not part of the expression
    expect(printIR(stripOrigins(ir))).toBe(printIR(ir));
  });

  test('Keeps NULL rows in negations of the columns an outer join pads with NULL', () => {
    const startsWithW = (columnName: string): ColumnComparisonFilter =>
      compare(columnName, O.DOES_NOT_START_WITH, string('W'));
    // LEFT: the right side's columns are nullable, the left side's are not
    expect(afterJoin(JoinType.LEFT_OUTER, startsWithW('CITY'))).toBe(
      "$row.CITY->isEmpty() || (!($row.CITY->startsWith('W')))",
    );
    expect(afterJoin(JoinType.LEFT_OUTER, startsWithW('NAME'))).toBe(
      "!($row.NAME->startsWith('W'))",
    );
    expect(afterJoin(JoinType.LEFT_OUTER, startsWithW('CODE'))).toBe(
      "!($row.CODE->startsWith('W'))",
    );
    // RIGHT: the left side's columns are nullable; the key is the right one
    expect(
      afterJoin(
        JoinType.RIGHT_OUTER,
        not(compare('QTY', O.GREATER_THAN, integer('5'))),
      ),
    ).toBe('$row.QTY->isEmpty() || (!($row.QTY > 5))');
    expect(
      afterJoin(
        JoinType.RIGHT_OUTER,
        not(compare('SCORE', O.GREATER_THAN, integer('5'))),
      ),
    ).toBe('!($row.SCORE > 5)');
    expect(afterJoin(JoinType.RIGHT_OUTER, startsWithW('CODE'))).toBe(
      "!($row.CODE->startsWith('W'))",
    );
    // FULL: both sides' columns are nullable, so each negated leaf of a De
    // Morgan push-down keeps its own NULL rows
    expect(
      afterJoin(
        JoinType.FULL_OUTER,
        not(
          and(
            compare('NAME', O.EQUAL, string('x')),
            compare('SCORE', O.GREATER_THAN, integer('5')),
          ),
        ),
      ),
    ).toBe(
      "($row.NAME->isEmpty() || (!($row.NAME == 'x'))) || ($row.SCORE->isEmpty() || (!($row.SCORE > 5)))",
    );
    // FULL: the merged key is nullable when either key is
    expect(
      afterJoin(JoinType.FULL_OUTER, startsWithW('CODE'), [
        varchar('CODE', true),
        varchar('CITY'),
        column('SCORE', `${P}SmallInt`),
      ]),
    ).toBe("$row.CODE->isEmpty() || (!($row.CODE->startsWith('W')))");
    // INNER keeps each side's nullability
    expect(afterJoin(JoinType.INNER, startsWithW('CITY'))).toBe(
      "!($row.CITY->startsWith('W'))",
    );
    // IsNotEmpty drops NULL rows, even padded ones
    expect(
      afterJoin(JoinType.LEFT_OUTER, compare('CITY', O.IS_NOT_EMPTY)),
    ).toBe('!($row.CITY->isEmpty())');
    expect(
      afterJoin(JoinType.LEFT_OUTER, not(compare('CITY', O.IS_EMPTY))),
    ).toBe('!($row.CITY->isEmpty())');
  });
});
