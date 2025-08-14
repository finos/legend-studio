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

import { jest, test } from '@jest/globals';
import { screen } from '@testing-library/react';
import {
  TEST__provideMockedLegendMarketplaceBaseStore,
  TEST__setUpMarketplaceLakehouse,
} from '../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { type PlainObject } from '@finos/legend-shared';
import {
  type V1_DataContract,
  type V1_EntitlementsDataProductDetailsResponse,
  type V1_LambdaReturnTypeInput,
  type V1_PureModelContextData,
  type V1_RawLambda,
  V1_EnrichedUserApprovalStatus,
} from '@finos/legend-graph';
import {
  mockAdHocDataProductPMCD,
  mockEntitlementsAdHocDataProduct,
  mockEntitlementsSDLCDataProduct,
  mockSDLCDataProductEntitiesResponse,
} from '../__test-utils__/TEST_DATA__LakehouseDataProducts.js';
import { createSpy } from '@finos/legend-shared/test';
import { ENGINE_TEST_SUPPORT__getLambdaRelationType } from '@finos/legend-graph/test';

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
    mockedStore.lakehousePlatformServerClient,
    'getIngestEnvironmentSummaries',
  ).mockResolvedValue([]);

  createSpy(
    mockedStore.lakehouseIngestServerClient,
    'getIngestEnvironment',
  ).mockResolvedValue({});

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
      default:
        return { status: V1_EnrichedUserApprovalStatus.DENIED };
    }
  });

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
    'lambdaRelationType',
  ).mockImplementation(async (input: PlainObject<V1_LambdaReturnTypeInput>) => {
    return ENGINE_TEST_SUPPORT__getLambdaRelationType(
      input.lambda as PlainObject<V1_RawLambda>,
      input.model as PlainObject<V1_PureModelContextData>,
    );
  });

  createSpy(
    mockedStore.engineServerClient,
    'getCurrentUserId',
  ).mockResolvedValue('test-user-id');

  // jest
  //   .spyOn(LakehouseUtils, 'getDataProductFromDetails')
  //   .mockImplementation(async (details: any) => {
  //     if (details.id === 'SDLC_RELEASE_DATAPRODUCT') {
  //       const dataProduct = new V1_DataProduct();
  //       dataProduct.name = 'SDLC_RELEASE_DATAPRODUCT';
  //       dataProduct.package = 'test::dataproduct';
  //       dataProduct.title = 'SDLC Release Data Product';
  //       dataProduct.description =
  //         'Comprehensive customer analytics data for business intelligence and reporting';

  //       const accessPointGroup = new V1_AccessPointGroup();
  //       accessPointGroup.id = 'testSDLCAccessPointGroup';
  //       accessPointGroup.description = 'A test access point group';

  //       const accessPoint = new V1_LakehouseAccessPoint();
  //       accessPoint.id = 'testSDLCAccessPoint';
  //       accessPoint.targetEnvironment = 'Snowflake';
  //       accessPoint.reproducible = false;
  //       accessPoint.description = 'Test access point description';
  //       (accessPoint as any)._type = 'lakehouseAccessPoint';
  //       const lambda = new V1_RawLambda();
  //       lambda.parameters = [];
  //       lambda.body = [
  //         {
  //           _type: 'classInstance',
  //           type: 'I',
  //           value: {
  //             metadata: false,
  //             path: ['my::sandboxIngestDefinition', 'TESTTABLE'],
  //           },
  //         },
  //       ];
  //       accessPoint.func = lambda;

  //       accessPointGroup.accessPoints = [accessPoint];
  //       dataProduct.accessPointGroups = [accessPointGroup];

  //       return dataProduct;
  //     } else if (details.id === 'SDLC_SNAPSHOT_DATAPRODUCT') {
  //       const dataProduct = new V1_DataProduct();
  //       dataProduct.name = 'SDLC_SNAPSHOT_DATAPRODUCT';
  //       dataProduct.package = 'test::dataproduct';
  //       dataProduct.accessPointGroups = [];
  //       return dataProduct;
  //     }
  //     return undefined;
  //   });

  // createSpy(
  //   mockedStore.lakehouseContractServerClient,
  //   'getDataContract',
  // ).mockImplementation(async (contractId: string) => {
  //   const matchingContract = mockContracts.dataContracts?.find(
  //     (dc: any) => dc.dataContract?.guid === contractId,
  //   );
  //   return {
  //     dataContracts: matchingContract ? [matchingContract] : [],
  //   };
  // });

  // createSpy(
  //   mockedStore.depotServerClient,
  //   'getVersionEntities',
  // ).mockResolvedValue([
  //   {
  //     artifactId: 'test-artifact',
  //     entity: { content: mockReleaseSDLCDataProduct },
  //     groupId: 'test-group',
  //     versionId: '1.0.0',
  //     versionedEntity: true,
  //   },
  //   {
  //     artifactId: 'test-artifact-2',
  //     entity: { content: mockSnapshotSDLCDataProduct },
  //     groupId: 'test-group',
  //     versionId: '1.0.0',
  //     versionedEntity: true,
  //   },
  // ]);

  // createSpy(
  //   mockedStore.engineServerClient,
  //   'grammarToJSON_model',
  // ).mockImplementation(async (input: string) => {
  //   console.log('Mocked grammarToJSON_model called with:', input);
  //   const result = await ENGINE_TEST_SUPPORT__grammarToJSON_model(input);
  //   return result;
  // });

  // createSpy(
  //   mockedStore.engineServerClient,
  //   'lambdaReturnType',
  // ).mockImplementation(async (input: any) => {
  //   console.log('Mocked lambdaReturnType called');
  //   return {
  //     returnType: 'String',
  //     multiplicity: { lowerBound: 1, upperBound: 1 },
  //   };
  // });

  // createSpy(
  //   mockedStore.engineServerClient,
  //   'transformTdsToRelation_lambda',
  // ).mockImplementation(async (input: any) => {
  //   return { lambda: { _type: 'lambda', body: [], parameters: [] } };
  // });

  // createSpy(mockedStore.engineServerClient, 'runQuery').mockImplementation(
  //   async (input: any) => {
  //     return { result: { columns: [], rows: [] } };
  //   },
  // );

  // createSpy(
  //   mockedStore.engineServerClient,
  //   'grammarToJSON_lambda',
  // ).mockImplementation(async (input: string) => {
  //   return { lambda: { _type: 'lambda', body: [], parameters: [] } };
  // });

  // createSpy(
  //   mockedStore.engineServerClient,
  //   'grammarToJSON_valueSpecification',
  // ).mockImplementation(async (input: string) => {
  //   return { valueSpecification: { _type: 'string', value: 'test' } };
  // });

  // createSpy(
  //   mockedStore.engineServerClient,
  //   'JSONToGrammar_valueSpecification',
  // ).mockImplementation(async (input: any) => {
  //   return 'test grammar';
  // });

  // createSpy(
  //   mockedStore.engineServerClient,
  //   'getClassifierPathMap',
  // ).mockResolvedValue([]);

  // createSpy(mockedStore.engineServerClient, 'getSubtypeInfo').mockResolvedValue(
  //   {
  //     functionActivatorSubtypes: ['snowflakeM2MUdf', 'snowflakeApp'],
  //     storeSubtypes: ['MongoDatabase', 'serviceStore', 'relational', 'binding'],
  //   },
  // );

  // createSpy(
  //   mockedStore.engineServerClient,
  //   'JSONToGrammar_model',
  // ).mockResolvedValue('');

  // createSpy(mockedStore.engineServerClient, 'compile').mockResolvedValue({
  //   elements: [],
  // });

  // createSpy(
  //   mockedStore.engineServerClient,
  //   'JSONToGrammar_lambda',
  // ).mockResolvedValue('x: String[1]|$x->filter(y|$y == "test")');

  // jest
  //   .spyOn(LakehouseUtils, 'dataContractContainsDataProduct')
  //   .mockImplementation((dataProduct, deploymentId, dataContract) => {
  //     return (
  //       dataProduct.name === 'SDLC_RELEASE_DATAPRODUCT' &&
  //       deploymentId === 12345 &&
  //       dataContract.guid?.includes('test-contract-guid')
  //     );
  //   });

  // jest
  //   .spyOn(LakehouseUtils, 'dataContractContainsAccessGroup')
  //   .mockImplementation((accessPointGroup, dataContract) => {
  //     return (
  //       accessPointGroup.id === 'testSDLCAccessPointGroup' &&
  //       dataContract.guid?.includes('test-contract-guid')
  //     );
  //   });

  // jest
  //   .spyOn(LakehouseUtils, 'isMemberOfContract')
  //   .mockImplementation((user, contract) => {
  //     return (
  //       user === 'test-user-id' && contract.guid?.includes('test-contract-guid')
  //     );
  //   });

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
  await screen.getByText('Customer demographics data access point');
});

// test('loads V1_EntitlementsDataProductDetails with V1_AdHocDeploymentDataProductOrigin and displays title, description, and access point groups', async () => {
//   const mockContracts = { dataContracts: [] };

//   await setupLakehouseDataProductTest(
//     'SDLC_SNAPSHOT_DATAPRODUCT',
//     67890,
//     mockContracts,
//   );

//   await waitFor(() => {
//     expect(screen.getByText('SDLC_SNAPSHOT_DATAPRODUCT')).toBeDefined();
//   });
// });

// test('displays REQUEST ACCESS button when user has no contracts for V1_SdlcDeploymentDataProductOrigin', async () => {
//   const mockContracts = { dataContracts: [] };

//   await setupLakehouseDataProductTest(
//     'SDLC_RELEASE_DATAPRODUCT',
//     12345,
//     mockContracts,
//   );

//   await waitFor(() => {
//     expect(screen.getByText('REQUEST ACCESS')).toBeDefined();
//   });
// });

// test('displays PENDING MANAGER APPROVAL button for contract in PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL status', async () => {
//   const mockContracts = {
//     dataContracts: [
//       {
//         dataContract: {
//           guid: 'test-contract-guid-1',
//           state: 'PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL',
//           dataProductId: 'SDLC_RELEASE_DATAPRODUCT',
//           deploymentId: 12345,
//           resource: {
//             _type: 'accessPointGroupReference',
//             accessPointGroup: 'testSDLCAccessPointGroup',
//             dataProduct: {
//               name: 'SDLC_RELEASE_DATAPRODUCT',
//               owner: {
//                 appDirId: 12345,
//               },
//             },
//           },
//           consumer: {
//             _type: 'adhocTeam',
//             users: [
//               {
//                 name: 'test-user-id',
//                 type: 'USER',
//               },
//             ],
//           },
//         },
//       },
//     ],
//   };

//   await setupLakehouseDataProductTest(
//     'SDLC_RELEASE_DATAPRODUCT',
//     12345,
//     mockContracts,
//   );

//   await waitFor(() => {
//     expect(screen.getByText('PENDING MANAGER APPROVAL')).toBeDefined();
//   });
// });

// test('displays PENDING DATA OWNER APPROVAL button for contract in PENDING_DATA_OWNER_APPROVAL status', async () => {
//   const mockContracts = {
//     dataContracts: [
//       {
//         dataContract: {
//           guid: 'test-contract-guid-2',
//           state: 'PENDING_DATA_OWNER_APPROVAL',
//           dataProductId: 'SDLC_RELEASE_DATAPRODUCT',
//           deploymentId: 12345,
//           resource: {
//             _type: 'accessPointGroupReference',
//             accessPointGroup: 'testSDLCAccessPointGroup',
//             dataProduct: {
//               name: 'SDLC_RELEASE_DATAPRODUCT',
//               owner: {
//                 appDirId: 12345,
//               },
//             },
//           },
//           consumer: {
//             _type: 'adhocTeam',
//             users: [
//               {
//                 name: 'test-user-id',
//                 type: 'USER',
//               },
//             ],
//           },
//         },
//       },
//     ],
//   };

//   await setupLakehouseDataProductTest(
//     'SDLC_RELEASE_DATAPRODUCT',
//     12345,
//     mockContracts,
//   );

//   await waitFor(() => {
//     expect(screen.getByText('PENDING DATA OWNER APPROVAL')).toBeDefined();
//   });
// });

// test('displays ENTITLED button for contract in APPROVED status', async () => {
//   const mockContracts = {
//     dataContracts: [
//       {
//         dataContract: {
//           guid: 'test-contract-guid-3',
//           state: 'APPROVED',
//           dataProductId: 'SDLC_RELEASE_DATAPRODUCT',
//           deploymentId: 12345,
//           resource: {
//             _type: 'accessPointGroupReference',
//             accessPointGroup: 'testSDLCAccessPointGroup',
//             dataProduct: {
//               name: 'SDLC_RELEASE_DATAPRODUCT',
//               owner: {
//                 appDirId: 12345,
//               },
//             },
//           },
//           consumer: {
//             _type: 'adhocTeam',
//             users: [
//               {
//                 name: 'test-user-id',
//                 type: 'USER',
//               },
//             ],
//           },
//         },
//       },
//     ],
//   };

//   await setupLakehouseDataProductTest(
//     'SDLC_RELEASE_DATAPRODUCT',
//     12345,
//     mockContracts,
//   );

//   await waitFor(() => {
//     expect(screen.getByText('ENTITLED')).toBeDefined();
//   });
// });
