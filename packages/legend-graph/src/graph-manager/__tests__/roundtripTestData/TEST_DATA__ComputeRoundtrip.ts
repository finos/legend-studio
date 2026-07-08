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

export const TEST_DATA__COMPUTE_SNOWFLAKE = [
  {
    path: 'compute::SnowflakeWh',
    content: {
      _type: 'compute',
      name: 'SnowflakeWh',
      owner: {
        _type: 'appDir',
        production: {
          appDirId: 12345,
          level: 'DEPLOYMENT',
        },
      },
      package: 'compute',
      specification: {
        _type: 'snowflakeComputeSpecification',
        autoResume: true,
        autoSuspend: 300,
        comment: 'small Snowflake warehouse',
        enableQueryAcceleration: false,
        maxClusterCount: 4,
        minClusterCount: 1,
        scalingPolicy: 'STANDARD',
        warehouseSize: 'SMALL',
        warehouseType: 'STANDARD',
      },
    },
    classifierPath:
      'meta::external::compute::specification::metamodel::Compute',
  },
];

// Forward-compat: a Compute whose specification _type isn't known to this
// Studio build (e.g. a future BigQuery variant). The serializer must wrap it
// in V1_UnknownComputeSpecification on load and emit the same content on save
// so the entity survives round-trip without dropping fields.
export const TEST_DATA__COMPUTE_UNKNOWN_SPEC = [
  {
    path: 'compute::FutureWh',
    content: {
      _type: 'compute',
      name: 'FutureWh',
      owner: {
        _type: 'appDir',
        production: {
          appDirId: 99999,
          level: 'DEPLOYMENT',
        },
      },
      package: 'compute',
      specification: {
        _type: 'bigQueryComputeSpecification',
        nestedConfig: {
          location: 'US',
          slots: 100,
        },
        someFutureField: 'some-value',
      },
    },
    classifierPath:
      'meta::external::compute::specification::metamodel::Compute',
  },
];

export const TEST_DATA__COMPUTE_DATABRICKS = [
  {
    path: 'compute::DbxWh',
    content: {
      _type: 'compute',
      name: 'DbxWh',
      owner: {
        _type: 'appDir',
        prodParallel: {
          appDirId: 67890,
          level: 'DEPLOYMENT',
        },
        production: {
          appDirId: 12345,
          level: 'DEPLOYMENT',
        },
      },
      package: 'compute',
      specification: {
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
    },
    classifierPath:
      'meta::external::compute::specification::metamodel::Compute',
  },
];
