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

import { afterEach, jest } from '@jest/globals';
import { act, render } from '@testing-library/react';
import type { PlainObject, UserSearchService } from '@finos/legend-shared';
import {
  type V1_BatchLambdaRelationTypeResponse,
  type V1_DataContract,
  type V1_DataProduct,
  type V1_EntitlementsDataProductDetails,
  type V1_LiteDataContract,
  type V1_TaskResponse,
  V1_EnrichedUserApprovalStatus,
} from '@finos/legend-graph';
import { createSpy } from '@finos/legend-shared/test';
import type { IngestDeploymentServerConfig } from '@finos/legend-server-lakehouse';
import { AuthProvider } from 'react-oidc-context';
import { ProductViewer } from '../ProductViewer.js';
import {
  TEST__getDataProductDataAccessState,
  TEST__getDataProductViewerState,
} from '../__test-utils__/StateTestUtils.js';
import { ENGINE_TEST_SUPPORT__getClassifierPathMapping } from '@finos/legend-graph/test';
import { flowResult } from 'mobx';
import type {
  ProjectGAVCoordinates,
  StoredFileGeneration,
} from '@finos/legend-storage';
import { BrowserRouter } from '@finos/legend-application/browser';
import {
  getMockCompletedTasksResponse,
  getMockPendingManagerApprovalTasksResponse,
} from '../__test-utils__/TEST_DATA__LakehouseDataContracts.js';

// Shared by the DataProductViewer*.test.tsx files. Importing it replaces the
// browser APIs below for the whole test file, and stops the consumer grant
// polling of every viewer `setupLakehouseDataProductTest` creates after each
// test.

// jsdom answers `getComputedStyle` by matching every style rule of the page
// (ag-grid, MUI and Emotion inject many) against the element. ag-grid calls it
// to size each element it creates and `ByRole` queries call it to decide whether
// an element is hidden, which took most of these tests' time. No test here
// relies on stylesheet-derived styles, so resolve only the inline style.
const ZERO_PX = '0px';
window.getComputedStyle = ((element: Element) => {
  const inlineStyle = (element as HTMLElement).style;
  return {
    display: inlineStyle.display || 'block',
    visibility: inlineStyle.visibility || 'visible',
    getPropertyValue: (name: string) => inlineStyle.getPropertyValue(name),
    width: ZERO_PX,
    height: ZERO_PX,
    paddingTop: ZERO_PX,
    paddingRight: ZERO_PX,
    paddingBottom: ZERO_PX,
    paddingLeft: ZERO_PX,
    borderTopWidth: ZERO_PX,
    borderRightWidth: ZERO_PX,
    borderBottomWidth: ZERO_PX,
    borderLeftWidth: ZERO_PX,
  } as unknown as CSSStyleDeclaration;
}) as typeof window.getComputedStyle;

(global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
  jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

// The ResizeObserver polyfill of the test setup calls `getComputedStyle` on every
// observed element after every DOM change, and jsdom answers that by matching
// every style rule of the page: it took most of these tests' time, enough for
// them to time out on slower machines. No test here needs a resize.
(global as unknown as { ResizeObserver: unknown }).ResizeObserver = jest
  .fn()
  .mockImplementation(() => ({
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

const getMockUserAccessStatus = (
  contractId: string,
): V1_EnrichedUserApprovalStatus => {
  switch (contractId) {
    case 'test-pending-consumer-privilege-manager-approval-contract-id':
      return V1_EnrichedUserApprovalStatus.PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL;
    case 'test-pending-data-owner-approval-contract-id':
      return V1_EnrichedUserApprovalStatus.PENDING_DATA_OWNER_APPROVAL;
    case 'test-approved-contract-id':
    case 'test-partially-approved-contract-id':
      return V1_EnrichedUserApprovalStatus.APPROVED;
    default:
      return V1_EnrichedUserApprovalStatus.DENIED;
  }
};

export const setupLakehouseDataProductTest = async (
  dataProduct: V1_DataProduct,
  entitlementsDataProductDetails: V1_EntitlementsDataProductDetails | undefined,
  mockLiteContracts: V1_LiteDataContract[],
  mockDataContracts: V1_DataContract[],
  projectGAVCoordinates?: ProjectGAVCoordinates,
  mockGenerationFiles?: StoredFileGeneration[],
  extraActions?: Record<string, unknown>,
  userSearchService?: UserSearchService,
  relationTypeMocks?: {
    // replaces the default engine batch relation type response
    batchLambdasRelationType?: () => Promise<V1_BatchLambdaRelationTypeResponse>;
  },
) => {
  const dataProductViewerState = await TEST__getDataProductViewerState(
    dataProduct,
    projectGAVCoordinates,
    extraActions,
    userSearchService,
  );
  createdViewerStates.push(dataProductViewerState);
  // spy before init, since relation type errors are notified while rendering
  const notifyErrorSpy = relationTypeMocks
    ? jest.spyOn(
        dataProductViewerState.applicationStore.notificationService,
        'notifyError',
      )
    : undefined;

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
          status: getMockUserAccessStatus(contract.guid),
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
    ).mockImplementation(async (contractId: string) => ({
      status: getMockUserAccessStatus(contractId),
    }));

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
  const relationTypeResponse = {
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
  const batchRelationTypeResults = Object.fromEntries(
    dataProduct.accessPointGroups.flatMap((apg) =>
      apg.accessPoints.map((ap) => [
        `${apg.id}::${ap.id}`,
        relationTypeResponse,
      ]),
    ),
  );
  const batchRelationTypeResponse = {
    result: batchRelationTypeResults,
    errors: {},
  };
  createSpy(
    dataProductViewerState.engineServerClient,
    'batchLambdasRelationType',
  ).mockImplementation(
    relationTypeMocks?.batchLambdasRelationType ??
      (async () =>
        new Promise((resolve) => {
          if (mockGenerationFiles) {
            // Simulate engine response taking some time to ensure the artifact is used
            // instead of the engine response
            setTimeout(() => resolve(batchRelationTypeResponse), 500);
          } else {
            resolve(batchRelationTypeResponse);
          }
        })),
  );

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

  return {
    renderResult,
    dataProductDataAccessState,
    dataProductViewerState,
    notifyErrorSpy,
  };
};
