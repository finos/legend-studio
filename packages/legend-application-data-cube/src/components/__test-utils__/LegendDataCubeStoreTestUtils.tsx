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
import {
  type AbstractPlugin,
  type AbstractPreset,
  type PlainObject,
} from '@finos/legend-shared';
import { createMock, createSpy } from '@finos/legend-shared/test';
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
import { Core_LegendDataCube_LegendApplicationPlugin } from '../../application/Core_LegendDataCube_LegendApplicationPlugin.js';
import {
  type PersistentDataCube,
  type V1_LambdaReturnTypeInput,
  type V1_Query,
  type V1_RawLambda,
  type V1_ValueSpecification,
  V1_entitiesToPureModelContextData,
  V1_ExecuteInput,
  V1_PureModelContextData,
  V1_serializePureModelContext,
} from '@finos/legend-graph';
import { DSL_DataSpace_GraphManagerPreset } from '@finos/legend-extension-dsl-data-space/graph';
import {
  ENGINE_TEST_SUPPORT__execute,
  ENGINE_TEST_SUPPORT__getLambdaRelationType,
  ENGINE_TEST_SUPPORT__getLambdaReturnType,
  ENGINE_TEST_SUPPORT__grammarToJSON_lambda,
  ENGINE_TEST_SUPPORT__grammarToJSON_valueSpecification,
  ENGINE_TEST_SUPPORT__JSONToGrammar_valueSpecification,
  ENGINE_TEST_SUPPORT__transformTdsToRelation_lambda,
} from '@finos/legend-graph/test';
import type { Entity } from '@finos/legend-storage';

export const TEST__provideMockedLegendDataCubeBaseStore =
  async (customization?: {
    mock?: LegendDataCubeBaseStore | undefined;
    applicationStore?: LegendDataCubeApplicationStore | undefined;
    pluginManager?: LegendDataCubePluginManager | undefined;
    extraPlugins?: AbstractPlugin[] | undefined;
    extraPresets?: AbstractPreset[] | undefined;
  }): Promise<LegendDataCubeBaseStore> => {
    const pluginManager =
      customization?.pluginManager ?? LegendDataCubePluginManager.create();
    pluginManager
      .usePlugins([
        new Core_LegendDataCube_LegendApplicationPlugin(),
        new Core_LegendDataCubeApplicationPlugin(),
        ...(customization?.extraPlugins ?? []),
      ])
      .usePresets([
        new DSL_DataSpace_GraphManagerPreset(),
        ...(customization?.extraPresets ?? []),
      ])
      .install();
    const applicationStore =
      customization?.applicationStore ??
      new ApplicationStore(
        TEST__getTestLegendDataCubeApplicationConfig(),
        pluginManager,
      );
    const value =
      customization?.mock ?? new LegendDataCubeBaseStore(applicationStore);
    await value.initialize();
    const MOCK__LegendDataCubeBaseStoreProvider = require('../LegendDataCubeFrameworkProvider.js'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
    MOCK__LegendDataCubeBaseStoreProvider.useLegendDataCubeBaseStore =
      createMock();
    MOCK__LegendDataCubeBaseStoreProvider.useLegendDataCubeBaseStore.mockReturnValue(
      value,
    );
    return value;
  };

export const TEST__provideMockedLegendDataCubeBuilderStore =
  async (customization?: {
    mock?: LegendDataCubeBuilderStore;
    mockBaseStore?: LegendDataCubeBaseStore;
    applicationStore?: LegendDataCubeApplicationStore;
    pluginManager?: LegendDataCubePluginManager;
    extraPlugins?: AbstractPlugin[];
    extraPresets?: AbstractPreset[];
  }): Promise<LegendDataCubeBuilderStore> => {
    const value =
      customization?.mock ??
      new LegendDataCubeBuilderStore(
        await TEST__provideMockedLegendDataCubeBaseStore({
          mock: customization?.mockBaseStore,
          applicationStore: customization?.applicationStore,
          pluginManager: customization?.pluginManager,
          extraPlugins: customization?.extraPlugins,
          extraPresets: customization?.extraPresets,
        }),
      );
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
  mockDataCube?: PersistentDataCube,
  mockQuery?: V1_Query,
  mockEntities?: PlainObject<Entity>[],
): Promise<{
  renderResult: RenderResult;
  legendDataCubeBuilderState: LegendDataCubeBuilderState | undefined;
}> => {
  if (mockDataCube) {
    createSpy(MOCK__builderStore.graphManager, 'getDataCube').mockResolvedValue(
      mockDataCube,
    );
  }
  if (mockQuery) {
    createSpy(
      MOCK__builderStore.graphManager.engine,
      'getQuery',
    ).mockResolvedValue(mockQuery);
  }
  if (mockEntities) {
    const pmcd = new V1_PureModelContextData();
    await V1_entitiesToPureModelContextData(
      mockEntities as unknown as Entity[],
      pmcd,
      MOCK__builderStore.application.pluginManager.getPureProtocolProcessorPlugins(),
      undefined,
      undefined,
    );
    createSpy(
      MOCK__builderStore.depotServerClient,
      'getVersionEntities',
    ).mockResolvedValue(mockEntities);
    createSpy(
      MOCK__builderStore.engineServerClient,
      'lambdaReturnType',
    ).mockImplementation(
      async (input: PlainObject<V1_LambdaReturnTypeInput>) => {
        return ENGINE_TEST_SUPPORT__getLambdaReturnType(
          input.lambda as PlainObject<V1_RawLambda>,
          V1_serializePureModelContext(pmcd),
        );
      },
    );
    createSpy(
      MOCK__builderStore.engineServerClient,
      'lambdaRelationType',
    ).mockImplementation(
      async (input: PlainObject<V1_LambdaReturnTypeInput>) => {
        return ENGINE_TEST_SUPPORT__getLambdaRelationType(
          input.lambda as PlainObject<V1_RawLambda>,
          V1_serializePureModelContext(pmcd),
        );
      },
    );
    createSpy(
      MOCK__builderStore.engineServerClient,
      'transformTdsToRelation_lambda',
    ).mockImplementation(
      async (input: PlainObject<V1_LambdaReturnTypeInput>) => {
        return ENGINE_TEST_SUPPORT__transformTdsToRelation_lambda(
          input.lambda as PlainObject<V1_RawLambda>,
          V1_serializePureModelContext(pmcd),
        );
      },
    );
    createSpy(
      MOCK__builderStore.engineServerClient,
      'runQuery',
    ).mockImplementation(async (input: PlainObject<V1_ExecuteInput>) => {
      const executeInput = V1_ExecuteInput.serialization.fromJson(input);
      executeInput.model = pmcd;
      return ENGINE_TEST_SUPPORT__execute(executeInput);
    });
  }
  createSpy(
    MOCK__builderStore.engineServerClient,
    'grammarToJSON_lambda',
  ).mockImplementation(async (input: string) =>
    ENGINE_TEST_SUPPORT__grammarToJSON_lambda(input),
  );
  createSpy(
    MOCK__builderStore.engineServerClient,
    'grammarToJSON_valueSpecification',
  ).mockImplementation(async (input: string) =>
    ENGINE_TEST_SUPPORT__grammarToJSON_valueSpecification(input),
  );
  createSpy(
    MOCK__builderStore.engineServerClient,
    'JSONToGrammar_valueSpecification',
  ).mockImplementation(async (input: PlainObject<V1_ValueSpecification>) =>
    ENGINE_TEST_SUPPORT__JSONToGrammar_valueSpecification(input),
  );

  const renderResult = render(
    <ApplicationStoreProvider store={MOCK__builderStore.application}>
      <TEST__BrowserEnvironmentProvider
        initialEntries={[mockDataCube?.id ? `/${mockDataCube.id}` : '/']}
      >
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
