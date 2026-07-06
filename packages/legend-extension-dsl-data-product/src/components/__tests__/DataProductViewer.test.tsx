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

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  type PlainObject,
  NetworkClientError,
  HttpStatus,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import type * as LegendApplication from '@finos/legend-application';
import {
  type V1_DataContract,
  type V1_DataProduct,
  type V1_EntitlementsDataProductDetails,
  type V1_LiteDataContract,
  type V1_RelationElement,
  type V1_TaskResponse,
  DataProductAccessType,
  V1_AccessPointGroupReferenceType,
  V1_ContractState,
  V1_EnrichedUserApprovalStatus,
  V1_OrganizationalScopeType,
  V1_ResourceType,
  V1_UserType,
} from '@finos/legend-graph';
import {
  getMockDataProductGenerationFilesByType,
  mockEnterpriseDataProduct,
  mockEntitlementsAdHocDataProduct,
  mockEntitlementsEnterpriseDataProduct,
  mockEntitlementsLargeSDLCDataProduct,
  mockEntitlementsMultiGroupLargeSDLCDataProduct,
  mockEntitlementsSDLCDataProduct,
  mockEntitlementsSDLCDataProductNoSupportInfo,
  mockLargeSDLCDataProduct,
  mockMultiGroupLargeSDLCDataProduct,
  mockSDLCDataProduct,
  mockSDLCDataProductNoSupportInfo,
  buildMockDataProductArtifactWithSampleQueries,
  MOCK__TDS_SAMPLE_QUERY_ID,
  MOCK__RELATION_SAMPLE_QUERY_ID,
  MOCK__TDS_COLUMN_SAMPLE_VALUES,
} from '../__test-utils__/TEST_DATA__LakehouseDataProducts.js';
import { createSpy } from '@finos/legend-shared/test';
import { IngestDeploymentServerConfig } from '@finos/legend-server-lakehouse';
import { AuthProvider } from 'react-oidc-context';
import { ProductViewer } from '../ProductViewer.js';
import {
  TEST__getDataProductDataAccessState,
  TEST__getDataProductViewerState,
} from '../__test-utils__/StateTestUtils.js';
import type { DataProductAPGState } from '../../stores/DataProduct/DataProductAPGState.js';
import type { DataProductAccessPointState } from '../../stores/DataProduct/DataProductAccessPointState.js';
import { ENGINE_TEST_SUPPORT__getClassifierPathMapping } from '@finos/legend-graph/test';
import { flowResult } from 'mobx';
import type {
  ProjectGAVCoordinates,
  StoredFileGeneration,
} from '@finos/legend-storage';
import {
  MockedMonacoEditorAPI,
  MockedMonacoEditorInstance,
  MockedMonacoEditorModel,
} from '@finos/legend-lego/code-editor/test';
import { BrowserRouter } from '@finos/legend-application/browser';
import {
  getMockCompletedTasksResponse,
  getMockPendingManagerApprovalTasksResponse,
} from '../__test-utils__/TEST_DATA__LakehouseDataContracts.js';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: Record<PropertyKey, unknown>;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

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
});
const WORK_IN_PROGRESS = 'Work in progress';
const NOT_SUPPORTED = 'Not Supported';

const setupLakehouseDataProductTest = async (
  dataProduct: V1_DataProduct,
  entitlementsDataProductDetails: V1_EntitlementsDataProductDetails | undefined,
  mockLiteContracts: V1_LiteDataContract[],
  mockDataContracts: V1_DataContract[],
  projectGAVCoordinates?: ProjectGAVCoordinates,
  mockGenerationFiles?: StoredFileGeneration[],
  extraActions?: Record<string, unknown>,
) => {
  const dataProductViewerState = await TEST__getDataProductViewerState(
    dataProduct,
    projectGAVCoordinates,
    extraActions,
  );
  createdViewerStates.push(dataProductViewerState);

  const dataProductDataAccessState = entitlementsDataProductDetails
    ? TEST__getDataProductDataAccessState(
        dataProductViewerState,
        entitlementsDataProductDetails,
      )
    : undefined;

  // application store spies
  dataProductViewerState.applicationStore.identityService.setCurrentUser(
    'test-consumer-user-id',
  );

  if (dataProductDataAccessState) {
    // lakehouseContractServerClient spies
    createSpy(
      dataProductDataAccessState.lakehouseContractServerClient,
      'getDataContractsForDataProduct',
    ).mockResolvedValue({
      dataContracts: mockLiteContracts,
    });

    createSpy(
      dataProductDataAccessState.lakehouseContractServerClient,
      'getDataContract',
    ).mockImplementation(async (id: string) => {
      const matchingContract = mockDataContracts.find(
        (_contract) => _contract.guid === id,
      );
      return {
        dataContracts: matchingContract
          ? [{ dataContract: matchingContract }]
          : [],
      };
    });

    createSpy(
      dataProductDataAccessState.lakehouseContractServerClient,
      'getContractsForUser',
    ).mockResolvedValue(
      mockLiteContracts
        .filter((contract) => {
          const consumer = contract.consumer as
            | {
                users?: {
                  name: string;
                }[];
              }
            | undefined;
          return (
            Array.isArray(consumer?.users) &&
            consumer.users.some(
              (user: { name: string }) => user.name === 'test-consumer-user-id',
            )
          );
        })
        .map((contract) => ({
          contractResultLite: contract,
          status: V1_EnrichedUserApprovalStatus.APPROVED,
          user: 'test-consumer-user-id',
        })),
    );

    createSpy(
      dataProductDataAccessState.lakehouseContractServerClient,
      'getSubscriptionsForContract',
    ).mockResolvedValue([]);

    // Mock environment API call
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

    // Mock owners API call
    const mockOwnersResponse = {
      owners: [
        'owner1@example.com',
        'owner2@example.com',
        'owner3@example.com',
      ],
    };
    createSpy(
      dataProductDataAccessState.lakehouseContractServerClient,
      'getOwnersForDid',
    ).mockResolvedValue(mockOwnersResponse);

    // Mock the plugin's handleDataProductOwnersResponse
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
        path: dataProduct.path,
        content: dataProduct,
        classifierPath: 'meta::pure::metamodel::dataproduct::DataProduct',
      },
    ]);

    createSpy(
      dataProductDataAccessState.lakehouseContractServerClient,
      'getContractUserStatus',
    ).mockImplementation(async (contractId: string) => {
      switch (contractId) {
        case 'test-pending-consumer-privilege-manager-approval-contract-id':
          return {
            status:
              V1_EnrichedUserApprovalStatus.PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
          };
        case 'test-pending-data-owner-approval-contract-id':
          return {
            status: V1_EnrichedUserApprovalStatus.PENDING_DATA_OWNER_APPROVAL,
          };
        case 'test-approved-contract-id':
        case 'test-partially-approved-contract-id':
          return { status: V1_EnrichedUserApprovalStatus.APPROVED };
        case 'test-denied-contract-id':
          return { status: V1_EnrichedUserApprovalStatus.DENIED };
        default:
          return { status: V1_EnrichedUserApprovalStatus.DENIED };
      }
    });

    createSpy(
      dataProductDataAccessState.lakehouseContractServerClient,
      'getContractTasks',
    ).mockImplementation(async (contractId: string) => {
      if (
        contractId === 'test-approved-contract-id' ||
        contractId === 'test-partially-approved-contract-id'
      ) {
        return getMockCompletedTasksResponse() as unknown as PlainObject<V1_TaskResponse>;
      }
      return getMockPendingManagerApprovalTasksResponse() as unknown as PlainObject<V1_TaskResponse>;
    });

    // Default mock for consumer grants - returns the current user as approved
    createSpy(
      dataProductDataAccessState.lakehouseContractServerClient,
      'getConsumerGrantsByContractId',
    ).mockResolvedValue({
      contractId: 'test-approved-contract-id',
      accessPointGroups: [],
      users: [
        {
          username: 'test-consumer-user-id',
          contractId: 'test-approved-contract-id',
          targetAccount: 'test-account',
        },
      ],
    });
  }

  // engineServerClient spies
  createSpy(
    dataProductViewerState.engineServerClient,
    'lambdaRelationType',
  ).mockImplementation(async () => {
    return new Promise((resolve) => {
      const response = {
        _type: 'relationType',
        columns: [
          {
            name: 'varchar_val',
            description: 'Varchar Column Description from field',
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            taggedValues: [
              {
                tag: {
                  profile: 'meta::pure::profiles::doc',
                  value: 'doc',
                },
                value: 'Varchar Column Description from tagged value',
              },
            ],
            genericType: {
              multiplicityArguments: [],
              typeArguments: [],
              rawType: {
                _type: 'packageableType',
                fullPath: 'meta::pure::precisePrimitives::Varchar',
              },
              typeVariableValues: [{ _type: 'integer', value: 32 }],
            },
          },
          {
            name: 'int_val',
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            taggedValues: [
              {
                tag: {
                  profile: 'meta::pure::profiles::doc',
                  value: 'doc',
                },
                value: 'Int Column Description from tagged value',
              },
            ],
            genericType: {
              multiplicityArguments: [],
              typeArguments: [],
              rawType: {
                _type: 'packageableType',
                fullPath: 'meta::pure::precisePrimitives::Int',
              },
              typeVariableValues: [],
            },
          },
        ],
      };

      if (mockGenerationFiles) {
        // Simulate engine response taking some time to ensure the artifact is used
        // instead of the engine response
        setTimeout(() => resolve(response), 500);
      } else {
        resolve(response);
      }
    });
  });

  createSpy(
    dataProductViewerState.engineServerClient,
    'getClassifierPathMap',
  ).mockImplementation(async () => {
    const result = await ENGINE_TEST_SUPPORT__getClassifierPathMapping();
    return [
      ...result,
      {
        type: 'ingestDefinition',
        classifierPath:
          'meta::external::ingest::specification::metamodel::IngestDefinition',
      },
    ];
  });

  // depotServerClient spies
  createSpy(
    dataProductViewerState.depotServerClient,
    'getGenerationFilesByType',
  ).mockResolvedValue(
    mockGenerationFiles
      ? (mockGenerationFiles as unknown as PlainObject<StoredFileGeneration>[])
      : [],
  );

  let renderResult;

  await act(async () => {
    const initPromise = flowResult(
      dataProductViewerState.init(entitlementsDataProductDetails),
    );
    await flowResult(dataProductDataAccessState?.init(() => undefined));
    renderResult = render(
      <BrowserRouter>
        <AuthProvider>
          <ProductViewer
            productViewerState={dataProductViewerState}
            productDataAccessState={dataProductDataAccessState}
          />
        </AuthProvider>
      </BrowserRouter>,
    );

    await initPromise.catch(
      /* expected — artifact fetch has no mock data */ () => undefined,
    );
    await new Promise((resolve) => setTimeout(resolve, 0)); // wait for async state updates
  });

  return { renderResult, dataProductDataAccessState, dataProductViewerState };
};

describe('DataProductViewer', () => {
  describe('Basic rendering', () => {
    test('Loads DataProductViewer and displays title, description, and access point groups', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      await screen.findByText('Mock SDLC Data Product');
      screen.getByText(
        'Comprehensive customer analytics data for business intelligence and reporting',
      );
      screen.getByText('Main Group Test');
      screen.getByText('Test access point group');
      await screen.findByText('Customer Demographics');
      await screen.findByText('Customer demographics data access point');
    });

    test('Loads DataProductViewer without DataProductDataAccessState and displays title, description, and access point groups', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        undefined,
        [],
        [],
      );

      await screen.findByText('Mock SDLC Data Product');
      screen.getByText(
        'Comprehensive customer analytics data for business intelligence and reporting',
      );
      screen.getByText('Main Group Test');
      screen.getByText('Test access point group');
      await screen.findByText('Customer Demographics');
      await screen.findByText('Customer demographics data access point');
    });

    test('Access Point Column Specifications table shows columns and types from artifact when data product artifact is present', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        {
          groupId: 'test.group',
          artifactId: 'test-artifact',
          versionId: '1.0.0',
        },
        getMockDataProductGenerationFilesByType(mockSDLCDataProduct),
      );

      await screen.findByText('Customer Demographics');
      await screen.findByText('Customer demographics data access point');
      screen.getByText('Main Group Test');
      await screen.findByText('Column Name');
      screen.getByText('Column Type');
      screen.getByText('Column Description');

      await screen.findByText('artifact_varchar_val');
      screen.getByText('Varchar(500)');
      screen.getByText('artifact_int_val');
      screen.getByText('Int');
    });

    test('Access Point Column Specifications table shows columns and types from engine for SDLC data product when data product artifact is not present', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        {
          groupId: 'test.group',
          artifactId: 'test-artifact',
          versionId: '1.0.0',
        },
      );

      await screen.findByText('Customer Demographics');
      await screen.findByText('Customer demographics data access point');
      screen.getByText('Main Group Test');

      await screen.findByText('Column Name');
      screen.getByText('Column Type');
      screen.getByText('Column Description');

      await screen.findByText('varchar_val');
      screen.getByText('Varchar(32)');
      screen.getByText('int_val');
      screen.getByText('Int');
    });

    test('Access Point Column Specifications table shows columns and types from engine for ad-hoc data product when data product artifact is not present', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsAdHocDataProduct,
        [],
        [],
      );

      await screen.findByText('Customer Demographics');
      await screen.findByText('Customer demographics data access point');
      await screen.findByText('Main Group Test');

      await screen.findByText('Column Name');
      screen.getByText('Column Type');
      screen.getByText('Column Description');

      await screen.findByText('varchar_val');
      screen.getByText('Varchar(32)');
      screen.getByText('int_val');
      screen.getByText('Int');
    });

    test('Renders button with Lakehouse environment name', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      await screen.findByText('Mock SDLC Data Product');

      // Wait for the environment to be fetched and displayed
      await screen.findByText(/Lakehouse - test-production-env/);
    });

    test('Clicking Lakehouse environment button displays tooltip with owners', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      await screen.findByText('Mock SDLC Data Product');

      // Wait for the environment button to be rendered
      const lakehouseButton = await screen.findByText(
        /Lakehouse - test-production-env/,
      );

      // Click on the Lakehouse button to open the tooltip
      await act(async () => {
        fireEvent.click(lakehouseButton);
      });

      // Wait for the tooltip to appear with owners
      await waitFor(() => {
        expect(screen.getByText('owner1@example.com')).toBeDefined();
        expect(screen.getByText('owner2@example.com')).toBeDefined();
        expect(screen.getByText('owner3@example.com')).toBeDefined();
      });
    });
  });

  describe('Access/contract logic', () => {
    test('displays REQUEST ACCESS button when user has no contracts', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [];
      const mockDataContracts: V1_DataContract[] = [];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockLiteContracts,
        mockDataContracts,
      );

      await screen.findByRole('button', { name: 'REQUEST ACCESS' });
    });

    test('displays REQUEST ACCESS button when user has denied contract', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test denied contract',
          guid: 'test-denied-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resourceId: 'MOCK_SDLC_DATAPRODUCT',
          resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
          deploymentId: 11111,
          accessPointGroup: 'GROUP1',
        },
      ];

      const mockDataContracts: V1_DataContract[] = [
        {
          description: 'Test denied contract',
          guid: 'test-denied-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 12345,
              },
            },
          },
        },
      ];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockLiteContracts,
        mockDataContracts,
      );

      await screen.findByRole('button', { name: 'REQUEST ACCESS' });
    });

    test('clicking REQUEST ACCESS button opens create contract modal', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [];
      const mockDataContracts: V1_DataContract[] = [];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockLiteContracts,
        mockDataContracts,
      );

      await screen.findByText('Main Group Test');
      const requestAccessButton = await screen.findByRole('button', {
        name: 'REQUEST ACCESS',
      });
      fireEvent.click(requestAccessButton);

      await screen.findByText('Data Contract Request');
    });

    test('REQUEST ACCESS secondary button only shows "Manage Subscriptions"', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [];
      const mockDataContracts: V1_DataContract[] = [];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockLiteContracts,
        mockDataContracts,
      );

      await screen.findByText('Main Group Test');
      const secondaryButton = await screen.findByTitle('More options');
      fireEvent.click(secondaryButton);

      await screen.findByText('Manage Subscriptions');
    });

    test('displays PENDING MANAGER APPROVAL button for contract in PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL status', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test pending privilege manager approval contract',
          guid: 'test-pending-consumer-privilege-manager-approval-contract-id',
          version: 0,
          state: V1_ContractState.PENDING_DATA_OWNER_APPROVAL,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resourceId: 'MOCK_SDLC_DATAPRODUCT',
          resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
          deploymentId: 11111,
          accessPointGroup: 'GROUP1',
        },
      ];

      const mockDataContracts: V1_DataContract[] = [
        {
          description: 'Test pending privilege manager approval contract',
          guid: 'test-pending-consumer-privilege-manager-approval-contract-id',
          version: 0,
          state: V1_ContractState.PENDING_DATA_OWNER_APPROVAL,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 12345,
              },
            },
          },
        },
      ];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockLiteContracts,
        mockDataContracts,
      );

      await screen.findByRole('button', { name: 'PENDING MANAGER APPROVAL' });
    });

    test('clicking PENDING MANAGER APPROVAL button opens pending contract viewer', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test pending privilege manager approval contract',
          guid: 'test-pending-consumer-privilege-manager-approval-contract-id',
          version: 0,
          state: V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resourceId: 'MOCK_SDLC_DATAPRODUCT',
          resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
          deploymentId: 11111,
          accessPointGroup: 'GROUP1',
        },
      ];

      const mockDataContracts: V1_DataContract[] = [
        {
          description: 'Test pending privilege manager approval contract',
          guid: 'test-pending-consumer-privilege-manager-approval-contract-id',
          version: 0,
          state: V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 12345,
              },
            },
          },
        },
      ];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockLiteContracts,
        mockDataContracts,
      );

      await screen.findByText('Main Group Test');
      const pendingButton = await screen.findByRole('button', {
        name: 'PENDING MANAGER APPROVAL',
      });
      fireEvent.click(pendingButton);

      await screen.findByText('Pending Data Access Request');
    });

    test('PENDING MANAGER APPROVAL secondary button shows "Request for Others" and "Manage Subscriptions"', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test pending privilege manager approval contract',
          guid: 'test-pending-consumer-privilege-manager-approval-contract-id',
          version: 0,
          state: V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resourceId: 'MOCK_SDLC_DATAPRODUCT',
          resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
          deploymentId: 11111,
          accessPointGroup: 'GROUP1',
        },
      ];

      const mockDataContracts: V1_DataContract[] = [
        {
          description: 'Test pending privilege manager approval contract',
          guid: 'test-pending-consumer-privilege-manager-approval-contract-id',
          version: 0,
          state: V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 12345,
              },
            },
          },
        },
      ];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockLiteContracts,
        mockDataContracts,
      );

      await screen.findByText('Main Group Test');
      const secondaryButton = await screen.findByTitle('More options');
      fireEvent.click(secondaryButton);

      await screen.findByText('Request Access for Others');
      screen.getByText('Manage Subscriptions');
    });

    test('displays PENDING DATA OWNER APPROVAL button for contract in PENDING_DATA_OWNER_APPROVAL status', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test pending data owner approval contract',
          guid: 'test-pending-data-owner-approval-contract-id',
          version: 0,
          state: V1_ContractState.PENDING_DATA_OWNER_APPROVAL,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resourceId: 'MOCK_SDLC_DATAPRODUCT',
          resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
          deploymentId: 11111,
          accessPointGroup: 'GROUP1',
        },
      ];

      const mockDataContracts: V1_DataContract[] = [
        {
          description: 'Test pending data owner approval contract',
          guid: 'test-pending-data-owner-approval-contract-id',
          version: 0,
          state: V1_ContractState.PENDING_DATA_OWNER_APPROVAL,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 12345,
              },
            },
          },
        },
      ];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockLiteContracts,
        mockDataContracts,
      );

      await screen.findByRole('button', {
        name: 'PENDING DATA OWNER APPROVAL',
      });
    });

    test('clicking PENDING DATA OWNER APPROVAL button opens pending contract viewer', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test pending data owner approval contract',
          guid: 'test-pending-data-owner-approval-contract-id',
          version: 0,
          state: V1_ContractState.PENDING_DATA_OWNER_APPROVAL,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resourceId: 'MOCK_SDLC_DATAPRODUCT',
          resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
          deploymentId: 11111,
          accessPointGroup: 'GROUP1',
        },
      ];

      const mockDataContracts: V1_DataContract[] = [
        {
          description: 'Test pending data owner approval contract',
          guid: 'test-pending-data-owner-approval-contract-id',
          version: 0,
          state: V1_ContractState.PENDING_DATA_OWNER_APPROVAL,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 12345,
              },
            },
          },
        },
      ];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockLiteContracts,
        mockDataContracts,
      );

      await screen.findByText('Main Group Test');
      const pendingButton = await screen.findByRole('button', {
        name: 'PENDING DATA OWNER APPROVAL',
      });
      fireEvent.click(pendingButton);

      await screen.findByText('Pending Data Access Request');
    });

    test('PENDING DATA OWNER APPROVAL secondary button shows "Request for Others" and "Manage Subscriptions"', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test pending data owner approval contract',
          guid: 'test-pending-data-owner-approval-contract-id',
          version: 0,
          state: V1_ContractState.PENDING_DATA_OWNER_APPROVAL,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resourceId: 'MOCK_SDLC_DATAPRODUCT',
          resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
          deploymentId: 11111,
          accessPointGroup: 'GROUP1',
        },
      ];

      const mockDataContracts: V1_DataContract[] = [
        {
          description: 'Test pending data owner approval contract',
          guid: 'test-pending-data-owner-approval-contract-id',
          version: 0,
          state: V1_ContractState.PENDING_DATA_OWNER_APPROVAL,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 12345,
              },
            },
          },
        },
      ];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockLiteContracts,
        mockDataContracts,
      );

      await screen.findByText('Main Group Test');
      const secondaryButton = await screen.findByTitle('More options');
      fireEvent.click(secondaryButton);

      await screen.findByText('Request Access for Others');
      screen.getByText('Manage Subscriptions');
    });

    test('Access point sql tab has a open sql playground button to open editor to run queries.', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test approved contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resourceId: 'MOCK_SDLC_DATAPRODUCT',
          resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
          deploymentId: 11111,
          accessPointGroup: 'GROUP1',
        },
      ];

      const mockDataContracts: V1_DataContract[] = [
        {
          description: 'Test approved contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 12345,
              },
            },
          },
        },
      ];

      const { dataProductDataAccessState } =
        await setupLakehouseDataProductTest(
          mockSDLCDataProduct,
          mockEntitlementsSDLCDataProduct,
          mockLiteContracts,
          mockDataContracts,
          {
            groupId: 'test.group',
            artifactId: 'test-artifact',
            versionId: '1.0.0',
          },
          getMockDataProductGenerationFilesByType(mockSDLCDataProduct),
        );

      jest
        .spyOn(MockedMonacoEditorAPI, 'create')
        .mockReturnValue(MockedMonacoEditorInstance);
      jest
        .spyOn(MockedMonacoEditorAPI, 'createModel')
        .mockReturnValue(MockedMonacoEditorModel);

      await screen.findByText('Mock SDLC Data Product');
      await screen.findByText('Customer demographics data access point');

      act(() => {
        dataProductDataAccessState?.setLakehouseIngestEnvironmentSummaries([
          IngestDeploymentServerConfig.serialization.fromJson({
            ingestServerUrl: 'https://dev-test.example.com',
            ingestEnvironmentUrn: 'urn:dev:test',
            environmentName: 'Development',
            environmentClassification: 'FULL',
          }),
        ]);
      });

      const sqlTab = await screen.findByRole('tab', { name: 'SQL' });
      fireEvent.click(sqlTab);
      const openSqlPlaygroundBtn = await screen.findByRole('button', {
        name: 'Open SQL Playground',
      });
      expect(openSqlPlaygroundBtn).toBeDefined();
      fireEvent.click(openSqlPlaygroundBtn);
      await screen.findByText('result');
      await screen.findByText('Local Mode');
      const localToggleMode = await screen.findByRole('button', {
        name: 'local mode',
      });
      expect(localToggleMode).toBeDefined();
      fireEvent.click(localToggleMode);
      expect(localToggleMode.className).toContain(
        'query-builder__result__advanced__mode__toggler__btn--toggled',
      );
      const runQueryBtn = await screen.findByRole('button', {
        name: 'Run Query',
      });
      expect(runQueryBtn).toBeDefined();
      fireEvent.click(runQueryBtn);
    });

    test('Access point sql tab has a copy connnection string button.', async () => {
      const { dataProductDataAccessState } =
        await setupLakehouseDataProductTest(
          mockSDLCDataProduct,
          mockEntitlementsSDLCDataProduct,
          [],
          [],
          {
            groupId: 'test.group',
            artifactId: 'test-artifact',
            versionId: '1.0.0',
          },
        );
      const clipboardService =
        dataProductDataAccessState?.applicationStore.clipboardService;
      expect(clipboardService).toBeDefined();
      const clipBoardSpy = jest
        .spyOn(
          clipboardService as NonNullable<typeof clipboardService>,
          'copyTextToClipboard',
        )
        .mockResolvedValue(undefined);
      const notificationService =
        dataProductDataAccessState?.applicationStore.notificationService;
      expect(notificationService).toBeDefined();
      const notifySpy = jest.spyOn(
        notificationService as NonNullable<typeof notificationService>,
        'notifySuccess',
      );

      await screen.findByText('Mock SDLC Data Product');
      await screen.findByText('Customer demographics data access point');

      act(() => {
        dataProductDataAccessState?.setLakehouseIngestEnvironmentSummaries([
          IngestDeploymentServerConfig.serialization.fromJson({
            ingestServerUrl: 'https://dev-test.example.com',
            ingestEnvironmentUrn: 'urn:dev:test',
            environmentName: 'Development',
            environmentClassification: 'FULL',
          }),
        ]);
      });

      const sqlTab = await screen.findByRole('tab', { name: 'SQL' });
      fireEvent.click(sqlTab);
      const openCopyConnectionString = await screen.findByTitle(
        'Copy Connection String',
      );
      expect(openCopyConnectionString).toBeDefined();
      expect(openCopyConnectionString.hasAttribute('disabled')).toBe(false);
      fireEvent.click(openCopyConnectionString);
      await waitFor(() => {
        expect(clipBoardSpy).toHaveBeenCalledTimes(1);
        expect(notifySpy).toHaveBeenCalledWith(
          'Copied connection string to clipboard',
        );
        expect(clipBoardSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            `projects|com.example.analytics:customer-analytics:1.2.0?options='--compute=testtargetenvironment --environment=Development --warehouse=LAKEHOUSE_CONSUMER_DEFAULT_WH'`,
          ),
        );
      });
      const infoIcon = await screen.findByTitle('See Documentation');
      expect(infoIcon).toBeDefined();
      fireEvent.click(infoIcon);
    });

    test('Access point SQL, Power BI, and Datacube buttons are disabled when user has no access', async () => {
      const { dataProductDataAccessState } =
        await setupLakehouseDataProductTest(
          mockSDLCDataProduct,
          mockEntitlementsSDLCDataProduct,
          [],
          [],
          {
            groupId: 'test.group',
            artifactId: 'test-artifact',
            versionId: '1.0.0',
          },
          getMockDataProductGenerationFilesByType(mockSDLCDataProduct),
          { openPowerBi: jest.fn(), openDataCube: jest.fn() },
        );

      await screen.findByText('Mock SDLC Data Product');
      await screen.findByText('Customer demographics data access point');

      act(() => {
        dataProductDataAccessState?.setLakehouseIngestEnvironmentSummaries([
          IngestDeploymentServerConfig.serialization.fromJson({
            ingestServerUrl: 'https://dev-test.example.com',
            ingestEnvironmentUrn: 'urn:dev:test',
            environmentName: 'Development',
            environmentClassification: 'FULL',
          }),
        ]);
      });

      // Check SQL tab button is disabled
      const sqlTab = await screen.findByRole('tab', { name: 'SQL' });
      fireEvent.click(sqlTab);
      await waitFor(() => {
        const openSqlPlaygroundBtn = screen.getByTitle(
          'You do not have access to this access point group. Please request access first.',
        );
        expect(openSqlPlaygroundBtn.hasAttribute('disabled')).toBe(true);
      });

      // Check Power BI tab button is disabled
      const powerBiTab = await screen.findByRole('tab', {
        name: 'Power BI',
      });
      fireEvent.click(powerBiTab);
      await waitFor(() => {
        const openPowerBiBtn = screen.getByTitle(
          'You do not have access to this access point group. Please request access first.',
        );
        expect(openPowerBiBtn.hasAttribute('disabled')).toBe(true);
      });

      // Check Datacube tab button is disabled
      const dataCubeTab = await screen.findByRole('tab', {
        name: 'Datacube',
      });
      fireEvent.click(dataCubeTab);
      await waitFor(() => {
        const openDataCubeBtn = screen.getByTitle(
          'You do not have access to this access point group. Please request access first.',
        );
        expect(openDataCubeBtn.hasAttribute('disabled')).toBe(true);
      });
    });

    test('Access point Power BI tab button is enabled when user has access', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test approved contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resourceId: 'MOCK_SDLC_DATAPRODUCT',
          resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
          deploymentId: 11111,
          accessPointGroup: 'GROUP1',
        },
      ];

      const mockDataContracts: V1_DataContract[] = [
        {
          description: 'Test approved contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 12345,
              },
            },
          },
        },
      ];

      const openPowerBiMock = jest.fn();
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockLiteContracts,
        mockDataContracts,
        {
          groupId: 'test.group',
          artifactId: 'test-artifact',
          versionId: '1.0.0',
        },
        getMockDataProductGenerationFilesByType(mockSDLCDataProduct),
        { openPowerBi: openPowerBiMock },
      );

      await screen.findByText('Mock SDLC Data Product');
      await screen.findByText('Customer demographics data access point');

      const powerBiTab = await screen.findByRole('tab', {
        name: 'Power BI',
      });
      fireEvent.click(powerBiTab);
      const openPowerBiBtn = await screen.findByRole('button', {
        name: 'Open in Power BI',
      });
      expect(openPowerBiBtn).toBeDefined();
      expect(openPowerBiBtn.hasAttribute('disabled')).toBe(false);
      fireEvent.click(openPowerBiBtn);
      expect(openPowerBiMock).toHaveBeenCalledWith('GROUP1');
    });

    test('Access point Power BI tab button is disabled when user has no access', async () => {
      const openPowerBiMock = jest.fn();
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        {
          groupId: 'test.group',
          artifactId: 'test-artifact',
          versionId: '1.0.0',
        },
        getMockDataProductGenerationFilesByType(mockSDLCDataProduct),
        { openPowerBi: openPowerBiMock },
      );

      await screen.findByText('Mock SDLC Data Product');
      await screen.findByText('Customer demographics data access point');

      const powerBiTab = await screen.findByRole('tab', {
        name: 'Power BI',
      });
      fireEvent.click(powerBiTab);
      const openPowerBiBtn = await screen.findByTitle(
        'You do not have access to this access point group. Please request access first.',
      );
      expect(openPowerBiBtn).toBeDefined();
      expect(openPowerBiBtn.hasAttribute('disabled')).toBe(true);
      fireEvent.click(openPowerBiBtn);
      expect(openPowerBiMock).not.toHaveBeenCalled();
    });

    test('Access point Datacube tab button is enabled when user has access', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test approved contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resourceId: 'MOCK_SDLC_DATAPRODUCT',
          resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
          deploymentId: 11111,
          accessPointGroup: 'GROUP1',
        },
      ];

      const mockDataContracts: V1_DataContract[] = [
        {
          description: 'Test approved contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 12345,
              },
            },
          },
        },
      ];

      const openDataCubeMock = jest.fn();
      const { dataProductDataAccessState } =
        await setupLakehouseDataProductTest(
          mockSDLCDataProduct,
          mockEntitlementsSDLCDataProduct,
          mockLiteContracts,
          mockDataContracts,
          {
            groupId: 'test.group',
            artifactId: 'test-artifact',
            versionId: '1.0.0',
          },
          getMockDataProductGenerationFilesByType(mockSDLCDataProduct),
          { openDataCube: openDataCubeMock },
        );

      await screen.findByText('Mock SDLC Data Product');
      await screen.findByText('Customer demographics data access point');

      act(() => {
        dataProductDataAccessState?.setLakehouseIngestEnvironmentSummaries([
          IngestDeploymentServerConfig.serialization.fromJson({
            ingestServerUrl: 'https://dev-test.example.com',
            ingestEnvironmentUrn: 'urn:dev:test',
            environmentName: 'Development',
            environmentClassification: 'FULL',
          }),
        ]);
      });

      const dataCubeTab = await screen.findByRole('tab', {
        name: 'Datacube',
      });
      fireEvent.click(dataCubeTab);
      const openDataCubeBtn = await screen.findByRole('button', {
        name: 'Open in Datacube',
      });
      expect(openDataCubeBtn).toBeDefined();
      expect(openDataCubeBtn.hasAttribute('disabled')).toBe(false);
    });

    test('Access point Datacube tab button is disabled when user has no access', async () => {
      const openDataCubeMock = jest.fn();
      const { dataProductDataAccessState } =
        await setupLakehouseDataProductTest(
          mockSDLCDataProduct,
          mockEntitlementsSDLCDataProduct,
          [],
          [],
          {
            groupId: 'test.group',
            artifactId: 'test-artifact',
            versionId: '1.0.0',
          },
          getMockDataProductGenerationFilesByType(mockSDLCDataProduct),
          { openDataCube: openDataCubeMock },
        );

      await screen.findByText('Mock SDLC Data Product');
      await screen.findByText('Customer demographics data access point');

      act(() => {
        dataProductDataAccessState?.setLakehouseIngestEnvironmentSummaries([
          IngestDeploymentServerConfig.serialization.fromJson({
            ingestServerUrl: 'https://dev-test.example.com',
            ingestEnvironmentUrn: 'urn:dev:test',
            environmentName: 'Development',
            environmentClassification: 'FULL',
          }),
        ]);
      });

      const dataCubeTab = await screen.findByRole('tab', {
        name: 'Datacube',
      });
      fireEvent.click(dataCubeTab);
      const openDataCubeBtn = await screen.findByTitle(
        'You do not have access to this access point group. Please request access first.',
      );
      expect(openDataCubeBtn).toBeDefined();
      expect(openDataCubeBtn.hasAttribute('disabled')).toBe(true);
    });

    test('displays ENTITLED button for contract in APPROVED status', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test pending data owner approval contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resourceId: 'MOCK_SDLC_DATAPRODUCT',
          resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
          deploymentId: 11111,
          accessPointGroup: 'GROUP1',
        },
      ];

      const mockDataContracts: V1_DataContract[] = [
        {
          description: 'Test pending data owner approval contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 12345,
              },
            },
          },
        },
      ];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockLiteContracts,
        mockDataContracts,
      );

      await screen.findByRole('button', { name: 'ENTITLED' });
    });

    test('displays ENTITLED button for contract when user is approved but entire contract is not yet completed', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test partially approved contract',
          guid: 'test-partially-approved-contract-id',
          version: 0,
          state: V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resourceId: 'MOCK_SDLC_DATAPRODUCT',
          resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
          deploymentId: 11111,
          accessPointGroup: 'GROUP1',
        },
      ];

      const mockDataContracts: V1_DataContract[] = [
        {
          description: 'Test partially approved contract',
          guid: 'test-partially-approved-contract-id',
          version: 0,
          state: V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 12345,
              },
            },
          },
        },
      ];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockLiteContracts,
        mockDataContracts,
      );

      await screen.findByRole('button', { name: 'ENTITLED' });
    });

    test('clicking ENTITLED button opens completed contract viewer', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test pending data owner approval contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
            _type: V1_OrganizationalScopeType.AdHocTeam,
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resourceId: 'MOCK_SDLC_DATAPRODUCT',
          resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
          deploymentId: 11111,
          accessPointGroup: 'GROUP1',
        },
      ];

      const mockDataContracts: V1_DataContract[] = [
        {
          description: 'Test pending data owner approval contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
            _type: V1_OrganizationalScopeType.AdHocTeam,
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 12345,
              },
            },
          },
        },
      ];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockLiteContracts,
        mockDataContracts,
      );

      await screen.findByText('Main Group Test');
      const entitledButton = await screen.findByRole('button', {
        name: 'ENTITLED',
      });
      fireEvent.click(entitledButton);

      await screen.findByText('Data Access Request');
    });

    test('ENTITLED secondary button shows "Request for Others" and "Manage Subscriptions"', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test pending data owner approval contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
            _type: V1_OrganizationalScopeType.AdHocTeam,
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resourceId: 'MOCK_SDLC_DATAPRODUCT',
          resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
          deploymentId: 11111,
          accessPointGroup: 'GROUP1',
        },
      ];

      const mockDataContracts: V1_DataContract[] = [
        {
          description: 'Test pending data owner approval contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
            _type: V1_OrganizationalScopeType.AdHocTeam,
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 12345,
              },
            },
          },
        },
      ];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockLiteContracts,
        mockDataContracts,
      );

      await screen.findByText('Main Group Test');
      const secondaryButton = await screen.findByTitle('More options');
      fireEvent.click(secondaryButton);

      await screen.findByText('Request Access for Others');
      screen.getByText('Manage Subscriptions');
    });

    test('displays ENTITLEMENTS SYNCING button when user is approved but not yet in consumer grants', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test approved contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resourceId: 'MOCK_SDLC_DATAPRODUCT',
          resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
          deploymentId: 11111,
          accessPointGroup: 'GROUP1',
        },
      ];

      const mockDataContracts: V1_DataContract[] = [
        {
          description: 'Test approved contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 12345,
              },
            },
          },
        },
      ];

      const { dataProductDataAccessState, dataProductViewerState } =
        await setupLakehouseDataProductTest(
          mockSDLCDataProduct,
          mockEntitlementsSDLCDataProduct,
          mockLiteContracts,
          mockDataContracts,
        );

      // Override the default consumer grants mock to return empty users
      createSpy(
        guaranteeNonNullable(dataProductDataAccessState)
          .lakehouseContractServerClient,
        'getConsumerGrantsByContractId',
      ).mockResolvedValue({
        contractId: 'test-approved-contract-id',
        accessPointGroups: [],
        users: [],
      });

      // Re-fetch to trigger the new mock
      await act(async () => {
        await guaranteeNonNullable(dataProductDataAccessState).fetchContracts(
          () => undefined,
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await screen.findByRole('button', { name: /ENTITLEMENTS SYNCING/ });

      // Cleanup: stop polling to prevent timer leaks
      dataProductViewerState.apgStates.forEach((s) =>
        s.stopPollingConsumerGrant(),
      );
    });

    test('displays ENTITLEMENTS SYNCING button when consumer grants response has no users array', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test approved contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resourceId: 'MOCK_SDLC_DATAPRODUCT',
          resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
          deploymentId: 11111,
          accessPointGroup: 'GROUP1',
        },
      ];

      const mockDataContracts: V1_DataContract[] = [
        {
          description: 'Test approved contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 12345,
              },
            },
          },
        },
      ];

      const { dataProductDataAccessState, dataProductViewerState } =
        await setupLakehouseDataProductTest(
          mockSDLCDataProduct,
          mockEntitlementsSDLCDataProduct,
          mockLiteContracts,
          mockDataContracts,
        );

      // Override to return response with no users array
      createSpy(
        guaranteeNonNullable(dataProductDataAccessState)
          .lakehouseContractServerClient,
        'getConsumerGrantsByContractId',
      ).mockResolvedValue({
        contractId: 'test-approved-contract-id',
        accessPointGroups: [],
      });

      // Re-fetch to trigger the new mock
      await act(async () => {
        await guaranteeNonNullable(dataProductDataAccessState).fetchContracts(
          () => undefined,
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await screen.findByRole('button', { name: /ENTITLEMENTS SYNCING/ });

      // Cleanup: stop polling to prevent timer leaks
      dataProductViewerState.apgStates.forEach((s) =>
        s.stopPollingConsumerGrant(),
      );
    });

    test('transitions from ENTITLEMENTS SYNCING to ENTITLED when polling returns user in consumer grants', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test approved contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resourceId: 'MOCK_SDLC_DATAPRODUCT',
          resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
          deploymentId: 11111,
          accessPointGroup: 'GROUP1',
        },
      ];

      const mockDataContracts: V1_DataContract[] = [
        {
          description: 'Test approved contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 12345,
              },
            },
          },
        },
      ];

      const { dataProductDataAccessState, dataProductViewerState } =
        await setupLakehouseDataProductTest(
          mockSDLCDataProduct,
          mockEntitlementsSDLCDataProduct,
          mockLiteContracts,
          mockDataContracts,
        );

      // First call return empty users (syncing). Second call returns the user.
      createSpy(
        guaranteeNonNullable(dataProductDataAccessState)
          .lakehouseContractServerClient,
        'getConsumerGrantsByContractId',
      )
        .mockResolvedValueOnce({
          contractId: 'test-approved-contract-id',
          accessPointGroups: [],
          users: [],
        })
        .mockResolvedValueOnce({
          contractId: 'test-approved-contract-id',
          accessPointGroups: [],
          users: [
            {
              username: 'test-consumer-user-id',
              contractId: 'test-approved-contract-id',
              targetAccount: 'test-account',
            },
          ],
        });

      // Re-fetch to trigger the new mock (with real timers)
      await act(async () => {
        await guaranteeNonNullable(dataProductDataAccessState).fetchContracts(
          () => undefined,
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Should show ENTITLEMENTS SYNCING initially
      await screen.findByRole('button', { name: /ENTITLEMENTS SYNCING/ });

      // Stop the existing polling timer (which uses a 5s real setTimeout)
      dataProductViewerState.apgStates.forEach((s) =>
        s.stopPollingConsumerGrant(),
      );

      // Directly trigger a poll on each APG state to simulate the next poll cycle.
      // The second mock response (with user) will be consumed.
      await act(async () => {
        await Promise.all(
          dataProductViewerState.apgStates.map((s) =>
            s.pollConsumerGrant(
              'test-approved-contract-id',
              guaranteeNonNullable(dataProductDataAccessState)
                .lakehouseContractServerClient,
              () => undefined,
            ),
          ),
        );
      });

      // After polling returns the user, should show ENTITLED
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'ENTITLED' })).toBeDefined();
      });

      // Cleanup: stop polling to prevent timer leaks
      dataProductViewerState.apgStates.forEach((s) =>
        s.stopPollingConsumerGrant(),
      );
    });

    test('displays ENTITLED with case-insensitive user matching', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test approved contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resourceId: 'MOCK_SDLC_DATAPRODUCT',
          resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
          deploymentId: 11111,
          accessPointGroup: 'GROUP1',
        },
      ];

      const mockDataContracts: V1_DataContract[] = [
        {
          description: 'Test approved contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 12345,
              },
            },
          },
        },
      ];

      const { dataProductDataAccessState } =
        await setupLakehouseDataProductTest(
          mockSDLCDataProduct,
          mockEntitlementsSDLCDataProduct,
          mockLiteContracts,
          mockDataContracts,
        );

      // Override to return user with different casing - should match case-insensitively
      createSpy(
        guaranteeNonNullable(dataProductDataAccessState)
          .lakehouseContractServerClient,
        'getConsumerGrantsByContractId',
      ).mockResolvedValue({
        contractId: 'test-approved-contract-id',
        accessPointGroups: [],
        users: [
          {
            username: 'TEST-CONSUMER-USER-ID',
            contractId: 'test-approved-contract-id',
            targetAccount: 'test-account',
          },
        ],
      });

      // Re-fetch to trigger the new mock
      await act(async () => {
        await guaranteeNonNullable(dataProductDataAccessState).fetchContracts(
          () => undefined,
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Should show ENTITLED because case-insensitive match finds the user
      await screen.findByRole('button', { name: 'ENTITLED' });
    });

    test('displays ENTITLED button when getConsumerGrantsByContractId returns 404', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test approved contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resourceId: 'MOCK_SDLC_DATAPRODUCT',
          resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
          deploymentId: 11111,
          accessPointGroup: 'GROUP1',
        },
      ];

      const mockDataContracts: V1_DataContract[] = [
        {
          description: 'Test approved contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 12345,
              },
            },
          },
        },
      ];

      const { dataProductDataAccessState } =
        await setupLakehouseDataProductTest(
          mockSDLCDataProduct,
          mockEntitlementsSDLCDataProduct,
          mockLiteContracts,
          mockDataContracts,
        );

      // Override to return a 404 error for consumer grants
      const notFoundError = new NetworkClientError(
        { status: HttpStatus.NOT_FOUND, statusText: 'Not Found' } as Response,
        undefined,
      );
      createSpy(
        guaranteeNonNullable(dataProductDataAccessState)
          .lakehouseContractServerClient,
        'getConsumerGrantsByContractId',
      ).mockRejectedValue(notFoundError);

      // Re-fetch to trigger the new mock
      await act(async () => {
        await guaranteeNonNullable(dataProductDataAccessState).fetchContracts(
          () => undefined,
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Should show ENTITLED (not ENTITLEMENTS SYNCING) because 404 means grants endpoint is not available
      await screen.findByRole('button', { name: 'ENTITLED' });
    });

    test('displays ENTERPRISE ACCESS for Access Point Group marked as Enterprise', async () => {
      await setupLakehouseDataProductTest(
        mockEnterpriseDataProduct,
        mockEntitlementsEnterpriseDataProduct,
        [],
        [],
      );

      await screen.findByRole('button', { name: 'ENTERPRISE ACCESS' });
    });

    test('ENTERPRISE ACCESS secondary button shows "Request for Others" and "Manage Subscriptions"', async () => {
      await setupLakehouseDataProductTest(
        mockEnterpriseDataProduct,
        mockEntitlementsEnterpriseDataProduct,
        [],
        [],
      );

      await screen.findByText('ENTERPRISE_GROUP');
      const secondaryButton = await screen.findByTitle('More options');
      fireEvent.click(secondaryButton);

      await screen.findByText('Request Access for Others');
      screen.getByText('Manage Subscriptions');
    });

    test('Request Access for Others button opens create contract modal', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test pending data owner approval contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resourceId: 'MOCK_SDLC_DATAPRODUCT',
          resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
          deploymentId: 11111,
          accessPointGroup: 'GROUP1',
        },
      ];

      const mockDataContracts: V1_DataContract[] = [
        {
          description: 'Test pending data owner approval contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 12345,
              },
            },
          },
        },
      ];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockLiteContracts,
        mockDataContracts,
      );

      await screen.findByText('Main Group Test');
      const secondaryButton = await screen.findByTitle('More options');
      fireEvent.click(secondaryButton);

      const requestForOthersButton = await screen.findByText(
        'Request Access for Others',
      );
      fireEvent.click(requestForOthersButton);

      await screen.findByText('Data Contract Request');
      screen.getByRole('button', { name: 'User' });
      screen.getByRole('button', { name: 'System Account' });
    });

    test('On enterprise APG, Request Access for Others button opens create contract modal for only system account', async () => {
      await setupLakehouseDataProductTest(
        mockEnterpriseDataProduct,
        mockEntitlementsEnterpriseDataProduct,
        [],
        [],
      );

      await screen.findByText('ENTERPRISE_GROUP');
      const secondaryButton = await screen.findByTitle('More options');
      fireEvent.click(secondaryButton);

      const requestForOthersButton = await screen.findByText(
        'Request Access for Others',
      );
      fireEvent.click(requestForOthersButton);

      await screen.findByText('Data Contract Request');
      await screen.findByRole('button', { name: 'System Account' });
      expect(screen.queryByRole('button', { name: 'User' })).toBeNull();
      screen.getByText(
        'Note: Enterprise APGs only require contracts for System Accounts. Regular users do not need to request access.',
      );
    });

    test('displays disabled UNKNOWN button when no DataProductDataAccessState is provided', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [];
      const mockDataContracts: V1_DataContract[] = [];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        undefined,
        mockLiteContracts,
        mockDataContracts,
      );

      const button = await screen.findByRole('button', { name: 'UNKNOWN' });
      expect(button.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('Subscriptions', () => {
    beforeEach(() => {
      jest
        .spyOn(window, 'requestAnimationFrame')
        .mockImplementation((callback: FrameRequestCallback) => {
          callback(performance.now());
          return 0;
        });
      jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('Manage Subscriptions button opens subscriptions modal', async () => {
      await setupLakehouseDataProductTest(
        mockEnterpriseDataProduct,
        mockEntitlementsEnterpriseDataProduct,
        [],
        [],
      );

      await screen.findByText('ENTERPRISE_GROUP');
      const secondaryButton = await screen.findByTitle('More options');
      fireEvent.click(secondaryButton);

      const manageSubscriptionsButton = await screen.findByText(
        'Manage Subscriptions',
      );
      fireEvent.click(manageSubscriptionsButton);

      await screen.findByText('Data Product Subscriptions');
    });

    test('fetches subscriptions only when the modal is first opened', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test approved contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resourceId: 'MOCK_SDLC_DATAPRODUCT',
          resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
          deploymentId: 11111,
          accessPointGroup: 'GROUP1',
        },
      ];

      const mockDataContracts: V1_DataContract[] = [
        {
          description: 'Test approved contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 12345,
              },
            },
          },
        },
      ];

      const { dataProductDataAccessState } =
        await setupLakehouseDataProductTest(
          mockSDLCDataProduct,
          mockEntitlementsSDLCDataProduct,
          mockLiteContracts,
          mockDataContracts,
        );

      const getSubscriptionsForContractSpy = createSpy(
        guaranteeNonNullable(dataProductDataAccessState)
          .lakehouseContractServerClient,
        'getSubscriptionsForContract',
      ).mockResolvedValue([]);

      expect(getSubscriptionsForContractSpy).not.toHaveBeenCalled();

      await screen.findByText('Main Group Test');
      fireEvent.click(await screen.findByTitle('More options'));
      fireEvent.click(await screen.findByText('Manage Subscriptions'));

      await screen.findByText('Data Product Subscriptions');
      await waitFor(() => {
        expect(getSubscriptionsForContractSpy).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Contract fetch optimization', () => {
    test('fetches the full contract only for the user contract returned by getContractsForUser', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test approved contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resourceId: 'MOCK_SDLC_DATAPRODUCT',
          resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
          deploymentId: 11111,
          accessPointGroup: 'GROUP1',
        },
        {
          description: 'Test system account contract',
          guid: 'test-system-account-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-system-account',
                type: V1_UserType.SYSTEM_ACCOUNT,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resourceId: 'MOCK_SDLC_DATAPRODUCT',
          resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
          deploymentId: 11111,
          accessPointGroup: 'GROUP1',
        },
      ];

      const mockDataContracts: V1_DataContract[] = [
        {
          description: 'Test approved contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 12345,
              },
            },
          },
        },
        {
          description: 'Test system account contract',
          guid: 'test-system-account-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-system-account',
                type: V1_UserType.SYSTEM_ACCOUNT,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 12345,
              },
            },
          },
        },
      ];

      const { dataProductDataAccessState } =
        await setupLakehouseDataProductTest(
          mockSDLCDataProduct,
          mockEntitlementsSDLCDataProduct,
          mockLiteContracts,
          mockDataContracts,
        );

      const getDataContractSpy = createSpy(
        guaranteeNonNullable(dataProductDataAccessState)
          .lakehouseContractServerClient,
        'getDataContract',
      ).mockImplementation(async (id: string) => {
        const matchingContract = mockDataContracts.find(
          (_contract) => _contract.guid === id,
        );
        return {
          dataContracts: matchingContract
            ? [{ dataContract: matchingContract }]
            : [],
        };
      });

      await act(async () => {
        await guaranteeNonNullable(dataProductDataAccessState).fetchContracts(
          () => undefined,
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(getDataContractSpy).toHaveBeenCalledWith(
        'test-approved-contract-id',
        true,
        undefined,
      );
      expect(getDataContractSpy).not.toHaveBeenCalledWith(
        'test-system-account-contract-id',
        true,
        undefined,
      );
    });

    test('does not pick up user contract from a different data product with the same access point group', async () => {
      // Lite contract returned by `getDataContractsForDataProduct` (already
      // scoped to the current data product) - none for the current user.
      const mockLiteContracts: V1_LiteDataContract[] = [];

      // The user has a contract for a *different* data product but with the
      // same access point group name. This contract is what
      // `getContractsForUser` will return.
      const otherDataProductUserContract: V1_LiteDataContract = {
        description: 'User contract for a different data product',
        guid: 'other-data-product-user-contract-id',
        version: 0,
        state: V1_ContractState.COMPLETED,
        members: [],
        consumer: {
          _type: V1_OrganizationalScopeType.AdHocTeam,
          users: [
            {
              name: 'test-consumer-user-id',
              type: V1_UserType.WORKFORCE_USER,
            },
          ],
        },
        createdBy: 'test-user',
        createdAt: '2025-12-22T15:18:41.998+00:00',
        resourceId: 'OTHER_DATAPRODUCT',
        resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
        deploymentId: 99999,
        accessPointGroup: 'GROUP1',
      };

      const mockDataContracts: V1_DataContract[] = [];

      const { dataProductDataAccessState } =
        await setupLakehouseDataProductTest(
          mockSDLCDataProduct,
          mockEntitlementsSDLCDataProduct,
          mockLiteContracts,
          mockDataContracts,
        );

      const lakehouseContractServerClient = guaranteeNonNullable(
        dataProductDataAccessState,
      ).lakehouseContractServerClient;

      // Override `getContractsForUser` to return the contract belonging to a
      // different data product but with a matching access point group name.
      createSpy(
        lakehouseContractServerClient,
        'getContractsForUser',
      ).mockResolvedValue([
        {
          contractResultLite: otherDataProductUserContract,
          status: V1_EnrichedUserApprovalStatus.APPROVED,
          user: 'test-consumer-user-id',
        },
      ]);

      const getDataContractSpy = createSpy(
        lakehouseContractServerClient,
        'getDataContract',
      ).mockResolvedValue({ dataContracts: [] });

      await act(async () => {
        await guaranteeNonNullable(dataProductDataAccessState).fetchContracts(
          () => undefined,
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // The user's contract belongs to a different data product, so we should
      // NOT fetch the full contract for it.
      expect(getDataContractSpy).not.toHaveBeenCalledWith(
        'other-data-product-user-contract-id',
        true,
        undefined,
      );

      // No associated user contract should have been resolved for any APG of
      // the current data product.
      const apgStates = guaranteeNonNullable(dataProductDataAccessState)
        .dataProductViewerState.apgStates;
      apgStates.forEach((apgState) => {
        expect(apgState.associatedUserContract).toBeUndefined();
      });
    });
  });

  describe('Support info rendering', () => {
    test('Renders support info correctly', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      await screen.findByText('Support');

      // Confirm all emails render
      await screen.findByText('Person 1 Email');
      screen.getByText('Person 2 Email');

      // Confirm support info with label renders label
      screen.getByText('Documentation Link Label');

      // Confirm support info without label renders URL
      screen.getByText('https://example-website.com');
    });

    test('Renders placeholder if no support info is available', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProductNoSupportInfo,
        mockEntitlementsSDLCDataProductNoSupportInfo,
        [],
        [],
      );

      await screen.findByText('Support');

      await screen.findByText('(support information not specified)');
    });
  });

  describe('Registry metadata (ADS/PDE tags)', () => {
    test('Displays ADS tag when access point has ads=true in registry metadata', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      if (dataProductViewerState.registryServerClient) {
        createSpy(
          dataProductViewerState.registryServerClient,
          'getRegistrationMetadata',
        ).mockResolvedValue({
          id: 'test-registry-id',
          ads: true,
          pde: false,
        });
      }
      await act(async () => {
        await dataProductViewerState.apgStates[0]?.accessPointStates[0]?.fetchRegistryMetadata();
      });

      await screen.findByText('Customer Demographics');
      const adsChip = await screen.findByTitle('Authorized Data Source');
      expect(adsChip.textContent).toBe('ADS');
    });

    test('Displays PDE tag when access point has pde=true in registry metadata', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      if (dataProductViewerState.registryServerClient) {
        createSpy(
          dataProductViewerState.registryServerClient,
          'getRegistrationMetadata',
        ).mockResolvedValue({
          id: 'test-registry-id',
          ads: false,
          pde: true,
        });
      }
      await act(async () => {
        await dataProductViewerState.apgStates[0]?.accessPointStates[0]?.fetchRegistryMetadata();
      });

      await screen.findByText('Customer Demographics');
      const pdeChip = await screen.findByTitle('Point of Data Entry');
      expect(pdeChip.textContent).toBe('PDE');
    });

    test('Displays both ADS and PDE tags when access point has both in registry metadata', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      if (dataProductViewerState.registryServerClient) {
        createSpy(
          dataProductViewerState.registryServerClient,
          'getRegistrationMetadata',
        ).mockResolvedValue({
          id: 'test-registry-id',
          ads: true,
          pde: true,
        });
      }
      await act(async () => {
        await dataProductViewerState.apgStates[0]?.accessPointStates[0]?.fetchRegistryMetadata();
      });

      await screen.findByText('Customer Demographics');
      const adsChip = await screen.findByTitle('Authorized Data Source');
      expect(adsChip.textContent).toBe('ADS');
      const pdeChip = screen.getByTitle('Point of Data Entry');
      expect(pdeChip.textContent).toBe('PDE');
    });

    test('Does not display tags when access point has ads=false and pde=false in registry metadata', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      await screen.findByText('Customer Demographics');
      expect(screen.queryByTitle('Authorized Data Source')).toBeNull();
      expect(screen.queryByTitle('Point of Data Entry')).toBeNull();
    });

    test('Does not display tags when registry metadata fetch fails', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      if (dataProductViewerState.registryServerClient) {
        createSpy(
          dataProductViewerState.registryServerClient,
          'getRegistrationMetadata',
        ).mockRejectedValue(new Error('Registry fetch failed'));
      }
      await act(async () => {
        await dataProductViewerState.apgStates[0]?.accessPointStates[0]?.fetchRegistryMetadata();
      });

      await screen.findByText('Customer Demographics');
      expect(screen.queryByTitle('Authorized Data Source')).toBeNull();
      expect(screen.queryByTitle('Point of Data Entry')).toBeNull();
    });

    test('Handles registry server client being undefined gracefully', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      (
        dataProductViewerState as { registryServerClient?: unknown }
      ).registryServerClient = undefined;
      await act(async () => {
        await dataProductViewerState.apgStates[0]?.accessPointStates[0]?.fetchRegistryMetadata();
      });

      await screen.findByText('Customer Demographics');
      expect(screen.queryByTitle('Authorized Data Source')).toBeNull();
      expect(screen.queryByTitle('Point of Data Entry')).toBeNull();
    });
  });

  describe('Governance with registry metadata', () => {
    test('Shows governance tab message when registry metadata id is missing', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        {
          groupId: 'test.group',
          artifactId: 'test-artifact',
          versionId: '1.0.0',
        },
      );

      if (dataProductViewerState.registryServerClient) {
        createSpy(
          dataProductViewerState.registryServerClient,
          'getRegistrationMetadata',
        ).mockResolvedValue({
          id: undefined,
          ads: false,
          pde: false,
        });
      }
      await act(async () => {
        await dataProductViewerState.apgStates[0]?.accessPointStates[0]?.fetchRegistryMetadata();
      });

      await screen.findByText('Customer Demographics');
      const governanceTab = await screen.findByRole('tab', {
        name: 'Governance',
      });
      fireEvent.click(governanceTab);
      await screen.findByText(
        'Governance has not been registered for this access point',
      );
    });

    test('Shows governance tab message when registry metadata is not fetched', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        {
          groupId: 'test.group',
          artifactId: 'test-artifact',
          versionId: '1.0.0',
        },
      );

      if (dataProductViewerState.registryServerClient) {
        createSpy(
          dataProductViewerState.registryServerClient,
          'getRegistrationMetadata',
        ).mockRejectedValue(new Error('Failed to fetch'));
      }
      await act(async () => {
        await dataProductViewerState.apgStates[0]?.accessPointStates[0]?.fetchRegistryMetadata();
      });

      await screen.findByText('Customer Demographics');
      const governanceTab = await screen.findByRole('tab', {
        name: 'Governance',
      });
      fireEvent.click(governanceTab);
      await screen.findByText(
        'Governance has not been registered for this access point',
      );
    });

    test('Shows governance tab message for AdHoc Data Products', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsAdHocDataProduct,
        [],
        [],
      );

      await screen.findByText('Customer Demographics');
      const governanceTab = await screen.findByRole('tab', {
        name: 'Governance',
      });
      fireEvent.click(governanceTab);
      await screen.findByText(
        'Governance not supported for Adhoc Data Products',
      );
    });

    test('Shows Open Governance Details and Open Lineage Viewer buttons when registry metadata is available', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        {
          groupId: 'test.group',
          artifactId: 'test-artifact',
          versionId: '1.0.0',
        },
      );

      if (dataProductViewerState.registryServerClient) {
        createSpy(
          dataProductViewerState.registryServerClient,
          'getRegistrationMetadata',
        ).mockResolvedValue({
          id: 'test-registry-id-123',
          ads: true,
          pde: false,
        });
      }
      await act(async () => {
        await dataProductViewerState.apgStates[0]?.accessPointStates[0]?.fetchRegistryMetadata();
      });

      await screen.findByText('Customer Demographics');
      const governanceTab = await screen.findByRole('tab', {
        name: 'Governance',
      });
      fireEvent.click(governanceTab);

      // Both buttons should be present
      await screen.findByRole('button', { name: 'Open Governance Details' });
      await screen.findByRole('button', { name: 'Open Lineage Viewer' });

      //click governance
      const openGovernanceButton = await screen.findByRole('button', {
        name: 'Open Governance Details',
      });
      fireEvent.click(openGovernanceButton);

      expect(dataProductViewerState.openGovernance).toHaveBeenCalledWith(
        'test-registry-id-123',
      );

      //click lineage
      const openLineageButton = await screen.findByRole('button', {
        name: 'Open Lineage Viewer',
      });
      fireEvent.click(openLineageButton);

      expect(dataProductViewerState.openLineage).toHaveBeenCalledWith(
        'Mock_SDLC_DataProduct',
        'customer_demographics',
      );
    });

    test('Open Governance Details button is disabled when openGovernance function is not configured', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        {
          groupId: 'test.group',
          artifactId: 'test-artifact',
          versionId: '1.0.0',
        },
      );

      // Clear the openGovernance function to simulate it not being configured
      (dataProductViewerState as { openGovernance: undefined }).openGovernance =
        undefined;

      if (dataProductViewerState.registryServerClient) {
        createSpy(
          dataProductViewerState.registryServerClient,
          'getRegistrationMetadata',
        ).mockResolvedValue({
          id: 'test-registry-id-123',
          ads: true,
          pde: false,
        });
      }
      await act(async () => {
        await dataProductViewerState.apgStates[0]?.accessPointStates[0]?.fetchRegistryMetadata();
      });

      await screen.findByText('Customer Demographics');
      const governanceTab = await screen.findByRole('tab', {
        name: 'Governance',
      });
      fireEvent.click(governanceTab);

      const openGovernanceButton = await screen.findByRole('button', {
        name: 'Open Governance Details',
      });
      expect((openGovernanceButton as HTMLButtonElement).disabled).toBe(true);
      expect(
        (openGovernanceButton as HTMLButtonElement).getAttribute('title'),
      ).toBe('Governance not configured');
    });

    test('Open Lineage Viewer button is disabled when openLineage function is not configured', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        {
          groupId: 'test.group',
          artifactId: 'test-artifact',
          versionId: '1.0.0',
        },
      );

      // Clear the openLineage function to simulate it not being configured
      (dataProductViewerState as { openLineage: undefined }).openLineage =
        undefined;

      if (dataProductViewerState.registryServerClient) {
        createSpy(
          dataProductViewerState.registryServerClient,
          'getRegistrationMetadata',
        ).mockResolvedValue({
          id: 'test-registry-id-123',
          ads: true,
          pde: false,
        });
      }
      await act(async () => {
        await dataProductViewerState.apgStates[0]?.accessPointStates[0]?.fetchRegistryMetadata();
      });

      await screen.findByText('Customer Demographics');
      const governanceTab = await screen.findByRole('tab', {
        name: 'Governance',
      });
      fireEvent.click(governanceTab);

      const openLineageButton = await screen.findByRole('button', {
        name: 'Open Lineage Viewer',
      });

      expect((openLineageButton as HTMLButtonElement).disabled).toBe(true);
      expect(
        (openLineageButton as HTMLButtonElement).getAttribute('title'),
      ).toBe('Lineage not configured');
    });
  });

  describe('Auto-collapse threshold', () => {
    test('Below threshold: APGs and APs are expanded', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      // Verify state is expanded
      expect(dataProductViewerState.apgStates[0]?.isCollapsed).toBe(false);
      expect(
        dataProductViewerState.apgStates[0]?.accessPointStates[0]?.isCollapsed,
      ).toBe(false);

      // Verify component rendering
      await screen.findByText('Mock SDLC Data Product');
      await screen.findByText('Main Group Test');
      await screen.findByText('Customer Demographics');
    });

    test('Above threshold, 1 APG: APG expanded, APs collapsed', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockLargeSDLCDataProduct,
        mockEntitlementsLargeSDLCDataProduct,
        [],
        [],
      );

      // Verify APG is expanded
      expect(dataProductViewerState.apgStates[0]?.isCollapsed).toBe(false);

      // Verify all APs are collapsed
      dataProductViewerState.apgStates[0]?.accessPointStates.forEach((ap) => {
        expect(ap.isCollapsed).toBe(true);
      });

      // Verify APG title is visible
      await screen.findByText('Large Group');
      // Verify APs titles are visible (MUI Accordion Summary renders them even if collapsed)
      await screen.findByText('Access Point 1');
      await screen.findByText('Access Point 21');

      // Verify AP details content isn't visible
      expect(screen.queryAllByText('Column Name').length).toBe(0);
    });

    test('Above threshold, >1 APG: all APGs collapsed', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockMultiGroupLargeSDLCDataProduct,
        mockEntitlementsMultiGroupLargeSDLCDataProduct,
        [],
        [],
      );

      // Verify all APGs are collapsed
      expect(dataProductViewerState.apgStates[0]?.isCollapsed).toBe(true);
      expect(dataProductViewerState.apgStates[1]?.isCollapsed).toBe(true);

      // Verify APG titles are visible
      await screen.findByText('Group A');
      await screen.findByText('Group B');

      // Verify APs are not visible because the APG is collapsed and content is not rendered
      expect(screen.queryByText('Access Point 1')).toBeNull();
    });

    test('Expanding a collapsed APG shows collapsed APs', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockMultiGroupLargeSDLCDataProduct,
        mockEntitlementsMultiGroupLargeSDLCDataProduct,
        [],
        [],
      );

      // APG starts collapsed, APs are not visible
      expect(screen.queryByText('Access Point 1')).toBeNull();

      // Find the expand button for the first APG and click it
      const expandButtons = await screen.findAllByRole('button', {
        name: 'Expand',
      });
      fireEvent.click(expandButtons[0] as HTMLElement);

      // Now APG should be expanded, and APs should be visible (but titles only, details collapsed)
      expect(dataProductViewerState.apgStates[0]?.isCollapsed).toBe(false);
      await screen.findByText('Access Point 1');

      // APs are collapsed by default in this case
      expect(
        dataProductViewerState.apgStates[0]?.accessPointStates[0]?.isCollapsed,
      ).toBe(true);
    });
  });

  describe('Search text filtering', () => {
    test('Empty search text returns all APG states', async () => {
      await setupLakehouseDataProductTest(
        mockMultiGroupLargeSDLCDataProduct,
        mockEntitlementsMultiGroupLargeSDLCDataProduct,
        [],
        [],
      );

      await screen.findByText('Group A');
      await screen.findByText('Group B');
    });

    test('Search text by APG ID filters correctly', async () => {
      await setupLakehouseDataProductTest(
        mockMultiGroupLargeSDLCDataProduct,
        mockEntitlementsMultiGroupLargeSDLCDataProduct,
        [],
        [],
      );

      const searchInput = await screen.findByPlaceholderText(
        'Filter access point groups/access points...',
      );
      fireEvent.change(searchInput, { target: { value: 'MULTI_GROUP_A' } });

      await screen.findByText('Group A');
      expect(screen.queryByText('Group B')).toBeNull();
      fireEvent.change(searchInput, { target: { value: 'MULTI_GROUP_B' } });

      await screen.findByText('Group B');
      expect(screen.queryByText('Group A')).toBeNull();
    });

    test('Search text by AP title filters correctly', async () => {
      await setupLakehouseDataProductTest(
        mockMultiGroupLargeSDLCDataProduct,
        mockEntitlementsMultiGroupLargeSDLCDataProduct,
        [],
        [],
      );

      // Searching for 'group_b_ap_1'
      const searchInput = await screen.findByPlaceholderText(
        'Filter access point groups/access points...',
      );
      fireEvent.change(searchInput, { target: { value: 'group_b_ap_1' } });

      await screen.findByText('Group B');
      expect(screen.queryByText('Group A')).toBeNull();
    });

    test('Search text with no matches returns empty', async () => {
      await setupLakehouseDataProductTest(
        mockMultiGroupLargeSDLCDataProduct,
        mockEntitlementsMultiGroupLargeSDLCDataProduct,
        [],
        [],
      );

      const searchInput = await screen.findByPlaceholderText(
        'Filter access point groups/access points...',
      );
      fireEvent.change(searchInput, {
        target: { value: 'nonexistent_search_query' },
      });

      expect(screen.queryByText('Group A')).toBeNull();
      expect(screen.queryByText('Group B')).toBeNull();
    });
  });

  describe('Deferred initialization', () => {
    test('Data is fetched only when the respective tab is selected', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockMultiGroupLargeSDLCDataProduct,
        mockEntitlementsMultiGroupLargeSDLCDataProduct,
        [],
        [],
      );

      const apgState = dataProductViewerState
        .apgStates[0] as DataProductAPGState;
      const apState = apgState
        .accessPointStates[0] as DataProductAccessPointState;

      // Ensure that we have a promise set up by init
      act(() => {
        dataProductViewerState.dataProductArtifactPromise =
          Promise.resolve(undefined);
      });

      // Mock the fetches to return a promise that never resolves.
      // This prevents the UI from actually attempting to render the result (like CodeEditor or DataGrid),
      // which might crash in the mocked JSDOM environment, while still allowing us to verify the method was called.
      const fetchRelationTypeSpy = jest
        .spyOn(apState, 'fetchRelationType')
        .mockImplementation(() => {
          apState.fetchingRelationTypeState.inProgress();
          return new Promise(() => {});
        });
      const fetchGrammarSpy = jest
        .spyOn(apState, 'fetchGrammar')
        .mockImplementation(() => {
          apState.fetchingGrammarState.inProgress();
          return new Promise(() => {});
        });
      const fetchRegistryMetadataSpy = jest
        .spyOn(apState, 'fetchRegistryMetadata')
        .mockImplementation(() => {
          apState.fetchingRegistryMetadataState.inProgress();
          return new Promise(() => {});
        });

      // Find the expand button for the first APG and click it
      const expandAPGButtons = await screen.findAllByRole('button', {
        name: 'Expand',
      });
      await act(async () => {
        fireEvent.click(expandAPGButtons[0] as HTMLElement);
      });

      // Expand the first Access Point
      const apSummary = await screen.findByText('Access Point 1');
      await act(async () => {
        fireEvent.click(apSummary);
      });

      // Assert that Columns tab fetch happens immediately (default tab)
      await waitFor(() => {
        expect(fetchRelationTypeSpy).toHaveBeenCalledTimes(1);
      });

      // Grammar and Governance fetches should not have been called yet
      expect(fetchGrammarSpy).not.toHaveBeenCalled();
      expect(fetchRegistryMetadataSpy).not.toHaveBeenCalled();

      // Click on Grammar tab
      const grammarTab = await screen.findByText('Grammar');
      await act(async () => {
        fireEvent.click(grammarTab);
      });

      // Assert that Grammar fetch happens
      await waitFor(() => {
        expect(fetchGrammarSpy).toHaveBeenCalledTimes(1);
      });
      expect(fetchRegistryMetadataSpy).not.toHaveBeenCalled();

      // Click on Governance tab
      const governanceTab = await screen.findByText('Governance');
      await act(async () => {
        fireEvent.click(governanceTab);
      });

      // Assert that Governance fetch happens
      await waitFor(() => {
        expect(fetchRegistryMetadataSpy).toHaveBeenCalledTimes(1);
      });

      // Ensure they were all called exactly once despite interacting with tabs again
      await act(async () => {
        fireEvent.click(await screen.findByText('Column Specifications'));
      });
      await act(async () => {
        fireEvent.click(await screen.findByText('Grammar'));
      });
      await act(async () => {
        fireEvent.click(await screen.findByText('Governance'));
      });

      expect(fetchRelationTypeSpy).toHaveBeenCalledTimes(1);
      expect(fetchGrammarSpy).toHaveBeenCalledTimes(1);
      expect(fetchRegistryMetadataSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('toggleAllApgGroupCollapse', () => {
    test('Collapses all and expands all filtered APGs', async () => {
      await setupLakehouseDataProductTest(
        mockMultiGroupLargeSDLCDataProduct,
        mockEntitlementsMultiGroupLargeSDLCDataProduct,
        [],
        [],
      );

      // Starts all collapsed (APs are not visible)
      expect(screen.queryAllByText('Access Point 1').length).toBe(0);

      // Click Expand All
      const toggleAllBtn = await screen.findByRole('button', {
        name: 'Expand All',
      });
      act(() => {
        fireEvent.click(toggleAllBtn);
      });

      // Now all should be expanded
      const ap1s = await screen.findAllByText('Access Point 1');
      expect(ap1s.length).toBe(2); // One in each group

      // Click Collapse All
      const toggleAllBtnCollapse = await screen.findByRole('button', {
        name: 'Collapse All',
      });
      act(() => {
        fireEvent.click(toggleAllBtnCollapse);
      });

      // Now all should be collapsed again
      expect(screen.queryAllByText('Access Point 1').length).toBe(0);
    }, 60000);
  });

  describe('fetchSampleData logic', () => {
    test('uses engine result when both engine and artifact promises resolve successfully', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockMultiGroupLargeSDLCDataProduct,
        mockEntitlementsMultiGroupLargeSDLCDataProduct,
        [],
        [],
      );
      const apState = dataProductViewerState.apgStates[0]
        ?.accessPointStates[0] as DataProductAccessPointState;

      const engineEle = {
        _type: 'relationElement',
        columns: ['engine_col'],
      } as unknown as V1_RelationElement;
      const artifactEle = {
        _type: 'relationElement',
        columns: ['artifact_col'],
      } as unknown as V1_RelationElement;

      jest
        .spyOn(apState, 'fetchSampleDataFromEngine')
        .mockResolvedValue(engineEle);
      jest
        .spyOn(apState, 'fetchSampleDataFromArtifact')
        .mockResolvedValue(artifactEle);

      expect(apState.fetchingSampleDataState.isInInitialState).toBe(true);

      await apState.fetchSampleData(
        Promise.resolve(undefined),
        'test-env-name',
      );

      expect(apState.relationElement).toEqual(engineEle);
    });

    test('uses artifact result when engine promise fails but artifact promise resolves successfully', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockMultiGroupLargeSDLCDataProduct,
        mockEntitlementsMultiGroupLargeSDLCDataProduct,
        [],
        [],
      );
      const apState = dataProductViewerState.apgStates[0]
        ?.accessPointStates[0] as DataProductAccessPointState;

      const artifactEle = {
        _type: 'relationElement',
        columns: ['artifact_col'],
      } as unknown as V1_RelationElement;

      jest
        .spyOn(apState, 'fetchSampleDataFromEngine')
        .mockRejectedValue(new Error('Engine failed'));
      jest
        .spyOn(apState, 'fetchSampleDataFromArtifact')
        .mockResolvedValue(artifactEle);

      await apState.fetchSampleData(
        Promise.resolve(undefined),
        'test-env-name',
      );

      expect(apState.relationElement).toEqual(artifactEle);
    });

    test('only requests engine if artifact promise is not provided', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockMultiGroupLargeSDLCDataProduct,
        mockEntitlementsMultiGroupLargeSDLCDataProduct,
        [],
        [],
      );
      const apState = dataProductViewerState.apgStates[0]
        ?.accessPointStates[0] as DataProductAccessPointState;

      const engineEle = {
        _type: 'relationElement',
        columns: ['engine_col'],
      } as unknown as V1_RelationElement;

      const engineSpy = jest
        .spyOn(apState, 'fetchSampleDataFromEngine')
        .mockResolvedValue(engineEle);
      const artifactSpy = jest.spyOn(apState, 'fetchSampleDataFromArtifact');

      await apState.fetchSampleData(undefined, 'test-env-name');

      expect(apState.relationElement).toEqual(engineEle);
      expect(engineSpy).toHaveBeenCalledWith('test-env-name');
      expect(artifactSpy).not.toHaveBeenCalled();
    });

    test('only requests artifact if resolvedUserEnv is not provided', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockMultiGroupLargeSDLCDataProduct,
        mockEntitlementsMultiGroupLargeSDLCDataProduct,
        [],
        [],
      );
      const apState = dataProductViewerState.apgStates[0]
        ?.accessPointStates[0] as DataProductAccessPointState;

      const artifactEle = {
        _type: 'relationElement',
        columns: ['artifact_col'],
      } as unknown as V1_RelationElement;

      const engineSpy = jest.spyOn(apState, 'fetchSampleDataFromEngine');
      const artifactSpy = jest
        .spyOn(apState, 'fetchSampleDataFromArtifact')
        .mockResolvedValue(artifactEle);

      await apState.fetchSampleData(Promise.resolve(undefined), undefined);

      expect(apState.relationElement).toEqual(artifactEle);
      expect(artifactSpy).toHaveBeenCalled();
      expect(engineSpy).not.toHaveBeenCalled();
    });
  });

  describe('LegendQueryScreen', () => {
    test('shows "Not Supported" when dataAccessState is undefined', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        undefined,
        [],
        [],
        undefined,
        undefined,
        { openQuery: jest.fn() },
      );

      await screen.findByText('Customer Demographics');

      // Click on the Query tab
      const queryTab = await screen.findByRole('tab', { name: 'Query' });
      await act(async () => {
        fireEvent.click(queryTab);
      });

      await screen.findByText(NOT_SUPPORTED);
    });

    test('shows "Work in progress" for ad-hoc data product origin', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsAdHocDataProduct,
        [],
        [],
        undefined,
        undefined,
        { openQuery: jest.fn() },
      );

      await screen.findByText('Customer Demographics');

      const queryTab = await screen.findByRole('tab', { name: 'Query' });
      await act(async () => {
        fireEvent.click(queryTab);
      });

      await screen.findByText(WORK_IN_PROGRESS);
    });

    test('shows "Work in progress" when openQuery action is not provided', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      await screen.findByText('Customer Demographics');

      const queryTab = await screen.findByRole('tab', { name: 'Query' });
      await act(async () => {
        fireEvent.click(queryTab);
      });

      await screen.findByText(WORK_IN_PROGRESS);
    });

    test('renders "Open in Legend Query" button for SDLC data product with openQuery provided', async () => {
      const mockOpenQuery = jest.fn();
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        undefined,
        undefined,
        { openQuery: mockOpenQuery },
      );

      await screen.findByText('Customer Demographics');

      const queryTab = await screen.findByRole('tab', { name: 'Query' });
      await act(async () => {
        fireEvent.click(queryTab);
      });

      const openButton = await screen.findByRole('button', {
        name: 'Open in Legend Query',
      });
      expect(openButton).toBeDefined();
    });

    test('clicking "Open in Legend Query" calls openQuery with correct parameters', async () => {
      const mockOpenQuery = jest.fn();
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        undefined,
        undefined,
        { openQuery: mockOpenQuery },
      );

      await screen.findByText('Customer Demographics');

      const queryTab = await screen.findByRole('tab', { name: 'Query' });
      await act(async () => {
        fireEvent.click(queryTab);
      });

      const openButton = await screen.findByRole('button', {
        name: 'Open in Legend Query',
      });
      await act(async () => {
        fireEvent.click(openButton);
      });

      expect(mockOpenQuery).toHaveBeenCalledWith(
        {
          groupId: 'com.example.analytics',
          artifactId: 'customer-analytics',
          versionId: '1.2.0',
        },
        DataProductAccessType.LAKEHOUSE,
        'customer_demographics',
      );
    });

    test('handles error thrown by openQuery gracefully', async () => {
      const mockOpenQuery = jest.fn().mockImplementation(() => {
        throw new Error('Query open failed');
      });
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        undefined,
        undefined,
        { openQuery: mockOpenQuery },
      );

      const notifyErrorSpy = jest.spyOn(
        dataProductViewerState.applicationStore.notificationService,
        'notifyError',
      );

      await screen.findByText('Customer Demographics');

      const queryTab = await screen.findByRole('tab', { name: 'Query' });
      await act(async () => {
        fireEvent.click(queryTab);
      });

      const openButton = await screen.findByRole('button', {
        name: 'Open in Legend Query',
      });
      await act(async () => {
        fireEvent.click(openButton);
      });

      expect(mockOpenQuery).toHaveBeenCalled();
      expect(notifyErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Sample Queries — Open in Query', () => {
    test('"Open in Query" button is disabled when openSampleQuery is not provided', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        { groupId: 'com.example', artifactId: 'test', versionId: '1.0.0' },
      );

      await act(async () => {
        await dataProductViewerState.dataProductArtifactPromise;
        dataProductViewerState.dataProductArtifact =
          buildMockDataProductArtifactWithSampleQueries();
      });

      // Confirm sample queries rendered
      await screen.findByText('Sample TDS Query', {}, { timeout: 10000 });

      // Navigate to the "Query" tab within the sample query card
      const queryButtons = await screen.findAllByRole('button', {
        name: 'Query',
      });

      const sampleQueryTabButtons = queryButtons.filter(
        (btn) => btn.getAttribute('role') !== 'tab',
      );
      expect(sampleQueryTabButtons.length).toBeGreaterThan(0);
      await act(async () => {
        fireEvent.click(sampleQueryTabButtons[0] as HTMLElement);
      });

      const openInQueryButton = await screen.findByRole('button', {
        name: 'Open in Query',
      });
      expect((openInQueryButton as HTMLButtonElement).disabled).toBe(true);
    });

    test('"Open in Query" button is enabled when openSampleQuery is provided', async () => {
      const mockOpenSampleQuery = jest.fn();
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        { groupId: 'com.example', artifactId: 'test', versionId: '1.0.0' },
        undefined,
        { openSampleQuery: mockOpenSampleQuery },
      );

      await act(async () => {
        await dataProductViewerState.dataProductArtifactPromise;
        dataProductViewerState.dataProductArtifact =
          buildMockDataProductArtifactWithSampleQueries();
      });

      await screen.findByText('Sample TDS Query', {}, { timeout: 10000 });

      const queryButtons = await screen.findAllByRole('button', {
        name: 'Query',
      });
      const sampleQueryTabButtons = queryButtons.filter(
        (btn) => btn.getAttribute('role') !== 'tab',
      );
      await act(async () => {
        fireEvent.click(sampleQueryTabButtons[0] as HTMLElement);
      });

      const openInQueryButton = await screen.findByRole('button', {
        name: 'Open in Query',
      });
      expect((openInQueryButton as HTMLButtonElement).disabled).toBe(false);
    });

    test('clicking "Open in Query" calls openSampleQuery with the correct id for TDS query', async () => {
      const mockOpenSampleQuery = jest.fn();
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        { groupId: 'com.example', artifactId: 'test', versionId: '1.0.0' },
        undefined,
        { openSampleQuery: mockOpenSampleQuery },
      );

      await act(async () => {
        await dataProductViewerState.dataProductArtifactPromise;
        dataProductViewerState.dataProductArtifact =
          buildMockDataProductArtifactWithSampleQueries();
      });

      await screen.findByText('Sample TDS Query', {}, { timeout: 10000 });

      const queryButtons = await screen.findAllByRole('button', {
        name: 'Query',
      });
      const sampleQueryTabButtons = queryButtons.filter(
        (btn) => btn.getAttribute('role') !== 'tab',
      );
      await act(async () => {
        fireEvent.click(sampleQueryTabButtons[0] as HTMLElement);
      });

      const openInQueryButton = await screen.findByRole('button', {
        name: 'Open in Query',
      });
      await act(async () => {
        fireEvent.click(openInQueryButton);
      });

      expect(mockOpenSampleQuery).toHaveBeenCalledWith(
        MOCK__TDS_SAMPLE_QUERY_ID,
      );
    });

    test('clicking "Open in Query" calls openSampleQuery with the correct id for Relation query', async () => {
      const mockOpenSampleQuery = jest.fn();
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        { groupId: 'com.example', artifactId: 'test', versionId: '1.0.0' },
        undefined,
        { openSampleQuery: mockOpenSampleQuery },
      );

      await act(async () => {
        await dataProductViewerState.dataProductArtifactPromise;
        dataProductViewerState.dataProductArtifact =
          buildMockDataProductArtifactWithSampleQueries();
      });

      await screen.findByText('Sample Relation Query', {}, { timeout: 10000 });

      const queryButtons = await screen.findAllByRole('button', {
        name: 'Query',
      });
      const sampleQueryTabButtons = queryButtons.filter(
        (btn) => btn.getAttribute('role') !== 'tab',
      );
      await act(async () => {
        fireEvent.click(sampleQueryTabButtons[1] as HTMLElement);
      });

      const openInQueryButton = await screen.findByRole('button', {
        name: 'Open in Query',
      });
      await act(async () => {
        fireEvent.click(openInQueryButton);
      });

      expect(mockOpenSampleQuery).toHaveBeenCalledWith(
        MOCK__RELATION_SAMPLE_QUERY_ID,
      );
    });

    test('Column Specifications tab shows "Sample Values" column with parsed values for TDS sample query', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        { groupId: 'com.example', artifactId: 'test', versionId: '1.0.0' },
      );

      await act(async () => {
        await dataProductViewerState.dataProductArtifactPromise;
        dataProductViewerState.dataProductArtifact =
          buildMockDataProductArtifactWithSampleQueries();
      });

      await screen.findByText('Sample TDS Query', {}, { timeout: 10000 });

      // Column Specifications is the default tab — the "Sample Values" header should be visible
      await screen.findByText('Sample Values', {}, { timeout: 10000 });

      // The parsed sample values content should appear in the grid
      await screen.findByText(MOCK__TDS_COLUMN_SAMPLE_VALUES);
    });

    test('Relation sample query Column Specifications shows Description column with tagged value content', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        { groupId: 'com.example', artifactId: 'test', versionId: '1.0.0' },
      );

      await act(async () => {
        dataProductViewerState.dataProductArtifact =
          buildMockDataProductArtifactWithSampleQueries();
      });

      await screen.findByText('Sample Relation Query', {}, { timeout: 10000 });
      await screen.findByText('Description', {}, { timeout: 10000 });
      await screen.findByText('Relation column description from field');
      await screen.findByText('Legacy relation column description');
    });
  });

  describe('ServiceScreen', () => {
    beforeEach(() => {
      jest.spyOn(MockedMonacoEditorAPI, 'create').mockReturnValue({
        ...MockedMonacoEditorInstance,
        getValue: jest.fn().mockReturnValue(''),
      });
      jest
        .spyOn(MockedMonacoEditorAPI, 'createModel')
        .mockReturnValue(MockedMonacoEditorModel);
    });

    test('shows experimental warning when user has access', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test approved contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resourceId: 'MOCK_SDLC_DATAPRODUCT',
          resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
          deploymentId: 11111,
          accessPointGroup: 'GROUP1',
        },
      ];

      const mockDataContracts: V1_DataContract[] = [
        {
          description: 'Test approved contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 12345,
              },
            },
          },
        },
      ];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockLiteContracts,
        mockDataContracts,
      );

      await screen.findByRole('button', { name: 'ENTITLED' });
      await screen.findByText('Customer Demographics');

      const serviceTab = await screen.findByRole('tab', { name: 'Service' });
      await act(async () => {
        fireEvent.click(serviceTab);
      });

      // Should display the experimental warning banner (user has access)
      await screen.findByText(/For exploration and experimental use only/);

      // Should NOT display the no-access warning
      expect(
        screen.queryByText(/You do not have access to this access point group/),
      ).toBeNull();
    });

    test('shows no-access warning when user has no access', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      await screen.findByText('Customer Demographics');

      const serviceTab = await screen.findByRole('tab', { name: 'Service' });
      await act(async () => {
        fireEvent.click(serviceTab);
      });

      // Should display the no-access warning
      await screen.findByText(
        /You do not have access to this access point group/,
      );

      // Should NOT display the experimental warning
      expect(
        screen.queryByText(/For exploration and experimental use only/),
      ).toBeNull();
    });

    test('copy button copies curl command to clipboard', async () => {
      const { dataProductDataAccessState } =
        await setupLakehouseDataProductTest(
          mockSDLCDataProduct,
          mockEntitlementsSDLCDataProduct,
          [],
          [],
        );

      // Mock the clipboard service
      const mockCopyToClipboard = jest
        .spyOn(
          guaranteeNonNullable(dataProductDataAccessState).applicationStore
            .clipboardService,
          'copyTextToClipboard',
        )
        .mockResolvedValue(undefined);

      await screen.findByText('Customer Demographics');

      const serviceTab = await screen.findByRole('tab', { name: 'Service' });
      await act(async () => {
        fireEvent.click(serviceTab);
      });

      const copyButton = await screen.findByTitle('Copy cURL command');
      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(mockCopyToClipboard).toHaveBeenCalledWith(
        expect.stringContaining(
          'curl -X GET "http://test-engine-server-client-url/lakehouse/v1/execute/MOCK_SDLC_DATAPRODUCT/customer_demographics/DEFAULT"',
        ),
      );

      mockCopyToClipboard.mockRestore();
    });

    test('Open in Zipkin button opens new tab with correct URL', async () => {
      const mockLiteContracts: V1_LiteDataContract[] = [
        {
          description: 'Test approved contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resourceId: 'MOCK_SDLC_DATAPRODUCT',
          resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
          deploymentId: 11111,
          accessPointGroup: 'GROUP1',
        },
      ];

      const mockDataContracts: V1_DataContract[] = [
        {
          description: 'Test approved contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          members: [],
          consumer: {
            _type: V1_OrganizationalScopeType.AdHocTeam,
            users: [
              {
                name: 'test-consumer-user-id',
                type: V1_UserType.WORKFORCE_USER,
              },
            ],
          },
          createdBy: 'test-user',
          createdAt: '2025-12-22T15:18:41.998+00:00',
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 12345,
              },
            },
          },
        },
      ];

      const { dataProductDataAccessState } =
        await setupLakehouseDataProductTest(
          mockSDLCDataProduct,
          mockEntitlementsSDLCDataProduct,
          mockLiteContracts,
          mockDataContracts,
        );

      const mockVisitAddress = jest
        .spyOn(
          guaranteeNonNullable(dataProductDataAccessState).applicationStore
            .navigationService.navigator,
          'visitAddress',
        )
        .mockImplementation(() => undefined);

      await screen.findByRole('button', { name: 'ENTITLED' });
      await screen.findByText('Customer Demographics');

      const serviceTab = await screen.findByRole('tab', { name: 'Service' });
      await act(async () => {
        fireEvent.click(serviceTab);
      });

      const zipkinButton = await screen.findByTitle(
        'View traces in Zipkin for this access point',
      );
      await act(async () => {
        fireEvent.click(zipkinButton);
      });

      expect(mockVisitAddress).toHaveBeenCalledWith(
        expect.stringContaining('http://test-engine-server-client-url/zipkin/'),
      );

      mockVisitAddress.mockRestore();
    });
  });
});
