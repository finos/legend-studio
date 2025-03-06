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
  PersistentDataCube,
  type V1_ExecuteInput,
  type V1_LambdaReturnTypeInput,
  V1_Query,
  type V1_RawLambda,
  V1_serializePureModelContext,
} from '@finos/legend-graph';
import depotEntities from '../__tests__/TEST_DATA__DSL_DataSpace_Entities.json' with { type: 'json' };
import { DSL_DataSpace_GraphManagerPreset } from '@finos/legend-extension-dsl-data-space/graph';
import {
  ENGINE_TEST_SUPPORT__execute,
  ENGINE_TEST_SUPPORT__getLambdaRelationType,
  ENGINE_TEST_SUPPORT__grammarToJSON_lambda,
  ENGINE_TEST_SUPPORT__grammarToJSON_valueSpecification,
} from '@finos/legend-graph/test';

export const TEST_QUERY_NAME = 'MyTestQuery';

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
  dataCubeId?: string,
): Promise<{
  renderResult: RenderResult;
  legendDataCubeBuilderState: LegendDataCubeBuilderState | undefined;
}> => {
  if (dataCubeId) {
    createSpy(MOCK__builderStore.graphManager, 'getDataCube').mockResolvedValue(
      PersistentDataCube.serialization.fromJson({
        id: dataCubeId,
        name: dataCubeId,
        description: undefined,
        content: {
          query: `select(~[Id, 'Case Type'])`,
          source: {
            queryId: `${dataCubeId}-query-id`,
            _type: 'legendQuery',
          },
        },
      }),
    );
    createSpy(
      MOCK__builderStore.graphManager.engine,
      'getQuery',
    ).mockResolvedValue(
      V1_Query.serialization.fromJson({
        name: `${dataCubeId}-query-name`,
        id: `${dataCubeId}-query-id`,
        versionId: 'latest',
        groupId: 'com.legend',
        artifactId: 'test-project',
        content: `|domain::COVIDData.all()->project(~[Id:x|$x.id, 'Case Type':x|$x.caseType])`,
        executionContext: {
          dataSpacePath: 'domain::COVIDDatapace',
          executionKey: 'dummyContext',
          _type: 'dataSpaceExecutionContext',
        },
      }),
    );
    createSpy(
      MOCK__builderStore.depotServerClient,
      'getVersionEntities',
    ).mockResolvedValue(depotEntities);
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
      'lambdaRelationType',
    ).mockImplementation(
      async (input: PlainObject<V1_LambdaReturnTypeInput>) => {
        const pmcd =
          await MOCK__builderStore.graphManager.entitiesToPureModelContextData(
            depotEntities,
          );
        return ENGINE_TEST_SUPPORT__getLambdaRelationType(
          input.lambda as PlainObject<V1_RawLambda>,
          V1_serializePureModelContext(pmcd),
        );
      },
    );
    // const executionInput = MOCK__builderStore.graphManager.createExecutionInput(
    //   queryBuilderState.graphManagerState.graph,
    //   guaranteeNonNullable(queryBuilderState.executionContextState.mapping),
    //   queryBuilderState.resultState.buildExecutionRawLambda(),
    //   guaranteeNonNullable(queryBuilderState.executionContextState.runtimeValue),
    //   V1_PureGraphManager.DEV_PROTOCOL_VERSION,
    //   parameterValues,
    // );
    // const executionResult = await ENGINE_TEST_SUPPORT__execute(executionInput);
    // createSpy(
    //   queryBuilderState.graphManagerState.graphManager,
    //   'runQuery',
    // ).mockResolvedValue({
    //   executionResult: V1_buildExecutionResult(
    //     V1_deserializeExecutionResult(executionResult),
    //   ),
    // });
    createSpy(
      MOCK__builderStore.engineServerClient,
      'runQuery',
    ).mockImplementation((input: PlainObject<V1_ExecuteInput>) =>
      ENGINE_TEST_SUPPORT__execute(input as unknown as V1_ExecuteInput),
    );
  }

  const renderResult = render(
    <ApplicationStoreProvider store={MOCK__builderStore.application}>
      <TEST__BrowserEnvironmentProvider
        initialEntries={[dataCubeId ? `/${dataCubeId}` : '/']}
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
