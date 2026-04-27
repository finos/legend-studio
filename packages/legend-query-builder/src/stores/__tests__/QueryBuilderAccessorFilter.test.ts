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
import { unitTest } from '@finos/legend-shared/test';
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import {
  Core_GraphManagerPreset,
  FunctionExpression,
} from '@finos/legend-graph';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '@finos/legend-graph/test';
import { ApplicationStore } from '@finos/legend-application';
import { TEST_DATA__QueryBuilder_Accessors } from '../__test-utils__/TEST_DATA__QueryBuilder_Accessors.js';
import { QueryBuilder_GraphManagerPreset } from '../../graph-manager/QueryBuilder_GraphManagerPreset.js';
import {
  TEST__LegendApplicationPluginManager,
  TEST__getGenericApplicationConfig,
} from '../__test-utils__/QueryBuilderStateTestUtils.js';
import { AccessorQueryBuilderState } from '../workflows/accessor/AccessorQueryBuilderState.js';
import {
  QueryBuilderAdvancedWorkflowState,
  QueryBuilderActionConfig,
} from '../query-workflow/QueryBuilderWorkFlowState.js';
import {
  FilterConditionState,
  FilterRelationColumnSourceState,
  FilterPropertyExpressionSourceState,
  QueryBuilderFilterTreeConditionNodeData,
} from '../filter/QueryBuilderFilterState.js';

describe(unitTest('AccessorQueryBuilder filter with relation columns'), () => {
  test('can create filter condition from a relation column', async () => {
    const pluginManager = TEST__LegendApplicationPluginManager.create();
    pluginManager
      .usePresets([
        new Core_GraphManagerPreset(),
        new QueryBuilder_GraphManagerPreset(),
      ])
      .install();
    const graphManagerState = TEST__getTestGraphManagerState(pluginManager);
    await TEST__buildGraphWithEntities(
      graphManagerState,
      TEST_DATA__QueryBuilder_Accessors,
    );

    const applicationStore = new ApplicationStore(
      TEST__getGenericApplicationConfig(),
      pluginManager,
    );

    const queryBuilderState = new AccessorQueryBuilderState(
      applicationStore,
      undefined,
      graphManagerState,
      QueryBuilderAdvancedWorkflowState.INSTANCE,
      QueryBuilderActionConfig.INSTANCE,
    );

    // Select IngestDefinition source to populate explorer
    const ingest = guaranteeNonNullable(
      queryBuilderState.graphManagerState.graph.ingests[0],
    );
    queryBuilderState.changeAccessorOwner(ingest);

    // Verify filter panel is shown
    expect(queryBuilderState.filterState.showPanel).toBe(true);

    // Verify relation type has columns
    const relationType = guaranteeNonNullable(
      queryBuilderState.sourceRelationType,
    );
    expect(relationType.columns.length).toBeGreaterThan(0);

    // Create a filter condition from a relation column
    const column = guaranteeNonNullable(relationType.columns[0]);
    const sourceState = new FilterRelationColumnSourceState(
      column.name,
      column.genericType.value.rawType,
    );
    const filterConditionState = new FilterConditionState(
      queryBuilderState.filterState,
      sourceState,
    );

    // Verify source state is correct type
    expect(filterConditionState.sourceState).toBeInstanceOf(
      FilterRelationColumnSourceState,
    );
    expect(filterConditionState.sourceState).not.toBeInstanceOf(
      FilterPropertyExpressionSourceState,
    );

    // Verify left condition type matches the column type
    expect(filterConditionState.leftConditionType).toBe(
      column.genericType.value.rawType,
    );

    // Verify source state properties
    expect(filterConditionState.sourceState.label).toBe(column.name);
    expect(filterConditionState.sourceState.isValid).toBe(true);
    expect(filterConditionState.sourceState.requiresExistsHandling).toBe(false);

    // Verify compatible operators are available
    expect(filterConditionState.operators.length).toBeGreaterThan(0);
    expect(filterConditionState.operator).toBeDefined();

    // Add the condition to the filter tree
    const treeNode = new QueryBuilderFilterTreeConditionNodeData(
      undefined,
      filterConditionState,
    );
    queryBuilderState.filterState.addNodeFromNode(treeNode, undefined);

    // Verify the tree has one condition node
    expect(queryBuilderState.filterState.nodes.size).toBe(1);
  });

  test('filter condition from relation column builds a left expression', async () => {
    const pluginManager = TEST__LegendApplicationPluginManager.create();
    pluginManager
      .usePresets([
        new Core_GraphManagerPreset(),
        new QueryBuilder_GraphManagerPreset(),
      ])
      .install();
    const graphManagerState = TEST__getTestGraphManagerState(pluginManager);
    await TEST__buildGraphWithEntities(
      graphManagerState,
      TEST_DATA__QueryBuilder_Accessors,
    );

    const applicationStore = new ApplicationStore(
      TEST__getGenericApplicationConfig(),
      pluginManager,
    );

    const queryBuilderState = new AccessorQueryBuilderState(
      applicationStore,
      undefined,
      graphManagerState,
      QueryBuilderAdvancedWorkflowState.INSTANCE,
      QueryBuilderActionConfig.INSTANCE,
    );

    const ingest = guaranteeNonNullable(
      queryBuilderState.graphManagerState.graph.ingests[0],
    );
    queryBuilderState.changeAccessorOwner(ingest);

    const relationType = guaranteeNonNullable(
      queryBuilderState.sourceRelationType,
    );
    const column = guaranteeNonNullable(relationType.columns[0]);

    const sourceState = new FilterRelationColumnSourceState(
      column.name,
      column.genericType.value.rawType,
    );

    // Verify buildLeftExpression returns a FunctionExpression
    const leftExpr = guaranteeType(
      sourceState.buildLeftExpression(queryBuilderState, 'row'),
      FunctionExpression,
    );
    expect(leftExpr).toBeDefined();
    // The left expression should reference the column
    expect(leftExpr.functionName).toBe(column.name);
  });

  test('multiple relation columns can be added as filter conditions', async () => {
    const pluginManager = TEST__LegendApplicationPluginManager.create();
    pluginManager
      .usePresets([
        new Core_GraphManagerPreset(),
        new QueryBuilder_GraphManagerPreset(),
      ])
      .install();
    const graphManagerState = TEST__getTestGraphManagerState(pluginManager);
    await TEST__buildGraphWithEntities(
      graphManagerState,
      TEST_DATA__QueryBuilder_Accessors,
    );

    const applicationStore = new ApplicationStore(
      TEST__getGenericApplicationConfig(),
      pluginManager,
    );

    const queryBuilderState = new AccessorQueryBuilderState(
      applicationStore,
      undefined,
      graphManagerState,
      QueryBuilderAdvancedWorkflowState.INSTANCE,
      QueryBuilderActionConfig.INSTANCE,
    );

    const ingest = guaranteeNonNullable(
      queryBuilderState.graphManagerState.graph.ingests[0],
    );
    queryBuilderState.changeAccessorOwner(ingest);

    const relationType = guaranteeNonNullable(
      queryBuilderState.sourceRelationType,
    );

    // Add filter conditions for multiple columns
    for (const column of relationType.columns) {
      const sourceState = new FilterRelationColumnSourceState(
        column.name,
        column.genericType.value.rawType,
      );
      const filterConditionState = new FilterConditionState(
        queryBuilderState.filterState,
        sourceState,
      );
      const treeNode = new QueryBuilderFilterTreeConditionNodeData(
        undefined,
        filterConditionState,
      );
      queryBuilderState.filterState.addNodeFromNode(treeNode, undefined);
    }

    // Verify all columns were added as filter nodes
    // nodes.size includes the group node plus all condition nodes
    expect(queryBuilderState.filterState.nodes.size).toBe(
      relationType.columns.length + 1,
    );
  });
});
