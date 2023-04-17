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
import { createSpy, LogService } from '@finos/legend-shared';
import {
  type RawMappingModelCoverageAnalysisResult,
  type RawLambda,
  GraphManagerState,
  PackageableElementExplicitReference,
  RuntimePointer,
} from '@finos/legend-graph';
import {
  ApplicationStoreProvider,
  TEST__BrowserEnvironmentProvider,
  ApplicationFrameworkProvider,
  ApplicationStore,
} from '@finos/legend-application';
import type { Entity } from '@finos/legend-storage';
import { QueryBuilder } from '../QueryBuilder.js';
import {
  type QueryBuilderState,
  INTERNAL__BasicQueryBuilderState,
} from '../../stores/QueryBuilderState.js';
import { QueryBuilder_GraphManagerPreset } from '../../graphManager/QueryBuilder_GraphManagerPreset.js';
import { QUERY_BUILDER_TEST_ID } from '../../application/QueryBuilderTesting.js';
import {
  TEST__LegendApplicationPluginManager,
  TEST__getGenericApplicationConfig,
} from '../../stores/__test-utils__/QueryBuilderStateTestUtils.js';

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
  const MOCK__pluginManager = TEST__LegendApplicationPluginManager.create();
  MOCK__pluginManager.usePresets([
    new QueryBuilder_GraphManagerPreset(),
  ]).install();
  const graphManagerState = new GraphManagerState(
    MOCK__pluginManager,
    new LogService(),
  );

  await graphManagerState.initializeSystem();
  await graphManagerState.graphManager.buildGraph(
    graphManagerState.graph,
    entities,
    graphManagerState.graphBuildState,
  );

  const MOCK__applicationStore = new ApplicationStore(
    TEST__getGenericApplicationConfig(),
    MOCK__pluginManager,
  );

  const queryBuilderState = new INTERNAL__BasicQueryBuilderState(
    MOCK__applicationStore,
    graphManagerState,
  );
  const mapping = graphManagerState.graph.getMapping(mappingPath);
  queryBuilderState.setMapping(mapping);
  queryBuilderState.setRuntimeValue(
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
      <TEST__BrowserEnvironmentProvider>
        <ApplicationFrameworkProvider>
          <QueryBuilder queryBuilderState={queryBuilderState} />
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
