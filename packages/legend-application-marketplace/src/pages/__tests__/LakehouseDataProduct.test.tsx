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
import { render, screen, waitFor } from '@testing-library/react';
import {
  TEST__provideMockedLegendMarketplaceBaseStore,
  TEST__setUpMarketplaceLakehouse,
} from '../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { mockDataProducts } from '../../components/__test-utils__/TEST_DATA__LakehouseData.js';
const { createSpy } = jest.requireActual<{
  createSpy: typeof jest.spyOn;
}>('@finos/legend-shared/test');
const { ENGINE_TEST_SUPPORT__grammarToJSON_model } = jest.requireActual<{
  ENGINE_TEST_SUPPORT__grammarToJSON_model: (
    code: string,
    returnSourceInformation?: boolean,
  ) => Promise<{ elements: object[] }>;
}>('@finos/legend-graph/test');
import {
  CORE_PURE_PATH,
  V1_EntitlementsLakehouseEnvironmentType,
  V1_AppDirLevel,
  V1_EnrichedUserApprovalStatus,
} from '@finos/legend-graph';
import {
  mockReleaseSDLCDataProduct,
  mockSnapshotSDLCDataProduct,
} from '../../components/__test-utils__/TEST_DATA__LakehouseData.js';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: Record<PropertyKey, unknown>;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

jest.mock('mermaid', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn(),
    contentLoaded: jest.fn(),
  },
}));

jest.mock('ag-grid-community', () => ({
  ModuleRegistry: {
    registerModules: jest.fn(),
  },
  Grid: class MockGrid {},
  GridApi: class MockGridApi {},
  ColumnApi: class MockColumnApi {},
  Component: class MockComponent {},
}));

jest.mock('ag-grid-enterprise', () => ({
  MasterDetailModule: {},
  AllEnterpriseModule: {},
  LicenseManager: {
    setLicenseKey: jest.fn(),
  },
}));

jest.mock('ag-grid-react', () => ({
  AgGridReact: () => null,
}));

(global as any).IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

const setupLakehouseDataProductTest = async (
  dataProductId: string,
  deploymentId: number,
  mockContracts: any,
) => {
  const mockedStore = await TEST__provideMockedLegendMarketplaceBaseStore();

  createSpy(
    mockedStore.lakehouseContractServerClient,
    'getDataProductByIdAndDID',
  ).mockImplementation(async (id: string, did: number) => {
    const matchingDataProduct = (mockDataProducts as any).dataProducts.find(
      (dp: any) => dp.id === id && dp.deploymentId === did,
    );
    return {
      dataProducts: matchingDataProduct ? [matchingDataProduct] : [],
    };
  });

  createSpy(
    mockedStore.lakehouseContractServerClient,
    'getDataContractsFromDID',
  ).mockResolvedValue(mockContracts);

  createSpy(
    mockedStore.lakehouseContractServerClient,
    'getDataContract',
  ).mockResolvedValue(mockContracts);

  createSpy(
    mockedStore.lakehouseContractServerClient,
    'getContractUserStatus',
  ).mockImplementation(async (contractId: string) => {
    const contract = mockContracts.dataContracts?.find(
      (c: any) => c.dataContract?.guid === contractId,
    );
    if (contract?.dataContract?.state) {
      const state = contract.dataContract.state;
      switch (state) {
        case 'PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL':
          return {
            status:
              V1_EnrichedUserApprovalStatus.PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
          };
        case 'PENDING_DATA_OWNER_APPROVAL':
          return {
            status: V1_EnrichedUserApprovalStatus.PENDING_DATA_OWNER_APPROVAL,
          };
        case 'APPROVED':
          return { status: V1_EnrichedUserApprovalStatus.APPROVED };
        default:
          return { status: V1_EnrichedUserApprovalStatus.DENIED };
      }
    }
    return { status: V1_EnrichedUserApprovalStatus.DENIED };
  });

  createSpy(
    mockedStore.depotServerClient,
    'getVersionEntities',
  ).mockResolvedValue([
    {
      artifactId: 'test-artifact',
      entity: mockReleaseSDLCDataProduct,
      groupId: 'test-group',
      versionId: '1.0.0',
      versionedEntity: true,
    },
    {
      artifactId: 'test-artifact-2',
      entity: mockSnapshotSDLCDataProduct,
      groupId: 'test-group',
      versionId: '1.0.0',
      versionedEntity: true,
    },
  ]);

  createSpy(
    mockedStore.lakehouseContractServerClient,
    'getSubscriptionsForContract',
  ).mockResolvedValue([]);

  createSpy(
    mockedStore.lakehouseContractServerClient,
    'createSubscription',
  ).mockResolvedValue({ subscriptions: [] });

  createSpy(
    mockedStore.engineServerClient,
    'grammarToJSON_model',
  ).mockImplementation(async (input: string) => {
    const result = await ENGINE_TEST_SUPPORT__grammarToJSON_model(input);
    return result;
  });

  createSpy(
    mockedStore.engineServerClient,
    'lambdaReturnType',
  ).mockImplementation(async (input: any) => {
    return {
      returnType: 'String',
      multiplicity: { lowerBound: 1, upperBound: 1 },
    };
  });

  createSpy(
    mockedStore.engineServerClient,
    'lambdaRelationType',
  ).mockImplementation(async (input: any) => {
    return { relationType: 'Table', columns: [] };
  });

  createSpy(
    mockedStore.engineServerClient,
    'transformTdsToRelation_lambda',
  ).mockImplementation(async (input: any) => {
    return { lambda: { _type: 'lambda', body: [], parameters: [] } };
  });

  createSpy(mockedStore.engineServerClient, 'runQuery').mockImplementation(
    async (input: any) => {
      return { result: { columns: [], rows: [] } };
    },
  );

  createSpy(
    mockedStore.engineServerClient,
    'grammarToJSON_lambda',
  ).mockImplementation(async (input: string) => {
    return { lambda: { _type: 'lambda', body: [], parameters: [] } };
  });

  createSpy(
    mockedStore.engineServerClient,
    'grammarToJSON_valueSpecification',
  ).mockImplementation(async (input: string) => {
    return { valueSpecification: { _type: 'string', value: 'test' } };
  });

  createSpy(
    mockedStore.engineServerClient,
    'JSONToGrammar_valueSpecification',
  ).mockImplementation(async (input: any) => {
    return 'test grammar';
  });

  createSpy(
    mockedStore.engineServerClient,
    'getCurrentUserId',
  ).mockResolvedValue('test-user-id');

  createSpy(
    mockedStore.engineServerClient,
    'getClassifierPathMap',
  ).mockResolvedValue([]);

  createSpy(mockedStore.engineServerClient, 'getSubtypeInfo').mockResolvedValue(
    {
      functionActivatorSubtypes: ['snowflakeM2MUdf', 'snowflakeApp'],
      storeSubtypes: ['MongoDatabase', 'serviceStore', 'relational', 'binding'],
    },
  );

  createSpy(
    mockedStore.lakehousePlatformServerClient,
    'getIngestEnvironmentSummaries',
  ).mockResolvedValue([]);

  createSpy(
    mockedStore.lakehouseIngestServerClient,
    'getIngestEnvironment',
  ).mockResolvedValue({});

  const { renderResult } = await TEST__setUpMarketplaceLakehouse(
    mockedStore,
    `/lakehouse/dataProduct/deployed/${dataProductId}/${deploymentId}`,
  );

  return { mockedStore, renderResult };
};

test('loads V1_EntitlementsDataProductDetails with V1_SdlcDeploymentDataProductOrigin and displays title, description, and access point groups', async () => {
  const mockContracts = { dataContracts: [] };

  await setupLakehouseDataProductTest(
    'SDLC_RELEASE_DATAPRODUCT',
    12345,
    mockContracts,
  );

  await waitFor(() => {
    expect(screen.getByText('SDLC Release Data Product')).toBeDefined();
  });

  expect(
    screen.getByText(
      'Comprehensive customer analytics data for business intelligence and reporting',
    ),
  ).toBeDefined();
  expect(screen.getByText('testSDLCAccessPointGroup')).toBeDefined();
  expect(screen.getByText('testSDLCAccessPoint')).toBeDefined();
});

test('loads V1_EntitlementsDataProductDetails with V1_AdHocDeploymentDataProductOrigin and displays title, description, and access point groups', async () => {
  const mockContracts = { dataContracts: [] };

  await setupLakehouseDataProductTest(
    'SDLC_SNAPSHOT_DATAPRODUCT',
    67890,
    mockContracts,
  );

  await waitFor(() => {
    expect(screen.getByText('SDLC_SNAPSHOT_DATAPRODUCT')).toBeDefined();
  });
});

test('displays REQUEST ACCESS button when user has no contracts for V1_SdlcDeploymentDataProductOrigin', async () => {
  const mockContracts = { dataContracts: [] };

  await setupLakehouseDataProductTest(
    'SDLC_RELEASE_DATAPRODUCT',
    12345,
    mockContracts,
  );

  await waitFor(() => {
    expect(screen.getByText('REQUEST ACCESS')).toBeDefined();
  });
});

test('displays PENDING MANAGER APPROVAL button for contract in PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL status', async () => {
  const mockContracts = {
    dataContracts: [
      {
        dataContract: {
          guid: 'test-contract-guid-1',
          state: 'PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL',
          dataProductId: 'SDLC_RELEASE_DATAPRODUCT',
          deploymentId: 12345,
          members: [
            {
              userId: 'test-user-id',
              role: 'CONSUMER',
            },
          ],
        },
      },
    ],
  };

  await setupLakehouseDataProductTest(
    'SDLC_RELEASE_DATAPRODUCT',
    12345,
    mockContracts,
  );

  await waitFor(() => {
    expect(screen.getByText('PENDING MANAGER APPROVAL')).toBeDefined();
  });
});

test('displays PENDING DATA OWNER APPROVAL button for contract in PENDING_DATA_OWNER_APPROVAL status', async () => {
  const mockContracts = {
    dataContracts: [
      {
        dataContract: {
          guid: 'test-contract-guid-2',
          state: 'PENDING_DATA_OWNER_APPROVAL',
          dataProductId: 'SDLC_RELEASE_DATAPRODUCT',
          deploymentId: 12345,
          members: [
            {
              userId: 'test-user-id',
              role: 'CONSUMER',
            },
          ],
        },
      },
    ],
  };

  await setupLakehouseDataProductTest(
    'SDLC_RELEASE_DATAPRODUCT',
    12345,
    mockContracts,
  );

  await waitFor(() => {
    expect(screen.getByText('PENDING DATA OWNER APPROVAL')).toBeDefined();
  });
});

test('displays ENTITLED button for contract in APPROVED status', async () => {
  const mockContracts = {
    dataContracts: [
      {
        dataContract: {
          guid: 'test-contract-guid-3',
          state: 'APPROVED',
          dataProductId: 'SDLC_RELEASE_DATAPRODUCT',
          deploymentId: 12345,
          members: [
            {
              userId: 'test-user-id',
              role: 'CONSUMER',
            },
          ],
        },
      },
    ],
  };

  await setupLakehouseDataProductTest(
    'SDLC_RELEASE_DATAPRODUCT',
    12345,
    mockContracts,
  );

  await waitFor(() => {
    expect(screen.getByText('ENTITLED')).toBeDefined();
  });
});
