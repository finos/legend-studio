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
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import {
  createNodeRegistry,
  FILTER_DEFINITION,
  NodeRegistry,
  RELATIONAL_TABLE_SOURCE_DEFINITION,
} from '../../nodes/NodeRegistry.js';
import { FunctionSource } from '../../nodes/sources/FunctionSource.js';
import { UnknownNode } from '../../nodes/UnknownNode.js';
import type { JsonObject, JsonValue } from '../../utils/Json.js';
import { decodeCubeSpec, encodeCubeSpec } from '../CubeSpecCodec.js';
import { CubeSpecDecodeError } from '../SpecReader.js';

// Cubes on functions (PLAN §6.5): each source saves the function, its
// parameters and their values; the model and runtime are the cube's

const REGISTRY = createNodeRegistry();

const SPEC: JsonObject = {
  formatVersion: 1,
  name: 'Orders',
  context: {
    model: {
      _type: 'pointer',
      sdlcInfo: {
        _type: 'alloy',
        groupId: 'com.example',
        artifactId: 'sales',
        version: '1.10.0',
        packageableElementPointers: [],
      },
    },
    runtime: 'sales::SalesRuntime',
  },
  query: {
    selected: 'function101',
    nodes: [
      {
        kind: 'function',
        id: 'function101',
        function: 'sales::ordersAbove',
        signature: 'sales::ordersAbove_Float_1__String_$0_1$__Relation_1_',
        parameters: [
          { name: 'min', type: { path: 'Float' }, optional: false },
          { name: 'status', type: { path: 'String' }, optional: true },
        ],
        values: [{ kind: 'float', value: '100' }, null],
        schemaSnapshot: [
          {
            name: 'ID',
            type: { path: 'meta::pure::precisePrimitives::Int' },
            nullable: false,
          },
        ],
        laterKey: 'kept',
      },
      {
        kind: 'function',
        id: 'function102',
        function: 'sales::allOrders',
        signature: 'sales::allOrders__Relation_1_',
        parameters: [],
        values: [],
      },
      {
        kind: 'function',
        id: 'function103',
        function: 'sales::ordersOn',
        signature: 'sales::ordersOn_StrictDate_1__Boolean_1__Relation_1_',
        parameters: [
          { name: 'day', type: { path: 'StrictDate' }, optional: false },
          { name: 'open', type: { path: 'Boolean' }, optional: false },
        ],
        values: [
          { kind: 'invalid', text: 'yesterday' },
          { kind: 'boolean', value: true },
        ],
      },
    ],
  },
};

const withFirstNodeField = (key: string, value?: JsonValue): JsonObject => {
  const query = SPEC.query as { nodes: JsonObject[] };
  const [first, ...others] = query.nodes;
  const node: Record<string, JsonValue> = { ...first };
  if (value === undefined) {
    delete node[key];
  } else {
    node[key] = value;
  }
  return { ...SPEC, query: { ...query, nodes: [node, ...others] } };
};

describe(unitTest('Saved specs of function cubes'), () => {
  test('Reads each function, its parameters and values, and re-saves the spec exactly', () => {
    const { document } = decodeCubeSpec(SPEC, { registry: REGISTRY });
    const [first, second, third] = document.query.nodes as FunctionSource[];
    expect(first).toBeInstanceOf(FunctionSource);
    expect(first?.function).toBe('sales::ordersAbove');
    expect(
      first?.parameters.map((parameter) => parameter.type.displayName),
    ).toEqual(['Float', 'String']);
    expect(first?.values).toEqual([{ kind: 'float', value: '100' }, undefined]);
    expect(first?.resolution.kind).toBe('resolved');
    expect(first?.rest).toEqual({ laterKey: 'kept' });
    expect(second?.resolution.kind).toBe('unresolved');
    expect(third?.values).toEqual([
      { kind: 'invalid', text: 'yesterday' },
      { kind: 'boolean', value: true },
    ]);
    expect(JSON.stringify(encodeCubeSpec(document, REGISTRY))).toBe(
      JSON.stringify(SPEC),
    );
  });

  test.each([
    ['function', undefined],
    ['signature', 12],
    ['parameters', undefined],
    ['parameters', [{ name: 'min', type: { path: 'Float' } }]],
    [
      'parameters',
      [{ name: 'min', type: { path: 'Float' }, optional: false, extra: 1 }],
    ],
    ['values', undefined],
    ['values', [{ kind: 'float', value: '100' }]],
    ['values', [{ kind: 'float', value: 100 }, null]],
    ['values', [{ kind: 'colour', value: 'red' }, null]],
  ] as [string, JsonValue | undefined][])(
    'Refuses a function whose %s is %j',
    (key, value) => {
      expect(() =>
        decodeCubeSpec(withFirstNodeField(key, value), { registry: REGISTRY }),
      ).toThrow(CubeSpecDecodeError);
    },
  );

  test('Keeps every function, as saved, for a version without functions', () => {
    const older = new NodeRegistry([
      RELATIONAL_TABLE_SOURCE_DEFINITION,
      FILTER_DEFINITION,
    ]);
    const { document } = decodeCubeSpec(SPEC, { registry: older });
    expect(
      document.query.nodes.every(
        (node) => node instanceof UnknownNode && node.savedKind === 'function',
      ),
    ).toBe(true);
    expect(JSON.stringify(encodeCubeSpec(document, older))).toBe(
      JSON.stringify(SPEC),
    );
  });
});
