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

export enum V1_DataSubscriptionTargetType {
  BigQuery = 'BigQuery',
  Snowflake = 'Snowflake',
}

export class V1_DataSubscription {
  guid!: string;
  dataContractId!: string;
  target!: V1_DataSubscriptionTarget;
  createdBy!: string;
}

export class V1_DataSubscriptionResponse {
  subscriptions: V1_DataSubscription[] | undefined;
}

export abstract class V1_DataSubscriptionTarget {}

export class V1_SnowflakeTarget extends V1_DataSubscriptionTarget {
  snowflakeAccountId!: string;
  snowflakeRegion!: V1_SnowflakeRegion;
  snowflakeNetwork!: V1_SnowflakeNetwork;
}

export enum V1_SnowflakeRegion {
  AWS_US_EAST_1 = 'AWS_US_EAST_1',
  AWS_US_WEST_1 = 'AWS_US_WEST_1',
}

export enum V1_SnowflakeNetwork {
  PUBLIC,
  GOLDMAN,
}

export class V1_BigQueryTarget extends V1_DataSubscriptionTarget {
  gcpProjectId!: string;
}

export class V1_CreateSubscriptionInput {
  contractId!: string;
  target!: V1_DataSubscriptionTarget;
}
