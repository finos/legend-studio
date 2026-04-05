/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import { test, expect, describe } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { guaranteeNonNullable } from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
// eslint-disable-next-line @finos/legend/enforce-module-import-hierarchy
import { V1_entitiesToPureModelContextData } from '../../protocol/pure/v1/transformation/pureProtocol/V1_PureProtocolSerialization.js';
// eslint-disable-next-line @finos/legend/enforce-module-import-hierarchy
import { V1_PureModelContextData } from '../../protocol/pure/v1/model/context/V1_PureModelContextData.js';
import { GraphDataDeserializationError } from '../../GraphManagerUtils.js';

/**
 * Creates a minimal class entity for testing deserialization batching.
 */
const createClassEntity = (index: number): Entity => ({
  path: `test::batch::TestClass_${index}`,
  content: {
    _type: 'class',
    name: `TestClass_${index}`,
    package: 'test::batch',
    properties: [
      {
        multiplicity: { lowerBound: 1, upperBound: 1 },
        name: 'name',
        type: 'String',
      },
    ],
  },
  classifierPath: 'meta::pure::metamodel::type::Class',
});

/**
 * Creates N class entities for batch testing.
 */
const createEntities = (count: number): Entity[] =>
  Array.from({ length: count }, (_, i) => createClassEntity(i));

describe('V1_entitiesToPureModelContextData batching', () => {
  test(
    unitTest('handles 0 entities (graph.elements stays empty)'),
    async () => {
      const graph = new V1_PureModelContextData();
      await V1_entitiesToPureModelContextData([], graph, []);
      expect(graph.elements).toHaveLength(0);
    },
  );

  test(
    unitTest('handles undefined entities (graph.elements stays empty)'),
    async () => {
      const graph = new V1_PureModelContextData();
      await V1_entitiesToPureModelContextData(undefined, graph, []);
      expect(graph.elements).toHaveLength(0);
    },
  );

  test(
    unitTest('deserializes < 100 entities in a single batch (no yield needed)'),
    async () => {
      const entities = createEntities(50);
      const graph = new V1_PureModelContextData();
      await V1_entitiesToPureModelContextData(entities, graph, []);
      expect(graph.elements).toHaveLength(50);
      // verify first and last elements have correct paths
      expect(guaranteeNonNullable(graph.elements[0]).path).toBe(
        'test::batch::TestClass_0',
      );
      expect(guaranteeNonNullable(graph.elements[49]).path).toBe(
        'test::batch::TestClass_49',
      );
    },
  );

  test(
    unitTest('deserializes exactly 100 entities (one full batch)'),
    async () => {
      const entities = createEntities(100);
      const graph = new V1_PureModelContextData();
      await V1_entitiesToPureModelContextData(entities, graph, []);
      expect(graph.elements).toHaveLength(100);
      expect(guaranteeNonNullable(graph.elements[0]).path).toBe(
        'test::batch::TestClass_0',
      );
      expect(guaranteeNonNullable(graph.elements[99]).path).toBe(
        'test::batch::TestClass_99',
      );
    },
  );

  test(
    unitTest(
      'deserializes > 100 entities across multiple batches (250 entities)',
    ),
    async () => {
      const entities = createEntities(250);
      const graph = new V1_PureModelContextData();
      await V1_entitiesToPureModelContextData(entities, graph, []);
      expect(graph.elements).toHaveLength(250);
      // verify order is preserved across batch boundaries
      expect(guaranteeNonNullable(graph.elements[0]).path).toBe(
        'test::batch::TestClass_0',
      );
      expect(guaranteeNonNullable(graph.elements[99]).path).toBe(
        'test::batch::TestClass_99',
      );
      expect(guaranteeNonNullable(graph.elements[100]).path).toBe(
        'test::batch::TestClass_100',
      );
      expect(guaranteeNonNullable(graph.elements[199]).path).toBe(
        'test::batch::TestClass_199',
      );
      expect(guaranteeNonNullable(graph.elements[200]).path).toBe(
        'test::batch::TestClass_200',
      );
      expect(guaranteeNonNullable(graph.elements[249]).path).toBe(
        'test::batch::TestClass_249',
      );
    },
  );

  test(
    unitTest(
      'all elements are unique and present after multi-batch processing',
    ),
    async () => {
      const count = 250;
      const entities = createEntities(count);
      const graph = new V1_PureModelContextData();
      await V1_entitiesToPureModelContextData(entities, graph, []);
      const paths = graph.elements.map((el) => el.path);
      // all paths should be unique
      expect(new Set(paths).size).toBe(count);
      // every input entity should have a corresponding element
      for (let i = 0; i < count; i++) {
        expect(paths).toContain(`test::batch::TestClass_${i}`);
      }
    },
  );

  test(
    unitTest('populates TEMPORARY__entityPathIndex across batch boundaries'),
    async () => {
      const count = 150;
      const entities = createEntities(count);
      const graph = new V1_PureModelContextData();
      const pathIndex = new Map<string, string>();
      await V1_entitiesToPureModelContextData(
        entities,
        graph,
        [],
        undefined,
        undefined,
        pathIndex,
      );
      expect(pathIndex.size).toBe(count);
      // check entries from the first batch and the second batch
      expect(pathIndex.get('test::batch::TestClass_0')).toBe(
        'test::batch::TestClass_0',
      );
      expect(pathIndex.get('test::batch::TestClass_99')).toBe(
        'test::batch::TestClass_99',
      );
      expect(pathIndex.get('test::batch::TestClass_100')).toBe(
        'test::batch::TestClass_100',
      );
      expect(pathIndex.get('test::batch::TestClass_149')).toBe(
        'test::batch::TestClass_149',
      );
    },
  );

  test(
    unitTest(
      'throws GraphDataDeserializationError for malformed entity content',
    ),
    async () => {
      const entities: Entity[] = [
        ...createEntities(5),
        {
          path: 'test::batch::BadEntity',
          content: {
            _type: 'class',
            // missing required 'name' and 'package' fields causes deserialization to throw
          },
          classifierPath: 'meta::pure::metamodel::type::Class',
        },
      ];
      const graph = new V1_PureModelContextData();
      await expect(
        V1_entitiesToPureModelContextData(entities, graph, []),
      ).rejects.toThrow(GraphDataDeserializationError);
    },
  );
});
