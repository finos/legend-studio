/**
 * Copyright (c) 2025-present, Goldman Sachs
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

import type { V1_AppDirNode } from '../entitlements/V1_CoreEntitlements.js';

//TODO: we need to add more producer environment types

export enum V1_ProducerEnvironmentType {
  AWSSnowflake = 'AWSSnowflake',
  AWSSnowflakeWithOnPremS3Only = 'AWSSnowflakeWithOnPremS3Only',
  AWSSnowflakeWithProducerManagedStageBucket = 'AWSSnowflakeWithProducerManagedStageBucket',
}

export abstract class V1_ProducerEnvironment {
  appDirDeployment!: V1_AppDirNode;
}

export abstract class V1_SnowflakeBasedProducerEnvironment extends V1_ProducerEnvironment {
  snowflakeRole!: string;
  databaseName!: string;
  warehouseName!: string;
  stageName!: string;
  icebergEnabled!: boolean;
  databaseOwnerDeploymentId!: number;
}

export class V1_AWSSnowflakeProducerEnvironment extends V1_SnowflakeBasedProducerEnvironment {}
