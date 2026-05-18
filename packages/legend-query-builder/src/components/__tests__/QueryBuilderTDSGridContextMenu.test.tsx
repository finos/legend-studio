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

import { test, expect } from '@jest/globals';
import { integrationTest, createSpy } from '@finos/legend-shared/test';
import {
  create_RawLambda,
  PackageableElementExplicitReference,
  RuntimePointer,
  type TDSRowDataType,
} from '@finos/legend-graph';
import type {
  DataGridGetContextMenuItemsParams,
  DataGridMenuItemDef,
} from '@finos/legend-lego/data-grid';
import { ApplicationStore } from '@finos/legend-application';
import { TEST__setUpGraphManagerState } from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import {
  TEST__LegendApplicationPluginManager,
  TEST__getGenericApplicationConfig,
} from '../../stores/__test-utils__/QueryBuilderStateTestUtils.js';
import { INTERNAL__BasicQueryBuilderState } from '../../stores/QueryBuilderState.js';
import { QueryBuilderAdvancedWorkflowState } from '../../stores/query-workflow/QueryBuilderWorkFlowState.js';
import { QueryBuilderTDSState } from '../../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import { buildTDSGridContextMenuItems } from '../result/tds/QueryBuilderTDSGridShared.js';
import { TEST_DATA__simpleProjection } from '../../stores/__tests__/TEST_DATA__QueryBuilder_Generic.js';
import { TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational } from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import TEST_DATA__ComplexRelationalModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexRelational.json' with { type: 'json' };

/**
 * Build a minimal mock of DataGridGetContextMenuItemsParams.
 */
const makeMockContextMenuParams = (
  value: unknown,
  colId: string,
  rowIndex: number,
  rowData: Record<string, unknown>,
): DataGridGetContextMenuItemsParams<TDSRowDataType> =>
  ({
    value,
    column: { getColId: () => colId },
    node: { rowIndex, data: rowData },
    api: {
      copySelectedRowsToClipboard: () => {
        /* noop */
      },
      getCellRanges: () => [],
      getDisplayedRowAtIndex: (_idx: number) => ({
        data: rowData,
      }),
    },
  }) as unknown as DataGridGetContextMenuItemsParams<TDSRowDataType>;

test(
  integrationTest(
    'buildTDSGridContextMenuItems syncs selectedCells from grid and Filter By / Filter Out create filter nodes',
  ),
  async () => {
    // ----- Set up QueryBuilderState (store-only, no rendering) -----
    const pluginManager = TEST__LegendApplicationPluginManager.create();
    const graphManagerState = await TEST__setUpGraphManagerState(
      TEST_DATA__ComplexRelationalModel,
      pluginManager,
    );
    const applicationStore = new ApplicationStore(
      TEST__getGenericApplicationConfig(),
      pluginManager,
    );
    const queryBuilderState = new INTERNAL__BasicQueryBuilderState(
      applicationStore,
      graphManagerState,
      QueryBuilderAdvancedWorkflowState.INSTANCE,
      undefined,
    );

    // Set mapping + runtime
    const mapping = graphManagerState.graph.getMapping(
      'model::relational::tests::simpleRelationalMapping',
    );
    queryBuilderState.executionContextState.setMapping(mapping);
    queryBuilderState.executionContextState.setRuntimeValue(
      new RuntimePointer(
        PackageableElementExplicitReference.create(
          graphManagerState.graph.getRuntime('model::MyRuntime'),
        ),
      ),
    );

    // Mock model coverage analysis
    createSpy(
      graphManagerState.graphManager,
      'analyzeMappingModelCoverage',
    ).mockResolvedValue(
      graphManagerState.graphManager.buildMappingModelCoverageAnalysisResult(
        TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
        mapping,
      ),
    );

    // Set source class + initialize query
    const _personClass = graphManagerState.graph.getClass(
      'model::pure::tests::model::simple::Person',
    );
    queryBuilderState.changeSourceElement(_personClass);
    // eslint-disable-next-line @typescript-eslint/await-thenable
    await queryBuilderState.initializeWithQuery(
      create_RawLambda(
        TEST_DATA__simpleProjection.parameters,
        TEST_DATA__simpleProjection.body,
      ),
    );

    const tdsState = queryBuilderState.fetchStructureState
      .implementation as QueryBuilderTDSState;
    expect(tdsState).toBeInstanceOf(QueryBuilderTDSState);

    const resultState = queryBuilderState.resultState;

    // ----- TEST 1: Filter By (selectedCells starts empty) -----
    resultState.setMouseOverCell({
      value: 'John',
      columnName: 'Edited First Name',
      coordinates: { rowIndex: 0, colIndex: 0 },
    });
    expect(resultState.selectedCells).toHaveLength(0);

    const filterByParams = makeMockContextMenuParams(
      'John',
      'Edited First Name',
      0,
      { 'Edited First Name': 'John', 'Last Name': 'Doe', rowNumber: 0 },
    );

    const menuItems = buildTDSGridContextMenuItems(
      filterByParams,
      applicationStore,
      resultState,
      (e) => {
        throw e;
      },
    );

    // After buildTDSGridContextMenuItems, selectedCells should be populated
    expect(resultState.selectedCells).toHaveLength(1);
    expect(resultState.selectedCells[0]?.value).toBe('John');
    expect(resultState.selectedCells[0]?.columnName).toBe('Edited First Name');

    // Invoke Filter By action
    const filterByItem = menuItems.find(
      (item) => typeof item === 'object' && item.name === 'Filter By',
    ) as DataGridMenuItemDef | undefined;
    expect(filterByItem).toBeDefined();

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    filterByItem!.action!(undefined as never);

    // A filter condition node should have been created
    expect(queryBuilderState.filterState.nodes.size).toBeGreaterThan(0);

    // Clean up
    queryBuilderState.filterState.rootIds.forEach((id) => {
      const node = queryBuilderState.filterState.nodes.get(id);
      if (node) {
        queryBuilderState.filterState.removeNodeAndPruneBranch(node);
      }
    });
    expect(queryBuilderState.filterState.nodes.size).toBe(0);

    // ----- TEST 2: Filter Out (selectedCells starts empty) -----
    resultState.setSelectedCells([]);
    resultState.setMouseOverCell({
      value: 'Jane',
      columnName: 'Edited First Name',
      coordinates: { rowIndex: 1, colIndex: 0 },
    });
    expect(resultState.selectedCells).toHaveLength(0);

    const filterOutParams = makeMockContextMenuParams(
      'Jane',
      'Edited First Name',
      1,
      { 'Edited First Name': 'Jane', 'Last Name': 'Smith', rowNumber: 1 },
    );

    const menuItems2 = buildTDSGridContextMenuItems(
      filterOutParams,
      applicationStore,
      resultState,
      (e) => {
        throw e;
      },
    );

    // selectedCells should be populated from params
    expect(resultState.selectedCells).toHaveLength(1);
    expect(resultState.selectedCells[0]?.value).toBe('Jane');

    // Invoke Filter Out action
    const filterOutItem = menuItems2.find(
      (item) => typeof item === 'object' && item.name === 'Filter Out',
    ) as DataGridMenuItemDef | undefined;
    expect(filterOutItem).toBeDefined();

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    filterOutItem!.action!(undefined as never);

    // A filter condition node should have been created
    expect(queryBuilderState.filterState.nodes.size).toBeGreaterThan(0);
  },
);
