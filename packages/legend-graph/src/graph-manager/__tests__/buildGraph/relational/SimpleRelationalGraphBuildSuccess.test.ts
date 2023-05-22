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
import { TEST_DATA__relationalCompleteGraphEntities } from './TEST_DATA__RelationalEntities.js';
import { guaranteeType, guaranteeNonNullable } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import type { Entity } from '@finos/legend-storage';
import type { GraphManagerState } from '../../../GraphManagerState.js';
import {
  TEST__buildGraphWithEntities,
  TEST__checkBuildingElementsRoundtrip,
  TEST__getTestGraphManagerState,
  TEST__GraphManagerPluginManager,
} from '../../../__test-utils__/GraphManagerTestUtils.js';
import { Database } from '../../../../graph/metamodel/pure/packageableElements/store/relational/model/Database.js';
import { RootRelationalInstanceSetImplementation } from '../../../../graph/metamodel/pure/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation.js';
import {
  findPropertyMapping,
  getOwnClassMappingsByClass,
} from '../../../../graph/helpers/DSL_Mapping_Helper.js';
import { EmbeddedRelationalInstanceSetImplementation } from '../../../../graph/metamodel/pure/packageableElements/store/relational/mapping/EmbeddedRelationalInstanceSetImplementation.js';
import { RelationalPropertyMapping } from '../../../../graph/metamodel/pure/packageableElements/store/relational/mapping/RelationalPropertyMapping.js';
import { TEST_DATA__SemiStructuredRelationalTypeRoundtrip } from './TEST_DATA__SemiStructuredRelationalTypeRoundtrip.js';
import { TEST_DATA__JsonRelationalTypeRoundtrip } from './TEST_DATA__JsonRelationalTypeRoundtrip.js';
import {
  getSchema,
  getTable,
} from '../../../../graph/helpers/STO_Relational_Helper.js';
import { PrimitiveType } from '../../../../graph/metamodel/pure/packageableElements/domain/PrimitiveType.js';
import { Core_GraphManagerPreset } from '../../../../Core_GraphManagerPreset.js';

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
  expect(graph.ownStores).toHaveLength(2);
  expect(graph.ownDatabases).toHaveLength(2);
  // db
  const db = graph.getDatabase('meta::relational::tests::db');
  expect(db.schemas).toHaveLength(2);
  expect(db.filters).toHaveLength(4);
  expect(db.joins).toHaveLength(21);
  const defaultSchema = getSchema(db, 'default');
  expect(defaultSchema.tables).toHaveLength(8);
  expect(defaultSchema.views).toHaveLength(7);
  const interactionTable = getTable(defaultSchema, 'interactionTable');
  expect(interactionTable.columns).toHaveLength(5);
  expect(interactionTable.primaryKey[0]?.name).toBe('ID');
  const productSchema = getSchema(db, 'productSchema');
  expect(productSchema.tables).toHaveLength(1);
  expect(productSchema.views).toHaveLength(0);
  expect(db.includes).toHaveLength(1);
  // dbInc
  const dbInc = guaranteeType(db.includes[0]?.value, Database);
  expect(dbInc.path).toBe('meta::relational::tests::dbInc');
  const dbIncDefaultSchema = getSchema(dbInc, 'default');
  expect(dbIncDefaultSchema.tables).toHaveLength(9);
  expect(dbIncDefaultSchema.views).toHaveLength(3);
  // add join/fiilter tests
});

test(unitTest('Relational Mapping is loaded properly'), () => {
  const graph = graphManagerState.graph;
  expect(graph.ownMappings).toHaveLength(3);
  const simpleRelationalMapping = graph.getMapping(
    'meta::relational::tests::simpleRelationalMapping',
  );
  expect(simpleRelationalMapping.classMappings).toHaveLength(9);
  simpleRelationalMapping.classMappings.forEach((setImpl) => {
    expect(setImpl instanceof RootRelationalInstanceSetImplementation).toBe(
      true,
    );
    expect(
      (setImpl as RootRelationalInstanceSetImplementation).mainTableAlias,
    ).toBeDefined();
  });
  expect(simpleRelationalMapping.includes).toHaveLength(1);
  const simpleRelationalMappingInc = guaranteeNonNullable(
    simpleRelationalMapping.includes[0]?.included.value,
  );
  expect(simpleRelationalMappingInc.path).toBe(
    'meta::relational::tests::simpleRelationalMappingInc',
  );
  const _class = graph.getClass(
    'meta::pure::tests::model::simple::FirmExtension',
  );
  const firmExtensionSetImpl = guaranteeType(
    getOwnClassMappingsByClass(simpleRelationalMappingInc, _class)[0],
    RootRelationalInstanceSetImplementation,
  );
  expect(firmExtensionSetImpl.propertyMappings).toHaveLength(3);
  const embeddedProperty = guaranteeType(
    findPropertyMapping(firmExtensionSetImpl, 'employeesExt', undefined),
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
  expect(propertyMapping.sourceSetImplementation.value).toBe(
    firmExtensionSetImpl,
  );
  expect(propertyMapping.property.value.genericType.value.rawType).toBe(
    PrimitiveType.DATE,
  );
});

const pluginManager = new TEST__GraphManagerPluginManager();
pluginManager.usePresets([new Core_GraphManagerPreset()]).install();

test(unitTest('SemiStructured relational type roundtrip'), async () => {
  await TEST__checkBuildingElementsRoundtrip(
    TEST_DATA__SemiStructuredRelationalTypeRoundtrip as Entity[],
    pluginManager,
  );
});

test(unitTest('JSON relational type roundtrip'), async () => {
  await TEST__checkBuildingElementsRoundtrip(
    TEST_DATA__JsonRelationalTypeRoundtrip as Entity[],
    pluginManager,
  );
});

test(unitTest('Mapping include is backwards compatible with protocol'), () => {
  const graph = graphManagerState.graph;
  expect(graph.ownMappings).toHaveLength(3);
  const simpleRelationalMapping = graph.getMapping(
    'meta::relational::tests::simpleRelationalMappingWithBackwardCompatibleProtocol',
  );
  expect(simpleRelationalMapping.includes).toHaveLength(1);
  const simpleRelationalMappingInc = guaranteeNonNullable(
    simpleRelationalMapping.includes[0]?.included.value,
  );
  expect(simpleRelationalMappingInc.path).toBe(
    'meta::relational::tests::simpleRelationalMappingInc',
  );
});
