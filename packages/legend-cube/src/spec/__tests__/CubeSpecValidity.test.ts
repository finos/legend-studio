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
import type { Query } from '../../graph/Query.js';
import { buildSchemasAndValidity } from '../../inference/SchemaInference.js';
import {
  ERR_INCOMPLETE,
  ERR_SCHEMAS,
  MESSAGE_AGGREGATION_FUNCTION_DISALLOWS_COLUMN,
  MESSAGE_AGGREGATION_FUNCTION_EMPTY,
  MESSAGE_AGGREGATION_FUNCTION_INCOMPATIBLE,
  MESSAGE_AGGREGATION_FUNCTION_NEEDS_SORT,
  MESSAGE_AGGREGATION_FUNCTION_UNKNOWN,
  MESSAGE_AGGREGATION_OUTPUT_NAME_EMPTY,
  MESSAGE_AGGREGATION_OUTPUT_NAME_IS_INPUT_COLUMN,
  MESSAGE_ALREADY_IN_INPUT_SCHEMA,
  MESSAGE_ALREADY_IN_OUTPUT_SCHEMA,
  MESSAGE_CANNOT_BE_EMPTY,
  MESSAGE_CANNOT_HAVE_DUPLICATES,
  MESSAGE_COMPOSITE_FILTER_EMPTY,
  MESSAGE_CONCAT_COLUMN_COUNT,
  MESSAGE_CONCAT_COLUMN_NAME,
  MESSAGE_CONCAT_COLUMN_NOT_CONVERTIBLE,
  MESSAGE_CONCAT_COLUMN_ORDER,
  MESSAGE_CONCAT_COLUMN_TYPE,
  MESSAGE_DIFFERENT_DATABASES,
  MESSAGE_DOES_NOT_HAVE_A_NAME,
  MESSAGE_FILTER_EMPTY,
  MESSAGE_FILTER_OPERATOR_UNSUPPORTED,
  MESSAGE_FILTER_VALUE_INVALID,
  MESSAGE_FILTER_VALUE_OUT_OF_RANGE,
  MESSAGE_INPUT_SCHEMAS_DIFFER,
  MESSAGE_JOIN_COLUMN_COUNTS_DIFFER,
  MESSAGE_LEFT_JOIN_COLUMNS_EMPTY,
  MESSAGE_MUST_BE_WHOLE_NUMBER,
  MESSAGE_NEW_COLUMN_NAME_INVALID,
  MESSAGE_NOT_IN_INPUT_SCHEMA,
  MESSAGE_SIZE_MUST_BE_POSITIVE_WHOLE_NUMBER,
  MESSAGE_START_ROW_INDEX_MUST_BE_LESS_THAN_STOP,
} from '../../messages/CubeMessages.js';
import {
  createNodeRegistry,
  type NodeRegistry,
} from '../../nodes/NodeRegistry.js';
import type { ColumnAggregation } from '../../nodes/transforms/Aggregation.js';
import { Concat } from '../../nodes/transforms/Concat.js';
import { Filter } from '../../nodes/transforms/Filter.js';
import { Group } from '../../nodes/transforms/Group.js';
import { Partition } from '../../nodes/transforms/Partition.js';
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

/** A saved spec: `relational101` feeding `sort101`, which has these keys */
const sortSpec = (
  sorts: { column: string; direction: string }[],
): JsonObject => ({
  formatVersion: 1,
  query: {
    selected: 'sort101',
    nodes: [
      RELATIONAL,
      { kind: 'sort', id: 'sort101', inputs: ['relational101'], sorts },
    ],
  },
});

/** A saved spec: `relational101` feeding `rename101`, which has these mappings */
const renameSpec = (mappings: { from: string; to: string }[]): JsonObject => ({
  formatVersion: 1,
  query: {
    selected: 'rename101',
    nodes: [
      RELATIONAL,
      {
        kind: 'rename',
        id: 'rename101',
        inputs: ['relational101'],
        mappings,
      },
    ],
  },
});

/** A saved spec: `relational101` feeding `restrict101`, which keeps these columns */
const restrictSpec = (columns: string[]): JsonObject => ({
  formatVersion: 1,
  query: {
    selected: 'restrict101',
    nodes: [
      RELATIONAL,
      {
        kind: 'restrict',
        id: 'restrict101',
        inputs: ['relational101'],
        columns,
      },
    ],
  },
});

/** A saved spec: `relational101` feeding `group101`, which has these keys and aggregations */
const groupSpec = (
  columns: string[],
  aggregations: JsonObject[],
): JsonObject => ({
  formatVersion: 1,
  query: {
    selected: 'group101',
    nodes: [
      RELATIONAL,
      {
        kind: 'group',
        id: 'group101',
        inputs: ['relational101'],
        columns,
        aggregations,
      },
    ],
  },
});
const COUNT_QTY = { column: 'QTY', function: 'Count', name: 'QTY Count' };
const COUNT_ROWS = { function: 'CountRows', name: 'Count Rows' };

/** A saved spec: `relational101` feeding `partition101`, which has these columns, sorts and aggregations */
const partitionSpec = (
  columns: string[],
  sorts: { column: string; direction: string }[],
  aggregations: JsonObject[],
): JsonObject => ({
  formatVersion: 1,
  query: {
    selected: 'partition101',
    nodes: [
      RELATIONAL,
      {
        kind: 'partition',
        id: 'partition101',
        inputs: ['relational101'],
        columns,
        sorts,
        aggregations,
      },
    ],
  },
});
const QTY_DESC = { column: 'QTY', direction: 'DESC' };
const RANK = { function: 'Rank', name: 'Rank' };
const SUM_FREIGHT = {
  column: 'FREIGHT',
  function: 'Sum',
  name: 'Running freight',
};

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

/** The errors inference reports for each node of the query */
const validityOf = (
  query: Query,
  registry: NodeRegistry = createNodeRegistry(),
): Record<string, readonly string[]> =>
  Object.fromEntries(
    buildSchemasAndValidity(query, registry.queryRules).validity,
  );

/**
 * The errors inference reports for each node of the document the spec holds,
 * which must decode and re-save byte for byte, as JSON and as text
 */
const errorsOf = (
  json: JsonObject,
  registry: NodeRegistry = createNodeRegistry(),
): Record<string, readonly string[]> => {
  const { document } = decodeCubeSpec(json, { registry });
  expect(JSON.stringify(encodeCubeSpec(document, registry))).toBe(
    JSON.stringify(json),
  );
  const text = JSON.stringify(json, undefined, 2);
  expect(
    serializeCubeSpec(parseCubeSpec(text, { registry }).document, registry),
  ).toBe(text);
  return validityOf(document.query, registry);
};

/** A spec's query, its `group101` read as a Group */
const decodeGroupSpec = (json: JsonObject): Query => {
  const { query } = decodeCubeSpec(json, {
    registry: createNodeRegistry(),
  }).document;
  expect(query.getNode('group101')).toBeInstanceOf(Group);
  return query;
};

/** As `errorsOf`, for a spec whose `group101` must be read as a Group */
const groupErrorsOf = (json: JsonObject): Record<string, readonly string[]> => {
  decodeGroupSpec(json);
  return errorsOf(json, createNodeRegistry());
};

/** A spec's query, its `partition101` read as a Partition */
const decodePartitionSpec = (json: JsonObject): Query => {
  const { query } = decodeCubeSpec(json, {
    registry: createNodeRegistry(),
  }).document;
  expect(query.getNode('partition101')).toBeInstanceOf(Partition);
  return query;
};

/** As `validityOf`, for a query with a partition */
const partitionValidityOf = (query: Query): Record<string, readonly string[]> =>
  validityOf(query, createNodeRegistry());

/** As `errorsOf`, for a spec whose `partition101` must be read as a Partition */
const partitionErrorsOf = (
  json: JsonObject,
): Record<string, readonly string[]> => {
  decodePartitionSpec(json);
  return errorsOf(json, createNodeRegistry());
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
    [
      'a restrict with no column',
      restrictSpec([]),
      { relational101: [], restrict101: [MESSAGE_CANNOT_BE_EMPTY('Columns')] },
    ],
    [
      'a restrict with a column twice',
      restrictSpec(['QTY', 'QTY']),
      {
        relational101: [],
        restrict101: [MESSAGE_CANNOT_HAVE_DUPLICATES('Columns')],
      },
    ],
    [
      'a restrict on a column the input does not have',
      restrictSpec(['QTY', 'SHIPPER']),
      {
        relational101: [],
        restrict101: [MESSAGE_NOT_IN_INPUT_SCHEMA('Column', 'SHIPPER')],
      },
    ],
    [
      'a valid restrict, picked out of order',
      restrictSpec(['COUNTRY', 'QTY']),
      { relational101: [], restrict101: [] },
    ],
    [
      'a sort with no key',
      sortSpec([]),
      { relational101: [], sort101: [MESSAGE_CANNOT_BE_EMPTY('Sorts')] },
    ],
    [
      'a sort on a column twice',
      sortSpec([
        { column: 'QTY', direction: 'ASC' },
        { column: 'QTY', direction: 'DESC' },
      ]),
      {
        relational101: [],
        sort101: [MESSAGE_CANNOT_HAVE_DUPLICATES('Sort columns')],
      },
    ],
    [
      'a valid sort, an enumeration among its keys',
      sortSpec([
        { column: 'REGION', direction: 'DESC' },
        { column: 'QTY', direction: 'ASC' },
      ]),
      { relational101: [], sort101: [] },
    ],
    [
      'a rename onto a column the input keeps',
      renameSpec([{ from: 'QTY', to: 'COUNTRY' }]),
      {
        relational101: [],
        rename101: [
          MESSAGE_ALREADY_IN_INPUT_SCHEMA('New column name', 'COUNTRY'),
        ],
      },
    ],
    [
      'a rename to a name with a double quote',
      renameSpec([{ from: 'QTY', to: 'a"b' }]),
      { relational101: [], rename101: [MESSAGE_NEW_COLUMN_NAME_INVALID] },
    ],
    [
      'a rename with no mapping',
      renameSpec([]),
      {
        relational101: [],
        rename101: [MESSAGE_CANNOT_BE_EMPTY('Column renames')],
      },
    ],
    [
      'a valid rename',
      renameSpec([{ from: 'QTY', to: 'Quantity' }]),
      { relational101: [], rename101: [] },
    ],
  ];

  test.each(CONNECTED)(
    'Reads a document with %s, and reports it through inference',
    (_, json, errors) => {
      expect(errorsOf(json)).toStrictEqual(errors);
    },
  );
});

describe(unitTest('Saved spec validity: groups'), () => {
  // PLAN §11.5: a group's texts are kept as saved, functions included (Q4),
  // since an invalid group can't run; each aggregation reports its first
  // problem
  const GROUPS: [string, JsonObject, string[]][] = [
    [
      'a valid group, its keys listed out of input order',
      groupSpec(
        ['COUNTRY', 'QTY'],
        [
          COUNT_ROWS,
          { column: 'FREIGHT', function: 'Sum', name: 'Total freight' },
        ],
      ),
      [],
    ],
    ['a valid group with no key', groupSpec([], [COUNT_QTY]), []],
    [
      'a group with no aggregation',
      groupSpec(['COUNTRY'], []),
      [MESSAGE_CANNOT_BE_EMPTY('Aggregations')],
    ],
    [
      'a group on a column twice',
      groupSpec(['COUNTRY', 'COUNTRY'], [COUNT_ROWS]),
      [MESSAGE_CANNOT_HAVE_DUPLICATES('Group columns')],
    ],
    [
      'a group on a blank column',
      groupSpec([''], [COUNT_ROWS]),
      [MESSAGE_DOES_NOT_HAVE_A_NAME('Group column')],
    ],
    [
      'a group on a column the input does not have',
      groupSpec(['SHIPPER'], [COUNT_ROWS]),
      [MESSAGE_NOT_IN_INPUT_SCHEMA('Group column', 'SHIPPER')],
    ],
    [
      'an unknown function',
      groupSpec(
        ['COUNTRY'],
        [{ column: 'QTY', function: 'Median', name: 'QTY Median' }],
      ),
      [MESSAGE_AGGREGATION_FUNCTION_UNKNOWN('Median')],
    ],
    [
      'a function spelled in another case',
      groupSpec(
        ['COUNTRY'],
        [{ column: 'QTY', function: 'count', name: 'QTY Count' }],
      ),
      [MESSAGE_AGGREGATION_FUNCTION_UNKNOWN('count')],
    ],
    [
      'an empty function',
      groupSpec(
        ['COUNTRY'],
        [{ column: 'QTY', function: '', name: 'Quantity' }],
      ),
      [MESSAGE_AGGREGATION_FUNCTION_EMPTY],
    ],
    [
      // window-only, so unknown in a group (PLAN §11.5, Q4)
      'Rank',
      groupSpec(['COUNTRY'], [{ function: 'Rank', name: 'Rank' }]),
      [MESSAGE_AGGREGATION_FUNCTION_UNKNOWN('Rank')],
    ],
    [
      'Dense Rank on a column',
      groupSpec(
        ['COUNTRY'],
        [{ column: 'QTY', function: 'DenseRank', name: 'Dense Rank' }],
      ),
      [MESSAGE_AGGREGATION_FUNCTION_UNKNOWN('DenseRank')],
    ],
    [
      'Count rows on a column',
      groupSpec(
        ['COUNTRY'],
        [{ column: 'QTY', function: 'CountRows', name: 'Count Rows' }],
      ),
      [MESSAGE_AGGREGATION_FUNCTION_DISALLOWS_COLUMN('CountRows')],
    ],
    [
      'Count rows on a blank column',
      groupSpec(
        ['COUNTRY'],
        [{ column: '', function: 'CountRows', name: 'Count Rows' }],
      ),
      [MESSAGE_AGGREGATION_FUNCTION_DISALLOWS_COLUMN('CountRows')],
    ],
    [
      'an aggregation of a blank column',
      groupSpec(['COUNTRY'], [{ column: '', function: 'Count', name: 'Rows' }]),
      [MESSAGE_DOES_NOT_HAVE_A_NAME('Aggregation column')],
    ],
    [
      'a column function without a column',
      groupSpec(['COUNTRY'], [{ function: 'Sum', name: 'Sum' }]),
      [MESSAGE_DOES_NOT_HAVE_A_NAME('Aggregation column')],
    ],
    [
      'an aggregation of a column the input does not have',
      groupSpec(
        ['COUNTRY'],
        [{ column: 'SHIPPER', function: 'Count', name: 'SHIPPER Count' }],
      ),
      [MESSAGE_NOT_IN_INPUT_SCHEMA('Aggregation column', 'SHIPPER')],
    ],
    [
      "a function the column's type doesn't offer",
      groupSpec(
        ['QTY'],
        [{ column: 'COUNTRY', function: 'Sum', name: 'COUNTRY Sum' }],
      ),
      [MESSAGE_AGGREGATION_FUNCTION_INCOMPATIBLE('Sum', 'COUNTRY')],
    ],
    [
      'an empty output name',
      groupSpec(['COUNTRY'], [{ ...COUNT_QTY, name: '' }]),
      [MESSAGE_AGGREGATION_OUTPUT_NAME_EMPTY],
    ],
    [
      'an output name that is an input column in another case',
      groupSpec(['COUNTRY'], [{ ...COUNT_QTY, name: 'qty' }]),
      [MESSAGE_AGGREGATION_OUTPUT_NAME_IS_INPUT_COLUMN('qty')],
    ],
    [
      'two output names equal but for case',
      groupSpec(
        ['COUNTRY'],
        [
          { ...COUNT_QTY, name: 'Orders' },
          { ...COUNT_ROWS, name: 'ORDERS' },
        ],
      ),
      [
        MESSAGE_ALREADY_IN_OUTPUT_SCHEMA('Aggregation output name', 'Orders'),
        MESSAGE_ALREADY_IN_OUTPUT_SCHEMA('Aggregation output name', 'ORDERS'),
      ],
    ],
    [
      'several invalid aggregations beside a valid one',
      groupSpec(
        ['COUNTRY'],
        [
          { column: 'QTY', function: 'Median', name: 'QTY Median' },
          COUNT_QTY,
          { column: 'QTY', function: 'CountRows', name: 'Count Rows' },
        ],
      ),
      [
        MESSAGE_AGGREGATION_FUNCTION_UNKNOWN('Median'),
        MESSAGE_AGGREGATION_FUNCTION_DISALLOWS_COLUMN('CountRows'),
      ],
    ],
  ];

  test.each(GROUPS)(
    'Reads a document with %s, and reports it through inference',
    (_, json, errors) => {
      expect(groupErrorsOf(json)).toStrictEqual({
        relational101: [],
        group101: errors,
      });
    },
  );

  test('Reads aggregations saved without a name with their auto-names, valid', () => {
    // PLAN §11.5, Q3: the names are then written (CubeSpecEncode)
    const query = decodeGroupSpec(
      groupSpec(
        ['COUNTRY'],
        [{ column: 'QTY', function: 'Count' }, { function: 'CountRows' }],
      ),
    );
    expect(
      (query.getNode('group101') as Group).aggregations.map(({ name }) => name),
    ).toEqual(['QTY Count', 'Count Rows']);
    expect(validityOf(query)).toStrictEqual({
      relational101: [],
      group101: [],
    });
  });

  test.each<[string, JsonObject, string]>([
    [
      'an unknown function',
      { column: 'QTY', function: 'Median' },
      MESSAGE_AGGREGATION_FUNCTION_UNKNOWN('Median'),
    ],
    [
      'a window-only function',
      { function: 'Rank' },
      MESSAGE_AGGREGATION_FUNCTION_UNKNOWN('Rank'),
    ],
    [
      'an empty function',
      { column: 'QTY', function: '' },
      MESSAGE_AGGREGATION_FUNCTION_EMPTY,
    ],
    [
      'a column function without a column',
      { function: 'Sum' },
      MESSAGE_DOES_NOT_HAVE_A_NAME('Aggregation column'),
    ],
    [
      'a column function on a blank column',
      { column: '', function: 'Count' },
      MESSAGE_DOES_NOT_HAVE_A_NAME('Aggregation column'),
    ],
  ])(
    'Reads an aggregation saved without a name, with %s, as an empty name, reported once the rest is fixed',
    (_, saved, message) => {
      // there is no auto-name to give it (PLAN §11.5, Q3)
      const query = decodeGroupSpec(groupSpec(['COUNTRY'], [saved]));
      const group = query.getNode('group101') as Group;
      const [aggregation] = group.aggregations as [ColumnAggregation];
      expect(aggregation.name).toBe('');
      // the aggregation's first problem comes before its name
      expect(validityOf(query)).toStrictEqual({
        relational101: [],
        group101: [message],
      });
      const fixed = group.withAggregations([
        { ...aggregation, column: 'QTY', function: 'Sum' },
      ]);
      expect(validityOf(query.replace(fixed))).toStrictEqual({
        relational101: [],
        group101: [MESSAGE_AGGREGATION_OUTPUT_NAME_EMPTY],
      });
    },
  );
});

describe(unitTest('Saved spec validity: partitions'), () => {
  // PLAN §11.6: a partition's texts are kept as saved, functions included, as
  // a Group's (M4 Q4), and so is a rank function saved with a column; each
  // window function reports its first problem
  const PARTITIONS: [string, JsonObject, string[]][] = [
    [
      'a valid partition, with every window function',
      partitionSpec(
        ['COUNTRY'],
        [QTY_DESC],
        [
          COUNT_QTY,
          { column: 'QTY', function: 'DistinctCount', name: 'Products' },
          { column: 'COUNTRY', function: 'DistinctValue', name: 'Only' },
          SUM_FREIGHT,
          { column: 'PRICE', function: 'Average', name: 'Mean price' },
          { column: 'RATIO', function: 'Min', name: 'Lowest' },
          { column: 'QTY', function: 'Max', name: 'Highest' },
          COUNT_ROWS,
          RANK,
          { function: 'DenseRank', name: 'Dense Rank' },
          { function: 'RowNumber', name: 'Row Number' },
        ],
      ),
      [],
    ],
    [
      'a valid partition with no partition column and no sort',
      partitionSpec([], [], [COUNT_ROWS, SUM_FREIGHT]),
      [],
    ],
    [
      'a valid partition sorted by its partition column',
      partitionSpec(
        ['COUNTRY'],
        [{ column: 'COUNTRY', direction: 'ASC' }],
        [RANK],
      ),
      [],
    ],
    [
      'a partition with no aggregation',
      partitionSpec(['COUNTRY'], [QTY_DESC], []),
      [MESSAGE_CANNOT_BE_EMPTY('Aggregations')],
    ],
    [
      'a partition on a column twice',
      partitionSpec(['COUNTRY', 'COUNTRY'], [QTY_DESC], [RANK]),
      [MESSAGE_CANNOT_HAVE_DUPLICATES('Partition columns')],
    ],
    [
      'a partition on a blank column',
      partitionSpec([''], [QTY_DESC], [RANK]),
      [MESSAGE_DOES_NOT_HAVE_A_NAME('Partition column')],
    ],
    [
      'a partition on a column the input does not have',
      partitionSpec(['SHIPPER'], [QTY_DESC], [RANK]),
      [MESSAGE_NOT_IN_INPUT_SCHEMA('Partition column', 'SHIPPER')],
    ],
    [
      'a sort on a column twice',
      partitionSpec(['COUNTRY'], [QTY_DESC, QTY_DESC], [RANK]),
      [MESSAGE_CANNOT_HAVE_DUPLICATES('Sort columns')],
    ],
    [
      'a sort on a blank column',
      partitionSpec(['COUNTRY'], [{ column: '', direction: 'ASC' }], [RANK]),
      [MESSAGE_DOES_NOT_HAVE_A_NAME('Sort column')],
    ],
    [
      'an unknown function',
      partitionSpec(
        ['COUNTRY'],
        [QTY_DESC],
        [{ column: 'QTY', function: 'Median', name: 'QTY Median' }],
      ),
      [MESSAGE_AGGREGATION_FUNCTION_UNKNOWN('Median')],
    ],
    [
      'a rank function spelled in another case',
      partitionSpec(['COUNTRY'], [QTY_DESC], [{ ...RANK, function: 'rank' }]),
      [MESSAGE_AGGREGATION_FUNCTION_UNKNOWN('rank')],
    ],
    [
      'an empty function',
      partitionSpec(
        ['COUNTRY'],
        [QTY_DESC],
        [{ column: 'QTY', function: '', name: 'Quantity' }],
      ),
      [MESSAGE_AGGREGATION_FUNCTION_EMPTY],
    ],
    [
      'Rank on a column',
      partitionSpec(['COUNTRY'], [QTY_DESC], [{ column: 'QTY', ...RANK }]),
      [MESSAGE_AGGREGATION_FUNCTION_DISALLOWS_COLUMN('Rank')],
    ],
    [
      'Row Number on a blank column',
      partitionSpec(
        ['COUNTRY'],
        [QTY_DESC],
        [{ column: '', function: 'RowNumber', name: 'Row Number' }],
      ),
      [MESSAGE_AGGREGATION_FUNCTION_DISALLOWS_COLUMN('RowNumber')],
    ],
    [
      // its column is its first problem
      'Rank on a column in a partition with no sort',
      partitionSpec(['COUNTRY'], [], [{ column: 'QTY', ...RANK }]),
      [MESSAGE_AGGREGATION_FUNCTION_DISALLOWS_COLUMN('Rank')],
    ],
    [
      'Rank in a partition with no sort',
      partitionSpec(['COUNTRY'], [], [RANK]),
      [MESSAGE_AGGREGATION_FUNCTION_NEEDS_SORT('Rank')],
    ],
    [
      'every rank function in a partition with no sort, beside aggregates that need none',
      partitionSpec(
        ['COUNTRY'],
        [],
        [
          SUM_FREIGHT,
          RANK,
          { function: 'DenseRank', name: 'Dense Rank' },
          COUNT_ROWS,
          { function: 'RowNumber', name: 'Row Number' },
        ],
      ),
      [
        MESSAGE_AGGREGATION_FUNCTION_NEEDS_SORT('Rank'),
        MESSAGE_AGGREGATION_FUNCTION_NEEDS_SORT('DenseRank'),
        MESSAGE_AGGREGATION_FUNCTION_NEEDS_SORT('RowNumber'),
      ],
    ],
    [
      'a column function without a column',
      partitionSpec(
        ['COUNTRY'],
        [QTY_DESC],
        [{ function: 'Sum', name: 'Sum' }],
      ),
      [MESSAGE_DOES_NOT_HAVE_A_NAME('Aggregation column')],
    ],
    [
      'an aggregation of a column the input does not have',
      partitionSpec(
        ['COUNTRY'],
        [QTY_DESC],
        [{ column: 'SHIPPER', function: 'Count', name: 'SHIPPER Count' }],
      ),
      [MESSAGE_NOT_IN_INPUT_SCHEMA('Aggregation column', 'SHIPPER')],
    ],
    [
      "a function the column's type doesn't offer",
      partitionSpec(
        ['COUNTRY'],
        [QTY_DESC],
        [{ column: 'COUNTRY', function: 'Sum', name: 'COUNTRY Sum' }],
      ),
      [MESSAGE_AGGREGATION_FUNCTION_INCOMPATIBLE('Sum', 'COUNTRY')],
    ],
    [
      'an empty output name',
      partitionSpec(['COUNTRY'], [QTY_DESC], [{ ...RANK, name: '' }]),
      [MESSAGE_AGGREGATION_OUTPUT_NAME_EMPTY],
    ],
    [
      'an output name that is an input column in another case',
      partitionSpec(['COUNTRY'], [QTY_DESC], [{ ...RANK, name: 'qty' }]),
      [MESSAGE_AGGREGATION_OUTPUT_NAME_IS_INPUT_COLUMN('qty')],
    ],
    [
      'two output names equal but for case',
      partitionSpec(
        ['COUNTRY'],
        [QTY_DESC],
        [
          { ...RANK, name: 'Position' },
          { ...COUNT_ROWS, name: 'POSITION' },
        ],
      ),
      [
        MESSAGE_ALREADY_IN_OUTPUT_SCHEMA('Aggregation output name', 'Position'),
        MESSAGE_ALREADY_IN_OUTPUT_SCHEMA('Aggregation output name', 'POSITION'),
      ],
    ],
    [
      'several invalid window functions beside a valid one',
      partitionSpec(
        ['COUNTRY'],
        [QTY_DESC],
        [
          { column: 'QTY', function: 'Median', name: 'QTY Median' },
          RANK,
          { column: 'QTY', function: 'DenseRank', name: 'Dense Rank' },
        ],
      ),
      [
        MESSAGE_AGGREGATION_FUNCTION_UNKNOWN('Median'),
        MESSAGE_AGGREGATION_FUNCTION_DISALLOWS_COLUMN('DenseRank'),
      ],
    ],
  ];

  test.each(PARTITIONS)(
    'Reads a document with %s, and reports it through inference',
    (_, json, errors) => {
      expect(partitionErrorsOf(json)).toStrictEqual({
        relational101: [],
        partition101: errors,
      });
    },
  );

  test('Reports the messages of a saved window function in their exact words', () => {
    // PLAN §11.6: kept as saved, end to end
    const errorsOfRank = (
      sorts: { column: string; direction: string }[],
      rank: JsonObject,
    ): readonly string[] =>
      partitionErrorsOf(partitionSpec(['COUNTRY'], sorts, [rank]))
        .partition101 ?? [];
    expect(errorsOfRank([QTY_DESC], { column: 'QTY', ...RANK })).toStrictEqual([
      'Aggregation function "Rank" does not allow column.',
    ]);
    expect(errorsOfRank([], RANK)).toStrictEqual([
      'Aggregation function "Rank" requires at least one sort column.',
    ]);
    expect(
      errorsOfRank([QTY_DESC], { ...RANK, function: 'Median' }),
    ).toStrictEqual(['Aggregation function "Median" is unknown.']);
    expect(errorsOfRank([QTY_DESC], { ...RANK, function: '' })).toStrictEqual([
      'Aggregation function cannot be empty.',
    ]);
    expect(errorsOfRank([QTY_DESC], { ...RANK, name: '' })).toStrictEqual([
      'Aggregation output name cannot be empty.',
    ]);
  });

  test('Reads aggregations saved without a name with their window auto-names, valid', () => {
    // PLAN §11.6, as M4 Q3: the names are then written (CubeSpecEncode)
    const query = decodePartitionSpec(
      partitionSpec(
        ['COUNTRY'],
        [QTY_DESC],
        [
          { column: 'QTY', function: 'Sum' },
          { function: 'Rank' },
          { function: 'DenseRank' },
          { function: 'RowNumber' },
          { function: 'CountRows' },
        ],
      ),
    );
    expect(
      (query.getNode('partition101') as Partition).aggregations.map(
        ({ name }) => name,
      ),
    ).toEqual(['QTY Sum', 'Rank', 'Dense Rank', 'Row Number', 'Count Rows']);
    expect(partitionValidityOf(query)).toStrictEqual({
      relational101: [],
      partition101: [],
    });
  });

  test('Reads Rank saved without a name in a partition with no sort as Rank, reported for its sort', () => {
    const query = decodePartitionSpec(
      partitionSpec(['COUNTRY'], [], [{ function: 'Rank' }]),
    );
    expect(
      (query.getNode('partition101') as Partition).aggregations.map(
        ({ name }) => name,
      ),
    ).toEqual(['Rank']);
    expect(partitionValidityOf(query)).toStrictEqual({
      relational101: [],
      partition101: [MESSAGE_AGGREGATION_FUNCTION_NEEDS_SORT('Rank')],
    });
  });

  test.each<[string, JsonObject, string]>([
    [
      'an unknown function',
      { column: 'QTY', function: 'Median' },
      MESSAGE_AGGREGATION_FUNCTION_UNKNOWN('Median'),
    ],
    [
      'a rank function spelled in another case',
      { function: 'rank' },
      MESSAGE_AGGREGATION_FUNCTION_UNKNOWN('rank'),
    ],
    [
      'an empty function',
      { column: 'QTY', function: '' },
      MESSAGE_AGGREGATION_FUNCTION_EMPTY,
    ],
    [
      'a column function without a column',
      { function: 'Sum' },
      MESSAGE_DOES_NOT_HAVE_A_NAME('Aggregation column'),
    ],
    [
      'a column function on a blank column',
      { column: '', function: 'Count' },
      MESSAGE_DOES_NOT_HAVE_A_NAME('Aggregation column'),
    ],
  ])(
    'Reads an aggregation saved without a name, with %s, as an empty name, reported once the rest is fixed',
    (_, saved, message) => {
      // there is no auto-name to give it (PLAN §11.6, as M4 Q3)
      const query = decodePartitionSpec(
        partitionSpec(['COUNTRY'], [QTY_DESC], [saved]),
      );
      const partition = query.getNode('partition101') as Partition;
      const [aggregation] = partition.aggregations as [ColumnAggregation];
      expect(aggregation.name).toBe('');
      // the aggregation's first problem comes before its name
      expect(partitionValidityOf(query)).toStrictEqual({
        relational101: [],
        partition101: [message],
      });
      const fixed = partition.withAggregations([
        { ...aggregation, column: 'QTY', function: 'Sum' },
      ]);
      expect(partitionValidityOf(query.replace(fixed))).toStrictEqual({
        relational101: [],
        partition101: [MESSAGE_AGGREGATION_OUTPUT_NAME_EMPTY],
      });
    },
  );

  test("Gives a valid partition its input's columns, then one column per window function, in listed order", () => {
    const query = decodePartitionSpec(
      partitionSpec(
        ['COUNTRY'],
        [QTY_DESC],
        [
          RANK,
          { column: 'QTY', function: 'Sum', name: 'QTY Sum' },
          COUNT_ROWS,
          { column: 'COUNTRY', function: 'DistinctValue', name: 'Only' },
          { function: 'RowNumber', name: 'Row Number' },
        ],
      ),
    );
    const { schemas, validity } = buildSchemasAndValidity(
      query,
      createNodeRegistry().queryRules,
    );
    expect(validity.get('partition101')).toEqual([]);
    const describeColumns = (id: string): string[] =>
      schemas
        .get(id)
        ?.columns.map(
          ({ name, type, nullable }) =>
            `${name} ${type.displayName}${nullable ? '?' : ''}`,
        ) ?? [];
    expect(describeColumns('partition101')).toEqual([
      ...describeColumns('relational101'),
      'Rank Integer',
      'QTY Sum Integer?',
      'Count Rows Integer',
      'Only String?',
      'Row Number Integer',
    ]);
  });
});

describe(unitTest('Saved spec validity: concats'), () => {
  const REGISTRY = createNodeRegistry();

  const INTEGER = { path: 'Integer' };
  const varchar = (length: number): JsonObject => ({
    path: `${PRECISE}Varchar`,
    params: [length],
  });
  const numeric = (precision: number, scale: number): JsonObject => ({
    path: `${PRECISE}Numeric`,
    params: [precision, scale],
  });

  /** A saved snapshot column */
  const snapshotColumn = (
    name: string,
    type: JsonObject,
    nullable = true,
  ): JsonObject => ({ name, type, nullable });

  const ORDER_ID = snapshotColumn('ORDER_ID', INTEGER, false);
  const SHIP_CITY = snapshotColumn('SHIP_CITY', varchar(15));
  const FREIGHT = snapshotColumn('FREIGHT', numeric(10, 2));
  /** The first input's columns, which the second's are checked against */
  const ORDERS = [ORDER_ID, SHIP_CITY, FREIGHT];

  /**
   * A saved spec: ORDERS (`relational101`) and its archive (`relational102`),
   * with these columns, feeding `concat101` on these inputs
   */
  const concatSpec = (
    first: JsonObject[],
    second: JsonObject[],
    {
      widenTypes = false,
      inputs = ['relational101', 'relational102'],
      database = TEST_DATABASE,
    }: {
      widenTypes?: boolean;
      inputs?: (string | null)[];
      database?: string;
    } = {},
  ): JsonObject => ({
    formatVersion: 1,
    query: {
      selected: 'concat101',
      nodes: [
        {
          kind: 'relational',
          id: 'relational101',
          database: TEST_DATABASE,
          schema: 'NORTHWIND',
          table: 'ORDERS',
          schemaSnapshot: first,
        },
        {
          kind: 'relational',
          id: 'relational102',
          database,
          schema: 'NORTHWIND',
          table: 'ORDERS_ARCHIVE',
          schemaSnapshot: second,
        },
        { kind: 'concat', id: 'concat101', inputs, widenTypes },
      ],
    },
  });

  /** As `errorsOf`, for a spec whose `concat101` must be read as a Concat */
  const concatErrorsOf = (
    json: JsonObject,
  ): Record<string, readonly string[]> => {
    const { query } = decodeCubeSpec(json, { registry: REGISTRY }).document;
    expect(query.getNode('concat101')).toBeInstanceOf(Concat);
    return errorsOf(json, REGISTRY);
  };

  // PLAN §11.5: matched by position; the count first, then the names, then
  // the types, each only once the one before matches; nullability never
  // compared. The spec's message first, then Cube's for every position. Each
  // case's errors, then its errors with widenTypes on (Convert types, Q5),
  // when they differ.
  const CONCATS: [string, JsonObject[], JsonObject[], string[], string[]?][] = [
    ['the same columns', ORDERS, ORDERS, []],
    [
      'columns that differ only in nullability',
      ORDERS,
      ORDERS.map((saved) => ({ ...saved, nullable: !saved.nullable })),
      [],
    ],
    [
      // two enumerations are equal when their paths are
      'an enumeration saved with other values in each input',
      [
        snapshotColumn('REGION', {
          path: 'test::Region',
          values: ['EMEA', 'APAC'],
        }),
      ],
      [snapshotColumn('REGION', { path: 'test::Region', values: ['EMEA'] })],
      [],
    ],
    [
      'a first input with more columns',
      ORDERS,
      [ORDER_ID, SHIP_CITY],
      [MESSAGE_INPUT_SCHEMAS_DIFFER, MESSAGE_CONCAT_COLUMN_COUNT(3, 2)],
    ],
    [
      'a first input of one column',
      [ORDER_ID],
      ORDERS,
      [MESSAGE_INPUT_SCHEMAS_DIFFER, MESSAGE_CONCAT_COLUMN_COUNT(1, 3)],
    ],
    [
      'columns that differ in count and in name',
      ORDERS,
      [ORDER_ID, snapshotColumn('CITY', varchar(15))],
      [MESSAGE_INPUT_SCHEMAS_DIFFER, MESSAGE_CONCAT_COLUMN_COUNT(3, 2)],
    ],
    [
      'names that differ at two positions',
      ORDERS,
      [
        ORDER_ID,
        snapshotColumn('CITY', varchar(15)),
        snapshotColumn('COST', numeric(10, 2)),
      ],
      [
        MESSAGE_INPUT_SCHEMAS_DIFFER,
        MESSAGE_CONCAT_COLUMN_NAME(2, 'SHIP_CITY', 'CITY'),
        MESSAGE_CONCAT_COLUMN_NAME(3, 'FREIGHT', 'COST'),
      ],
    ],
    [
      'a name in another case',
      ORDERS,
      [ORDER_ID, snapshotColumn('ship_city', varchar(15)), FREIGHT],
      [
        MESSAGE_INPUT_SCHEMAS_DIFFER,
        MESSAGE_CONCAT_COLUMN_NAME(2, 'SHIP_CITY', 'ship_city'),
      ],
    ],
    [
      'the same columns in another order',
      ORDERS,
      [FREIGHT, ORDER_ID, SHIP_CITY],
      [MESSAGE_INPUT_SCHEMAS_DIFFER, MESSAGE_CONCAT_COLUMN_ORDER],
    ],
    [
      'names in another order, one in another case',
      ORDERS,
      [SHIP_CITY, snapshotColumn('order_id', INTEGER, false), FREIGHT],
      [
        MESSAGE_INPUT_SCHEMAS_DIFFER,
        MESSAGE_CONCAT_COLUMN_NAME(1, 'ORDER_ID', 'SHIP_CITY'),
        MESSAGE_CONCAT_COLUMN_NAME(2, 'SHIP_CITY', 'order_id'),
      ],
    ],
    [
      'types that differ at two positions',
      ORDERS,
      [
        snapshotColumn('ORDER_ID', { path: `${PRECISE}SmallInt` }, false),
        snapshotColumn('SHIP_CITY', varchar(40)),
        FREIGHT,
      ],
      [
        MESSAGE_INPUT_SCHEMAS_DIFFER,
        MESSAGE_CONCAT_COLUMN_TYPE('ORDER_ID', 'Integer', 'SmallInt'),
        MESSAGE_CONCAT_COLUMN_TYPE('SHIP_CITY', 'Varchar(15)', 'Varchar(40)'),
      ],
      // converted to Integer and String
      [],
    ],
    [
      // strict, though the engine accepts it (PLAN §11.5, Q5)
      'a type beside its own ancestor',
      ORDERS,
      [ORDER_ID, snapshotColumn('SHIP_CITY', { path: 'String' }), FREIGHT],
      [
        MESSAGE_INPUT_SCHEMAS_DIFFER,
        MESSAGE_CONCAT_COLUMN_TYPE('SHIP_CITY', 'Varchar(15)', 'String'),
      ],
      // converted to String
      [],
    ],
    [
      'a type with other parameters',
      ORDERS,
      [ORDER_ID, SHIP_CITY, snapshotColumn('FREIGHT', numeric(12, 2))],
      [
        MESSAGE_INPUT_SCHEMAS_DIFFER,
        MESSAGE_CONCAT_COLUMN_TYPE('FREIGHT', 'Numeric(10,2)', 'Numeric(12,2)'),
      ],
      // converted to Decimal
      [],
    ],
    [
      'names and types that differ',
      ORDERS,
      [
        snapshotColumn('ORDER_ID', { path: `${PRECISE}SmallInt` }, false),
        snapshotColumn('CITY', varchar(15)),
        FREIGHT,
      ],
      [
        MESSAGE_INPUT_SCHEMAS_DIFFER,
        MESSAGE_CONCAT_COLUMN_NAME(2, 'SHIP_CITY', 'CITY'),
      ],
    ],
    [
      'types of different families',
      ORDERS,
      [snapshotColumn('ORDER_ID', varchar(15), false), SHIP_CITY, FREIGHT],
      [
        MESSAGE_INPUT_SCHEMAS_DIFFER,
        MESSAGE_CONCAT_COLUMN_TYPE('ORDER_ID', 'Integer', 'Varchar(15)'),
      ],
      [
        MESSAGE_INPUT_SCHEMAS_DIFFER,
        MESSAGE_CONCAT_COLUMN_NOT_CONVERTIBLE(
          'ORDER_ID',
          'Integer',
          'Varchar(15)',
        ),
      ],
    ],
    [
      "types that convert and types that don't",
      ORDERS,
      [
        ORDER_ID,
        snapshotColumn('SHIP_CITY', varchar(40)),
        snapshotColumn('FREIGHT', { path: 'StrictDate' }),
      ],
      [
        MESSAGE_INPUT_SCHEMAS_DIFFER,
        MESSAGE_CONCAT_COLUMN_TYPE('SHIP_CITY', 'Varchar(15)', 'Varchar(40)'),
        MESSAGE_CONCAT_COLUMN_TYPE('FREIGHT', 'Numeric(10,2)', 'StrictDate'),
      ],
      // only the Numeric and the StrictDate
      [
        MESSAGE_INPUT_SCHEMAS_DIFFER,
        MESSAGE_CONCAT_COLUMN_NOT_CONVERTIBLE(
          'FREIGHT',
          'Numeric(10,2)',
          'StrictDate',
        ),
      ],
    ],
    [
      'two enumerations with one short name',
      [snapshotColumn('REGION', { path: 'a::Region', values: ['EMEA'] })],
      [snapshotColumn('REGION', { path: 'b::Region', values: ['EMEA'] })],
      [
        MESSAGE_INPUT_SCHEMAS_DIFFER,
        MESSAGE_CONCAT_COLUMN_TYPE('REGION', 'a::Region', 'b::Region'),
      ],
      [
        MESSAGE_INPUT_SCHEMAS_DIFFER,
        MESSAGE_CONCAT_COLUMN_NOT_CONVERTIBLE(
          'REGION',
          'a::Region',
          'b::Region',
        ),
      ],
    ],
  ];

  test.each(CONCATS)(
    'Reads a document with a concat of %s, and reports it through inference',
    (_, first, second, errors) => {
      expect(concatErrorsOf(concatSpec(first, second))).toStrictEqual({
        relational101: [],
        relational102: [],
        concat101: errors,
      });
    },
  );

  test.each(CONCATS)(
    'Reads a document with a concat of %s that converts types, and reports what it still lacks through inference',
    (_, first, second, errors, converting = errors) => {
      // PLAN §11.5, Q5: types that differ within numbers, strings or dates
      // are converted; the count and the names are checked as before
      const json = concatSpec(first, second, { widenTypes: true });
      const { query } = decodeCubeSpec(json, { registry: REGISTRY }).document;
      expect((query.getNode('concat101') as Concat).widenTypes).toBe(true);
      expect(concatErrorsOf(json)).toStrictEqual({
        relational101: [],
        relational102: [],
        concat101: converting,
      });
    },
  );

  test('Reports each message in its exact words', () => {
    // PLAN §11.5: every message checked exactly, end to end
    const concatOf = (second: JsonObject[]): readonly string[] =>
      concatErrorsOf(concatSpec(ORDERS, second)).concat101 ?? [];
    const DIFFER = 'Both input schemas must be identical.';
    expect(
      concatErrorsOf(concatSpec([ORDER_ID], ORDERS)).concat101,
    ).toStrictEqual([DIFFER, 'The first input has 1 column and the second 3.']);
    expect(concatOf([ORDER_ID, SHIP_CITY])).toStrictEqual([
      DIFFER,
      'The first input has 3 columns and the second 2.',
    ]);
    expect(
      concatOf([ORDER_ID, snapshotColumn('ship_city', varchar(15)), FREIGHT]),
    ).toStrictEqual([
      DIFFER,
      'Column 2 is "SHIP_CITY" in the first input and "ship_city" in the second: columns are matched by position.',
    ]);
    expect(concatOf([FREIGHT, ORDER_ID, SHIP_CITY])).toStrictEqual([
      DIFFER,
      'The inputs have the same columns in a different order: columns are matched by position.',
    ]);
    expect(
      concatOf([ORDER_ID, snapshotColumn('SHIP_CITY', varchar(40)), FREIGHT]),
    ).toStrictEqual([
      DIFFER,
      'Column "SHIP_CITY" is Varchar(15) in the first input and Varchar(40) in the second.',
    ]);
    // converting types
    expect(
      concatErrorsOf(
        concatSpec(
          ORDERS,
          [
            ORDER_ID,
            snapshotColumn('SHIP_CITY', varchar(40)),
            snapshotColumn('FREIGHT', { path: 'StrictDate' }),
          ],
          { widenTypes: true },
        ),
      ).concat101,
    ).toStrictEqual([
      DIFFER,
      `Column "FREIGHT" is Numeric(10,2) in the first input and StrictDate in the second, which can't be converted to one type.`,
    ]);
  });

  test("Gives a valid concat the first input's columns, each nullable when either input's is", () => {
    const { query } = decodeCubeSpec(
      concatSpec(
        [ORDER_ID, SHIP_CITY, { ...FREIGHT, nullable: false }],
        [ORDER_ID, { ...SHIP_CITY, nullable: false }, FREIGHT],
      ),
      { registry: REGISTRY },
    ).document;
    const { schemas, validity } = buildSchemasAndValidity(query);
    expect(validity.get('concat101')).toEqual([]);
    expect(
      schemas
        .get('concat101')
        ?.columns.map(
          ({ name, type, nullable }) =>
            `${name} ${type.displayName}${nullable ? '?' : ''}`,
        ),
    ).toEqual([
      'ORDER_ID Integer',
      'SHIP_CITY Varchar(15)?',
      'FREIGHT Numeric(10,2)?',
    ]);
  });

  test("Gives a valid concat that converts types the type both inputs share where theirs differ, each nullable when either input's is", () => {
    const first = [ORDER_ID, SHIP_CITY, { ...FREIGHT, nullable: false }];
    const second = [
      snapshotColumn('ORDER_ID', { path: `${PRECISE}SmallInt` }, false),
      snapshotColumn('SHIP_CITY', varchar(40), false),
      snapshotColumn('FREIGHT', numeric(12, 4)),
    ];
    const { query } = decodeCubeSpec(
      concatSpec(first, second, { widenTypes: true }),
      { registry: REGISTRY },
    ).document;
    const { schemas, validity } = buildSchemasAndValidity(query);
    expect(validity.get('concat101')).toEqual([]);
    expect(
      schemas
        .get('concat101')
        ?.columns.map(
          ({ name, type, nullable }) =>
            `${name} ${type.displayName}${nullable ? '?' : ''}`,
        ),
    ).toEqual(['ORDER_ID Integer', 'SHIP_CITY String?', 'FREIGHT Decimal?']);
    // the same inputs, without the setting, are invalid
    expect(concatErrorsOf(concatSpec(first, second)).concat101).toStrictEqual([
      MESSAGE_INPUT_SCHEMAS_DIFFER,
      MESSAGE_CONCAT_COLUMN_TYPE('ORDER_ID', 'Integer', 'SmallInt'),
      MESSAGE_CONCAT_COLUMN_TYPE('SHIP_CITY', 'Varchar(15)', 'Varchar(40)'),
      MESSAGE_CONCAT_COLUMN_TYPE('FREIGHT', 'Numeric(10,2)', 'Numeric(12,4)'),
    ]);
  });

  test.each<[string, (string | null)[]]>([
    ['its second input', ['relational101', null]],
    ['its first input', [null, 'relational102']],
    ['either input', [null, null]],
  ])(
    'Reads a concat without %s, and reports it incomplete, as a join',
    (_, inputs) => {
      // even when the inputs' columns would differ (spec §16)
      expect(
        concatErrorsOf(concatSpec(ORDERS, [ORDER_ID], { inputs })),
      ).toStrictEqual({
        relational101: [],
        relational102: [],
        concat101: [ERR_INCOMPLETE],
      });
    },
  );

  test('Reads a concat of sources on different databases, and reports only the second source', () => {
    expect(
      concatErrorsOf(concatSpec(ORDERS, ORDERS, { database: OTHER_DATABASE })),
    ).toStrictEqual({
      relational101: [],
      relational102: [
        MESSAGE_DIFFERENT_DATABASES(OTHER_DATABASE, TEST_DATABASE),
      ],
      concat101: [ERR_SCHEMAS],
    });
  });
});
