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
  DATA_PRODUCT_ACCESS_POINT_SOURCE_DEFINITION,
  FILTER_DEFINITION,
  INGEST_DATASET_SOURCE_DEFINITION,
  JOIN_DEFINITION,
  LIMIT_DEFINITION,
  NodeRegistry,
  RELATIONAL_TABLE_SOURCE_DEFINITION,
} from '../../nodes/NodeRegistry.js';
import { IngestDatasetSource } from '../../nodes/sources/IngestDatasetSource.js';
import { UnknownNode } from '../../nodes/UnknownNode.js';
import type { JsonObject } from '../../utils/Json.js';
import { decodeCubeSpec, encodeCubeSpec } from '../CubeSpecCodec.js';
import { CubeSpecDecodeError } from '../SpecReader.js';

// Cubes on ingest data sets: each source saves where its data set is; the
// cube's model, which the core keeps whole, is the host's (its shape here is
// only an example)

/** The node kinds with ingest data sets, which the default registry doesn't have yet */
const REGISTRY = new NodeRegistry([
  RELATIONAL_TABLE_SOURCE_DEFINITION,
  DATA_PRODUCT_ACCESS_POINT_SOURCE_DEFINITION,
  INGEST_DATASET_SOURCE_DEFINITION,
  FILTER_DEFINITION,
  LIMIT_DEFINITION,
  JOIN_DEFINITION,
]);

const URN =
  'urn:lakehouse:prod:ingest:definition:alloy-git:com.example~sales~sales::ingest::OrdersIngest';

const SPEC: JsonObject = {
  formatVersion: 1,
  name: 'Trades',
  context: {
    model: {
      _type: 'cubeIngest',
      environmentType: 'PRODUCTION',
      producerDeploymentId: '1234',
    },
    runtime: 'cube::ingest::Runtime',
  },
  query: {
    selected: 'ingestDataset101',
    nodes: [
      {
        kind: 'ingestDataset',
        id: 'ingestDataset101',
        ingestDefinitionUrn: URN,
        ingestDefinition: 'sales::ingest::OrdersIngest',
        dataSet: 'TRADES',
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
        kind: 'ingestDataset',
        id: 'ingestDataset102',
        ingestDefinitionUrn: URN,
        ingestDefinition: 'sales::ingest::OrdersIngest',
        dataSet: 'DESKS',
      },
    ],
  },
};

const withFirstNode = (fields: JsonObject): JsonObject => {
  const query = SPEC.query as { nodes: JsonObject[] };
  const [first, ...others] = query.nodes;
  return {
    ...SPEC,
    query: { ...query, nodes: [{ ...first, ...fields }, ...others] },
  };
};

describe(unitTest('Saved specs of ingest cubes'), () => {
  test('Reads each data set, resolved from its snapshot or unresolved without one, and re-saves the spec exactly', () => {
    const { document } = decodeCubeSpec(SPEC, { registry: REGISTRY });
    const [first, second] = document.query.nodes as IngestDatasetSource[];
    expect(first).toBeInstanceOf(IngestDatasetSource);
    expect(first?.ingestDefinitionUrn).toBe(URN);
    expect(first?.dataSet).toBe('TRADES');
    expect(first?.resolution.kind).toBe('resolved');
    expect(first?.rest).toEqual({ laterKey: 'kept' });
    expect(second?.resolution.kind).toBe('unresolved');
    expect(document.context?.model).toEqual((SPEC.context as JsonObject).model);
    expect(JSON.stringify(encodeCubeSpec(document, REGISTRY))).toBe(
      JSON.stringify(SPEC),
    );
  });

  test('Saves no snapshot for a failed data set', () => {
    const { document } = decodeCubeSpec(SPEC, { registry: REGISTRY });
    const [first] = document.query.nodes as IngestDatasetSource[];
    const failed = (first as IngestDatasetSource).withResolution({
      kind: 'failed',
      message: 'The ingest definition is gone',
    });
    const saved = encodeCubeSpec(
      document.withQuery(document.query.replace(failed)),
      REGISTRY,
    );
    const [node] = (saved.query as { nodes: JsonObject[] }).nodes;
    expect(node?.schemaSnapshot).toBeUndefined();
    expect(node?.ingestDefinitionUrn).toBe(URN);
  });

  test.each(['ingestDefinitionUrn', 'ingestDefinition', 'dataSet'])(
    'Refuses a data set whose %s is missing or not text',
    (key) => {
      [undefined, 12].forEach((value) =>
        expect(() =>
          decodeCubeSpec(withFirstNode({ [key]: value }), {
            registry: REGISTRY,
          }),
        ).toThrow(CubeSpecDecodeError),
      );
    },
  );

  test('Keeps every data set, as saved, for a version without ingest data sets', () => {
    const older = createNodeRegistry();
    const { document } = decodeCubeSpec(SPEC, { registry: older });
    const kept = document.query.nodes.filter(
      (node) =>
        node instanceof UnknownNode && node.savedKind === 'ingestDataset',
    );
    expect(kept.map((node) => node.id)).toEqual([
      'ingestDataset101',
      'ingestDataset102',
    ]);
    kept.forEach((node) => expect(node.ports).toEqual([]));
    expect(JSON.stringify(encodeCubeSpec(document, older))).toBe(
      JSON.stringify(SPEC),
    );
  });
});
