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

import { jest } from '@jest/globals';
import { type RenderResult, render, waitFor } from '@testing-library/react';
import { Log } from '@finos/legend-shared';
import {
  type RawMappingModelCoverageAnalysisResult,
  type RawLambda,
  GraphManagerState,
  PackageableElementExplicitReference,
  RuntimePointer,
} from '@finos/legend-graph';
import {
  TEST__ApplicationStoreProvider,
  TEST__getGenericApplicationConfig,
  TEST__LegendApplicationPluginManager,
  TEST__provideMockedApplicationStore,
  WebApplicationNavigator,
  TEST__provideMockedWebApplicationNavigator,
  LegendApplicationComponentFrameworkProvider,
  Router,
  createMemoryHistory,
} from '@finos/legend-application';
import type { Entity } from '@finos/legend-storage';
import { QueryBuilder } from './QueryBuilder.js';
import {
  type QueryBuilderState,
  INTERNAL__BasicQueryBuilderState,
} from '../stores/QueryBuilderState.js';
import { QueryBuilder_GraphManagerPreset } from '../graphManager/QueryBuilder_GraphManagerPreset.js';
import { QUERY_BUILDER_TEST_ID } from './QueryBuilder_TestID.js';

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
  const graphManagerState = new GraphManagerState(pluginManager, new Log());
  await graphManagerState.initializeSystem();
  await graphManagerState.graphManager.buildGraph(
    graphManagerState.graph,
    entities,
    graphManagerState.graphBuildState,
  );
  const applicationStore = TEST__provideMockedApplicationStore(
    TEST__getGenericApplicationConfig(),
    pluginManager,
  );

  const queryBuilderState = new INTERNAL__BasicQueryBuilderState(
    applicationStore,
    graphManagerState,
  );
  queryBuilderState.setMapping(graphManagerState.graph.getMapping(mappingPath));
  queryBuilderState.setRuntimeValue(
    new RuntimePointer(
      PackageableElementExplicitReference.create(
        graphManagerState.graph.getRuntime(runtimePath),
      ),
    ),
  );

  if (rawMappingModelCoverageAnalysisResult) {
    jest
      .spyOn(graphManagerState.graphManager, 'analyzeMappingModelCoverage')
      .mockReturnValue(
        Promise.resolve(
          graphManagerState.graphManager.buildMappingModelCoverageAnalysisResult(
            rawMappingModelCoverageAnalysisResult,
          ),
        ),
      );
  }

  const history = createMemoryHistory();
  const navigator = new WebApplicationNavigator(history);
  applicationStore.navigator = navigator;
  TEST__provideMockedWebApplicationNavigator({ mock: navigator });

  const renderResult = render(
    <Router history={history}>
      <TEST__ApplicationStoreProvider
        config={TEST__getGenericApplicationConfig()}
        pluginManager={pluginManager}
      >
        <LegendApplicationComponentFrameworkProvider>
          <QueryBuilder queryBuilderState={queryBuilderState} />
        </LegendApplicationComponentFrameworkProvider>
      </TEST__ApplicationStoreProvider>
    </Router>,
  );

  await waitFor(() =>
    renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER),
  );

  return {
    renderResult,
    queryBuilderState,
  };
};
