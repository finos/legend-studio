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
import { describe, expect, test } from '@jest/globals';
import {
  type RenderResult,
  waitFor,
  fireEvent,
  act,
  getAllByText,
  getByText,
  getByTestId,
  queryByTestId,
} from '@testing-library/react';
import { TEST_DATA__simpleProjectionWithConstantsAndParameters } from '../../stores/__tests__/TEST_DATA__QueryBuilder_Generic.js';
import {
  TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
  TEST_DATA__ModelCoverageAnalysisResult_Milestoning,
} from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import TEST_MilestoningModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_Milestoning.json' with { type: 'json' };
import { TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndBusinessTemporalTarget } from '../../stores/__tests__/TEST_DATA__QueryBuilder_Milestoning.js';
import TEST_DATA__ComplexRelationalModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexRelational.json' with { type: 'json' };
import { integrationTest } from '@finos/legend-shared/test';
import {
  create_RawLambda,
  stub_RawLambda,
  GenericType,
  GenericTypeExplicitReference,
  PrimitiveInstanceValue,
  PrimitiveType,
  VariableExpression,
} from '@finos/legend-graph';
import { TEST__setUpQueryBuilder } from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import type { QueryBuilderState } from '../../stores/QueryBuilderState.js';
import {
  QueryBuilderDataDNSWatermark,
  QueryBuilderStandardWatermark,
} from '../../stores/watermark/QueryBuilderWatermarkState.js';

test(
  integrationTest(
    'Query builder watermark modal saves changes to state when Apply button is clicked',
  ),
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

    // Open Query Options modal
    const queryOptionsButton = await waitFor(() =>
      renderResult.getByRole('button', { name: 'Set Query Options' }),
    );
    fireEvent.click(queryOptionsButton);
    fireEvent.click(
      await waitFor(() =>
        renderResult.getByRole('button', { name: 'Enable Watermark' }),
      ),
    );
    const watermarkEditor = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_MODIFIER_PANEL__WATERMAKR,
    );
    const waterMarkInput = watermarkEditor.getElementsByClassName(
      'value-spec-editor__input',
    )[0];
    expect(waterMarkInput).toBeDefined();
    await waitFor(() =>
      fireEvent.change(guaranteeNonNullable(waterMarkInput), {
        target: { value: 'testValue' },
      }),
    );
    fireEvent.click(renderResult.getByRole('button', { name: 'Apply' }));

    // Verify that value was saved
    const resultModifierPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_RESULT_MODIFIER_PROMPT,
      ),
    );
    await waitFor(() => getAllByText(resultModifierPanel, 'Watermark'));
    await waitFor(() => getAllByText(resultModifierPanel, 'testValue'));
  },
);

test(
  integrationTest(
    "Query builder watermark modal doesn't save changes to state when Cancel button is clicked",
  ),
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

    // Open Query Options modal, enable and save watermark
    const queryOptionsButton = await waitFor(() =>
      renderResult.getByRole('button', { name: 'Set Query Options' }),
    );
    fireEvent.click(queryOptionsButton);
    fireEvent.click(
      await waitFor(() =>
        renderResult.getByRole('button', { name: 'Enable Watermark' }),
      ),
    );
    await waitFor(() => renderResult.getByText('Watermark'));
    const watermarkEditor = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_MODIFIER_PANEL__WATERMAKR,
    );
    const waterMarkInput = watermarkEditor.getElementsByClassName(
      'value-spec-editor__input',
    )[0];
    expect(waterMarkInput).toBeDefined();
    await waitFor(() =>
      fireEvent.change(guaranteeNonNullable(waterMarkInput), {
        target: { value: 'watermarkValue' },
      }),
    );
    fireEvent.click(renderResult.getByRole('button', { name: 'Apply' }));

    // Re-open watermark modal and change value
    fireEvent.click(queryOptionsButton);
    const watermarkValueInput =
      renderResult.getByDisplayValue('watermarkValue');
    fireEvent.change(watermarkValueInput, {
      target: { value: 'testValue' },
    });

    // Click cancel
    fireEvent.click(renderResult.getByRole('button', { name: 'Cancel' }));

    // Re-open watermark modal
    fireEvent.click(queryOptionsButton);

    // Verify that value was not saved
    expect(renderResult.getByDisplayValue('watermarkValue')).not.toBeNull();

    // Disable watermark
    fireEvent.click(renderResult.getByText('Enable Watermark'));

    // Click cancel
    fireEvent.click(renderResult.getByRole('button', { name: 'Cancel' }));

    // Verify that watermark is still enabled
    const resultModifierPanel = await waitFor(() =>
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_RESULT_MODIFIER_PROMPT,
      ),
    );
    await waitFor(() => getAllByText(resultModifierPanel, 'Watermark'));
    await waitFor(() => getAllByText(resultModifierPanel, 'watermarkValue'));
  },
);

test(
  integrationTest(
    "Query builder watermark modal resets watermark value when 'Reset' button is clicked",
  ),
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

    // Open watermark modal
    const queryOptionsButton = await waitFor(() =>
      renderResult.getByRole('button', { name: 'Set Query Options' }),
    );
    fireEvent.click(queryOptionsButton);
    await waitFor(() => renderResult.getByText('Watermark'));

    // Enable watermark and set value
    fireEvent.click(
      await waitFor(() =>
        renderResult.getByRole('button', { name: 'Enable Watermark' }),
      ),
    );
    const watermarkEditor = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_MODIFIER_PANEL__WATERMAKR,
    );
    const waterMarkInput = watermarkEditor.getElementsByClassName(
      'value-spec-editor__input',
    )[0];
    expect(waterMarkInput).toBeDefined();
    await waitFor(() =>
      fireEvent.change(guaranteeNonNullable(waterMarkInput), {
        target: { value: 'testValue' },
      }),
    );
    expect(renderResult.getByDisplayValue('testValue')).not.toBeNull();

    // Click reset button
    fireEvent.click(renderResult.getByRole('button', { name: 'Reset' }));

    // Verify that value was reset
    expect(renderResult.queryByText('testValue')).toBeNull();
    expect(renderResult.getByTitle('Invalid String value')).not.toBeNull();
  },
);

const buildDateValue = (
  date: string,
  type: PrimitiveType = PrimitiveType.STRICTDATE,
): PrimitiveInstanceValue => {
  const value = new PrimitiveInstanceValue(
    GenericTypeExplicitReference.create(new GenericType(type)),
  );
  value.values = [date];
  return value;
};

/**
 * The custom date of a Data DNS watermark is picked with the date picker: open it, choose an absolute date,
 * enter the date, and close the picker.
 */
const setDataDNSCustomDate = async (
  renderResult: RenderResult,
  date: string,
): Promise<void> => {
  const dateEditor = await renderResult.findByTestId(
    'query-builder__result-modifier__data-dns-watermark__date',
  );
  fireEvent.click(
    guaranteeNonNullable(
      dateEditor.querySelector<HTMLButtonElement>(
        '.value-spec-editor__date-picker__trigger',
      ),
    ),
  );
  fireEvent.click(await waitFor(() => renderResult.getByText('Absolute Date')));
  const input = await waitFor(() => {
    const element = renderResult.baseElement.querySelector<HTMLInputElement>(
      '.value-spec-editor__date-picker__absolute-date__input',
    );
    expect(element).not.toBeNull();
    return element as HTMLInputElement;
  });
  fireEvent.change(input, { target: { value: date } });
  // the open picker hides the modal: close it
  fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });
  await waitFor(() =>
    expect(
      renderResult.baseElement.querySelector(
        '.value-spec-editor__date-picker__absolute-date__input',
      ),
    ).toBeNull(),
  );
};

test(
  integrationTest(
    'Query builder watermark modal saves a Data DNS watermark to state when Apply button is clicked',
  ),
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

    fireEvent.click(
      await waitFor(() =>
        renderResult.getByRole('button', { name: 'Set Query Options' }),
      ),
    );
    fireEvent.click(
      await waitFor(() =>
        renderResult.getByRole('button', { name: 'Enable Watermark' }),
      ),
    );
    fireEvent.click(
      await waitFor(() =>
        renderResult.getByRole('button', { name: 'Data DNS Watermark' }),
      ),
    );
    const dataDNSEditor = await renderResult.findByTestId(
      'query-builder__result-modifier__data-dns-watermark',
    );
    // the first input belongs to the environment selector, the date is picked with the date picker
    const [registryInput, milestoneInput] = Array.from(
      dataDNSEditor.getElementsByTagName('input'),
    )
      .filter((input) => input.type === 'text')
      .slice(-2);

    // the class has no business date to use
    expect(
      renderResult.getByRole('button', { name: 'Business Date' }),
    ).toHaveProperty('disabled', true);

    // Apply is disabled until the required fields are filled
    expect(
      (
        renderResult.getByRole('button', {
          name: 'Apply',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);

    fireEvent.change(guaranteeNonNullable(registryInput), {
      target: { value: 'mySynonymRegistry' },
    });
    // the registry alone is not enough: the date is still missing, and there is no business date to use
    expect(renderResult.getByRole('button', { name: 'Apply' })).toHaveProperty(
      'disabled',
      true,
    );
    await setDataDNSCustomDate(renderResult, '2026-08-31');
    expect(renderResult.getByRole('button', { name: 'Apply' })).toHaveProperty(
      'disabled',
      false,
    );
    fireEvent.change(guaranteeNonNullable(milestoneInput), {
      target: { value: 'EOD' },
    });
    fireEvent.click(renderResult.getByRole('button', { name: 'Apply' }));

    await waitFor(() =>
      expect(queryBuilderState.watermarkState.watermark).toBeInstanceOf(
        QueryBuilderDataDNSWatermark,
      ),
    );
    const dataDNSWatermark = guaranteeType(
      queryBuilderState.watermarkState.watermark,
      QueryBuilderDataDNSWatermark,
    );
    expect(dataDNSWatermark.env).toBe('PROD');
    expect(dataDNSWatermark.registryUri).toBe('mySynonymRegistry');
    // the class has no business date, so the date is the one the user gave
    expect(dataDNSWatermark.date instanceof VariableExpression).toBe(false);
    expect(
      guaranteeType(dataDNSWatermark.date, PrimitiveInstanceValue).values[0],
    ).toBe('2026-08-31');
    expect(dataDNSWatermark.milestone).toBe('EOD');
  },
);

describe(
  integrationTest('Data DNS watermark date is the business date of the query'),
  () => {
    const setUp = async (
      businessDate: string | undefined,
    ): Promise<{
      renderResult: RenderResult;
      queryBuilderState: QueryBuilderState;
    }> => {
      const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
        TEST_MilestoningModel,
        stub_RawLambda(),
        'my::map',
        'my::runtime',
        TEST_DATA__ModelCoverageAnalysisResult_Milestoning,
      );
      await act(async () => {
        queryBuilderState.initializeWithQuery(
          create_RawLambda(
            TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndBusinessTemporalTarget.parameters,
            TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndBusinessTemporalTarget.body,
          ),
        );
        if (businessDate) {
          // give the business date parameter a fixed value, as the milestoning section does
          const value = new PrimitiveInstanceValue(
            GenericTypeExplicitReference.create(
              new GenericType(PrimitiveType.STRICTDATE),
            ),
          );
          value.values = [businessDate];
          const businessDateParameter = guaranteeType(
            queryBuilderState.milestoningState.businessDate,
            VariableExpression,
          );
          guaranteeNonNullable(
            queryBuilderState.parametersState.parameterStates.find(
              (parameterState) =>
                parameterState.parameter.name === businessDateParameter.name,
            ),
          ).setValue(value);
        }
      });
      expect(queryBuilderState.isQuerySupported).toBe(true);
      return { renderResult, queryBuilderState };
    };

    const openDataDNSWatermark = async (
      renderResult: RenderResult,
    ): Promise<{
      dataDNSEditor: HTMLElement;
      registryInput: HTMLInputElement;
    }> => {
      fireEvent.click(
        await waitFor(() =>
          renderResult.getByRole('button', { name: /Query Options/ }),
        ),
      );
      fireEvent.click(
        await waitFor(() =>
          renderResult.getByRole('button', { name: 'Enable Watermark' }),
        ),
      );
      fireEvent.click(
        await waitFor(() =>
          renderResult.getByRole('button', { name: 'Data DNS Watermark' }),
        ),
      );
      const dataDNSEditor = await renderResult.findByTestId(
        'query-builder__result-modifier__data-dns-watermark',
      );
      return {
        dataDNSEditor,
        registryInput: getByTestId<HTMLInputElement>(
          dataDNSEditor,
          'query-builder__result-modifier__data-dns-watermark__registry-uri',
        ),
      };
    };

    test('shows the business date as the date of the watermark', async () => {
      const { renderResult } = await setUp('2021-11-12');
      const { dataDNSEditor } = await openDataDNSWatermark(renderResult);
      // the business date is the `businessDate` parameter of the query, which is displayed, not edited
      const businessDate = getByTestId(
        dataDNSEditor,
        'query-builder__result-modifier__data-dns-watermark__business-date',
      );
      expect(getByText(businessDate, 'businessDate')).not.toBeNull();
      expect(businessDate.getElementsByTagName('input')).toHaveLength(0);
      expect(
        businessDate.querySelector('.value-spec-editor__variable__reset-btn'),
      ).toBeNull();
    });

    test('uses the business date as it is, without changing the parameter', async () => {
      // the default value of the business date is a function (now), which is a date-time
      const { renderResult, queryBuilderState } = await setUp(undefined);
      const { dataDNSEditor, registryInput } =
        await openDataDNSWatermark(renderResult);
      expect(
        queryByTestId(
          dataDNSEditor,
          'query-builder__result-modifier__data-dns-watermark__business-date',
        ),
      ).not.toBeNull();
      expect(
        renderResult.getByRole('button', { name: 'Business Date' }),
      ).toHaveProperty('disabled', false);
      fireEvent.change(registryInput, { target: { value: 'myRegistry' } });
      fireEvent.click(renderResult.getByRole('button', { name: 'Apply' }));

      const businessDate = guaranteeType(
        queryBuilderState.milestoningState.businessDate,
        VariableExpression,
      );
      // the parameter and its value are left as they are
      expect(businessDate.genericType?.value.rawType).toBe(PrimitiveType.DATE);
      expect(
        queryBuilderState.parametersState.parameterStates.find(
          (parameterState) =>
            parameterState.parameter.name === businessDate.name,
        )?.value?.genericType?.value.rawType,
      ).toBe(PrimitiveType.DATETIME);
      expect(queryBuilderState.watermarkState.isValid).toBe(true);
    });

    test('uses the business date of the query when building the query', async () => {
      const { renderResult, queryBuilderState } = await setUp('2021-11-12');
      const { registryInput } = await openDataDNSWatermark(renderResult);
      fireEvent.change(registryInput, { target: { value: 'myRegistry' } });
      fireEvent.click(renderResult.getByRole('button', { name: 'Apply' }));

      const watermark = guaranteeType(
        queryBuilderState.watermarkState.watermark,
        QueryBuilderDataDNSWatermark,
      );
      expect(watermark.date instanceof VariableExpression).toBe(true);
      const query = JSON.stringify(queryBuilderState.buildQuery().body);
      expect(query).toContain('forDataDNSWatermark');
      // the date is the business date parameter itself, so the watermark follows its value
      expect(query).toContain(
        JSON.stringify({ _type: 'var', name: 'businessDate' }),
      );
      // the parameter keeps the `Date` of any milestoned query
      expect(
        guaranteeType(
          queryBuilderState.milestoningState.businessDate,
          VariableExpression,
        ).genericType?.value.rawType,
      ).toBe(PrimitiveType.DATE);
    });

    test('keeps a date of the users own', async () => {
      const { renderResult, queryBuilderState } = await setUp('2021-11-12');
      const { registryInput } = await openDataDNSWatermark(renderResult);
      fireEvent.change(registryInput, { target: { value: 'myRegistry' } });
      fireEvent.click(
        renderResult.getByRole('button', { name: 'Custom Date' }),
      );
      await setDataDNSCustomDate(renderResult, '2021-11-13');
      fireEvent.click(renderResult.getByRole('button', { name: 'Apply' }));

      const watermark = guaranteeType(
        queryBuilderState.watermarkState.watermark,
        QueryBuilderDataDNSWatermark,
      );
      expect(watermark.date instanceof VariableExpression).toBe(false);
      expect(
        guaranteeType(watermark.date, PrimitiveInstanceValue).values[0],
      ).toBe('2021-11-13');
      expect(JSON.stringify(queryBuilderState.buildQuery().body)).toContain(
        JSON.stringify({ _type: 'strictDate', value: '2021-11-13' }),
      );
      // a date of its own leaves the business date parameter as the `Date` of any milestoned query
      expect(
        guaranteeType(
          queryBuilderState.milestoningState.businessDate,
          VariableExpression,
        ).genericType?.value.rawType,
      ).toBe(PrimitiveType.DATE);
    });

    test('switches back to the business date', async () => {
      const { renderResult } = await setUp('2021-11-12');
      await openDataDNSWatermark(renderResult);
      fireEvent.click(
        renderResult.getByRole('button', { name: 'Custom Date' }),
      );
      fireEvent.click(
        renderResult.getByRole('button', { name: 'Business Date' }),
      );
      const businessDate = await renderResult.findByTestId(
        'query-builder__result-modifier__data-dns-watermark__business-date',
      );
      expect(getByText(businessDate, 'businessDate')).not.toBeNull();
    });

    test('restores the business date, as the parameter of the query, on load', async () => {
      const { queryBuilderState } = await setUp('2021-11-12');
      const watermark = new QueryBuilderDataDNSWatermark();
      watermark.setRegistryUri('myRegistry');
      watermark.setDate(
        guaranteeType(
          queryBuilderState.milestoningState.businessDate,
          VariableExpression,
        ),
      );
      await act(async () =>
        queryBuilderState.watermarkState.setWatermark(watermark),
      );
      const lambda = queryBuilderState.buildQuery();

      await act(async () => queryBuilderState.initializeWithQuery(lambda));
      const loaded = guaranteeType(
        queryBuilderState.watermarkState.watermark,
        QueryBuilderDataDNSWatermark,
      );
      expect(loaded.date instanceof VariableExpression).toBe(true);
      expect(queryBuilderState.watermarkState.isValid).toBe(true);
    });

    test('loads a date of its own as a date of its own, even when it is the business date', async () => {
      const { queryBuilderState } = await setUp('2021-11-12');
      const watermark = new QueryBuilderDataDNSWatermark();
      watermark.setRegistryUri('myRegistry');
      watermark.setDate(buildDateValue('2021-11-12'));
      await act(async () =>
        queryBuilderState.watermarkState.setWatermark(watermark),
      );
      const lambda = queryBuilderState.buildQuery();

      await act(async () => queryBuilderState.initializeWithQuery(lambda));
      const loaded = guaranteeType(
        queryBuilderState.watermarkState.watermark,
        QueryBuilderDataDNSWatermark,
      );
      expect(loaded.date instanceof VariableExpression).toBe(false);
      expect(guaranteeType(loaded.date, PrimitiveInstanceValue).values[0]).toBe(
        '2021-11-12',
      );
    });

    test('uses the business date parameter only in Business Date mode', async () => {
      const { queryBuilderState } = await setUp('2021-11-12');
      const businessDate = guaranteeType(
        queryBuilderState.milestoningState.businessDate,
        VariableExpression,
      );
      const watermarkState = queryBuilderState.watermarkState;
      expect(watermarkState.isVariableUsed(businessDate)).toBe(false);

      const watermark = new QueryBuilderDataDNSWatermark();
      watermark.setRegistryUri('myRegistry');
      watermark.setDate(businessDate);
      await act(async () => watermarkState.setWatermark(watermark));
      expect(watermarkState.isVariableUsed(businessDate)).toBe(true);
      // the milestoning state does not have to be the one that reports it
      expect(
        queryBuilderState.isVariableUsed(businessDate, {
          exculdeMilestoningState: true,
        }),
      ).toBe(true);

      await act(async () => {
        watermark.setDate(buildDateValue('2021-11-13'));
      });
      expect(watermarkState.isVariableUsed(businessDate)).toBe(false);
    });

    test('loads a date-time literal as a date of its own', async () => {
      const { queryBuilderState } = await setUp('2021-11-12');
      const watermark = new QueryBuilderDataDNSWatermark();
      watermark.setRegistryUri('myRegistry');
      watermark.setDate(
        buildDateValue('2021-11-13T10:30:00', PrimitiveType.DATETIME),
      );
      await act(async () =>
        queryBuilderState.watermarkState.setWatermark(watermark),
      );
      const lambda = queryBuilderState.buildQuery();

      await act(async () => queryBuilderState.initializeWithQuery(lambda));
      const loaded = guaranteeType(
        queryBuilderState.watermarkState.watermark,
        QueryBuilderDataDNSWatermark,
      );
      expect(loaded.date instanceof VariableExpression).toBe(false);
      const loadedDate = guaranteeType(loaded.date, PrimitiveInstanceValue);
      expect(loadedDate.genericType.value.rawType).toBe(PrimitiveType.DATETIME);
      expect(loadedDate.values[0]).toBe('2021-11-13T10:30:00');
      expect(queryBuilderState.watermarkState.isValid).toBe(true);
    });

    test('is invalid without a date of its own', async () => {
      const { queryBuilderState } = await setUp('2021-11-12');
      const watermark = new QueryBuilderDataDNSWatermark();
      watermark.setRegistryUri('myRegistry');
      await act(async () =>
        queryBuilderState.watermarkState.setWatermark(watermark),
      );
      expect(queryBuilderState.watermarkState.isValid).toBe(false);
      expect(queryBuilderState.canBuildQuery).toBe(false);
      expect(queryBuilderState.allValidationIssues).toContain(
        'Data DNS watermark is incomplete',
      );

      await act(async () => watermark.setDate(buildDateValue('2021-11-13')));
      expect(queryBuilderState.watermarkState.isValid).toBe(true);
    });

    test('is invalid when the business date stops being a date parameter', async () => {
      const { queryBuilderState } = await setUp('2021-11-12');
      const watermark = new QueryBuilderDataDNSWatermark();
      watermark.setRegistryUri('myRegistry');
      watermark.setDate(
        guaranteeType(
          queryBuilderState.milestoningState.businessDate,
          VariableExpression,
        ),
      );
      await act(async () =>
        queryBuilderState.watermarkState.setWatermark(watermark),
      );
      expect(queryBuilderState.watermarkState.isValid).toBe(true);
      expect(queryBuilderState.canBuildQuery).toBe(true);

      await act(async () =>
        queryBuilderState.milestoningState.setAllVersions(true),
      );
      expect(queryBuilderState.watermarkState.isValid).toBe(false);
      expect(queryBuilderState.canBuildQuery).toBe(false);
      expect(queryBuilderState.allValidationIssues).toContain(
        'Data DNS watermark uses the business date, which must be a date parameter',
      );

      // the query is not built with a date parameter that is no longer the business date
      expect(() => queryBuilderState.buildQuery()).toThrow(
        `Can't build forDataDNSWatermark() expression: the date parameter 'businessDate' is not the business date of the query`,
      );

      // a date of the user's own does not depend on the business date
      await act(async () => {
        watermark.setDate(buildDateValue('2021-11-13'));
      });
      expect(queryBuilderState.watermarkState.isValid).toBe(true);
    });
  },
);

test(
  integrationTest(
    'Query builder holds one watermark at a time: setting one replaces the other',
  ),
  async () => {
    const { queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__ComplexRelationalModel,
      stub_RawLambda(),
      'model::relational::tests::simpleRelationalMapping',
      'model::MyRuntime',
      TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
    );
    const watermarkState = queryBuilderState.watermarkState;
    expect(watermarkState.isEnabled).toBe(false);

    const standardWatermark = new QueryBuilderStandardWatermark(
      watermarkState.getDefaultValue(),
    );
    await act(async () => watermarkState.setWatermark(standardWatermark));
    expect(watermarkState.watermark).toBe(standardWatermark);

    const dataDNSWatermark = new QueryBuilderDataDNSWatermark();
    await act(async () => watermarkState.setWatermark(dataDNSWatermark));
    expect(watermarkState.watermark).toBe(dataDNSWatermark);
    expect(watermarkState.isEnabled).toBe(true);

    await act(async () => watermarkState.setWatermark(undefined));
    expect(watermarkState.isEnabled).toBe(false);
  },
);
