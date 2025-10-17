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
import {
  type V1_AppDirNode,
  type V1_AWSSnowflakeIngestEnvironment,
  type V1_DataContractsResponse,
  type V1_DataSubscriptionResponse,
  type V1_EntitlementsDataProductDetailsResponse,
  type V1_LiteDataContractsResponse,
  V1_EntitlementsLakehouseEnvironmentType,
  V1_AppDirLevel,
} from '@finos/legend-graph';
import type { Entity } from '@finos/legend-storage';
import type { StoredSummaryEntity } from '@finos/legend-server-depot';

export const mockDataProductsResponse: PlainObject<V1_EntitlementsDataProductDetailsResponse> =
  {
    dataProducts: [
      {
        id: 'SDLC_PRODUCTION_DATAPRODUCT',
        deploymentId: 12345,
        title: 'SDLC Production Data Product',
        description:
          'Comprehensive customer analytics data for business intelligence and reporting',
        origin: {
          type: 'SdlcDeployment',
          group: 'com.example.analytics',
          artifact: 'customer-analytics',
          version: '1.2.0',
        },
        lakehouseEnvironment: {
          producerEnvironmentName: 'production-analytics',
          type: V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
        },
        dataProduct: {
          name: 'SDLC_PRODUCTION_DATAPRODUCT',
          accessPoints: [
            {
              name: 'customer_demographics',
              groups: ['marketing', 'analytics'],
            },
            {
              name: 'customer_transactions',
              groups: ['finance', 'analytics'],
            },
          ],
          accessPointGroupStereotypeMappings: [
            {
              accessPointGroup: 'marketing',
              stereotypes: [],
            },
            {
              accessPointGroup: 'analytics',
              stereotypes: [],
            },
          ],
          owner: {
            appDirId: 12345,
            level: V1_AppDirLevel.DEPLOYMENT,
          } satisfies V1_AppDirNode,
        },
      },
      {
        id: 'SDLC_PRODUCTION_DATAPRODUCT_NO_TITLE',
        deploymentId: 12345,
        origin: {
          type: 'SdlcDeployment',
          group: 'com.example.analytics',
          artifact: 'customer-analytics-notitle',
          version: '1.3.0',
        },
        lakehouseEnvironment: {
          producerEnvironmentName: 'production-analytics',
          type: V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
        },
        dataProduct: {
          name: 'SDLC_PRODUCTION_DATAPRODUCT_NO_TITLE',
          accessPoints: [
            {
              name: 'customer_demographics',
              groups: ['marketing', 'analytics'],
            },
            {
              name: 'customer_transactions',
              groups: ['finance', 'analytics'],
            },
          ],
          accessPointGroupStereotypeMappings: [
            {
              accessPointGroup: 'marketing',
              stereotypes: [],
            },
            {
              accessPointGroup: 'analytics',
              stereotypes: [],
            },
          ],
          owner: {
            appDirId: 12345,
            level: V1_AppDirLevel.DEPLOYMENT,
          } satisfies V1_AppDirNode,
        },
      },
      {
        id: 'SDLC_PROD_PARALLEL_DATAPRODUCT',
        title: 'SDLC Prod-Parallel Data Product',
        deploymentId: 67890,
        origin: {
          type: 'SdlcDeployment',
          group: 'com.example.finance',
          artifact: 'financial-reporting',
          version: 'master-SNAPSHOT',
        },
        lakehouseEnvironment: {
          producerEnvironmentName: 'production-finance',
          type: V1_EntitlementsLakehouseEnvironmentType.PRODUCTION_PARALLEL,
        },
        dataProduct: {
          name: 'SDLC_PROD_PARALLEL_DATAPRODUCT',
          accessPoints: [
            {
              name: 'regulatory_reports',
              groups: ['compliance', 'finance'],
            },
            {
              name: 'financial_statements',
              groups: ['finance', 'executives'],
            },
          ],
          accessPointGroupStereotypeMappings: [
            {
              accessPointGroup: 'compliance',
              stereotypes: [],
            },
            {
              accessPointGroup: 'finance',
              stereotypes: [],
            },
          ],
          owner: {
            appDirId: 67890,
            level: V1_AppDirLevel.DEPLOYMENT,
          } satisfies V1_AppDirNode,
        },
      },
      {
        id: 'SDLC_DEVELOPMENT_DATAPRODUCT',
        title: 'SDLC Development Data Product',
        deploymentId: 67890,
        origin: {
          type: 'SdlcDeployment',
          group: 'com.example.finance',
          artifact: 'financial-reporting',
          version: 'master-SNAPSHOT',
        },
        lakehouseEnvironment: {
          producerEnvironmentName: 'development-analytics',
          type: V1_EntitlementsLakehouseEnvironmentType.DEVELOPMENT,
        },
        dataProduct: {
          name: 'ADHOC_DEVELOPMENT_DATAPRODUCT',
          accessPoints: [
            {
              name: 'TEST_VIEW',
              groups: ['GROUP1'],
            },
          ],
          accessPointGroupStereotypeMappings: [],
          owner: {
            appDirId: 22222,
            level: V1_AppDirLevel.DEPLOYMENT,
          },
        },
      },
    ],
  };

export const mockProductionSDLCDataProductEntity: PlainObject<Entity> = {
  _type: 'dataProduct',
  name: 'Sdlc_Production_DataProduct',
  package: 'test::dataproduct',
  accessPointGroups: [],
  icon: undefined,
};

export const mockProductionSDLCDataProductNoTitleEntity: PlainObject<Entity> = {
  _type: 'dataProduct',
  name: 'Sdlc_Production_DataProduct_NoTitle',
  package: 'test::dataproduct',
  title: 'SDLC Production Data Product',
  description:
    'Comprehensive customer analytics data for business intelligence and reporting',
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
};

export const mockLegacyDataProductSummaryEntity: StoredSummaryEntity = {
  artifactId: 'test-legacy-data-product',
  classifierPath: 'meta::pure::metamodel::dataSpace::DataSpace',
  groupId: 'com.example.legacy',
  path: 'test::dataproduct::LegacyDataProduct',
  versionId: '1.0.0',
};

export const mockProdParallelSDLCDataProduct: PlainObject<Entity> = {
  _type: 'dataProduct',
  name: 'SDLC_PROD_PARALLEL_DATAPRODUCT',
  package: 'test::dataproduct',
  accessPointGroups: [],
  icon: undefined,
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

export const mockDataContracts: PlainObject<V1_DataContractsResponse> = {
  dataContracts: [
    {
      dataContract: {
        guid: 'contract-123',
        description: 'Test Contract Description 1',
        version: 1,
        state: 'COMPLETED',
        members: [{ user: 'john.doe' }, { user: 'jane.smith' }],
        createdBy: 'admin.user',
      },
    },
    {
      dataContract: {
        guid: 'contract-456',
        description: 'Test Contract Description 2',
        version: 2,
        state: 'PENDING',
        members: [{ user: 'bob.wilson' }],
        createdBy: 'test.user',
      },
    },
  ],
};

export const mockLiteDataContracts: PlainObject<V1_LiteDataContractsResponse> =
  {
    dataContracts: [
      {
        guid: 'contract-123',
        description: 'Test Contract Description 1',
        version: 1,
        state: 'COMPLETED',
        createdBy: 'admin.user',
      },
      {
        guid: 'contract-456',
        description: 'Test Contract Description 2',
        version: 2,
        state: 'PENDING',
        createdBy: 'test.user',
      },
    ],
  };

export const mockSubscriptions: PlainObject<V1_DataSubscriptionResponse> = {
  subscriptions: [
    {
      guid: 'subscription-789',
      dataContractId: 'contract-123',
      target: {
        _type: 'Snowflake',
        snowflakeAccountId: 'account-123',
        snowflakeRegion: 'AWS_US_EAST_1',
        snowflakeNetwork: 'PUBLIC',
      },
      createdBy: 'subscriber.user',
    },
    {
      guid: 'subscription-101',
      dataContractId: 'contract-456',
      target: {
        _type: 'Snowflake',
        snowflakeAccountId: 'account-456',
        snowflakeRegion: 'AWS_US_EAST_1',
        snowflakeNetwork: 'GOLDMAN',
      },
      createdBy: 'another.user',
    },
  ],
};
