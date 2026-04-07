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

import { test, describe, expect } from '@jest/globals';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import type { Entity } from '@finos/legend-storage';
import {
  Accessor,
  DataProductAccessor,
  DataProduct,
  GenericType,
  GenericTypeExplicitReference,
  PrimitiveType,
  RelationColumn,
  RelationType,
} from '@finos/legend-graph';
import {
  TEST__getGenericApplicationConfig,
  TEST__LegendApplicationPluginManager,
} from '../__test-utils__/QueryBuilderStateTestUtils.js';
import { INTERNAL__BasicQueryBuilderState } from '../QueryBuilderState.js';
import { QueryBuilderAdvancedWorkflowState } from '../query-workflow/QueryBuilderWorkFlowState.js';
import { QueryBuilder_GraphManagerPreset } from '../../graph-manager/QueryBuilder_GraphManagerPreset.js';
import { ApplicationStore } from '@finos/legend-application';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '@finos/legend-graph/test';
import TEST_DATA__SimpleModel from './TEST_DATA__QueryBuilder_Model_SimpleIdentityM2M.json' with { type: 'json' };
import { QueryBuilderRelationColumnProjectionColumnState } from '../fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import type { QueryBuilderTDSState } from '../fetch-structure/tds/QueryBuilderTDSState.js';

/**
 * Helper to create a simple Accessor (wrapping a RelationType) for testing.
 */
const createTestAccessor = (): DataProductAccessor => {
  const relationType = new RelationType('sample');
  relationType.name = 'TestRelationType';

  const col1 = new RelationColumn(
    'name',
    GenericTypeExplicitReference.create(new GenericType(PrimitiveType.STRING)),
  );
  const col2 = new RelationColumn(
    'age',
    GenericTypeExplicitReference.create(new GenericType(PrimitiveType.INTEGER)),
  );
  const col3 = new RelationColumn(
    'active',
    GenericTypeExplicitReference.create(new GenericType(PrimitiveType.BOOLEAN)),
  );

  relationType.columns = [col1, col2, col3];

  const dataProduct = new DataProduct('test::TestDataProduct');
  return new DataProductAccessor(
    'test::TestDataProduct',
    undefined,
    'TestAccessPoint',
    relationType,
    dataProduct,
  );
};

/**
 * Helper to create a QueryBuilderState with a graph already built,
 * so we can test both Class and RelationType paths.
 */
const createQueryBuilderStateWithGraph =
  async (): Promise<INTERNAL__BasicQueryBuilderState> => {
    const pluginManager = TEST__LegendApplicationPluginManager.create();
    pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();
    const applicationStore = new ApplicationStore(
      TEST__getGenericApplicationConfig(),
      pluginManager,
    );
    const graphManagerState = TEST__getTestGraphManagerState(pluginManager);
    await TEST__buildGraphWithEntities(
      graphManagerState,
      TEST_DATA__SimpleModel as Entity[],
    );
    return new INTERNAL__BasicQueryBuilderState(
      applicationStore,
      graphManagerState,
      QueryBuilderAdvancedWorkflowState.INSTANCE,
      undefined,
    );
  };

describe(unitTest('QueryBuilderState RelationType support'), () => {
  test('sourceClass returns Class when class is set to a Class', async () => {
    const queryBuilderState = await createQueryBuilderStateWithGraph();
    const personClass =
      queryBuilderState.graphManagerState.graph.getClass('model::Person');

    queryBuilderState.setSourceElement(personClass);

    expect(queryBuilderState.sourceElement).toBe(personClass);
    expect(queryBuilderState.sourceClass).toBe(personClass);
  });

  test('sourceClass returns undefined when class is set to a RelationType', async () => {
    const queryBuilderState = await createQueryBuilderStateWithGraph();
    const accessor = createTestAccessor();

    queryBuilderState.setSourceElement(accessor);

    expect(queryBuilderState.sourceElement).toBe(accessor);
    expect(queryBuilderState.sourceElement).toBeInstanceOf(Accessor);
    expect(queryBuilderState.sourceClass).toBeUndefined();
  });

  test('sourceClass returns undefined when class is undefined', async () => {
    const queryBuilderState = await createQueryBuilderStateWithGraph();

    expect(queryBuilderState.sourceElement).toBeUndefined();
    expect(queryBuilderState.sourceClass).toBeUndefined();
  });

  test('setClass accepts Class, RelationType, and undefined', async () => {
    const queryBuilderState = await createQueryBuilderStateWithGraph();
    const personClass =
      queryBuilderState.graphManagerState.graph.getClass('model::Person');
    const accessor = createTestAccessor();

    // Set to Class
    queryBuilderState.setSourceElement(personClass);
    expect(queryBuilderState.sourceElement).toBe(personClass);

    // Set to RelationType
    queryBuilderState.setSourceElement(accessor);
    expect(queryBuilderState.sourceElement).toBe(accessor);

    // Set to undefined
    queryBuilderState.setSourceElement(undefined);
    expect(queryBuilderState.sourceElement).toBeUndefined();
  });

  test('changeClass with Class triggers milestoning update', async () => {
    const queryBuilderState = await createQueryBuilderStateWithGraph();
    const personClass =
      queryBuilderState.graphManagerState.graph.getClass('model::Person');

    queryBuilderState.changeSourceElement(personClass);

    expect(queryBuilderState.sourceElement).toBe(personClass);
    expect(queryBuilderState.sourceClass).toBe(personClass);
    // Milestoning state should have been updated (not milestoned for this class)
    expect(queryBuilderState.milestoningState.isCurrentClassMilestoned).toBe(
      false,
    );
  });

  test('changeClass with RelationType skips milestoning and clears sourceClass', async () => {
    const queryBuilderState = await createQueryBuilderStateWithGraph();
    const accessor = createTestAccessor();

    queryBuilderState.changeSourceElement(accessor);

    expect(queryBuilderState.sourceElement).toBe(accessor);
    expect(queryBuilderState.sourceClass).toBeUndefined();
    // Milestoning should report not milestoned since sourceClass is undefined
    expect(queryBuilderState.milestoningState.isCurrentClassMilestoned).toBe(
      false,
    );
  });

  test('switching from Class to RelationType clears sourceClass', async () => {
    const queryBuilderState = await createQueryBuilderStateWithGraph();
    const personClass =
      queryBuilderState.graphManagerState.graph.getClass('model::Person');
    const accessor = createTestAccessor();

    // Start with Class
    queryBuilderState.changeSourceElement(personClass);
    expect(queryBuilderState.sourceClass).toBe(personClass);

    // Switch to RelationType
    queryBuilderState.changeSourceElement(accessor);
    expect(queryBuilderState.sourceClass).toBeUndefined();
    expect(queryBuilderState.sourceElement).toBe(accessor);
  });

  test('switching from RelationType to Class restores sourceClass', async () => {
    const queryBuilderState = await createQueryBuilderStateWithGraph();
    const personClass =
      queryBuilderState.graphManagerState.graph.getClass('model::Person');
    const accessor = createTestAccessor();

    // Start with RelationType
    queryBuilderState.changeSourceElement(accessor);
    expect(queryBuilderState.sourceClass).toBeUndefined();

    // Switch to Class
    queryBuilderState.changeSourceElement(personClass);
    expect(queryBuilderState.sourceClass).toBe(personClass);
    expect(queryBuilderState.sourceElement).toBe(personClass);
  });

  test('explorer tree data is undefined when class is RelationType (no mapping)', async () => {
    const queryBuilderState = await createQueryBuilderStateWithGraph();
    const accessor = createTestAccessor();

    queryBuilderState.changeSourceElement(accessor);

    // Explorer tree data should be undefined because sourceClass is undefined
    expect(queryBuilderState.explorerState.treeData).toBeUndefined();
  });

  test('RelationType columns are accessible after setClass', async () => {
    const queryBuilderState = await createQueryBuilderStateWithGraph();
    const testAccessor = createTestAccessor();

    queryBuilderState.setSourceElement(testAccessor);

    expect(queryBuilderState.sourceElement).toBeInstanceOf(Accessor);
    const resolvedAccessor = guaranteeNonNullable(
      queryBuilderState.sourceAccessor,
    );
    expect(resolvedAccessor.relationType.columns).toHaveLength(3);
    expect(
      guaranteeNonNullable(resolvedAccessor.relationType.columns[0]).name,
    ).toBe('name');
    expect(
      guaranteeNonNullable(resolvedAccessor.relationType.columns[1]).name,
    ).toBe('age');
    expect(
      guaranteeNonNullable(resolvedAccessor.relationType.columns[2]).name,
    ).toBe('active');
  });

  test('sourceRelationType returns RelationType when class is a RelationType', async () => {
    const queryBuilderState = await createQueryBuilderStateWithGraph();
    const accessor = createTestAccessor();

    queryBuilderState.setSourceElement(accessor);

    expect(queryBuilderState.sourceRelationType).toBe(accessor.relationType);
  });

  test('sourceRelationType returns undefined when class is a Class', async () => {
    const queryBuilderState = await createQueryBuilderStateWithGraph();
    const personClass =
      queryBuilderState.graphManagerState.graph.getClass('model::Person');

    queryBuilderState.setSourceElement(personClass);

    expect(queryBuilderState.sourceRelationType).toBeUndefined();
  });

  test('sourceRelationType returns undefined when class is undefined', async () => {
    const queryBuilderState = await createQueryBuilderStateWithGraph();

    expect(queryBuilderState.sourceRelationType).toBeUndefined();
  });

  test('sourceClass and sourceRelationType are mutually exclusive', async () => {
    const queryBuilderState = await createQueryBuilderStateWithGraph();
    const personClass =
      queryBuilderState.graphManagerState.graph.getClass('model::Person');
    const accessor = createTestAccessor();

    // With Class: sourceClass set, sourceRelationType undefined
    queryBuilderState.setSourceElement(personClass);
    expect(queryBuilderState.sourceClass).toBeDefined();
    expect(queryBuilderState.sourceRelationType).toBeUndefined();

    // With RelationType: sourceRelationType set, sourceClass undefined
    queryBuilderState.setSourceElement(accessor);
    expect(queryBuilderState.sourceClass).toBeUndefined();
    expect(queryBuilderState.sourceRelationType).toBeDefined();

    // With undefined: both undefined
    queryBuilderState.setSourceElement(undefined);
    expect(queryBuilderState.sourceClass).toBeUndefined();
    expect(queryBuilderState.sourceRelationType).toBeUndefined();
  });
});

describe(unitTest('QueryBuilderRelationColumnProjectionColumnState'), () => {
  test('column name is derived from RelationColumn name', async () => {
    const queryBuilderState = await createQueryBuilderStateWithGraph();
    const accessor = createTestAccessor();
    queryBuilderState.setSourceElement(accessor);

    const tdsState = queryBuilderState.fetchStructureState
      .implementation as QueryBuilderTDSState;
    const colState = new QueryBuilderRelationColumnProjectionColumnState(
      tdsState,
      guaranteeNonNullable(accessor.relationType.columns[0]),
    );

    expect(colState.columnName).toBe('Name');
  });

  test('getColumnType returns the column raw type', async () => {
    const queryBuilderState = await createQueryBuilderStateWithGraph();
    const accessor = createTestAccessor();
    queryBuilderState.setSourceElement(accessor);

    const tdsState = queryBuilderState.fetchStructureState
      .implementation as QueryBuilderTDSState;

    const nameCol = new QueryBuilderRelationColumnProjectionColumnState(
      tdsState,
      guaranteeNonNullable(accessor.relationType.columns[0]),
    );
    expect(nameCol.getColumnType()).toBe(PrimitiveType.STRING);

    const ageCol = new QueryBuilderRelationColumnProjectionColumnState(
      tdsState,
      guaranteeNonNullable(accessor.relationType.columns[1]),
    );
    expect(ageCol.getColumnType()).toBe(PrimitiveType.INTEGER);

    const activeCol = new QueryBuilderRelationColumnProjectionColumnState(
      tdsState,
      guaranteeNonNullable(accessor.relationType.columns[2]),
    );
    expect(activeCol.getColumnType()).toBe(PrimitiveType.BOOLEAN);
  });

  test('relation column projection can be added to TDS state', async () => {
    const queryBuilderState = await createQueryBuilderStateWithGraph();
    const accessor = createTestAccessor();
    queryBuilderState.changeSourceElement(accessor);

    const tdsState = queryBuilderState.fetchStructureState
      .implementation as QueryBuilderTDSState;

    const colState = new QueryBuilderRelationColumnProjectionColumnState(
      tdsState,
      guaranteeNonNullable(accessor.relationType.columns[0]),
    );
    tdsState.addColumn(colState);

    expect(tdsState.projectionColumns).toHaveLength(1);
    expect(guaranteeNonNullable(tdsState.projectionColumns[0]).columnName).toBe(
      'Name',
    );
  });
});
