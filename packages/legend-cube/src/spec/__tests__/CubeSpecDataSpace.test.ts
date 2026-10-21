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
import { TRADES_DATA_SPACE } from '../../__test-utils__/CubeTestNodes.js';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import {
  createNodeRegistry,
  FILTER_DEFINITION,
  NodeRegistry,
  RELATIONAL_TABLE_SOURCE_DEFINITION,
} from '../../nodes/NodeRegistry.js';
import { DataSpaceSource } from '../../nodes/sources/DataSpaceSource.js';
import { UnknownNode } from '../../nodes/UnknownNode.js';
import type { JsonObject, JsonValue } from '../../utils/Json.js';
import { decodeCubeSpec, encodeCubeSpec } from '../CubeSpecCodec.js';
import { CubeSpecDecodeError } from '../SpecReader.js';

// Cubes on a data space (PLAN §11.25): each source saves its data space,
// execution context and entity, and the query builder's two lambdas; the
// model, mapping and runtime are the cube's

const REGISTRY = createNodeRegistry();

const SPEC: JsonObject = {
  formatVersion: 1,
  name: 'Large trades',
  context: {
    model: {
      _type: 'pointer',
      sdlcInfo: {
        _type: 'alloy',
        groupId: 'com.example',
        artifactId: 'trading',
        version: '2.3.0',
        packageableElementPointers: [],
      },
    },
    runtime: 'trading::TradeRuntime',
    mapping: 'trading::TradeMapping',
  },
  query: {
    selected: 'dataSpace101',
    nodes: [
      {
        kind: 'dataSpace',
        id: 'dataSpace101',
        dataSpace: TRADES_DATA_SPACE.dataSpace,
        executionContext: TRADES_DATA_SPACE.executionContext,
        entity: TRADES_DATA_SPACE.entity,
        query: TRADES_DATA_SPACE.query,
        relation: TRADES_DATA_SPACE.relation,
        schemaSnapshot: [
          {
            name: 'id',
            type: { path: 'Integer' },
            nullable: false,
          },
        ],
        laterKey: 'kept',
      },
      {
        kind: 'dataSpace',
        id: 'dataSpace102',
        dataSpace: TRADES_DATA_SPACE.dataSpace,
        executionContext: TRADES_DATA_SPACE.executionContext,
        entity: 'trading::Position',
        query: TRADES_DATA_SPACE.query,
        relation: TRADES_DATA_SPACE.relation,
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

describe(unitTest('Saved specs of data space cubes'), () => {
  test('Reads each source and the mapping, and re-saves the spec exactly', () => {
    const { document } = decodeCubeSpec(SPEC, { registry: REGISTRY });
    expect(document.context?.mapping).toBe('trading::TradeMapping');
    expect(document.context?.runtime).toBe('trading::TradeRuntime');
    const [first, second] = document.query.nodes as DataSpaceSource[];
    expect(first).toBeInstanceOf(DataSpaceSource);
    expect(first?.dataSpace).toBe('trading::TradesDataSpace');
    expect(first?.executionContext).toBe('production');
    expect(first?.query).toEqual(TRADES_DATA_SPACE.query);
    expect(first?.relation).toEqual(TRADES_DATA_SPACE.relation);
    expect(first?.resolution.kind).toBe('resolved');
    expect(first?.rest).toEqual({ laterKey: 'kept' });
    expect(second?.entityName).toBe('Position');
    expect(second?.resolution.kind).toBe('unresolved');
    expect(JSON.stringify(encodeCubeSpec(document, REGISTRY))).toBe(
      JSON.stringify(SPEC),
    );
  });

  test('Saves no mapping for a cube without one', () => {
    const context = { ...(SPEC.context as JsonObject) };
    delete context.mapping;
    const { document } = decodeCubeSpec(
      { ...SPEC, context },
      { registry: REGISTRY },
    );
    expect(document.context?.mapping).toBeUndefined();
    expect(
      Object.keys(
        encodeCubeSpec(document, REGISTRY).context as Record<string, unknown>,
      ),
    ).toEqual(['model', 'runtime']);
  });

  test("Refuses a mapping that isn't text", () => {
    expect(() =>
      decodeCubeSpec(
        { ...SPEC, context: { ...(SPEC.context as JsonObject), mapping: 3 } },
        { registry: REGISTRY },
      ),
    ).toThrow(CubeSpecDecodeError);
  });

  test.each([
    ['without a data space', 'dataSpace', undefined],
    ['whose execution context is a number', 'executionContext', 12],
    ['whose entity is empty', 'entity', ''],
    ['whose query is text', 'query', 'trading::Trade.all()'],
    ['without a relation', 'relation', undefined],
    [
      'whose relation is no lambda',
      'relation',
      { _type: 'func', function: 'getAll', parameters: [] },
    ],
    [
      'whose relation has parameters',
      'relation',
      {
        _type: 'lambda',
        body: TRADES_DATA_SPACE.relation.body as JsonValue[],
        parameters: [{ _type: 'var', name: 'businessDate' }],
      },
    ],
  ] as [string, string, JsonValue | undefined][])(
    'Refuses a data space source %s',
    (_, key, value) => {
      expect(() =>
        decodeCubeSpec(withFirstNodeField(key, value), { registry: REGISTRY }),
      ).toThrow(CubeSpecDecodeError);
    },
  );

  test('Names the relation in the error when its shape is wrong', () => {
    expect(() =>
      decodeCubeSpec(
        withFirstNodeField('relation', { _type: 'lambda', body: [] }),
        { registry: REGISTRY },
      ),
    ).toThrow(
      'query.nodes[0].relation: must be a lambda with no parameters and one expression',
    );
  });

  test('Keeps every data space source, as saved, for a version without them', () => {
    const older = new NodeRegistry([
      RELATIONAL_TABLE_SOURCE_DEFINITION,
      FILTER_DEFINITION,
    ]);
    const { document } = decodeCubeSpec(SPEC, { registry: older });
    expect(
      document.query.nodes.every(
        (node) => node instanceof UnknownNode && node.savedKind === 'dataSpace',
      ),
    ).toBe(true);
    expect(JSON.stringify(encodeCubeSpec(document, older))).toBe(
      JSON.stringify(SPEC),
    );
  });
});
