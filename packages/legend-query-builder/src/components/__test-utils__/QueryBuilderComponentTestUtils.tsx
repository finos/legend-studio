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

import {
  type RenderResult,
  render,
  waitFor,
  fireEvent,
  findByText,
  getByText,
  getByDisplayValue,
  findByDisplayValue,
  getByRole,
} from '@testing-library/react';
import { LogService, guaranteeNonNullable } from '@finos/legend-shared';
import { createSpy } from '@finos/legend-shared/test';
import {
  type RawMappingModelCoverageAnalysisResult,
  type RawLambda,
  GraphManagerState,
  PackageableElementExplicitReference,
  RuntimePointer,
} from '@finos/legend-graph';
import {
  ApplicationStoreProvider,
  ApplicationFrameworkProvider,
  ApplicationStore,
} from '@finos/legend-application';
import { TEST__BrowserEnvironmentProvider } from '@finos/legend-application/test';
import type { Entity } from '@finos/legend-storage';
import { QueryBuilder } from '../QueryBuilder.js';
import {
  type QueryBuilderState,
  INTERNAL__BasicQueryBuilderState,
} from '../../stores/QueryBuilderState.js';
import { QueryBuilder_GraphManagerPreset } from '../../graph-manager/QueryBuilder_GraphManagerPreset.js';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import {
  TEST__LegendApplicationPluginManager,
  TEST__getGenericApplicationConfig,
} from '../../stores/__test-utils__/QueryBuilderStateTestUtils.js';
import { STYLE_PREFIX, STYLE_PREFIX__DARK } from '@finos/legend-art';
import { expect } from '@jest/globals';
import { QueryBuilderAdvancedWorkflowState } from '../../stores/query-workflow/QueryBuilderWorkFlowState.js';
import { Route, Routes } from '@finos/legend-application/browser';

const getSelectorContainerClassName = (lightMode?: boolean): string =>
  '.' + `${lightMode ? STYLE_PREFIX : STYLE_PREFIX__DARK}__value-container`;

const getSelectorInputClassName = (lightMode?: boolean): string =>
  '.' + `${lightMode ? STYLE_PREFIX : STYLE_PREFIX__DARK}__single-value`;

export const selectFromCustomSelectorInput = (
  selectorContainer: HTMLElement,
  optionText: string,
  lightMode?: boolean,
): void => {
  const selectorContainerClassName = getSelectorContainerClassName(lightMode);
  const selectorInputValue = getSelectorInputClassName(lightMode);

  let foundOptionText = false;
  const selector = selectorContainer.querySelector(
    selectorContainerClassName,
  ) as HTMLSelectElement;

  // be careful that the first option in the dropdown has been selected
  fireEvent.keyDown(selector, { key: 'ArrowDown' });
  fireEvent.keyDown(selector, { key: 'Enter' });
  expect(selector.querySelector(selectorInputValue)).not.toBeNull();
  const firstOptionValue = guaranteeNonNullable(
    selector.querySelector(selectorInputValue),
  ).textContent;
  let currentOptionValue = firstOptionValue;
  let numofPress = 1;

  // Since the selector value can't be directly changed to the desired option value through fireEvent.change(),
  // we need to repeatedly press the ArrowDown key to select it. However, each time we restart this process,
  // it starts from the beginning of the dropdown list, creating a circular pattern.
  // To prevent a loop, we must keep track of the number of times we press the key to select other options
  // and ensure we don't return to the initial option.
  while (
    (!foundOptionText && currentOptionValue !== firstOptionValue) ||
    numofPress === 1
  ) {
    for (let i = 0; i < numofPress + 1; i++) {
      fireEvent.keyDown(selector, { key: 'ArrowDown' });
    }
    fireEvent.keyDown(selector, { key: 'Enter' });
    expect(selector.querySelector(selectorInputValue)).not.toBeNull();
    currentOptionValue = guaranteeNonNullable(
      selector.querySelector(selectorInputValue),
    ).textContent;
    if (currentOptionValue === optionText) {
      foundOptionText = true;
    }
    numofPress++;
  }
  if (!foundOptionText) {
    throw new Error(
      `The option is unavailable in the selector dropdown. Kindly review the input: ${optionText}`,
    );
  }
};

export const selectFirstOptionFromCustomSelectorInput = (
  selectorContainer: HTMLElement,
  lightMode?: boolean,
  verifyInputValue?: boolean,
): void => {
  const selectorContainerClassName = getSelectorContainerClassName(lightMode);
  const selectorInputValue = getSelectorInputClassName(lightMode);

  const selector = selectorContainer.querySelector(
    selectorContainerClassName,
  ) as HTMLSelectElement;

  fireEvent.keyDown(selector, { key: 'ArrowDown' });
  fireEvent.keyDown(selector, { key: 'Enter' });
  if (verifyInputValue ?? true) {
    expect(selector.querySelector(selectorInputValue)).not.toBeNull();
  }
};

export const getCustomSelectorInputValue = (
  selectorContainer: HTMLElement,
  lightMode?: boolean,
): string | null => {
  const selectorContainerClassName = getSelectorContainerClassName(lightMode);
  const selectorInputValue = getSelectorInputClassName(lightMode);

  const selector = guaranteeNonNullable(
    selectorContainer.querySelector(selectorContainerClassName),
  ) as HTMLSelectElement;
  const selectorInput = guaranteeNonNullable(
    selector.querySelector(selectorInputValue),
  );
  return selectorInput.textContent;
};

export const dragAndDrop = async (
  source: HTMLElement,
  drop: HTMLElement,
  panel: HTMLElement,
  draggingHoverText?: string,
): Promise<void> => {
  fireEvent.dragStart(source);
  fireEvent.dragEnter(drop);
  fireEvent.dragOver(drop);
  if (draggingHoverText) {
    await findByText(panel, draggingHoverText);
    fireEvent.drop(getByText(panel, draggingHoverText));
  } else {
    fireEvent.dragOver(drop);
  }
};

export const setDerivedPropertyValue = async (
  derivedPropertyButton: HTMLElement,
  value: string,
  renderResult: RenderResult,
  options?: {
    currentDisplayValue?: string;
  },
): Promise<void> => {
  fireEvent.click(derivedPropertyButton);
  const dpModal = await renderResult.findByRole('dialog');
  await findByText(dpModal, 'Derived Property');
  fireEvent.change(
    getByDisplayValue(dpModal, options?.currentDisplayValue ?? ''),
    {
      target: { value },
    },
  );
  await findByDisplayValue(dpModal, value);
  fireEvent.click(getByRole(dpModal, 'button', { name: 'Done' }));
  await waitFor(() => expect(renderResult.queryByRole('dialog')).toBeNull());
};

export const TEST__setUpQueryBuilder = async (
  entities: Entity[],
  lambda: RawLambda,
  mappingPath: string,
  runtimePath: string,
  rawMappingModelCoverageAnalysisResult?: RawMappingModelCoverageAnalysisResult,
): Promise<{
  renderResult: RenderResult;
  queryBuilderState: QueryBuilderState;
}> => {
  const pluginManager = TEST__LegendApplicationPluginManager.create();
  pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();
  const graphManagerState = new GraphManagerState(
    pluginManager,
    new LogService(),
  );

  await graphManagerState.graphManager.initialize({
    env: 'test',
    tabSize: 2,
    clientConfig: {},
  });
  await graphManagerState.initializeSystem();
  await graphManagerState.graphManager.buildGraph(
    graphManagerState.graph,
    entities,
    graphManagerState.graphBuildState,
  );

  const MOCK__applicationStore = new ApplicationStore(
    TEST__getGenericApplicationConfig(),
    pluginManager,
  );

  const queryBuilderState = new INTERNAL__BasicQueryBuilderState(
    MOCK__applicationStore,
    graphManagerState,
    QueryBuilderAdvancedWorkflowState.INSTANCE,
    undefined,
  );
  const mapping = graphManagerState.graph.getMapping(mappingPath);
  queryBuilderState.executionContextState.setMapping(mapping);
  queryBuilderState.executionContextState.setRuntimeValue(
    new RuntimePointer(
      PackageableElementExplicitReference.create(
        graphManagerState.graph.getRuntime(runtimePath),
      ),
    ),
  );

  if (rawMappingModelCoverageAnalysisResult) {
    createSpy(
      graphManagerState.graphManager,
      'analyzeMappingModelCoverage',
    ).mockResolvedValue(
      graphManagerState.graphManager.buildMappingModelCoverageAnalysisResult(
        rawMappingModelCoverageAnalysisResult,
        mapping,
      ),
    );
  }

  const renderResult = render(
    <ApplicationStoreProvider store={MOCK__applicationStore}>
      <TEST__BrowserEnvironmentProvider initialEntries={['/']}>
        <ApplicationFrameworkProvider>
          <Routes>
            <Route
              path="*"
              element={<QueryBuilder queryBuilderState={queryBuilderState} />}
            />
          </Routes>
        </ApplicationFrameworkProvider>
      </TEST__BrowserEnvironmentProvider>
    </ApplicationStoreProvider>,
  );

  await waitFor(() =>
    renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER),
  );

  return {
    renderResult,
    queryBuilderState,
  };
};
