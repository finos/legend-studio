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

import {
  type SnowflakeComputeSpecification,
  SnowflakeResourceConstraint,
  SnowflakeScalingPolicy,
  SnowflakeWarehouseSize,
  SnowflakeWarehouseType,
} from '@finos/legend-graph';
import {
  type ComputeEnumOption,
  type ComputeEnumOptionValue,
  type ComputeFormDescriptor,
} from './ComputeFormDescriptor.js';
import {
  snowflakeSpec_setAutoSuspend,
  snowflakeSpec_setComment,
  snowflakeSpec_setEnableQueryAcceleration,
  snowflakeSpec_setGeneration,
  snowflakeSpec_setMaxClusterCount,
  snowflakeSpec_setMaxConcurrencyLevel,
  snowflakeSpec_setMaxQueryPerformanceLevel,
  snowflakeSpec_setMinClusterCount,
  snowflakeSpec_setQueryAccelerationMaxScaleFactor,
  snowflakeSpec_setQueryThroughputMultiplier,
  snowflakeSpec_setResourceConstraint,
  snowflakeSpec_setScalingPolicy,
  snowflakeSpec_setStatementQueuedTimeoutInSeconds,
  snowflakeSpec_setStatementTimeoutInSeconds,
  snowflakeSpec_setWarehouseSize,
  snowflakeSpec_setWarehouseType,
} from '../../../../graph-modifier/DSL_Compute_GraphModifierHelper.js';

const toEnumOptions = (values: string[]): ComputeEnumOption[] =>
  values.map((value) => ({ label: value, value }));

const WAREHOUSE_TYPE_OPTIONS = toEnumOptions(
  Object.values(SnowflakeWarehouseType),
);
const WAREHOUSE_SIZE_OPTIONS = toEnumOptions(
  Object.values(SnowflakeWarehouseSize),
);
const RESOURCE_CONSTRAINT_OPTIONS = toEnumOptions(
  Object.values(SnowflakeResourceConstraint),
);
const SCALING_POLICY_OPTIONS = toEnumOptions(
  Object.values(SnowflakeScalingPolicy),
);
const GENERATION_OPTIONS: ComputeEnumOption[] = [
  { label: '1', value: 1 },
  { label: '2', value: 2 },
];

/** Typed as a warehouse size; the engine rejects the two above `X4LARGE`. */
const MAX_QUERY_PERFORMANCE_LEVEL_OPTIONS: ComputeEnumOption[] = [
  { label: 'XSMALL', value: SnowflakeWarehouseSize.XSMALL },
  { label: 'SMALL', value: SnowflakeWarehouseSize.SMALL },
  { label: 'MEDIUM', value: SnowflakeWarehouseSize.MEDIUM },
  { label: 'LARGE', value: SnowflakeWarehouseSize.LARGE },
  { label: 'XLARGE', value: SnowflakeWarehouseSize.XLARGE },
  { label: 'XXLARGE', value: SnowflakeWarehouseSize.XXLARGE },
  { label: 'XXXLARGE', value: SnowflakeWarehouseSize.XXXLARGE },
  { label: 'X4LARGE', value: SnowflakeWarehouseSize.X4LARGE },
];

/** Safe because a field's options are drawn from that enum's members. */
const asEnumSetter =
  <T extends string>(
    setter: (spec: SnowflakeComputeSpecification, value: T | undefined) => void,
  ) =>
  (
    spec: SnowflakeComputeSpecification,
    value: ComputeEnumOptionValue | undefined,
  ): void =>
    setter(spec, value as T | undefined);

const isAdaptive = (spec: SnowflakeComputeSpecification): boolean =>
  spec.warehouseType === SnowflakeWarehouseType.ADAPTIVE;
const isNotAdaptive = (spec: SnowflakeComputeSpecification): boolean =>
  !isAdaptive(spec);

export const SNOWFLAKE_COMPUTE_FORM_DESCRIPTOR: ComputeFormDescriptor = {
  label: 'snowflake compute',
  leadField: {
    key: 'warehouseType',
    label: 'Warehouse Type',
    widget: 'enum',
    options: WAREHOUSE_TYPE_OPTIONS,
    // never absent: it decides which other properties are legal
    defaultValue: SnowflakeWarehouseType.STANDARD,
    visible: () => true,
    get: (spec) => spec.warehouseType,
    set: asEnumSetter(snowflakeSpec_setWarehouseType),
  },
  sections: [
    {
      title: 'Warehouse',
      fields: [
        {
          key: 'warehouseSize',
          label: 'Warehouse Size',
          widget: 'enum',
          options: WAREHOUSE_SIZE_OPTIONS,
          visible: isNotAdaptive,
          get: (spec) => spec.warehouseSize,
          set: asEnumSetter(snowflakeSpec_setWarehouseSize),
        },
        {
          key: 'generation',
          label: 'Generation',
          widget: 'enum',
          options: GENERATION_OPTIONS,
          visible: (spec) =>
            spec.warehouseType === SnowflakeWarehouseType.STANDARD,
          get: (spec) => spec.generation,
          set: (spec, value) =>
            snowflakeSpec_setGeneration(
              spec,
              value === undefined ? undefined : Number(value),
            ),
        },
        {
          key: 'resourceConstraint',
          label: 'Resource Constraint',
          widget: 'enum',
          options: RESOURCE_CONSTRAINT_OPTIONS,
          visible: (spec) =>
            spec.warehouseType === SnowflakeWarehouseType.SNOWPARK_OPTIMIZED,
          get: (spec) => spec.resourceConstraint,
          set: asEnumSetter(snowflakeSpec_setResourceConstraint),
        },
      ],
    },
    {
      title: 'Cluster',
      fields: [
        {
          key: 'minClusterCount',
          label: 'Min Cluster Count',
          widget: 'number',
          visible: isNotAdaptive,
          get: (spec) => spec.minClusterCount,
          set: snowflakeSpec_setMinClusterCount,
        },
        {
          key: 'maxClusterCount',
          label: 'Max Cluster Count',
          widget: 'number',
          visible: isNotAdaptive,
          get: (spec) => spec.maxClusterCount,
          set: snowflakeSpec_setMaxClusterCount,
        },
        {
          key: 'scalingPolicy',
          label: 'Scaling Policy',
          widget: 'enum',
          options: SCALING_POLICY_OPTIONS,
          visible: isNotAdaptive,
          get: (spec) => spec.scalingPolicy,
          set: asEnumSetter(snowflakeSpec_setScalingPolicy),
        },
      ],
    },
    {
      title: 'Adaptive Sizing',
      fields: [
        {
          key: 'maxQueryPerformanceLevel',
          label: 'Max Query Performance Level',
          widget: 'enum',
          options: MAX_QUERY_PERFORMANCE_LEVEL_OPTIONS,
          visible: isAdaptive,
          get: (spec) => spec.maxQueryPerformanceLevel,
          set: asEnumSetter(snowflakeSpec_setMaxQueryPerformanceLevel),
        },
        {
          key: 'queryThroughputMultiplier',
          label: 'Query Throughput Multiplier',
          widget: 'number',
          visible: isAdaptive,
          get: (spec) => spec.queryThroughputMultiplier,
          set: snowflakeSpec_setQueryThroughputMultiplier,
        },
      ],
    },
    {
      title: 'Concurrency & Timeouts',
      fields: [
        {
          key: 'maxConcurrencyLevel',
          label: 'Max Concurrency Level',
          widget: 'number',
          visible: isNotAdaptive,
          get: (spec) => spec.maxConcurrencyLevel,
          set: snowflakeSpec_setMaxConcurrencyLevel,
        },
        {
          key: 'statementQueuedTimeoutInSeconds',
          label: 'Statement Queued Timeout (seconds)',
          widget: 'number',
          visible: () => true,
          get: (spec) => spec.statementQueuedTimeoutInSeconds,
          set: snowflakeSpec_setStatementQueuedTimeoutInSeconds,
        },
        {
          key: 'statementTimeoutInSeconds',
          label: 'Statement Timeout (seconds)',
          widget: 'number',
          visible: () => true,
          get: (spec) => spec.statementTimeoutInSeconds,
          set: snowflakeSpec_setStatementTimeoutInSeconds,
        },
      ],
    },
    {
      title: 'Advanced',
      fields: [
        {
          key: 'autoSuspend',
          label: 'Auto Suspend (seconds)',
          widget: 'number',
          visible: isNotAdaptive,
          get: (spec) => spec.autoSuspend,
          set: snowflakeSpec_setAutoSuspend,
        },
        {
          key: 'comment',
          label: 'Comment',
          widget: 'text',
          visible: () => true,
          get: (spec) => spec.comment,
          set: snowflakeSpec_setComment,
        },
        {
          key: 'enableQueryAcceleration',
          label: 'Query Acceleration',
          widget: 'boolean',
          // a checkbox is two-state: unchecked means `false`, never absent
          defaultValue: false,
          visible: isNotAdaptive,
          get: (spec) => spec.enableQueryAcceleration,
          set: snowflakeSpec_setEnableQueryAcceleration,
        },
        {
          key: 'queryAccelerationMaxScaleFactor',
          label: 'Query Acceleration Max Scale Factor',
          widget: 'number',
          visible: (spec) =>
            isNotAdaptive(spec) && spec.enableQueryAcceleration === true,
          get: (spec) => spec.queryAccelerationMaxScaleFactor,
          set: snowflakeSpec_setQueryAccelerationMaxScaleFactor,
        },
      ],
    },
  ],
};
