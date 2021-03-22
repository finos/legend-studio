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

import { inlineEmbeddedRelational } from './RelationalEntitiesTestData';
import type { Entity } from '../../../../models/sdlc/models/entity/Entity';
import { guaranteeType, unitTest } from '@finos/legend-studio-shared';
import { getTestEditorStore } from '../../../StoreTestUtils';
import { RootRelationalInstanceSetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation';

const editorStore = getTestEditorStore();

beforeAll(async () => {
  await editorStore.graphState.initializeSystem();
  await editorStore.graphState.graphManager.buildGraph(
    editorStore.graphState.graph,
    inlineEmbeddedRelational as Entity[],
  );
});

// TODO Add more processing checks
test(unitTest('Inline Embedded Relational Mapping'), () => {
  // db
  const graph = editorStore.graphState.graph;
  const myDB = graph.getDatabase('mapping::db');
  expect(myDB.schemas).toHaveLength(1);
  expect(myDB.schemas[0].tables).toHaveLength(1);

  // mapping
  const mapping = graph.getMapping('mappingPackage::myMapping');
  // // person
  const personClassMapping = guaranteeType(
    mapping.classMappingsByClass(graph.getClass('other::Person'))[0],
    RootRelationalInstanceSetImplementation,
  );
  expect(personClassMapping.id.value).toBe('alias1');
  expect(personClassMapping.propertyMappings).toHaveLength(3);
  // const otherwiseFirmMapping = guaranteeType(personClassMapping.findPropertyMapping('firm', undefined), OtherwiseEmbeddedRelationalInstanceSetImplementation);
  // const legalNamePropertyMapping = guaranteeType(otherwiseFirmMapping.findPropertyMapping('legalName', undefined), RelationalPropertyMapping);
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
