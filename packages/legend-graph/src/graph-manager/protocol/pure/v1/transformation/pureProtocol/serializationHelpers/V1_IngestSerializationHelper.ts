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

import {
  usingConstantValueSchema,
  usingModelSchema,
  type PlainObject,
} from '@finos/legend-shared';
import { V1_IngestDefinition } from '../../../model/packageableElements/ingest/V1_IngestDefinition.js';
import type { V1_PackageableElement } from '../../../model/packageableElements/V1_PackageableElement.js';
import type { V1_AppDirNode } from '../../../lakehouse/entitlements/V1_CoreEntitlements.js';
import { V1_AppDirNodeModelSchema } from './V1_EntitlementSerializationHelper.js';
import { createModelSchema, deserialize, primitive } from 'serializr';
import {
  type V1_IngestEnvironment,
  V1_AWSSnowflakeIngestEnvironment,
  V1_IngestEnvironmentType,
} from '../../../lakehouse/ingest/V1_LakehouseIngestEnvironment.js';

type IngestDefinitionInterface = {
  appDirDeployment?: PlainObject<V1_AppDirNode> | undefined;
  owner?: {
    prodParallel?: PlainObject<V1_AppDirNode> | undefined;
    production?: PlainObject<V1_AppDirNode> | undefined;
  };
};

export const V1_createIngestDef = (
  name: string,
  packagePath: string,
  json: PlainObject<V1_PackageableElement>,
): V1_IngestDefinition => {
  const ingestDef = new V1_IngestDefinition();
  const jsonType = json as IngestDefinitionInterface;
  const appDir =
    jsonType.appDirDeployment ??
    jsonType.owner?.prodParallel ??
    jsonType.owner?.production;
  ingestDef.name = name;
  ingestDef.appDirDeployment = appDir
    ? deserialize(V1_AppDirNodeModelSchema, appDir)
    : undefined;
  ingestDef.package = packagePath;
  ingestDef.content = json;
  return ingestDef;
};

export const V1_AWSSnowflakeIngestEnvironmentModelSchema = createModelSchema(
  V1_AWSSnowflakeIngestEnvironment,
  {
    _type: usingConstantValueSchema(V1_IngestEnvironmentType.AWSSnowflake),
    urn: primitive(),
    version: primitive(),
    environmentClassification: primitive(),
    producers: usingModelSchema(V1_AppDirNodeModelSchema),
    awsRegion: primitive(),
    awsAccountId: primitive(),
    ingestStepFunctionsAvtivityArn: primitive(),
    ingestStateMachineArn: primitive(),
    ingestSystemAccount: primitive(),
    snowflakeAccount: primitive(),
    snowflakeHost: primitive(),
    s3StagingBucketName: primitive(),
    storageIntegrationName: primitive(),
  },
);

export const V1_deserializeIngestEnvironment = (
  json: PlainObject<V1_IngestEnvironment>,
): V1_IngestEnvironment => {
  switch (json._type) {
    case V1_IngestEnvironmentType.AWSSnowflake:
      return deserialize(V1_AWSSnowflakeIngestEnvironmentModelSchema, json);
    default:
      throw new Error(`Unknown V1_IngestEnvironment type: ${json._type}`);
  }
};
