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

import { embeddedRelational } from './RelationalEntitiesTestData';
import type { Entity } from '../../../../models/sdlc/models/entity/Entity';
import { guaranteeType, unitTest } from '@finos/legend-studio-shared';
import { getTestEditorStore } from '../../../StoreTestUtils';
import { RootRelationalInstanceSetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation';
import { EmbeddedRelationalInstanceSetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/store/relational/mapping/EmbeddedRelationalInstanceSetImplementation';
import { flowResult } from 'mobx';

const editorStore = getTestEditorStore();

beforeAll(async () => {
  await flowResult(editorStore.graphState.initializeSystem());
  await flowResult(
    editorStore.graphState.graphManager.buildGraph(
      editorStore.graphState.graph,
      embeddedRelational as Entity[],
    ),
  );
});

test(unitTest('Embedded Relational Mapping'), () => {
  // db
  const graph = editorStore.graphState.graph;
  const myDB = graph.getDatabase(
    'meta::relational::tests::mapping::embedded::model::store::myDB',
  );
  expect(myDB.schemas).toHaveLength(1);
  const defaultSchema = myDB.schemas[0];
  expect(defaultSchema.tables).toHaveLength(8);
  expect(myDB.joins).toHaveLength(7);

  // mapping
  const mapping = graph.getMapping(
    'meta::relational::tests::mapping::embedded::model::mapping::testMappingEmbedded',
  );
  const personClassMapping = guaranteeType(
    mapping.classMappingsByClass(
      graph.getClass('meta::pure::tests::model::simple::Person'),
    )[0],
    RootRelationalInstanceSetImplementation,
  );
  expect(personClassMapping.id.value).toBe(
    'meta_pure_tests_model_simple_Person',
  );
  expect(personClassMapping.primaryKey.length).toBe(2);
  expect(personClassMapping.propertyMappings).toHaveLength(4);
  // address embedded
  const addressEmbedded = guaranteeType(
    personClassMapping.findPropertyMapping('address', undefined),
    EmbeddedRelationalInstanceSetImplementation,
  );
  expect(addressEmbedded.propertyMappings).toHaveLength(2);
  const addressClass = graph.getClass(
    'meta::pure::tests::model::simple::Address',
  );
  expect(addressEmbedded.id.value).toBe(
    'meta_pure_tests_model_simple_Person_address',
  );
  expect(addressEmbedded.rootInstanceSetImplementation).toBe(
    personClassMapping,
  );
  expect(addressEmbedded.class.value).toBe(addressClass);
  // firm embedded
  const firmEmbedded = guaranteeType(
    personClassMapping.findPropertyMapping('firm', undefined),
    EmbeddedRelationalInstanceSetImplementation,
  );
  expect(firmEmbedded.propertyMappings).toHaveLength(3);
  expect(firmEmbedded.id.value).toBe(
    'meta_pure_tests_model_simple_Person_firm',
  );
  const firmClass = graph.getClass('meta::pure::tests::model::simple::Firm');
  expect(firmEmbedded.class.value).toBe(firmClass);
  // firm address embedded
  const firmEmbeddedAddress = guaranteeType(
    firmEmbedded.findPropertyMapping('address', undefined),
    EmbeddedRelationalInstanceSetImplementation,
  );
  expect(firmEmbeddedAddress.id.value).toBe(
    'meta_pure_tests_model_simple_Person_firm_address',
  );
  expect(firmEmbeddedAddress.propertyMappings).toHaveLength(2);
  expect(firmEmbeddedAddress.class.value).toBe(addressClass);
  expect(firmEmbeddedAddress.rootInstanceSetImplementation).toBe(
    personClassMapping,
  );
  expect(firmEmbeddedAddress.property.value).toBe(
    firmClass.getProperty('address'),
  );
});
