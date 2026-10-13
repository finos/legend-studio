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
import { ServiceSource } from '../../nodes/sources/ServiceSource.js';
import { UnknownNode } from '../../nodes/UnknownNode.js';
import type { JsonObject, JsonValue } from '../../utils/Json.js';
import { decodeCubeSpec, encodeCubeSpec } from '../CubeSpecCodec.js';
import { CubeSpecDecodeError } from '../SpecReader.js';

// Cubes on services (PLAN §6.4): each source saves the service's pattern and
// name; the cube's model, which the core keeps whole, is the host's

const REGISTRY = createNodeRegistry();

const SPEC: JsonObject = {
  formatVersion: 1,
  name: 'Trades',
  context: { model: { _type: 'cubeService' } },
  query: {
    selected: 'service101',
    nodes: [
      {
        kind: 'service',
        id: 'service101',
        pattern: '/trades/byDesk',
        service: 'trading::services::TradesByDesk',
        schemaSnapshot: [
          {
            name: 'TRADE_ID',
            type: { path: 'meta::pure::precisePrimitives::Int' },
            nullable: false,
            laterColumnKey: 1,
          },
        ],
        laterKey: 'kept',
      },
      {
        kind: 'service',
        id: 'service102',
        pattern: '/desks',
        service: 'trading::services::Desks',
      },
    ],
  },
};

/** The spec with its first node's field set, or removed when there is no value */
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

describe(unitTest('Saved specs of service cubes'), () => {
  test('Reads each service, resolved from its snapshot or unresolved without one, and re-saves the spec exactly', () => {
    const { document } = decodeCubeSpec(SPEC, { registry: REGISTRY });
    const [first, second] = document.query.nodes as ServiceSource[];
    expect(first).toBeInstanceOf(ServiceSource);
    expect(first?.pattern).toBe('/trades/byDesk');
    expect(first?.service).toBe('trading::services::TradesByDesk');
    expect(first?.resolution.kind).toBe('resolved');
    expect(first?.rest).toEqual({ laterKey: 'kept' });
    expect(second?.resolution.kind).toBe('unresolved');
    expect(document.context?.model).toEqual({ _type: 'cubeService' });
    expect(document.context?.runtime).toBeUndefined();
    expect(JSON.stringify(encodeCubeSpec(document, REGISTRY))).toBe(
      JSON.stringify(SPEC),
    );
  });

  test('Saves no snapshot for a service that failed', () => {
    const { document } = decodeCubeSpec(SPEC, { registry: REGISTRY });
    const [first] = document.query.nodes as ServiceSource[];
    const failed = (first as ServiceSource).withResolution({
      kind: 'failed',
      message: "Cube can't read services yet",
    });
    const saved = encodeCubeSpec(
      document.withQuery(document.query.replace(failed)),
      REGISTRY,
    );
    const [node] = (saved.query as { nodes: JsonObject[] }).nodes;
    expect(node?.schemaSnapshot).toBeUndefined();
    expect(node?.pattern).toBe('/trades/byDesk');
  });

  test.each(['pattern', 'service'])(
    'Refuses a service whose %s is missing or not text',
    (key) => {
      [undefined, 12].forEach((value) =>
        expect(() =>
          decodeCubeSpec(withFirstNodeField(key, value), {
            registry: REGISTRY,
          }),
        ).toThrow(CubeSpecDecodeError),
      );
    },
  );

  test('Keeps every service, as saved, for a version without services', () => {
    const older = new NodeRegistry([
      RELATIONAL_TABLE_SOURCE_DEFINITION,
      FILTER_DEFINITION,
    ]);
    const { document } = decodeCubeSpec(SPEC, { registry: older });
    const kept = document.query.nodes.filter(
      (node) => node instanceof UnknownNode && node.savedKind === 'service',
    );
    expect(kept.map((node) => node.id)).toEqual(['service101', 'service102']);
    expect(JSON.stringify(encodeCubeSpec(document, older))).toBe(
      JSON.stringify(SPEC),
    );
  });
});
