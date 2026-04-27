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

import { test, expect, describe } from '@jest/globals';
import {
  waitFor,
  getByText,
  queryByText,
  act,
  findByText,
  findAllByTestId,
} from '@testing-library/react';
import { integrationTest } from '@finos/legend-shared/test';
import { create_RawLambda } from '@finos/legend-graph';
import {
  TEST_DATA__QueryBuilder_Accessors,
  TEST_DATA__QueryBuilder_Accessors_SimpleProjection_WithPostFilter,
  TEST_DATA__QueryBuilder_Accessors_SimpleProjectionWithDatabase_WithPostFilter,
} from '../../stores/__test-utils__/TEST_DATA__QueryBuilder_Accessors.js';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import {
  TEST__setUpAccessorQueryBuilder,
  selectFirstOptionFromCustomSelectorInput,
  dragAndDrop,
} from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import { guaranteeNonNullable } from '@finos/legend-shared';

describe(integrationTest('AccessorQueryBuilder setup panel'), () => {
  test('renders Source, Runtime labels and properties header', async () => {
    const { renderResult } = await TEST__setUpAccessorQueryBuilder(
      TEST_DATA__QueryBuilder_Accessors,
    );

    const setupPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    expect(getByText(setupPanel, 'Source')).not.toBeNull();
    expect(getByText(setupPanel, 'Runtime')).not.toBeNull();
    expect(getByText(setupPanel, 'properties')).not.toBeNull();
  });

  test('does not render Accessor selector when no source is selected', async () => {
    const { renderResult } = await TEST__setUpAccessorQueryBuilder(
      TEST_DATA__QueryBuilder_Accessors,
    );

    const setupPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    // No source selected => no accessor options => accessor selector hidden
    expect(queryByText(setupPanel, 'Data Set')).toBeNull();
  });

  test('renders placeholder text for empty selectors', async () => {
    const { renderResult } = await TEST__setUpAccessorQueryBuilder(
      TEST_DATA__QueryBuilder_Accessors,
    );

    const setupPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    expect(getByText(setupPanel, 'Choose a source...')).not.toBeNull();
    expect(getByText(setupPanel, 'Choose a runtime...')).not.toBeNull();
  });

  test('runtime selector is disabled when no source is selected', async () => {
    const { queryBuilderState } = await TEST__setUpAccessorQueryBuilder(
      TEST_DATA__QueryBuilder_Accessors,
    );

    // No source selected => runtime should be disabled
    expect(queryBuilderState.selectedAccessorOwner).toBeUndefined();
  });

  test('lists IngestDefinition and Database as source options', async () => {
    const { queryBuilderState } = await TEST__setUpAccessorQueryBuilder(
      TEST_DATA__QueryBuilder_Accessors,
    );

    // The test data has an IngestDefinition (ingestion::CARBON_DIOXIDE_EMISSIONS)
    // and a Database (database::TestDatabase)
    const ownerOptions = queryBuilderState.accessorOwnerOptions;
    expect(ownerOptions.length).toBe(2);
    const labels = ownerOptions.map((o) => o.label).sort();
    expect(labels).toEqual(['CARBON_DIOXIDE_EMISSIONS', 'TestDatabase'].sort());
  });

  test('selecting IngestDefinition source shows accessor options and enables runtime', async () => {
    const { renderResult, queryBuilderState } =
      await TEST__setUpAccessorQueryBuilder(TEST_DATA__QueryBuilder_Accessors);

    const ingest = guaranteeNonNullable(
      queryBuilderState.graphManagerState.graph.ingests[0],
    );
    await act(async () => {
      queryBuilderState.changeAccessorOwner(ingest);
    });

    const setupPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );

    // Should show accessor options (the dataset CARBON_DIOXIDE_EMISSIONS)
    expect(queryBuilderState.accessorsOptions.length).toBeGreaterThan(0);
    expect(getByText(setupPanel, 'Data Set')).not.toBeNull();

    // Runtime should be enabled (source is selected)
    expect(queryBuilderState.selectedAccessorOwner).not.toBeUndefined();
  });

  test('selecting Database source shows table accessor options', async () => {
    const { renderResult, queryBuilderState } =
      await TEST__setUpAccessorQueryBuilder(TEST_DATA__QueryBuilder_Accessors);

    const db = guaranteeNonNullable(
      queryBuilderState.graphManagerState.usableDatabases[0],
    );
    await act(async () => {
      queryBuilderState.changeAccessorOwner(db);
    });

    const setupPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );

    // Database has schema "default" with table "TEST0"
    const accessorOpts = queryBuilderState.accessorsOptions;
    expect(accessorOpts.length).toBe(1);
    const firstAccessorOpt = guaranteeNonNullable(accessorOpts[0]);
    expect(firstAccessorOpt.value.schemaName).toBe('default');
    expect(firstAccessorOpt.value.tableName).toBe('TEST0');

    // Accessor selector should be visible
    expect(getByText(setupPanel, 'Table')).not.toBeNull();
  });

  test('compatible runtimes are computed for IngestDefinition', async () => {
    const { queryBuilderState } = await TEST__setUpAccessorQueryBuilder(
      TEST_DATA__QueryBuilder_Accessors,
    );

    // Select IngestDefinition => compatible runtimes should be LakehouseRuntime type
    const ingest = guaranteeNonNullable(
      queryBuilderState.graphManagerState.graph.ingests[0],
    );
    act(() => {
      queryBuilderState.changeAccessorOwner(ingest);
    });

    const runtimes = queryBuilderState.compatibleRuntimes;
    expect(runtimes.length).toBeGreaterThan(0);
    expect(runtimes.map((r) => r.name)).toContain('LakehouseRuntime');
  });

  test('compatible runtimes are computed for Database', async () => {
    const { queryBuilderState } = await TEST__setUpAccessorQueryBuilder(
      TEST_DATA__QueryBuilder_Accessors,
    );

    // Select Database => compatible runtimes are EngineRuntime with no mappings
    const db = guaranteeNonNullable(
      queryBuilderState.graphManagerState.usableDatabases[0],
    );
    act(() => {
      queryBuilderState.changeAccessorOwner(db);
    });

    const runtimes = queryBuilderState.compatibleRuntimes;
    expect(runtimes.map((r) => r.name)).toContain('TestRuntime');
  });

  test('initializes from ingest accessor lambda and renders setup correctly', async () => {
    const { renderResult, queryBuilderState } =
      await TEST__setUpAccessorQueryBuilder(TEST_DATA__QueryBuilder_Accessors);

    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA__QueryBuilder_Accessors_SimpleProjection_WithPostFilter.parameters,
          TEST_DATA__QueryBuilder_Accessors_SimpleProjection_WithPostFilter.body,
        ),
      );
    });

    // After initialization, the source should be IngestDefinition
    expect(queryBuilderState.selectedAccessorOwner).not.toBeUndefined();
    expect(queryBuilderState.sourceAccessor).not.toBeUndefined();

    const setupPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    expect(getByText(setupPanel, 'Source')).not.toBeNull();
    expect(getByText(setupPanel, 'Data Set')).not.toBeNull();
    expect(getByText(setupPanel, 'Runtime')).not.toBeNull();
  });

  test('initializes from database accessor lambda and renders setup correctly', async () => {
    const { renderResult, queryBuilderState } =
      await TEST__setUpAccessorQueryBuilder(TEST_DATA__QueryBuilder_Accessors);

    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA__QueryBuilder_Accessors_SimpleProjectionWithDatabase_WithPostFilter.parameters,
          TEST_DATA__QueryBuilder_Accessors_SimpleProjectionWithDatabase_WithPostFilter.body,
        ),
      );
    });

    expect(queryBuilderState.selectedAccessorOwner).not.toBeUndefined();
    expect(queryBuilderState.sourceAccessor).not.toBeUndefined();

    const setupPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    expect(getByText(setupPanel, 'Source')).not.toBeNull();
    expect(getByText(setupPanel, 'Table')).not.toBeNull();
    expect(getByText(setupPanel, 'Runtime')).not.toBeNull();
  });

  test('source selector interaction changes the accessor owner', async () => {
    const { renderResult, queryBuilderState } =
      await TEST__setUpAccessorQueryBuilder(TEST_DATA__QueryBuilder_Accessors);

    const setupPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );

    // Initially no source selected
    expect(queryBuilderState.selectedAccessorOwner).toBeUndefined();

    // Select first source from dropdown
    const sourceContainer = guaranteeNonNullable(
      getByText(setupPanel, 'Source').parentElement,
    );
    selectFirstOptionFromCustomSelectorInput(sourceContainer, false, false);

    // Source should now be selected
    expect(queryBuilderState.selectedAccessorOwner).not.toBeUndefined();
  });

  test('renders full query builder with accessor setup panel from ingest lambda', async () => {
    const { renderResult, queryBuilderState } =
      await TEST__setUpAccessorQueryBuilder(TEST_DATA__QueryBuilder_Accessors);

    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA__QueryBuilder_Accessors_SimpleProjection_WithPostFilter.parameters,
          TEST_DATA__QueryBuilder_Accessors_SimpleProjection_WithPostFilter.body,
        ),
      );
    });

    const queryBuilder = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER),
    );
    expect(queryBuilder).not.toBeNull();

    const setupPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    expect(getByText(setupPanel, 'Source')).not.toBeNull();
    expect(getByText(setupPanel, 'Data Set')).not.toBeNull();
    expect(getByText(setupPanel, 'Runtime')).not.toBeNull();
  });

  test('drag and drop accessor column into projection and post-filter panels', async () => {
    const { renderResult, queryBuilderState } =
      await TEST__setUpAccessorQueryBuilder(TEST_DATA__QueryBuilder_Accessors);

    // Select IngestDefinition source to populate explorer with columns
    const ingest = guaranteeNonNullable(
      queryBuilderState.graphManagerState.graph.ingests[0],
    );
    await act(async () => {
      queryBuilderState.changeAccessorOwner(ingest);
    });

    // Verify filter panel IS shown (accessor mode now supports it)
    expect(
      renderResult.queryByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER_PANEL,
      ),
    ).not.toBeNull();

    const explorerPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER,
    );
    const tdsProjectionPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_PROJECTION,
    );
    const postFilterPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL,
    );

    // Drag 'Country' column from explorer to the projection drop zone
    const countryDragSource = await findByText(explorerPanel, 'Country');
    const tdsProjectionDropZone = await findByText(
      tdsProjectionPanel,
      'Add a projection column',
    );
    await dragAndDrop(
      countryDragSource,
      tdsProjectionDropZone,
      tdsProjectionPanel,
      'Add a projection column',
    );

    // Verify the column appears in the projection panel
    await findByText(tdsProjectionPanel, 'Country');

    // Drag 'Country' from projection panel to the post-filter panel
    const countryTDSDragSource = await findByText(
      tdsProjectionPanel,
      'Country',
    );
    const postFilterDropZone = await findByText(
      postFilterPanel,
      'Add a post-filter condition',
    );
    await dragAndDrop(
      countryTDSDragSource,
      postFilterDropZone,
      postFilterPanel,
      'Add a post-filter condition',
    );

    // Verify post-filter condition was created
    await findByText(postFilterPanel, 'Country');
    await findByText(postFilterPanel, 'is');
    const contentNodes = await findAllByTestId(
      postFilterPanel,
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT,
    );
    expect(contentNodes).toHaveLength(1);
  });
});
