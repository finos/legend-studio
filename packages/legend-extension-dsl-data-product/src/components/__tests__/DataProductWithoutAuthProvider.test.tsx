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

import { afterEach, describe, expect, jest, test } from '@jest/globals';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { type PlainObject, guaranteeNonNullable } from '@finos/legend-shared';
import type * as LegendApplication from '@finos/legend-application';
import {
  ApplicationFrameworkProvider,
  ApplicationStore,
  ApplicationStoreProvider,
} from '@finos/legend-application';
import {
  BrowserRouter,
  Route,
  Routes,
} from '@finos/legend-application/browser';
import { TEST__BrowserEnvironmentProvider } from '@finos/legend-application/test';
import {
  type V1_DataContract,
  type V1_EntitlementsDataProductDetails,
  type V1_LiteDataContract,
  type V1_TaskResponse,
  GraphManagerState,
  V1_AccessPointGroupReferenceType,
  V1_ContractState,
  V1_EnrichedUserApprovalStatus,
  V1_OrganizationalScopeType,
  V1_ResourceType,
  V1_UserType,
  V1_dataContractModelSchema,
  V1_transformDataContractToLiteDatacontract,
} from '@finos/legend-graph';
import { ENGINE_TEST_SUPPORT__getClassifierPathMapping } from '@finos/legend-graph/test';
import {
  type IngestDeploymentServerConfig,
  LakehouseContractServerClient,
} from '@finos/legend-server-lakehouse';
import { createSpy } from '@finos/legend-shared/test';
import { flowResult } from 'mobx';
import { serialize } from 'serializr';
import { ProductViewer } from '../ProductViewer.js';
import { DataAccessRequestViewer } from '../DataProduct/DataContract/DataAccessRequestViewer.js';
import { DataContractViewerState } from '../../stores/DataProduct/DataAccess/DataContractViewerState.js';
import {
  TEST__getDataProductDataAccessState,
  TEST__getDataProductViewerState,
  TEST__getGenericApplicationConfig,
  TEST__LegendApplicationPluginManager,
} from '../__test-utils__/StateTestUtils.js';
import {
  mockEntitlementsSDLCDataProduct,
  mockSDLCDataProduct,
} from '../__test-utils__/TEST_DATA__LakehouseDataProducts.js';
import {
  getMockCompletedTasksResponse,
  getMockPendingManagerApprovalTasksResponse,
  mockContracts,
} from '../__test-utils__/TEST_DATA__LakehouseDataContracts.js';

// NOTE: unlike the other tests of this package, these neither mock
// `react-oidc-context` nor render an `AuthProvider`: Legend Studio only mounts
// one when its ingest deployment has an OIDC config, and shows the data
// product Preview either way, so there `useAuth()` returns `undefined`.

jest.mock('swiper/react', () => ({
  Swiper: ({}) => <div></div>,
  SwiperSlide: ({}) => <div></div>,
}));

jest.mock('swiper/modules', () => ({
  Navigation: ({}) => <div></div>,
  Pagination: ({}) => <div></div>,
  Autoplay: ({}) => <div></div>,
}));

jest.mock('react-dnd', () => ({
  DndProvider: ({ children }: { children: React.ReactNode }) => children,
  useDrop: () => [{ isOver: false }, jest.fn()],
  useDrag: () => [{}, jest.fn()],
}));

jest.mock('@finos/legend-application', () => ({
  ...jest.requireActual<typeof LegendApplication>('@finos/legend-application'),
  useApplicationStore: jest.fn().mockReturnValue({
    layoutService: {
      TEMPORARY__isLightColorThemeEnabled: true,
    },
    pluginManager: {
      getApplicationPlugins: jest.fn().mockReturnValue([]),
    },
  }),
}));

(global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
  jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

(global as unknown as { ResizeObserver: unknown }).ResizeObserver = jest
  .fn()
  .mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

// what `useAuth()` of `react-oidc-context` warns when there is no `AuthProvider`
const NO_AUTH_PROVIDER_WARNING = 'AuthProvider context is undefined';

const TEST_USER = 'test-consumer-user-id';

const mockApprovedLiteContract: V1_LiteDataContract = {
  description: 'Test approved contract',
  guid: 'test-approved-contract-id',
  version: 0,
  state: V1_ContractState.COMPLETED,
  members: [],
  consumer: {
    _type: V1_OrganizationalScopeType.AdHocTeam,
    users: [{ name: TEST_USER, type: V1_UserType.WORKFORCE_USER }],
  },
  createdBy: 'test-user',
  createdAt: '2025-12-22T15:18:41.998+00:00',
  resourceId: 'MOCK_SDLC_DATAPRODUCT',
  resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
  deploymentId: 11111,
  accessPointGroup: 'GROUP1',
};

const mockApprovedDataContract: V1_DataContract = {
  description: 'Test approved contract',
  guid: 'test-approved-contract-id',
  version: 0,
  state: V1_ContractState.COMPLETED,
  members: [],
  consumer: {
    _type: V1_OrganizationalScopeType.AdHocTeam,
    users: [{ name: TEST_USER, type: V1_UserType.WORKFORCE_USER }],
  },
  createdBy: 'test-user',
  createdAt: '2025-12-22T15:18:41.998+00:00',
  resource: {
    _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
    accessPointGroup: 'GROUP1',
    dataProduct: {
      name: 'MOCK_SDLC_DATAPRODUCT',
      owner: { appDirId: 12345 },
    },
  },
};

const createdViewerStates: Awaited<
  ReturnType<typeof TEST__getDataProductViewerState>
>[] = [];

afterEach(() => {
  createdViewerStates
    .splice(0)
    .forEach((viewerState) =>
      viewerState.apgStates.forEach((apgState) =>
        apgState.stopPollingConsumerGrant(),
      ),
    );
  jest.restoreAllMocks();
});

const spyOnAuthProviderWarning = () =>
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);

const expectNoAuthProvider = (
  warnSpy: ReturnType<typeof spyOnAuthProviderWarning>,
): void =>
  expect(warnSpy).toHaveBeenCalledWith(
    expect.stringContaining(NO_AUTH_PROVIDER_WARNING),
  );

/**
 * Renders the product viewer as Legend Studio's data product Preview does,
 * with no `AuthProvider` around it; with `entitlementsDataProductDetails`, it
 * also renders the data access of the data product, as Marketplace does.
 */
const setupProductViewerWithoutAuthProvider = async (
  entitlementsDataProductDetails?: V1_EntitlementsDataProductDetails,
) => {
  // the subscriptions viewer fetches on the next animation frame
  jest
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation((callback: FrameRequestCallback) => {
      callback(performance.now());
      return 0;
    });
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

  const dataProductViewerState =
    await TEST__getDataProductViewerState(mockSDLCDataProduct);
  createdViewerStates.push(dataProductViewerState);
  const dataProductDataAccessState = entitlementsDataProductDetails
    ? TEST__getDataProductDataAccessState(
        dataProductViewerState,
        entitlementsDataProductDetails,
      )
    : undefined;
  dataProductViewerState.applicationStore.identityService.setCurrentUser(
    TEST_USER,
  );

  if (dataProductDataAccessState) {
    const contractServerClient =
      dataProductDataAccessState.lakehouseContractServerClient;
    createSpy(
      contractServerClient,
      'getDataContractsForDataProduct',
    ).mockResolvedValue({ dataContracts: [mockApprovedLiteContract] });
    createSpy(contractServerClient, 'getDataContract').mockResolvedValue({
      dataContracts: [{ dataContract: mockApprovedDataContract }],
    });
    createSpy(contractServerClient, 'getContractsForUser').mockResolvedValue([
      {
        contractResultLite: mockApprovedLiteContract,
        status: V1_EnrichedUserApprovalStatus.APPROVED,
        user: TEST_USER,
      },
    ]);
    createSpy(contractServerClient, 'getContractUserStatus').mockResolvedValue({
      status: V1_EnrichedUserApprovalStatus.APPROVED,
    });
    createSpy(contractServerClient, 'getContractTasks').mockResolvedValue(
      getMockCompletedTasksResponse() as unknown as PlainObject<V1_TaskResponse>,
    );
    createSpy(
      contractServerClient,
      'getConsumerGrantsByContractId',
    ).mockResolvedValue({
      contractId: mockApprovedLiteContract.guid,
      accessPointGroups: [],
      users: [
        {
          username: TEST_USER,
          contractId: mockApprovedLiteContract.guid,
          targetAccount: 'test-account',
        },
      ],
    });
    createSpy(
      contractServerClient,
      'getSubscriptionsForContract',
    ).mockResolvedValue([]);
    createSpy(contractServerClient, 'getOwnersForDid').mockResolvedValue({
      owners: ['owner1@example.com'],
    });
    const mockEnvironment: PlainObject<IngestDeploymentServerConfig> = {
      ingestEnvironmentUrn: 'test-production-env',
      environmentClassification: 'prod',
      ingestServerUrl: 'https://test-prod-ingest-server.com',
      environmentName: 'test-production-env',
    };
    createSpy(
      dataProductDataAccessState.lakehousePlatformServerClient,
      'findProducerServer',
    ).mockResolvedValue(mockEnvironment);
    const mockPlugin = dataProductDataAccessState.dataAccessPlugins[0];
    if (mockPlugin) {
      mockPlugin.handleDataProductOwnersResponse = jest.fn(
        (response: PlainObject<{ owners: string[] }>) =>
          response.owners as string[],
      );
    }
    createSpy(
      dataProductViewerState.depotServerClient,
      'getVersionEntities',
    ).mockResolvedValue([
      {
        path: mockSDLCDataProduct.path,
        content: mockSDLCDataProduct,
        classifierPath: 'meta::pure::metamodel::dataproduct::DataProduct',
      },
    ]);
  }

  createSpy(
    dataProductViewerState.engineServerClient,
    'batchLambdasRelationType',
  ).mockResolvedValue({
    result: Object.fromEntries(
      mockSDLCDataProduct.accessPointGroups.flatMap((apg) =>
        apg.accessPoints.map((ap) => [
          `${apg.id}::${ap.id}`,
          { _type: 'relationType', columns: [] },
        ]),
      ),
    ),
    errors: {},
  });
  createSpy(
    dataProductViewerState.engineServerClient,
    'getClassifierPathMap',
  ).mockImplementation(async () =>
    ENGINE_TEST_SUPPORT__getClassifierPathMapping(),
  );
  createSpy(
    dataProductViewerState.depotServerClient,
    'getGenerationFilesByType',
  ).mockResolvedValue([]);

  await act(async () => {
    const initPromise = flowResult(
      dataProductViewerState.init(entitlementsDataProductDetails),
    );
    await flowResult(dataProductDataAccessState?.init(() => undefined));
    render(
      <BrowserRouter>
        <ProductViewer
          productViewerState={dataProductViewerState}
          productDataAccessState={dataProductDataAccessState}
        />
      </BrowserRouter>,
    );
    await initPromise.catch(
      /* expected — artifact fetch has no mock data */ () => undefined,
    );
    await new Promise((resolve) => setTimeout(resolve, 0)); // wait for async state updates
  });

  return { dataProductViewerState, dataProductDataAccessState };
};

describe('Data product viewer without an AuthProvider', () => {
  test('Shows the data product Preview of Legend Studio, with no data access state', async () => {
    const warnSpy = spyOnAuthProviderWarning();
    await setupProductViewerWithoutAuthProvider();

    await screen.findByText('Mock SDLC Data Product');
    screen.getByText('Main Group Test');
    await screen.findByText('Customer Demographics');
    // with no data access state, access can't be requested
    const accessButton = screen.getByRole('button', { name: 'UNKNOWN' });
    expect(accessButton.hasAttribute('disabled')).toBe(true);
    expectNoAuthProvider(warnSpy);
  });

  test('Shows the data access of a data product with no token, and no creating subscriptions', async () => {
    const warnSpy = spyOnAuthProviderWarning();
    const { dataProductDataAccessState } =
      await setupProductViewerWithoutAuthProvider(
        mockEntitlementsSDLCDataProduct,
      );
    const contractServerClient = guaranteeNonNullable(
      dataProductDataAccessState,
    ).lakehouseContractServerClient;

    await screen.findByText('Main Group Test');
    await screen.findByText('ENTITLED');
    fireEvent.click(await screen.findByTitle('More options'));
    fireEvent.click(await screen.findByText('Manage Subscriptions'));
    await screen.findByText('Data Product Subscriptions');

    // the subscriptions still load, with no token
    await waitFor(() =>
      expect(
        contractServerClient.getSubscriptionsForContract,
      ).toHaveBeenCalledWith(mockApprovedLiteContract.guid, undefined),
    );
    // but creating one needs the signed-in user's token
    const createButton = screen.getByRole('button', {
      name: 'Create New Subscription',
    });
    expect(createButton.hasAttribute('disabled')).toBe(true);
    screen.getByTitle(
      'Cannot create subscription: no OIDC sign-in is configured',
    );
    expectNoAuthProvider(warnSpy);
  });
});

describe('Data access request viewer without an AuthProvider', () => {
  test('Shows a data access request with no token, and no escalating or closing it', async () => {
    const warnSpy = spyOnAuthProviderWarning();
    const applicationStore = new ApplicationStore(
      TEST__getGenericApplicationConfig(),
      TEST__LegendApplicationPluginManager.create(),
    );
    applicationStore.identityService.setCurrentUser(TEST_USER);
    applicationStore.navigationService.navigator.generateAddress = jest.fn(
      (location: string) => location,
    );
    const contractServerClient = new LakehouseContractServerClient({
      baseUrl: 'http://test-contract-server-client',
    });
    contractServerClient.setTracerService(applicationStore.tracerService);
    const plugins =
      applicationStore.pluginManager.getPureProtocolProcessorPlugins();
    const contract = mockContracts.pendingPrivilegeManager(plugins);
    createSpy(contractServerClient, 'getContractTasks').mockResolvedValue(
      getMockPendingManagerApprovalTasksResponse() as unknown as PlainObject<V1_TaskResponse>,
    );
    createSpy(contractServerClient, 'getDataContract').mockResolvedValue({
      dataContracts: [
        {
          dataContract: serialize(
            V1_dataContractModelSchema(plugins),
            contract,
          ) as PlainObject<V1_DataContract>,
        },
      ],
    });
    const viewerState = new DataContractViewerState(
      V1_transformDataContractToLiteDatacontract(contract),
      (contractId: string, taskId: string) =>
        `http://test-task-url?contractId=${contractId}&taskId=${taskId}`,
      undefined,
      applicationStore,
      contractServerClient,
      new GraphManagerState(
        applicationStore.pluginManager,
        applicationStore.logService,
      ),
      undefined,
    );

    await act(async () => {
      render(
        <ApplicationStoreProvider store={applicationStore}>
          <TEST__BrowserEnvironmentProvider initialEntries={['/']}>
            <ApplicationFrameworkProvider>
              <Routes>
                <Route
                  path="*"
                  element={
                    <DataAccessRequestViewer
                      open={true}
                      onClose={jest.fn()}
                      viewerState={viewerState}
                      getDataProductUrl={() => ''}
                    />
                  }
                />
              </Routes>
            </ApplicationFrameworkProvider>
          </TEST__BrowserEnvironmentProvider>
        </ApplicationStoreProvider>,
      );
      await new Promise((resolve) => setTimeout(resolve, 0)); // wait for async state updates
    });

    await screen.findByText('Pending Data Access Request');
    await screen.findByText(TEST_USER);
    // the request still loads, with no token
    expect(contractServerClient.getContractTasks).toHaveBeenCalledWith(
      contract.guid,
      undefined,
    );
    // but escalating or closing it needs the signed-in user's token
    const escalateButton = screen.getByTitle(
      'Cannot escalate request: no OIDC sign-in is configured',
    ).firstElementChild;
    expect(escalateButton?.hasAttribute('disabled')).toBe(true);
    const closeButton = screen.getByTitle(
      'Cannot close request: no OIDC sign-in is configured',
    ).firstElementChild;
    expect(closeButton?.hasAttribute('disabled')).toBe(true);
    expectNoAuthProvider(warnSpy);
  });
});
