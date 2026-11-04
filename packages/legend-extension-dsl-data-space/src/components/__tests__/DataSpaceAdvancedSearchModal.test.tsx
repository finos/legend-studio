/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { describe, expect, jest, test } from '@jest/globals';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { when } from 'mobx';
import { ApplicationStoreProvider } from '@finos/legend-application';
import { BrowserPlatform } from '@finos/legend-application/browser';
import { integrationTest } from '@finos/legend-shared/test';
import type { PlainObject } from '@finos/legend-shared';
import type { DepotServerClient } from '@finos/legend-server-depot';
import type { V1_DataSpaceAnalysisResult } from '../../graph-manager/index.js';
import { DataSpaceAdvancedSearchState } from '../../stores/query/DataSpaceAdvancedSearchState.js';
import { ResolvedDataSpaceEntityWithOrigin } from '../../stores/shared/DataSpaceInfo.js';
import { DataSpaceAdvancedSearchModal } from '../query-builder/DataSpaceAdvancedSearchModal.js';
import {
  TEST__getDataSpaceGraphManagerState,
  TEST_DATA_SPACE_ARTIFACT_ID,
  TEST_DATA_SPACE_GROUP_ID,
  TEST_DATA_SPACE_VERSION_ID,
} from '../__test-utils__/DataSpaceViewerTestUtils.js';
import TEST_DATA__relationExecutable from './TEST_DATA__DataSpaceViewer__RelationExecutable.json' with { type: 'json' };

(global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
  jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

// Legend Query is served under a base URL, e.g. `https://<host>/query/`
const TEST_QUERY_BASE_URL = '/query';

/**
 * Opens the data space search on the fixture's data space, as Legend Query
 * opens it from a query on that data space, with the depot serving its
 * analytics; returns the spies on where the application goes next, in the
 * same tab and in a new one
 */
const openDataSpaceSearch = async (
  V1_analysisResult: PlainObject<V1_DataSpaceAnalysisResult>,
): Promise<{
  goToLocation: jest.Mock;
  visitAddress: jest.Mock;
}> => {
  const { applicationStore, graphManagerState } =
    await TEST__getDataSpaceGraphManagerState();
  // the browser platform's navigator resolves locations against the base URL
  // NOTE: it replaces the application's navigator, so spy after this
  await applicationStore.initialize(
    new BrowserPlatform(applicationStore, {
      navigate: () => undefined,
      baseUrl: TEST_QUERY_BASE_URL,
    }),
  );
  const goToLocation = jest
    .spyOn(applicationStore.navigationService.navigator, 'goToLocation')
    .mockImplementation(() => undefined);
  const visitAddress = jest
    .spyOn(applicationStore.navigationService.navigator, 'visitAddress')
    .mockImplementation(() => undefined);
  const depotServerClient = {
    getEntitiesByClassifier: jest
      .fn<DepotServerClient['getEntitiesByClassifier']>()
      .mockResolvedValue([]),
    getProject: jest.fn<DepotServerClient['getProject']>().mockResolvedValue({
      projectId: 'PROD-1',
      groupId: TEST_DATA_SPACE_GROUP_ID,
      artifactId: TEST_DATA_SPACE_ARTIFACT_ID,
    }),
    getGenerationContentByPath: jest
      .fn<DepotServerClient['getGenerationContentByPath']>()
      .mockResolvedValue(JSON.stringify(V1_analysisResult)),
  } as unknown as DepotServerClient;
  const searchState = new DataSpaceAdvancedSearchState(
    applicationStore,
    graphManagerState,
    depotServerClient,
    {
      viewProject: () => undefined,
      viewSDLCProject: async () => undefined,
    },
    new ResolvedDataSpaceEntityWithOrigin(
      {
        groupId: TEST_DATA_SPACE_GROUP_ID,
        artifactId: TEST_DATA_SPACE_ARTIFACT_ID,
        versionId: TEST_DATA_SPACE_VERSION_ID,
      },
      V1_analysisResult.title as string | undefined,
      V1_analysisResult.name as string,
      V1_analysisResult.path as string,
      V1_analysisResult.defaultExecutionContext as string | undefined,
    ),
  );
  await act(async () => {
    render(
      <ApplicationStoreProvider store={applicationStore}>
        <DataSpaceAdvancedSearchModal
          searchState={searchState}
          onClose={() => undefined}
        />
      </ApplicationStoreProvider>,
    );
  });
  // the dialog loads the data space it opens on, then shows it
  await act(async () => {
    await when(() => searchState.loadDataSpaceState.hasCompleted);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(searchState.loadDataSpaceState.hasSucceeded).toBe(true);
  return {
    goToLocation: goToLocation as unknown as jest.Mock,
    visitAddress: visitAddress as unknown as jest.Mock,
  };
};

describe(integrationTest('DataSpaceAdvancedSearchModal'), () => {
  test('Run Query creates a query on the data space, in its default execution context', async () => {
    const { goToLocation } = await openDataSpaceSearch(
      TEST_DATA__relationExecutable as PlainObject<V1_DataSpaceAnalysisResult>,
    );

    fireEvent.click(await screen.findByTitle('Run Query'));

    expect(goToLocation).toHaveBeenCalledTimes(1);
    expect(goToLocation).toHaveBeenCalledWith(
      '/extensions/dataspace/test.group:test-artifact:0.0.0/test::domain::RelationExecutableDataProduct/default',
    );
  });

  test('Run Query creates a query in the execution context picked from its menu', async () => {
    const [defaultContext] = TEST_DATA__relationExecutable.executionContexts;
    const { goToLocation } = await openDataSpaceSearch({
      ...TEST_DATA__relationExecutable,
      executionContexts: [
        defaultContext,
        { ...defaultContext, name: 'secondary' },
      ],
    } as PlainObject<V1_DataSpaceAnalysisResult>);

    fireEvent.click(
      await screen.findByTitle(/^Run Query in another execution context/u),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'secondary' }));
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());

    expect(goToLocation).toHaveBeenCalledTimes(1);
    expect(goToLocation).toHaveBeenCalledWith(
      '/extensions/dataspace/test.group:test-artifact:0.0.0/test::domain::RelationExecutableDataProduct/secondary',
    );
  });

  test('Open in Query on a service executable opens the service query in Legend Query, under its base URL', async () => {
    const [relationExecutable] = TEST_DATA__relationExecutable.executables;
    const { visitAddress } = await openDataSpaceSearch({
      ...TEST_DATA__relationExecutable,
      executables: [
        {
          ...relationExecutable,
          title: 'Firm employees',
          executable: 'test::service::FirmEmployees',
          info: {
            _type: 'service',
            executionContextKey: 'default',
            pattern: '/firm/employees',
            query: '|test::domain::MyClass.all()->project(~[id, name])',
            datasets: [],
          },
        },
      ],
    } as PlainObject<V1_DataSpaceAnalysisResult>);

    fireEvent.click(await screen.findByRole('button', { name: 'Query' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Open in Query' }),
    );

    expect(visitAddress).toHaveBeenCalledTimes(1);
    expect(visitAddress).toHaveBeenCalledWith(
      `${window.location.origin}${TEST_QUERY_BASE_URL}/create-from-service/test.group:test-artifact:0.0.0/test::service::FirmEmployees`,
    );
  });
});
