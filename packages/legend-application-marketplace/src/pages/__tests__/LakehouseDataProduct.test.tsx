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

import { expect, jest, test } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react';
import {
  TEST__provideMockedLegendMarketplaceBaseStore,
  TEST__setUpMarketplaceLakehouse,
} from '../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { guaranteeNonNullable, type PlainObject } from '@finos/legend-shared';
import {
  type V1_DataContract,
  type V1_EntitlementsDataProductDetailsResponse,
  type V1_TaskResponse,
  V1_AccessPointGroupReferenceType,
  V1_ContractState,
  V1_EnrichedUserApprovalStatus,
  V1_OrganizationalScopeType,
  V1_UserType,
} from '@finos/legend-graph';
import {
  mockAdHocDataProductPMCD,
  mockEnterpriseDataProductEntitiesResponse,
  mockEntitlementsAdHocDataProduct,
  mockEntitlementsEnterpriseDataProduct,
  mockEntitlementsSDLCDataProduct,
  mockSDLCDataProductEntitiesResponse,
} from '../__test-utils__/TEST_DATA__LakehouseDataProducts.js';
import { createSpy } from '@finos/legend-shared/test';
import { ENGINE_TEST_SUPPORT__getClassifierPathMapping } from '@finos/legend-graph/test';
import {
  mockApprovedTasksResponse,
  mockPendingManagerApprovalTasksResponse,
} from '../../components/__test-utils__/TEST_DATA__LakehouseContractData.js';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: Record<PropertyKey, unknown>;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

(global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
  jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

enum MOCK_DataProductId {
  MOCK_SDLC_DATAPRODUCT = 'MOCK_SDLC_DATAPRODUCT',
  MOCK_ADHOC_DATAPRODUCT = 'MOCK_ADHOC_DATAPRODUCT',
  MOCK_ENTERPRISE_DATAPRODUCT = 'MOCK_ENTERPRISE_DATAPRODUCT',
}

const setupLakehouseDataProductTest = async (
  dataProductId: MOCK_DataProductId,
  deploymentId: number,
  mockContracts: V1_DataContract[],
) => {
  const mockedStore = await TEST__provideMockedLegendMarketplaceBaseStore();

  createSpy(
    mockedStore.lakehouseContractServerClient,
    'getDataProductByIdAndDID',
  ).mockImplementation(async (_dataProductId: string) => {
    if (_dataProductId === MOCK_DataProductId.MOCK_SDLC_DATAPRODUCT) {
      return mockEntitlementsSDLCDataProduct as unknown as PlainObject<V1_EntitlementsDataProductDetailsResponse>;
    } else if (_dataProductId === MOCK_DataProductId.MOCK_ADHOC_DATAPRODUCT) {
      return mockEntitlementsAdHocDataProduct as unknown as PlainObject<V1_EntitlementsDataProductDetailsResponse>;
    } else if (
      _dataProductId === MOCK_DataProductId.MOCK_ENTERPRISE_DATAPRODUCT
    ) {
      return mockEntitlementsEnterpriseDataProduct as unknown as PlainObject<V1_EntitlementsDataProductDetailsResponse>;
    } else {
      return {} as PlainObject<V1_EntitlementsDataProductDetailsResponse>;
    }
  });

  createSpy(
    mockedStore.depotServerClient,
    'getVersionEntities',
  ).mockImplementation(
    async (groupId: string, artifactId: string, version: string) => {
      if (
        groupId === 'com.example.analytics' &&
        artifactId === 'customer-analytics' &&
        version === '1.2.0'
      ) {
        return mockSDLCDataProductEntitiesResponse;
      } else if (
        groupId === 'com.example.analytics' &&
        artifactId === 'enterprise-data-product' &&
        version === '1.0.0'
      ) {
        return mockEnterpriseDataProductEntitiesResponse;
      }
      return [];
    },
  );

  createSpy(
    mockedStore.engineServerClient,
    'grammarToJSON_model',
  ).mockResolvedValue(mockAdHocDataProductPMCD);

  createSpy(
    mockedStore.lakehouseContractServerClient,
    'getDataContractsFromDID',
  ).mockResolvedValue({
    dataContracts: mockContracts.map((_contract) => ({
      dataContract: _contract,
    })),
  });

  createSpy(
    mockedStore.lakehouseContractServerClient,
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
        return { status: V1_EnrichedUserApprovalStatus.APPROVED };
      case 'test-denied-contract-id':
        return { status: V1_EnrichedUserApprovalStatus.DENIED };
      default:
        return { status: V1_EnrichedUserApprovalStatus.DENIED };
    }
  });

  createSpy(
    mockedStore.engineServerClient,
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
    mockedStore.engineServerClient,
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

  createSpy(
    mockedStore.lakehouseContractServerClient,
    'getContractTasks',
  ).mockImplementation(async (contractId: string) => {
    if (contractId === 'test-approved-contract-id') {
      return mockApprovedTasksResponse as unknown as PlainObject<V1_TaskResponse>;
    }
    return mockPendingManagerApprovalTasksResponse as unknown as PlainObject<V1_TaskResponse>;
  });

  const { renderResult } = await TEST__setUpMarketplaceLakehouse(
    mockedStore,
    `/lakehouse/dataProduct/deployed/${dataProductId}/${deploymentId}`,
  );

  return { mockedStore, renderResult };
};

test('Loads LakehosueDataProduct with SDLC Data Product and displays title, description, and access point groups', async () => {
  await setupLakehouseDataProductTest(
    MOCK_DataProductId.MOCK_SDLC_DATAPRODUCT,
    11111,
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

test('Loads LakehosueDataProduct with Ad-Hoc Data Product and displays title, description, and access point groups', async () => {
  await setupLakehouseDataProductTest(
    MOCK_DataProductId.MOCK_ADHOC_DATAPRODUCT,
    2222,
    [],
  );

  await screen.findByText('Mock Ad-Hoc Data Product');
  screen.getByText(
    'Flexible and dynamic data product for ad hoc analysis and reporting',
  );
  screen.getByText('GROUP1');
  screen.getByText('Test ad-hoc access point group');
  await screen.findByText('test_view');
  await screen.findByText('No description to provide');
});

test('displays REQUEST ACCESS button when user has no contracts', async () => {
  const mockContracts: V1_DataContract[] = [];

  await setupLakehouseDataProductTest(
    MOCK_DataProductId.MOCK_SDLC_DATAPRODUCT,
    11111,
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
    MOCK_DataProductId.MOCK_SDLC_DATAPRODUCT,
    11111,
    mockContracts,
  );

  await screen.findByRole('button', { name: 'REQUEST ACCESS' });
});

test('clicking REQUEST ACCESS button opens create contract modal', async () => {
  const mockContracts: V1_DataContract[] = [];

  await setupLakehouseDataProductTest(
    MOCK_DataProductId.MOCK_SDLC_DATAPRODUCT,
    11111,
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
    MOCK_DataProductId.MOCK_SDLC_DATAPRODUCT,
    11111,
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
    MOCK_DataProductId.MOCK_SDLC_DATAPRODUCT,
    11111,
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
    MOCK_DataProductId.MOCK_SDLC_DATAPRODUCT,
    11111,
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
    MOCK_DataProductId.MOCK_SDLC_DATAPRODUCT,
    11111,
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
    MOCK_DataProductId.MOCK_SDLC_DATAPRODUCT,
    11111,
    mockContracts,
  );

  await screen.findByRole('button', { name: 'PENDING DATA OWNER APPROVAL' });
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
    MOCK_DataProductId.MOCK_SDLC_DATAPRODUCT,
    11111,
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
    MOCK_DataProductId.MOCK_SDLC_DATAPRODUCT,
    11111,
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
    MOCK_DataProductId.MOCK_SDLC_DATAPRODUCT,
    11111,
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
    MOCK_DataProductId.MOCK_SDLC_DATAPRODUCT,
    11111,
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
    MOCK_DataProductId.MOCK_SDLC_DATAPRODUCT,
    11111,
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
    MOCK_DataProductId.MOCK_ENTERPRISE_DATAPRODUCT,
    33333,
    [],
  );

  await screen.findByRole('button', { name: 'ENTERPRISE ACCESS' });
});

test('ENTERPRISE ACCESS secondary button shows "Request for Others" and "Manage Subscriptions"', async () => {
  await setupLakehouseDataProductTest(
    MOCK_DataProductId.MOCK_ENTERPRISE_DATAPRODUCT,
    33333,
    [],
  );

  await screen.findByText('ENTERPRISE_GROUP');
  const secondaryButton = await screen.findByTitle('More options');
  fireEvent.click(secondaryButton);

  await screen.findByText('Request Access for Others');
  screen.getByText('Manage Subscriptions');
});

test('Manage Subscriptions button opens subscriptions modal', async () => {
  await setupLakehouseDataProductTest(
    MOCK_DataProductId.MOCK_ENTERPRISE_DATAPRODUCT,
    33333,
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
    MOCK_DataProductId.MOCK_SDLC_DATAPRODUCT,
    11111,
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
    MOCK_DataProductId.MOCK_ENTERPRISE_DATAPRODUCT,
    33333,
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

test('Access Point "More Info" button shows table with access point columns and types', async () => {
  await setupLakehouseDataProductTest(
    MOCK_DataProductId.MOCK_SDLC_DATAPRODUCT,
    1111,
    [],
  );

  await screen.findByText('customer_demographics');
  await screen.findByText('Customer demographics data access point');
  const apgContainer = guaranteeNonNullable(
    (await screen.findByText('GROUP1')).parentElement?.parentElement
      ?.parentElement,
  );
  const moreInfoButton = guaranteeNonNullable(
    apgContainer.querySelector('.ag-icon-tree-closed'),
  );
  fireEvent.click(moreInfoButton);

  await screen.findByText('Column Name');
  screen.getByText('Column Type');

  await screen.findByText('varchar_val');
  screen.getByText('Varchar(32)');
  screen.getByText('int_val');
  screen.getByText('Int');
});
