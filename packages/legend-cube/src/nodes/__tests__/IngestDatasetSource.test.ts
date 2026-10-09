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
import { column, resolvedTable } from '../../__test-utils__/CubeTestNodes.js';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import { Query } from '../../graph/Query.js';
import { type QueryNode, UNRESOLVED } from '../../graph/QueryNode.js';
import { emitIngestDatasetSource } from '../../ir/emitters/IngestDatasetSourceEmitter.js';
import {
  MESSAGE_SOURCE_KINDS_MIXED,
  MESSAGE_SOURCE_SCHEMA_UNRESOLVED,
} from '../../messages/CubeMessages.js';
import { Schema } from '../../schema/Schema.js';
import type { JsonObject } from '../../utils/Json.js';
import { DataProductAccessPointSource } from '../sources/DataProductAccessPointSource.js';
import {
  type IngestDatasetCoordinates,
  IngestDatasetSource,
} from '../sources/IngestDatasetSource.js';
import { isResolvableSource } from '../sources/ResolvableSource.js';
import { sourcesAreOneKind } from '../sources/SourceKinds.js';
import { UnknownNode } from '../UnknownNode.js';

const COORDINATES: IngestDatasetCoordinates = {
  ingestDefinitionUrn:
    'urn:lakehouse:prod:ingest:definition:alloy-git:com.example~sales~sales::ingest::OrdersIngest',
  ingestDefinition: 'sales::ingest::OrdersIngest',
  dataSet: 'TRADES',
};

const SCHEMA = new Schema([column('TRADE_ID'), column('DESK', 'String')]);

const resolvedDataSet = (id: string, dataSet = 'TRADES'): IngestDatasetSource =>
  new IngestDatasetSource(
    id,
    { ...COORDINATES, dataSet },
    { kind: 'resolved', schema: SCHEMA },
  );

describe(unitTest('Ingest data set source'), () => {
  test('Holds where the data set is, and no class, producer deployment or warehouse', () => {
    const node = new IngestDatasetSource('ingestDataset101', COORDINATES);
    expect(node.type).toBe('ingestDataset');
    expect(IngestDatasetSource.TYPE).toBe('ingestDataset');
    expect(node.ports).toEqual([]);
    expect(node.resolution).toBe(UNRESOLVED);
    expect({
      ingestDefinitionUrn: node.ingestDefinitionUrn,
      ingestDefinition: node.ingestDefinition,
      dataSet: node.dataSet,
    }).toEqual(COORDINATES);
    expect(node.ingestDefinitionName).toBe('OrdersIngest');
    // a definition in no package
    expect(
      new IngestDatasetSource('ingestDataset102', {
        ...COORDINATES,
        ingestDefinition: 'OrdersIngest',
      }).ingestDefinitionName,
    ).toBe('OrdersIngest');
  });

  test.each(Object.keys(COORDINATES))(
    'Refuses coordinates without a %s, an empty one, or one that is not text',
    (key) => {
      [undefined, '', 12].forEach((value) => {
        const coordinates = { ...COORDINATES, [key]: value };
        expect(
          () =>
            new IngestDatasetSource(
              'ingestDataset101',
              coordinates as unknown as IngestDatasetCoordinates,
            ),
        ).toThrow(
          'An ingest data set source needs an ingest definition URN, an ingest definition and a data set',
        );
        expect(() =>
          IngestDatasetSource.fromCoordinates('ingestDataset101', coordinates),
        ).toThrow();
      });
    },
  );

  test("Builds an unresolved source from the picker's coordinates, keeping none of its other keys", () => {
    [undefined, null, 'sales::ingest::OrdersIngest'].forEach((value) =>
      expect(() =>
        IngestDatasetSource.fromCoordinates('ingestDataset101', value),
      ).toThrow(),
    );
    const node = IngestDatasetSource.fromCoordinates('ingestDataset101', {
      ...COORDINATES,
      producerDeploymentId: '1234',
      warehouse: 'SALES_WH',
    });
    expect(node.resolution).toBe(UNRESOLVED);
    expect(node.rest).toEqual({});
    expect(Object.isFrozen(node.rest)).toBe(true);
  });

  test('Resolves to a new node with the same coordinates, keeping what it saved and did not read', () => {
    const rest: JsonObject = { laterKey: 1 };
    const columnRest = new Map([
      ['TRADE_ID', { column: { laterColumnKey: true }, type: {} }],
    ]);
    const node = new IngestDatasetSource(
      'ingestDataset101',
      COORDINATES,
      UNRESOLVED,
      rest,
      columnRest,
    );
    const resolved = node.withResolution({ kind: 'resolved', schema: SCHEMA });
    const failed = resolved.withResolution({
      kind: 'failed',
      message: 'The ingest definition is gone',
    });
    [resolved, failed].forEach((next) => {
      expect(next).not.toBe(node);
      expect(next.id).toBe(node.id);
      expect(next.key).not.toBe(node.key);
      expect(next.ingestDefinitionUrn).toBe(COORDINATES.ingestDefinitionUrn);
      expect(next.dataSet).toBe('TRADES');
      expect(next.rest).toBe(node.rest);
      expect(next.columnRest).toBe(columnRest);
    });
    expect(resolved.schematize([])).toBe(SCHEMA);
    expect(failed.schematize([])).toBeUndefined();
  });

  test("Is valid once resolved, and says why it isn't otherwise", () => {
    const node = new IngestDatasetSource('ingestDataset101', COORDINATES);
    const errorsOf = (source: IngestDatasetSource): string[] => {
      const errors: string[] = [];
      source.validate([], errors);
      return errors;
    };
    expect(errorsOf(node)).toEqual([MESSAGE_SOURCE_SCHEMA_UNRESOLVED]);
    expect(
      errorsOf(
        node.withResolution({
          kind: 'failed',
          message: '  The ingest definition is gone  \nat the server',
        }),
      ),
    ).toEqual(['The ingest definition is gone']);
    expect(
      errorsOf(node.withResolution({ kind: 'failed', message: ' \nmore' })),
    ).toEqual([MESSAGE_SOURCE_SCHEMA_UNRESOLVED]);
    expect(errorsOf(resolvedDataSet('ingestDataset101'))).toEqual([]);
  });

  test('Describes the data set and the definition by name, never the URN or the warehouse', () => {
    const node = new IngestDatasetSource('ingestDataset101', COORDINATES);
    expect(node.describe()).toBe('(unknown)');
    const failed = node.withResolution({ kind: 'failed', message: 'gone' });
    expect(failed.describe()).toBe(
      'Data set "TRADES" from ingest definition "OrdersIngest"',
    );
    expect(resolvedDataSet('ingestDataset101').describe()).toBe(
      'Data set "TRADES" from ingest definition "OrdersIngest"',
    );
    expect(failed.describeRedacted()).toBe(failed.describe());
  });

  test('Is its accessor, the definition and the data set, stamped with its node', () => {
    expect(
      emitIngestDatasetSource(resolvedDataSet('ingestDataset101')),
    ).toStrictEqual({
      k: 'ingestAccessor',
      path: ['sales::ingest::OrdersIngest', 'TRADES'],
      origin: { nodeId: 'ingestDataset101', role: 'accessor' },
    });
  });

  test('Is a source the host resolves', () => {
    expect(isResolvableSource(resolvedDataSet('ingestDataset101'))).toBe(true);
  });
});

describe(
  unitTest('One kind of source per query, with ingest data sets'),
  () => {
    const queryOf = (nodes: QueryNode[]): Query =>
      new Query(nodes, [], nodes[0]?.id);
    const errorsOf = (query: Query): [string, readonly string[]][] => [
      ...sourcesAreOneKind(query),
    ];
    const accessPoint = (id: string): DataProductAccessPointSource =>
      new DataProductAccessPointSource(
        id,
        {
          dataProduct: 'sales::products::OrdersProduct',
          accessPointGroup: 'core',
          accessPoint: 'daily_orders',
          dataProductId: 'ORDERS_PRODUCT',
          deploymentId: '1234',
        },
        { kind: 'resolved', schema: SCHEMA },
      );

    test('Lets a query read ingest data sets only', () => {
      expect(
        errorsOf(
          queryOf([
            resolvedDataSet('ingestDataset101'),
            resolvedDataSet('ingestDataset102', 'DESKS'),
          ]),
        ),
      ).toEqual([]);
    });

    test('Flags the other kinds after a first ingest data set, naming both kinds in a fixed order', () => {
      expect(
        errorsOf(
          queryOf([
            new UnknownNode('futureSource101', 0),
            resolvedDataSet('ingestDataset101'),
            resolvedTable('relational101', 'ORDERS', [column('ORDER_ID')]),
            accessPoint('dataProductAccessPoint101'),
          ]),
        ),
      ).toEqual([
        [
          'relational101',
          [
            MESSAGE_SOURCE_KINDS_MIXED(
              ['database tables', 'ingest data sets'],
              'ingest data sets',
            ),
          ],
        ],
        [
          'dataProductAccessPoint101',
          [
            MESSAGE_SOURCE_KINDS_MIXED(
              ['data products', 'ingest data sets'],
              'ingest data sets',
            ),
          ],
        ],
      ]);
    });

    test('Flags an ingest data set after a first table or access point', () => {
      expect(
        errorsOf(
          queryOf([
            accessPoint('dataProductAccessPoint101'),
            resolvedDataSet('ingestDataset101'),
          ]),
        ),
      ).toEqual([
        [
          'ingestDataset101',
          [
            'Data products and ingest data sets cannot be mixed in one query; this query reads from data products.',
          ],
        ],
      ]);
      expect(
        errorsOf(
          queryOf([
            resolvedTable('relational101', 'ORDERS', [column('ORDER_ID')]),
            resolvedDataSet('ingestDataset101'),
          ]),
        ),
      ).toEqual([
        [
          'ingestDataset101',
          [
            'Database tables and ingest data sets cannot be mixed in one query; this query reads from database tables.',
          ],
        ],
      ]);
    });
  },
);
