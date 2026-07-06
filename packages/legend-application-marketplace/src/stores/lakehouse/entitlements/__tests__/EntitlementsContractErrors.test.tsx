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
import { act, fireEvent, render, screen } from '@testing-library/react';
import { AuthProvider } from 'react-oidc-context';
import { type PlainObject } from '@finos/legend-shared';
import { createSpy } from '@finos/legend-shared/test';
import {
  type V1_DataContract,
  type V1_EntitlementsDataProductDetailsResponse,
  type V1_TaskResponse,
  GraphManagerState,
  V1_ContractState,
  V1_EntitlementsLakehouseEnvironmentType,
  V1_IngestEnvironmentClassification,
  type V1_LiteDataContract,
  V1_dataContractModelSchema,
  V1_transformDataContractToLiteDatacontract,
} from '@finos/legend-graph';
import { Route, Routes } from '@finos/legend-application/browser';
import { TEST__BrowserEnvironmentProvider } from '@finos/legend-application/test';
import {
  ApplicationFrameworkProvider,
  ApplicationStoreProvider,
} from '@finos/legend-application';
import {
  DataAccessRequestViewer,
  DataContractViewerState,
} from '@finos/legend-extension-dsl-data-product';
import { createMockContract } from '@finos/legend-extension-dsl-data-product/test-utils';
import { serialize } from 'serializr';
import { TEST__provideMockLegendMarketplaceBaseStore } from '../../../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { type LegendMarketplaceBaseStore } from '../../../LegendMarketplaceBaseStore.js';
import {
  type LakehouseContractSyncStatusResponseFixture,
  TEST_DP_NAME,
  TEST_SERVER_URNS,
  buildDataProductArtifactJson,
  buildGenerationFilesResponse,
  buildMockIngestEnvConfig,
  buildModernAccessPointImpl,
  mockDataProductDetailsResponse_adHoc,
  mockDataProductDetailsResponse_sdlc,
  mockProducerEnvironment,
  mockStoreProjectData,
  mockSyncStatus_fullySynced,
  mockSyncStatus_neverSynced,
  mockSyncStatus_notFullySynced_all,
} from '../../../../components/__test-utils__/TEST_DATA__ContractErrors.js';
import { EntitlementsDashboardState } from '../EntitlementsDashboardState.js';
import { LakehouseEntitlementsStore } from '../LakehouseEntitlementsStore.js';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: Record<PropertyKey, unknown>;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

const TEST_CONTRACT_ID = 'contract-errors-test-id';
const TEST_DEPLOYMENT_ID = 11111;
const TEST_RESOURCE_ID = TEST_DP_NAME;

const setupContractMocks = async (params: {
  origin: 'adHoc' | 'sdlc';
  syncStatusResponse: LakehouseContractSyncStatusResponseFixture;
}) => {
  const mockedStore = await TEST__provideMockLegendMarketplaceBaseStore();
  const MOCK__applicationStore = mockedStore.applicationStore;
  MOCK__applicationStore.identityService.setCurrentUser(
    'test-consumer-user-id',
  );
  MOCK__applicationStore.navigationService.navigator.generateAddress = jest.fn(
    (location: string) => location,
  );

  const plugins =
    MOCK__applicationStore.pluginManager.getPureProtocolProcessorPlugins();
  const mockContract = createMockContract(plugins, {
    guid: TEST_CONTRACT_ID,
    state: V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL,
  });
  const mockContractObject = serialize(
    V1_dataContractModelSchema(plugins),
    mockContract,
  ) as PlainObject<V1_DataContract>;
  const mockLiteContract =
    V1_transformDataContractToLiteDatacontract(mockContract);

  const contractClient = mockedStore.lakehouseContractServerClient;
  createSpy(contractClient, 'getDataContract').mockResolvedValue({
    dataContracts: [{ dataContract: mockContractObject }],
  });
  createSpy(contractClient, 'getContractTasks').mockResolvedValue({
    tasks: [],
  } as unknown as PlainObject<V1_TaskResponse>);
  const dpDetailsResponse =
    params.origin === 'adHoc'
      ? mockDataProductDetailsResponse_adHoc({
          deploymentId: TEST_DEPLOYMENT_ID,
          resourceId: TEST_RESOURCE_ID,
          envType: V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
        })
      : mockDataProductDetailsResponse_sdlc({
          deploymentId: TEST_DEPLOYMENT_ID,
          resourceId: TEST_RESOURCE_ID,
          envType: V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
        });
  createSpy(contractClient, 'getDataProductByIdAndDID').mockResolvedValue(
    dpDetailsResponse as unknown as PlainObject<V1_EntitlementsDataProductDetailsResponse>,
  );
  createSpy(contractClient, 'getContractSyncStatus').mockResolvedValue(
    params.syncStatusResponse as unknown as PlainObject,
  );

  return { mockedStore, mockLiteContract };
};

const installIngestPipelineSpies = (
  mockedStore: LegendMarketplaceBaseStore,
  params: {
    artifactJson: string;
    ingestEnvClassification: V1_IngestEnvironmentClassification;
  },
) => {
  const depot = mockedStore.depotServerClient;
  createSpy(depot, 'getProject').mockResolvedValue(mockStoreProjectData);
  createSpy(depot, 'getGenerationFilesByType').mockResolvedValue(
    buildGenerationFilesResponse({ artifactJson: params.artifactJson }),
  );

  createSpy(
    mockedStore.lakehousePlatformServerClient,
    'findProducerServer',
  ).mockResolvedValue(buildMockIngestEnvConfig(params.ingestEnvClassification));

  const ingest = mockedStore.lakehouseIngestServerClient;
  createSpy(ingest, 'getProducerEnvironment').mockResolvedValue(
    mockProducerEnvironment,
  );
  createSpy(ingest, 'getIngestDefinitions').mockResolvedValue(TEST_SERVER_URNS);
  createSpy(ingest, 'getIngestDefinitionDetail').mockResolvedValue({});
};

const computeErrorsAndRender = async (
  mockedStore: LegendMarketplaceBaseStore,
  mockLiteContract: V1_LiteDataContract,
  mockUnverifiedIngests?: string[],
) => {
  const MOCK__applicationStore = mockedStore.applicationStore;
  const MOCK__entitlementsStore = new LakehouseEntitlementsStore(mockedStore);
  const MOCK__dashboardState = new EntitlementsDashboardState(
    MOCK__entitlementsStore,
  );

  if (mockUnverifiedIngests !== undefined) {
    createSpy(
      MOCK__dashboardState,
      'getUnverifiedIngestDefinitions',
    ).mockResolvedValue(mockUnverifiedIngests);
  }

  const computedContractErrors = await MOCK__dashboardState.getContractErrors(
    TEST_CONTRACT_ID,
    undefined,
    true,
  );

  const MOCK__contractViewerState = new DataContractViewerState(
    mockLiteContract,
    (contractId: string, taskId: string) =>
      `http://test-task-url?contractId=${contractId}&taskId=${taskId}`,
    undefined,
    MOCK__applicationStore,
    mockedStore.lakehouseContractServerClient,
    new GraphManagerState(
      MOCK__applicationStore.pluginManager,
      MOCK__applicationStore.logService,
    ),
    undefined,
  );

  await act(async () => {
    render(
      <AuthProvider>
        <ApplicationStoreProvider store={MOCK__applicationStore}>
          <TEST__BrowserEnvironmentProvider initialEntries={['/']}>
            <ApplicationFrameworkProvider>
              <Routes>
                <Route
                  path="*"
                  element={
                    <DataAccessRequestViewer
                      open={true}
                      onClose={jest.fn()}
                      viewerState={MOCK__contractViewerState}
                      getDataProductUrl={() => ''}
                      contractErrors={computedContractErrors}
                    />
                  }
                />
              </Routes>
            </ApplicationFrameworkProvider>
          </TEST__BrowserEnvironmentProvider>
        </ApplicationStoreProvider>
      </AuthProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  return {
    MOCK__dashboardState,
    MOCK__contractViewerState,
    computedContractErrors,
  };
};

const setupSyncErrorsModalTest = async (
  syncStatusResponse: LakehouseContractSyncStatusResponseFixture,
) => {
  const { mockedStore, mockLiteContract } = await setupContractMocks({
    origin: 'adHoc',
    syncStatusResponse,
  });
  return computeErrorsAndRender(mockedStore, mockLiteContract);
};

const setupIngestErrorsModalTest = async (options: {
  syncStatusResponse: LakehouseContractSyncStatusResponseFixture;
  artifactJson: string;
  ingestEnvClassification: V1_IngestEnvironmentClassification;
  expectedUnverifiedIngests: string[];
}) => {
  const { mockedStore, mockLiteContract } = await setupContractMocks({
    origin: 'sdlc',
    syncStatusResponse: options.syncStatusResponse,
  });
  installIngestPipelineSpies(mockedStore, {
    artifactJson: options.artifactJson,
    ingestEnvClassification: options.ingestEnvClassification,
  });
  return computeErrorsAndRender(
    mockedStore,
    mockLiteContract,
    options.expectedUnverifiedIngests,
  );
};

describe('DataAccessRequestViewer contract errors', () => {
  describe('contract sync errors', () => {
    test('NOT_FULLY_SYNCED with all three groups renders each in source order', async () => {
      const { computedContractErrors } = await setupSyncErrorsModalTest(
        mockSyncStatus_notFullySynced_all,
      );

      expect(computedContractErrors).toEqual({
        title: 'Contract Errors:',
        childLayers: [
          {
            title: 'Unsynced Entities:',
            childLayers: [
              { title: 'Users:', errorItems: ['user1'] },
              { title: 'Target Accounts:', errorItems: ['targetAccount1'] },
              { title: 'Access Points:', errorItems: ['accessPoint1'] },
            ],
          },
        ],
      });

      fireEvent.click(await screen.findByText('Contract Errors:'));
      fireEvent.click(screen.getByText('Unsynced Entities:'));

      screen.getByText('Users: (1)');
      screen.getByText('Target Accounts: (1)');
      screen.getByText('Access Points: (1)');
    });
  });

  describe('missing ingest verification (E2E from contract id)', () => {
    test('same-DP dependency access points are followed transitively', async () => {
      const artifactJson = buildDataProductArtifactJson({
        accessPointImpls: [
          buildModernAccessPointImpl({
            id: 'ap1',
            datasets: [
              {
                ingestPath: 'com.example::IngestA',
                producer: { kind: 'appDir', appDirId: 99999 },
                datasetName: 'DATASET_A',
              },
            ],
            dependencyAccessPoints: [
              { dataProductId: TEST_DP_NAME, accessPointId: 'ap2' },
            ],
          }),
          buildModernAccessPointImpl({
            id: 'ap2',
            datasets: [
              {
                ingestPath: 'com.example::IngestMissingFromServer',
                producer: { kind: 'appDir', appDirId: 99999 },
                datasetName: 'DATASET_X',
              },
            ],
          }),
        ],
      });

      const { computedContractErrors } = await setupIngestErrorsModalTest({
        syncStatusResponse: mockSyncStatus_fullySynced,
        artifactJson,
        ingestEnvClassification: V1_IngestEnvironmentClassification.PROD,
        expectedUnverifiedIngests: ['com.example::IngestMissingFromServer'],
      });

      expect(computedContractErrors).toEqual({
        title: 'Contract Errors:',
        childLayers: [
          {
            title: 'Ingest Not Found:',
            errorItems: ['com.example::IngestMissingFromServer'],
          },
        ],
      });
    });
  });

  describe('combined contract errors', () => {
    test('sync + ingest errors render as siblings under one root', async () => {
      const artifactJson = buildDataProductArtifactJson({
        accessPointImpls: [
          buildModernAccessPointImpl({
            id: 'ap1',
            datasets: [
              {
                ingestPath: 'com.example::IngestMissingFromServer',
                producer: { kind: 'appDir', appDirId: 99999 },
                datasetName: 'DATASET_X',
              },
            ],
          }),
        ],
      });

      const { computedContractErrors } = await setupIngestErrorsModalTest({
        syncStatusResponse: mockSyncStatus_neverSynced,
        artifactJson,
        ingestEnvClassification: V1_IngestEnvironmentClassification.PROD,
        expectedUnverifiedIngests: ['com.example::IngestMissingFromServer'],
      });

      expect(computedContractErrors).toEqual({
        title: 'Contract Errors:',
        childLayers: [
          {
            title: 'Ingest Not Found:',
            errorItems: ['com.example::IngestMissingFromServer'],
          },
          { title: 'Sync Error: Contract Never Synced' },
        ],
      });

      await screen.findByText('Contract Errors:');
      screen.getByText('Ingest Not Found: (1)');
      screen.getByText('Sync Error: Contract Never Synced');
    });
  });
});
