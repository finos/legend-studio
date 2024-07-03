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

import { describe, test, expect } from '@jest/globals';
import {
  act,
  fireEvent,
  getAllByText,
  getByText,
  queryByText,
  waitFor,
} from '@testing-library/react';
import {
  TEST_DATA__getAllWithHardcodedDateInput,
  TEST_DATA__getAllWithHardcodedDateOutput,
  TEST_DATA__simpleGetAllVersionsWithBiTemporalSourceAndBiTemporalTarget,
  TEST_DATA__simpleGetAllVersionsWithBusinessTemporalClass,
  TEST_DATA__simpleGetAllVersionsWithBusinessTemporalSourceAndBusinessTemporalTarget,
  TEST_DATA__simpleGetAllVersionsWithProcessingTemporalClass,
  TEST_DATA__simpleGetAllVersionsWithProcessingTemporalSourceAndBusinessTemporalTarget,
  TEST_DATA__simpleGetAllVersionsWithProcessingTemporalSourceAndProcessingTemporalTarget,
  TEST_DATA__simpleProjectionWithAggregationInput,
  TEST_DATA__simpleProjectionWithAggregationOutput,
  TEST_DATA__simpleProjectionWithBiTemporalSourceAndBiTemporalTarget,
  TEST_DATA__simpleProjectionWithBiTemporalSourceAndBusinessTemporalTarget,
  TEST_DATA__simpleProjectionWithBiTemporalSourceAndProcessingTemporalTarget,
  TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndBiTemporalTarget,
  TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndBusinessTemporalTarget,
  TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndProcessingTemporalTarget,
  TEST_DATA__simpleProjectionWithNonTemporalSourceAndBiTemporalTarget,
  TEST_DATA__simpleProjectionWithNonTemporalSourceAndBusinessTemporalTarget,
  TEST_DATA__simpleProjectionWithNonTemporalSourceAndProcessingTemporalTarget,
  TEST_DATA__simpleProjectionWithProcessingTemporalSourceAndBiTemporalTarget,
  TEST_DATA__simpleProjectionWithProcessingTemporalSourceAndBusinessTemporalTarget,
  TEST_DATA__simpleProjectionWithProcessingTemporalSourceAndProcessingTemporalTarget,
} from '../../stores/__tests__/TEST_DATA__QueryBuilder_Milestoning.js';
import TEST_MilestoningModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_Milestoning.json' assert { type: 'json' };
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import { integrationTest } from '@finos/legend-shared/test';
import { stub_RawLambda, create_RawLambda } from '@finos/legend-graph';
import { QueryBuilderSimpleProjectionColumnState } from '../../stores/fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import { QueryBuilderTDSState } from '../../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import type { Entity } from '@finos/legend-storage';
import { TEST__setUpQueryBuilder } from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import { TEST_DATA__ModelCoverageAnalysisResult_Milestoning } from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import { getParameterNameInput } from './QueryBuilderParametersPanel.test.js';

type QueryComparisonTestCase = [
  string,
  {
    mappingPath: string;
    runtimePath: string;
    classPath: string;
    entities: Entity[];
    inputRawLambda: { parameters?: object; body?: object };
    outputRawLambda: { parameters?: object; body?: object };
  },
];

const QUERY_COMPARISON_CASES: QueryComparisonTestCase[] = [
  [
    'ValueSpecification is properly build after processing a lambda with Business Temporal source with Aggregation',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      inputRawLambda: TEST_DATA__simpleProjectionWithAggregationInput,
      outputRawLambda: TEST_DATA__simpleProjectionWithAggregationOutput,
    },
  ],
  [
    'ValueSpecification is properly build after processing a lambda with Business Temporal source with hardcoded date in getAll()',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      inputRawLambda: TEST_DATA__getAllWithHardcodedDateInput,
      outputRawLambda: TEST_DATA__getAllWithHardcodedDateOutput,
    },
  ],
];

describe(integrationTest('Milestoning query is properly built'), () => {
  test.each(QUERY_COMPARISON_CASES)(
    '%s',
    async (
      testName: QueryComparisonTestCase[0],
      testCase: QueryComparisonTestCase[1],
    ) => {
      const {
        mappingPath,
        runtimePath,
        classPath,
        entities,
        inputRawLambda,
        outputRawLambda,
      } = testCase;
      const { queryBuilderState } = await TEST__setUpQueryBuilder(
        entities,
        stub_RawLambda(),
        mappingPath,
        runtimePath,
      );

      const _personClass =
        queryBuilderState.graphManagerState.graph.getClass(classPath);
      await act(async () => {
        queryBuilderState.changeClass(_personClass);
      });

      await act(async () => {
        queryBuilderState.initializeWithQuery(
          create_RawLambda(inputRawLambda.parameters, inputRawLambda.body),
        );
      });
      const receivedOutput = queryBuilderState.buildQuery();

      // Compare input JSON and output JSON for building a query
      expect(receivedOutput.parameters).toEqual(outputRawLambda.parameters);
      expect(receivedOutput.body).toEqual(outputRawLambda.body);
    },
  );
});

type QueryPropertyParameterTestCase = [
  string,
  {
    mappingPath: string;
    runtimePath: string;
    classPath: string;
    entities: Entity[];
    rawLambda: { parameters?: object; body?: object };
    expectedNumberOfDerivedPropertyStates: number;
    expectedNumberOfParameterValues: number;
    expectedNumberOfPropertyParameterValues: number;
    hasNonMilestoningParams: boolean;
  },
];

const QUERY_PROPERTY_PARAMETER_CASES: QueryPropertyParameterTestCase[] = [
  [
    'Query builder state is properly set after processing a lambda with Business Temporal source Processing Temporal target',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      rawLambda:
        TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndProcessingTemporalTarget,
      expectedNumberOfDerivedPropertyStates: 1,
      expectedNumberOfParameterValues: 2,
      expectedNumberOfPropertyParameterValues: 2,
      hasNonMilestoningParams: false,
    },
  ],
  [
    'Query builder state is properly set after processing a lambda with Business Temporal source Business Temporal target',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      rawLambda:
        TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndBusinessTemporalTarget,
      expectedNumberOfDerivedPropertyStates: 1,
      expectedNumberOfParameterValues: 1,
      expectedNumberOfPropertyParameterValues: 2,
      hasNonMilestoningParams: false,
    },
  ],
  [
    'Query builder state is properly set after processing a lambda with Business Temporal source BiTemporal target',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      rawLambda:
        TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndBiTemporalTarget,
      expectedNumberOfDerivedPropertyStates: 1,
      expectedNumberOfParameterValues: 2,
      expectedNumberOfPropertyParameterValues: 3,
      hasNonMilestoningParams: false,
    },
  ],
  [
    'Query builder state is properly set after processing a lambda with BiTemporal source BiTemporal target',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      rawLambda:
        TEST_DATA__simpleProjectionWithBiTemporalSourceAndBiTemporalTarget,
      expectedNumberOfDerivedPropertyStates: 1,
      expectedNumberOfParameterValues: 2,
      expectedNumberOfPropertyParameterValues: 3,
      hasNonMilestoningParams: false,
    },
  ],
  [
    'Query builder state is properly set after processing a lambda with BiTemporal source Business Temporal target',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      rawLambda:
        TEST_DATA__simpleProjectionWithBiTemporalSourceAndBusinessTemporalTarget,
      expectedNumberOfDerivedPropertyStates: 1,
      expectedNumberOfParameterValues: 2,
      expectedNumberOfPropertyParameterValues: 2,
      hasNonMilestoningParams: false,
    },
  ],
  [
    'Query builder state is properly set after processing a lambda with BiTemporal source Processing Temporal target',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      rawLambda:
        TEST_DATA__simpleProjectionWithBiTemporalSourceAndProcessingTemporalTarget,
      expectedNumberOfDerivedPropertyStates: 1,
      expectedNumberOfParameterValues: 2,
      expectedNumberOfPropertyParameterValues: 2,
      hasNonMilestoningParams: false,
    },
  ],
  [
    'Query builder state is properly set after processing a lambda with Processing Temporal source BiTemporal target',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      rawLambda:
        TEST_DATA__simpleProjectionWithProcessingTemporalSourceAndBiTemporalTarget,
      expectedNumberOfDerivedPropertyStates: 1,
      expectedNumberOfParameterValues: 2,
      expectedNumberOfPropertyParameterValues: 3,
      hasNonMilestoningParams: false,
    },
  ],
  [
    'Query builder state is properly set after processing a lambda with Processing Temporal source Business Temporal target',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      rawLambda:
        TEST_DATA__simpleProjectionWithProcessingTemporalSourceAndBusinessTemporalTarget,
      expectedNumberOfDerivedPropertyStates: 1,
      expectedNumberOfParameterValues: 2,
      expectedNumberOfPropertyParameterValues: 2,
      hasNonMilestoningParams: false,
    },
  ],
  [
    'Query builder state is properly set after processing a lambda with Processing Temporal source Processing Temporal target',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      rawLambda:
        TEST_DATA__simpleProjectionWithProcessingTemporalSourceAndProcessingTemporalTarget,
      expectedNumberOfDerivedPropertyStates: 1,
      expectedNumberOfParameterValues: 1,
      expectedNumberOfPropertyParameterValues: 2,
      hasNonMilestoningParams: false,
    },
  ],
  [
    'Query builder state is properly set after processing a lambda with non-temporal source Processing Temporal target',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      rawLambda:
        TEST_DATA__simpleProjectionWithNonTemporalSourceAndProcessingTemporalTarget,
      expectedNumberOfDerivedPropertyStates: 1,
      expectedNumberOfParameterValues: 1,
      expectedNumberOfPropertyParameterValues: 2,
      hasNonMilestoningParams: false,
    },
  ],
  [
    'Query builder state is properly set after processing a lambda with non-temporal source Business Temporal target',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      rawLambda:
        TEST_DATA__simpleProjectionWithNonTemporalSourceAndBusinessTemporalTarget,
      expectedNumberOfDerivedPropertyStates: 1,
      expectedNumberOfParameterValues: 1,
      expectedNumberOfPropertyParameterValues: 2,
      hasNonMilestoningParams: false,
    },
  ],
  [
    'Query builder state is properly set after processing a lambda with non-temporal source BiTemporal target',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      rawLambda:
        TEST_DATA__simpleProjectionWithNonTemporalSourceAndBiTemporalTarget,
      expectedNumberOfDerivedPropertyStates: 1,
      expectedNumberOfParameterValues: 2,
      expectedNumberOfPropertyParameterValues: 3,
      hasNonMilestoningParams: false,
    },
  ],
];

describe(
  integrationTest(
    `Milestoning query milestoning property expression is supplied with proper parameters`,
  ),
  () => {
    test.each(QUERY_PROPERTY_PARAMETER_CASES)(
      '%s',
      async (
        testName: QueryPropertyParameterTestCase[0],
        testCase: QueryPropertyParameterTestCase[1],
      ) => {
        const {
          mappingPath,
          runtimePath,
          classPath,
          entities,
          rawLambda,
          expectedNumberOfDerivedPropertyStates,
          expectedNumberOfParameterValues,
          expectedNumberOfPropertyParameterValues,
          hasNonMilestoningParams,
        } = testCase;
        const { renderResult, queryBuilderState } =
          await TEST__setUpQueryBuilder(
            entities,
            stub_RawLambda(),
            mappingPath,
            runtimePath,
          );

        const _personClass =
          queryBuilderState.graphManagerState.graph.getClass(classPath);
        await act(async () => {
          queryBuilderState.changeClass(_personClass);
        });

        await act(async () => {
          queryBuilderState.initializeWithQuery(
            create_RawLambda(rawLambda.parameters, rawLambda.body),
          );
        });

        // check if the number of query parameters is as expected for a given milestoned stereotype
        expect(queryBuilderState.parametersState.parameterStates.length).toBe(
          expectedNumberOfParameterValues,
        );

        const tdsState = guaranteeType(
          queryBuilderState.fetchStructureState.implementation,
          QueryBuilderTDSState,
        );
        const projectionColumnState = guaranteeType(
          tdsState.projectionColumns[0],
          QueryBuilderSimpleProjectionColumnState,
        );
        const derivedPropertyExpressionStates =
          projectionColumnState.propertyExpressionState
            .derivedPropertyExpressionStates;

        // property replaced with derived property as it is milestoned
        expect(derivedPropertyExpressionStates.length).toBe(
          expectedNumberOfDerivedPropertyStates,
        );
        const parameterValues = guaranteeNonNullable(
          derivedPropertyExpressionStates[0]?.propertyExpression
            .parametersValues,
        );

        // default milestoning date is propagated as date propagation is not supported.
        expect(parameterValues.length).toBe(
          expectedNumberOfPropertyParameterValues,
        );

        // Check if we have parameter panel opened and able to run query
        if (expectedNumberOfParameterValues > 0) {
          expect(queryBuilderState.showParametersPanel).toBe(true);
          await waitFor(() =>
            renderResult.getByTestId(
              QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_PANEL,
            ),
          );
          await act(async () => {
            fireEvent.click(renderResult.getByText('Run Query'));
          });
          if (!hasNonMilestoningParams) {
            expect(renderResult.queryByText('Set Parameter Values')).toBeNull();
          } else {
            expect(
              renderResult.queryByText('Set Parameter Values'),
            ).not.toBeNull();
          }
        }
      },
    );
  },
);

test(
  integrationTest(
    'Query builder state is properly set after creating a query with non-temporal source and temporal target',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_MilestoningModel,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_Milestoning,
    );
    const _firmClass =
      queryBuilderState.graphManagerState.graph.getClass('my::Firm');
    await act(async () => {
      queryBuilderState.changeClass(_firmClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getAllByText(queryBuilderSetup, 'Firm'));

    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );

    //Add properties to fetch-structure
    const element = await waitFor(() =>
      getByText(explorerPanel, 'Business Temporal'),
    );
    fireEvent.contextMenu(element);
    fireEvent.click(
      renderResult.getByText('Add Properties to Fetch Structure'),
    );
    const tdsStateOne = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );
    expect(tdsStateOne.projectionColumns.length).toBe(2);

    // Check if we have paramter panel opened and able to run query
    expect(queryBuilderState.showParametersPanel).toBe(true);

    const parameterPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS),
    );
    await waitFor(() => getByText(parameterPanel, 'businessDate'));
    await waitFor(() => getByText(parameterPanel, 'milestoning'));
    fireEvent.click(await waitFor(() => getByText(parameterPanel, 'Now')));
    const ParameterDialog = await waitFor(() =>
      renderResult.getByRole('dialog'),
    );
    expect(getByText(ParameterDialog, 'Update Parameter'));
    expect(
      getByText(
        ParameterDialog,
        'Choose a default value for this milestoning parameter',
      ),
    );
    fireEvent.click(await waitFor(() => getByText(ParameterDialog, 'Now')));
    fireEvent.click(await waitFor(() => renderResult.getByText('Today')));
    fireEvent.click(await waitFor(() => getByText(ParameterDialog, 'Update')));
    await waitFor(() => getByText(parameterPanel, 'Today'));
    await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_PANEL,
      ),
    );
    await act(async () => {
      fireEvent.click(renderResult.getByText('Run Query'));
    });

    expect(renderResult.queryByText('Set Parameter Values')).toBeNull();
  },
);

test(
  integrationTest(
    'Query builder result modifier panel displays milestoning dates',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_MilestoningModel,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_Milestoning,
    );
    const _personClass =
      queryBuilderState.graphManagerState.graph.getClass('my::Person');
    await act(async () => {
      queryBuilderState.changeClass(_personClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getAllByText(queryBuilderSetup, 'Person'));

    const parameterPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS),
    );
    await waitFor(() => getByText(parameterPanel, 'businessDate'));
    await waitFor(() => getByText(parameterPanel, 'milestoning'));
    await waitFor(() => getByText(parameterPanel, 'Now'));

    const resultModifierPromptPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_RESULT_MODIFIER_PROMPT,
      ),
    );
    await waitFor(() =>
      getAllByText(resultModifierPromptPanel, 'Business Date'),
    );
    await waitFor(() => getAllByText(resultModifierPromptPanel, 'Now'));

    const queryOptionsButton = await waitFor(() =>
      renderResult.getByRole('button', { name: 'Query Options' }),
    );
    fireEvent.click(queryOptionsButton);
    const allVersionsToggle = await renderResult.findByText(
      'Query All Milestoned Versions of the Root Class',
    );
    fireEvent.click(allVersionsToggle);
    const applyButton = (await renderResult.findByRole('button', {
      name: 'Apply',
    })) as HTMLButtonElement;
    await waitFor(() => fireEvent.click(applyButton));
    await waitFor(() =>
      getAllByText(resultModifierPromptPanel, 'All Versions'),
    );
    await waitFor(() => getAllByText(resultModifierPromptPanel, 'Yes'));
    fireEvent.click(queryOptionsButton);
    const allVersionInRangeToggle = await renderResult.findByText(
      'Optionally apply a date range to get All Versions for',
    );
    fireEvent.click(allVersionInRangeToggle);
    fireEvent.click(renderResult.getByRole('button', { name: 'Apply' }));
    await waitFor(() => getAllByText(resultModifierPromptPanel, '(Now - Now)'));
    await waitFor(() => getByText(parameterPanel, 'startDate'));
    await waitFor(() => getByText(parameterPanel, 'endDate'));
    expect(
      await waitFor(() => getAllByText(parameterPanel, 'Now')),
    ).toHaveLength(2);
    fireEvent.click(queryOptionsButton);
    fireEvent.click(allVersionInRangeToggle);
    const cancelButton = (await renderResult.findByRole('button', {
      name: 'Cancel',
    })) as HTMLButtonElement;
    fireEvent.click(cancelButton);
    await waitFor(() => getAllByText(resultModifierPromptPanel, '(Now - Now)'));
  },
);

test(
  integrationTest(
    'Query builder result modifier panel displays correct milestoning names after renaming milestoning parameters',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_MilestoningModel,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_Milestoning,
    );
    const _personClass =
      queryBuilderState.graphManagerState.graph.getClass('my::Person');
    await act(async () => {
      queryBuilderState.changeClass(_personClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getAllByText(queryBuilderSetup, 'Person'));

    const parameterPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS),
    );

    const resultModifierPromptPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_RESULT_MODIFIER_PROMPT,
      ),
    );
    await waitFor(() =>
      getAllByText(resultModifierPromptPanel, 'Business Date'),
    );
    await waitFor(() => getAllByText(resultModifierPromptPanel, 'Now'));
    fireEvent.click(getByText(parameterPanel, 'businessDate'));
    const parameterNameInput = getParameterNameInput(renderResult);
    fireEvent.change(parameterNameInput, {
      target: { value: 'businessDateRenamed' },
    });
    const updateButton = (await renderResult.findByRole('button', {
      name: 'Update',
    })) as HTMLButtonElement;
    fireEvent.click(updateButton);
    await waitFor(() => getAllByText(resultModifierPromptPanel, 'Now'));
    const queryOptionsButton = await waitFor(() =>
      renderResult.getByRole('button', { name: 'Query Options' }),
    );
    fireEvent.click(queryOptionsButton);
    const cancelButton = (await renderResult.findByRole('button', {
      name: 'Cancel',
    })) as HTMLButtonElement;
    fireEvent.click(cancelButton);
    await waitFor(() => getAllByText(resultModifierPromptPanel, 'Now'));
    expect(queryBuilderState.parametersState.parameterStates.length).toBe(1);
  },
);

type QueryGetAllVersionsTestCase = [
  string,
  {
    mappingPath: string;
    runtimePath: string;
    classPath: string;
    entities: Entity[];
    rawLambda: { parameters?: object; body?: object };
    expectedLambda: { parameters?: object; body?: object };
  },
];
const QUERY_GET_ALL_VERSIONS_CASES: QueryGetAllVersionsTestCase[] = [
  [
    'Query builder state is properly built after setting getAllVersions with business temporal source and business temporal target',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      rawLambda:
        TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndBusinessTemporalTarget,
      expectedLambda:
        TEST_DATA__simpleGetAllVersionsWithBusinessTemporalSourceAndBusinessTemporalTarget,
    },
  ],
  [
    'Query builder state is properly built after setting getAllVersions with bi temporal source and bi temporal target',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      rawLambda:
        TEST_DATA__simpleProjectionWithBiTemporalSourceAndBiTemporalTarget,
      expectedLambda:
        TEST_DATA__simpleGetAllVersionsWithBiTemporalSourceAndBiTemporalTarget,
    },
  ],
  [
    'Query builder state is properly built after setting getAllVersions with processing temporal source and processing temporal target',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      rawLambda:
        TEST_DATA__simpleProjectionWithProcessingTemporalSourceAndProcessingTemporalTarget,
      expectedLambda:
        TEST_DATA__simpleGetAllVersionsWithProcessingTemporalSourceAndProcessingTemporalTarget,
    },
  ],
  [
    'Query builder state is properly built after setting getAllVersions with processing temporal source and business temporal target',
    {
      mappingPath: 'my::map',
      runtimePath: 'my::runtime',
      classPath: 'my::Person',
      entities: TEST_MilestoningModel,
      rawLambda:
        TEST_DATA__simpleProjectionWithProcessingTemporalSourceAndBusinessTemporalTarget,
      expectedLambda:
        TEST_DATA__simpleGetAllVersionsWithProcessingTemporalSourceAndBusinessTemporalTarget,
    },
  ],
];

describe(
  integrationTest(
    `Milestoning query is properly set after selecting getAllVersions`,
  ),
  () => {
    test.each(QUERY_GET_ALL_VERSIONS_CASES)(
      '%s',
      async (
        testName: QueryGetAllVersionsTestCase[0],
        testCase: QueryGetAllVersionsTestCase[1],
      ) => {
        const {
          mappingPath,
          runtimePath,
          classPath,
          entities,
          rawLambda,
          expectedLambda,
        } = testCase;
        const { renderResult, queryBuilderState } =
          await TEST__setUpQueryBuilder(
            entities,
            stub_RawLambda(),
            mappingPath,
            runtimePath,
            TEST_DATA__ModelCoverageAnalysisResult_Milestoning,
          );

        const _personClass =
          queryBuilderState.graphManagerState.graph.getClass(classPath);
        await act(async () => {
          queryBuilderState.changeClass(_personClass);
        });

        await act(async () => {
          queryBuilderState.initializeWithQuery(
            create_RawLambda(rawLambda.parameters, rawLambda.body),
          );
        });

        const queryOptionsButton = await waitFor(() =>
          renderResult.getByRole('button', { name: 'Query Options' }),
        );
        fireEvent.click(queryOptionsButton);

        const dialog = await waitFor(() => renderResult.getByRole('dialog'));

        fireEvent.click(
          getByText(dialog, 'Query All Milestoned Versions of the Root Class'),
        );

        const applyButton = (await renderResult.findByRole('button', {
          name: 'Apply',
        })) as HTMLButtonElement;

        await waitFor(() => fireEvent.click(applyButton));

        const receivedOutput = queryBuilderState.buildQuery();

        // Compare input JSON and output JSON for building a query
        expect(receivedOutput.parameters).toEqual(expectedLambda.parameters);
        expect(receivedOutput.body).toEqual(expectedLambda.body);
      },
    );
  },
);

type QueryGetAllVersionsInRangeTestCase = [
  string,
  {
    mappingPath: string;
    runtimePath: string;
    classPath: string;
    entities: Entity[];
    rawLambda: { parameters?: object; body?: object };
    expectedMilestoningDate: string;
  },
];
const QUERY_GET_ALL_VERSIONS_IN_RANGE_CASES: QueryGetAllVersionsInRangeTestCase[] =
  [
    [
      'Query builder state is properly built after setting getAllVersionsInRange() with business temporal source',
      {
        mappingPath: 'my::map',
        runtimePath: 'my::runtime',
        classPath: 'my::Person',
        entities: TEST_MilestoningModel,
        rawLambda: TEST_DATA__simpleGetAllVersionsWithBusinessTemporalClass,
        expectedMilestoningDate: 'businessDate',
      },
    ],
    [
      'Query builder state is properly built after setting getAllVersionsInRange() with processing temporal source',
      {
        mappingPath: 'my::map',
        runtimePath: 'my::runtime',
        classPath: 'my::Person',
        entities: TEST_MilestoningModel,
        rawLambda: TEST_DATA__simpleGetAllVersionsWithProcessingTemporalClass,
        expectedMilestoningDate: 'processingDate',
      },
    ],
  ];

describe(
  integrationTest(
    `Milestoning query is properly set after selecting getAllVersionsInRange()`,
  ),
  () => {
    test.each(QUERY_GET_ALL_VERSIONS_IN_RANGE_CASES)(
      '%s',
      async (
        testName: QueryGetAllVersionsInRangeTestCase[0],
        testCase: QueryGetAllVersionsInRangeTestCase[1],
      ) => {
        const {
          mappingPath,
          runtimePath,
          classPath,
          entities,
          rawLambda,
          expectedMilestoningDate,
        } = testCase;
        const { renderResult, queryBuilderState } =
          await TEST__setUpQueryBuilder(
            entities,
            stub_RawLambda(),
            mappingPath,
            runtimePath,
            TEST_DATA__ModelCoverageAnalysisResult_Milestoning,
          );

        const _personClass =
          queryBuilderState.graphManagerState.graph.getClass(classPath);
        await act(async () => {
          queryBuilderState.changeClass(_personClass);
        });

        await act(async () => {
          queryBuilderState.initializeWithQuery(
            create_RawLambda(rawLambda.parameters, rawLambda.body),
          );
        });

        const queryOptionsButton = await waitFor(() =>
          renderResult.getByRole('button', { name: 'Query Options' }),
        );
        fireEvent.click(queryOptionsButton);
        const dialog = await waitFor(() => renderResult.getByRole('dialog'));
        // Check if we are setting start date and end date when allVersionsInRange() is selected
        fireEvent.click(
          getByText(
            dialog,
            'Optionally apply a date range to get All Versions for',
          ),
        );

        expect(getAllByText(dialog, 'startDate').length).toBe(2);
        expect(getAllByText(dialog, 'endDate').length).toBe(2);

        // Change the function back to getAll()
        fireEvent.click(
          getByText(dialog, 'Query All Milestoned Versions of the Root Class'),
        );
        expect(getAllByText(dialog, expectedMilestoningDate).length).toBe(2);
      },
    );
  },
);

//====================================     test milestoning reset logic      ====================================

test(
  integrationTest(
    'Milestoning query is properly reset after setting getAllVersions() with business temporal source',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_MilestoningModel,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_Milestoning,
    );
    const _personClass =
      queryBuilderState.graphManagerState.graph.getClass('my::Person');
    await act(async () => {
      queryBuilderState.changeClass(_personClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getAllByText(queryBuilderSetup, 'Person'));

    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );

    //Add properties to fetch-structure
    const element = await waitFor(() => getByText(explorerPanel, 'Date'));
    fireEvent.contextMenu(element);
    fireEvent.click(renderResult.getByText('Add Property to Fetch Structure'));
    const tdsStateOne = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );
    expect(tdsStateOne.projectionColumns.length).toBe(1);

    // Check if we have paramter panel opened and able to run query
    expect(queryBuilderState.showParametersPanel).toBe(true);

    const parameterPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS),
    );
    await waitFor(() => getByText(parameterPanel, 'businessDate'));
    await waitFor(() => getByText(parameterPanel, 'milestoning'));

    const queryOptionsButton = await waitFor(() =>
      renderResult.getByRole('button', { name: 'Query Options' }),
    );
    fireEvent.click(queryOptionsButton);

    const queryOptiondialog = await waitFor(() =>
      renderResult.getByRole('dialog'),
    );
    // check if Business Date is shown
    expect(getByText(queryOptiondialog, 'Business Date')).not.toBeNull();

    fireEvent.click(
      getByText(
        queryOptiondialog,
        'Query All Milestoned Versions of the Root Class',
      ),
    );
    expect(
      getByText(queryOptiondialog, 'All Versions In Range'),
    ).not.toBeNull();

    const cancelButton = (await renderResult.findByRole('button', {
      name: 'Cancel',
    })) as HTMLButtonElement;
    fireEvent.click(cancelButton);
    const resultModifierPromptPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_RESULT_MODIFIER_PROMPT,
      ),
    );
    await waitFor(() =>
      getAllByText(resultModifierPromptPanel, 'Business Date'),
    );
    await waitFor(() => getAllByText(resultModifierPromptPanel, 'Now'));
    expect(queryBuilderState.parametersState.parameterStates.length).toBe(1);
  },
);

test(
  integrationTest(
    'Milestoning query is properly reset with business temporal source and all versions in range enabled',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_MilestoningModel,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_Milestoning,
    );
    const _personClass =
      queryBuilderState.graphManagerState.graph.getClass('my::Person');
    await act(async () => {
      queryBuilderState.changeClass(_personClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getAllByText(queryBuilderSetup, 'Person'));

    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );

    //Add properties to fetch-structure
    const element = await waitFor(() => getByText(explorerPanel, 'Date'));
    fireEvent.contextMenu(element);
    fireEvent.click(renderResult.getByText('Add Property to Fetch Structure'));
    const tdsStateOne = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );
    expect(tdsStateOne.projectionColumns.length).toBe(1);

    // Check if we have paramter panel opened and able to run query
    expect(queryBuilderState.showParametersPanel).toBe(true);

    const parameterPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS),
    );
    await waitFor(() => getByText(parameterPanel, 'businessDate'));
    await waitFor(() => getByText(parameterPanel, 'milestoning'));

    const queryOptionsButton = await waitFor(() =>
      renderResult.getByRole('button', { name: 'Query Options' }),
    );
    fireEvent.click(queryOptionsButton);
    const queryOptiondialog = await waitFor(() =>
      renderResult.getByRole('dialog'),
    );

    // set query to use all versions in range
    fireEvent.click(
      getByText(
        queryOptiondialog,
        'Query All Milestoned Versions of the Root Class',
      ),
    );
    fireEvent.click(
      getByText(
        queryOptiondialog,
        'Optionally apply a date range to get All Versions for',
      ),
    );
    const applyButton = (await renderResult.findByRole('button', {
      name: 'Apply',
    })) as HTMLButtonElement;
    fireEvent.click(applyButton);
    const resultModifierPromptPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_RESULT_MODIFIER_PROMPT,
      ),
    );
    await waitFor(() =>
      getAllByText(resultModifierPromptPanel, 'All Versions'),
    );
    await waitFor(() => getAllByText(resultModifierPromptPanel, '(Now - Now)'));
    expect(queryBuilderState.parametersState.parameterStates.length).toBe(2);

    // test cancellation
    fireEvent.click(queryOptionsButton);
    fireEvent.click(
      getByText(
        queryOptiondialog,
        'Query All Milestoned Versions of the Root Class',
      ),
    );
    expect(getByText(queryOptiondialog, 'Business Date')).not.toBeNull();
    fireEvent.click(
      (await renderResult.findByRole('button', {
        name: 'Cancel',
      })) as HTMLButtonElement,
    );
    await waitFor(() =>
      getAllByText(resultModifierPromptPanel, 'All Versions'),
    );
    await waitFor(() => getAllByText(resultModifierPromptPanel, '(Now - Now)'));
  },
);

test(
  integrationTest('Milestoning query is properly reset with bitemporal source'),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_MilestoningModel,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_Milestoning,
    );
    const _person1Class =
      queryBuilderState.graphManagerState.graph.getClass('my::Person1');
    await act(async () => {
      queryBuilderState.changeClass(_person1Class);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getAllByText(queryBuilderSetup, 'Person1'));

    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );

    //Add properties to fetch-structure
    const element = await waitFor(() => getByText(explorerPanel, 'Firm ID'));
    fireEvent.contextMenu(element);
    fireEvent.click(renderResult.getByText('Add Property to Fetch Structure'));
    const tdsStateOne = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );
    expect(tdsStateOne.projectionColumns.length).toBe(1);

    // Check if we have paramter panel opened and able to run query
    expect(queryBuilderState.showParametersPanel).toBe(true);

    const parameterPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS),
    );
    await waitFor(() => getByText(parameterPanel, 'businessDate'));
    await waitFor(() => getByText(parameterPanel, 'processingDate'));

    const queryOptionsButton = await waitFor(() =>
      renderResult.getByRole('button', { name: 'Query Options' }),
    );
    fireEvent.click(queryOptionsButton);
    const queryOptiondialog = await waitFor(() =>
      renderResult.getByRole('dialog'),
    );

    // set query to use all versions
    fireEvent.click(
      getByText(
        queryOptiondialog,
        'Query All Milestoned Versions of the Root Class',
      ),
    );
    expect(queryByText(queryOptiondialog, 'Processing Date')).toBeNull();
    expect(queryByText(queryOptiondialog, 'Business Date')).toBeNull();
    fireEvent.click(
      getByText(
        queryOptiondialog,
        'Query All Milestoned Versions of the Root Class',
      ),
    );
    expect(queryByText(queryOptiondialog, 'Business Date')).not.toBeNull();
    expect(queryByText(queryOptiondialog, 'Business Date')).not.toBeNull();

    //  set query to use all versions again
    fireEvent.click(
      getByText(
        queryOptiondialog,
        'Query All Milestoned Versions of the Root Class',
      ),
    );
    const cancelButton = (await renderResult.findByRole('button', {
      name: 'Cancel',
    })) as HTMLButtonElement;
    fireEvent.click(cancelButton);
    const resultModifierPromptPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_RESULT_MODIFIER_PROMPT,
      ),
    );
    await waitFor(() =>
      getAllByText(resultModifierPromptPanel, 'Business Date'),
    );
    await waitFor(() =>
      getAllByText(resultModifierPromptPanel, 'Processing Date'),
    );
    expect(
      await (
        await waitFor(() => getAllByText(resultModifierPromptPanel, 'Now'))
      ).length,
    ).toBe(2);
    expect(queryBuilderState.parametersState.parameterStates.length).toBe(2);
  },
);

test(
  integrationTest(
    'Used milestoning parameters will not be deleted when setting getAllVersions()',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_MilestoningModel,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_Milestoning,
    );
    const _personClass =
      queryBuilderState.graphManagerState.graph.getClass('my::Person');
    await act(async () => {
      queryBuilderState.changeClass(_personClass);
    });
    const queryBuilderSetup = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP),
    );
    await waitFor(() => getAllByText(queryBuilderSetup, 'Person'));

    const explorerPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER),
    );

    //Add properties to fetch-structure
    const element = await waitFor(() =>
      getByText(explorerPanel, 'Business Temporal'),
    );
    fireEvent.contextMenu(element);
    fireEvent.click(
      renderResult.getByText('Add Properties to Fetch Structure'),
    );
    const tdsStateOne = guaranteeType(
      queryBuilderState.fetchStructureState.implementation,
      QueryBuilderTDSState,
    );
    expect(tdsStateOne.projectionColumns.length).toBe(2);

    // Check if we have paramter panel opened and able to run query
    expect(queryBuilderState.showParametersPanel).toBe(true);

    const parameterPanel = await waitFor(() =>
      renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS),
    );
    await waitFor(() => getByText(parameterPanel, 'businessDate'));

    const queryOptionsButton = await waitFor(() =>
      renderResult.getByRole('button', { name: 'Query Options' }),
    );
    fireEvent.click(queryOptionsButton);
    const queryOptiondialog = await waitFor(() =>
      renderResult.getByRole('dialog'),
    );

    // set query to use all versions
    fireEvent.click(
      getByText(
        queryOptiondialog,
        'Query All Milestoned Versions of the Root Class',
      ),
    );
    const applyButton = (await renderResult.findByRole('button', {
      name: 'Apply',
    })) as HTMLButtonElement;
    fireEvent.click(applyButton);
    const resultModifierPromptPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_RESULT_MODIFIER_PROMPT,
      ),
    );
    await waitFor(() =>
      getAllByText(resultModifierPromptPanel, 'All Versions'),
    );
    await waitFor(() => getAllByText(resultModifierPromptPanel, 'Yes'));
    await waitFor(() => getAllByText(resultModifierPromptPanel, 'Now'));
    await waitFor(() =>
      getAllByText(resultModifierPromptPanel, 'Business Date'),
    );
    expect(queryBuilderState.parametersState.parameterStates.length).toBe(1);
  },
);
