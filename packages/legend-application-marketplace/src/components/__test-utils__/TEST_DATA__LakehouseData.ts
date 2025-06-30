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

import { type PlainObject } from '@finos/legend-shared';
import { type IngestDeploymentServerConfig } from '@finos/legend-server-lakehouse';
import { type StoredSummaryEntity } from '@finos/legend-server-depot';
import {
  type V1_AWSSnowflakeIngestEnvironment,
  type V1_SandboxDataProductDeploymentResponse,
  CORE_PURE_PATH,
} from '@finos/legend-graph';

export const mockSDLCDataProductSummaries: PlainObject<StoredSummaryEntity>[] =
  [
    {
      groupId: 'com.example',
      artifactId: 'test-sdlc-data-product',
      versionId: '1.0.0',
      path: 'test::dataproduct::TestSDLCDataProduct',
      classifierPath: CORE_PURE_PATH.DATA_PRODUCT,
    },
    {
      groupId: 'com.example',
      artifactId: 'test-sdlc-data-product',
      versionId: 'master-SNAPSHOT',
      path: 'test::dataproduct::TestSDLCDataProduct',
      classifierPath: CORE_PURE_PATH.DATA_PRODUCT,
    },
    {
      groupId: 'com.example',
      artifactId: 'another-sdlc-data-product',
      versionId: '2.0.0',
      path: 'test::dataproduct::AnotherSDLCDataProduct',
      classifierPath: CORE_PURE_PATH.DATA_PRODUCT,
    },
  ];

export const mockReleaseSDLCDataProduct = {
  _type: 'dataProduct',
  name: 'TestSDLCDataProduct',
  package: 'test::dataproduct',
  title: 'Test SDLC Data Product',
  description: 'A test SDLC data product for testing purposes',
  accessPointGroups: [
    {
      id: 'testSDLCAccessPointGroup',
      description: 'A test access point group',
      accessPoints: [
        {
          _type: 'lakehouseAccessPoint',
          id: 'testSDLCAccessPoint',
          targetEnvironment: 'Snowflake',
          reproducible: false,
          func: {
            _type: 'lambda',
            parameters: [],
            body: [
              {
                _type: 'classInstance',
                type: 'I',
                value: {
                  metadata: false,
                  path: ['my::sandboxIngestDefinition', 'TESTTABLE'],
                },
              },
            ],
          },
        },
      ],
    },
  ],
  icon: undefined,
  imageUrl: undefined,
};

export const mockSnapshotSDLCDataProduct = {
  _type: 'dataProduct',
  name: 'TestSDLCDataProduct',
  package: 'test::dataproduct',
  title: 'Test Snapshot SDLC Data Product',
  description: 'A test snapshot SDLC data product for testing purposes',
  accessPointGroups: [],
  icon: undefined,
  imageUrl: undefined,
};

export const mockSDLCDataProductWithoutTitle = {
  _type: 'dataProduct',
  name: 'AnotherSDLCDataProduct',
  package: 'test::dataproduct',
  title: undefined,
  description: undefined,
  accessPointGroups: [],
  icon: undefined,
  imageUrl: undefined,
};

export const mockDevIngestEnvironmentSummaryResponse: PlainObject<IngestDeploymentServerConfig> =
  {
    ingestEnvironmentUrn: 'test-dev-urn',
    environmentClassification: 'dev',
    ingestServerUrl: 'https://test-dev-ingest-server.com',
  };

export const mockProdParallelIngestEnvironmentSummaryResponse: PlainObject<IngestDeploymentServerConfig> =
  {
    ingestEnvironmentUrn: 'test-prod-parallel-urn',
    environmentClassification: 'prod-parallel',
    ingestServerUrl: 'https://test-prod-parallel-ingest-server.com',
  };

export const mockProdIngestEnvironmentSummaryResponse: PlainObject<IngestDeploymentServerConfig> =
  {
    ingestEnvironmentUrn: 'test-prod-urn',
    environmentClassification: 'prod',
    ingestServerUrl: 'https://test-prod-ingest-server.com',
  };

export const mockDevSandboxDataProductResponse: PlainObject<V1_SandboxDataProductDeploymentResponse> =
  {
    deployedDataProducts: [
      {
        definition:
          `###Lakehouse\n` +
          `Ingest my::sandboxIngestDefinition owner=AppDir(production='123', prodParallel='456')[TESTTABLE(id: Double, name: Varchar(100))\npk=[id]]\n` +
          `###DataProduct\n` +
          `DataProduct sandbox::dataproduct::SandboxDataProduct\n` +
          `{\naccessPoints: [group[testAccessPointGroup: LH(Snowflake, |#I{my::sandboxIngestDefinition.TESTTABLE}#->select(id, name))]]}`,
        artifact: {
          dataProduct: {
            title: 'Dev Sandbox Data Product',
            description: 'A dev sandbox data product',
            path: 'sandbox::dataproduct::DevSandboxDataProduct',
            deploymentId: '123',
          },
          accessPointGroups: [
            {
              id: 'testAccessPointGroup',
              accessPointImplementations: [
                {
                  id: 'testAccessPointImplementation',
                  resourceBuilder: {
                    _type: 'databaseDDL',
                    targetEnvironment: 'Snowflake',
                    reproducible: false,
                    script: 'CREATE TABLE test_table (id INT, name STRING);',
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  };

export const mockProdParallelSandboxDataProductResponse: PlainObject<V1_SandboxDataProductDeploymentResponse> =
  {
    deployedDataProducts: [
      {
        definition:
          `###Lakehouse\n` +
          `Ingest my::sandboxIngestDefinition owner=AppDir(production='123', prodParallel='456')[TESTTABLE(id: Double, name: Varchar(100))\npk=[id]]\n` +
          `###DataProduct\n` +
          `DataProduct sandbox::dataproduct::SandboxDataProduct\n` +
          `{\naccessPoints: [group[testAccessPointGroup: LH(Snowflake, |#I{my::sandboxIngestDefinition.TESTTABLE}#->select(id, name))]]}`,
        artifact: {
          dataProduct: {
            title: 'Prod-Parallel Sandbox Data Product',
            description: 'A prod-parallel sandbox data product',
            path: 'sandbox::dataproduct::ProdParallelSandboxDataProduct',
            deploymentId: '456',
          },
          accessPointGroups: [
            {
              id: 'testAccessPointGroup',
              accessPointImplementations: [
                {
                  id: 'testAccessPointImplementation',
                  resourceBuilder: {
                    _type: 'databaseDDL',
                    targetEnvironment: 'Snowflake',
                    reproducible: false,
                    script: 'CREATE TABLE test_table (id INT, name STRING);',
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  };

export const mockProdSandboxDataProductResponse: PlainObject<V1_SandboxDataProductDeploymentResponse> =
  {
    deployedDataProducts: [
      {
        definition:
          `###Lakehouse\n` +
          `Ingest my::sandboxIngestDefinition owner=AppDir(production='123', prodParallel='456')[TESTTABLE(id: Double, name: Varchar(100))\npk=[id]]\n` +
          `###DataProduct\n` +
          `DataProduct sandbox::dataproduct::SandboxDataProduct\n` +
          `{\naccessPoints: [group[testAccessPointGroup: LH(Snowflake, |#I{my::sandboxIngestDefinition.TESTTABLE}#->select(id, name))]]}`,
        artifact: {
          dataProduct: {
            title: 'Prod Sandbox Data Product',
            description: 'A prod sandbox data product',
            path: 'sandbox::dataproduct::ProdSandboxDataProduct',
            deploymentId: '789',
          },
          accessPointGroups: [
            {
              id: 'testAccessPointGroup',
              accessPointImplementations: [
                {
                  id: 'testAccessPointImplementation',
                  resourceBuilder: {
                    _type: 'databaseDDL',
                    targetEnvironment: 'Snowflake',
                    reproducible: false,
                    script: 'CREATE TABLE test_table (id INT, name STRING);',
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  };

export const mockDevIngestEnvironmentResponse: PlainObject<V1_AWSSnowflakeIngestEnvironment> =
  {
    _type: 'AWSSnowflake',
    urn: 'test-dev-urn',
    version: '1.0.0',
    environmentClassification: 'dev',
    producers: [],
    awsRegion: 'us-east-1',
    awsAccountId: 'test-dev-account-id',
    ingestStepFunctionsAvtivityArn:
      'arn:aws:states:us-east-1:123456789:activity:test',
    ingestStateMachineArn:
      'arn:aws:states:us-east-1:123456789:stateMachine:test',
    ingestSystemAccount: 'test-dev-system-account',
    snowflakeAccount: 'test-dev-snowflake-account',
    snowflakeHost: 'test.dev.snowflakecomputing.com',
    s3StagingBucketName: 'test-dev-staging-bucket',
    storageIntegrationName: 'test-dev-storage-integration',
  };

export const mockProdParallelIngestEnvironmentResponse: PlainObject<V1_AWSSnowflakeIngestEnvironment> =
  {
    _type: 'AWSSnowflake',
    urn: 'test-prod-parallel-urn',
    version: '1.0.0',
    environmentClassification: 'prod-parallel',
    producers: [],
    awsRegion: 'us-east-1',
    awsAccountId: 'test-prod-parallel-account-id',
    ingestStepFunctionsAvtivityArn:
      'arn:aws:states:us-east-1:123456789:activity:test',
    ingestStateMachineArn:
      'arn:aws:states:us-east-1:123456789:stateMachine:test',
    ingestSystemAccount: 'test-prod-parallel-system-account',
    snowflakeAccount: 'test-prod-parallel-snowflake-account',
    snowflakeHost: 'test.prod-parallel.snowflakecomputing.com',
    s3StagingBucketName: 'test-prod-parallel-staging-bucket',
    storageIntegrationName: 'test-prod-parallel-storage-integration',
  };

export const mockProdIngestEnvironmentResponse: PlainObject<V1_AWSSnowflakeIngestEnvironment> =
  {
    _type: 'AWSSnowflake',
    urn: 'test-prod-urn',
    version: '1.0.0',
    environmentClassification: 'prod',
    producers: [],
    awsRegion: 'us-east-1',
    awsAccountId: 'test-prod-account-id',
    ingestStepFunctionsAvtivityArn:
      'arn:aws:states:us-east-1:123456789:activity:test',
    ingestStateMachineArn:
      'arn:aws:states:us-east-1:123456789:stateMachine:test',
    ingestSystemAccount: 'test-prod-system-account',
    snowflakeAccount: 'test-prod-snowflake-account',
    snowflakeHost: 'test.prod.snowflakecomputing.com',
    s3StagingBucketName: 'test-prod-staging-bucket',
    storageIntegrationName: 'test-prod-storage-integration',
  };
