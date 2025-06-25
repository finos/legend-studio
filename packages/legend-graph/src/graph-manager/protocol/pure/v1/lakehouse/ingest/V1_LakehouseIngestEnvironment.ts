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

import type { AppDirNode } from '../../../../../../graph/metamodel/pure/packageableElements/ingest/IngestDefinition.js';

export enum V1_IngestEnvironmentType {
  AWSSnowflake = 'AWSSnowflake',
}

export enum V1_IngestEnvironmentClassification {
  PROD = 'prod',
  PROD_PARALLEL = 'prod-parallel',
  DEV = 'dev',
}

export abstract class V1_IngestEnvironment {
  urn!: string;
  version!: string;
  environmentClassification!: V1_IngestEnvironmentClassification;
  cftServiceAccountDeploymentId!: number;
  producers: AppDirNode[] = [];
}

export abstract class V1_AWSIngestEnvironment extends V1_IngestEnvironment {
  awsRegion!: string;
  awsAccountId!: string;
  ingestStepFunctionsAvtivityArn!: string;
  ingestStateMachineArn!: string;
  ingestSystemAccount!: string;
}

export class V1_AWSSnowflakeIngestEnvironment extends V1_AWSIngestEnvironment {
  snowflakeAccount!: string;
  snowflakeHost!: string;
  s3StagingBucketName!: string;
  storageIntegrationName!: string;
}

export class V1_GCPIngestEnvironment extends V1_IngestEnvironment {
  gcsStagingBucketName!: string;
}
