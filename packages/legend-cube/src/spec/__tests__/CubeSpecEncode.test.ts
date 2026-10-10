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
import { describeDocument } from '../../__test-utils__/CubeSpecTestUtils.js';
import {
  column,
  enumColumn,
  resolvedTable,
  TEST_DATABASE,
} from '../../__test-utils__/CubeTestNodes.js';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import { FilterOperator } from '../../filter/FilterOperator.js';
import {
  ColumnComparisonFilter,
  CompositeFilter,
  CompositeFilterOperator,
  type FilterRule,
  type FilterValue,
  type FilterValueItem,
  NotFilter,
  UnsupportedFilter,
} from '../../filter/FilterTree.js';
import { Connection } from '../../graph/Connection.js';
import {
  type CubeContext,
  CubeDocument,
  type CubeMeta,
  DEFAULT_META,
  type ModelContext,
  type Presentation,
} from '../../graph/CubeDocument.js';
import { Query } from '../../graph/Query.js';
import {
  type QueryNode,
  type SourceResolution,
  UNRESOLVED,
} from '../../graph/QueryNode.js';
import {
  CONCAT_DEFINITION,
  createNodeRegistry,
  DIFFERENCE_DEFINITION,
  DROP_DEFINITION,
  EXTEND_DEFINITION,
  GROUP_DEFINITION,
  LIMIT_DEFINITION,
  NodeRegistry,
  PARTITION_DEFINITION,
  RELATIONAL_TABLE_SOURCE_DEFINITION,
} from '../../nodes/NodeRegistry.js';
import { RelationalTableSource } from '../../nodes/sources/RelationalTableSource.js';
import {
  AggregationFunction,
  type ColumnAggregation,
  WindowRankFunction,
} from '../../nodes/transforms/Aggregation.js';
import { Concat } from '../../nodes/transforms/Concat.js';
import { Difference } from '../../nodes/transforms/Difference.js';
import { Extend, UNTYPED } from '../../nodes/transforms/Extend.js';
import { Filter } from '../../nodes/transforms/Filter.js';
import { Group } from '../../nodes/transforms/Group.js';
import { Join, JoinType } from '../../nodes/transforms/Join.js';
import { Distinct } from '../../nodes/transforms/Distinct.js';
import { Drop } from '../../nodes/transforms/Drop.js';
import { Limit } from '../../nodes/transforms/Limit.js';
import { Partition } from '../../nodes/transforms/Partition.js';
import { Rename } from '../../nodes/transforms/Rename.js';
import { Sort, SortDirection } from '../../nodes/transforms/Sort.js';
import { Restrict } from '../../nodes/transforms/Restrict.js';
import { Slice } from '../../nodes/transforms/Slice.js';
import { UnknownNode } from '../../nodes/UnknownNode.js';
import { Schema, SchemaColumn } from '../../schema/Schema.js';
import { EnumType, OpaqueType, PrimitiveType } from '../../types/CubeType.js';
import type { JsonObject, JsonValue } from '../../utils/Json.js';
import {
  decodeCubeSpec,
  encodeCubeSpec,
  parseCubeSpec,
  serializeCubeSpec,
} from '../CubeSpecCodec.js';

const PRECISE = 'meta::pure::precisePrimitives::';
const VARIANT = 'meta::pure::metamodel::variant::Variant';
const RUNTIME = 'showcase::northwind::mapping::StoreRuntime';
const O = FilterOperator;

// ---------------------------------------- helpers ----------------------------------------

const edge = (source: string, target: string, port: string): Connection =>
  new Connection(source, target, port);

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

const FRANCE: FilterValueItem = { kind: 'string', value: 'France' };

/** A document whose query is these nodes and connections, with this capture node */
const documentOf = (
  nodes: QueryNode[],
  connections: Connection[],
  selected: string,
): CubeDocument =>
  new CubeDocument({ query: new Query(nodes, connections, selected) });

/** A document with one unconnected filter node, `filter101`, holding the rule */
const filterDocument = (rule: FilterRule | undefined): CubeDocument =>
  documentOf([new Filter('filter101', rule)], [], 'filter101');

/** The spec `filterDocument(rule)` saves to, with the rule as `filter` */
const filterSpec = (filter: JsonValue): JsonObject => ({
  formatVersion: 1,
  query: {
    selected: 'filter101',
    nodes: [{ kind: 'filter', id: 'filter101', inputs: [null], filter }],
  },
});

/** An unresolved source of a table of the test database */
const table = (id: string, tableName: string): RelationalTableSource =>
  new RelationalTableSource(id, {
    database: TEST_DATABASE,
    schema: 'NORTHWIND',
    table: tableName,
  });

/** The saved JSON of `table(id, tableName)` */
const tableSpec = (id: string, tableName: string): JsonObject => ({
  kind: 'relational',
  id,
  database: TEST_DATABASE,
  schema: 'NORTHWIND',
  table: tableName,
});

/**
 * The document reads back equal (runtime keys aside) from what it saves to,
 * and saving that again gives the same JSON, byte for byte (R137, R143)
 */
const expectReadBack = (
  document: CubeDocument,
  registry: NodeRegistry = createNodeRegistry(),
): void => {
  const encoded = encodeCubeSpec(document, registry);
  const decoded = decodeCubeSpec(encoded, { registry }).document;
  expect(describeDocument(decoded)).toEqual(describeDocument(document));
  expect(JSON.stringify(encodeCubeSpec(decoded, registry))).toBe(
    JSON.stringify(encoded),
  );
};

/**
 * The document saves to exactly `expected`, keys in its order (R144), and
 * reads back equal
 */
const expectEncoded = (
  document: CubeDocument,
  expected: JsonObject,
  registry: NodeRegistry = createNodeRegistry(),
): void => {
  const encoded = encodeCubeSpec(document, registry);
  expect(encoded).toStrictEqual(expected);
  expect(JSON.stringify(encoded)).toBe(JSON.stringify(expected));
  expectReadBack(document, registry);
};

/** The schema of a resolved source of a decoded spec */
const decodedSchema = (json: JsonObject, id: string): Schema => {
  const node = decodeCubeSpec(json).document.query.getNode(id);
  expect(node).toBeInstanceOf(RelationalTableSource);
  const { resolution } = node as RelationalTableSource;
  expect(resolution.kind).toBe('resolved');
  return (resolution as Extract<SourceResolution, { kind: 'resolved' }>).schema;
};

// ---------------------------------------- samples ----------------------------------------

const TEXT_MODEL: ModelContext = { _type: 'text', code: '###Relational' };

const TEXT_CONTEXT: CubeContext = { model: TEXT_MODEL, runtime: RUNTIME };

const ORDERS = resolvedTable('relational101', 'ORDERS', [
  column('ORDER_ID', `${PRECISE}SmallInt`),
  column('CUSTOMER_ID', `${PRECISE}Varchar`, true, [5]),
  column('ORDER_DATE', 'StrictDate', true),
]);
const CUSTOMERS = resolvedTable('relational102', 'CUSTOMERS', [
  column('CUSTOMER_ID', `${PRECISE}Varchar`, false, [5]),
  column('COUNTRY', `${PRECISE}Varchar`, true, [15]),
]);

/** The PLAN §10.3 example, cut down: ORDERS INNER JOIN CUSTOMERS, then a filter, captured */
const SLICE = new CubeDocument({
  name: 'French orders 1997',
  context: TEXT_CONTEXT,
  query: new Query(
    [
      ORDERS,
      CUSTOMERS,
      new Join('join101', {
        joinType: JoinType.INNER,
        leftColumns: ['CUSTOMER_ID'],
        rightColumns: ['CUSTOMER_ID'],
      }),
      new Filter(
        'filter101',
        and(
          compare('COUNTRY', O.EQUAL, FRANCE),
          compare('ORDER_DATE', O.GREATER_THAN_OR_EQUAL, {
            kind: 'strictDate',
            value: '1997-01-01',
          }),
          compare('ORDER_ID', O.IN, [
            { kind: 'integer', value: '1' },
            { kind: 'integer', value: '4' },
          ]),
        ),
      ),
    ],
    [
      edge('relational101', 'join101', 'leftTds'),
      edge('relational102', 'join101', 'rightTds'),
      edge('join101', 'filter101', 'tds'),
    ],
    'filter101',
  ),
  meta: {
    presentation: {
      showGraph: false,
      columnWidths: [{ column: 'COUNTRY', width: 180 }],
    },
  },
});

const SLICE_SPEC: JsonObject = {
  formatVersion: 1,
  name: 'French orders 1997',
  context: { model: TEXT_MODEL, runtime: RUNTIME },
  query: {
    selected: 'filter101',
    nodes: [
      {
        kind: 'relational',
        id: 'relational101',
        database: TEST_DATABASE,
        schema: 'NORTHWIND',
        table: 'ORDERS',
        schemaSnapshot: [
          {
            name: 'ORDER_ID',
            type: { path: `${PRECISE}SmallInt` },
            nullable: false,
          },
          {
            name: 'CUSTOMER_ID',
            type: { path: `${PRECISE}Varchar`, params: [5] },
            nullable: true,
          },
          { name: 'ORDER_DATE', type: { path: 'StrictDate' }, nullable: true },
        ],
      },
      {
        kind: 'relational',
        id: 'relational102',
        database: TEST_DATABASE,
        schema: 'NORTHWIND',
        table: 'CUSTOMERS',
        schemaSnapshot: [
          {
            name: 'CUSTOMER_ID',
            type: { path: `${PRECISE}Varchar`, params: [5] },
            nullable: false,
          },
          {
            name: 'COUNTRY',
            type: { path: `${PRECISE}Varchar`, params: [15] },
            nullable: true,
          },
        ],
      },
      {
        kind: 'join',
        id: 'join101',
        inputs: ['relational101', 'relational102'],
        joinType: 'INNER',
        leftColumns: ['CUSTOMER_ID'],
        rightColumns: ['CUSTOMER_ID'],
      },
      {
        kind: 'filter',
        id: 'filter101',
        inputs: ['join101'],
        filter: {
          op: 'and',
          rules: [
            {
              column: 'COUNTRY',
              operator: 'Equal',
              value: { kind: 'string', value: 'France' },
            },
            {
              column: 'ORDER_DATE',
              operator: 'GreaterThanOrEqual',
              value: { kind: 'strictDate', value: '1997-01-01' },
            },
            {
              column: 'ORDER_ID',
              operator: 'In',
              value: [
                { kind: 'integer', value: '1' },
                { kind: 'integer', value: '4' },
              ],
            },
          ],
        },
      },
    ],
  },
  meta: {
    presentation: {
      showGraph: false,
      columnWidths: [{ column: 'COUNTRY', width: 180 }],
    },
  },
};

// ---------------------------------------- tests ----------------------------------------

describe(unitTest('Saved spec encoding: document'), () => {
  test('Encodes an empty document as its format version and no nodes', () => {
    // R20, R30: an empty query has no `selected`; no name, context or meta
    expectEncoded(new CubeDocument(), {
      formatVersion: 1,
      query: { nodes: [] },
    });
  });

  test('Encodes a whole document with its keys in the order of PLAN §10.3', () => {
    // R4, R10, R14, R18, R34, R41, R49, R64, R70, R74, R75, R89, R144
    expectEncoded(SLICE, SLICE_SPEC);
  });

  test('Writes the name second, and keeps an empty name', () => {
    // R10: name is top level, after formatVersion; '' is kept as written
    expectEncoded(new CubeDocument({ name: 'My cube' }), {
      formatVersion: 1,
      name: 'My cube',
      query: { nodes: [] },
    });
    expectEncoded(new CubeDocument({ name: '' }), {
      formatVersion: 1,
      name: '',
      query: { nodes: [] },
    });
  });

  test('Writes the model as it is, and the runtime', () => {
    // R12, R14: the model is the engine's model context, of any kind (PLAN §6.2.2)
    const pointer: ModelContext = {
      _type: 'pointer',
      sdlcInfo: {
        _type: 'alloy',
        groupId: 'org.finos.legend',
        artifactId: 'northwind',
        version: '1.0.0',
        packageableElementPointers: [],
      },
    };
    [TEXT_MODEL, pointer, { _type: 'composite' }].forEach((model) => {
      expectEncoded(
        new CubeDocument({ context: { model, runtime: RUNTIME } }),
        {
          formatVersion: 1,
          context: { model, runtime: RUNTIME },
          query: { nodes: [] },
        },
      );
    });
  });

  test('Leaves out a runtime that is not set', () => {
    // R14
    expectEncoded(new CubeDocument({ context: { model: TEXT_MODEL } }), {
      formatVersion: 1,
      context: { model: TEXT_MODEL },
      query: { nodes: [] },
    });
  });

  test('Leaves out meta when the presentation is at its defaults', () => {
    // R116, R117, R118: showGraph true and no column widths
    expectEncoded(new CubeDocument({ meta: DEFAULT_META }), {
      formatVersion: 1,
      query: { nodes: [] },
    });
    const defaults: CubeMeta = {
      presentation: { showGraph: true, columnWidths: [] },
    };
    expect(encodeCubeSpec(new CubeDocument({ meta: defaults }))).toStrictEqual({
      formatVersion: 1,
      query: { nodes: [] },
    });
  });

  test('Leaves out a presentation at its defaults when meta has other keys', () => {
    // R118: meta is written for its other keys, with no `presentation`
    const presentations: Presentation[] = [
      DEFAULT_META.presentation,
      { showGraph: true, columnWidths: [] },
    ];
    presentations.forEach((presentation) => {
      expectEncoded(
        new CubeDocument({
          meta: { presentation, rest: { drilldown: { levels: ['CITY'] } } },
        }),
        {
          formatVersion: 1,
          query: { nodes: [] },
          meta: { drilldown: { levels: ['CITY'] } },
        },
      );
    });
  });

  test('Reads a meta without a presentation as the default presentation, and saves it back the same', () => {
    // R115: presentation is optional; the other keys of meta are kept
    const json: JsonObject = {
      formatVersion: 1,
      query: { nodes: [] },
      meta: { drilldown: { levels: ['CITY'] } },
    };
    const { document } = decodeCubeSpec(json);
    expect(document.meta.presentation).toStrictEqual({
      showGraph: true,
      columnWidths: [],
    });
    expect(document.meta.rest).toStrictEqual({
      drilldown: { levels: ['CITY'] },
    });
    expect(JSON.stringify(encodeCubeSpec(document))).toBe(JSON.stringify(json));
  });

  test('Writes showGraph only when it is false', () => {
    // R116
    expectEncoded(
      new CubeDocument({
        meta: { presentation: { showGraph: false, columnWidths: [] } },
      }),
      {
        formatVersion: 1,
        query: { nodes: [] },
        meta: { presentation: { showGraph: false } },
      },
    );
  });

  test('Reads an explicit showGraph true as shown, and leaves it out when saving', () => {
    // R116: as a hand-edited spec or another writer may have it
    const shown = parseCubeSpec(
      '{"formatVersion": 1, "query": {"nodes": []}, "meta": {"presentation": {"showGraph": true}}}',
    ).document;
    expect(shown.meta.presentation.showGraph).toBe(true);
    expect(encodeCubeSpec(shown)).toStrictEqual({
      formatVersion: 1,
      query: { nodes: [] },
    });
    const widths = [{ column: 'CITY', width: 90 }];
    const withWidths = decodeCubeSpec({
      formatVersion: 1,
      query: { nodes: [] },
      meta: { presentation: { showGraph: true, columnWidths: widths } },
    }).document;
    expect(withWidths.meta.presentation.showGraph).toBe(true);
    expect(encodeCubeSpec(withWidths)).toStrictEqual({
      formatVersion: 1,
      query: { nodes: [] },
      meta: { presentation: { columnWidths: widths } },
    });
  });

  test('Writes column widths as a list of {column, width}, only when there are some', () => {
    // R117
    expectEncoded(
      new CubeDocument({
        meta: {
          presentation: {
            showGraph: true,
            columnWidths: [
              { column: 'COMPANY_NAME', width: 180 },
              { column: 'CITY', width: 95.5 },
            ],
          },
        },
      }),
      {
        formatVersion: 1,
        query: { nodes: [] },
        meta: {
          presentation: {
            columnWidths: [
              { column: 'COMPANY_NAME', width: 180 },
              { column: 'CITY', width: 95.5 },
            ],
          },
        },
      },
    );
  });
});

describe(unitTest('Saved spec encoding: query graph'), () => {
  test('Keeps the node order, the capture node and the connections', () => {
    // R19, R22, R23, R35: the right input listed first in the node order,
    // and a capture node that is not the last node
    const document = documentOf(
      [
        table('relational101', 'ORDERS'),
        table('relational102', 'CUSTOMERS'),
        new Join('join101', { joinType: JoinType.INNER }),
      ],
      [
        edge('relational102', 'join101', 'leftTds'),
        edge('relational101', 'join101', 'rightTds'),
      ],
      'relational102',
    );
    expectEncoded(document, {
      formatVersion: 1,
      query: {
        selected: 'relational102',
        nodes: [
          tableSpec('relational101', 'ORDERS'),
          tableSpec('relational102', 'CUSTOMERS'),
          {
            kind: 'join',
            id: 'join101',
            inputs: ['relational102', 'relational101'],
            joinType: 'INNER',
            leftColumns: [],
            rightColumns: [],
          },
        ],
      },
    });
    expect(
      decodeCubeSpec(encodeCubeSpec(document))
        .document.query.connections.map((connection) => connection.toString())
        .sort(),
    ).toEqual(
      document.query.connections
        .map((connection) => connection.toString())
        .sort(),
    );
  });

  test('Keeps a node listed before the node that feeds it', () => {
    // R28: a forward reference; R32: an id that is not <type><n> is kept
    const document = documentOf(
      [new Filter('filter101'), table('orders', 'ORDERS')],
      [edge('orders', 'filter101', 'tds')],
      'filter101',
    );
    expectEncoded(document, {
      formatVersion: 1,
      query: {
        selected: 'filter101',
        nodes: [
          { kind: 'filter', id: 'filter101', inputs: ['orders'] },
          tableSpec('orders', 'ORDERS'),
        ],
      },
    });
  });

  test('Writes null for an unconnected port', () => {
    // R35, R147
    expectEncoded(
      documentOf(
        [table('relational101', 'ORDERS'), new Join('join101')],
        [edge('relational101', 'join101', 'rightTds')],
        'join101',
      ),
      {
        formatVersion: 1,
        query: {
          selected: 'join101',
          nodes: [
            tableSpec('relational101', 'ORDERS'),
            {
              kind: 'join',
              id: 'join101',
              inputs: [null, 'relational101'],
              joinType: 'LEFT_OUTER',
              leftColumns: [],
              rightColumns: [],
            },
          ],
        },
      },
    );
  });

  test("Refuses to save a node whose type the registry doesn't know", () => {
    // C82: never a bare {kind, id} that loses the node's inputs and settings
    const document = documentOf(
      [
        table('relational101', 'ORDERS'),
        new Filter('filter101', compare('COUNTRY', O.EQUAL, FRANCE)),
      ],
      [edge('relational101', 'filter101', 'tds')],
      'filter101',
    );
    expect(() =>
      encodeCubeSpec(
        document,
        new NodeRegistry([RELATIONAL_TABLE_SOURCE_DEFINITION]),
      ),
    ).toThrow(
      new Error(`Can't save node "filter101": its type "filter" is unknown`),
    );
  });
});

describe(unitTest('Saved spec encoding: relational sources'), () => {
  test('Leaves out the snapshot of an unresolved source, and inputs', () => {
    // R36, R41, R51
    expectEncoded(
      documentOf([table('relational101', 'ORDERS')], [], 'relational101'),
      {
        formatVersion: 1,
        query: {
          selected: 'relational101',
          nodes: [tableSpec('relational101', 'ORDERS')],
        },
      },
    );
  });

  test('Leaves out the snapshot of a failed source, which reads back unresolved', () => {
    // R142: a failed resolution has no encoding, and decodes as unresolved
    const failed = table('relational101', 'ORDERS').withResolution({
      kind: 'failed',
      message: 'Table "ORDERS" was not found',
    });
    const document = documentOf([failed], [], 'relational101');
    const encoded = encodeCubeSpec(document);
    const expected: JsonObject = {
      formatVersion: 1,
      query: {
        selected: 'relational101',
        nodes: [tableSpec('relational101', 'ORDERS')],
      },
    };
    expect(encoded).toStrictEqual(expected);
    expect(JSON.stringify(encoded)).toBe(JSON.stringify(expected));
    const decoded = decodeCubeSpec(encoded).document;
    expect(
      (decoded.query.getNode('relational101') as RelationalTableSource)
        .resolution,
    ).toEqual(UNRESOLVED);
    expect(describeDocument(decoded)).toEqual(
      describeDocument(
        documentOf([failed.withResolution(UNRESOLVED)], [], 'relational101'),
      ),
    );
    expect(JSON.stringify(encodeCubeSpec(decoded))).toBe(
      JSON.stringify(encoded),
    );
  });

  test('Keeps quoted and dotted schema and table names verbatim', () => {
    // R44, R45
    const document = documentOf(
      [
        new RelationalTableSource('relational101', {
          database: TEST_DATABASE,
          schema: '"My.Schema"',
          table: '"a.b"',
        }),
      ],
      [],
      'relational101',
    );
    expectEncoded(document, {
      formatVersion: 1,
      query: {
        selected: 'relational101',
        nodes: [
          {
            kind: 'relational',
            id: 'relational101',
            database: TEST_DATABASE,
            schema: '"My.Schema"',
            table: '"a.b"',
          },
        ],
      },
    });
    expect(serializeCubeSpec(document)).toContain(
      '"schema": "\\"My.Schema\\"",\n',
    );
  });

  describe('schema snapshots', () => {
    const SOURCE = resolvedTable('relational101', 'ORDERS', [
      column('ORDER_ID', `${PRECISE}Int`),
      // a short name in memory is still written in full
      column('CUSTOMER_ID', 'Varchar', true, [5]),
      column('FREIGHT', `${PRECISE}Numeric`, false, [10, 2]),
      column('CODE', `${PRECISE}Varchar`, false, [0]),
      column('ORDER_DATE', 'StrictDate', true),
      column('PAYLOAD', VARIANT, true),
      enumColumn('REGION', 'trading::Region', ['EMEA', 'APAC', 'AMER'], true),
      new SchemaColumn(
        'SHAPE',
        OpaqueType.get('my::geo::Polygon', [3, 7]),
        false,
      ),
      // precise paths whose parameters don't fit are opaque, as resolved
      new SchemaColumn('NOTE', OpaqueType.get(`${PRECISE}Varchar`), true),
      new SchemaColumn(
        'AMOUNT',
        OpaqueType.get(`${PRECISE}Numeric`, [10]),
        false,
      ),
    ]);
    const SNAPSHOT_SPEC: JsonObject = {
      formatVersion: 1,
      query: {
        selected: 'relational101',
        nodes: [
          {
            ...tableSpec('relational101', 'ORDERS'),
            schemaSnapshot: [
              {
                name: 'ORDER_ID',
                type: { path: `${PRECISE}Int` },
                nullable: false,
              },
              {
                name: 'CUSTOMER_ID',
                type: { path: `${PRECISE}Varchar`, params: [5] },
                nullable: true,
              },
              {
                name: 'FREIGHT',
                type: { path: `${PRECISE}Numeric`, params: [10, 2] },
                nullable: false,
              },
              {
                name: 'CODE',
                type: { path: `${PRECISE}Varchar`, params: [0] },
                nullable: false,
              },
              {
                name: 'ORDER_DATE',
                type: { path: 'StrictDate' },
                nullable: true,
              },
              { name: 'PAYLOAD', type: { path: VARIANT }, nullable: true },
              {
                name: 'REGION',
                type: {
                  path: 'trading::Region',
                  values: ['EMEA', 'APAC', 'AMER'],
                },
                nullable: true,
              },
              {
                name: 'SHAPE',
                type: { path: 'my::geo::Polygon', params: [3, 7] },
                nullable: false,
              },
              {
                name: 'NOTE',
                type: { path: `${PRECISE}Varchar` },
                nullable: true,
              },
              {
                name: 'AMOUNT',
                type: { path: `${PRECISE}Numeric`, params: [10] },
                nullable: false,
              },
            ],
          },
        ],
      },
    };

    test('Writes every column in order as {name, type, nullable}, types as {path, params?} or {path, values}', () => {
      // R49, R53, R54, R55, R56, R58, R61 (enum as {path, values}), params left out when there are none
      expectEncoded(documentOf([SOURCE], [], 'relational101'), SNAPSHOT_SPEC);
    });

    test('Reads back the same columns and types, enumeration values included', () => {
      // R50, R56, R141
      const schema = decodedSchema(SNAPSHOT_SPEC, 'relational101');
      expect(
        schema.columns.map((schemaColumn) => [
          schemaColumn.name,
          schemaColumn.nullable,
        ]),
      ).toEqual([
        ['ORDER_ID', false],
        ['CUSTOMER_ID', true],
        ['FREIGHT', false],
        ['CODE', false],
        ['ORDER_DATE', true],
        ['PAYLOAD', true],
        ['REGION', true],
        ['SHAPE', false],
        ['NOTE', true],
        ['AMOUNT', false],
      ]);
      const [
        orderId,
        customerId,
        freight,
        code,
        orderDate,
        payload,
        region,
        shape,
        note,
        amount,
      ] = schema.columns.map((schemaColumn) => schemaColumn.type);
      expect(orderId).toBe(PrimitiveType.get(`${PRECISE}Int`));
      expect(customerId).toBe(PrimitiveType.get(`${PRECISE}Varchar`, [5]));
      expect(freight).toBe(PrimitiveType.get(`${PRECISE}Numeric`, [10, 2]));
      expect(code).toBe(PrimitiveType.get(`${PRECISE}Varchar`, [0]));
      expect(orderDate).toBe(PrimitiveType.get('StrictDate'));
      expect(payload).toBe(PrimitiveType.get(VARIANT));
      expect(region).toBeInstanceOf(EnumType);
      expect((region as EnumType).path).toBe('trading::Region');
      expect((region as EnumType).values).toEqual(['EMEA', 'APAC', 'AMER']);
      expect(shape).toBe(OpaqueType.get('my::geo::Polygon', [3, 7]));
      expect(note).toBe(OpaqueType.get(`${PRECISE}Varchar`));
      expect(amount).toBe(OpaqueType.get(`${PRECISE}Numeric`, [10]));
    });

    test('Reads a short type name as its canonical type, which is written in full', () => {
      // R57
      const json: JsonObject = {
        formatVersion: 1,
        query: {
          selected: 'relational101',
          nodes: [
            {
              ...tableSpec('relational101', 'ORDERS'),
              schemaSnapshot: [
                {
                  name: 'CUSTOMER_ID',
                  type: { path: 'Varchar', params: [5] },
                  nullable: true,
                },
              ],
            },
          ],
        },
      };
      const [type] = decodedSchema(json, 'relational101').columns.map(
        (schemaColumn) => schemaColumn.type,
      );
      expect(type).toBe(PrimitiveType.get(`${PRECISE}Varchar`, [5]));
      expect(encodeCubeSpec(decodeCubeSpec(json).document)).toStrictEqual({
        formatVersion: 1,
        query: {
          selected: 'relational101',
          nodes: [
            {
              ...tableSpec('relational101', 'ORDERS'),
              schemaSnapshot: [
                {
                  name: 'CUSTOMER_ID',
                  type: { path: `${PRECISE}Varchar`, params: [5] },
                  nullable: true,
                },
              ],
            },
          ],
        },
      });
    });

    /** A source whose snapshot has one nullable column `C<n>` per type */
    const typesSpec = (types: readonly JsonObject[]): JsonObject => ({
      formatVersion: 1,
      query: {
        selected: 'relational101',
        nodes: [
          {
            ...tableSpec('relational101', 'ORDERS'),
            schemaSnapshot: types.map((type, index) => ({
              name: `C${index}`,
              type,
              nullable: true,
            })),
          },
        ],
      },
    });
    const resaved = (json: JsonObject): string =>
      JSON.stringify(encodeCubeSpec(decodeCubeSpec(json).document));

    test('Re-saves a type it does not know as written, whatever was read before it', () => {
      // R56: a path with parentheses is not the path with parameters, in
      // either order within a document
      [
        [{ path: 'my::Foo(1)' }, { path: 'my::Foo', params: [1] }],
        [{ path: 'my::Bar', params: [1, 2] }, { path: 'my::Bar(1,2)' }],
      ].forEach((types) => {
        expect(resaved(typesSpec(types))).toBe(
          JSON.stringify(typesSpec(types)),
        );
      });
      // nor across documents: types are shared by every document read
      const earlier = typesSpec([{ path: 'my::geo::Line(4)' }]);
      const later = typesSpec([{ path: 'my::geo::Line', params: [4] }]);
      expect(resaved(earlier)).toBe(JSON.stringify(earlier));
      expect(resaved(later)).toBe(JSON.stringify(later));
    });

    test("Keeps parameters that don't fit a known type as written, as an opaque type", () => {
      // R56: negative, fractional or too many parameters
      const types = [
        { path: `${PRECISE}Varchar`, params: [-1] },
        { path: `${PRECISE}Varchar`, params: [1.5] },
        { path: `${PRECISE}Varchar`, params: [5, 6] },
        { path: `${PRECISE}Numeric`, params: [10, -2] },
      ];
      const json = typesSpec(types);
      expect(
        decodedSchema(json, 'relational101').columns.map(
          (schemaColumn) => schemaColumn.type,
        ),
      ).toEqual(types.map(({ path, params }) => OpaqueType.get(path, params)));
      expect(resaved(json)).toBe(JSON.stringify(json));
    });

    test('Keeps column names that Pure would quote verbatim, unquoted, in the snapshot and in a rule', () => {
      // R60: names are stored as lambdaRelationType returns them, never
      // quoted or unquoted the way Pure writes them (unlike R44, R45)
      const NAMES = [
        'Unit Price',
        'ORDER ID.v2',
        "O'Brien",
        "'Freight'",
        '"Ship Via"',
      ];
      const json: JsonObject = {
        formatVersion: 1,
        query: {
          selected: 'filter101',
          nodes: [
            {
              ...tableSpec('relational101', 'ORDERS'),
              schemaSnapshot: NAMES.map((name) => ({
                name,
                type: { path: `${PRECISE}Int` },
                nullable: false,
              })),
            },
            {
              kind: 'filter',
              id: 'filter101',
              inputs: ['relational101'],
              filter: {
                column: 'Unit Price',
                operator: 'GreaterThan',
                value: { kind: 'integer', value: '5' },
              },
            },
          ],
        },
      };
      expectEncoded(
        documentOf(
          [
            resolvedTable(
              'relational101',
              'ORDERS',
              NAMES.map((name) => column(name, `${PRECISE}Int`)),
            ),
            new Filter(
              'filter101',
              compare('Unit Price', O.GREATER_THAN, {
                kind: 'integer',
                value: '5',
              }),
            ),
          ],
          [edge('relational101', 'filter101', 'tds')],
          'filter101',
        ),
        json,
      );
      expect(
        decodedSchema(json, 'relational101').columns.map(
          (schemaColumn) => schemaColumn.name,
        ),
      ).toEqual(NAMES);
    });
  });
});

describe(unitTest('Saved spec encoding: joins'), () => {
  test('Always writes the join type and the key lists, defaults and empty lists included', () => {
    // R64, R66: a new join is LEFT_OUTER with no keys
    expectEncoded(documentOf([new Join('join101')], [], 'join101'), {
      formatVersion: 1,
      query: {
        selected: 'join101',
        nodes: [
          {
            kind: 'join',
            id: 'join101',
            inputs: [null, null],
            joinType: 'LEFT_OUTER',
            leftColumns: [],
            rightColumns: [],
          },
        ],
      },
    });
  });

  test.each([
    [JoinType.INNER, 'INNER'],
    [JoinType.LEFT_OUTER, 'LEFT_OUTER'],
    [JoinType.RIGHT_OUTER, 'RIGHT_OUTER'],
    [JoinType.FULL_OUTER, 'FULL_OUTER'],
  ])('Spells the join type %s as %s', (joinType, spelling) => {
    // R65
    expectEncoded(
      documentOf([new Join('join101', { joinType })], [], 'join101'),
      {
        formatVersion: 1,
        query: {
          selected: 'join101',
          nodes: [
            {
              kind: 'join',
              id: 'join101',
              inputs: [null, null],
              joinType: spelling,
              leftColumns: [],
              rightColumns: [],
            },
          ],
        },
      },
    );
  });

  test('Keeps key lists exactly, even when they differ in length, repeat or hold a blank', () => {
    // R67
    expectEncoded(
      documentOf(
        [
          new Join('join101', {
            joinType: JoinType.FULL_OUTER,
            leftColumns: ['B', 'A', 'A', ''],
            rightColumns: ['X'],
          }),
        ],
        [],
        'join101',
      ),
      {
        formatVersion: 1,
        query: {
          selected: 'join101',
          nodes: [
            {
              kind: 'join',
              id: 'join101',
              inputs: [null, null],
              joinType: 'FULL_OUTER',
              leftColumns: ['B', 'A', 'A', ''],
              rightColumns: ['X'],
            },
          ],
        },
      },
    );
  });

  test('Writes a swapped join as it stands, with no swapped flag', () => {
    // R68
    const swapped = new Join('join101', {
      joinType: JoinType.RIGHT_OUTER,
      leftColumns: ['ORDER_ID'],
      rightColumns: ['ID'],
    }).withSwappedInputs();
    expectEncoded(documentOf([swapped], [], 'join101'), {
      formatVersion: 1,
      query: {
        selected: 'join101',
        nodes: [
          {
            kind: 'join',
            id: 'join101',
            inputs: [null, null],
            joinType: 'RIGHT_OUTER',
            leftColumns: ['ID'],
            rightColumns: ['ORDER_ID'],
          },
        ],
      },
    });
  });
});

describe(unitTest('Saved spec encoding: filters'), () => {
  test('Leaves out the filter of a filter node that has none', () => {
    // R71
    expectEncoded(filterDocument(undefined), {
      formatVersion: 1,
      query: {
        selected: 'filter101',
        nodes: [{ kind: 'filter', id: 'filter101', inputs: [null] }],
      },
    });
  });

  // R89–R98: every value kind, written {kind, value} or {kind: 'invalid', text}
  const VALUES: [string, FilterValueItem, JsonObject][] = [
    [
      'a string with quotes',
      { kind: 'string', value: 'say "hi"' },
      { kind: 'string', value: 'say "hi"' },
    ],
    [
      'a string with a backslash',
      { kind: 'string', value: 'C:\\temp' },
      { kind: 'string', value: 'C:\\temp' },
    ],
    [
      'a string with a newline',
      { kind: 'string', value: 'line 1\nline 2' },
      { kind: 'string', value: 'line 1\nline 2' },
    ],
    [
      'an empty string',
      { kind: 'string', value: '' },
      { kind: 'string', value: '' },
    ],
    [
      'a string with untrimmed spaces',
      { kind: 'string', value: '  France ' },
      { kind: 'string', value: '  France ' },
    ],
    [
      'a boolean true',
      { kind: 'boolean', value: true },
      { kind: 'boolean', value: true },
    ],
    [
      'a boolean false',
      { kind: 'boolean', value: false },
      { kind: 'boolean', value: false },
    ],
    [
      'an integer past the safe range',
      { kind: 'integer', value: '9007199254740993' },
      { kind: 'integer', value: '9007199254740993' },
    ],
    [
      'a float',
      { kind: 'float', value: '-1.5e3' },
      { kind: 'float', value: '-1.5e3' },
    ],
    [
      'a decimal with more digits than a double holds',
      { kind: 'decimal', value: '0.10000000000000000001' },
      { kind: 'decimal', value: '0.10000000000000000001' },
    ],
    [
      'a strict date',
      { kind: 'strictDate', value: '1997-01-01' },
      { kind: 'strictDate', value: '1997-01-01' },
    ],
    [
      'a date-time',
      { kind: 'dateTime', value: '1997-01-01T08:30:00.123456789' },
      { kind: 'dateTime', value: '1997-01-01T08:30:00.123456789' },
    ],
    [
      'an enum value',
      { kind: 'enum', value: 'EMEA' },
      { kind: 'enum', value: 'EMEA' },
    ],
    [
      'invalid text',
      { kind: 'invalid', text: '12,5 €' },
      { kind: 'invalid', text: '12,5 €' },
    ],
    [
      'invalid text with spaces, quotes and a backslash',
      { kind: 'invalid', text: ' "x" \\ ' },
      { kind: 'invalid', text: ' "x" \\ ' },
    ],
    [
      'invalid text that is empty',
      { kind: 'invalid', text: '' },
      { kind: 'invalid', text: '' },
    ],
    [
      'a non-canonical integer with a leading zero',
      { kind: 'integer', value: '007' },
      { kind: 'integer', value: '007' },
    ],
    [
      'a non-canonical integer with a plus sign',
      { kind: 'integer', value: '+5' },
      { kind: 'integer', value: '+5' },
    ],
    [
      'a date-time ending in Z',
      { kind: 'dateTime', value: '1997-01-01T08:30:00Z' },
      { kind: 'dateTime', value: '1997-01-01T08:30:00Z' },
    ],
  ];

  test.each(VALUES)('Saves %s exactly as written', (_, item, json) => {
    expectEncoded(
      filterDocument(compare('X', O.EQUAL, item)),
      filterSpec({ column: 'X', operator: 'Equal', value: json }),
    );
  });

  test('Writes a boolean as a JSON boolean and numbers as JSON strings', () => {
    // R91, R92
    const text = serializeCubeSpec(
      filterDocument(
        and(
          compare('ACTIVE', O.EQUAL, { kind: 'boolean', value: true }),
          compare('ID', O.EQUAL, {
            kind: 'integer',
            value: '9007199254740993',
          }),
        ),
      ),
    );
    expect(text).toContain('"value": true\n');
    expect(text).toContain('"value": "9007199254740993"\n');
  });

  // R72, R81, R82, R83, R87, R88: rules are written as the node holds them,
  // valid or not, and never normalized
  const RULES: [string, FilterRule, JsonValue][] = [
    [
      'a bare comparison at the root',
      compare('COUNTRY', O.EQUAL, FRANCE),
      {
        column: 'COUNTRY',
        operator: 'Equal',
        value: { kind: 'string', value: 'France' },
      },
    ],
    [
      'a list on In',
      compare('ID', O.IN, [
        { kind: 'integer', value: '1' },
        { kind: 'invalid', text: 'two' },
        { kind: 'integer', value: '3' },
      ]),
      {
        column: 'ID',
        operator: 'In',
        value: [
          { kind: 'integer', value: '1' },
          { kind: 'invalid', text: 'two' },
          { kind: 'integer', value: '3' },
        ],
      },
    ],
    [
      'a list on Equal',
      compare('COUNTRY', O.EQUAL, [FRANCE, { kind: 'string', value: 'Spain' }]),
      {
        column: 'COUNTRY',
        operator: 'Equal',
        value: [
          { kind: 'string', value: 'France' },
          { kind: 'string', value: 'Spain' },
        ],
      },
    ],
    [
      'a single item on In',
      compare('COUNTRY', O.IN, FRANCE),
      {
        column: 'COUNTRY',
        operator: 'In',
        value: { kind: 'string', value: 'France' },
      },
    ],
    [
      'a one-item list on In',
      compare('COUNTRY', O.IN, [FRANCE]),
      {
        column: 'COUNTRY',
        operator: 'In',
        value: [{ kind: 'string', value: 'France' }],
      },
    ],
    [
      'a one-item list on NotIn',
      compare('COUNTRY', O.NOT_IN, [FRANCE]),
      {
        column: 'COUNTRY',
        operator: 'NotIn',
        value: [{ kind: 'string', value: 'France' }],
      },
    ],
    [
      'an empty list on NotIn',
      compare('COUNTRY', O.NOT_IN, []),
      { column: 'COUNTRY', operator: 'NotIn', value: [] },
    ],
    [
      'no value on IsEmpty',
      compare('COUNTRY', O.IS_EMPTY),
      { column: 'COUNTRY', operator: 'IsEmpty' },
    ],
    [
      'a stray value on IsEmpty',
      compare('COUNTRY', O.IS_EMPTY, FRANCE),
      {
        column: 'COUNTRY',
        operator: 'IsEmpty',
        value: { kind: 'string', value: 'France' },
      },
    ],
    [
      'a missing value on Equal',
      compare('COUNTRY', O.EQUAL),
      { column: 'COUNTRY', operator: 'Equal' },
    ],
    ['a blank column', compare('', O.EQUAL), { column: '', operator: 'Equal' }],
    [
      'a backslash in a Contains value',
      compare('NAME', O.CONTAINS, { kind: 'string', value: 'a\\b' }),
      {
        column: 'NAME',
        operator: 'Contains',
        value: { kind: 'string', value: 'a\\b' },
      },
    ],
    ['an empty group', and(), { op: 'and', rules: [] }],
    [
      'a group with one rule',
      or(compare('COUNTRY', O.EQUAL, FRANCE)),
      {
        op: 'or',
        rules: [
          {
            column: 'COUNTRY',
            operator: 'Equal',
            value: { kind: 'string', value: 'France' },
          },
        ],
      },
    ],
    [
      'nested single-rule groups',
      and(or(and(compare('COUNTRY', O.IS_NOT_EMPTY)))),
      {
        op: 'and',
        rules: [
          {
            op: 'or',
            rules: [
              {
                op: 'and',
                rules: [{ column: 'COUNTRY', operator: 'IsNotEmpty' }],
              },
            ],
          },
        ],
      },
    ],
    [
      'Not around GreaterThan',
      not(compare('FREIGHT', O.GREATER_THAN, { kind: 'float', value: '5' })),
      {
        op: 'not',
        rule: {
          column: 'FREIGHT',
          operator: 'GreaterThan',
          value: { kind: 'float', value: '5' },
        },
      },
    ],
    [
      'Not around a group',
      not(
        or(
          compare('COUNTRY', O.EQUAL, FRANCE),
          compare('CITY', O.STARTS_WITH, { kind: 'string', value: 'Ber' }),
        ),
      ),
      {
        op: 'not',
        rule: {
          op: 'or',
          rules: [
            {
              column: 'COUNTRY',
              operator: 'Equal',
              value: { kind: 'string', value: 'France' },
            },
            {
              column: 'CITY',
              operator: 'StartsWith',
              value: { kind: 'string', value: 'Ber' },
            },
          ],
        },
      },
    ],
    [
      'Not around Equal (not rewritten to NotEqual)',
      not(compare('COUNTRY', O.EQUAL, FRANCE)),
      {
        op: 'not',
        rule: {
          column: 'COUNTRY',
          operator: 'Equal',
          value: { kind: 'string', value: 'France' },
        },
      },
    ],
    [
      'Not around Not',
      not(not(compare('ID', O.LESS_THAN, { kind: 'integer', value: '10' }))),
      {
        op: 'not',
        rule: {
          op: 'not',
          rule: {
            column: 'ID',
            operator: 'LessThan',
            value: { kind: 'integer', value: '10' },
          },
        },
      },
    ],
    [
      'an unsupported rule in a group',
      and(
        compare('COUNTRY', O.EQUAL, FRANCE),
        new UnsupportedFilter({
          column: 'FREIGHT',
          operator: 'Between',
          value: [null, { kind: 'float', value: '5' }],
        }),
      ),
      {
        op: 'and',
        rules: [
          {
            column: 'COUNTRY',
            operator: 'Equal',
            value: { kind: 'string', value: 'France' },
          },
          {
            column: 'FREIGHT',
            operator: 'Between',
            value: [null, { kind: 'float', value: '5' }],
          },
        ],
      },
    ],
  ];

  test.each(RULES)('Saves %s as the node holds it', (_, rule, json) => {
    expectEncoded(filterDocument(rule), filterSpec(json));
  });

  test('Reads a one-item In or NotIn list as a list, not as its item', () => {
    // R87: the most common In, one value picked
    [O.IN, O.NOT_IN].forEach((operator) => {
      const { filter } = decodeCubeSpec(
        filterSpec({
          column: 'COUNTRY',
          operator,
          value: [{ kind: 'string', value: 'France' }],
        }),
      ).document.query.getNode('filter101') as Filter;
      expect(filter).toBeInstanceOf(ColumnComparisonFilter);
      expect((filter as ColumnComparisonFilter).value).toStrictEqual([FRANCE]);
    });
  });

  test('Spells every operator as its name', () => {
    // R78, R79
    const SPELLINGS: [FilterOperator, string][] = [
      [O.EQUAL, 'Equal'],
      [O.NOT_EQUAL, 'NotEqual'],
      [O.GREATER_THAN, 'GreaterThan'],
      [O.GREATER_THAN_OR_EQUAL, 'GreaterThanOrEqual'],
      [O.LESS_THAN, 'LessThan'],
      [O.LESS_THAN_OR_EQUAL, 'LessThanOrEqual'],
      [O.STARTS_WITH, 'StartsWith'],
      [O.DOES_NOT_START_WITH, 'DoesNotStartWith'],
      [O.ENDS_WITH, 'EndsWith'],
      [O.DOES_NOT_END_WITH, 'DoesNotEndWith'],
      [O.CONTAINS, 'Contains'],
      [O.DOES_NOT_CONTAIN, 'DoesNotContain'],
      [O.IN, 'In'],
      [O.NOT_IN, 'NotIn'],
      [O.IS_EMPTY, 'IsEmpty'],
      [O.IS_NOT_EMPTY, 'IsNotEmpty'],
    ];
    expectEncoded(
      filterDocument(
        or(...SPELLINGS.map(([operator]) => compare('X', operator))),
      ),
      filterSpec({
        op: 'or',
        rules: SPELLINGS.map(([, spelling]) => ({
          column: 'X',
          operator: spelling,
        })),
      }),
    );
  });
});

describe(unitTest('Saved spec encoding: limits'), () => {
  /** The saved spec of one unconnected limit, `limit101`, with these fields of its own */
  const limitSpec = (own: JsonObject): JsonObject => ({
    formatVersion: 1,
    query: {
      selected: 'limit101',
      nodes: [{ kind: 'limit', id: 'limit101', inputs: [null], ...own }],
    },
  });

  test('Writes the size of a new limit, the default included', () => {
    expectEncoded(
      documentOf([LIMIT_DEFINITION.create('limit101')], [], 'limit101'),
      limitSpec({ size: 10 }),
    );
  });

  test('Leaves out a cleared size, so it reads back cleared, never as the default', () => {
    const document = documentOf(
      [new Limit('limit101', undefined)],
      [],
      'limit101',
    );
    expectEncoded(document, limitSpec({}));
    const decoded = decodeCubeSpec(encodeCubeSpec(document)).document;
    expect((decoded.query.getNode('limit101') as Limit).size).toBeUndefined();
  });

  test.each([0, -3, 1.5, 2 ** 60])(
    'Writes the size %s as it stands, for validation to report',
    (size) => {
      expectEncoded(
        documentOf([new Limit('limit101', size)], [], 'limit101'),
        limitSpec({ size }),
      );
    },
  );

  test('Writes the size from the node, not from its rest', () => {
    // R113
    const document = documentOf(
      [new Limit('limit101', 5, { size: 99, kind: 'drop', note: 'top five' })],
      [],
      'limit101',
    );
    expect(encodeCubeSpec(document)).toStrictEqual(
      limitSpec({ size: 5, note: 'top five' }),
    );
  });
});

describe(unitTest('Saved spec encoding: sorts'), () => {
  /** The saved spec of one unconnected sort, `sort101`, with these fields of its own */
  const sortSpec = (own: JsonObject): JsonObject => ({
    formatVersion: 1,
    query: {
      selected: 'sort101',
      nodes: [{ kind: 'sort', id: 'sort101', inputs: [null], ...own }],
    },
  });

  test('Always writes its keys, an empty list included', () => {
    expectEncoded(
      documentOf([new Sort('sort101')], [], 'sort101'),
      sortSpec({ sorts: [] }),
    );
  });

  test('Writes each key as column, then direction, in order, blanks and repeats kept', () => {
    expectEncoded(
      documentOf(
        [
          new Sort('sort101', [
            { column: 'SHIP_COUNTRY', direction: SortDirection.DESC },
            { column: '', direction: SortDirection.ASC },
            { column: 'SHIP_COUNTRY', direction: SortDirection.ASC },
          ]),
        ],
        [],
        'sort101',
      ),
      sortSpec({
        sorts: [
          { column: 'SHIP_COUNTRY', direction: 'DESC' },
          { column: '', direction: 'ASC' },
          { column: 'SHIP_COUNTRY', direction: 'ASC' },
        ],
      }),
    );
  });

  test('Writes the keys from the node, not from its rest', () => {
    expect(
      encodeCubeSpec(
        documentOf(
          [
            new Sort(
              'sort101',
              [{ column: 'A', direction: SortDirection.ASC }],
              { sorts: [], note: 'n' },
            ),
          ],
          [],
          'sort101',
        ),
      ),
    ).toStrictEqual(
      sortSpec({ sorts: [{ column: 'A', direction: 'ASC' }], note: 'n' }),
    );
  });
});

describe(unitTest('Saved spec encoding: renames'), () => {
  /** The saved spec of one unconnected rename, `rename101`, with these fields of its own */
  const renameSpec = (own: JsonObject): JsonObject => ({
    formatVersion: 1,
    query: {
      selected: 'rename101',
      nodes: [{ kind: 'rename', id: 'rename101', inputs: [null], ...own }],
    },
  });

  test('Always writes its mappings, an empty list included', () => {
    expectEncoded(
      documentOf([new Rename('rename101')], [], 'rename101'),
      renameSpec({ mappings: [] }),
    );
  });

  test('Writes each mapping as from, then to, names kept exactly, untrimmed', () => {
    expectEncoded(
      documentOf(
        [
          new Rename('rename101', [
            { from: 'SHIP_COUNTRY', to: ' Ship "Country" ' },
            { from: '', to: '' },
          ]),
        ],
        [],
        'rename101',
      ),
      renameSpec({
        mappings: [
          { from: 'SHIP_COUNTRY', to: ' Ship "Country" ' },
          { from: '', to: '' },
        ],
      }),
    );
  });

  test('Writes the mappings from the node, not from its rest', () => {
    expect(
      encodeCubeSpec(
        documentOf(
          [
            new Rename('rename101', [{ from: 'A', to: 'B' }], {
              mappings: [],
              note: 'n',
            }),
          ],
          [],
          'rename101',
        ),
      ),
    ).toStrictEqual(
      renameSpec({ mappings: [{ from: 'A', to: 'B' }], note: 'n' }),
    );
  });
});

describe(unitTest('Saved spec encoding: restricts'), () => {
  /** The saved spec of one unconnected restrict, `restrict101`, with these fields of its own */
  const restrictSpec = (own: JsonObject): JsonObject => ({
    formatVersion: 1,
    query: {
      selected: 'restrict101',
      nodes: [{ kind: 'restrict', id: 'restrict101', inputs: [null], ...own }],
    },
  });

  test('Always writes its columns, an empty list included', () => {
    expectEncoded(
      documentOf([new Restrict('restrict101')], [], 'restrict101'),
      restrictSpec({ columns: [] }),
    );
  });

  test('Writes the columns exactly as held: order, repeats and blanks kept', () => {
    expectEncoded(
      documentOf(
        [
          new Restrict('restrict101', [
            'SHIP_COUNTRY',
            'ORDER_ID',
            'ORDER_ID',
            '',
          ]),
        ],
        [],
        'restrict101',
      ),
      restrictSpec({ columns: ['SHIP_COUNTRY', 'ORDER_ID', 'ORDER_ID', ''] }),
    );
  });

  test('Writes the columns from the node, not from its rest', () => {
    expect(
      encodeCubeSpec(
        documentOf(
          [new Restrict('restrict101', ['A'], { columns: ['Z'], note: 'n' })],
          [],
          'restrict101',
        ),
      ),
    ).toStrictEqual(restrictSpec({ columns: ['A'], note: 'n' }));
  });
});

describe(unitTest('Saved spec encoding: groups'), () => {
  const REGISTRY = createNodeRegistry();

  /** The saved spec of one unconnected group, `group101`, with these fields of its own */
  const groupSpec = (own: JsonObject): JsonObject => ({
    formatVersion: 1,
    query: {
      selected: 'group101',
      nodes: [{ kind: 'group', id: 'group101', inputs: [null], ...own }],
    },
  });

  /** A document with this one unconnected group */
  const groupDocument = (group: Group): CubeDocument =>
    documentOf([group], [], group.id);

  /** The document a saved spec holds, its `group101` checked to be read as a Group */
  const decodeGroupSpec = (json: JsonObject): CubeDocument => {
    const { document } = decodeCubeSpec(json, { registry: REGISTRY });
    expect(document.query.getNode('group101')).toBeInstanceOf(Group);
    return document;
  };

  const aggregationsOf = (
    document: CubeDocument,
  ): readonly ColumnAggregation[] =>
    (document.query.getNode('group101') as Group).aggregations;

  test('Always writes its keys and aggregations, empty lists included', () => {
    expectEncoded(
      groupDocument(GROUP_DEFINITION.create('group101')),
      groupSpec({ columns: [], aggregations: [] }),
      REGISTRY,
    );
  });

  test('Writes each aggregation as column, function, then name, and Count rows without a column', () => {
    expectEncoded(
      groupDocument(
        new Group(
          'group101',
          ['SHIP_COUNTRY', 'SHIP_REGION'],
          [
            {
              column: 'ORDER_ID',
              function: AggregationFunction.COUNT,
              name: 'ORDER_ID Count',
            },
            {
              column: undefined,
              function: AggregationFunction.COUNT_ROWS,
              name: 'Count Rows',
            },
            {
              column: 'FREIGHT',
              function: AggregationFunction.SUM,
              name: 'Freight',
            },
          ],
        ),
      ),
      groupSpec({
        columns: ['SHIP_COUNTRY', 'SHIP_REGION'],
        aggregations: [
          { column: 'ORDER_ID', function: 'Count', name: 'ORDER_ID Count' },
          { function: 'CountRows', name: 'Count Rows' },
          { column: 'FREIGHT', function: 'Sum', name: 'Freight' },
        ],
      }),
      REGISTRY,
    );
  });

  test('Writes keys and aggregations exactly as held: order, repeats, blanks, and functions it does not know', () => {
    // validation judges them (PLAN §11.5, Q4); a blank column is kept apart
    // from none, and Count rows keeps a column it should not have
    expectEncoded(
      groupDocument(
        new Group(
          'group101',
          ['SHIP_REGION', 'SHIP_COUNTRY', 'SHIP_COUNTRY', ''],
          [
            { column: '', function: 'Count', name: '' },
            { column: 'ORDER_ID', function: 'Median', name: 'ORDER_ID Median' },
            { column: 'ORDER_ID', function: '', name: 'ORDER_ID' },
            { column: undefined, function: 'Rank', name: 'Rank' },
            { column: 'ORDER_ID', function: 'CountRows', name: 'Count Rows' },
            { column: '', function: 'CountRows', name: 'Count Rows' },
          ],
        ),
      ),
      groupSpec({
        columns: ['SHIP_REGION', 'SHIP_COUNTRY', 'SHIP_COUNTRY', ''],
        aggregations: [
          { column: '', function: 'Count', name: '' },
          { column: 'ORDER_ID', function: 'Median', name: 'ORDER_ID Median' },
          { column: 'ORDER_ID', function: '', name: 'ORDER_ID' },
          { function: 'Rank', name: 'Rank' },
          { column: 'ORDER_ID', function: 'CountRows', name: 'Count Rows' },
          { column: '', function: 'CountRows', name: 'Count Rows' },
        ],
      }),
      REGISTRY,
    );
  });

  test('Writes the keys and aggregations from the node, not from its rest', () => {
    expect(
      encodeCubeSpec(
        groupDocument(
          new Group(
            'group101',
            ['A'],
            [{ column: 'B', function: 'Sum', name: 'Total' }],
            { columns: ['Z'], aggregations: [], note: 'n' },
          ),
        ),
        REGISTRY,
      ),
    ).toStrictEqual(
      groupSpec({
        columns: ['A'],
        aggregations: [{ column: 'B', function: 'Sum', name: 'Total' }],
        note: 'n',
      }),
    );
  });

  test('Reads back its rest, written after its own keys', () => {
    expectEncoded(
      groupDocument(
        new Group(
          'group101',
          [],
          [{ column: undefined, function: 'CountRows', name: 'Count Rows' }],
          { note: 'kept', zeta: [null, { flag: false }] },
        ),
      ),
      groupSpec({
        columns: [],
        aggregations: [{ function: 'CountRows', name: 'Count Rows' }],
        note: 'kept',
        zeta: [null, { flag: false }],
      }),
      REGISTRY,
    );
  });

  test('Reads an aggregation saved without a name with its auto-name, and writes the name', () => {
    // PLAN §11.5, Q3: output names are always stored
    const document = decodeGroupSpec(
      groupSpec({
        columns: ['SHIP_COUNTRY'],
        aggregations: [
          { column: 'ORDER_ID', function: 'Count' },
          { function: 'CountRows' },
          { column: 'ORDER_ID', function: 'DistinctCount' },
          { column: 'ORDER_ID', function: 'CountRows' },
        ],
      }),
    );
    expect(aggregationsOf(document)).toStrictEqual([
      { column: 'ORDER_ID', function: 'Count', name: 'ORDER_ID Count' },
      { column: undefined, function: 'CountRows', name: 'Count Rows' },
      {
        column: 'ORDER_ID',
        function: 'DistinctCount',
        name: 'ORDER_ID Distinct Count',
      },
      { column: 'ORDER_ID', function: 'CountRows', name: 'Count Rows' },
    ]);
    const saved = encodeCubeSpec(document, REGISTRY);
    const expected = groupSpec({
      columns: ['SHIP_COUNTRY'],
      aggregations: [
        { column: 'ORDER_ID', function: 'Count', name: 'ORDER_ID Count' },
        { function: 'CountRows', name: 'Count Rows' },
        {
          column: 'ORDER_ID',
          function: 'DistinctCount',
          name: 'ORDER_ID Distinct Count',
        },
        { column: 'ORDER_ID', function: 'CountRows', name: 'Count Rows' },
      ],
    });
    expect(saved).toStrictEqual(expected);
    expect(JSON.stringify(saved)).toBe(JSON.stringify(expected));
    // once written with its names, it saves the same again
    expect(
      JSON.stringify(encodeCubeSpec(decodeGroupSpec(saved), REGISTRY)),
    ).toBe(JSON.stringify(saved));
  });

  test('Keeps an empty name as written, never giving it the auto-name', () => {
    const json = groupSpec({
      columns: [],
      aggregations: [{ column: 'ORDER_ID', function: 'Count', name: '' }],
    });
    const document = decodeGroupSpec(json);
    expect(aggregationsOf(document)).toStrictEqual([
      { column: 'ORDER_ID', function: 'Count', name: '' },
    ]);
    expect(JSON.stringify(encodeCubeSpec(document, REGISTRY))).toBe(
      JSON.stringify(json),
    );
  });

  test.each<[string, JsonObject, JsonObject]>([
    [
      'an unknown function',
      { column: 'ORDER_ID', function: 'Median' },
      { column: 'ORDER_ID', function: 'Median', name: '' },
    ],
    [
      'a window-only function',
      { function: 'Rank' },
      { function: 'Rank', name: '' },
    ],
    [
      'an empty function',
      { column: 'ORDER_ID', function: '' },
      { column: 'ORDER_ID', function: '', name: '' },
    ],
    [
      'a column function without a column',
      { function: 'Sum' },
      { function: 'Sum', name: '' },
    ],
    [
      'a column function on a blank column',
      { column: '', function: 'Count' },
      { column: '', function: 'Count', name: '' },
    ],
  ])(
    'Reads an aggregation saved without a name, with %s and so no auto-name, as an empty name, and writes it',
    (_, aggregation, written) => {
      const document = decodeGroupSpec(
        groupSpec({ columns: [], aggregations: [aggregation] }),
      );
      expect(aggregationsOf(document).map(({ name }) => name)).toEqual(['']);
      expect(JSON.stringify(encodeCubeSpec(document, REGISTRY))).toBe(
        JSON.stringify(groupSpec({ columns: [], aggregations: [written] })),
      );
    },
  );
});

describe(unitTest('Saved spec encoding: partitions'), () => {
  const REGISTRY = createNodeRegistry();

  /** The saved spec of one unconnected partition, `partition101`, with these fields of its own */
  const partitionSpec = (own: JsonObject): JsonObject => ({
    formatVersion: 1,
    query: {
      selected: 'partition101',
      nodes: [
        { kind: 'partition', id: 'partition101', inputs: [null], ...own },
      ],
    },
  });

  /** A document with this one unconnected partition */
  const partitionDocument = (partition: Partition): CubeDocument =>
    documentOf([partition], [], partition.id);

  /** The document a saved spec holds, its `partition101` checked to be read as a Partition */
  const decodePartitionSpec = (json: JsonObject): CubeDocument => {
    const { document } = decodeCubeSpec(json, { registry: REGISTRY });
    expect(document.query.getNode('partition101')).toBeInstanceOf(Partition);
    return document;
  };

  const aggregationsOf = (
    document: CubeDocument,
  ): readonly ColumnAggregation[] =>
    (document.query.getNode('partition101') as Partition).aggregations;

  test('Always writes its partition columns, sorts and aggregations, empty lists included', () => {
    expectEncoded(
      partitionDocument(PARTITION_DEFINITION.create('partition101')),
      partitionSpec({ columns: [], sorts: [], aggregations: [] }),
      REGISTRY,
    );
  });

  test('Writes its columns, then its sorts as column, then direction, then its aggregations as column, function, then name, the rank functions and Count rows without a column', () => {
    expectEncoded(
      partitionDocument(
        new Partition(
          'partition101',
          ['SHIP_COUNTRY', 'SHIP_REGION'],
          [
            { column: 'ORDER_DATE', direction: SortDirection.ASC },
            { column: 'ORDER_ID', direction: SortDirection.DESC },
          ],
          [
            {
              column: 'FREIGHT',
              function: AggregationFunction.SUM,
              name: 'Running freight',
            },
            {
              column: undefined,
              function: WindowRankFunction.RANK,
              name: 'Rank',
            },
            {
              column: undefined,
              function: WindowRankFunction.DENSE_RANK,
              name: 'Dense Rank',
            },
            {
              column: undefined,
              function: WindowRankFunction.ROW_NUMBER,
              name: 'Row Number',
            },
            {
              column: undefined,
              function: AggregationFunction.COUNT_ROWS,
              name: 'Count Rows',
            },
          ],
        ),
      ),
      partitionSpec({
        columns: ['SHIP_COUNTRY', 'SHIP_REGION'],
        sorts: [
          { column: 'ORDER_DATE', direction: 'ASC' },
          { column: 'ORDER_ID', direction: 'DESC' },
        ],
        aggregations: [
          { column: 'FREIGHT', function: 'Sum', name: 'Running freight' },
          { function: 'Rank', name: 'Rank' },
          { function: 'DenseRank', name: 'Dense Rank' },
          { function: 'RowNumber', name: 'Row Number' },
          { function: 'CountRows', name: 'Count Rows' },
        ],
      }),
      REGISTRY,
    );
  });

  test('Writes columns, sorts and aggregations exactly as held: order, repeats, blanks, functions it does not know, and a rank function on a column', () => {
    // validation judges them (PLAN §11.6, as M4 Q4 does for a Group); a blank
    // column is kept apart from none
    expectEncoded(
      partitionDocument(
        new Partition(
          'partition101',
          ['SHIP_REGION', 'SHIP_COUNTRY', 'SHIP_COUNTRY', ''],
          [
            { column: 'ORDER_ID', direction: SortDirection.DESC },
            { column: '', direction: SortDirection.ASC },
            { column: 'ORDER_ID', direction: SortDirection.ASC },
          ],
          [
            { column: '', function: 'Count', name: '' },
            { column: 'ORDER_ID', function: 'Median', name: 'ORDER_ID Median' },
            { column: 'ORDER_ID', function: '', name: 'ORDER_ID' },
            { column: 'ORDER_ID', function: 'Rank', name: 'Rank' },
            { column: '', function: 'RowNumber', name: 'Row Number' },
            { column: undefined, function: 'Ntile', name: 'Ntile' },
          ],
        ),
      ),
      partitionSpec({
        columns: ['SHIP_REGION', 'SHIP_COUNTRY', 'SHIP_COUNTRY', ''],
        sorts: [
          { column: 'ORDER_ID', direction: 'DESC' },
          { column: '', direction: 'ASC' },
          { column: 'ORDER_ID', direction: 'ASC' },
        ],
        aggregations: [
          { column: '', function: 'Count', name: '' },
          { column: 'ORDER_ID', function: 'Median', name: 'ORDER_ID Median' },
          { column: 'ORDER_ID', function: '', name: 'ORDER_ID' },
          { column: 'ORDER_ID', function: 'Rank', name: 'Rank' },
          { column: '', function: 'RowNumber', name: 'Row Number' },
          { function: 'Ntile', name: 'Ntile' },
        ],
      }),
      REGISTRY,
    );
  });

  test('Writes the columns, sorts and aggregations from the node, not from its rest', () => {
    expect(
      encodeCubeSpec(
        partitionDocument(
          new Partition(
            'partition101',
            ['A'],
            [{ column: 'B', direction: SortDirection.ASC }],
            [{ column: undefined, function: 'Rank', name: 'Rank' }],
            { columns: ['Z'], sorts: [], aggregations: [], note: 'n' },
          ),
        ),
        REGISTRY,
      ),
    ).toStrictEqual(
      partitionSpec({
        columns: ['A'],
        sorts: [{ column: 'B', direction: 'ASC' }],
        aggregations: [{ function: 'Rank', name: 'Rank' }],
        note: 'n',
      }),
    );
  });

  test('Reads back its rest, written after its own keys', () => {
    expectEncoded(
      partitionDocument(
        new Partition(
          'partition101',
          ['SHIP_COUNTRY'],
          [{ column: 'ORDER_DATE', direction: SortDirection.ASC }],
          [{ column: undefined, function: 'RowNumber', name: 'Row Number' }],
          { note: 'kept', zeta: [null, { flag: false }] },
        ),
      ),
      partitionSpec({
        columns: ['SHIP_COUNTRY'],
        sorts: [{ column: 'ORDER_DATE', direction: 'ASC' }],
        aggregations: [{ function: 'RowNumber', name: 'Row Number' }],
        note: 'kept',
        zeta: [null, { flag: false }],
      }),
      REGISTRY,
    );
  });

  test('Reads back a partition fed by a source, with its input, settings and rest', () => {
    expectReadBack(
      documentOf(
        [
          ORDERS,
          new Partition(
            'partition101',
            ['CUSTOMER_ID'],
            [
              { column: 'ORDER_DATE', direction: SortDirection.DESC },
              { column: 'ORDER_ID', direction: SortDirection.ASC },
            ],
            [
              { column: undefined, function: 'DenseRank', name: 'Dense Rank' },
              { column: 'ORDER_ID', function: 'Max', name: 'Last order' },
            ],
            { note: 'kept' },
          ),
        ],
        [edge('relational101', 'partition101', 'tds')],
        'partition101',
      ),
      REGISTRY,
    );
  });

  test.each<[string, JsonObject[]]>([
    ['a sorted', [{ column: 'ORDER_DATE', direction: 'ASC' }]],
    // the auto-name doesn't wait for the sort a rank needs to be valid
    ['an unsorted', []],
  ])(
    'Reads aggregations saved without a name in %s partition with their window auto-names, and writes the names',
    (_, sorts) => {
      // PLAN §11.6: auto-names as in a Group, and names always stored (M4 Q3)
      const document = decodePartitionSpec(
        partitionSpec({
          columns: ['SHIP_COUNTRY'],
          sorts,
          aggregations: [
            { function: 'Rank' },
            { function: 'DenseRank' },
            { function: 'RowNumber' },
            { function: 'CountRows' },
            { column: 'ORDER_ID', function: 'Sum' },
            { column: 'ORDER_ID', function: 'Rank' },
          ],
        }),
      );
      expect(aggregationsOf(document)).toStrictEqual([
        { column: undefined, function: 'Rank', name: 'Rank' },
        { column: undefined, function: 'DenseRank', name: 'Dense Rank' },
        { column: undefined, function: 'RowNumber', name: 'Row Number' },
        { column: undefined, function: 'CountRows', name: 'Count Rows' },
        { column: 'ORDER_ID', function: 'Sum', name: 'ORDER_ID Sum' },
        { column: 'ORDER_ID', function: 'Rank', name: 'Rank' },
      ]);
      const saved = encodeCubeSpec(document, REGISTRY);
      const expected = partitionSpec({
        columns: ['SHIP_COUNTRY'],
        sorts,
        aggregations: [
          { function: 'Rank', name: 'Rank' },
          { function: 'DenseRank', name: 'Dense Rank' },
          { function: 'RowNumber', name: 'Row Number' },
          { function: 'CountRows', name: 'Count Rows' },
          { column: 'ORDER_ID', function: 'Sum', name: 'ORDER_ID Sum' },
          { column: 'ORDER_ID', function: 'Rank', name: 'Rank' },
        ],
      });
      expect(saved).toStrictEqual(expected);
      expect(JSON.stringify(saved)).toBe(JSON.stringify(expected));
      // once written with its names, it saves the same again
      expect(
        JSON.stringify(encodeCubeSpec(decodePartitionSpec(saved), REGISTRY)),
      ).toBe(JSON.stringify(saved));
    },
  );

  test('Keeps an empty name as written, never giving it the auto-name', () => {
    const json = partitionSpec({
      columns: [],
      sorts: [{ column: 'ORDER_ID', direction: 'ASC' }],
      aggregations: [{ function: 'Rank', name: '' }],
    });
    const document = decodePartitionSpec(json);
    expect(aggregationsOf(document)).toStrictEqual([
      { column: undefined, function: 'Rank', name: '' },
    ]);
    expect(JSON.stringify(encodeCubeSpec(document, REGISTRY))).toBe(
      JSON.stringify(json),
    );
  });

  test.each<[string, JsonObject, JsonObject]>([
    [
      'an unknown function',
      { column: 'ORDER_ID', function: 'Median' },
      { column: 'ORDER_ID', function: 'Median', name: '' },
    ],
    [
      'a rank function spelled in another case',
      { function: 'rank' },
      { function: 'rank', name: '' },
    ],
    [
      'an empty function',
      { column: 'ORDER_ID', function: '' },
      { column: 'ORDER_ID', function: '', name: '' },
    ],
    [
      'a column function without a column',
      { function: 'Sum' },
      { function: 'Sum', name: '' },
    ],
    [
      'a column function on a blank column',
      { column: '', function: 'Count' },
      { column: '', function: 'Count', name: '' },
    ],
  ])(
    'Reads an aggregation saved without a name, with %s and so no auto-name, as an empty name, and writes it',
    (_, aggregation, written) => {
      const sorts = [{ column: 'ORDER_ID', direction: 'ASC' }];
      const document = decodePartitionSpec(
        partitionSpec({ columns: [], sorts, aggregations: [aggregation] }),
      );
      expect(aggregationsOf(document).map(({ name }) => name)).toEqual(['']);
      expect(JSON.stringify(encodeCubeSpec(document, REGISTRY))).toBe(
        JSON.stringify(
          partitionSpec({ columns: [], sorts, aggregations: [written] }),
        ),
      );
    },
  );

  test('Gives the rank functions saved without a name their auto-names in a partition only, a group reading them with an empty name', () => {
    // PLAN §11.6: Group is unchanged, and doesn't know the rank functions
    const aggregations = [{ function: 'Rank' }, { function: 'RowNumber' }];
    const { query } = decodeCubeSpec(
      {
        formatVersion: 1,
        query: {
          selected: 'partition101',
          nodes: [
            {
              kind: 'group',
              id: 'group101',
              inputs: [null],
              columns: [],
              aggregations,
            },
            {
              kind: 'partition',
              id: 'partition101',
              inputs: [null],
              columns: [],
              sorts: [{ column: 'ORDER_ID', direction: 'ASC' }],
              aggregations,
            },
          ],
        },
      },
      { registry: REGISTRY },
    ).document;
    const group = query.getNode('group101');
    const partition = query.getNode('partition101');
    expect(group).toBeInstanceOf(Group);
    expect(partition).toBeInstanceOf(Partition);
    expect((group as Group).aggregations.map(({ name }) => name)).toEqual([
      '',
      '',
    ]);
    expect(
      (partition as Partition).aggregations.map(({ name }) => name),
    ).toEqual(['Rank', 'Row Number']);
  });
});

describe(unitTest('Saved spec encoding: distincts'), () => {
  test('Writes no field of its own, only its rest', () => {
    expectEncoded(
      documentOf([new Distinct('distinct101')], [], 'distinct101'),
      {
        formatVersion: 1,
        query: {
          selected: 'distinct101',
          nodes: [{ kind: 'distinct', id: 'distinct101', inputs: [null] }],
        },
      },
    );
    expectEncoded(
      documentOf(
        [new Distinct('distinct101', { columns: ['A'], note: 'later' })],
        [],
        'distinct101',
      ),
      {
        formatVersion: 1,
        query: {
          selected: 'distinct101',
          nodes: [
            {
              kind: 'distinct',
              id: 'distinct101',
              inputs: [null],
              columns: ['A'],
              note: 'later',
            },
          ],
        },
      },
    );
  });
});

describe(unitTest('Saved spec encoding: drops'), () => {
  /** The saved spec of one unconnected drop, `drop101`, with these fields of its own */
  const dropSpec = (own: JsonObject): JsonObject => ({
    formatVersion: 1,
    query: {
      selected: 'drop101',
      nodes: [{ kind: 'drop', id: 'drop101', inputs: [null], ...own }],
    },
  });

  test('Writes the size of a new drop, the default included', () => {
    expectEncoded(
      documentOf([DROP_DEFINITION.create('drop101')], [], 'drop101'),
      dropSpec({ size: 10 }),
    );
  });

  test('Leaves out a cleared size, and writes a refused one as it stands', () => {
    expectEncoded(
      documentOf([new Drop('drop101', undefined)], [], 'drop101'),
      dropSpec({}),
    );
    expectEncoded(
      documentOf([new Drop('drop101', 0)], [], 'drop101'),
      dropSpec({ size: 0 }),
    );
  });

  test('Writes the size from the node, not from its rest', () => {
    const document = documentOf(
      [new Drop('drop101', 5, { size: 99, note: 'skip five' })],
      [],
      'drop101',
    );
    expect(encodeCubeSpec(document)).toStrictEqual(
      dropSpec({ size: 5, note: 'skip five' }),
    );
  });
});

describe(unitTest('Saved spec encoding: slices'), () => {
  /** The saved spec of one unconnected slice, `slice101`, with these fields of its own */
  const sliceSpec = (own: JsonObject): JsonObject => ({
    formatVersion: 1,
    query: {
      selected: 'slice101',
      nodes: [{ kind: 'slice', id: 'slice101', inputs: [null], ...own }],
    },
  });

  test('Writes the bounds of a new slice, the defaults included, start before stop', () => {
    expectEncoded(
      documentOf(
        [new Slice('slice101', Slice.DEFAULT_START, Slice.DEFAULT_STOP)],
        [],
        'slice101',
      ),
      sliceSpec({ start: 10, stop: 20 }),
    );
  });

  test('Leaves out each cleared bound on its own', () => {
    expectEncoded(
      documentOf([new Slice('slice101', undefined, 20)], [], 'slice101'),
      sliceSpec({ stop: 20 }),
    );
    expectEncoded(
      documentOf([new Slice('slice101', 0, undefined)], [], 'slice101'),
      sliceSpec({ start: 0 }),
    );
    expectEncoded(
      documentOf([new Slice('slice101', undefined, undefined)], [], 'slice101'),
      sliceSpec({}),
    );
  });

  test('Writes refused bounds as they stand, for validation to report', () => {
    expectEncoded(
      documentOf([new Slice('slice101', 5, 3)], [], 'slice101'),
      sliceSpec({ start: 5, stop: 3 }),
    );
  });

  test('Writes the bounds from the node, not from its rest', () => {
    const document = documentOf(
      [new Slice('slice101', 1, 2, { start: 99, stop: 100, note: 'page' })],
      [],
      'slice101',
    );
    expect(encodeCubeSpec(document)).toStrictEqual(
      sliceSpec({ start: 1, stop: 2, note: 'page' }),
    );
  });
});

describe(unitTest('Saved spec encoding: concats'), () => {
  const REGISTRY = createNodeRegistry();

  /** The saved spec of `concat101`, after these nodes, with these inputs and fields of its own */
  const concatSpec = (
    own: JsonObject,
    inputs: readonly (string | null)[] = [null, null],
    nodes: readonly JsonObject[] = [],
  ): JsonObject => ({
    formatVersion: 1,
    query: {
      selected: 'concat101',
      nodes: [...nodes, { kind: 'concat', id: 'concat101', inputs, ...own }],
    },
  });

  /** A document with this one unconnected concat */
  const concatDocument = (concat: Concat): CubeDocument =>
    documentOf([concat], [], concat.id);

  /** ORDERS and its archive, feeding the concat on these ports */
  const concatOfTables = (
    concat: Concat,
    ports: { relational101?: string; relational102?: string },
  ): CubeDocument =>
    documentOf(
      [
        table('relational101', 'ORDERS'),
        table('relational102', 'ORDERS_ARCHIVE'),
        concat,
      ],
      Object.entries(ports).map(([source, port]) =>
        edge(source, concat.id, port),
      ),
      concat.id,
    );
  const TABLE_SPECS = [
    tableSpec('relational101', 'ORDERS'),
    tableSpec('relational102', 'ORDERS_ARCHIVE'),
  ];

  test('Always writes widenTypes, false included, for a new concat', () => {
    // PLAN §11.5: the setting's key ships with the kind
    expectEncoded(
      concatDocument(CONCAT_DEFINITION.create('concat101')),
      concatSpec({ widenTypes: false }),
      REGISTRY,
    );
  });

  test('Writes widenTypes on as true', () => {
    expectEncoded(
      concatDocument(new Concat('concat101', true)),
      concatSpec({ widenTypes: true }),
      REGISTRY,
    );
  });

  test('Writes its inputs in port order, not in node order, and null for an unconnected port', () => {
    expectEncoded(
      concatOfTables(new Concat('concat101'), {
        relational102: 'tds1',
        relational101: 'tds2',
      }),
      concatSpec(
        { widenTypes: false },
        ['relational102', 'relational101'],
        TABLE_SPECS,
      ),
      REGISTRY,
    );
    expectEncoded(
      concatOfTables(new Concat('concat101'), { relational101: 'tds2' }),
      concatSpec({ widenTypes: false }, [null, 'relational101'], TABLE_SPECS),
      REGISTRY,
    );
  });

  test('Writes a concat whose inputs swapped as it stands, its setting kept', () => {
    // swapping is allowed (spec §4.4): the output's names then come from the
    // new first input
    const { query } = concatOfTables(new Concat('concat101', true), {
      relational101: 'tds1',
      relational102: 'tds2',
    });
    expectEncoded(
      new CubeDocument({ query: query.swapInputs('concat101') }),
      concatSpec(
        { widenTypes: true },
        ['relational102', 'relational101'],
        TABLE_SPECS,
      ),
      REGISTRY,
    );
  });

  test('Writes widenTypes from the node, not from its rest', () => {
    expect(
      encodeCubeSpec(
        concatDocument(
          new Concat('concat101', false, { widenTypes: true, note: 'n' }),
        ),
        REGISTRY,
      ),
    ).toStrictEqual(concatSpec({ widenTypes: false, note: 'n' }));
  });

  test('Reads back its inputs, widenTypes on, and its rest, written after its own keys', () => {
    const document = concatOfTables(
      new Concat('concat101', true, {
        note: 'kept',
        zeta: [null, { flag: false }],
      }),
      { relational101: 'tds1', relational102: 'tds2' },
    );
    const json = concatSpec(
      { widenTypes: true, note: 'kept', zeta: [null, { flag: false }] },
      ['relational101', 'relational102'],
      TABLE_SPECS,
    );
    expectEncoded(document, json, REGISTRY);
    const { query } = decodeCubeSpec(json, { registry: REGISTRY }).document;
    const node = query.getNode('concat101');
    expect(node).toBeInstanceOf(Concat);
    expect((node as Concat).widenTypes).toBe(true);
    expect(node?.rest).toEqual({ note: 'kept', zeta: [null, { flag: false }] });
    expect(query.getInputIds('concat101')).toEqual([
      'relational101',
      'relational102',
    ]);
  });

  test("Refuses to save a concat with a registry that doesn't know Concat", () => {
    const withoutConcat = new NodeRegistry(
      [...REGISTRY.sources, ...REGISTRY.transforms].filter(
        (definition) => definition.type !== Concat.TYPE,
      ),
    );
    expect(() =>
      encodeCubeSpec(concatDocument(new Concat('concat101')), withoutConcat),
    ).toThrow(
      new Error(`Can't save node "concat101": its type "concat" is unknown`),
    );
  });
});

describe(unitTest('Saved spec encoding: rest'), () => {
  test('Writes known node fields from the node, not from its rest', () => {
    // R113, R110: a rest holding known keys never overrides them
    const document = documentOf(
      [
        new RelationalTableSource(
          'relational101',
          { database: TEST_DATABASE, schema: 'NORTHWIND', table: 'ORDERS' },
          UNRESOLVED,
          {
            kind: 'join',
            id: 'other101',
            inputs: ['ghost'],
            database: 'other::Database',
            table: 'OTHER',
            schemaSnapshot: [],
            alias: 'o',
          },
        ),
        new Join(
          'join101',
          { joinType: JoinType.INNER, leftColumns: ['A'], rightColumns: ['B'] },
          {
            id: 'other102',
            joinType: 'CROSS',
            leftColumns: ['Z'],
            rightColumns: 'bad',
            hint: { broadcast: true },
          },
        ),
        new Filter('filter101', compare('A', O.IS_EMPTY), {
          kind: 'pivot',
          filter: { op: 'xor', rules: [] },
          note: null,
        }),
      ],
      [
        edge('relational101', 'join101', 'leftTds'),
        edge('join101', 'filter101', 'tds'),
      ],
      'filter101',
    );
    expect(encodeCubeSpec(document)).toStrictEqual({
      formatVersion: 1,
      query: {
        selected: 'filter101',
        nodes: [
          { ...tableSpec('relational101', 'ORDERS'), alias: 'o' },
          {
            kind: 'join',
            id: 'join101',
            inputs: ['relational101', null],
            joinType: 'INNER',
            leftColumns: ['A'],
            rightColumns: ['B'],
            hint: { broadcast: true },
          },
          {
            kind: 'filter',
            id: 'filter101',
            inputs: ['join101'],
            filter: { column: 'A', operator: 'IsEmpty' },
            note: null,
          },
        ],
      },
    });
  });

  test('Writes the known fields of the document, context, query and meta from the model, not from their rest', () => {
    // R109, R111 and the nested rests of PLAN §10.3 (Settled in M1.6)
    const document = new CubeDocument({
      context: {
        model: { ...TEXT_MODEL, source: 'x' },
        rest: { model: { _type: 'pointer' }, runtime: 'r', zone: 1 },
      },
      queryRest: { selected: 'ghost', nodes: [], page: 2 },
      meta: {
        presentation: {
          showGraph: true,
          columnWidths: [
            {
              column: 'CITY',
              width: 90,
              rest: { column: 'OTHER', width: 1, unit: 'px' },
            },
          ],
          rest: {
            showGraph: false,
            columnWidths: [],
            columnHints: [{ field: 'CITY' }],
          },
        },
        rest: { presentation: {}, drilldown: { levels: ['CITY'] } },
      },
      rest: {
        formatVersion: 7,
        name: 'from rest',
        context: null,
        query: null,
        meta: null,
        zeta: 1,
        alpha: [null, { b: 2 }],
      },
    });
    const expected: JsonObject = {
      formatVersion: 1,
      context: {
        model: { ...TEXT_MODEL, source: 'x' },
        zone: 1,
      },
      query: { nodes: [], page: 2 },
      meta: {
        presentation: {
          columnWidths: [{ column: 'CITY', width: 90, unit: 'px' }],
          columnHints: [{ field: 'CITY' }],
        },
        drilldown: { levels: ['CITY'] },
      },
      zeta: 1,
      alpha: [null, { b: 2 }],
    };
    const encoded = encodeCubeSpec(document);
    expect(encoded).toStrictEqual(expected);
    // unknown keys come after the known ones, in the order read (R144)
    expect(JSON.stringify(encoded)).toBe(JSON.stringify(expected));
  });

  test('Writes a copy of the whole model, keys in the order it holds them', () => {
    // PLAN §6.2.2: the model is kept whole, nested keys and nulls included
    const model: ModelContext = {
      code: '###Relational',
      _type: 'text',
      serializer: { name: 'pure', version: null },
    };
    const encoded = encodeCubeSpec(new CubeDocument({ context: { model } }));
    const written = (encoded.context as JsonObject).model;
    expect(JSON.stringify(written)).toBe(JSON.stringify(model));
    // a deep copy: nothing the document holds is shared with the output
    expect(written).not.toBe(model);
    expect((written as JsonObject).serializer).not.toBe(model.serializer);
  });

  test('Writes the unknown keys of a snapshot column and its type after their known keys', () => {
    // R112, R144 and PLAN §10.3 (Settled in M1.6): snapshot columns and types
    // keep their unknown keys, by column name; a column without any has none
    const source = new RelationalTableSource(
      'relational101',
      { database: TEST_DATABASE, schema: 'NORTHWIND', table: 'ORDERS' },
      {
        kind: 'resolved',
        schema: new Schema([
          column('ORDER_ID', `${PRECISE}Int`),
          column('CUSTOMER_ID', `${PRECISE}Varchar`, true, [5]),
        ]),
      },
      undefined,
      new Map([
        [
          'CUSTOMER_ID',
          {
            column: { comment: 'kept', tags: [null, { pii: false }] },
            type: { precision: 'kept' },
          },
        ],
      ]),
    );
    expectEncoded(documentOf([source], [], 'relational101'), {
      formatVersion: 1,
      query: {
        selected: 'relational101',
        nodes: [
          {
            ...tableSpec('relational101', 'ORDERS'),
            schemaSnapshot: [
              {
                name: 'ORDER_ID',
                type: { path: `${PRECISE}Int` },
                nullable: false,
              },
              {
                name: 'CUSTOMER_ID',
                type: {
                  path: `${PRECISE}Varchar`,
                  params: [5],
                  precision: 'kept',
                },
                nullable: true,
                comment: 'kept',
                tags: [null, { pii: false }],
              },
            ],
          },
        ],
      },
    });
  });

  // R113: known fields always come from the model, never from a rest
  test('Writes a snapshot column from the schema, not from its rest', () => {
    const source = new RelationalTableSource(
      'relational101',
      { database: TEST_DATABASE, schema: 'NORTHWIND', table: 'ORDERS' },
      {
        kind: 'resolved',
        schema: new Schema([column('ORDER_ID', `${PRECISE}Int`)]),
      },
      undefined,
      new Map([
        [
          'ORDER_ID',
          {
            column: { name: 'OTHER', nullable: true, comment: 'kept' },
            type: {},
          },
        ],
      ]),
    );
    expect(
      encodeCubeSpec(documentOf([source], [], 'relational101')),
    ).toStrictEqual({
      formatVersion: 1,
      query: {
        selected: 'relational101',
        nodes: [
          {
            ...tableSpec('relational101', 'ORDERS'),
            schemaSnapshot: [
              {
                name: 'ORDER_ID',
                type: { path: `${PRECISE}Int` },
                nullable: false,
                comment: 'kept',
              },
            ],
          },
        ],
      },
    });
  });

  // R113, as above: a rest `path` or `values` never changes the type
  test('Writes a snapshot type from the schema, not from its rest', () => {
    const source = new RelationalTableSource(
      'relational101',
      { database: TEST_DATABASE, schema: 'NORTHWIND', table: 'ORDERS' },
      {
        kind: 'resolved',
        schema: new Schema([column('ORDER_ID', `${PRECISE}Int`)]),
      },
      undefined,
      new Map([
        [
          'ORDER_ID',
          {
            column: {},
            type: { path: 'other::Type', values: ['A'], precision: 'kept' },
          },
        ],
      ]),
    );
    expect(
      encodeCubeSpec(documentOf([source], [], 'relational101')),
    ).toStrictEqual({
      formatVersion: 1,
      query: {
        selected: 'relational101',
        nodes: [
          {
            ...tableSpec('relational101', 'ORDERS'),
            schemaSnapshot: [
              {
                name: 'ORDER_ID',
                type: { path: `${PRECISE}Int`, precision: 'kept' },
                nullable: false,
              },
            ],
          },
        ],
      },
    });
  });

  // R104: an Unknown node's `id` and `inputs` are regenerated from the query
  test("Writes an Unknown node's id and inputs from the query, not from its JSON", () => {
    const document = documentOf(
      [
        table('relational101', 'ORDERS'),
        new UnknownNode('pivot101', 1, {
          kind: 'pivot',
          id: 'stale',
          inputs: ['ghost'],
          rows: ['CITY'],
        }),
      ],
      [edge('relational101', 'pivot101', 'in0')],
      'pivot101',
    );
    expect(encodeCubeSpec(document)).toStrictEqual({
      formatVersion: 1,
      query: {
        selected: 'pivot101',
        nodes: [
          tableSpec('relational101', 'ORDERS'),
          {
            kind: 'pivot',
            id: 'pivot101',
            inputs: ['relational101'],
            rows: ['CITY'],
          },
        ],
      },
    });
  });

  test('Keeps node rest through edits that make a new node', () => {
    // R110: Join.withSettings/withSwappedInputs, Filter.withFilter and
    // RelationalTableSource.withResolution carry the rest
    const rest: JsonObject = { note: 'kept' };
    const join = new Join('join101', {}, rest)
      .withSettings({ joinType: JoinType.INNER })
      .withSwappedInputs();
    const filter = new Filter('filter101', undefined, rest).withFilter(
      compare('A', O.IS_EMPTY),
    );
    const source = new RelationalTableSource(
      'relational101',
      { database: TEST_DATABASE, schema: 'NORTHWIND', table: 'ORDERS' },
      UNRESOLVED,
      rest,
    ).withResolution({
      kind: 'resolved',
      schema: new Schema([column('ORDER_ID', `${PRECISE}Int`)]),
    });
    expect(join.rest).toBe(rest);
    expect(filter.rest).toBe(rest);
    expect(source.rest).toBe(rest);
    expectEncoded(documentOf([source, join, filter], [], 'join101'), {
      formatVersion: 1,
      query: {
        selected: 'join101',
        nodes: [
          {
            ...tableSpec('relational101', 'ORDERS'),
            schemaSnapshot: [
              {
                name: 'ORDER_ID',
                type: { path: `${PRECISE}Int` },
                nullable: false,
              },
            ],
            note: 'kept',
          },
          {
            kind: 'join',
            id: 'join101',
            inputs: [null, null],
            joinType: 'INNER',
            leftColumns: [],
            rightColumns: [],
            note: 'kept',
          },
          {
            kind: 'filter',
            id: 'filter101',
            inputs: [null],
            filter: { column: 'A', operator: 'IsEmpty' },
            note: 'kept',
          },
        ],
      },
    });
  });
});

describe(unitTest('Saved spec text'), () => {
  test('Serializes the encoded spec with JSON.stringify, indented by two spaces', () => {
    // R145
    expect(serializeCubeSpec(SLICE)).toBe(
      JSON.stringify(encodeCubeSpec(SLICE), undefined, 2),
    );
    expect(serializeCubeSpec(new CubeDocument())).toBe(
      '{\n  "formatVersion": 1,\n  "query": {\n    "nodes": []\n  }\n}',
    );
  });

  test('Parses serialized text back to an equal document', () => {
    // R137, R143
    const result = parseCubeSpec(serializeCubeSpec(SLICE));
    expect(result.formatVersion).toBe(1);
    expect(result.readOnly).toBe(false);
    expect(describeDocument(result.document)).toEqual(describeDocument(SLICE));
    expect(serializeCubeSpec(result.document)).toBe(serializeCubeSpec(SLICE));
  });
});

describe(unitTest('Cube document'), () => {
  const QUERY = documentOf(
    [table('relational101', 'ORDERS')],
    [],
    'relational101',
  ).query;
  const META: CubeMeta = {
    presentation: { showGraph: false, columnWidths: [] },
  };
  const BASE = new CubeDocument({
    name: 'Orders',
    context: TEXT_CONTEXT,
    query: QUERY,
    queryRest: { page: 2 },
    meta: META,
    rest: { extra: true },
  });

  const expectKept = (
    changed: CubeDocument,
    kept: readonly (keyof CubeDocument)[],
  ): void => {
    expect(changed).not.toBe(BASE);
    kept.forEach((part) => expect(changed[part]).toBe(BASE[part]));
  };

  test('Has no name, context or meta until they are set', () => {
    const document = new CubeDocument();
    expect(document.name).toBeUndefined();
    expect(document.context).toBeUndefined();
    expect(document.query.isEmpty).toBe(true);
    expect(document.meta).toBe(DEFAULT_META);
    expect(document.queryRest).toEqual({});
    expect(document.rest).toEqual({});
  });

  test('Renames into a new document that keeps the other parts', () => {
    const renamed = BASE.withName('Orders 1997');
    expect(renamed.name).toBe('Orders 1997');
    expectKept(renamed, ['context', 'query', 'queryRest', 'meta', 'rest']);
    expect(BASE.name).toBe('Orders');
    expect(BASE.withName(undefined).name).toBeUndefined();
  });

  test('Changes the context into a new document that keeps the other parts', () => {
    const context: CubeContext = {
      model: { _type: 'text', code: '###Pure' },
    };
    const changed = BASE.withContext(context);
    expect(changed.context).toBe(context);
    expectKept(changed, ['name', 'query', 'queryRest', 'meta', 'rest']);
    expect(BASE.context).toBe(TEXT_CONTEXT);
    expect(BASE.withContext(undefined).context).toBeUndefined();
  });

  test('Changes the query into a new document that keeps the other parts', () => {
    const query = new Query();
    const changed = BASE.withQuery(query);
    expect(changed.query).toBe(query);
    expectKept(changed, ['name', 'context', 'queryRest', 'meta', 'rest']);
    expect(BASE.query).toBe(QUERY);
  });

  test('Changes the meta into a new document that keeps the other parts', () => {
    const changed = BASE.withMeta(DEFAULT_META);
    expect(changed.meta).toBe(DEFAULT_META);
    expectKept(changed, ['name', 'context', 'query', 'queryRest', 'rest']);
    expect(BASE.meta).toBe(META);
  });
});

describe(unitTest('Saved spec encoding: differences'), () => {
  const REGISTRY = createNodeRegistry();

  /** The saved spec of one unconnected difference, `difference101`, with these fields of its own */
  const differenceSpec = (own: JsonObject): JsonObject => ({
    formatVersion: 1,
    query: {
      selected: 'difference101',
      nodes: [
        {
          kind: 'difference',
          id: 'difference101',
          inputs: [null, null],
          ...own,
        },
      ],
    },
  });

  /** A document with this one unconnected difference */
  const differenceDocument = (difference: Difference): CubeDocument =>
    documentOf([difference], [], difference.id);

  test('Always writes its key and difference columns, empty lists included', () => {
    expectEncoded(
      differenceDocument(DIFFERENCE_DEFINITION.create('difference101')),
      differenceSpec({
        leftColumns: [],
        rightColumns: [],
        differenceColumns: [],
      }),
      REGISTRY,
    );
  });

  test('Keeps its lists exactly, even when they differ in length, repeat or hold a blank', () => {
    expectEncoded(
      differenceDocument(
        new Difference('difference101', {
          leftColumns: ['BOOK', 'BOOK', ''],
          rightColumns: ['BOOK_ID'],
          differenceColumns: ['QTY', '', 'QTY'],
        }),
      ),
      differenceSpec({
        leftColumns: ['BOOK', 'BOOK', ''],
        rightColumns: ['BOOK_ID'],
        differenceColumns: ['QTY', '', 'QTY'],
      }),
      REGISTRY,
    );
  });

  test('Writes a swapped difference as it stands, with no swapped flag', () => {
    const swapped = new Difference('difference101', {
      leftColumns: ['BOOK'],
      rightColumns: ['BOOK_ID'],
      differenceColumns: ['QTY'],
    }).withSwappedInputs();
    expectEncoded(
      differenceDocument(swapped),
      differenceSpec({
        leftColumns: ['BOOK_ID'],
        rightColumns: ['BOOK'],
        differenceColumns: ['QTY'],
      }),
      REGISTRY,
    );
  });

  test('Reads a difference back, and an older Cube keeps one it does not know', () => {
    const json = differenceSpec({
      leftColumns: ['BOOK'],
      rightColumns: ['BOOK'],
      differenceColumns: ['QTY'],
    });
    const node = decodeCubeSpec(json, {
      registry: REGISTRY,
    }).document.query.getNode('difference101');
    expect(node).toBeInstanceOf(Difference);
    expect((node as Difference).differenceColumns).toEqual(['QTY']);
    // without Difference registered, it is an Unknown node, written back as it was
    const older = new NodeRegistry(
      createNodeRegistry().transforms.filter(
        (definition) => definition.type !== DIFFERENCE_DEFINITION.type,
      ),
    );
    const unknown = decodeCubeSpec(json, { registry: older }).document;
    expect(unknown.query.getNode('difference101')).toBeInstanceOf(UnknownNode);
    expect(encodeCubeSpec(unknown, older)).toStrictEqual(json);
  });
});

describe(unitTest('Saved spec encoding: extends'), () => {
  const REGISTRY = createNodeRegistry();

  /** The saved spec of one unconnected extend, `extend101`, with these fields of its own */
  const extendSpec = (own: JsonObject): JsonObject => ({
    formatVersion: 1,
    query: {
      selected: 'extend101',
      nodes: [{ kind: 'extend', id: 'extend101', inputs: [null], ...own }],
    },
  });
  const extendDocument = (extend: Extend): CubeDocument =>
    documentOf([extend], [], extend.id);
  /** `x | $x.QTY * 2`, a number literal as its digits */
  const LAMBDA: JsonObject = {
    _type: 'lambda',
    parameters: [{ _type: 'var', name: 'x' }],
    body: [
      {
        _type: 'func',
        function: 'times',
        parameters: [
          {
            _type: 'collection',
            values: [
              {
                _type: 'property',
                property: 'QTY',
                parameters: [{ _type: 'var', name: 'x' }],
              },
              { _type: 'integer', value: '9007199254740993' },
            ],
          },
        ],
      },
    ],
  };

  test('Writes a new extend as an empty list of columns, and nothing typed', () => {
    expectEncoded(
      extendDocument(EXTEND_DEFINITION.create('extend101')),
      extendSpec({ columns: [] }),
      REGISTRY,
    );
  });

  test('Writes each column with its code, its lambda once checked, and the types the engine gave', () => {
    const extend = new Extend(
      'extend101',
      [
        { name: 'big', code: 'x | $x.QTY * 9007199254740993', lambda: LAMBDA },
        { name: 'draft', code: 'x | $x.', lambda: undefined },
      ],
      {
        kind: 'typed',
        signature: '1a2b3c',
        types: [
          PrimitiveType.get('Integer'),
          PrimitiveType.get(`${PRECISE}Varchar`, [10]),
        ],
      },
    );
    expectEncoded(
      extendDocument(extend),
      extendSpec({
        columns: [
          {
            name: 'big',
            code: 'x | $x.QTY * 9007199254740993',
            lambda: LAMBDA,
          },
          { name: 'draft', code: 'x | $x.' },
        ],
        typed: {
          signature: '1a2b3c',
          types: [
            { path: 'Integer' },
            { path: `${PRECISE}Varchar`, params: [10] },
          ],
        },
      }),
      REGISTRY,
    );
  });

  test('Saves no failed typing: it is typed again on load', () => {
    const extend = new Extend(
      'extend101',
      [{ name: 'a', code: 'x | 1', lambda: LAMBDA }],
      { kind: 'failed', signature: '1a2b3c', message: 'No such column' },
    );
    expect(encodeCubeSpec(extendDocument(extend), REGISTRY)).toStrictEqual(
      extendSpec({ columns: [{ name: 'a', code: 'x | 1', lambda: LAMBDA }] }),
    );
  });

  test('Reads a typing without a type per column as nothing typed yet', () => {
    const { document } = decodeCubeSpec(
      extendSpec({
        columns: [{ name: 'a', code: 'x | 1', lambda: LAMBDA }],
        typed: { signature: '1a2b3c', types: [] },
      }),
      { registry: REGISTRY },
    );
    const node = document.query.getNode('extend101') as Extend;
    expect(node).toBeInstanceOf(Extend);
    expect(node.typing === UNTYPED).toBe(true);
  });

  test("Keeps a column or a typing with a key this version doesn't know as an Unknown node", () => {
    [
      extendSpec({
        columns: [{ name: 'a', code: 'x | 1', lambda: LAMBDA, window: true }],
      }),
      extendSpec({
        columns: [{ name: 'a', code: 'x | 1', lambda: LAMBDA }],
        typed: { signature: '1a2b3c', types: [{ path: 'Integer' }], at: 1 },
      }),
    ].forEach((json) => {
      const { document } = decodeCubeSpec(json, { registry: REGISTRY });
      expect(document.query.getNode('extend101')).toBeInstanceOf(UnknownNode);
      expect(encodeCubeSpec(document, REGISTRY)).toStrictEqual(json);
    });
  });
});
