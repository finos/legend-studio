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
import { integrationTest } from '@finos/legend-shared/test';
import {
  act,
  waitFor,
  getByText,
  queryByText,
  fireEvent,
} from '@testing-library/react';
import {
  stub_RawLambda,
  DataProduct,
  DataProductAccessor,
  GenericType,
  GenericTypeExplicitReference,
  PrimitiveType,
  RelationColumn,
  RelationType,
} from '@finos/legend-graph';
import type { Entity } from '@finos/legend-storage';
import { TEST__setUpQueryBuilder } from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import TEST_DATA__ChangeDetectionModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ChangeDetection.json' with { type: 'json' };
import { TEST_DATA__ModelCoverageAnalysisResult_ChangeDetection } from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import { QueryBuilderTDSState } from '../../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import { QueryBuilderRelationColumnProjectionColumnState } from '../../stores/fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import {
  guaranteeNonNullable,
  guaranteeType,
  prettyCONSTName,
} from '@finos/legend-shared';
import {
  PostFilterConditionState,
  QueryBuilderPostFilterTreeConditionNodeData,
} from '../../stores/fetch-structure/tds/post-filter/QueryBuilderPostFilterState.js';

const createTestAccessor = (
  columns: { name: string; type: typeof PrimitiveType.STRING }[],
): DataProductAccessor => {
  const relationType = new RelationType('test::TestRelation');
  relationType.columns = columns.map(
    (col) =>
      new RelationColumn(
        col.name,
        GenericTypeExplicitReference.create(new GenericType(col.type)),
      ),
  );
  const dataProduct = new DataProduct('test::TestDataProduct');
  return new DataProductAccessor(
    'test::TestDataProduct',
    undefined,
    'TestAccessPoint',
    relationType,
    dataProduct,
  );
};

describe(
  integrationTest('QueryBuilder relation explorer panel rendering'),
  () => {
    test('renders relation column names when class is a RelationType', async () => {
      const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
        TEST_DATA__ChangeDetectionModel as Entity[],
        stub_RawLambda(),
        'my::map',
        'my::runtime',
        TEST_DATA__ModelCoverageAnalysisResult_ChangeDetection,
      );

      const accessor = createTestAccessor([
        { name: 'firstName', type: PrimitiveType.STRING },
        { name: 'age', type: PrimitiveType.INTEGER },
        { name: 'isActive', type: PrimitiveType.BOOLEAN },
        { name: 'startDate', type: PrimitiveType.DATE },
      ]);

      await act(async () => {
        queryBuilderState.changeSourceElement(accessor);
      });

      const explorerPanel = await waitFor(() =>
        renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
      );

      // Verify column header
      await waitFor(() => getByText(explorerPanel, 'columns'));

      // Verify root node shows accessor name
      await waitFor(() => getByText(explorerPanel, 'TestAccessPoint'));

      // Verify all column names are rendered (humanized by default)
      await waitFor(() =>
        getByText(explorerPanel, prettyCONSTName('firstName')),
      );
      await waitFor(() => getByText(explorerPanel, prettyCONSTName('age')));
      await waitFor(() =>
        getByText(explorerPanel, prettyCONSTName('isActive')),
      );
      await waitFor(() =>
        getByText(explorerPanel, prettyCONSTName('startDate')),
      );
    });

    test('renders "No columns" when RelationType has no columns', async () => {
      const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
        TEST_DATA__ChangeDetectionModel as Entity[],
        stub_RawLambda(),
        'my::map',
        'my::runtime',
        TEST_DATA__ModelCoverageAnalysisResult_ChangeDetection,
      );

      const emptyAccessor = createTestAccessor([]);

      await act(async () => {
        queryBuilderState.changeSourceElement(emptyAccessor);
      });

      const explorerPanel = await waitFor(() =>
        renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
      );

      await waitFor(() => getByText(explorerPanel, 'No columns'));
    });

    test('switches from class explorer to relation explorer on class change', async () => {
      const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
        TEST_DATA__ChangeDetectionModel as Entity[],
        stub_RawLambda(),
        'my::map',
        'my::runtime',
        TEST_DATA__ModelCoverageAnalysisResult_ChangeDetection,
      );

      // Start with a Class — should show the class explorer
      await act(async () => {
        queryBuilderState.changeSourceElement(
          queryBuilderState.graphManagerState.graph.getClass('my::Firm'),
        );
      });

      let explorerPanel = await waitFor(() =>
        renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
      );

      // Class explorer shows "explorer" in the header
      await waitFor(() => getByText(explorerPanel, 'explorer'));

      // Switch to RelationType
      const accessor = createTestAccessor([
        { name: 'col1', type: PrimitiveType.STRING },
        { name: 'col2', type: PrimitiveType.INTEGER },
      ]);

      await act(async () => {
        queryBuilderState.changeSourceElement(accessor);
      });

      explorerPanel = await waitFor(() =>
        renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
      );

      // Relation explorer shows "columns" in the header
      await waitFor(() => getByText(explorerPanel, 'columns'));
      // Verify column names (humanized by default)
      await waitFor(() => getByText(explorerPanel, prettyCONSTName('col1')));
      await waitFor(() => getByText(explorerPanel, prettyCONSTName('col2')));
      // Class explorer content should not be present
      expect(queryByText(explorerPanel, 'explorer')).toBeNull();
    });

    test('switches from relation explorer back to class explorer', async () => {
      const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
        TEST_DATA__ChangeDetectionModel as Entity[],
        stub_RawLambda(),
        'my::map',
        'my::runtime',
        TEST_DATA__ModelCoverageAnalysisResult_ChangeDetection,
      );

      // Start with RelationType
      const accessor = createTestAccessor([
        { name: 'myCol', type: PrimitiveType.STRING },
      ]);

      await act(async () => {
        queryBuilderState.changeSourceElement(accessor);
      });

      let explorerPanel = await waitFor(() =>
        renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
      );

      await waitFor(() => getByText(explorerPanel, 'columns'));
      await waitFor(() => getByText(explorerPanel, prettyCONSTName('myCol')));

      // Switch back to Class
      await act(async () => {
        queryBuilderState.changeSourceElement(
          queryBuilderState.graphManagerState.graph.getClass('my::Firm'),
        );
      });

      explorerPanel = await waitFor(() =>
        renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
      );

      // Class explorer header
      await waitFor(() => getByText(explorerPanel, 'explorer'));
      // Relation column should not be present
      expect(queryByText(explorerPanel, prettyCONSTName('myCol'))).toBeNull();
    });
  },
);

describe(
  integrationTest(
    'QueryBuilder relation explorer panel humanizes column names',
  ),
  () => {
    test('renders humanized column names when humanizePropertyName is enabled', async () => {
      const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
        TEST_DATA__ChangeDetectionModel as Entity[],
        stub_RawLambda(),
        'my::map',
        'my::runtime',
        TEST_DATA__ModelCoverageAnalysisResult_ChangeDetection,
      );

      const accessor = createTestAccessor([
        { name: 'firstName', type: PrimitiveType.STRING },
        { name: 'last_name', type: PrimitiveType.STRING },
        { name: 'IS_ACTIVE', type: PrimitiveType.BOOLEAN },
      ]);

      // Ensure humanizePropertyName is enabled (default)
      expect(queryBuilderState.explorerState.humanizePropertyName).toBe(true);

      await act(async () => {
        queryBuilderState.changeSourceElement(accessor);
      });

      const explorerPanel = await waitFor(() =>
        renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
      );

      // Verify humanized names are shown
      await waitFor(() =>
        getByText(explorerPanel, prettyCONSTName('firstName')),
      );
      await waitFor(() =>
        getByText(explorerPanel, prettyCONSTName('last_name')),
      );
      await waitFor(() =>
        getByText(explorerPanel, prettyCONSTName('IS_ACTIVE')),
      );
    });

    test('renders raw column names when humanizePropertyName is disabled', async () => {
      const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
        TEST_DATA__ChangeDetectionModel as Entity[],
        stub_RawLambda(),
        'my::map',
        'my::runtime',
        TEST_DATA__ModelCoverageAnalysisResult_ChangeDetection,
      );

      const accessor = createTestAccessor([
        { name: 'firstName', type: PrimitiveType.STRING },
        { name: 'IS_ACTIVE', type: PrimitiveType.BOOLEAN },
      ]);

      // Disable humanization
      await act(async () => {
        queryBuilderState.changeSourceElement(accessor);
      });

      await act(async () => {
        queryBuilderState.explorerState.setHumanizePropertyName(false);
      });

      const explorerPanel = await waitFor(() =>
        renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
      );

      // Verify raw names are shown
      await waitFor(() => getByText(explorerPanel, 'firstName'));
      await waitFor(() => getByText(explorerPanel, 'IS_ACTIVE'));
      // Humanized versions should not appear
      expect(
        queryByText(explorerPanel, prettyCONSTName('IS_ACTIVE')),
      ).toBeNull();
    });
  },
);

describe(integrationTest('QueryBuilder relation explorer context menu'), () => {
  test('context menu on column node shows "Add Column to Fetch Structure"', async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__ChangeDetectionModel as Entity[],
      stub_RawLambda(),
      'my::map',
      'my::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_ChangeDetection,
    );

    const accessor = createTestAccessor([
      { name: 'firstName', type: PrimitiveType.STRING },
      { name: 'age', type: PrimitiveType.INTEGER },
    ]);

    await act(async () => {
      queryBuilderState.changeSourceElement(accessor);
    });

    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );

    // Humanized name depends on humanizePropertyName setting
    const columnElement = await waitFor(() =>
      getByText(explorerPanel, prettyCONSTName('firstName')),
    );

    // Right-click to open context menu
    fireEvent.contextMenu(columnElement);

    // Verify context menu item
    await waitFor(() =>
      renderResult.getByText('Add Column to Fetch Structure'),
    );

    // Click the menu item
    fireEvent.click(renderResult.getByText('Add Column to Fetch Structure'));

    // Verify column was added to TDS projection
    const tdsState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );
    expect(tdsState.projectionColumns.length).toBe(1);
    expect(
      tdsState.projectionColumns[0] instanceof
        QueryBuilderRelationColumnProjectionColumnState,
    ).toBe(true);
  });

  test('context menu on root node shows "Add Columns to Fetch Structure" and adds all columns', async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__ChangeDetectionModel as Entity[],
      stub_RawLambda(),
      'my::map',
      'my::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_ChangeDetection,
    );

    const accessor = createTestAccessor([
      { name: 'firstName', type: PrimitiveType.STRING },
      { name: 'lastName', type: PrimitiveType.STRING },
      { name: 'age', type: PrimitiveType.INTEGER },
    ]);

    await act(async () => {
      queryBuilderState.changeSourceElement(accessor);
    });

    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );

    // Right-click the root node
    const rootNode = await waitFor(() =>
      getByText(explorerPanel, 'TestAccessPoint'),
    );
    fireEvent.contextMenu(rootNode);

    // Verify context menu item
    await waitFor(() =>
      renderResult.getByText('Add Columns to Fetch Structure'),
    );

    // Click the menu item
    fireEvent.click(renderResult.getByText('Add Columns to Fetch Structure'));

    // Verify all columns were added
    const tdsState = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );
    expect(tdsState.projectionColumns.length).toBe(3);
    expect(
      tdsState.projectionColumns.every(
        (col) => col instanceof QueryBuilderRelationColumnProjectionColumnState,
      ),
    ).toBe(true);
  });
});

describe(
  integrationTest('QueryBuilder relation explorer highlights used columns'),
  () => {
    test('column nodes are marked as used when added to fetch structure', async () => {
      const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
        TEST_DATA__ChangeDetectionModel as Entity[],
        stub_RawLambda(),
        'my::map',
        'my::runtime',
        TEST_DATA__ModelCoverageAnalysisResult_ChangeDetection,
      );

      const accessor = createTestAccessor([
        { name: 'firstName', type: PrimitiveType.STRING },
        { name: 'lastName', type: PrimitiveType.STRING },
        { name: 'age', type: PrimitiveType.INTEGER },
      ]);

      await act(async () => {
        queryBuilderState.changeSourceElement(accessor);
      });

      const explorerPanel = await waitFor(() =>
        renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
      );

      // Add one column via context menu
      const columnElement = await waitFor(() =>
        getByText(explorerPanel, prettyCONSTName('firstName')),
      );
      fireEvent.contextMenu(columnElement);
      fireEvent.click(renderResult.getByText('Add Column to Fetch Structure'));

      // Verify the TDS state has the column
      const tdsState = guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderTDSState,
      );
      expect(tdsState.projectionColumns.length).toBe(1);

      // Verify usedExplorerTreePropertyNodeIDs includes the column name
      expect(tdsState.usedExplorerTreePropertyNodeIDs).toContain('firstName');

      // Verify the other column is NOT in used IDs
      expect(tdsState.usedExplorerTreePropertyNodeIDs).not.toContain(
        'lastName',
      );
    });

    test('all column nodes are marked as used after "Add Columns to Fetch Structure"', async () => {
      const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
        TEST_DATA__ChangeDetectionModel as Entity[],
        stub_RawLambda(),
        'my::map',
        'my::runtime',
        TEST_DATA__ModelCoverageAnalysisResult_ChangeDetection,
      );

      const accessor = createTestAccessor([
        { name: 'col1', type: PrimitiveType.STRING },
        { name: 'col2', type: PrimitiveType.INTEGER },
      ]);

      await act(async () => {
        queryBuilderState.changeSourceElement(accessor);
      });

      const explorerPanel = await waitFor(() =>
        renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
      );

      // Add all columns via context menu on root node
      const rootNode = await waitFor(() =>
        getByText(explorerPanel, 'TestAccessPoint'),
      );
      fireEvent.contextMenu(rootNode);
      fireEvent.click(renderResult.getByText('Add Columns to Fetch Structure'));

      const tdsState = guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderTDSState,
      );
      expect(tdsState.projectionColumns.length).toBe(2);

      // Verify both columns are in used IDs
      expect(tdsState.usedExplorerTreePropertyNodeIDs).toContain('col1');
      expect(tdsState.usedExplorerTreePropertyNodeIDs).toContain('col2');
    });
  },
);

describe(
  integrationTest('QueryBuilder relation columns work with post-filter panel'),
  () => {
    test('PostFilterConditionState can be created from a relation column projection state', async () => {
      const { queryBuilderState } = await TEST__setUpQueryBuilder(
        TEST_DATA__ChangeDetectionModel as Entity[],
        stub_RawLambda(),
        'my::map',
        'my::runtime',
        TEST_DATA__ModelCoverageAnalysisResult_ChangeDetection,
      );

      const accessor = createTestAccessor([
        { name: 'firstName', type: PrimitiveType.STRING },
        { name: 'age', type: PrimitiveType.INTEGER },
      ]);

      await act(async () => {
        queryBuilderState.changeSourceElement(accessor);
      });

      const tdsState = guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderTDSState,
      );

      // Add a relation column to the projection
      const relationType = accessor.relationType;
      const firstNameColumn = guaranteeNonNullable(relationType.columns[0]);
      const projectionCol = new QueryBuilderRelationColumnProjectionColumnState(
        tdsState,
        firstNameColumn,
        true,
      );
      await act(async () => {
        tdsState.addColumn(projectionCol);
      });

      // Create a PostFilterConditionState from it
      const postFilterCondition = new PostFilterConditionState(
        tdsState.postFilterState,
        projectionCol,
        undefined,
      );

      // Verify the condition was created successfully
      expect(postFilterCondition.leftConditionValue).toBe(projectionCol);
      expect(postFilterCondition.columnName).toBe(prettyCONSTName('firstName'));
      // String type should have operators like 'is', 'is not', etc.
      expect(postFilterCondition.operators.length).toBeGreaterThan(0);
    });

    test('post-filter condition from relation column has correct type-based operators', async () => {
      const { queryBuilderState } = await TEST__setUpQueryBuilder(
        TEST_DATA__ChangeDetectionModel as Entity[],
        stub_RawLambda(),
        'my::map',
        'my::runtime',
        TEST_DATA__ModelCoverageAnalysisResult_ChangeDetection,
      );

      const accessor = createTestAccessor([
        { name: 'age', type: PrimitiveType.INTEGER },
      ]);

      await act(async () => {
        queryBuilderState.changeSourceElement(accessor);
      });

      const tdsState = guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderTDSState,
      );

      const ageColumn = guaranteeNonNullable(accessor.relationType.columns[0]);
      const projectionCol = new QueryBuilderRelationColumnProjectionColumnState(
        tdsState,
        ageColumn,
        true,
      );
      await act(async () => {
        tdsState.addColumn(projectionCol);
      });

      const postFilterCondition = new PostFilterConditionState(
        tdsState.postFilterState,
        projectionCol,
        undefined,
      );

      // Integer type should have numeric operators
      expect(postFilterCondition.operators.length).toBeGreaterThan(0);
      const operatorLabels = postFilterCondition.operators.map((op) =>
        op.getLabel(),
      );
      // Integer columns should support equality and comparison operators
      expect(operatorLabels).toContain('is');
      expect(operatorLabels).toContain('<');
      expect(operatorLabels).toContain('>');
    });

    test('relation column can be added to post-filter via state and renders in UI', async () => {
      const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
        TEST_DATA__ChangeDetectionModel as Entity[],
        stub_RawLambda(),
        'my::map',
        'my::runtime',
        TEST_DATA__ModelCoverageAnalysisResult_ChangeDetection,
      );

      const accessor = createTestAccessor([
        { name: 'firstName', type: PrimitiveType.STRING },
      ]);

      await act(async () => {
        queryBuilderState.changeSourceElement(accessor);
      });

      const tdsState = guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderTDSState,
      );

      // Add column to projection and create post-filter condition
      const firstNameColumn = guaranteeNonNullable(
        accessor.relationType.columns[0],
      );
      const projectionCol = new QueryBuilderRelationColumnProjectionColumnState(
        tdsState,
        firstNameColumn,
        true,
      );

      await act(async () => {
        tdsState.addColumn(projectionCol);
        tdsState.setShowPostFilterPanel(true);
      });

      const postFilterCondition = new PostFilterConditionState(
        tdsState.postFilterState,
        projectionCol,
        undefined,
      );
      postFilterCondition.buildFromValueSpec(
        postFilterCondition.operator.getDefaultFilterConditionValue(
          postFilterCondition,
        ),
      );

      await act(async () => {
        tdsState.postFilterState.addNodeFromNode(
          new QueryBuilderPostFilterTreeConditionNodeData(
            undefined,
            postFilterCondition,
            true,
          ),
          undefined,
        );
      });

      // Verify the post-filter panel shows the condition
      const postFilterPanel = await waitFor(() =>
        renderResult.getByTestId(
          QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
        ),
      );

      // The column name should appear in the post-filter panel
      await waitFor(() =>
        getByText(postFilterPanel, prettyCONSTName('firstName')),
      );

      // The 'is' operator should appear
      await waitFor(() => getByText(postFilterPanel, 'is'));
    });

    test('multiple relation columns can be added to post-filter as grouped conditions', async () => {
      const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
        TEST_DATA__ChangeDetectionModel as Entity[],
        stub_RawLambda(),
        'my::map',
        'my::runtime',
        TEST_DATA__ModelCoverageAnalysisResult_ChangeDetection,
      );

      const accessor = createTestAccessor([
        { name: 'firstName', type: PrimitiveType.STRING },
        { name: 'age', type: PrimitiveType.INTEGER },
      ]);

      await act(async () => {
        queryBuilderState.changeSourceElement(accessor);
      });

      const tdsState = guaranteeType(
        queryBuilderState.fetchStructureState.implementation,
        QueryBuilderTDSState,
      );

      // Add both columns to projection
      const firstNameColumn = guaranteeNonNullable(
        accessor.relationType.columns[0],
      );
      const ageColumn = guaranteeNonNullable(accessor.relationType.columns[1]);
      const projCol1 = new QueryBuilderRelationColumnProjectionColumnState(
        tdsState,
        firstNameColumn,
        true,
      );
      const projCol2 = new QueryBuilderRelationColumnProjectionColumnState(
        tdsState,
        ageColumn,
        true,
      );

      await act(async () => {
        tdsState.addColumn(projCol1);
        tdsState.addColumn(projCol2);
        tdsState.setShowPostFilterPanel(true);
      });

      // Create two post-filter conditions
      const condition1 = new PostFilterConditionState(
        tdsState.postFilterState,
        projCol1,
        undefined,
      );
      condition1.buildFromValueSpec(
        condition1.operator.getDefaultFilterConditionValue(condition1),
      );
      const condition2 = new PostFilterConditionState(
        tdsState.postFilterState,
        projCol2,
        undefined,
      );
      condition2.buildFromValueSpec(
        condition2.operator.getDefaultFilterConditionValue(condition2),
      );

      await act(async () => {
        tdsState.postFilterState.addNodeFromNode(
          new QueryBuilderPostFilterTreeConditionNodeData(
            undefined,
            condition1,
            true,
          ),
          undefined,
        );
        tdsState.postFilterState.addNodeFromNode(
          new QueryBuilderPostFilterTreeConditionNodeData(
            undefined,
            condition2,
            true,
          ),
          undefined,
        );
      });

      // Verify both conditions appear in the post-filter panel
      const postFilterPanel = await waitFor(() =>
        renderResult.getByTestId(
          QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
        ),
      );

      await waitFor(() =>
        getByText(postFilterPanel, prettyCONSTName('firstName')),
      );
      await waitFor(() => getByText(postFilterPanel, prettyCONSTName('age')));

      // Verify 'and' grouping connector appears
      await waitFor(() => getByText(postFilterPanel, 'and'));
    });
  },
);
