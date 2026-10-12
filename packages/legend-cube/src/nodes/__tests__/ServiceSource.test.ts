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
import { emitServiceSource } from '../../ir/emitters/ServiceSourceEmitter.js';
import {
  MESSAGE_SERVICE_NOT_READABLE,
  MESSAGE_SOURCE_KINDS_MIXED,
  MESSAGE_SOURCE_SCHEMA_UNRESOLVED,
} from '../../messages/CubeMessages.js';
import { Schema } from '../../schema/Schema.js';
import { createNodeRegistry } from '../NodeRegistry.js';
import { isResolvableSource } from '../sources/ResolvableSource.js';
import {
  type ServiceCoordinates,
  ServiceSource,
} from '../sources/ServiceSource.js';
import { sourcesAreOneKind } from '../sources/SourceKinds.js';

const COORDINATES: ServiceCoordinates = {
  pattern: '/trades/byDesk',
  service: 'trading::services::TradesByDesk',
};

const SCHEMA = new Schema([column('TRADE_ID'), column('DESK', 'String')]);

const errorsOf = (node: ServiceSource): string[] => {
  const errors: string[] = [];
  node.validate([], errors);
  return errors;
};

describe(unitTest('Service source'), () => {
  test('Holds the pattern and the name of the service, with no ports', () => {
    const node = new ServiceSource('service101', COORDINATES);
    expect(node.type).toBe('service');
    expect(ServiceSource.TYPE).toBe('service');
    expect(node.ports).toEqual([]);
    expect(node.resolution).toBe(UNRESOLVED);
    expect(node.pattern).toBe('/trades/byDesk');
    expect(node.service).toBe('trading::services::TradesByDesk');
    expect(node.serviceName).toBe('TradesByDesk');
    expect(
      new ServiceSource('service102', { ...COORDINATES, service: 'Trades' })
        .serviceName,
    ).toBe('Trades');
  });

  test("Builds an unresolved source from the picker's coordinates, keeping none of its other keys", () => {
    const node = ServiceSource.fromCoordinates('service101', {
      ...COORDINATES,
      title: 'Trades by desk',
    });
    expect(node.pattern).toBe(COORDINATES.pattern);
    expect(node.rest).toEqual({});
    [
      undefined,
      {},
      { pattern: '/a' },
      { service: 's' },
      { pattern: 1, service: 's' },
    ].forEach((coordinates) =>
      expect(() =>
        ServiceSource.fromCoordinates('service101', coordinates),
      ).toThrow('A service source needs a pattern and a service'),
    );
  });

  test('Resolves to a new node with the same coordinates', () => {
    const node = new ServiceSource('service101', COORDINATES);
    const resolved = node.withResolution({ kind: 'resolved', schema: SCHEMA });
    expect(resolved).not.toBe(node);
    expect(resolved.id).toBe('service101');
    expect(resolved.pattern).toBe(COORDINATES.pattern);
    expect(resolved.schematize([])).toBe(SCHEMA);
    expect(node.schematize([])).toBeUndefined();
  });

  test("Is valid once resolved, and says why it isn't otherwise", () => {
    const node = new ServiceSource('service101', COORDINATES);
    expect(errorsOf(node)).toEqual([MESSAGE_SOURCE_SCHEMA_UNRESOLVED]);
    expect(
      errorsOf(
        node.withResolution({
          kind: 'failed',
          message: `${MESSAGE_SERVICE_NOT_READABLE}\nmore`,
        }),
      ),
    ).toEqual([MESSAGE_SERVICE_NOT_READABLE]);
    expect(
      errorsOf(node.withResolution({ kind: 'resolved', schema: SCHEMA })),
    ).toEqual([]);
  });

  test('Describes the service by name and pattern once looked at', () => {
    const node = new ServiceSource('service101', COORDINATES);
    expect(node.describe()).toBe('(unknown)');
    const failed = node.withResolution({ kind: 'failed', message: 'not yet' });
    expect(failed.describe()).toBe('Service "TradesByDesk" at /trades/byDesk');
    expect(failed.describeRedacted()).toBe(failed.describe());
  });

  test("Isn't emitted yet: reading a service is still to come", () => {
    expect(() =>
      emitServiceSource(
        new ServiceSource('service101', COORDINATES, {
          kind: 'resolved',
          schema: SCHEMA,
        }),
      ),
    ).toThrow(`${MESSAGE_SERVICE_NOT_READABLE}: /trades/byDesk`);
  });

  test('Is a source the host resolves, in beta in the registry', () => {
    expect(
      isResolvableSource(new ServiceSource('service101', COORDINATES)),
    ).toBe(true);
    const definition = createNodeRegistry().get(ServiceSource.TYPE);
    expect(definition?.kind).toBe('source');
    expect(definition?.label).toBe('Service');
    expect(definition?.beta).toBe(true);
  });
});

describe(unitTest('One kind of source per query, with services'), () => {
  const queryOf = (nodes: QueryNode[]): Query =>
    new Query(nodes, [], nodes[0]?.id);

  test('Lets a query read services only', () => {
    const query = queryOf([
      new ServiceSource('service101', COORDINATES),
      new ServiceSource('service102', { ...COORDINATES, pattern: '/desks' }),
    ]);
    expect([...sourcesAreOneKind(query)]).toEqual([]);
  });

  test('Flags a table after a first service, and a service after a first table', () => {
    expect([
      ...sourcesAreOneKind(
        queryOf([
          new ServiceSource('service101', COORDINATES),
          resolvedTable('relational101', 'TRADES', [column('ID')]),
        ]),
      ),
    ]).toEqual([
      [
        'relational101',
        [
          MESSAGE_SOURCE_KINDS_MIXED(
            ['database tables', 'services'],
            'services',
          ),
        ],
      ],
    ]);
    expect([
      ...sourcesAreOneKind(
        queryOf([
          resolvedTable('relational101', 'TRADES', [column('ID')]),
          new ServiceSource('service101', COORDINATES),
        ]),
      ),
    ]).toEqual([
      [
        'service101',
        [
          'Database tables and services cannot be mixed in one query; this query reads from database tables.',
        ],
      ],
    ]);
  });
});
