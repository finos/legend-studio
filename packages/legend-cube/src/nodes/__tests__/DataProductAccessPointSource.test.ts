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
import { Connection } from '../../graph/Connection.js';
import { Query } from '../../graph/Query.js';
import { type QueryNode, UNRESOLVED } from '../../graph/QueryNode.js';
import { buildSchemasAndValidity } from '../../inference/SchemaInference.js';
import { emitDataProductAccessPointSource } from '../../ir/emitters/DataProductAccessPointSourceEmitter.js';
import {
  MESSAGE_DATA_PRODUCT_AFTER_TABLE,
  MESSAGE_SOURCE_SCHEMA_UNRESOLVED,
  MESSAGE_TABLE_AFTER_DATA_PRODUCT,
} from '../../messages/CubeMessages.js';
import { Schema } from '../../schema/Schema.js';
import type { JsonObject } from '../../utils/Json.js';
import {
  type DataProductAccessPointCoordinates,
  DataProductAccessPointSource,
} from '../sources/DataProductAccessPointSource.js';
import { isResolvableSource } from '../sources/ResolvableSource.js';
import { sourcesAreOneKind } from '../sources/SourceKinds.js';
import { Join } from '../transforms/Join.js';
import { UnknownNode } from '../UnknownNode.js';

const COORDINATES: DataProductAccessPointCoordinates = {
  dataProduct: 'sales::products::OrdersProduct',
  accessPointGroup: 'core',
  accessPoint: 'daily_orders',
  dataProductId: 'ORDERS_PRODUCT',
  deploymentId: '1234',
};

const SCHEMA = new Schema([column('ORDER_ID'), column('REGION', 'String')]);

const resolvedAccessPoint = (
  id: string,
  accessPoint = 'daily_orders',
): DataProductAccessPointSource =>
  new DataProductAccessPointSource(
    id,
    { ...COORDINATES, accessPoint },
    { kind: 'resolved', schema: SCHEMA },
  );

describe(unitTest('Data product access point source'), () => {
  test('Holds where the access point is, and no project, version, environment or warehouse', () => {
    const node = new DataProductAccessPointSource(
      'dataProductAccessPoint101',
      COORDINATES,
    );
    expect(node.type).toBe('dataProductAccessPoint');
    expect(DataProductAccessPointSource.TYPE).toBe('dataProductAccessPoint');
    expect(node.ports).toEqual([]);
    expect(node.resolution).toBe(UNRESOLVED);
    expect({
      dataProduct: node.dataProduct,
      accessPointGroup: node.accessPointGroup,
      accessPoint: node.accessPoint,
      dataProductId: node.dataProductId,
      deploymentId: node.deploymentId,
    }).toEqual(COORDINATES);
    expect(node.dataProductName).toBe('OrdersProduct');
    // a product in no package
    expect(
      new DataProductAccessPointSource('dataProductAccessPoint102', {
        ...COORDINATES,
        dataProduct: 'OrdersProduct',
      }).dataProductName,
    ).toBe('OrdersProduct');
  });

  test.each(Object.keys(COORDINATES))(
    'Refuses coordinates without a %s, an empty one, or one that is not text',
    (key) => {
      [undefined, '', 12].forEach((value) => {
        const coordinates = { ...COORDINATES, [key]: value };
        expect(
          () =>
            new DataProductAccessPointSource(
              'dataProductAccessPoint101',
              coordinates as unknown as DataProductAccessPointCoordinates,
            ),
        ).toThrow(
          'A data product access point source needs a data product, an access point group, an access point, a data product id and a deployment id',
        );
        expect(() =>
          DataProductAccessPointSource.fromCoordinates(
            'dataProductAccessPoint101',
            coordinates,
          ),
        ).toThrow();
      });
    },
  );

  test("Builds an unresolved source from the picker's coordinates, keeping none of its other keys", () => {
    [undefined, null, 'sales::products::OrdersProduct'].forEach((value) =>
      expect(() =>
        DataProductAccessPointSource.fromCoordinates(
          'dataProductAccessPoint101',
          value,
        ),
      ).toThrow(),
    );
    const node = DataProductAccessPointSource.fromCoordinates(
      'dataProductAccessPoint101',
      { ...COORDINATES, title: 'Daily orders', parameters: [] },
    );
    expect(node.resolution).toBe(UNRESOLVED);
    expect(node.rest).toEqual({});
    expect(Object.isFrozen(node.rest)).toBe(true);
  });

  test('Resolves to a new node with the same coordinates, keeping what it saved and did not read', () => {
    const rest: JsonObject = { laterKey: 1 };
    const columnRest = new Map([
      ['ORDER_ID', { column: { laterColumnKey: true }, type: {} }],
    ]);
    const node = new DataProductAccessPointSource(
      'dataProductAccessPoint101',
      COORDINATES,
      UNRESOLVED,
      rest,
      columnRest,
    );
    const resolved = node.withResolution({ kind: 'resolved', schema: SCHEMA });
    const failed = resolved.withResolution({
      kind: 'failed',
      message: 'The access point is gone',
    });
    [resolved, failed].forEach((next) => {
      expect(next).not.toBe(node);
      expect(next.id).toBe(node.id);
      expect(next.key).not.toBe(node.key);
      expect(next.accessPoint).toBe('daily_orders');
      expect(next.rest).toBe(node.rest);
      expect(next.columnRest).toBe(columnRest);
    });
    expect(resolved.schematize([])).toBe(SCHEMA);
    expect(failed.schematize([])).toBeUndefined();
  });

  test("Is valid once resolved, and says why it isn't otherwise", () => {
    const node = new DataProductAccessPointSource(
      'dataProductAccessPoint101',
      COORDINATES,
    );
    const errorsOf = (source: DataProductAccessPointSource): string[] => {
      const errors: string[] = [];
      source.validate([], errors);
      return errors;
    };
    expect(errorsOf(node)).toEqual([MESSAGE_SOURCE_SCHEMA_UNRESOLVED]);
    expect(
      errorsOf(
        node.withResolution({
          kind: 'failed',
          message: '  The access point is gone  \nat the engine',
        }),
      ),
    ).toEqual(['The access point is gone']);
    expect(
      errorsOf(node.withResolution({ kind: 'failed', message: ' \nmore' })),
    ).toEqual([MESSAGE_SOURCE_SCHEMA_UNRESOLVED]);
    expect(errorsOf(resolvedAccessPoint('dataProductAccessPoint101'))).toEqual(
      [],
    );
  });

  test('Describes the access point and the data product by name, never the project or warehouse', () => {
    const node = new DataProductAccessPointSource(
      'dataProductAccessPoint101',
      COORDINATES,
    );
    expect(node.describe()).toBe('(unknown)');
    const failed = node.withResolution({ kind: 'failed', message: 'gone' });
    expect(failed.describe()).toBe(
      'Access point "daily_orders" from data product "OrdersProduct"',
    );
    expect(resolvedAccessPoint('dataProductAccessPoint101').describe()).toBe(
      'Access point "daily_orders" from data product "OrdersProduct"',
    );
    expect(failed.describeRedacted()).toBe(failed.describe());
  });

  test('Is its accessor, the data product and the access point, stamped with its node', () => {
    expect(
      emitDataProductAccessPointSource(
        resolvedAccessPoint('dataProductAccessPoint101'),
      ),
    ).toStrictEqual({
      k: 'dataProductAccessor',
      path: ['sales::products::OrdersProduct', 'daily_orders'],
      origin: { nodeId: 'dataProductAccessPoint101', role: 'accessor' },
    });
  });

  test('Is a source the host resolves, as a relational table is', () => {
    expect(
      isResolvableSource(resolvedAccessPoint('dataProductAccessPoint101')),
    ).toBe(true);
    expect(
      isResolvableSource(resolvedTable('relational101', 'ORDERS', [])),
    ).toBe(true);
    expect(isResolvableSource(new UnknownNode('pivot101', 1))).toBe(false);
    expect(isResolvableSource(new Join('join101'))).toBe(false);
  });
});

describe(unitTest('One kind of source per query'), () => {
  const queryOf = (nodes: QueryNode[]): Query =>
    new Query(nodes, [], nodes[0]?.id);
  const errorsOf = (query: Query): [string, readonly string[]][] => [
    ...sourcesAreOneKind(query),
  ];

  test('Lets a query read data products only, or tables only', () => {
    expect(
      errorsOf(
        queryOf([
          resolvedAccessPoint('dataProductAccessPoint101'),
          resolvedAccessPoint('dataProductAccessPoint102', 'weekly_orders'),
        ]),
      ),
    ).toEqual([]);
    expect(
      errorsOf(
        queryOf([
          resolvedTable('relational101', 'ORDERS', [column('ORDER_ID')]),
          resolvedTable('relational102', 'CUSTOMERS', [column('ID')]),
        ]),
      ),
    ).toEqual([]);
  });

  test('Flags the sources of the other kind than the first, in either order, ignoring nodes it cannot read', () => {
    expect(
      errorsOf(
        queryOf([
          new UnknownNode('futureSource101', 0),
          resolvedAccessPoint('dataProductAccessPoint101'),
          resolvedTable('relational101', 'ORDERS', [column('ORDER_ID')]),
          resolvedTable('relational102', 'CUSTOMERS', [column('ID')]),
        ]),
      ),
    ).toEqual([
      ['relational101', [MESSAGE_TABLE_AFTER_DATA_PRODUCT]],
      ['relational102', [MESSAGE_TABLE_AFTER_DATA_PRODUCT]],
    ]);
    expect(
      errorsOf(
        queryOf([
          resolvedTable('relational101', 'ORDERS', [column('ORDER_ID')]),
          resolvedAccessPoint('dataProductAccessPoint101'),
        ]),
      ),
    ).toEqual([
      ['dataProductAccessPoint101', [MESSAGE_DATA_PRODUCT_AFTER_TABLE]],
    ]);
  });

  test('Makes a join of a table and a data product invalid where the second source enters', () => {
    const query = new Query(
      [
        resolvedTable('relational101', 'ORDERS', [column('ORDER_ID')]),
        resolvedAccessPoint('dataProductAccessPoint101'),
        new Join('join101', {
          leftColumns: ['ORDER_ID'],
          rightColumns: ['ORDER_ID'],
        }),
      ],
      [
        new Connection('relational101', 'join101', 'leftTds'),
        new Connection('dataProductAccessPoint101', 'join101', 'rightTds'),
      ],
      'join101',
    );
    const { validity } = buildSchemasAndValidity(query, [sourcesAreOneKind]);
    expect(validity.get('dataProductAccessPoint101')).toEqual([
      MESSAGE_DATA_PRODUCT_AFTER_TABLE,
    ]);
    expect(validity.get('relational101')).toEqual([]);
  });
});
