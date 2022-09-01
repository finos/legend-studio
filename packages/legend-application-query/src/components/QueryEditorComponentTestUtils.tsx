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
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import {
  type TEMPORARY__JestMock,
  MOBX__disableSpyOrMock,
  MOBX__enableSpyOrMock,
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
} from '@finos/legend-application';
import { TEST__getTestLegendQueryApplicationConfig } from '../stores/QueryEditorStoreTestUtils.js';
import { LegendQueryPluginManager } from '../application/LegendQueryPluginManager.js';
import { ExistingQueryEditor } from './QueryEditor.js';
import { generateExistingQueryEditorRoute } from '../stores/LegendQueryRouter.js';
import { QUERY_BUILDER_TEST_ID } from './query-builder/QueryBuilder_TestID.js';
import type { Entity } from '@finos/legend-storage';
import { ExistingQueryEditorStore } from '../stores/QueryEditorStore.js';
import { LegendQueryBaseStoreProvider } from './LegendQueryBaseStoreProvider.js';
import type { LegendQueryApplicationStore } from '../stores/LegendQueryBaseStore.js';

export const TEST__LegendQueryBaseStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <LegendQueryBaseStoreProvider
    pluginManager={LegendQueryPluginManager.create()}
  >
    {children}
  </LegendQueryBaseStoreProvider>
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
      pluginManager,
      TEST_QUERY_ID,
    );
  const MOCK__QueryEditorStoreProvider = require('./QueryEditorStoreProvider.js'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
  MOCK__QueryEditorStoreProvider.useQueryEditorStore = jest.fn();
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
): Promise<RenderResult> => {
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

  await MOCK__editorStore.graphManagerState.initializeSystem();
  await MOCK__editorStore.graphManagerState.graphManager.buildGraph(
    MOCK__editorStore.graphManagerState.graph,
    entities,
    MOCK__editorStore.graphManagerState.graphBuildState,
  );

  const query = new Query();
  query.name = lightQuery.name;
  query.id = lightQuery.id;
  query.versionId = lightQuery.versionId;
  query.groupId = lightQuery.groupId;
  query.artifactId = lightQuery.artifactId;
  query.owner = lightQuery.owner;
  query.isCurrentUserQuery = lightQuery.isCurrentUserQuery;
  query.mapping = PackageableElementExplicitReference.create(
    MOCK__editorStore.graphManagerState.graph.getMapping(mappingPath),
  );
  query.runtime = PackageableElementExplicitReference.create(
    MOCK__editorStore.graphManagerState.graph.getRuntime(runtimePath),
  );
  query.content = 'some content';

  MOBX__enableSpyOrMock();
  jest
    .spyOn(MOCK__editorStore.depotServerClient, 'getProject')
    .mockResolvedValue(projectData);
  jest
    .spyOn(MOCK__editorStore.graphManagerState.graphManager, 'getLightQuery')
    .mockResolvedValue(lightQuery);
  jest
    .spyOn(MOCK__editorStore.graphManagerState.graphManager, 'pureCodeToLambda')
    .mockResolvedValue(new RawLambda(lambda.parameters, lambda.body));
  jest
    .spyOn(MOCK__editorStore.graphManagerState.graphManager, 'getQuery')
    .mockResolvedValue(query);
  if (rawMappingModelCoverageAnalysisResult) {
    jest
      .spyOn(
        MOCK__editorStore.graphManagerState.graphManager,
        'analyzeMappingModelCoverage',
      )
      .mockResolvedValue(
        MOCK__editorStore.graphManagerState.graphManager.buildMappingModelCoverageAnalysisResult(
          rawMappingModelCoverageAnalysisResult,
        ),
      );
  }
  MOCK__editorStore.buildGraph = jest.fn<TEMPORARY__JestMock>();
  MOCK__editorStore.graphManagerState.graphManager.initialize =
    jest.fn<TEMPORARY__JestMock>();
  MOBX__disableSpyOrMock();

  const history = createMemoryHistory({
    initialEntries: [generateExistingQueryEditorRoute(lightQuery.id)],
  });
  const navigator = new WebApplicationNavigator(history);
  MOCK__editorStore.applicationStore.navigator = navigator;
  TEST__provideMockedWebApplicationNavigator({ mock: navigator });

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
  return renderResult;
};
