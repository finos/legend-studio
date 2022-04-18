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
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import {
  MOBX__disableSpyOrMock,
  MOBX__enableSpyOrMock,
} from '@finos/legend-shared';
import {
  type GraphManagerState,
  Query,
  LightQuery,
  RawLambda,
  PackageableElementExplicitReference,
  TEST__getTestGraphManagerState,
  TEST__GraphManagerStateProvider,
} from '@finos/legend-graph';
import {
  type DepotServerClient,
  TEST__DepotServerClientProvider,
  TEST__getTestDepotServerClient,
} from '@finos/legend-server-depot';
import {
  type ApplicationStore,
  TEST__provideMockedWebApplicationNavigator,
  TEST__ApplicationStoreProvider,
  TEST__getTestApplicationStore,
  WebApplicationNavigator,
} from '@finos/legend-application';
import { LegendQueryStore } from '../stores/LegendQueryStore';
import { TEST__getTestQueryConfig } from '../stores/QueryStoreTestUtils';
import { LegendQueryStoreProvider } from './LegendQueryStoreProvider';
import { LegendQueryPluginManager } from '../application/LegendQueryPluginManager';
import { ExistingQueryLoader } from './QueryEditor';
import { generateExistingQueryRoute } from '../stores/LegendQueryRouter';
import { QUERY_BUILDER_TEST_ID } from './QueryBuilder_TestID';
import type { LegendQueryConfig } from '../application/LegendQueryConfig';
import type { Entity } from '@finos/legend-model-storage';

export const TEST__LegendQueryStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <LegendQueryStoreProvider pluginManager={LegendQueryPluginManager.create()}>
    {children}
  </LegendQueryStoreProvider>
);

export const TEST__provideMockedLegendQueryStore = (customization?: {
  mock?: LegendQueryStore;
  applicationStore?: ApplicationStore<LegendQueryConfig>;
  depotServerClient?: DepotServerClient;
  graphManagerState?: GraphManagerState;
  pluginManager?: LegendQueryPluginManager;
}): LegendQueryStore => {
  const pluginManager =
    customization?.pluginManager ?? LegendQueryPluginManager.create();
  const value =
    customization?.mock ??
    new LegendQueryStore(
      customization?.applicationStore ??
        TEST__getTestApplicationStore(
          TEST__getTestQueryConfig(),
          pluginManager,
        ),
      customization?.depotServerClient ?? TEST__getTestDepotServerClient(),
      customization?.graphManagerState ??
        TEST__getTestGraphManagerState(customization?.pluginManager),
      pluginManager,
    );
  const MockedQueryStoreProvider = require('./LegendQueryStoreProvider'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
  MockedQueryStoreProvider.useLegendQueryStore = jest.fn();
  MockedQueryStoreProvider.useLegendQueryStore.mockReturnValue(value);
  return value;
};

export const TEST__setUpQueryEditor = async (
  mockedQueryStore: LegendQueryStore,
  entities: Entity[],
  lambda: RawLambda,
  mappingPath: string,
  runtimePath: string,
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
  lightQuery.id = 'test-query';
  lightQuery.versionId = '0.0.0';
  lightQuery.groupId = 'test.group';
  lightQuery.artifactId = 'test-artifact';
  lightQuery.owner = 'test-artifact';
  lightQuery.isCurrentUserQuery = true;

  await mockedQueryStore.graphManagerState.initializeSystem();
  await mockedQueryStore.graphManagerState.graphManager.buildGraph(
    mockedQueryStore.graphManagerState.graph,
    entities,
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
    mockedQueryStore.graphManagerState.graph.getMapping(mappingPath),
  );
  query.runtime = PackageableElementExplicitReference.create(
    mockedQueryStore.graphManagerState.graph.getRuntime(runtimePath),
  );
  query.content = 'some content';

  MOBX__enableSpyOrMock();
  jest
    .spyOn(mockedQueryStore.depotServerClient, 'getProject')
    .mockResolvedValue(projectData);
  jest
    .spyOn(mockedQueryStore.graphManagerState.graphManager, 'getLightQuery')
    .mockResolvedValue(lightQuery);
  jest
    .spyOn(mockedQueryStore.graphManagerState.graphManager, 'pureCodeToLambda')
    .mockResolvedValue(new RawLambda(lambda.parameters, lambda.body));
  jest
    .spyOn(mockedQueryStore.graphManagerState.graphManager, 'getQuery')
    .mockResolvedValue(query);

  mockedQueryStore.buildGraph = jest.fn();
  // TODO: we need to think of how we will mock these calls when we modularize
  mockedQueryStore.graphManagerState.graphManager.initialize = jest.fn();
  MOBX__disableSpyOrMock();

  const history = createMemoryHistory({
    initialEntries: [generateExistingQueryRoute(lightQuery.id)],
  });
  const navigator = new WebApplicationNavigator(history);
  mockedQueryStore.applicationStore.navigator = navigator;
  TEST__provideMockedWebApplicationNavigator({ mock: navigator });

  const renderResult = render(
    <Router history={history}>
      <TEST__ApplicationStoreProvider
        config={TEST__getTestQueryConfig()}
        pluginManager={LegendQueryPluginManager.create()}
      >
        <TEST__DepotServerClientProvider>
          <TEST__GraphManagerStateProvider>
            <TEST__LegendQueryStoreProvider>
              <ExistingQueryLoader />
            </TEST__LegendQueryStoreProvider>
          </TEST__GraphManagerStateProvider>
        </TEST__DepotServerClientProvider>
      </TEST__ApplicationStoreProvider>
    </Router>,
  );
  await waitFor(() =>
    renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER),
  );
  return renderResult;
};
