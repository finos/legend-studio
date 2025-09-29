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

import { describe, expect, jest, test } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { type PlainObject } from '@finos/legend-shared';
import {
  type V1_DataContract,
  type V1_DataProduct,
  type V1_EntitlementsDataProductDetails,
  type V1_TaskResponse,
  V1_AccessPointGroupReferenceType,
  V1_ContractState,
  V1_dataProductModelSchema,
  V1_EnrichedUserApprovalStatus,
  V1_EntitlementsDataProductDetailsModelSchema,
  V1_OrganizationalScopeType,
  V1_UserType,
} from '@finos/legend-graph';
import {
  mockEnterpriseDataProduct,
  mockEntitlementsEnterpriseDataProduct,
  mockEntitlementsSDLCDataProduct,
  mockEntitlementsSDLCDataProductNoSupportInfo,
  mockSDLCDataProduct,
  mockSDLCDataProductNoSupportInfo,
} from '../__test-utils__/TEST_DATA__LakehouseDataProducts.js';
import { createSpy } from '@finos/legend-shared/test';
import {
  mockApprovedTasksResponse,
  mockPendingManagerApprovalTasksResponse,
} from '../__test-utils__/TEST_DATA__LakehouseContractData.js';
import { AuthProvider } from 'react-oidc-context';
import { ProductViewer } from '../ProductViewer.js';
import {
  TEST__getDataProductDataAccessState,
  TEST__getDataProductViewerState,
} from '../__test-utils__/StateTestUtils.js';
import { deserialize } from 'serializr';
import { ENGINE_TEST_SUPPORT__getClassifierPathMapping } from '@finos/legend-graph/test';
import { flowResult } from 'mobx';
import type { ProjectGAVCoordinates } from '@finos/legend-storage';

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

(global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
  jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

const setupLakehouseDataProductTest = async (
  dataProductObject: PlainObject<V1_DataProduct>,
  entitlementsDataProductDetailsObject:
    | PlainObject<V1_EntitlementsDataProductDetails>
    | undefined,
  mockContracts: V1_DataContract[],
  projectGAVCoordinates?: ProjectGAVCoordinates,
) => {
  const dataProduct = deserialize(V1_dataProductModelSchema, dataProductObject);
  const entitlementsDataProductDetails = entitlementsDataProductDetailsObject
    ? deserialize(
        V1_EntitlementsDataProductDetailsModelSchema,
        entitlementsDataProductDetailsObject,
      )
    : undefined;

  const dataProductViewerState = TEST__getDataProductViewerState(
    dataProduct,
    projectGAVCoordinates,
  );

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
      'getDataContractsFromDID',
    ).mockResolvedValue({
      dataContracts: mockContracts.map((_contract) => ({
        dataContract: _contract,
      })),
    });

    createSpy(
      dataProductDataAccessState.lakehouseContractServerClient,
      'getDataContract',
    ).mockImplementation(async (id: string) => {
      const matchingContract = mockContracts.find(
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
        return mockApprovedTasksResponse as unknown as PlainObject<V1_TaskResponse>;
      }
      return mockPendingManagerApprovalTasksResponse as unknown as PlainObject<V1_TaskResponse>;
    });
  }

  // engineServerClient spies
  createSpy(
    dataProductViewerState.engineServerClient,
    'lambdaRelationType',
  ).mockResolvedValue({
    _type: 'relationType',
    columns: [
      {
        name: 'varchar_val',
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
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

  let renderResult;

  await act(async () => {
    await flowResult(dataProductDataAccessState?.init(undefined));
    renderResult = render(
      <AuthProvider>
        <ProductViewer
          productViewerState={dataProductViewerState}
          dataProductDataAccessState={dataProductDataAccessState}
        />
      </AuthProvider>,
    );

    await new Promise((resolve) => setTimeout(resolve, 0)); // wait for async state updates
  });

  return { renderResult };
};

describe('DataProductViewer', () => {
  describe('Basic rendering', () => {
    test('Loads DataProductViewer and displays title, description, and access point groups', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
      );

      await screen.findByText('Mock SDLC Data Product');
      screen.getByText(
        'Comprehensive customer analytics data for business intelligence and reporting',
      );
      screen.getByText('GROUP1');
      screen.getByText('Test access point group');
      await screen.findByText('customer_demographics');
      await screen.findByText('Customer demographics data access point');
    });

    test('Loads DataProductViewer without DataProductDataAccessState and displays title, description, and access point groups', async () => {
      await setupLakehouseDataProductTest(mockSDLCDataProduct, undefined, []);

      await screen.findByText('Mock SDLC Data Product');
      screen.getByText(
        'Comprehensive customer analytics data for business intelligence and reporting',
      );
      screen.getByText('GROUP1');
      screen.getByText('Test access point group');
      await screen.findByText('customer_demographics');
      await screen.findByText('Customer demographics data access point');
    });

    test('Access Point "More Info" button shows table with access point columns and types', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
      );

      await screen.findByText('customer_demographics');
      await screen.findByText('Customer demographics data access point');
      await screen.findByText('GROUP1');
      await screen.findByText('Column Name');
      screen.getByText('Column Type');

      await screen.findByText('varchar_val');
      screen.getByText('Varchar(32)');
      screen.getByText('int_val');
      screen.getByText('Int');
    });

    test('Access Point "More Info" button shows table with access point columns and types even when DataProductDataAccessState is not configured', async () => {
      await setupLakehouseDataProductTest(mockSDLCDataProduct, undefined, [], {
        groupId: 'test.group',
        artifactId: 'test-artifact',
        versionId: '1.0.0',
      });

      await screen.findByText('customer_demographics');
      await screen.findByText('Customer demographics data access point');
      await screen.findByText('GROUP1');

      await screen.findByText('Column Name');
      screen.getByText('Column Type');

      await screen.findByText('varchar_val');
      screen.getByText('Varchar(32)');
      screen.getByText('int_val');
      screen.getByText('Int');
    });
  });

  describe('Access/contract logic', () => {
    test('displays REQUEST ACCESS button when user has no contracts', async () => {
      const mockContracts: V1_DataContract[] = [];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockContracts,
      );

      await screen.findByRole('button', { name: 'REQUEST ACCESS' });
    });

    test('displays REQUEST ACCESS button when user has denied contract', async () => {
      const mockContracts: V1_DataContract[] = [
        {
          description: 'Test denied contract',
          guid: 'test-denied-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 11111,
              },
            },
          },
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
        },
      ];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockContracts,
      );

      await screen.findByRole('button', { name: 'REQUEST ACCESS' });
    });

    test('clicking REQUEST ACCESS button opens create contract modal', async () => {
      const mockContracts: V1_DataContract[] = [];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockContracts,
      );

      await screen.findByText('GROUP1');
      const requestAccessButton = await screen.findByRole('button', {
        name: 'REQUEST ACCESS',
      });
      fireEvent.click(requestAccessButton);

      await screen.findByText('Data Contract Request');
    });

    test('REQUEST ACCESS secondary button only shows "Manage Subscriptions"', async () => {
      const mockContracts: V1_DataContract[] = [];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockContracts,
      );

      await screen.findByText('GROUP1');
      const secondaryButton = await screen.findByTitle('More options');
      fireEvent.click(secondaryButton);

      await screen.findByText('Manage Subscriptions');
    });

    test('displays PENDING MANAGER APPROVAL button for contract in PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL status', async () => {
      const mockContracts: V1_DataContract[] = [
        {
          description: 'Test pending privilege manager approval contract',
          guid: 'test-pending-consumer-privilege-manager-approval-contract-id',
          version: 0,
          state: V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL,
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 11111,
              },
            },
          },
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
        },
      ];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockContracts,
      );

      await screen.findByRole('button', { name: 'PENDING MANAGER APPROVAL' });
    });

    test('clicking PENDING MANAGER APPROVAL button opens pending contract viewer', async () => {
      const mockContracts: V1_DataContract[] = [
        {
          description: 'Test pending privilege manager approval contract',
          guid: 'test-pending-consumer-privilege-manager-approval-contract-id',
          version: 0,
          state: V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL,
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 11111,
              },
            },
          },
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
        },
      ];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockContracts,
      );

      await screen.findByText('GROUP1');
      const pendingButton = await screen.findByRole('button', {
        name: 'PENDING MANAGER APPROVAL',
      });
      fireEvent.click(pendingButton);

      await screen.findByText('Pending Data Contract Request');
    });

    test('PENDING MANAGER APPROVAL secondary button shows "Request for Others" and "Manage Subscriptions"', async () => {
      const mockContracts: V1_DataContract[] = [
        {
          description: 'Test pending privilege manager approval contract',
          guid: 'test-pending-consumer-privilege-manager-approval-contract-id',
          version: 0,
          state: V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL,
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 11111,
              },
            },
          },
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
        },
      ];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockContracts,
      );

      await screen.findByText('GROUP1');
      const secondaryButton = await screen.findByTitle('More options');
      fireEvent.click(secondaryButton);

      await screen.findByText('Request Access for Others');
      screen.getByText('Manage Subscriptions');
    });

    test('displays PENDING DATA OWNER APPROVAL button for contract in PENDING_DATA_OWNER_APPROVAL status', async () => {
      const mockContracts: V1_DataContract[] = [
        {
          description: 'Test pending data owner approval contract',
          guid: 'test-pending-data-owner-approval-contract-id',
          version: 0,
          state: V1_ContractState.PENDING_DATA_OWNER_APPROVAL,
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 11111,
              },
            },
          },
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
        },
      ];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockContracts,
      );

      await screen.findByRole('button', {
        name: 'PENDING DATA OWNER APPROVAL',
      });
    });

    test('clicking PENDING DATA OWNER APPROVAL button opens pending contract viewer', async () => {
      const mockContracts: V1_DataContract[] = [
        {
          description: 'Test pending data owner approval contract',
          guid: 'test-pending-data-owner-approval-contract-id',
          version: 0,
          state: V1_ContractState.PENDING_DATA_OWNER_APPROVAL,
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 11111,
              },
            },
          },
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
        },
      ];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockContracts,
      );

      await screen.findByText('GROUP1');
      const pendingButton = await screen.findByRole('button', {
        name: 'PENDING DATA OWNER APPROVAL',
      });
      fireEvent.click(pendingButton);

      await screen.findByText('Pending Data Contract Request');
    });

    test('PENDING DATA OWNER APPROVAL secondary button shows "Request for Others" and "Manage Subscriptions"', async () => {
      const mockContracts: V1_DataContract[] = [
        {
          description: 'Test pending data owner approval contract',
          guid: 'test-pending-data-owner-approval-contract-id',
          version: 0,
          state: V1_ContractState.PENDING_DATA_OWNER_APPROVAL,
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 11111,
              },
            },
          },
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
        },
      ];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockContracts,
      );

      await screen.findByText('GROUP1');
      const secondaryButton = await screen.findByTitle('More options');
      fireEvent.click(secondaryButton);

      await screen.findByText('Request Access for Others');
      screen.getByText('Manage Subscriptions');
    });

    test('displays ENTITLED button for contract in APPROVED status', async () => {
      const mockContracts: V1_DataContract[] = [
        {
          description: 'Test pending data owner approval contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 11111,
              },
            },
          },
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
        },
      ];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockContracts,
      );

      await screen.findByRole('button', { name: 'ENTITLED' });
    });

    test('displays ENTITLED button for contract when user is approved but entire contract is not yet completed', async () => {
      const mockContracts: V1_DataContract[] = [
        {
          description: 'Test partially approved contract',
          guid: 'test-partially-approved-contract-id',
          version: 0,
          state: V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL,
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 11111,
              },
            },
          },
          members: [],
          consumer: {
            _type: 'unknown',
          },
          createdBy: 'test-user',
        },
      ];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockContracts,
      );

      await screen.findByRole('button', { name: 'ENTITLED' });
    });

    test('clicking ENTITLED button opens completed contract viewer', async () => {
      const mockContracts: V1_DataContract[] = [
        {
          description: 'Test pending data owner approval contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 11111,
              },
            },
          },
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
        },
      ];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockContracts,
      );

      await screen.findByText('GROUP1');
      const entitledButton = await screen.findByRole('button', {
        name: 'ENTITLED',
      });
      fireEvent.click(entitledButton);

      await screen.findByText('Data Contract Request');
    });

    test('ENTITLED secondary button shows "Request for Others" and "Manage Subscriptions"', async () => {
      const mockContracts: V1_DataContract[] = [
        {
          description: 'Test pending data owner approval contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 11111,
              },
            },
          },
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
        },
      ];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockContracts,
      );

      await screen.findByText('GROUP1');
      const secondaryButton = await screen.findByTitle('More options');
      fireEvent.click(secondaryButton);

      await screen.findByText('Request Access for Others');
      screen.getByText('Manage Subscriptions');
    });

    test('displays ENTERPRISE ACCESS for Access Point Group marked as Enterprise', async () => {
      await setupLakehouseDataProductTest(
        mockEnterpriseDataProduct,
        mockEntitlementsEnterpriseDataProduct,
        [],
      );

      await screen.findByRole('button', { name: 'ENTERPRISE ACCESS' });
    });

    test('ENTERPRISE ACCESS secondary button shows "Request for Others" and "Manage Subscriptions"', async () => {
      await setupLakehouseDataProductTest(
        mockEnterpriseDataProduct,
        mockEntitlementsEnterpriseDataProduct,
        [],
      );

      await screen.findByText('ENTERPRISE_GROUP');
      const secondaryButton = await screen.findByTitle('More options');
      fireEvent.click(secondaryButton);

      await screen.findByText('Request Access for Others');
      screen.getByText('Manage Subscriptions');
    });

    test('Request Access for Others button opens create contract modal', async () => {
      const mockContracts: V1_DataContract[] = [
        {
          description: 'Test pending data owner approval contract',
          guid: 'test-approved-contract-id',
          version: 0,
          state: V1_ContractState.COMPLETED,
          resource: {
            _type: V1_AccessPointGroupReferenceType.AccessPointGroupReference,
            accessPointGroup: 'GROUP1',
            dataProduct: {
              name: 'MOCK_SDLC_DATAPRODUCT',
              owner: {
                appDirId: 11111,
              },
            },
          },
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
        },
      ];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        mockContracts,
      );

      await screen.findByText('GROUP1');
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
      const mockContracts: V1_DataContract[] = [];

      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        undefined,
        mockContracts,
      );

      const button = await screen.findByRole('button', { name: 'UNKNOWN' });
      expect(button.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('Subscriptions', () => {
    test('Manage Subscriptions button opens subscriptions modal', async () => {
      await setupLakehouseDataProductTest(
        mockEnterpriseDataProduct,
        mockEntitlementsEnterpriseDataProduct,
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
  });

  describe('Support info rendering', () => {
    test('Renders support info correctly', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
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
      );

      await screen.findByText('Support');

      await screen.findByText('(support information not specified)');
    });
  });
});
