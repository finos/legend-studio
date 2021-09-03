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

import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import {
  MOBX__disableSpyOrMock,
  MOBX__enableSpyOrMock,
} from '@finos/legend-shared';
import type { GraphManagerState } from '@finos/legend-graph';
import {
  Query,
  LightQuery,
  RawLambda,
  PackageableElementExplicitReference,
  TEST__getTestGraphManagerState,
  TEST__GraphManagerStateProvider,
} from '@finos/legend-graph';
import type { DepotServerClient } from '@finos/legend-server-depot';
import {
  TEST__DepotServerClientProvider,
  TEST__getTestDepotServerClient,
} from '@finos/legend-server-depot';
import type { ApplicationStore } from '@finos/legend-application';
import {
  TEST__ApplicationStoreProvider,
  TEST__getTestApplicationStore,
  WebApplicationNavigator,
} from '@finos/legend-application';
import { QueryStore } from '../stores/QueryStore';
import { TEST__getTestQueryConfig } from '../stores/QueryStoreTestUtils';
import { QueryStoreProvider } from './QueryStoreProvider';
import { QueryPluginManager } from '../application/QueryPluginManager';
import { ExistingQueryLoader } from './QueryEditor';
import { generateExistingQueryRoute } from '../stores/LegendQueryRouter';
import { flowResult } from 'mobx';
import { QUERY_BUILDER_TEST_ID } from './QueryBuilder_TestID';
import type { QueryConfig } from '../application/QueryConfig';
import type { Entity } from '@finos/legend-model-storage';

// const TEST_DATA__simpleModelEntities = [
//   {
//     path: 'model::Person',
//     content: {
//       _type: 'class',
//       name: 'Person',
//       package: 'model',
//       properties: [
//         {
//           multiplicity: {
//             lowerBound: 1,
//             upperBound: 1,
//           },
//           name: 'name',
//           type: 'String',
//         },
//       ],
//     },
//     classifierPath: 'meta::pure::metamodel::type::Class',
//   },
//   {
//     path: 'model::MyMapping',
//     content: {
//       _type: 'mapping',
//       classMappings: [
//         {
//           _type: 'pureInstance',
//           class: 'model::Person',
//           propertyMappings: [
//             {
//               _type: 'purePropertyMapping',
//               property: {
//                 class: 'model::Person',
//                 property: 'name',
//               },
//               source: '',
//               transform: {
//                 _type: 'lambda',
//                 body: [
//                   {
//                     _type: 'property',
//                     parameters: [
//                       {
//                         _type: 'var',
//                         name: 'src',
//                       },
//                     ],
//                     property: 'name',
//                   },
//                 ],
//                 parameters: [],
//               },
//             },
//           ],
//           root: true,
//           srcClass: 'model::Person',
//         },
//       ],
//       enumerationMappings: [],
//       includedMappings: [],
//       name: 'MyMapping',
//       package: 'model',
//       tests: [],
//     },
//     classifierPath: 'meta::pure::mapping::Mapping',
//   },
//   {
//     path: 'model::MyRuntime',
//     content: {
//       _type: 'runtime',
//       name: 'MyRuntime',
//       package: 'model',
//       runtimeValue: {
//         _type: 'engineRuntime',
//         connections: [
//           {
//             store: {
//               path: 'ModelStore',
//               type: 'STORE',
//             },
//             storeConnections: [
//               {
//                 connection: {
//                   _type: 'JsonModelConnection',
//                   class: 'model::Person',
//                   url: 'data:application/json,%7B%7D',
//                 },
//                 id: 'connection_1',
//               },
//             ],
//           },
//         ],
//         mappings: [
//           {
//             path: 'model::MyMapping',
//             type: 'MAPPING',
//           },
//         ],
//       },
//     },
//     classifierPath: 'meta::pure::runtime::PackageableRuntime',
//   },
// ];

// const TEST_DATA__simpleQuery = {
//   _type: 'lambda',
//   body: [
//     {
//       _type: 'func',
//       function: 'getAll',
//       parameters: [
//         {
//           _type: 'packageableElementPtr',
//           fullPath: 'model::Person',
//         },
//       ],
//     },
//   ],
//   parameters: [],
// };

// const TEST_DATA__simpleQueryGrammarText = 'model::Person.all()';

export const TEST__QueryStoreProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => (
  <QueryStoreProvider pluginManager={QueryPluginManager.create()}>
    {children}
  </QueryStoreProvider>
);

export const TEST__provideMockedQueryStore = (customization?: {
  mock?: QueryStore;
  applicationStore?: ApplicationStore<QueryConfig>;
  depotServerClient?: DepotServerClient;
  graphManagerState?: GraphManagerState;
  pluginManager?: QueryPluginManager;
}): QueryStore => {
  const value =
    customization?.mock ??
    new QueryStore(
      customization?.applicationStore ??
        TEST__getTestApplicationStore(TEST__getTestQueryConfig()),
      customization?.depotServerClient ?? TEST__getTestDepotServerClient(),
      customization?.graphManagerState ??
        TEST__getTestGraphManagerState(customization?.pluginManager),
      customization?.pluginManager ?? QueryPluginManager.create(),
    );
  const MockedQueryStoreProvider = require('./QueryStoreProvider'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
  MockedQueryStoreProvider.useQueryStore = jest.fn();
  MockedQueryStoreProvider.useQueryStore.mockReturnValue(value);
  return value;
};

export const TEST__setUpQueryEditor = async (
  mockedQueryStore: QueryStore,
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

  await flowResult(mockedQueryStore.graphManagerState.initializeSystem());
  await flowResult(
    mockedQueryStore.graphManagerState.graphManager.buildGraph(
      mockedQueryStore.graphManagerState.graph,
      entities,
    ),
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
  mockedQueryStore.applicationStore.navigator = new WebApplicationNavigator(
    history,
  );

  const renderResult = render(
    <Router history={history}>
      <TEST__ApplicationStoreProvider config={TEST__getTestQueryConfig()}>
        <TEST__DepotServerClientProvider>
          <TEST__GraphManagerStateProvider>
            <TEST__QueryStoreProvider>
              <ExistingQueryLoader />
            </TEST__QueryStoreProvider>
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
