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

import { TEST_DATA__relationalCompleteGraphEntities } from './RelationalEntitiesTestData';
import { unitTest, guaranteeType } from '@finos/legend-shared';
import type { Entity } from '@finos/legend-model-storage';
import type { GraphManagerState } from '../../../GraphManagerState';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '../../../GraphManagerTestUtils';
import { Database } from '../../../models/metamodels/pure/packageableElements/store/relational/model/Database';
import { RootRelationalInstanceSetImplementation } from '../../../models/metamodels/pure/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation';
import { getClassMappingsByClass } from '../../../helpers/MappingHelper';
import { EmbeddedRelationalInstanceSetImplementation } from '../../../models/metamodels/pure/packageableElements/store/relational/mapping/EmbeddedRelationalInstanceSetImplementation';
import { RelationalPropertyMapping } from '../../../models/metamodels/pure/packageableElements/store/relational/mapping/RelationalPropertyMapping';
import { PRIMITIVE_TYPE } from '../../../MetaModelConst';

let graphManagerState: GraphManagerState;

beforeEach(async () => {
  graphManagerState = TEST__getTestGraphManagerState();
  await TEST__buildGraphWithEntities(
    graphManagerState,
    TEST_DATA__relationalCompleteGraphEntities as Entity[],
  );
});

test(unitTest('Relational database is loaded properly'), () => {
  const graph = graphManagerState.graph;
  expect(graph.ownStores).toHaveLength(3);
  expect(graph.ownDatabases).toHaveLength(2);
  // db
  const db = graph.getDatabase('meta::relational::tests::db');
  expect(db.schemas).toHaveLength(2);
  expect(db.filters).toHaveLength(4);
  expect(db.joins).toHaveLength(21);
  const defaultSchema = db.getSchema('default');
  expect(defaultSchema.tables).toHaveLength(8);
  expect(defaultSchema.views).toHaveLength(7);
  const interactionTable = defaultSchema.getTable('interactionTable');
  expect(interactionTable.columns).toHaveLength(5);
  const primaryCol = interactionTable.primaryKey[0];
  expect(primaryCol.name).toBe('ID');
  const productSchema = db.getSchema('productSchema');
  expect(productSchema.tables).toHaveLength(1);
  expect(productSchema.views).toHaveLength(0);
  expect(db.includes).toHaveLength(1);
  // dbInc
  const dbInc = guaranteeType(db.includes[0].value, Database);
  expect(dbInc.path).toBe('meta::relational::tests::dbInc');
  const dbIncDefaultSchema = dbInc.getSchema('default');
  expect(dbIncDefaultSchema.tables).toHaveLength(9);
  expect(dbIncDefaultSchema.views).toHaveLength(3);
  // add join/fiilter tests
});

test(unitTest('Relational Mapping is loaded properly'), () => {
  const graph = graphManagerState.graph;
  expect(graph.ownMappings).toHaveLength(2);
  const simpleRelationalMapping = graph.getMapping(
    'meta::relational::tests::simpleRelationalMapping',
  );
  expect(simpleRelationalMapping.classMappings).toHaveLength(9);
  simpleRelationalMapping.classMappings.forEach((setImpl) => {
    expect(
      setImpl instanceof RootRelationalInstanceSetImplementation,
    ).toBeTrue();
    expect(
      (setImpl as RootRelationalInstanceSetImplementation).mainTableAlias,
    ).toBeDefined();
  });
  expect(simpleRelationalMapping.includes).toHaveLength(1);
  const simpleRelationalMappingInc =
    simpleRelationalMapping.includes[0].included.value;
  expect(simpleRelationalMappingInc.path).toBe(
    'meta::relational::tests::simpleRelationalMappingInc',
  );
  const _class = graph.getClass(
    'meta::pure::tests::model::simple::FirmExtension',
  );
  const firmExtensionSetImpl = guaranteeType(
    getClassMappingsByClass(simpleRelationalMappingInc, _class)[0],
    RootRelationalInstanceSetImplementation,
  );
  expect(firmExtensionSetImpl.propertyMappings).toHaveLength(3);
  const embeddedProperty = guaranteeType(
    firmExtensionSetImpl.findPropertyMapping('employeesExt', undefined),
    EmbeddedRelationalInstanceSetImplementation,
  );
  expect(embeddedProperty.propertyMappings).toHaveLength(1);
  const propertyMapping = guaranteeType(
    embeddedProperty.propertyMappings[0],
    RelationalPropertyMapping,
  );
  expect(propertyMapping.property.value.name).toBe('birthdate');
  expect(propertyMapping.property.ownerReference.value).toBe(
    graph.getClass('meta::pure::tests::model::simple::PersonExtension'),
  );
  expect(propertyMapping.sourceSetImplementation).toBe(firmExtensionSetImpl);
  expect(propertyMapping.property.value.genericType.value.rawType).toBe(
    graph.getPrimitiveType(PRIMITIVE_TYPE.DATE),
  );
});
