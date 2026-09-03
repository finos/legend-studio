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

import type {
  SnowflakeComputeSpecification,
  SnowflakeResourceConstraint,
  SnowflakeScalingPolicy,
  SnowflakeWarehouseSize,
  SnowflakeWarehouseType,
} from '@finos/legend-graph';
import { action } from 'mobx';

// Every field is optional, so `undefined` unsets it — including via the reconcile pass, which relies on this to drop fields the warehouse type forbids.

export const snowflakeSpec_setWarehouseType = action(
  (
    spec: SnowflakeComputeSpecification,
    value: SnowflakeWarehouseType | undefined,
  ) => {
    spec.warehouseType = value;
  },
);

export const snowflakeSpec_setWarehouseSize = action(
  (
    spec: SnowflakeComputeSpecification,
    value: SnowflakeWarehouseSize | undefined,
  ) => {
    spec.warehouseSize = value;
  },
);

export const snowflakeSpec_setGeneration = action(
  (spec: SnowflakeComputeSpecification, value: number | undefined) => {
    spec.generation = value;
  },
);

export const snowflakeSpec_setResourceConstraint = action(
  (
    spec: SnowflakeComputeSpecification,
    value: SnowflakeResourceConstraint | undefined,
  ) => {
    spec.resourceConstraint = value;
  },
);

export const snowflakeSpec_setMaxClusterCount = action(
  (spec: SnowflakeComputeSpecification, value: number | undefined) => {
    spec.maxClusterCount = value;
  },
);

export const snowflakeSpec_setMinClusterCount = action(
  (spec: SnowflakeComputeSpecification, value: number | undefined) => {
    spec.minClusterCount = value;
  },
);

export const snowflakeSpec_setScalingPolicy = action(
  (
    spec: SnowflakeComputeSpecification,
    value: SnowflakeScalingPolicy | undefined,
  ) => {
    spec.scalingPolicy = value;
  },
);

export const snowflakeSpec_setAutoSuspend = action(
  (spec: SnowflakeComputeSpecification, value: number | undefined) => {
    spec.autoSuspend = value;
  },
);

export const snowflakeSpec_setComment = action(
  (spec: SnowflakeComputeSpecification, value: string | undefined) => {
    spec.comment = value;
  },
);

export const snowflakeSpec_setEnableQueryAcceleration = action(
  (spec: SnowflakeComputeSpecification, value: boolean | undefined) => {
    spec.enableQueryAcceleration = value;
  },
);

export const snowflakeSpec_setQueryAccelerationMaxScaleFactor = action(
  (spec: SnowflakeComputeSpecification, value: number | undefined) => {
    spec.queryAccelerationMaxScaleFactor = value;
  },
);

export const snowflakeSpec_setMaxConcurrencyLevel = action(
  (spec: SnowflakeComputeSpecification, value: number | undefined) => {
    spec.maxConcurrencyLevel = value;
  },
);

export const snowflakeSpec_setStatementQueuedTimeoutInSeconds = action(
  (spec: SnowflakeComputeSpecification, value: number | undefined) => {
    spec.statementQueuedTimeoutInSeconds = value;
  },
);

export const snowflakeSpec_setStatementTimeoutInSeconds = action(
  (spec: SnowflakeComputeSpecification, value: number | undefined) => {
    spec.statementTimeoutInSeconds = value;
  },
);

export const snowflakeSpec_setMaxQueryPerformanceLevel = action(
  (
    spec: SnowflakeComputeSpecification,
    value: SnowflakeWarehouseSize | undefined,
  ) => {
    spec.maxQueryPerformanceLevel = value;
  },
);

export const snowflakeSpec_setQueryThroughputMultiplier = action(
  (spec: SnowflakeComputeSpecification, value: number | undefined) => {
    spec.queryThroughputMultiplier = value;
  },
);
