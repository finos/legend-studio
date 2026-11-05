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
import { UNRESOLVED } from '../../graph/QueryNode.js';
import { emitFunctionSource } from '../../ir/emitters/FunctionSourceEmitter.js';
import {
  MESSAGE_PARAMETER_VALUE_INVALID,
  MESSAGE_PARAMETER_VALUE_OUT_OF_RANGE,
  MESSAGE_PARAMETER_WITHOUT_VALUE,
  MESSAGE_SOURCE_KINDS_MIXED,
  MESSAGE_SOURCE_SCHEMA_UNRESOLVED,
} from '../../messages/CubeMessages.js';
import { Schema } from '../../schema/Schema.js';
import { resolveCubeType } from '../../types/CubeType.js';
import { createNodeRegistry } from '../NodeRegistry.js';
import { DataProductAccessPointSource } from '../sources/DataProductAccessPointSource.js';
import {
  type FunctionCoordinates,
  FunctionSource,
} from '../sources/FunctionSource.js';
import { isResolvableSource } from '../sources/ResolvableSource.js';
import { sourcesAreOneKind } from '../sources/SourceKinds.js';

const ORDERS_ABOVE: FunctionCoordinates = {
  function: 'sales::ordersAbove',
  signature: 'sales::ordersAbove_Float_1__String_$0_1$__Relation_1_',
  parameters: [
    { name: 'min', type: resolveCubeType('Float'), optional: false },
    { name: 'status', type: resolveCubeType('String'), optional: true },
  ],
};

const ALL_ORDERS: FunctionCoordinates = {
  function: 'sales::allOrders',
  signature: 'sales::allOrders__Relation_1_',
  parameters: [],
};

const SCHEMA = new Schema([column('ID'), column('AMOUNT', 'Float')]);

const RESOLVED = { kind: 'resolved', schema: SCHEMA } as const;

const errorsOf = (node: FunctionSource): string[] => {
  const errors: string[] = [];
  node.validate([], errors);
  return errors;
};

describe(unitTest('Function source'), () => {
  test('Holds the function, its signature, its parameters and a value for each', () => {
    const node = new FunctionSource('function101', ORDERS_ABOVE, [
      { kind: 'float', value: '100' },
    ]);
    expect(node.type).toBe('function');
    expect(node.ports).toEqual([]);
    expect(node.resolution).toBe(UNRESOLVED);
    expect(node.functionName).toBe('ordersAbove');
    expect(node.parameters.map((parameter) => parameter.name)).toEqual([
      'min',
      'status',
    ]);
    // one per parameter: a missing one is undefined
    expect(node.values).toEqual([{ kind: 'float', value: '100' }, undefined]);
    expect(
      () =>
        new FunctionSource('function102', ALL_ORDERS, [
          { kind: 'float', value: '1' },
        ]),
    ).toThrow(
      'A function source has a value for each of its 0 parameters, not 1',
    );
  });

  test("Builds an unresolved source from the picker's coordinates and values, keeping none of its other keys", () => {
    const node = FunctionSource.fromCoordinates('function101', {
      ...ORDERS_ABOVE,
      values: [{ kind: 'float', value: '5' }],
      runtime: 'sales::Runtime',
    });
    expect(node.values[0]).toEqual({ kind: 'float', value: '5' });
    expect(node.rest).toEqual({});
    [
      undefined,
      { signature: 's', parameters: [] },
      { function: 'f', parameters: [] },
      { function: 'f', signature: 's' },
      { function: 'f', signature: 's', parameters: [{ name: 'x' }] },
    ].forEach((coordinates) =>
      expect(() =>
        FunctionSource.fromCoordinates('function101', coordinates),
      ).toThrow(
        'A function source needs a function, a signature and its parameters',
      ),
    );
  });

  test('Keeps its values when resolved, and its resolution when its values change', () => {
    const node = new FunctionSource('function101', ORDERS_ABOVE, [
      { kind: 'float', value: '100' },
    ]);
    const resolved = node.withResolution(RESOLVED);
    expect(resolved.values).toEqual(node.values);
    expect(resolved.schematize([])).toBe(SCHEMA);
    const changed = resolved.withValues([
      { kind: 'float', value: '5' },
      { kind: 'string', value: 'OPEN' },
    ]);
    expect(changed.id).toBe('function101');
    expect(changed.resolution).toBe(resolved.resolution);
    expect(changed.values[1]).toEqual({ kind: 'string', value: 'OPEN' });
  });

  test('Is valid once resolved, with a valid value for each required parameter', () => {
    const resolved = new FunctionSource('function101', ORDERS_ABOVE, [
      { kind: 'float', value: '100' },
    ]).withResolution(RESOLVED);
    expect(errorsOf(resolved)).toEqual([]);
    expect(errorsOf(resolved.withValues([]))).toEqual([
      MESSAGE_PARAMETER_WITHOUT_VALUE('min'),
    ]);
    expect(
      errorsOf(resolved.withValues([{ kind: 'invalid', text: 'lots' }])),
    ).toEqual([MESSAGE_PARAMETER_VALUE_INVALID('min', 'lots', 'Float')]);
    expect(
      errorsOf(
        new FunctionSource(
          'function102',
          {
            ...ALL_ORDERS,
            parameters: [
              {
                name: 'n',
                type: resolveCubeType('meta::pure::precisePrimitives::TinyInt'),
                optional: false,
              },
            ],
          },
          [{ kind: 'integer', value: '300' }],
          RESOLVED,
        ),
      ),
    ).toEqual([MESSAGE_PARAMETER_VALUE_OUT_OF_RANGE('n', '300', 'TinyInt')]);
    // not resolved: both problems are given
    expect(errorsOf(new FunctionSource('function103', ORDERS_ABOVE))).toEqual([
      MESSAGE_SOURCE_SCHEMA_UNRESOLVED,
      MESSAGE_PARAMETER_WITHOUT_VALUE('min'),
    ]);
    expect(
      errorsOf(
        new FunctionSource('function104', ALL_ORDERS).withResolution({
          kind: 'failed',
          message: "Can't find function sales::allOrders\nmore",
        }),
      ),
    ).toEqual(["Can't find function sales::allOrders"]);
  });

  test('Describes the function by name with its parameters, never their values', () => {
    expect(new FunctionSource('function101', ORDERS_ABOVE).describe()).toBe(
      '(unknown)',
    );
    const resolved = new FunctionSource('function101', ORDERS_ABOVE, [
      { kind: 'float', value: '100' },
    ]).withResolution(RESOLVED);
    expect(resolved.describe()).toBe('Function "ordersAbove"(min, status)');
    expect(resolved.describeRedacted()).toBe(resolved.describe());
    expect(
      new FunctionSource('function102', ALL_ORDERS, [], RESOLVED).describe(),
    ).toBe('Function "allOrders"');
  });

  test('Is its call, each value a literal stamped with the node, an empty optional one []', () => {
    expect(
      emitFunctionSource(
        new FunctionSource(
          'function101',
          ORDERS_ABOVE,
          [{ kind: 'float', value: '100' }],
          RESOLVED,
        ),
      ),
    ).toStrictEqual({
      k: 'func',
      name: 'sales::ordersAbove',
      params: [
        {
          k: 'literal',
          value: { kind: 'float', value: '100' },
          origin: { nodeId: 'function101', role: 'value' },
        },
        { k: 'collection', values: [] },
      ],
      origin: { nodeId: 'function101', role: 'accessor' },
    });
    expect(
      emitFunctionSource(
        new FunctionSource('function102', ALL_ORDERS, [], RESOLVED),
      ),
    ).toStrictEqual({
      k: 'func',
      name: 'sales::allOrders',
      params: [],
      origin: { nodeId: 'function102', role: 'accessor' },
    });
  });

  test('Is a source the host resolves, in beta in the registry, after ingest data sets and data spaces', () => {
    expect(
      isResolvableSource(new FunctionSource('function101', ALL_ORDERS)),
    ).toBe(true);
    const registry = createNodeRegistry();
    expect(registry.get(FunctionSource.TYPE)?.label).toBe('Function');
    expect(registry.get(FunctionSource.TYPE)?.beta).toBe(true);
    expect(
      registry.sources.map((definition) => definition.type).slice(2, 5),
    ).toEqual(['ingestDataset', 'dataSpace', 'function']);
  });
});

describe(unitTest('One kind of source per query, with functions'), () => {
  test('Lets a query read functions and tables together, but not a data product', () => {
    const fn = new FunctionSource('function101', ALL_ORDERS, [], RESOLVED);
    const table = resolvedTable('relational101', 'ORDERS', [column('ID')]);
    expect([...sourcesAreOneKind(new Query([fn, table], [], fn.id))]).toEqual(
      [],
    );
    const accessPoint = new DataProductAccessPointSource(
      'dataProductAccessPoint101',
      {
        dataProduct: 'dp::Orders',
        accessPointGroup: 'g',
        accessPoint: 'orders',
        dataProductId: 'ORDERS',
        deploymentId: '1',
      },
    );
    expect([
      ...sourcesAreOneKind(new Query([fn, accessPoint], [], fn.id)),
    ]).toEqual([
      [
        'dataProductAccessPoint101',
        [
          MESSAGE_SOURCE_KINDS_MIXED(
            ['database tables', 'data products'],
            'database tables',
          ),
        ],
      ],
    ]);
  });
});
