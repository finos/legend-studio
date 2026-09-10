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

import { test, expect, describe } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  guaranteeNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import {
  SnowflakeComputeSpecification,
  SnowflakeResourceConstraint,
  SnowflakeScalingPolicy,
  SnowflakeWarehouseSize,
  SnowflakeWarehouseType,
} from '@finos/legend-graph';
import {
  getComputeFormFields,
  reconcileComputeSpec,
} from '../ComputeFormDescriptor.js';
import { SNOWFLAKE_COMPUTE_FORM_DESCRIPTOR } from '../SnowflakeComputeFormDescriptor.js';

const DESCRIPTOR = SNOWFLAKE_COMPUTE_FORM_DESCRIPTOR;

const fieldNamed = (key: string) =>
  guaranteeNonNullable(
    getComputeFormFields(DESCRIPTOR).find((f) => f.key === key),
    `no field '${key}' in the Snowflake descriptor`,
  );

const visibleKeys = (spec: SnowflakeComputeSpecification): string[] =>
  getComputeFormFields(DESCRIPTOR)
    .filter((field) => field.visible(spec))
    .map((field) => field.key);

/** Fully populated, so that a field being cleared is observable. */
const standardSpec = (): SnowflakeComputeSpecification => {
  const spec = new SnowflakeComputeSpecification();
  spec.warehouseType = SnowflakeWarehouseType.STANDARD;
  spec.warehouseSize = SnowflakeWarehouseSize.SMALL;
  spec.generation = 2;
  spec.minClusterCount = 1;
  spec.maxClusterCount = 4;
  spec.scalingPolicy = SnowflakeScalingPolicy.STANDARD;
  spec.autoSuspend = 300;
  spec.comment = 'a comment';
  spec.enableQueryAcceleration = true;
  spec.queryAccelerationMaxScaleFactor = 8;
  spec.maxConcurrencyLevel = 8;
  spec.statementQueuedTimeoutInSeconds = 60;
  spec.statementTimeoutInSeconds = 3600;
  return spec;
};

describe(unitTest('Snowflake compute form field visibility'), () => {
  const ALWAYS = [
    'comment',
    'statementQueuedTimeoutInSeconds',
    'statementTimeoutInSeconds',
    'warehouseType',
  ];
  const NON_ADAPTIVE = [
    'autoSuspend',
    'enableQueryAcceleration',
    'maxClusterCount',
    'maxConcurrencyLevel',
    'minClusterCount',
    'queryAccelerationMaxScaleFactor',
    'scalingPolicy',
    'warehouseSize',
  ];

  test.each([
    // both predicates match an exact type, so an absent one gets neither
    [undefined, [...ALWAYS, ...NON_ADAPTIVE]],
    [
      SnowflakeWarehouseType.STANDARD,
      [...ALWAYS, ...NON_ADAPTIVE, 'generation'],
    ],
    [
      SnowflakeWarehouseType.SNOWPARK_OPTIMIZED,
      [...ALWAYS, ...NON_ADAPTIVE, 'resourceConstraint'],
    ],
    [
      SnowflakeWarehouseType.ADAPTIVE,
      [...ALWAYS, 'maxQueryPerformanceLevel', 'queryThroughputMultiplier'],
    ],
  ])('warehouse type %s offers exactly its legal properties', (type, keys) => {
    const spec = standardSpec();
    spec.warehouseType = type;
    expect(visibleKeys(spec).sort()).toEqual([...keys].sort());
  });

  test('the scale factor is offered only while acceleration is on', () => {
    const spec = standardSpec();
    expect(visibleKeys(spec)).toContain('queryAccelerationMaxScaleFactor');

    spec.enableQueryAcceleration = false;
    expect(visibleKeys(spec)).not.toContain('queryAccelerationMaxScaleFactor');
  });
});

describe(unitTest('Snowflake compute enum options'), () => {
  const optionsFor = (key: string): string[] => {
    const field = fieldNamed(key);
    if (field.widget !== 'enum') {
      throw new UnsupportedOperationError(
        `'${key}' must be an enum field`,
        field.widget,
      );
    }
    return field.options.map((option) => String(option.value));
  };

  test('maxQueryPerformanceLevel offers the size enum minus the two the engine rejects', () => {
    expect(optionsFor('maxQueryPerformanceLevel')).toEqual(
      Object.values(SnowflakeWarehouseSize).filter(
        (size) =>
          size !== SnowflakeWarehouseSize.X5LARGE &&
          size !== SnowflakeWarehouseSize.X6LARGE,
      ),
    );
  });
});

describe(unitTest('Snowflake compute spec reconciliation'), () => {
  test('switching to ADAPTIVE clears the sizing properties it forbids', () => {
    const spec = standardSpec();
    spec.warehouseType = SnowflakeWarehouseType.ADAPTIVE;
    reconcileComputeSpec(DESCRIPTOR, spec);

    expect(spec.warehouseType).toBe(SnowflakeWarehouseType.ADAPTIVE);
    expect(spec.warehouseSize).toBeUndefined();
    expect(spec.generation).toBeUndefined();
    expect(spec.resourceConstraint).toBeUndefined();
    expect(spec.minClusterCount).toBeUndefined();
    expect(spec.maxClusterCount).toBeUndefined();
    expect(spec.scalingPolicy).toBeUndefined();
    expect(spec.autoSuspend).toBeUndefined();
    expect(spec.enableQueryAcceleration).toBeUndefined();
    expect(spec.queryAccelerationMaxScaleFactor).toBeUndefined();
    expect(spec.maxConcurrencyLevel).toBeUndefined();

    // what ADAPTIVE still admits survives the transition untouched
    expect(spec.comment).toBe('a comment');
    expect(spec.statementQueuedTimeoutInSeconds).toBe(60);
    expect(spec.statementTimeoutInSeconds).toBe(3600);
  });

  test('returning from ADAPTIVE does not bring back what was cleared', () => {
    const spec = standardSpec();

    spec.warehouseType = SnowflakeWarehouseType.ADAPTIVE;
    reconcileComputeSpec(DESCRIPTOR, spec);
    expect(spec.warehouseSize).toBeUndefined();

    spec.maxQueryPerformanceLevel = SnowflakeWarehouseSize.LARGE;
    spec.queryThroughputMultiplier = 3;
    reconcileComputeSpec(DESCRIPTOR, spec);
    expect(spec.maxQueryPerformanceLevel).toBe(SnowflakeWarehouseSize.LARGE);

    spec.warehouseType = SnowflakeWarehouseType.STANDARD;
    reconcileComputeSpec(DESCRIPTOR, spec);
    expect(spec.maxQueryPerformanceLevel).toBeUndefined();
    expect(spec.queryThroughputMultiplier).toBeUndefined();

    expect(spec.warehouseSize).toBeUndefined();
    expect(spec.generation).toBeUndefined();
    expect(spec.minClusterCount).toBeUndefined();
    expect(spec.maxClusterCount).toBeUndefined();
    expect(spec.scalingPolicy).toBeUndefined();
    expect(spec.autoSuspend).toBeUndefined();
    expect(spec.maxConcurrencyLevel).toBeUndefined();
    expect(spec.comment).toBe('a comment');
    expect(spec.statementQueuedTimeoutInSeconds).toBe(60);
    expect(spec.statementTimeoutInSeconds).toBe(3600);

    expect(spec.warehouseType).toBe(SnowflakeWarehouseType.STANDARD);
    expect(spec.enableQueryAcceleration).toBe(false);
    expect(spec.queryAccelerationMaxScaleFactor).toBeUndefined();
  });

  test('STANDARD to SNOWPARK and back clears generation, then resourceConstraint', () => {
    const spec = standardSpec();

    spec.warehouseType = SnowflakeWarehouseType.SNOWPARK_OPTIMIZED;
    reconcileComputeSpec(DESCRIPTOR, spec);
    expect(spec.generation).toBeUndefined();

    spec.resourceConstraint = SnowflakeResourceConstraint.MEMORY_16X;
    reconcileComputeSpec(DESCRIPTOR, spec);

    spec.warehouseType = SnowflakeWarehouseType.STANDARD;
    reconcileComputeSpec(DESCRIPTOR, spec);
    expect(spec.resourceConstraint).toBeUndefined();
    expect(spec.generation).toBeUndefined();
  });

  test('turning acceleration off clears the scale factor for good', () => {
    const spec = standardSpec();

    spec.enableQueryAcceleration = false;
    reconcileComputeSpec(DESCRIPTOR, spec);
    expect(spec.queryAccelerationMaxScaleFactor).toBeUndefined();

    spec.enableQueryAcceleration = true;
    reconcileComputeSpec(DESCRIPTOR, spec);
    expect(spec.queryAccelerationMaxScaleFactor).toBeUndefined();
  });

  test('a boolean hidden by ADAPTIVE stays absent rather than false', () => {
    const spec = new SnowflakeComputeSpecification();
    spec.warehouseType = SnowflakeWarehouseType.ADAPTIVE;
    reconcileComputeSpec(DESCRIPTOR, spec);
    expect(spec.enableQueryAcceleration).toBeUndefined();
  });

  test('reconciling a bare spec fills in only the fields that carry a default', () => {
    // Snowflake defaults whatever the spec omits
    const spec = new SnowflakeComputeSpecification();
    reconcileComputeSpec(DESCRIPTOR, spec);

    expect(spec.warehouseType).toBe(SnowflakeWarehouseType.STANDARD);
    expect(spec.enableQueryAcceleration).toBe(false);

    expect(spec.warehouseSize).toBeUndefined();
    expect(spec.generation).toBeUndefined();
    expect(spec.minClusterCount).toBeUndefined();
    expect(spec.autoSuspend).toBeUndefined();
    expect(spec.comment).toBeUndefined();
    expect(spec.maxConcurrencyLevel).toBeUndefined();
    expect(spec.statementTimeoutInSeconds).toBeUndefined();
  });
});
