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

import { describe, test, expect } from '@jest/globals';
import {
  V1_AccessPoint,
  V1_LakehouseAccessPoint,
  V1_RawLambda,
} from '@finos/legend-graph';
import { DataProductAccessPointState } from '../DataProductAccessPointState.js';
import type { DataProductAPGState } from '../DataProductAPGState.js';

// apgState is never read by `isParameterized`, so a stub is sufficient here.
const mockApgState = {} as DataProductAPGState;

// A minimal concrete non-lakehouse access point, to test the type-narrowing branch of `isParameterized`.
class TEST__NonLakehouseAccessPoint extends V1_AccessPoint {}

const buildLakehouseAccessPoint = (
  parameters: object | undefined,
): V1_LakehouseAccessPoint => {
  const accessPoint = new V1_LakehouseAccessPoint();
  accessPoint.id = 'test_access_point';
  accessPoint.targetEnvironment = 'Snowflake';
  accessPoint.func = new V1_RawLambda();
  accessPoint.func.parameters = parameters;
  return accessPoint;
};

describe('DataProductAccessPointState', () => {
  describe('isParameterized', () => {
    test('is true when the lakehouse access point function has one or more parameters', () => {
      const accessPoint = buildLakehouseAccessPoint([
        { _type: 'var', name: 'startDate' },
      ]);
      const state = new DataProductAccessPointState(mockApgState, accessPoint);

      expect(state.isParameterized).toBe(true);
    });

    test('is false when the lakehouse access point function has an empty parameters array', () => {
      const accessPoint = buildLakehouseAccessPoint([]);
      const state = new DataProductAccessPointState(mockApgState, accessPoint);

      expect(state.isParameterized).toBe(false);
    });

    test('is false when the lakehouse access point function has no parameters field', () => {
      const accessPoint = buildLakehouseAccessPoint(undefined);
      const state = new DataProductAccessPointState(mockApgState, accessPoint);

      expect(state.isParameterized).toBe(false);
    });

    test('is false for a non-lakehouse access point', () => {
      const accessPoint = new TEST__NonLakehouseAccessPoint();
      accessPoint.id = 'test_non_lakehouse_access_point';
      const state = new DataProductAccessPointState(mockApgState, accessPoint);

      expect(state.isParameterized).toBe(false);
    });
  });
});
