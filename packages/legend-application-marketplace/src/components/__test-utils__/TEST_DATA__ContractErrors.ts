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

import {
  type V1_EntitlementsDataProductDetailsResponse,
  type V1_EntitlementsLakehouseEnvironmentType,
  V1_IngestEnvironmentClassification,
} from '@finos/legend-graph';
import { type PlainObject } from '@finos/legend-shared';
import type { IngestDeploymentServerConfig } from '@finos/legend-server-lakehouse';
import type { StoreProjectData } from '@finos/legend-server-depot';
import type { StoredFileGeneration } from '@finos/legend-storage';

export type LakehouseContractSyncStatusResponseFixture = {
  status: string;
  unsyncedUsers?: { username: string }[];
  unsyncedAccessPoints?: { accessPointName: string }[];
  unsyncedTargetAccounts?: string[];
};

export const buildSyncStatusResponse = (params: {
  status: string;
  unsyncedUsers?: string[];
  unsyncedAccessPoints?: string[];
  unsyncedTargetAccounts?: string[];
}): LakehouseContractSyncStatusResponseFixture => ({
  status: params.status,
  ...(params.unsyncedUsers
    ? { unsyncedUsers: params.unsyncedUsers.map((u) => ({ username: u })) }
    : {}),
  ...(params.unsyncedAccessPoints
    ? {
        unsyncedAccessPoints: params.unsyncedAccessPoints.map((a) => ({
          accessPointName: a,
        })),
      }
    : {}),
  ...(params.unsyncedTargetAccounts
    ? { unsyncedTargetAccounts: params.unsyncedTargetAccounts }
    : {}),
});

export const mockSyncStatus_fullySynced: LakehouseContractSyncStatusResponseFixture =
  buildSyncStatusResponse({ status: 'FULLY_SYNCED' });

export const mockSyncStatus_neverSynced: LakehouseContractSyncStatusResponseFixture =
  buildSyncStatusResponse({ status: 'NEVER_SYNCED' });

export const mockSyncStatus_notFullySynced_all: LakehouseContractSyncStatusResponseFixture =
  buildSyncStatusResponse({
    status: 'NOT_FULLY_SYNCED',
    unsyncedUsers: ['user1'],
    unsyncedTargetAccounts: ['targetAccount1'],
    unsyncedAccessPoints: ['accessPoint1'],
  });

export const mockDataProductDetailsResponse_adHoc = (params: {
  deploymentId: number;
  resourceId: string;
  envType: V1_EntitlementsLakehouseEnvironmentType;
}): V1_EntitlementsDataProductDetailsResponse =>
  ({
    dataProducts: [
      {
        id: params.resourceId,
        deploymentId: params.deploymentId,
        title: 'Mock Ad-Hoc Data Product',
        description: 'Ad-hoc deployment for contract-errors tests',
        origin: {
          type: 'AdHocDeployment',
          definition: '',
        },
        lakehouseEnvironment: {
          producerEnvironmentName: 'test-env',
          type: params.envType,
        },
        dataProduct: {
          name: params.resourceId,
          accessPoints: [],
          accessPointGroupStereotypeMappings: [],
          owner: {
            appDirId: 12345,
            level: 'DEPLOYMENT',
          },
        },
        fullPath: `test::${params.resourceId}`,
      },
    ],
  }) as unknown as V1_EntitlementsDataProductDetailsResponse;

export const TEST_APG_ID = 'GROUP1';
export const TEST_DP_NAME = 'MyDataProduct';
export const TEST_GAV = {
  groupId: 'com.example',
  artifactId: 'my-data-product',
  versionId: '1.0.0',
};
export const TEST_FULL_PATH = `test::${TEST_DP_NAME}`;

export const mockDataProductDetailsResponse_sdlc = (params: {
  deploymentId: number;
  resourceId: string;
  envType: V1_EntitlementsLakehouseEnvironmentType;
}): V1_EntitlementsDataProductDetailsResponse =>
  ({
    dataProducts: [
      {
        id: params.resourceId,
        deploymentId: params.deploymentId,
        title: 'Mock SDLC Data Product',
        description: 'SDLC deployment for contract-errors tests',
        origin: {
          type: 'SdlcDeployment',
          group: TEST_GAV.groupId,
          artifact: TEST_GAV.artifactId,
          version: TEST_GAV.versionId,
        },
        lakehouseEnvironment: {
          producerEnvironmentName: 'test-env',
          type: params.envType,
        },
        dataProduct: {
          name: TEST_DP_NAME,
          accessPoints: [],
          accessPointGroupStereotypeMappings: [],
          owner: {
            appDirId: 12345,
            level: 'DEPLOYMENT',
          },
        },
        fullPath: TEST_FULL_PATH,
      },
    ],
  }) as unknown as V1_EntitlementsDataProductDetailsResponse;

export type ArtifactDatasetSpec = {
  ingestPath: string;
  producer:
    | { kind: 'appDir'; appDirId: number }
    | { kind: 'kerberos'; kerberos: string };
  datasetName: string;
};

export type ArtifactAccessPointImplSpec = {
  id: string;
  datasets: ArtifactDatasetSpec[];
  dependencyAccessPoints?: {
    dataProductId: string;
    accessPointId: string;
  }[];
};

const buildDatasetJson = (spec: ArtifactDatasetSpec): PlainObject => ({
  ingestDefinition: {
    path: spec.ingestPath,
    producer:
      spec.producer.kind === 'appDir'
        ? { _type: 'AppDir', appDirId: spec.producer.appDirId }
        : { _type: 'Kerberos', kerberos: spec.producer.kerberos },
  },
  dataset: spec.datasetName,
});

export const buildModernAccessPointImpl = (
  spec: ArtifactAccessPointImplSpec,
): PlainObject => ({
  id: spec.id,
  resourceBuilder: {
    _type: 'databaseDDL',
    reproducible: true,
    targetEnvironment: 'prod',
    script: '',
    resourceType: 'TABLE',
  },
  dependencyDatasets: spec.datasets.map(buildDatasetJson),
  dependencyAccessPoints: (spec.dependencyAccessPoints ?? []).map((dep) => ({
    dataProductId: dep.dataProductId,
    accessPointId: dep.accessPointId,
    production: true,
  })),
});

export const buildDataProductArtifactJson = (params: {
  accessPointImpls: PlainObject[];
}): string =>
  JSON.stringify({
    dataProduct: {
      path: TEST_FULL_PATH,
      deploymentId: String(11111),
    },
    accessPointGroups: [
      {
        id: TEST_APG_ID,
        accessPointImplementations: params.accessPointImpls,
      },
    ],
  });

export const mockStoreProjectData: PlainObject<StoreProjectData> = {
  projectId: 'test-project-id',
  groupId: TEST_GAV.groupId,
  artifactId: TEST_GAV.artifactId,
};

export const buildGenerationFilesResponse = (params: {
  artifactJson: string;
}): PlainObject<StoredFileGeneration>[] => [
  {
    groupId: TEST_GAV.groupId,
    artifactId: TEST_GAV.artifactId,
    versionId: TEST_GAV.versionId,
    type: 'dataProduct',
    path: TEST_FULL_PATH,
    file: {
      path: TEST_FULL_PATH,
      content: params.artifactJson,
    },
  },
];

export const buildMockIngestEnvConfig = (
  classification: V1_IngestEnvironmentClassification = V1_IngestEnvironmentClassification.PROD,
): PlainObject<IngestDeploymentServerConfig> => ({
  ingestEnvironmentUrn: `test-${classification}-urn`,
  environmentClassification: classification,
  ingestServerUrl: `https://test-${classification}-ingest-server.com`,
});

export const mockProducerEnvironment: PlainObject = {
  producerEnvironmentUrn: 'urn:lakehouse:prod:producer:deployment:11111',
};

export const TEST_SERVER_URNS: string[] = [
  'urn:lakehouse:prod:ingest:definition:alloy-git:com.example~my-data-product~com.example::IngestA',
  'urn:lakehouse:prod:ingest:definition:alloy-git:other.group~other-artifact~com.example::IngestLoose',
  'urn:lakehouse:prod:ingest:definition:rest-api:svc-acct~com.example::IngestK',
  'urn:lakehouse:prod-parallel:ingest:definition:alloy-git:com.example~my-data-product~com.example::IngestA',
  'urn:lakehouse:non-prod:ingest:definition:alloy-git:com.example~my-data-product~com.example::IngestA',
];
