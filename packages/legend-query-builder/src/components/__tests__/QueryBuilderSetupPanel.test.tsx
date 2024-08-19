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

import { stub_RawLambda, create_RawLambda } from '@finos/legend-graph';
import { integrationTest } from '@finos/legend-shared/test';
import {
  waitFor,
  getByText,
  getByLabelText,
  act,
} from '@testing-library/react';
import { expect, test } from '@jest/globals';
import TEST_DATA__ComplexRelationalModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexRelational.json' with { type: 'json' };
import { TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational } from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import { TEST_DATA__simpleProjectionWithConstantsAndParameters } from '../../stores/__tests__/TEST_DATA__QueryBuilder_Generic.js';
import {
  TEST__setUpQueryBuilder,
  selectFromCustomSelectorInput,
} from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import { guaranteeNonNullable } from '@finos/legend-shared';

test(
  integrationTest('Query builder set up panel'),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__ComplexRelationalModel,
      stub_RawLambda(),
      'model::relational::tests::simpleRelationalMapping',
      'model::MyRuntime',
      TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
    );
    await act(async () => {
      queryBuilderState.initializeWithQuery(
        create_RawLambda(
          TEST_DATA__simpleProjectionWithConstantsAndParameters.parameters,
          TEST_DATA__simpleProjectionWithConstantsAndParameters.body,
        ),
      );
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    // Check for selector labels
    expect(getByLabelText(queryBuilderSetup, 'Mapping')).not.toBeNull();
    expect(getByLabelText(queryBuilderSetup, 'Runtime')).not.toBeNull();
    expect(getByLabelText(queryBuilderSetup, 'Entity')).not.toBeNull();
    await waitFor(() => getByText(queryBuilderSetup, 'Person'));
    const entitySelectorContainer = guaranteeNonNullable(
      await waitFor(() => getByText(queryBuilderSetup, 'Entity').parentElement),
    );
    // select FirmExtension from dropdown
    selectFromCustomSelectorInput(
      entitySelectorContainer,
      'FirmExtensionmodel::pure::tests::model::simple::FirmExtension',
    );
    await waitFor(() => getByText(queryBuilderSetup, 'FirmExtension'));
    // select synonym from dropdown
    selectFromCustomSelectorInput(
      entitySelectorContainer,
      'Synonymmodel::pure::tests::model::simple::Synonym',
    );
    await waitFor(() => getByText(queryBuilderSetup, 'Synonym'));
    const queryBuilderExplorerTree = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );
    await waitFor(() => getByText(queryBuilderExplorerTree, 'Synonym'));
  },
  50000,
);
