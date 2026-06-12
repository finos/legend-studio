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
  SimpleFunctionExpression,
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
import { QueryBuilderTDSState } from '../fetch-structure/tds/QueryBuilderTDSState.js';
import { QueryBuilderRelationColumnProjectionColumnState } from '../fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import { PostFilterConditionState } from '../fetch-structure/tds/post-filter/QueryBuilderPostFilterState.js';
import {
  QueryBuilderPostFilterOperator_IsEmpty,
  QueryBuilderPostFilterOperator_IsNotEmpty,
} from '../fetch-structure/tds/post-filter/operators/QueryBuilderPostFilterOperator_IsEmpty.js';

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
    await queryBuilderState.changeAccessorOwner(ingest);

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
      column.multiplicity,
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
    await queryBuilderState.changeAccessorOwner(ingest);

    const relationType = guaranteeNonNullable(
      queryBuilderState.sourceRelationType,
    );
    const column = guaranteeNonNullable(relationType.columns[0]);

    const sourceState = new FilterRelationColumnSourceState(
      column.name,
      column.genericType.value.rawType,
      column.multiplicity,
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
    await queryBuilderState.changeAccessorOwner(ingest);

    const relationType = guaranteeNonNullable(
      queryBuilderState.sourceRelationType,
    );

    // Add filter conditions for multiple columns
    for (const column of relationType.columns) {
      const sourceState = new FilterRelationColumnSourceState(
        column.name,
        column.genericType.value.rawType,
        column.multiplicity,
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

  test('relation column multiplicity is preserved from V1 protocol', async () => {
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
    await queryBuilderState.changeAccessorOwner(ingest);

    const relationType = guaranteeNonNullable(
      queryBuilderState.sourceRelationType,
    );

    // The 'country' column is declared in TEST_DATA with multiplicity [1..1]
    // while 'iso_code' is declared as nullable (lowerBound === 0).
    const requiredColumn = guaranteeNonNullable(
      relationType.columns.find((c) => c.name === 'country'),
    );
    const optionalColumn = guaranteeNonNullable(
      relationType.columns.find((c) => c.name === 'iso_code'),
    );

    expect(requiredColumn.multiplicity.lowerBound).toBe(1);
    expect(optionalColumn.multiplicity.lowerBound).toBe(0);
  });

  test('filter `is empty` / `is not empty` are gated on column multiplicity', async () => {
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
    await queryBuilderState.changeAccessorOwner(ingest);

    const relationType = guaranteeNonNullable(
      queryBuilderState.sourceRelationType,
    );
    const requiredColumn = guaranteeNonNullable(
      relationType.columns.find((c) => c.name === 'country'),
    );
    const optionalColumn = guaranteeNonNullable(
      relationType.columns.find((c) => c.name === 'iso_code'),
    );

    const getOperatorLabels = (col: typeof requiredColumn): string[] =>
      new FilterConditionState(
        queryBuilderState.filterState,
        new FilterRelationColumnSourceState(
          col.name,
          col.genericType.value.rawType,
          col.multiplicity,
        ),
      ).operators.map((op) => op.getLabel());

    const requiredOperators = getOperatorLabels(requiredColumn);
    const optionalOperators = getOperatorLabels(optionalColumn);

    // Required column => is empty / is not empty must NOT be offered.
    expect(requiredOperators).not.toContain('is empty');
    expect(requiredOperators).not.toContain('is not empty');
    // Optional column => is empty / is not empty must be offered.
    expect(optionalOperators).toContain('is empty');
    expect(optionalOperators).toContain('is not empty');
  });

  test('post-filter `is empty` / `is not empty` are gated on relation column multiplicity', async () => {
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
    await queryBuilderState.changeAccessorOwner(ingest);

    const tdsState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );

    const relationType = guaranteeNonNullable(
      queryBuilderState.sourceRelationType,
    );
    const requiredColumn = guaranteeNonNullable(
      relationType.columns.find((c) => c.name === 'country'),
    );
    const optionalColumn = guaranteeNonNullable(
      relationType.columns.find((c) => c.name === 'iso_code'),
    );

    const requiredColState =
      new QueryBuilderRelationColumnProjectionColumnState(
        tdsState,
        requiredColumn,
        true,
      );
    const optionalColState =
      new QueryBuilderRelationColumnProjectionColumnState(
        tdsState,
        optionalColumn,
        true,
      );

    const requiredOperators = new PostFilterConditionState(
      tdsState.postFilterState,
      requiredColState,
      undefined,
    ).operators.map((op) => op.getLabel());
    const optionalOperators = new PostFilterConditionState(
      tdsState.postFilterState,
      optionalColState,
      undefined,
    ).operators.map((op) => op.getLabel());

    // Required column => is empty / is not empty must NOT be offered.
    expect(requiredOperators).not.toContain('is empty');
    expect(requiredOperators).not.toContain('is not empty');
    // Optional column => is empty / is not empty must be offered.
    expect(optionalOperators).toContain('is empty');
    expect(optionalOperators).toContain('is not empty');
  });

  test('post-filter `is empty` builds an isEmpty(...) lambda for relation columns', async () => {
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
    await queryBuilderState.changeAccessorOwner(ingest);

    const tdsState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );
    const optionalColumn = guaranteeNonNullable(
      guaranteeNonNullable(queryBuilderState.sourceRelationType).columns.find(
        (c) => c.name === 'iso_code',
      ),
    );
    const colState = new QueryBuilderRelationColumnProjectionColumnState(
      tdsState,
      optionalColumn,
      true,
    );

    // `is empty` should build `isEmpty($row.iso_code)`
    const isEmptyOp = new QueryBuilderPostFilterOperator_IsEmpty();
    const isEmptyCondition = new PostFilterConditionState(
      tdsState.postFilterState,
      colState,
      isEmptyOp,
    );
    const isEmptyExpr = guaranteeType(
      isEmptyOp.buildPostFilterConditionExpression(isEmptyCondition, undefined),
      SimpleFunctionExpression,
    );
    expect(isEmptyExpr.functionName).toBe('isEmpty');
    expect(isEmptyExpr.parametersValues.length).toBe(1);
    const innerCol = guaranteeType(
      isEmptyExpr.parametersValues[0],
      FunctionExpression,
    );
    expect(innerCol.functionName).toBe('iso_code');

    // `is not empty` should build `not(isEmpty($row.iso_code))`
    const isNotEmptyOp = new QueryBuilderPostFilterOperator_IsNotEmpty();
    const isNotEmptyCondition = new PostFilterConditionState(
      tdsState.postFilterState,
      colState,
      isNotEmptyOp,
    );
    const isNotEmptyExpr = guaranteeType(
      isNotEmptyOp.buildPostFilterConditionExpression(
        isNotEmptyCondition,
        undefined,
      ),
      SimpleFunctionExpression,
    );
    expect(isNotEmptyExpr.functionName).toBe('not');
    const wrappedIsEmpty = guaranteeType(
      isNotEmptyExpr.parametersValues[0],
      SimpleFunctionExpression,
    );
    expect(wrappedIsEmpty.functionName).toBe('isEmpty');
  });

  test('relation column projection state carries the data needed to build a filter source (DnD parity)', async () => {
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
    await queryBuilderState.changeAccessorOwner(ingest);

    const tdsState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );
    const optionalColumn = guaranteeNonNullable(
      guaranteeNonNullable(queryBuilderState.sourceRelationType).columns.find(
        (c) => c.name === 'iso_code',
      ),
    );

    // Add the projection column to the fetch structure (this is the DnD source
    // the filter panel sees when a user drags a relation projection column
    // onto the filter panel).
    const projColState = new QueryBuilderRelationColumnProjectionColumnState(
      tdsState,
      optionalColumn,
      true,
    );
    tdsState.addColumn(projColState);

    // Build the filter source state the same way the filter panel DnD handler
    // does for a `QueryBuilderRelationColumnProjectionColumnState`.
    const sourceState = new FilterRelationColumnSourceState(
      projColState.column.name,
      projColState.column.genericType.value.rawType,
      projColState.column.multiplicity,
    );
    const filterConditionState = new FilterConditionState(
      queryBuilderState.filterState,
      sourceState,
    );

    // Source state should be a relation-column source carrying the right
    // type / multiplicity so downstream operator-gating still works.
    expect(filterConditionState.sourceState).toBeInstanceOf(
      FilterRelationColumnSourceState,
    );
    expect(
      (filterConditionState.sourceState as FilterRelationColumnSourceState)
        .columnName,
    ).toBe(optionalColumn.name);
    expect(
      (filterConditionState.sourceState as FilterRelationColumnSourceState)
        .columnMultiplicity.lowerBound,
    ).toBe(optionalColumn.multiplicity.lowerBound);

    // The condition can be added to the filter tree just like the
    // relation-explorer DnD path.
    const treeNode = new QueryBuilderFilterTreeConditionNodeData(
      undefined,
      filterConditionState,
    );
    queryBuilderState.filterState.addNodeFromNode(treeNode, undefined);
    expect(queryBuilderState.filterState.nodes.size).toBe(1);

    // And `is empty` / `is not empty` are offered because the column is
    // optional — same gating as the relation-explorer DnD path.
    const operatorLabels = filterConditionState.operators.map((op) =>
      op.getLabel(),
    );
    expect(operatorLabels).toContain('is empty');
    expect(operatorLabels).toContain('is not empty');
  });
});
