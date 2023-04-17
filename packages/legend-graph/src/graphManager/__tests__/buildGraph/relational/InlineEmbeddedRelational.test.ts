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

import { test, expect, beforeEach } from '@jest/globals';
import { TEST_DATA__inlineEmbeddedRelationalTestData } from './TEST_DATA__RelationalEntities.js';
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import type { Entity } from '@finos/legend-storage';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '../../../__test-utils__/GraphManagerTestUtils.js';
import type { GraphManagerState } from '../../../GraphManagerState.js';
import { getOwnClassMappingsByClass } from '../../../../graph/helpers/DSL_Mapping_Helper.js';
import { RootRelationalInstanceSetImplementation } from '../../../../graph/metamodel/pure/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation.js';

let graphManagerState: GraphManagerState;

beforeEach(async () => {
  graphManagerState = TEST__getTestGraphManagerState();
  await TEST__buildGraphWithEntities(
    graphManagerState,
    TEST_DATA__inlineEmbeddedRelationalTestData as Entity[],
  );
});

// TODO Add more processing checks
test(unitTest('Inline Embedded Relational Mapping'), () => {
  // db
  const graph = graphManagerState.graph;
  const myDB = graph.getDatabase('mapping::db');
  expect(myDB.schemas).toHaveLength(1);
  expect(guaranteeNonNullable(myDB.schemas[0]).tables).toHaveLength(1);

  // mapping
  const mapping = graph.getMapping('mappingPackage::myMapping');
  // person
  const personClassMapping = guaranteeType(
    getOwnClassMappingsByClass(mapping, graph.getClass('other::Person'))[0],
    RootRelationalInstanceSetImplementation,
  );
  expect(personClassMapping.id.value).toBe('alias1');
  expect(personClassMapping.propertyMappings).toHaveLength(3);
  // const otherwiseFirmMapping = guaranteeType(findPropertyMapping(personClassMapping, 'firm', undefined), OtherwiseEmbeddedRelationalInstanceSetImplementation);
  // const legalNamePropertyMapping = guaranteeType(findPropertyMapping(otherwiseFirmMapping, 'legalName', undefined), RelationalPropertyMapping);
  // expect(legalNamePropertyMapping.owner).toBe(otherwiseFirmMapping);
  // expect(otherwiseFirmMapping.id.value).toBe('alias1_firm');
  // expect(otherwiseFirmMapping.primaryKey).toHaveLength(2);
  // expect(otherwiseFirmMapping.sourceSetImplementation).toBe(personClassMapping);
  // const otherwisePropertyMapping = guaranteeType(otherwiseFirmMapping.otherwisePropertyMapping, RelationalPropertyMapping);
  // expect(otherwisePropertyMapping.property.ownerReference.value).toBe(graph.getClass('other::Firm'));
  // expect(otherwisePropertyMapping.relationalOperation).toBeDefined();
  // expect(otherwisePropertyMapping.targetSetImplementation?.id.value).toBe('firm1');
  // expect(otherwisePropertyMapping.targetSetImplementation?.class.value).toBe(graph.getClass('other::Firm'));
});
