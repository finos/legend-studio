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

import { TEST_DATA__otherwiseEmbeddedRelationalTestData } from './RelationalEntitiesTestData';
import { guaranteeType, unitTest } from '@finos/legend-shared';
import {
  TEST__buildGraphBasic,
  TEST__getTestEditorStore,
} from '../../../EditorStoreTestUtils';
import type { Entity } from '@finos/legend-model-storage';
import {
  RootRelationalInstanceSetImplementation,
  OtherwiseEmbeddedRelationalInstanceSetImplementation,
  RelationalPropertyMapping,
  getClassMappingsByClass,
} from '@finos/legend-graph';

const editorStore = TEST__getTestEditorStore();

beforeAll(async () => {
  await TEST__buildGraphBasic(
    TEST_DATA__otherwiseEmbeddedRelationalTestData as Entity[],
    editorStore,
  );
});

test(unitTest('Otherwise Embedded Relational Mapping'), () => {
  // db
  const graph = editorStore.graphManagerState.graph;
  const myDB = graph.getDatabase('mapping::db');
  expect(myDB.schemas).toHaveLength(1);
  expect(myDB.schemas[0].tables).toHaveLength(2);
  expect(myDB.joins).toHaveLength(1);

  // mapping
  const mapping = graph.getMapping('mappingPackage::myMapping');
  // person
  const personClassMapping = guaranteeType(
    getClassMappingsByClass(mapping, graph.getClass('other::Person'))[0],
    RootRelationalInstanceSetImplementation,
  );
  expect(personClassMapping.id.value).toBe('alias1');
  expect(personClassMapping.propertyMappings).toHaveLength(2);
  const otherwiseFirmMapping = guaranteeType(
    personClassMapping.findPropertyMapping('firm', undefined),
    OtherwiseEmbeddedRelationalInstanceSetImplementation,
  );

  // const legalNamePropertyMapping = guaranteeType(otherwiseFirmMapping.findPropertyMapping('legalName', undefined), RelationalPropertyMapping);
  // expect(legalNamePropertyMapping.owner).toBe(otherwiseFirmMapping);
  expect(otherwiseFirmMapping.id.value).toBe('alias1_firm');
  expect(otherwiseFirmMapping.primaryKey).toHaveLength(1);
  expect(otherwiseFirmMapping.sourceSetImplementation).toBe(personClassMapping);
  const otherwisePropertyMapping = guaranteeType(
    otherwiseFirmMapping.otherwisePropertyMapping,
    RelationalPropertyMapping,
  );
  // expect(otherwisePropertyMapping.property.ownerReference.value).toBe(graph.getClass('other::Firm'));
  expect(otherwisePropertyMapping.relationalOperation).toBeDefined();
  expect(otherwisePropertyMapping.targetSetImplementation?.id.value).toBe(
    'firm1',
  );
  expect(otherwisePropertyMapping.targetSetImplementation?.class.value).toBe(
    graph.getClass('other::Firm'),
  );
});
