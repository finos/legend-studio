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
  UnsupportedOperationError,
  customList,
  usingConstantValueSchema,
  usingModelSchema,
  type PlainObject,
} from '@finos/legend-shared';
import {
  V1_IngestDataset,
  V1_IngestDatasetSchema,
  V1_IngestDatasetSource,
  V1_IngestDefinition,
  V1_IngestDefinitionContent,
  V1_IngestMatViewTest,
  V1_IngestTestSuite,
  type V1_WriteMode,
  V1_WriteModeType,
  V1_AppendOnly,
  V1_BatchMilestoned,
  V1_BatchMilestonedBusinessTemporal,
} from '../../../model/packageableElements/ingest/V1_IngestDefinition.js';
import type { V1_PackageableElement } from '../../../model/packageableElements/V1_PackageableElement.js';
import type { V1_AppDirNode } from '../../../lakehouse/entitlements/V1_CoreEntitlements.js';
import { V1_AppDirNodeModelSchema } from './lakehouse/V1_CoreEntitlementsSerializationHelper.js';
import {
  createModelSchema,
  custom,
  deserialize,
  list,
  optional,
  primitive,
  serialize,
} from 'serializr';
import { V1_relationTypeColumnModelSchema } from './V1_TypeSerializationHelper.js';
import {
  type V1_IngestEnvironment,
  V1_AWSSnowflakeIngestEnvironment,
  V1_CatalogType,
  V1_IcebergDetails,
  V1_IngestEnvironmentType,
  V1_OpenCatalog,
  type V1_Catalog,
} from '../../../lakehouse/ingest/V1_LakehouseIngestEnvironment.js';
import {
  V1_AWSSnowflakeProducerEnvironment,
  V1_ProducerEnvironmentType,
  type V1_ProducerEnvironment,
} from '../../../lakehouse/ingest/V1_LakehouseProducerEnvironment.js';
import {
  V1_deserializeDataResolver,
  V1_serializeDataResolver,
} from './V1_DataResolverSerializationHelper.js';
import type { V1_DataResolver } from '../../../model/data/V1_DataResolver.js';
import {
  V1_deserializeTestAssertion,
  V1_serializeTestAssertion,
} from './V1_TestSerializationHelper.js';

type IngestDefinitionInterface = {
  appDirDeployment?: PlainObject<V1_AppDirNode> | undefined;
  owner?: {
    prodParallel?: PlainObject<V1_AppDirNode> | undefined;
    production?: PlainObject<V1_AppDirNode> | undefined;
  };
};

export const V1_OpenCatalogModelSchema = createModelSchema(V1_OpenCatalog, {
  name: primitive(),
  url: primitive(),
  proxyUrl: primitive(),
  _type: usingConstantValueSchema(V1_CatalogType.OpenCatalog),
});

export const V1_deserializeCatalog = (
  json: PlainObject<V1_Catalog>,
): V1_Catalog => {
  switch (json._type) {
    case V1_CatalogType.OpenCatalog:
      return deserialize(V1_OpenCatalogModelSchema, json);
    default:
      throw new Error(`Unknown V1_Catalog type: ${json._type}`);
  }
};

export const V1_serializeCatalog = (protocol: V1_Catalog): V1_Catalog => {
  if (protocol instanceof V1_OpenCatalog) {
    return serialize(V1_OpenCatalogModelSchema, protocol);
  }
  throw new UnsupportedOperationError(`Unknown V1_Catalog type:`, protocol);
};

export const V1_IcebergDetailsModelSchema = createModelSchema(
  V1_IcebergDetails,
  {
    catalog: custom(
      (val) => V1_serializeCatalog(val),
      (val) => V1_deserializeCatalog(val),
    ),
  },
);

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
    iceberg: usingModelSchema(V1_IcebergDetailsModelSchema),
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

export const V1_AWSSnowflakeProducerEnvironmentModelSchema = createModelSchema(
  V1_AWSSnowflakeProducerEnvironment,
  {
    _type: primitive(),
    appDirDeployment: usingModelSchema(V1_AppDirNodeModelSchema),
    snowflakeRole: primitive(),
    databaseName: primitive(),
    warehouseName: primitive(),
    stageName: primitive(),
    icebergEnabled: primitive(),
    databaseOwnerDeploymentId: primitive(),
  },
);

export const V1_deserializeProducerEnvironment = (
  json: PlainObject<V1_ProducerEnvironment>,
): V1_ProducerEnvironment => {
  switch (json._type) {
    case V1_ProducerEnvironmentType.AWSSnowflake:
    case V1_ProducerEnvironmentType.AWSSnowflakeWithOnPremS3Only:
    case V1_ProducerEnvironmentType.AWSSnowflakeWithProducerManagedStageBucket:
      return deserialize(V1_AWSSnowflakeProducerEnvironmentModelSchema, json);
    default:
      throw new Error(`Unknown V1_ProducerEnvironment type: ${json._type}`);
  }
};

// --------------------------------------------- Ingest Dataset Content ---------------------------------------------

const V1_IngestDatasetSchemaModelSchema = createModelSchema(
  V1_IngestDatasetSchema,
  {
    _type: primitive(),
    columns: list(usingModelSchema(V1_relationTypeColumnModelSchema)),
  },
);

const V1_IngestDatasetSourceModelSchema = createModelSchema(
  V1_IngestDatasetSource,
  {
    _type: primitive(),
    schema: usingModelSchema(V1_IngestDatasetSchemaModelSchema),
  },
);

const V1_AppendOnlyModelSchema = createModelSchema(V1_AppendOnly, {
  _type: usingConstantValueSchema(V1_WriteModeType.APPEND_ONLY),
});

const V1_BatchMilestonedModelSchema = createModelSchema(V1_BatchMilestoned, {
  _type: usingConstantValueSchema(V1_WriteModeType.BATCH_MILESTONED),
});

const V1_BatchMilestonedBusinessTemporalModelSchema = createModelSchema(
  V1_BatchMilestonedBusinessTemporal,
  {
    _type: usingConstantValueSchema(
      V1_WriteModeType.BATCH_MILESTONED_BUSINESS_TEMPORAL,
    ),
  },
);

export const V1_deserializeWriteMode = (
  json: PlainObject<V1_WriteMode>,
): V1_WriteMode => {
  switch (json._type) {
    case V1_WriteModeType.APPEND_ONLY:
      return deserialize(V1_AppendOnlyModelSchema, json);
    case V1_WriteModeType.BATCH_MILESTONED:
      return deserialize(V1_BatchMilestonedModelSchema, json);
    case V1_WriteModeType.BATCH_MILESTONED_BUSINESS_TEMPORAL:
      return deserialize(V1_BatchMilestonedBusinessTemporalModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Unknown write mode type: ${json._type}`,
      );
  }
};

export const V1_serializeWriteMode = (
  protocol: V1_WriteMode,
): PlainObject<V1_WriteMode> => {
  if (protocol instanceof V1_AppendOnly) {
    return serialize(V1_AppendOnlyModelSchema, protocol);
  } else if (protocol instanceof V1_BatchMilestoned) {
    return serialize(V1_BatchMilestonedModelSchema, protocol);
  } else if (protocol instanceof V1_BatchMilestonedBusinessTemporal) {
    return serialize(V1_BatchMilestonedBusinessTemporalModelSchema, protocol);
  }
  throw new UnsupportedOperationError(`Unknown write mode type`, protocol);
};

export const V1_IngestDatasetModelSchema = createModelSchema(V1_IngestDataset, {
  name: primitive(),
  primaryKey: list(primitive()),
  source: usingModelSchema(V1_IngestDatasetSourceModelSchema),
  writeMode: optional(
    custom(
      (val) => (val ? V1_serializeWriteMode(val) : undefined),
      (val) => (val ? V1_deserializeWriteMode(val) : undefined),
    ),
  ),
});

const V1_ingestMatViewTestModelSchema = createModelSchema(
  V1_IngestMatViewTest,
  {
    assertions: list(
      custom(
        (val) => V1_serializeTestAssertion(val),
        (val) => V1_deserializeTestAssertion(val),
      ),
    ),
    datasetId: primitive(),
    doc: optional(primitive()),
    id: primitive(),
  },
);

const V1_ingestTestSuiteModelSchema = createModelSchema(V1_IngestTestSuite, {
  doc: optional(primitive()),
  id: primitive(),
  testData: customList(
    (value: V1_DataResolver) => V1_serializeDataResolver(value, []),
    (value) => V1_deserializeDataResolver(value, []),
    {
      INTERNAL__forceReturnEmptyInTest: true,
    },
  ),
  tests: list(
    custom(
      (value) => serialize(V1_ingestMatViewTestModelSchema, value),
      (value) => deserialize(V1_ingestMatViewTestModelSchema, value),
    ),
  ),
});

export const V1_serializeIngestTestSuite = (
  suite: V1_IngestTestSuite,
): PlainObject<V1_IngestTestSuite> =>
  serialize(V1_ingestTestSuiteModelSchema, suite);

export const V1_IngestDefinitionContentModelSchema = createModelSchema(
  V1_IngestDefinitionContent,
  {
    datasets: optional(list(usingModelSchema(V1_IngestDatasetModelSchema))),
    testSuites: optional(
      customList(
        (value) => serialize(V1_ingestTestSuiteModelSchema, value),
        (value) => deserialize(V1_ingestTestSuiteModelSchema, value),
        {
          INTERNAL__forceReturnEmptyInTest: true,
        },
      ),
    ),
    writeMode: optional(
      custom(
        (val) => (val ? V1_serializeWriteMode(val) : undefined),
        (val) => (val ? V1_deserializeWriteMode(val) : undefined),
      ),
    ),
  },
);

export const V1_deserializeIngestDefinitionContent = (
  json: PlainObject<V1_IngestDefinitionContent>,
): V1_IngestDefinitionContent =>
  deserialize(V1_IngestDefinitionContentModelSchema, json);

export const V1_serializeIngestDefinitionContent = (
  content: V1_IngestDefinitionContent,
): PlainObject<V1_IngestDefinitionContent> =>
  serialize(V1_IngestDefinitionContentModelSchema, content);

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
  const parsedContent = deserialize(
    V1_IngestDefinitionContentModelSchema,
    json,
  );
  ingestDef.testSuites = parsedContent.testSuites ?? [];
  const { testSuites: _testSuites, ...contentWithoutTestSuites } = json;
  ingestDef.content = contentWithoutTestSuites;
  return ingestDef;
};
