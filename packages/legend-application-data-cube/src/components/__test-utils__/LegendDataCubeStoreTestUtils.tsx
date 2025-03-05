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

import { type RenderResult, render, waitFor } from '@testing-library/react';
import { type AbstractPlugin, type AbstractPreset } from '@finos/legend-shared';
import { createMock } from '@finos/legend-shared/test';
import {
  ApplicationStore,
  ApplicationStoreProvider,
} from '@finos/legend-application';
import { LegendDataCubePluginManager } from '../../application/LegendDataCubePluginManager.js';
import { Core_LegendDataCubeApplicationPlugin } from '../../application/Core_LegendDataCubeApplicationPlugin.js';
import { TEST__getTestLegendDataCubeApplicationConfig } from '../../application/__test-utils__/LegendDataCubeApplicationTestUtils.js';
import {
  type LegendDataCubeBuilderState,
  LegendDataCubeBuilderStore,
} from '../../stores/builder/LegendDataCubeBuilderStore.js';
import {
  type LegendDataCubeApplicationStore,
  LegendDataCubeBaseStore,
} from '../../stores/LegendDataCubeBaseStore.js';
import { TEST__BrowserEnvironmentProvider } from '@finos/legend-application/test';
import { LegendDataCubeFrameworkProvider } from '../LegendDataCubeFrameworkProvider.js';
import { Route, Routes } from '@finos/legend-application/browser';
import { LEGEND_DATA_CUBE_ROUTE_PATTERN } from '../../__lib__/LegendDataCubeNavigation.js';
import { LegendDataCubeBuilder } from '../builder/LegendDataCubeBuilder.js';
import { LEGEND_DATACUBE_TEST_ID } from '@finos/legend-data-cube';

export const TEST_QUERY_NAME = 'MyTestQuery';

export const TEST__provideMockedLegendDataCubeBuilderStore = (customization?: {
  mock?: LegendDataCubeBuilderStore;
  applicationStore?: LegendDataCubeApplicationStore;
  pluginManager?: LegendDataCubePluginManager;
  extraPlugins?: AbstractPlugin[];
  extraPresets?: AbstractPreset[];
}): LegendDataCubeBuilderStore => {
  const pluginManager =
    customization?.pluginManager ?? LegendDataCubePluginManager.create();
  pluginManager
    .usePlugins([
      new Core_LegendDataCubeApplicationPlugin(),
      ...(customization?.extraPlugins ?? []),
    ])
    .usePresets([...(customization?.extraPresets ?? [])])
    .install();
  const applicationStore =
    customization?.applicationStore ??
    new ApplicationStore(
      TEST__getTestLegendDataCubeApplicationConfig(),
      pluginManager,
    );
  const baseStore = new LegendDataCubeBaseStore(applicationStore);
  const value =
    customization?.mock ?? new LegendDataCubeBuilderStore(baseStore);
  const MOCK__LegendDataCubeBuilderStoreProvider = require('../builder/LegendDataCubeBuilderStoreProvider.js'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
  MOCK__LegendDataCubeBuilderStoreProvider.useLegendDataCubeBuilderStore =
    createMock();
  MOCK__LegendDataCubeBuilderStoreProvider.useLegendDataCubeBuilderStore.mockReturnValue(
    value,
  );
  return value;
};

export const TEST__setUpDataCubeBuilder = async (
  MOCK__builderStore: LegendDataCubeBuilderStore,
  // lambda: RawLambda,
  // mappingPath: string,
  // runtimePath: string,
  // rawMappingModelCoverageAnalysisResult?: RawMappingModelCoverageAnalysisResult,
): Promise<{
  renderResult: RenderResult;
  legendDataCubeBuilderState: LegendDataCubeBuilderState | undefined;
}> => {
  const graphManager = MOCK__builderStore.graphManager;

  await graphManager.initialize({
    env: 'test',
    tabSize: 2,
    clientConfig: {},
  });

  // createSpy(
  //   MOCK__builderStore.depotServerClient,
  //   'getProject',
  // ).mockResolvedValue(projectData);
  // createSpy(
  //   MOCK__builderStore.depotServerClient,
  //   'getEntities',
  // ).mockResolvedValue(entities);
  // createSpy(graphManager.graphManager, 'getLightQuery').mockResolvedValue(
  //   lightQuery,
  // );
  // createSpy(graphManager.graphManager, 'getQueryInfo').mockResolvedValue(
  //   queryInfo,
  // );
  // createSpy(
  //   graphManager.graphManager,
  //   'pureCodeToLambda',
  // ).mockResolvedValue(new RawLambda(lambda.parameters, lambda.body));
  // createSpy(graphManager.graphManager, 'getQuery').mockResolvedValue(
  //   query,
  // );

  const renderResult = render(
    <ApplicationStoreProvider store={MOCK__builderStore.application}>
      <TEST__BrowserEnvironmentProvider initialEntries={['/datacube']}>
        <LegendDataCubeFrameworkProvider>
          <Routes>
            <Route
              path={LEGEND_DATA_CUBE_ROUTE_PATTERN.BUILDER}
              element={<LegendDataCubeBuilder />}
            />
          </Routes>
        </LegendDataCubeFrameworkProvider>
      </TEST__BrowserEnvironmentProvider>
    </ApplicationStoreProvider>,
  );
  await waitFor(() =>
    renderResult.getByTestId(LEGEND_DATACUBE_TEST_ID.PLACEHOLDER),
  );

  return {
    renderResult,
    legendDataCubeBuilderState: MOCK__builderStore.builder,
  };
};
