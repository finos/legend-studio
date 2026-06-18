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
  CollectionInstanceValue,
  Core_GraphManagerPreset,
  FunctionExpression,
  PrecisePrimitiveType,
  PrimitiveInstanceValue,
  PrimitiveType,
  PRIMITIVE_TYPE,
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
  FilterRelationColumnConditionValueState,
  FilterRelationColumnSourceState,
  FilterPropertyExpressionSourceState,
  FilterValueSpecConditionValueState,
  QueryBuilderFilterTreeConditionNodeData,
} from '../filter/QueryBuilderFilterState.js';
import { QueryBuilderTDSState } from '../fetch-structure/tds/QueryBuilderTDSState.js';
import { QueryBuilderRelationColumnProjectionColumnState } from '../fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import {
  PostFilterConditionState,
  PostFilterValueSpecConditionValueState,
} from '../fetch-structure/tds/post-filter/QueryBuilderPostFilterState.js';
import {
  QueryBuilderPostFilterOperator_IsEmpty,
  QueryBuilderPostFilterOperator_IsNotEmpty,
} from '../fetch-structure/tds/post-filter/operators/QueryBuilderPostFilterOperator_IsEmpty.js';
import {
  QueryBuilderFilterOperator_In,
  QueryBuilderFilterOperator_NotIn,
} from '../filter/operators/QueryBuilderFilterOperator_In.js';
import {
  QueryBuilderPostFilterOperator_In,
  QueryBuilderPostFilterOperator_NotIn,
} from '../fetch-structure/tds/post-filter/operators/QueryBuilderPostFilterOperator_In.js';
import { convertTextToPrimitiveInstanceValue } from '../shared/ValueSpecificationEditorHelper.js';

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

  test('relation column can be used as the right-hand value of a filter condition', async () => {
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

    // Find two columns of the same type so the right-hand drop is type-compatible.
    let leftCol;
    let rightCol;
    for (const a of relationType.columns) {
      for (const b of relationType.columns) {
        if (
          a !== b &&
          a.genericType.value.rawType === b.genericType.value.rawType
        ) {
          leftCol = a;
          rightCol = b;
          break;
        }
      }
      if (leftCol && rightCol) {
        break;
      }
    }
    leftCol = guaranteeNonNullable(leftCol);
    rightCol = guaranteeNonNullable(rightCol);

    const sourceState = new FilterRelationColumnSourceState(
      leftCol.name,
      leftCol.genericType.value.rawType,
      leftCol.multiplicity,
    );
    const filterConditionState = new FilterConditionState(
      queryBuilderState.filterState,
      sourceState,
    );

    // Build the right-hand value from a relation column (the equivalent of
    // dragging another relation column onto the filter value drop zone).
    filterConditionState.buildRightConditionValueFromRelationColumn(
      rightCol.name,
      rightCol.genericType.value.rawType,
      rightCol.multiplicity,
    );

    const rightValue = guaranteeType(
      filterConditionState.rightConditionValue,
      FilterRelationColumnConditionValueState,
    );
    expect(rightValue.columnName).toBe(rightCol.name);
    expect(rightValue.type).toBe(rightCol.genericType.value.rawType);

    // Build the operator expression and verify both LHS and RHS reference
    // relation columns.
    const expression = guaranteeType(
      filterConditionState.operator.buildFilterConditionExpression(
        filterConditionState,
        'row',
      ),
      SimpleFunctionExpression,
    );
    expect(expression.parametersValues.length).toBe(2);
    const lhs = guaranteeType(
      expression.parametersValues[0],
      FunctionExpression,
    );
    const rhs = guaranteeType(
      expression.parametersValues[1],
      FunctionExpression,
    );
    expect(lhs.functionName).toBe(leftCol.name);
    expect(rhs.functionName).toBe(rightCol.name);
  });

  test('filter `is in list of` / `is not in list of` work for relation columns with a precise primitive type', async () => {
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

    // `country` is declared as Varchar (a precise primitive) in TEST_DATA.
    const varcharColumn = guaranteeNonNullable(
      relationType.columns.find((c) => c.name === 'country'),
    );
    expect(varcharColumn.genericType.value.rawType).toBeInstanceOf(
      PrecisePrimitiveType,
    );

    const sourceState = new FilterRelationColumnSourceState(
      varcharColumn.name,
      varcharColumn.genericType.value.rawType,
      varcharColumn.multiplicity,
    );
    const filterConditionState = new FilterConditionState(
      queryBuilderState.filterState,
      sourceState,
    );

    // `is in list of` must be offered for a Varchar (precise primitive) column.
    const operatorLabels = filterConditionState.operators.map((op) =>
      op.getLabel(),
    );
    expect(operatorLabels).toContain('is in list of');
    expect(operatorLabels).toContain('is not in list of');

    // Switching to `is in list of` must not throw — this is the regression
    // path that previously bubbled `Cannot get placeholder for type ...`
    // out of the editor (because the default collection was created with the
    // precise primitive type on its generic type reference).
    const inOp = guaranteeNonNullable(
      filterConditionState.operators.find(
        (op) => op instanceof QueryBuilderFilterOperator_In,
      ),
    );
    filterConditionState.changeOperator(inOp);

    // The default collection value should be created with the *standard*
    // primitive equivalent (String for Varchar), so the placeholder lookup
    // in the collection editor succeeds.
    const rightValue = guaranteeType(
      filterConditionState.rightConditionValue,
      FilterValueSpecConditionValueState,
    );
    const collection = guaranteeType(rightValue.value, CollectionInstanceValue);
    expect(collection.genericType?.value.rawType).toBe(PrimitiveType.STRING);

    // And entries typed into the editor for that column should round-trip
    // into standard String PrimitiveInstanceValues — keeping the operator's
    // value compatibility check happy.
    const entry = guaranteeNonNullable(
      convertTextToPrimitiveInstanceValue(
        varcharColumn.genericType.value.rawType,
        'USA',
        queryBuilderState.observerContext,
      ),
    );
    expect(entry).toBeInstanceOf(PrimitiveInstanceValue);
    expect(entry.genericType.value.rawType).toBe(PrimitiveType.STRING);
    expect(entry.values[0]).toBe('USA');

    collection.values = [entry];
    expect(
      inOp.isCompatibleWithFilterConditionValue(filterConditionState),
    ).toBe(true);

    // The same fix must hold for `is not in list of`.
    const notInOp = guaranteeNonNullable(
      filterConditionState.operators.find(
        (op) => op instanceof QueryBuilderFilterOperator_NotIn,
      ),
    );
    filterConditionState.changeOperator(notInOp);
    const notInRightValue = guaranteeType(
      filterConditionState.rightConditionValue,
      FilterValueSpecConditionValueState,
    );
    const notInCollection = guaranteeType(
      notInRightValue.value,
      CollectionInstanceValue,
    );
    expect(notInCollection.genericType?.value.rawType).toBe(
      PrimitiveType.STRING,
    );
  });

  test('filter `is in list of` default collection uses INTEGER for a BigInt relation column', async () => {
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

    // `year` is declared as BigInt (a precise primitive) in TEST_DATA.
    const bigIntColumn = guaranteeNonNullable(
      guaranteeNonNullable(queryBuilderState.sourceRelationType).columns.find(
        (c) => c.name === 'year',
      ),
    );
    expect(bigIntColumn.genericType.value.rawType).toBeInstanceOf(
      PrecisePrimitiveType,
    );

    const filterConditionState = new FilterConditionState(
      queryBuilderState.filterState,
      new FilterRelationColumnSourceState(
        bigIntColumn.name,
        bigIntColumn.genericType.value.rawType,
        bigIntColumn.multiplicity,
      ),
    );
    const inOp = guaranteeNonNullable(
      filterConditionState.operators.find(
        (op) => op instanceof QueryBuilderFilterOperator_In,
      ),
    );
    filterConditionState.changeOperator(inOp);

    const collection = guaranteeType(
      guaranteeType(
        filterConditionState.rightConditionValue,
        FilterValueSpecConditionValueState,
      ).value,
      CollectionInstanceValue,
    );
    // BigInt → INTEGER per getCorrespondingStandardPrimitiveType.
    expect(collection.genericType?.value.rawType).toBe(PrimitiveType.INTEGER);

    // Numeric values typed in flow through as standard INTEGER primitives,
    // and the value-compatibility check (which compares standard primitive
    // equivalents) passes.
    const entry = guaranteeNonNullable(
      convertTextToPrimitiveInstanceValue(
        bigIntColumn.genericType.value.rawType,
        '2024',
        queryBuilderState.observerContext,
      ),
    );
    expect(entry.genericType.value.rawType).toBe(PrimitiveType.INTEGER);
    expect(entry.values[0]).toBe(2024);

    collection.values = [entry];
    expect(
      inOp.isCompatibleWithFilterConditionValue(filterConditionState),
    ).toBe(true);
  });

  test('post-filter `is in list of` / `is not in list of` work for relation projection columns with a precise primitive type', async () => {
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

    // `country` is Varchar; `year` is BigInt — both precise primitives.
    const varcharColumn = guaranteeNonNullable(
      guaranteeNonNullable(queryBuilderState.sourceRelationType).columns.find(
        (c) => c.name === 'country',
      ),
    );
    const bigIntColumn = guaranteeNonNullable(
      guaranteeNonNullable(queryBuilderState.sourceRelationType).columns.find(
        (c) => c.name === 'year',
      ),
    );

    const varcharColState = new QueryBuilderRelationColumnProjectionColumnState(
      tdsState,
      varcharColumn,
      true,
    );
    const bigIntColState = new QueryBuilderRelationColumnProjectionColumnState(
      tdsState,
      bigIntColumn,
      true,
    );

    const inOp = new QueryBuilderPostFilterOperator_In();
    const notInOp = new QueryBuilderPostFilterOperator_NotIn();

    // Varchar column => default collection generic type is standard STRING.
    const varcharIn = new PostFilterConditionState(
      tdsState.postFilterState,
      varcharColState,
      inOp,
    );
    const varcharCollection = guaranteeType(
      inOp.getDefaultFilterConditionValue(varcharIn),
      CollectionInstanceValue,
    );
    expect(varcharCollection.genericType?.value.rawType).toBe(
      PrimitiveType.STRING,
    );

    // Adding a String value to the collection passes the compatibility check.
    const stringEntry = guaranteeNonNullable(
      convertTextToPrimitiveInstanceValue(
        varcharColumn.genericType.value.rawType,
        'USA',
        queryBuilderState.observerContext,
      ),
    );
    varcharCollection.values = [stringEntry];
    varcharIn.buildFromValueSpec(varcharCollection);
    expect(
      guaranteeType(
        varcharIn.rightConditionValue,
        PostFilterValueSpecConditionValueState,
      ).value,
    ).toBe(varcharCollection);
    expect(inOp.isCompatibleWithConditionValue(varcharIn)).toBe(true);

    // BigInt column => default collection generic type is standard INTEGER,
    // and `is not in list of` uses the same default.
    const bigIntIn = new PostFilterConditionState(
      tdsState.postFilterState,
      bigIntColState,
      inOp,
    );
    const bigIntCollection = guaranteeType(
      inOp.getDefaultFilterConditionValue(bigIntIn),
      CollectionInstanceValue,
    );
    expect(bigIntCollection.genericType?.value.rawType).toBe(
      PrimitiveType.INTEGER,
    );

    const bigIntNotIn = new PostFilterConditionState(
      tdsState.postFilterState,
      bigIntColState,
      notInOp,
    );
    const bigIntNotInCollection = guaranteeType(
      notInOp.getDefaultFilterConditionValue(bigIntNotIn),
      CollectionInstanceValue,
    );
    expect(bigIntNotInCollection.genericType?.value.rawType).toBe(
      PrimitiveType.INTEGER,
    );

    // `convertTextToPrimitiveInstanceValue` for a precise INTEGER variant
    // produces a standard INTEGER primitive (used by the type-list editor).
    const intEntry = guaranteeNonNullable(
      convertTextToPrimitiveInstanceValue(
        bigIntColumn.genericType.value.rawType,
        '2024',
        queryBuilderState.observerContext,
      ),
    );
    expect(intEntry.genericType.value.rawType).toBe(PrimitiveType.INTEGER);
    // Sanity-check the converted PRIMITIVE_TYPE path matches INTEGER.
    expect(intEntry.genericType.value.rawType.path).toBe(
      PRIMITIVE_TYPE.INTEGER,
    );
  });
});
