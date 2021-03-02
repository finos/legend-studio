/**
 * Copyright 2020 Goldman Sachs
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

import { targetSetImplementationThroughAssociation } from './RelationalEntitiesTestData';
import type { Entity } from '../../../../models/sdlc/models/entity/Entity';
import {
  unitTest,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-studio-shared';
import { getTestEditorStore } from '../../../StoreTestUtils';
import {
  DynaFunction,
  TableAliasColumn,
} from '../../../../models/metamodels/pure/model/packageableElements/store/relational/model/RelationalOperationElement';
import { RootRelationalInstanceSetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation';
import { RelationalPropertyMapping } from '../../../../models/metamodels/pure/model/packageableElements/store/relational/mapping/RelationalPropertyMapping';

const editorStore = getTestEditorStore();

beforeAll(async () => {
  await editorStore.graphState.initializeSystem();
  await editorStore.graphState.graphManager.buildGraph(
    editorStore.graphState.graph,
    targetSetImplementationThroughAssociation as Entity[],
  );
});

test(unitTest('Relational Mapping with property from association'), () => {
  // db
  const graph = editorStore.graphState.graph;
  const database = graph.getDatabase(
    'apps::pure::studio::model::simple::dbInc',
  );
  expect(database.schemas).toHaveLength(1);
  const defaultSchema = database.schemas[0];
  expect(defaultSchema.tables).toHaveLength(2);
  defaultSchema.getTable('personTable');
  defaultSchema.getTable('firmTable');
  // join
  expect(database.joins).toHaveLength(1);
  const firmPersonJoin = database.joins[0];
  expect(firmPersonJoin.name).toBe('Firm_Person');
  const operation = guaranteeType(firmPersonJoin.operation, DynaFunction);
  expect(operation.name).toBe('equal');
  expect(operation.parameters).toHaveLength(2);
  const firmColumn = guaranteeNonNullable(
    operation.parameters.find(
      (o) => o instanceof TableAliasColumn && o.columnName === 'ID',
    ),
  ) as TableAliasColumn;
  expect(firmColumn.alias.name).toBe('firmTable');
  const personColumn = guaranteeNonNullable(
    operation.parameters.find(
      (o) => o instanceof TableAliasColumn && o.columnName === 'FIRMID',
    ),
  ) as TableAliasColumn;
  expect(personColumn.alias.name).toBe('personTable');

  // mapping
  const mapping = graph.getMapping(
    'apps::pure::studio::model::simple::simpleRelationalMapping',
  );
  expect(mapping.classMappings).toHaveLength(2);
  const personClassMapping = guaranteeType(
    guaranteeNonNullable(
      mapping.classMappingsByClass(
        graph.getClass('apps::pure::studio::model::simple::Person'),
      )[0],
    ),
    RootRelationalInstanceSetImplementation,
  );
  expect(personClassMapping.id.value).toBe(
    'apps_pure_studio_model_simple_Person',
  );
  expect(personClassMapping.propertyMappings).toHaveLength(3);
  const primaryKey = guaranteeType(
    personClassMapping.primaryKey[0],
    TableAliasColumn,
  );
  expect(primaryKey.column.value.name).toBe('ID');
  const firmClassMapping = guaranteeType(
    guaranteeNonNullable(
      mapping.classMappingsByClass(
        graph.getClass('apps::pure::studio::model::simple::Firm'),
      )[0],
    ),
    RootRelationalInstanceSetImplementation,
  );
  expect(firmClassMapping.id.value).toBe('apps_pure_studio_model_simple_Firm');
  const firmPrimaryKey = guaranteeType(
    firmClassMapping.primaryKey[0],
    TableAliasColumn,
  );
  expect(firmPrimaryKey.column.value.name).toBe('ID');
  // association property
  const firmProperty = guaranteeType(
    personClassMapping.findPropertyMapping('firm', undefined),
    RelationalPropertyMapping,
  );
  expect(firmProperty.targetSetImplementation).toBe(firmClassMapping);
});
