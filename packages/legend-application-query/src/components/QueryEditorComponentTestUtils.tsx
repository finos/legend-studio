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
  guaranteeNonNullable,
  createMock,
  createSpy,
  type Writable,
} from '@finos/legend-shared';
import {
  type GraphManagerState,
  Query,
  LightQuery,
  RawLambda,
  PackageableElementExplicitReference,
  type RawMappingModelCoverageAnalysisResult,
} from '@finos/legend-graph';
import {
  type DepotServerClient,
  TEST__DepotServerClientProvider,
  TEST__getTestDepotServerClient,
} from '@finos/legend-server-depot';
import {
  TEST__provideMockedWebApplicationNavigator,
  TEST__ApplicationStoreProvider,
  WebApplicationNavigator,
  TEST__getTestApplicationStore,
  Router,
  createMemoryHistory,
  type GenericLegendApplicationStore,
} from '@finos/legend-application';
import { TEST__getTestLegendQueryApplicationConfig } from '../stores/QueryEditorStoreTestUtils.js';
import { LegendQueryPluginManager } from '../application/LegendQueryPluginManager.js';
import { ExistingQueryEditor } from './QueryEditor.js';
import { generateExistingQueryEditorRoute } from '../stores/LegendQueryRouter.js';
import type { Entity } from '@finos/legend-storage';
import { ExistingQueryEditorStore } from '../stores/QueryEditorStore.js';
import { LegendQueryBaseStoreProvider } from './LegendQueryBaseStoreProvider.js';
import type { LegendQueryApplicationStore } from '../stores/LegendQueryBaseStore.js';
import {
  type QueryBuilderState,
  QUERY_BUILDER_TEST_ID,
} from '@finos/legend-query-builder';

export const TEST__LegendQueryBaseStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <LegendQueryBaseStoreProvider>{children}</LegendQueryBaseStoreProvider>
);

const TEST_QUERY_ID = 'test-query-id';

export const TEST__provideMockedQueryEditorStore = (customization?: {
  mock?: ExistingQueryEditorStore;
  applicationStore?: LegendQueryApplicationStore;
  depotServerClient?: DepotServerClient;
  graphManagerState?: GraphManagerState;
  pluginManager?: LegendQueryPluginManager;
}): ExistingQueryEditorStore => {
  const pluginManager =
    customization?.pluginManager ?? LegendQueryPluginManager.create();
  const value =
    customization?.mock ??
    new ExistingQueryEditorStore(
      customization?.applicationStore ??
        TEST__getTestApplicationStore(
          TEST__getTestLegendQueryApplicationConfig(),
          pluginManager,
        ),
      customization?.depotServerClient ?? TEST__getTestDepotServerClient(),
      TEST_QUERY_ID,
    );
  const MOCK__QueryEditorStoreProvider = require('./QueryEditorStoreProvider.js'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
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
  lightQuery.name = 'MyTestQuery';
  lightQuery.id = TEST_QUERY_ID;
  lightQuery.versionId = '0.0.0';
  lightQuery.groupId = 'test.group';
  lightQuery.artifactId = 'test-artifact';
  lightQuery.owner = 'test-artifact';
  lightQuery.isCurrentUserQuery = true;

  const graphManagerState = MOCK__editorStore.graphManagerState;
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
  query.mapping = PackageableElementExplicitReference.create(_mapping);
  query.runtime = PackageableElementExplicitReference.create(
    graphManagerState.graph.getRuntime(runtimePath),
  );
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

  const history = createMemoryHistory({
    initialEntries: [generateExistingQueryEditorRoute(lightQuery.id)],
  });
  const navigator = new WebApplicationNavigator(history);
  TEST__provideMockedWebApplicationNavigator({ mock: navigator });
  // TODO: this is not the proper way to do this, we prefer to mock and inject this when we
  // create the editor store, let's consider how we clean this up in the future
  (
    MOCK__editorStore.applicationStore as Writable<GenericLegendApplicationStore>
  ).navigator = navigator;

  const renderResult = render(
    <Router history={history}>
      <TEST__ApplicationStoreProvider
        config={TEST__getTestLegendQueryApplicationConfig()}
        pluginManager={LegendQueryPluginManager.create()}
      >
        <TEST__DepotServerClientProvider>
          <TEST__LegendQueryBaseStoreProvider>
            <ExistingQueryEditor />
          </TEST__LegendQueryBaseStoreProvider>
        </TEST__DepotServerClientProvider>
      </TEST__ApplicationStoreProvider>
    </Router>,
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
