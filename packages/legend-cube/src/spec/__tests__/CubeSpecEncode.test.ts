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
  LIMIT_DEFINITION,
  NodeRegistry,
  RELATIONAL_TABLE_SOURCE_DEFINITION,
} from '../../nodes/NodeRegistry.js';
import { RelationalTableSource } from '../../nodes/sources/RelationalTableSource.js';
import { Filter } from '../../nodes/transforms/Filter.js';
import { Join, JoinType } from '../../nodes/transforms/Join.js';
import { Limit } from '../../nodes/transforms/Limit.js';
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
const expectReadBack = (document: CubeDocument): void => {
  const encoded = encodeCubeSpec(document);
  const decoded = decodeCubeSpec(encoded).document;
  expect(describeDocument(decoded)).toEqual(describeDocument(document));
  expect(JSON.stringify(encodeCubeSpec(decoded))).toBe(JSON.stringify(encoded));
};

/**
 * The document saves to exactly `expected`, keys in its order (R144), and
 * reads back equal
 */
const expectEncoded = (document: CubeDocument, expected: JsonObject): void => {
  const encoded = encodeCubeSpec(document);
  expect(encoded).toStrictEqual(expected);
  expect(JSON.stringify(encoded)).toBe(JSON.stringify(expected));
  expectReadBack(document);
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
