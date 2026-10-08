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
import { TEST_DATABASE } from '../../__test-utils__/CubeTestNodes.js';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import {
  FILTER_OPERATOR_DESCRIPTIONS,
  FilterOperator,
} from '../../filter/FilterOperator.js';
import { ColumnComparisonFilter } from '../../filter/FilterTree.js';
import { buildSchemasAndValidity } from '../../inference/SchemaInference.js';
import {
  ERR_SCHEMAS,
  MESSAGE_COMPOSITE_FILTER_EMPTY,
  MESSAGE_DIFFERENT_DATABASES,
  MESSAGE_FILTER_EMPTY,
  MESSAGE_FILTER_OPERATOR_UNSUPPORTED,
  MESSAGE_FILTER_VALUE_INVALID,
  MESSAGE_FILTER_VALUE_OUT_OF_RANGE,
  MESSAGE_JOIN_COLUMN_COUNTS_DIFFER,
  MESSAGE_LEFT_JOIN_COLUMNS_EMPTY,
  MESSAGE_MUST_BE_WHOLE_NUMBER,
  MESSAGE_NOT_IN_INPUT_SCHEMA,
  MESSAGE_SIZE_MUST_BE_POSITIVE_WHOLE_NUMBER,
  MESSAGE_START_ROW_INDEX_MUST_BE_LESS_THAN_STOP,
} from '../../messages/CubeMessages.js';
import { createNodeRegistry } from '../../nodes/NodeRegistry.js';
import { Filter } from '../../nodes/transforms/Filter.js';
import type { JsonObject, JsonValue } from '../../utils/Json.js';
import {
  decodeCubeSpec,
  encodeCubeSpec,
  parseCubeSpec,
  serializeCubeSpec,
} from '../CubeSpecCodec.js';

// PLAN §10.3, "Settled in M1.6": what a well-formed document gets wrong is a
// validation problem, reported by inference, never a decode error, and the
// document re-saves byte for byte (R47, R97, R99, R101, R134)

const PRECISE = 'meta::pure::precisePrimitives::';
const OTHER_DATABASE = 'test::Warehouse';

/** A resolved source with a column of each type the values below are checked against */
const RELATIONAL = {
  kind: 'relational',
  id: 'relational101',
  database: TEST_DATABASE,
  schema: 'NORTHWIND',
  table: 'ORDERS',
  schemaSnapshot: [
    { name: 'QTY', type: { path: 'Integer' }, nullable: false },
    { name: 'SHIP_VIA', type: { path: `${PRECISE}SmallInt` }, nullable: true },
    { name: 'DISCOUNT', type: { path: `${PRECISE}TinyInt` }, nullable: true },
    { name: 'TOTAL', type: { path: `${PRECISE}BigInt` }, nullable: true },
    { name: 'RATIO', type: { path: 'Float' }, nullable: true },
    { name: 'PRICE', type: { path: 'Decimal' }, nullable: true },
    {
      name: 'FREIGHT',
      type: { path: `${PRECISE}Numeric`, params: [10, 2] },
      nullable: true,
    },
    {
      name: 'REGION',
      type: { path: 'test::Region', values: ['EMEA', 'APAC'] },
      nullable: true,
    },
    { name: 'COUNTRY', type: { path: 'String' }, nullable: true },
  ],
};

/** A second resolved source, on this database */
const customers = (database: string): JsonObject => ({
  kind: 'relational',
  id: 'relational102',
  database,
  schema: 'NORTHWIND',
  table: 'CUSTOMERS',
  schemaSnapshot: [
    { name: 'CODE', type: { path: 'String' }, nullable: false },
    { name: 'CITY', type: { path: 'String' }, nullable: true },
  ],
});

/** A saved spec: `relational101` feeding `<kind>101`, which has this size, or a cleared one */
const rowCountSpec = (
  kind: 'limit' | 'drop',
  size: number | undefined,
): JsonObject => ({
  formatVersion: 1,
  query: {
    selected: `${kind}101`,
    nodes: [
      RELATIONAL,
      {
        kind,
        id: `${kind}101`,
        inputs: ['relational101'],
        ...(size === undefined ? {} : { size }),
      },
    ],
  },
});
const limitSpec = (size: number | undefined): JsonObject =>
  rowCountSpec('limit', size);

/** A saved spec: `relational101` feeding `slice101`, which has these bounds, each cleared when undefined */
const sliceSpec = (
  start: number | undefined,
  stop: number | undefined,
): JsonObject => ({
  formatVersion: 1,
  query: {
    selected: 'slice101',
    nodes: [
      RELATIONAL,
      {
        kind: 'slice',
        id: 'slice101',
        inputs: ['relational101'],
        ...(start === undefined ? {} : { start }),
        ...(stop === undefined ? {} : { stop }),
      },
    ],
  },
});

/** The saved JSON of `join101`, joining `relational101` to `relational102` on these keys */
const join = (leftColumns: string[], rightColumns: string[]): JsonObject => ({
  kind: 'join',
  id: 'join101',
  inputs: ['relational101', 'relational102'],
  joinType: 'INNER',
  leftColumns,
  rightColumns,
});

/** A saved spec: the two sources joined on these keys, the second on this database */
const joinSpec = (
  leftColumns: string[],
  rightColumns: string[],
  database = TEST_DATABASE,
): JsonObject => ({
  formatVersion: 1,
  query: {
    selected: 'join101',
    nodes: [RELATIONAL, customers(database), join(leftColumns, rightColumns)],
  },
});

/** A saved spec: `relational101` feeding `filter101`, which has this filter, if any */
const filterSpec = (filter: JsonValue | undefined): JsonObject => ({
  formatVersion: 1,
  query: {
    selected: 'filter101',
    nodes: [
      RELATIONAL,
      {
        kind: 'filter',
        id: 'filter101',
        inputs: ['relational101'],
        ...(filter === undefined ? {} : { filter }),
      },
    ],
  },
});

/** A saved spec: `filter101` compares this column with this value */
const compareSpec = (
  column: string,
  operator: string,
  value: JsonValue,
): JsonObject => filterSpec({ column, operator, value });

/**
 * The errors inference reports for each node of the document the spec holds,
 * which must decode and re-save byte for byte, as JSON and as text
 */
const errorsOf = (json: JsonObject): Record<string, readonly string[]> => {
  const { document } = decodeCubeSpec(json);
  expect(JSON.stringify(encodeCubeSpec(document))).toBe(JSON.stringify(json));
  const text = JSON.stringify(json, undefined, 2);
  expect(serializeCubeSpec(parseCubeSpec(text).document)).toBe(text);
  const { validity } = buildSchemasAndValidity(
    document.query,
    createNodeRegistry().queryRules,
  );
  return Object.fromEntries(validity);
};

/** The value of the comparison `filter101` holds, as decoded */
const decodedValue = (json: JsonObject): unknown => {
  const node = decodeCubeSpec(json).document.query.getNode('filter101');
  expect(node).toBeInstanceOf(Filter);
  const { filter } = node as Filter;
  // read, not degraded to an unsupported rule
  expect(filter).toBeInstanceOf(ColumnComparisonFilter);
  return (filter as ColumnComparisonFilter).value;
};

describe(unitTest('Saved spec validity: sources'), () => {
  test('Reads sources on different databases, and reports only the second', () => {
    // R47: one Database element per query is a validation rule (PLAN §4.4),
    // so a document that mixes them still opens, and an export re-imports
    expect(
      errorsOf({
        formatVersion: 1,
        query: {
          selected: 'relational101',
          nodes: [RELATIONAL, customers(OTHER_DATABASE)],
        },
      }),
    ).toStrictEqual({
      relational101: [],
      relational102: [
        MESSAGE_DIFFERENT_DATABASES(OTHER_DATABASE, TEST_DATABASE),
      ],
    });
  });
});

describe(unitTest('Saved spec validity: values'), () => {
  // R97: a literal not in canonical form, or of another kind than its
  // column's, is neither refused nor canonicalized on decode
  const NON_CANONICAL: [string, string, JsonObject, string][] = [
    [
      'an integer with a leading zero',
      'QTY',
      { kind: 'integer', value: '007' },
      MESSAGE_FILTER_VALUE_INVALID('007', 'Integer'),
    ],
    [
      'an integer with a plus sign',
      'QTY',
      { kind: 'integer', value: '+5' },
      MESSAGE_FILTER_VALUE_INVALID('+5', 'Integer'),
    ],
    [
      'an integer with spaces around it',
      'QTY',
      { kind: 'integer', value: ' 5 ' },
      MESSAGE_FILTER_VALUE_INVALID(' 5 ', 'Integer'),
    ],
    [
      'a float with a plus sign',
      'RATIO',
      { kind: 'float', value: '+1.50' },
      MESSAGE_FILTER_VALUE_INVALID('+1.50', 'Float'),
    ],
    [
      'a decimal with leading zeros',
      'PRICE',
      { kind: 'decimal', value: '007.5' },
      MESSAGE_FILTER_VALUE_INVALID('007.5', 'Decimal'),
    ],
    [
      'an enum value qualified with its enumeration',
      'REGION',
      { kind: 'enum', value: 'Region.EMEA' },
      MESSAGE_FILTER_VALUE_INVALID('Region.EMEA', 'Region'),
    ],
    [
      'a string on an Integer column',
      'QTY',
      { kind: 'string', value: '5' },
      MESSAGE_FILTER_VALUE_INVALID('5', 'Integer'),
    ],
  ];

  test.each(NON_CANONICAL)(
    'Keeps %s as written, and reports it as not valid',
    (_, column, value, message) => {
      const json = compareSpec(column, 'Equal', value);
      expect(decodedValue(json)).toStrictEqual(value);
      expect(errorsOf(json)).toStrictEqual({
        relational101: [],
        filter101: [message],
      });
    },
  );

  // R99: ranges, and what a double can hold, depend on the column type, so
  // validation judges them, not decode
  const RANGES: [string, string, JsonObject, string[]][] = [
    [
      '300 on a TinyInt column',
      'DISCOUNT',
      { kind: 'integer', value: '300' },
      [MESSAGE_FILTER_VALUE_OUT_OF_RANGE('300', 'TinyInt')],
    ],
    [
      'an integer past the Java long range on a BigInt column',
      'TOTAL',
      { kind: 'integer', value: '9223372036854775808' },
      [MESSAGE_FILTER_VALUE_OUT_OF_RANGE('9223372036854775808', 'BigInt')],
    ],
    [
      'a negative integer past the Java long range on an Integer column',
      'QTY',
      { kind: 'integer', value: '-9223372036854775809' },
      [MESSAGE_FILTER_VALUE_OUT_OF_RANGE('-9223372036854775809', 'Integer')],
    ],
    [
      '1e400 on a Float column',
      'RATIO',
      { kind: 'float', value: '1e400' },
      [MESSAGE_FILTER_VALUE_OUT_OF_RANGE('1e400', 'Float')],
    ],
    // a decimal is not a double: it holds 1e400
    [
      '1e400 on a Decimal column',
      'PRICE',
      { kind: 'decimal', value: '1e400' },
      [],
    ],
    // precision and scale are not enforced (PLAN §5.6)
    [
      '1.555 on a Numeric(10,2) column',
      'FREIGHT',
      { kind: 'decimal', value: '1.555' },
      [],
    ],
  ];

  test.each(RANGES)(
    'Keeps %s as written, for validation to judge',
    (_, column, value, messages) => {
      const json = compareSpec(column, 'GreaterThan', value);
      expect(decodedValue(json)).toStrictEqual(value);
      expect(errorsOf(json)).toStrictEqual({
        relational101: [],
        filter101: messages,
      });
    },
  );

  test('Keeps invalid text that its column would now read, without reading it again', () => {
    // R101: re-reading is a step after the host re-resolves sources (M1.8a),
    // so load round-trips exactly; until then the text is still reported
    const value = [
      { kind: 'integer', value: '1' },
      { kind: 'invalid', text: '2' },
    ];
    const json = compareSpec('SHIP_VIA', 'In', value);
    expect(decodedValue(json)).toStrictEqual(value);
    expect(errorsOf(json)).toStrictEqual({
      relational101: [],
      filter101: [MESSAGE_FILTER_VALUE_INVALID('2', 'SmallInt')],
    });
  });

  test("Keeps invalid text that a join's output column would now read, without reading it again", () => {
    // R101: the schema a re-read needs is inferred, here through the join
    const value = { kind: 'invalid', text: '5' };
    const json: JsonObject = {
      formatVersion: 1,
      query: {
        selected: 'filter101',
        nodes: [
          RELATIONAL,
          customers(TEST_DATABASE),
          join(['COUNTRY'], ['CODE']),
          {
            kind: 'filter',
            id: 'filter101',
            inputs: ['join101'],
            filter: { column: 'QTY', operator: 'Equal', value },
          },
        ],
      },
    };
    expect(decodedValue(json)).toStrictEqual(value);
    expect(errorsOf(json)).toStrictEqual({
      relational101: [],
      relational102: [],
      join101: [],
      filter101: [MESSAGE_FILTER_VALUE_INVALID('5', 'Integer')],
    });
  });
});

describe(unitTest('Saved spec validity: connected nodes'), () => {
  // R134: each problem on a connected, resolved input, where inference can
  // judge it; the database rule leaves the second source without a schema
  const CONNECTED: [string, JsonObject, Record<string, string[]>][] = [
    [
      'sources on different databases, joined',
      joinSpec(['COUNTRY'], ['CODE'], OTHER_DATABASE),
      {
        relational101: [],
        relational102: [
          MESSAGE_DIFFERENT_DATABASES(OTHER_DATABASE, TEST_DATABASE),
        ],
        join101: [ERR_SCHEMAS],
      },
    ],
    [
      'empty join keys',
      joinSpec([], []),
      {
        relational101: [],
        relational102: [],
        join101: [MESSAGE_LEFT_JOIN_COLUMNS_EMPTY],
      },
    ],
    [
      "join keys that don't pair up",
      joinSpec(['COUNTRY', 'QTY'], ['CODE']),
      {
        relational101: [],
        relational102: [],
        join101: [MESSAGE_JOIN_COLUMN_COUNTS_DIFFER],
      },
    ],
    [
      'a filter column missing from the input schema',
      compareSpec('SHIPPER', 'Equal', { kind: 'string', value: 'Speedy' }),
      {
        relational101: [],
        filter101: [MESSAGE_NOT_IN_INPUT_SCHEMA('Filter column', 'SHIPPER')],
      },
    ],
    [
      "an operator the column's type doesn't have",
      compareSpec('QTY', 'Contains', { kind: 'string', value: '5' }),
      {
        relational101: [],
        filter101: [
          MESSAGE_FILTER_OPERATOR_UNSUPPORTED(
            FILTER_OPERATOR_DESCRIPTIONS[FilterOperator.CONTAINS],
            'QTY',
            'Integer',
          ),
        ],
      },
    ],
    [
      'an empty group',
      filterSpec({ op: 'and', rules: [] }),
      { relational101: [], filter101: [MESSAGE_COMPOSITE_FILTER_EMPTY] },
    ],
    [
      'an empty filter',
      filterSpec(undefined),
      { relational101: [], filter101: [MESSAGE_FILTER_EMPTY] },
    ],
    [
      'a cleared limit size',
      limitSpec(undefined),
      {
        relational101: [],
        limit101: [MESSAGE_SIZE_MUST_BE_POSITIVE_WHOLE_NUMBER],
      },
    ],
    [
      'a limit of 0 rows',
      limitSpec(0),
      {
        relational101: [],
        limit101: [MESSAGE_SIZE_MUST_BE_POSITIVE_WHOLE_NUMBER],
      },
    ],
    [
      'a negative limit size',
      limitSpec(-1),
      {
        relational101: [],
        limit101: [MESSAGE_SIZE_MUST_BE_POSITIVE_WHOLE_NUMBER],
      },
    ],
    [
      'a fractional limit size',
      limitSpec(1.5),
      {
        relational101: [],
        limit101: [MESSAGE_SIZE_MUST_BE_POSITIVE_WHOLE_NUMBER],
      },
    ],
    ['a valid limit', limitSpec(10), { relational101: [], limit101: [] }],
    [
      'a cleared drop size',
      rowCountSpec('drop', undefined),
      {
        relational101: [],
        drop101: [MESSAGE_SIZE_MUST_BE_POSITIVE_WHOLE_NUMBER],
      },
    ],
    [
      'a drop of 0 rows',
      rowCountSpec('drop', 0),
      {
        relational101: [],
        drop101: [MESSAGE_SIZE_MUST_BE_POSITIVE_WHOLE_NUMBER],
      },
    ],
    [
      'a valid drop',
      rowCountSpec('drop', 10),
      { relational101: [], drop101: [] },
    ],
    [
      'a slice whose start is not before its stop',
      sliceSpec(5, 5),
      {
        relational101: [],
        slice101: [MESSAGE_START_ROW_INDEX_MUST_BE_LESS_THAN_STOP],
      },
    ],
    [
      'a slice with a cleared stop',
      sliceSpec(10, undefined),
      {
        relational101: [],
        slice101: [MESSAGE_MUST_BE_WHOLE_NUMBER('Stop row index')],
      },
    ],
    [
      'a slice with a negative start',
      sliceSpec(-1, 5),
      {
        relational101: [],
        slice101: [MESSAGE_MUST_BE_WHOLE_NUMBER('Start row index')],
      },
    ],
    ['a valid slice', sliceSpec(0, 5), { relational101: [], slice101: [] }],
  ];

  test.each(CONNECTED)(
    'Reads a document with %s, and reports it through inference',
    (_, json, errors) => {
      expect(errorsOf(json)).toStrictEqual(errors);
    },
  );
});
