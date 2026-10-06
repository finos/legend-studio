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
import { unitTest } from '../../../__test-utils__/CubeTestUtils.js';
import {
  column,
  enumColumn,
  resolvedTable,
  TestUnaryNode,
} from '../../../__test-utils__/CubeTestNodes.js';
import { changeFilterColumn } from '../../../filter/FilterBuilder.js';
import { FilterOperator } from '../../../filter/FilterOperator.js';
import {
  ColumnComparisonFilter,
  CompositeFilter,
  CompositeFilterOperator,
  type FilterRule,
  type FilterValue,
} from '../../../filter/FilterTree.js';
import { Connection } from '../../../graph/Connection.js';
import { Query } from '../../../graph/Query.js';
import { buildSchemasAndValidity } from '../../../inference/SchemaInference.js';
import { ERR_INCOMPLETE, ERR_SCHEMAS } from '../../../messages/CubeMessages.js';
import { Schema, type SchemaColumn } from '../../../schema/Schema.js';
import { Filter } from '../Filter.js';
import { Join, JoinType } from '../Join.js';

const PRECISE = 'meta::pure::precisePrimitives::';
const O = FilterOperator;
const REGION = 'trading::Region';

const compare = (
  columnName: string,
  operator: FilterOperator,
  value?: FilterValue,
): ColumnComparisonFilter =>
  new ColumnComparisonFilter(columnName, operator, value);
const and = (...rules: FilterRule[]): CompositeFilter =>
  new CompositeFilter(CompositeFilterOperator.AND, rules);

const edge = (s: string, t: string, port: string): Connection =>
  new Connection(s, t, port);

// Appendix C.1, retyped with the precise types an engine reports
const TRADES: SchemaColumn[] = [
  column('tradeId', `${PRECISE}Int`),
  column('bookId', `${PRECISE}Int`),
  column('notional', `${PRECISE}Double`),
  column('tradeDate', 'StrictDate'),
];
const BOOKS: SchemaColumn[] = [
  column('bookId', `${PRECISE}Int`),
  column('bookName', `${PRECISE}Varchar`, false, [40]),
  enumColumn('region', REGION, ['EMEA', 'APAC', 'AMER']),
];

const LARGE_TRADES = compare('notional', O.GREATER_THAN, {
  kind: 'float',
  value: '1000000',
});

/** relational101 ⋈ relational102 → join101 → filter101 → next101 (Appendix C, up to the filter) */
const appendixC = (filter: FilterRule | undefined = LARGE_TRADES): Query =>
  new Query(
    [
      resolvedTable('relational101', 'TRADES', TRADES),
      resolvedTable('relational102', 'BOOKS', BOOKS),
      new Join('join101', {
        leftColumns: ['bookId'],
        rightColumns: ['bookId'],
        joinType: JoinType.INNER,
      }),
      new Filter('filter101', filter),
      new TestUnaryNode('next101'),
    ],
    [
      edge('relational101', 'join101', 'leftTds'),
      edge('relational102', 'join101', 'rightTds'),
      edge('join101', 'filter101', 'tds'),
      edge('filter101', 'next101', 'tds'),
    ],
    'next101',
  );

const SCHEMA = new Schema([...TRADES]);

const errorsOf = (node: Filter, schema = SCHEMA): string[] => {
  const errors: string[] = [];
  const valid = node.validate([schema], errors);
  expect(valid).toBe(errors.length === 0);
  expect(node.validate([schema])).toBe(valid);
  return errors;
};

describe(unitTest('Filter node'), () => {
  test('Is a unary node of type "filter" with no filter yet', () => {
    const node = new Filter('filter101');
    expect(node.type).toBe('filter');
    expect(Filter.TYPE).toBe('filter');
    expect(node.ports).toEqual(['tds']);
    expect(node.portLabels).toEqual([]);
    expect(node.acceptsNewInputs).toBe(true);
    expect(node.filter).toBeUndefined();
  });

  test('Needs a filter', () => {
    expect(errorsOf(new Filter('filter101'))).toEqual([
      'Filter cannot be empty.',
    ]);
    expect(new Filter('filter101').schematize([SCHEMA])).toBeUndefined();
  });

  test('Checks its filter against the input schema', () => {
    expect(errorsOf(new Filter('filter101', LARGE_TRADES))).toEqual([]);
    expect(
      errorsOf(
        new Filter(
          'filter101',
          and(
            compare('notional', O.GREATER_THAN, {
              kind: 'invalid',
              text: 'big',
            }),
            compare('nope', O.IS_EMPTY),
          ),
        ),
      ),
    ).toEqual([
      'Filter value "big" is not a valid Double.',
      'Filter column "nope" is not present in the input schema.',
    ]);
    expect(errorsOf(new Filter('filter101', and()))).toEqual([
      'Composite filter cannot be empty.',
    ]);
  });

  test('Passes its input schema through when valid, else has none', () => {
    const node = new Filter('filter101', LARGE_TRADES);
    expect(node.schematize([SCHEMA])).toBe(SCHEMA);
    expect(
      node.withFilter(compare('notional', O.GREATER_THAN)).schematize([SCHEMA]),
    ).toBeUndefined();
  });

  test('Checks that it gets one input schema, with or without a filter', () => {
    [new Filter('filter101'), new Filter('filter101', LARGE_TRADES)].forEach(
      (node) => {
        expect(() => node.validate([])).toThrow(/input schema/u);
        expect(() => node.schematize([SCHEMA, SCHEMA])).toThrow(
          /input schema/u,
        );
        expect(() => node.validate([{}] as unknown as Schema[])).toThrow(
          /is not a schema/u,
        );
        expect(() => node.schematize([null] as unknown as Schema[])).toThrow(
          /is not a schema/u,
        );
      },
    );
  });

  test('Adds its messages after those already given', () => {
    const errors = ['Rule.'];
    expect(
      new Filter('filter101', compare('nope', O.IS_EMPTY)).validate(
        [SCHEMA],
        errors,
      ),
    ).toBe(false);
    expect(errors).toEqual([
      'Rule.',
      'Filter column "nope" is not present in the input schema.',
    ]);
    const kept = ['Rule.'];
    expect(new Filter('filter101', LARGE_TRADES).validate([SCHEMA], kept)).toBe(
      true,
    );
    expect(kept).toEqual(['Rule.']);
  });

  test('Edits into a new node with the same id', () => {
    const node = new Filter('filter101');
    const edited = node.withFilter(LARGE_TRADES);
    expect(edited.id).toBe(node.id);
    expect(edited.key).not.toBe(node.key);
    expect(edited.filter).toBe(LARGE_TRADES);
    expect(node.filter).toBeUndefined();
    expect(edited.withFilter(undefined).filter).toBeUndefined();
  });

  test('Refuses a filter that is not a filter rule', () => {
    expect(
      () => new Filter('filter101', 'x' as unknown as FilterRule),
    ).toThrow();
    expect(
      () => new Filter('filter101', {} as unknown as FilterRule),
    ).toThrow();
    expect(
      () => new Filter('filter101', null as unknown as FilterRule),
    ).toThrow("A filter node's filter must be a filter rule");
    // a node is not a rule, nor is anything that only looks a bit like one
    [
      new Join('join101'),
      new Filter('filter102', LARGE_TRADES),
      { validate: () => true },
      { toRedactedString: () => '' },
      { kind: 'comparison', validate: () => true },
    ].forEach((notARule) =>
      expect(
        () => new Filter('filter101', notARule as unknown as FilterRule),
      ).toThrow("A filter node's filter must be a filter rule"),
    );
  });

  test('Describes itself with values on the canvas, redacted for logs', () => {
    const node = new Filter(
      'filter101',
      and(
        LARGE_TRADES,
        compare('tradeDate', O.LESS_THAN, {
          kind: 'strictDate',
          value: '2024-02-29',
        }),
      ),
    );
    expect(node.describe()).toBe(
      'Filter by notional is greater than 1000000 and tradeDate is less than 2024-02-29',
    );
    expect(node.describeRedacted()).toBe(
      'Filter by notional is greater than ? and tradeDate is less than ?',
    );
    expect(new Filter('filter101').describe()).toBe('Filter by (blank)');
    expect(new Filter('filter101').describeRedacted()).toBe(
      'Filter by (blank)',
    );
  });
});

describe(unitTest('Filter in a query'), () => {
  test('Keeps the join schema (spec C.3)', () => {
    const { schemas, validity } = buildSchemasAndValidity(appendixC());
    expect(validity.get('filter101')).toEqual([]);
    expect(schemas.get('filter101')).toBe(schemas.get('join101'));
    expect(schemas.get('filter101')?.names()).toEqual([
      'bookId',
      'tradeId',
      'notional',
      'tradeDate',
      'bookName',
      'region',
    ]);
    expect(appendixC().validate(validity)).toBe(true);
  });

  test('Reports a missing join input once, on the join (spec C.5(a))', () => {
    const query = appendixC().remove('relational102');
    const { schemas, validity } = buildSchemasAndValidity(query);
    expect(validity.get('join101')).toEqual([
      'This node requires more inputs. Please drag and drop another input to associate.',
    ]);
    expect(validity.get('join101')).toEqual([ERR_INCOMPLETE]);
    expect(validity.get('filter101')).toEqual([
      'This node depends on some invalid inputs. Please correct these first.',
    ]);
    expect(validity.get('next101')).toEqual([ERR_SCHEMAS]);
    expect(schemas.get('join101')).toBeUndefined();
    expect(schemas.get('filter101')).toBeUndefined();
    expect(query.validate(validity)).toBe(false);
  });

  test('Reports an invalid filter on the filter only', () => {
    const query = appendixC(
      compare('region', O.EQUAL, { kind: 'enum', value: 'LATAM' }),
    );
    const { schemas, validity } = buildSchemasAndValidity(query);
    expect(validity.get('join101')).toEqual([]);
    expect(validity.get('filter101')).toEqual([
      'Filter value "LATAM" is not a valid Region.',
    ]);
    expect(schemas.get('filter101')).toBeUndefined();
    expect(validity.get('next101')).toEqual([ERR_SCHEMAS]);
  });

  test('Flags a value of another kind, e.g. after a schema change', () => {
    // changing the column in the editor clears a value of another family
    const { schemas } = buildSchemasAndValidity(appendixC());
    expect(
      changeFilterColumn(
        LARGE_TRADES,
        'tradeId',
        schemas.get('join101') as Schema,
      ).value,
    ).toBeUndefined();
    // but a stale value can still arrive, e.g. when the source's column type
    // changed since the filter was saved
    const stale = LARGE_TRADES.withColumn('tradeId');
    expect(
      buildSchemasAndValidity(appendixC(stale)).validity.get('filter101'),
    ).toEqual(['Filter value "1000000" is not a valid Int.']);
  });

  test('Feeds a join', () => {
    const query = new Query(
      [
        resolvedTable('relational101', 'TRADES', TRADES),
        new Filter('filter101', LARGE_TRADES),
        resolvedTable('relational102', 'BOOKS', BOOKS),
        new Join('join101', {
          leftColumns: ['bookId'],
          rightColumns: ['bookId'],
        }),
      ],
      [
        edge('relational101', 'filter101', 'tds'),
        edge('filter101', 'join101', 'leftTds'),
        edge('relational102', 'join101', 'rightTds'),
      ],
      'join101',
    );
    const { schemas, validity } = buildSchemasAndValidity(query);
    expect(validity.get('filter101')).toEqual([]);
    expect(validity.get('join101')).toEqual([]);
    expect(schemas.get('filter101')?.names()).toEqual(
      TRADES.map((c) => c.name),
    );
    // filters number their ids on their own
    expect(query.generateId('filter')).toBe('filter102');
    expect(appendixC().generateId('filter')).toBe('filter102');
    expect(new Query().generateId('filter')).toBe('filter101');
  });

  test('Validates the slice ALLTYPES rules', () => {
    const allTypes = new Schema([
      column('BI', `${PRECISE}BigInt`, true),
      column('DEC', `${PRECISE}Numeric`, true, [10, 2]),
      column('TS', `${PRECISE}Timestamp`, true),
      column('B', 'Boolean', true),
      column('D', `${PRECISE}Double`, true),
    ]);
    const node = new Filter(
      'filter101',
      and(
        compare('BI', O.GREATER_THAN, {
          kind: 'integer',
          value: '15000000000',
        }),
        compare('DEC', O.GREATER_THAN, { kind: 'decimal', value: '1.5' }),
        compare('TS', O.GREATER_THAN_OR_EQUAL, {
          kind: 'dateTime',
          value: '2024-01-02T12:00:00',
        }),
        compare('B', O.EQUAL, { kind: 'boolean', value: true }),
        compare('B', O.NOT_EQUAL, { kind: 'boolean', value: true }),
        compare('D', O.EQUAL, { kind: 'float', value: '2.5' }),
      ),
    );
    expect(errorsOf(node, allTypes)).toEqual([]);
    expect(
      errorsOf(
        node.withFilter(
          compare('BI', O.EQUAL, { kind: 'invalid', text: 'abc' }),
        ),
        allTypes,
      ),
    ).toEqual(['Filter value "abc" is not a valid BigInt.']);
  });

  test('Validates the Northwind filter of the slice', () => {
    const orders = resolvedTable('relational101', 'ORDERS', [
      column('ORDER_ID', `${PRECISE}SmallInt`),
      column('CUSTOMER_ID', `${PRECISE}Varchar`, true, [5]),
      column('EMPLOYEE_ID', `${PRECISE}SmallInt`, true),
      column('ORDER_DATE', 'StrictDate', true),
      column('SHIP_COUNTRY', `${PRECISE}Varchar`, true, [15]),
    ]);
    const customers = resolvedTable('relational102', 'CUSTOMERS', [
      column('CUSTOMER_ID', `${PRECISE}Varchar`, false, [5]),
      column('COMPANY_NAME', `${PRECISE}Varchar`, false, [40]),
    ]);
    const filter = and(
      compare('SHIP_COUNTRY', O.EQUAL, { kind: 'string', value: 'France' }),
      compare('ORDER_DATE', O.GREATER_THAN_OR_EQUAL, {
        kind: 'strictDate',
        value: '1997-01-01',
      }),
      compare('EMPLOYEE_ID', O.IN, [
        { kind: 'integer', value: '1' },
        { kind: 'integer', value: '4' },
      ]),
    );
    const query = new Query(
      [
        orders,
        customers,
        new Join('join101', {
          leftColumns: ['CUSTOMER_ID'],
          rightColumns: ['CUSTOMER_ID'],
          joinType: JoinType.INNER,
        }),
        new Filter('filter101', filter),
      ],
      [
        edge('relational101', 'join101', 'leftTds'),
        edge('relational102', 'join101', 'rightTds'),
        edge('join101', 'filter101', 'tds'),
      ],
      'filter101',
    );
    const { validity } = buildSchemasAndValidity(query);
    expect(validity.get('filter101')).toEqual([]);
    expect(query.getNode('filter101')?.describe()).toBe(
      'Filter by SHIP_COUNTRY is "France" and ORDER_DATE is greater than or equal 1997-01-01 and EMPLOYEE_ID is in list of (1, 4)',
    );
  });
});
