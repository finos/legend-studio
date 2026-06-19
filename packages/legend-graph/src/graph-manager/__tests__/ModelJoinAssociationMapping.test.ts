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
import {
  TEST_DATA__ModelJoinAssociationMapping_Simple,
  TEST_DATA__ModelJoinAssociationMapping_WithIdAndStores,
  TEST_DATA__ModelJoinAssociationMapping_ComplexCondition,
} from './roundtripTestData/TEST_DATA__ModelJoinMappingRoundtrip.js';
import {
  TEST__checkBuildingElementsRoundtrip,
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '../__test-utils__/GraphManagerTestUtils.js';
import { V1_ModelJoinAssociationMapping } from '../protocol/pure/v1/model/packageableElements/mapping/modelJoin/V1_ModelJoinAssociationMapping.js';
import { ModelJoinAssociationImplementation } from '../../graph/metamodel/pure/packageableElements/mapping/modelJoin/ModelJoinAssociationImplementation.js';
import type { Entity } from '@finos/legend-storage';

// =====================================================================
// Roundtrip tests: build graph from entities, transform back, compare
// =====================================================================

describe(
  unitTest('ModelJoin association mapping import resolution roundtrip'),
  () => {
    test.each([
      [
        'Simple ModelJoin association mapping',
        TEST_DATA__ModelJoinAssociationMapping_Simple,
      ],
      [
        'ModelJoin with explicit id',
        TEST_DATA__ModelJoinAssociationMapping_WithIdAndStores,
      ],
      [
        'ModelJoin with complex AND condition',
        TEST_DATA__ModelJoinAssociationMapping_ComplexCondition,
      ],
    ])('%s', async (testName, entities) => {
      await TEST__checkBuildingElementsRoundtrip(entities as Entity[]);
    });
  },
);

// =====================================================================
// Graph build tests: verify the graph metamodel is constructed correctly
// =====================================================================

describe(unitTest('ModelJoin association mapping graph build'), () => {
  test('builds ModelJoinAssociationImplementation with joinCondition', async () => {
    const graphManagerState = TEST__getTestGraphManagerState();
    await TEST__buildGraphWithEntities(
      graphManagerState,
      TEST_DATA__ModelJoinAssociationMapping_Simple as Entity[],
    );
    const mapping = graphManagerState.graph.getMapping('test::MyMapping');
    expect(mapping).toBeDefined();
    expect(mapping.associationMappings).toHaveLength(1);

    const assocMapping = mapping.associationMappings[0];
    expect(assocMapping).toBeInstanceOf(ModelJoinAssociationImplementation);

    const modelJoinMapping = assocMapping as ModelJoinAssociationImplementation;
    expect(modelJoinMapping.joinCondition).toBeDefined();
    expect(modelJoinMapping.association.value.name).toBe('Firm_Person');
  });

  test('builds ModelJoinAssociationImplementation with explicit id', async () => {
    const graphManagerState = TEST__getTestGraphManagerState();
    await TEST__buildGraphWithEntities(
      graphManagerState,
      TEST_DATA__ModelJoinAssociationMapping_WithIdAndStores as Entity[],
    );
    const mapping = graphManagerState.graph.getMapping('test::MyMapping');
    expect(mapping).toBeDefined();
    expect(mapping.associationMappings).toHaveLength(1);

    const assocMapping = mapping.associationMappings[0];
    expect(assocMapping).toBeInstanceOf(ModelJoinAssociationImplementation);

    const modelJoinMapping = assocMapping as ModelJoinAssociationImplementation;
    expect(modelJoinMapping.id.value).toBe('myModelJoinId');
  });

  test('builds ModelJoinAssociationImplementation with complex condition', async () => {
    const graphManagerState = TEST__getTestGraphManagerState();
    await TEST__buildGraphWithEntities(
      graphManagerState,
      TEST_DATA__ModelJoinAssociationMapping_ComplexCondition as Entity[],
    );
    const mapping = graphManagerState.graph.getMapping('test::MyMapping');
    expect(mapping).toBeDefined();
    expect(mapping.associationMappings).toHaveLength(1);

    const assocMapping = mapping.associationMappings[0];
    expect(assocMapping).toBeInstanceOf(ModelJoinAssociationImplementation);

    const modelJoinMapping = assocMapping as ModelJoinAssociationImplementation;
    expect(modelJoinMapping.joinCondition).toBeDefined();
    // The body should contain the 'and' function
    expect(modelJoinMapping.joinCondition.body).toBeDefined();
  });
});

// =====================================================================
// Hash stability tests: verify hash computation is stable
// =====================================================================

describe(unitTest('ModelJoin association mapping hash'), () => {
  test('hash is stable across builds', async () => {
    const graphManagerState = TEST__getTestGraphManagerState();
    await TEST__buildGraphWithEntities(
      graphManagerState,
      TEST_DATA__ModelJoinAssociationMapping_Simple as Entity[],
    );
    const mapping = graphManagerState.graph.getMapping('test::MyMapping');
    const hash1 = mapping.hashCode;

    // Build again and verify hash is consistent
    const graphManagerState2 = TEST__getTestGraphManagerState();
    await TEST__buildGraphWithEntities(
      graphManagerState2,
      TEST_DATA__ModelJoinAssociationMapping_Simple as Entity[],
    );
    const mapping2 = graphManagerState2.graph.getMapping('test::MyMapping');
    const hash2 = mapping2.hashCode;

    expect(hash1).toBe(hash2);
  });

  test('hash differs with different join conditions', async () => {
    const graphManagerState1 = TEST__getTestGraphManagerState();
    await TEST__buildGraphWithEntities(
      graphManagerState1,
      TEST_DATA__ModelJoinAssociationMapping_Simple as Entity[],
    );
    const mapping1 = graphManagerState1.graph.getMapping('test::MyMapping');

    const graphManagerState2 = TEST__getTestGraphManagerState();
    await TEST__buildGraphWithEntities(
      graphManagerState2,
      TEST_DATA__ModelJoinAssociationMapping_ComplexCondition as Entity[],
    );
    const mapping2 = graphManagerState2.graph.getMapping('test::MyMapping');

    expect(mapping1.hashCode).not.toBe(mapping2.hashCode);
  });
});

// =====================================================================
// V1 Protocol model tests: verify class instantiation and hash code
// =====================================================================

describe(unitTest('V1_ModelJoinAssociationMapping protocol'), () => {
  test('can be instantiated', () => {
    const mapping = new V1_ModelJoinAssociationMapping();
    expect(mapping).toBeDefined();
    expect(mapping.stores).toEqual([]);
  });
});
