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

import type { Entity } from '@finos/legend-storage';

const COMPUTE_CLASSIFIER_PATH =
  'meta::external::compute::specification::metamodel::Compute';

const deploymentNode = (appDirId: number): Record<string, unknown> => ({
  appDirId,
  level: 'DEPLOYMENT',
});

const PRODUCTION_OWNER: Record<string, unknown> = {
  _type: 'appDir',
  production: deploymentNode(12345),
};

const computeEntity = (
  name: string,
  specification: Record<string, unknown>,
  owner: Record<string, unknown> = PRODUCTION_OWNER,
): Entity[] => [
  {
    path: `compute::${name}`,
    content: {
      _type: 'compute',
      name,
      owner,
      package: 'compute',
      specification,
    },
    classifierPath: COMPUTE_CLASSIFIER_PATH,
  },
];

export const TEST_DATA__COMPUTE_SNOWFLAKE = computeEntity('SnowflakeWh', {
  _type: 'snowflakeComputeSpecification',
  autoSuspend: 300,
  comment: 'small Snowflake warehouse',
  enableQueryAcceleration: false,
  generation: 2,
  maxClusterCount: 4,
  maxConcurrencyLevel: 8,
  minClusterCount: 1,
  queryAccelerationMaxScaleFactor: 2,
  scalingPolicy: 'STANDARD',
  statementQueuedTimeoutInSeconds: 300,
  statementTimeoutInSeconds: 3600,
  warehouseSize: 'SMALL',
  warehouseType: 'STANDARD',
});

// SNOWPARK_OPTIMIZED is the only type that may carry `resourceConstraint`,
// which is mutually exclusive with `generation`.
export const TEST_DATA__COMPUTE_SNOWFLAKE_SNOWPARK = computeEntity(
  'SnowparkWh',
  {
    _type: 'snowflakeComputeSpecification',
    resourceConstraint: 'MEMORY_16X',
    warehouseSize: 'LARGE',
    warehouseType: 'SNOWPARK_OPTIMIZED',
  },
);

// A partial spec is the normal case, not an edge case. `enableQueryAcceleration`
// is absent and must not be coerced, or an untouched element reads as modified.
export const TEST_DATA__COMPUTE_SNOWFLAKE_PARTIAL = computeEntity('PartialWh', {
  _type: 'snowflakeComputeSpecification',
  warehouseSize: 'SMALL',
  warehouseType: 'STANDARD',
});

// ADAPTIVE allows only `comment`, the two adaptive-only properties and the two
// statement timeouts — but not `maxConcurrencyLevel`, despite it being the same
// kind of property. `queryThroughputMultiplier` is 0 (Snowflake's "unlimited")
// to check a falsy value still reaches the wire.
export const TEST_DATA__COMPUTE_SNOWFLAKE_ADAPTIVE = computeEntity(
  'AdaptiveWh',
  {
    _type: 'snowflakeComputeSpecification',
    comment: 'fully managed by Snowflake',
    maxQueryPerformanceLevel: 'X4LARGE',
    queryThroughputMultiplier: 0,
    statementQueuedTimeoutInSeconds: 120,
    statementTimeoutInSeconds: 604800,
    warehouseType: 'ADAPTIVE',
  },
);

// Studio lets a Compute be created before the AppDir ID is known, so a partial
// owner must survive round-trip rather than being rejected or invented.
export const TEST_DATA__COMPUTE_NO_PRODUCTION_OWNER = computeEntity(
  'NoOwnerWh',
  {
    _type: 'snowflakeComputeSpecification',
    warehouseType: 'STANDARD',
  },
  { _type: 'appDir' },
);

// Forward-compat: a spec `_type` this build doesn't know. It must round-trip
// through `V1_UnknownComputeSpecification` without losing fields.
export const TEST_DATA__COMPUTE_UNKNOWN_SPEC = computeEntity(
  'FutureWh',
  {
    _type: 'bigQueryComputeSpecification',
    nestedConfig: {
      location: 'US',
      slots: 100,
    },
    someFutureField: 'some-value',
  },
  { _type: 'appDir', production: deploymentNode(99999) },
);

export const TEST_DATA__COMPUTE_DATABRICKS = computeEntity(
  'DbxWh',
  {
    _type: 'databricksComputeSpecification',
    autoStopMins: 30,
    clusterSize: 'SMALL',
    enablePhoton: true,
    maxNumClusters: 8,
    minNumClusters: 2,
    spotInstancePolicy: 'COST_OPTIMIZED',
    tags: [
      { key: 'env', value: 'prod' },
      { key: 'team', value: 'data-platform' },
    ],
  },
  {
    _type: 'appDir',
    prodParallel: deploymentNode(67890),
    production: deploymentNode(12345),
  },
);
