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
import { guaranteeNonNullable } from '@finos/legend-shared';
import { createMock, createSpy } from '@finos/legend-shared/test';
import {
  type GraphManagerState,
  Query,
  LightQuery,
  RawLambda,
  PackageableElementExplicitReference,
  type RawMappingModelCoverageAnalysisResult,
  QueryExplicitExecutionContext,
} from '@finos/legend-graph';
import { DepotServerClient } from '@finos/legend-server-depot';
import {
  ApplicationStoreProvider,
  ApplicationStore,
} from '@finos/legend-application';
import { TEST__getTestLegendQueryApplicationConfig } from '../../stores/__test-utils__/LegendQueryApplicationTestUtils.js';
import { LegendQueryPluginManager } from '../../application/LegendQueryPluginManager.js';
import { ExistingQueryEditor } from '../QueryEditor.js';
import type { Entity } from '@finos/legend-storage';
import { ExistingQueryEditorStore } from '../../stores/QueryEditorStore.js';
import type { LegendQueryApplicationStore } from '../../stores/LegendQueryBaseStore.js';
import {
  type QueryBuilderState,
  QUERY_BUILDER_TEST_ID,
} from '@finos/legend-query-builder';
import { LegendQueryFrameworkProvider } from '../LegendQueryFrameworkProvider.js';
import { TEST__BrowserEnvironmentProvider } from '@finos/legend-application/test';
import { Core_LegendQueryApplicationPlugin } from '../Core_LegendQueryApplicationPlugin.js';
import { Route, Routes } from '@finos/legend-application/browser';
import {
  generateExistingQueryEditorRoute,
  LEGEND_QUERY_ROUTE_PATTERN,
} from '../../__lib__/LegendQueryNavigation.js';

const TEST_QUERY_ID = 'test-query-id';
export const TEST_QUERY_NAME = 'MyTestQuery';

export const TEST__provideMockedQueryEditorStore = (customization?: {
  mock?: ExistingQueryEditorStore;
  applicationStore?: LegendQueryApplicationStore;
  graphManagerState?: GraphManagerState;
  pluginManager?: LegendQueryPluginManager;
}): ExistingQueryEditorStore => {
  const pluginManager =
    customization?.pluginManager ?? LegendQueryPluginManager.create();
  pluginManager.usePlugins([new Core_LegendQueryApplicationPlugin()]).install();
  const applicationStore =
    customization?.applicationStore ??
    new ApplicationStore(
      TEST__getTestLegendQueryApplicationConfig(),
      pluginManager,
    );
  const value =
    customization?.mock ??
    new ExistingQueryEditorStore(
      applicationStore,
      new DepotServerClient({
        serverUrl: applicationStore.config.depotServerUrl,
      }),
      TEST_QUERY_ID,
      undefined,
    );
  const MOCK__QueryEditorStoreProvider = require('../QueryEditorStoreProvider.js'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
  MOCK__QueryEditorStoreProvider.useQueryEditorStore = createMock();
  MOCK__QueryEditorStoreProvider.useQueryEditorStore.mockReturnValue(value);
  return value;
};

export const TEST__setUpQueryEditor = async (
  MOCK__editorStore: ExistingQueryEditorStore,
  entities: Entity[],
  lambda: RawLambda,
  mappingPath: string,
  runtimePath: string,
  rawMappingModelCoverageAnalysisResult?: RawMappingModelCoverageAnalysisResult,
): Promise<{
  renderResult: RenderResult;
  queryBuilderState: QueryBuilderState;
}> => {
  const projectData = {
    id: 'test-id',
    groupId: 'test.group',
    artifactId: 'test-artifact',
    projectId: 'test-project-id',
    versions: ['0.0.0'],
    latestVersion: '0.0.0',
  };

  const lightQuery = new LightQuery();
  lightQuery.name = TEST_QUERY_NAME;
  lightQuery.id = TEST_QUERY_ID;
  lightQuery.versionId = '0.0.0';
  lightQuery.groupId = 'test.group';
  lightQuery.artifactId = 'test-artifact';
  lightQuery.owner = 'test-artifact';
  lightQuery.isCurrentUserQuery = true;

  const graphManagerState = MOCK__editorStore.graphManagerState;

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

  const query = new Query();
  query.name = lightQuery.name;
  query.id = lightQuery.id;
  query.versionId = lightQuery.versionId;
  query.groupId = lightQuery.groupId;
  query.artifactId = lightQuery.artifactId;
  query.owner = lightQuery.owner;
  query.isCurrentUserQuery = lightQuery.isCurrentUserQuery;
  const _mapping = graphManagerState.graph.getMapping(mappingPath);
  const execContext = new QueryExplicitExecutionContext();
  execContext.mapping = PackageableElementExplicitReference.create(_mapping);
  execContext.runtime = PackageableElementExplicitReference.create(
    graphManagerState.graph.getRuntime(runtimePath),
  );
  query.executionContext = execContext;
  query.content = 'some content';
  createSpy(
    MOCK__editorStore.depotServerClient,
    'getProject',
  ).mockResolvedValue(projectData);
  createSpy(graphManagerState.graphManager, 'getLightQuery').mockResolvedValue(
    lightQuery,
  );
  createSpy(
    graphManagerState.graphManager,
    'pureCodeToLambda',
  ).mockResolvedValue(new RawLambda(lambda.parameters, lambda.body));
  createSpy(graphManagerState.graphManager, 'getQuery').mockResolvedValue(
    query,
  );
  if (rawMappingModelCoverageAnalysisResult) {
    createSpy(
      graphManagerState.graphManager,
      'analyzeMappingModelCoverage',
    ).mockResolvedValue(
      graphManagerState.graphManager.buildMappingModelCoverageAnalysisResult(
        rawMappingModelCoverageAnalysisResult,
        _mapping,
      ),
    );
  }

  MOCK__editorStore.buildGraph = createMock();
  graphManagerState.graphManager.initialize = createMock();

  const renderResult = render(
    <ApplicationStoreProvider store={MOCK__editorStore.applicationStore}>
      <TEST__BrowserEnvironmentProvider
        initialEntries={[generateExistingQueryEditorRoute(lightQuery.id)]}
      >
        <LegendQueryFrameworkProvider>
          <Routes>
            <Route
              path={LEGEND_QUERY_ROUTE_PATTERN.EDIT_EXISTING_QUERY}
              element={<ExistingQueryEditor />}
            />
          </Routes>
        </LegendQueryFrameworkProvider>
      </TEST__BrowserEnvironmentProvider>
    </ApplicationStoreProvider>,
  );
  await waitFor(() =>
    renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER),
  );

  return {
    renderResult,
    queryBuilderState: guaranteeNonNullable(
      MOCK__editorStore.queryBuilderState,
      `Query builder state should have been initialized`,
    ),
  };
};
