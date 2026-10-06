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

import { describe, test, expect, jest } from '@jest/globals';
import {
  type V1_BatchLambdaRelationTypeResult,
  type V1_DataProductArtifact,
  V1_AccessPoint,
  V1_EngineError,
  V1_LakehouseAccessPoint,
  V1_RawLambda,
  V1_RelationType,
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

describe('DataProductAccessPointState relation type', () => {
  const APG_ID = 'GROUP1';
  const ACCESS_POINT_ID = 'test_access_point';
  const BATCH_KEY = `${APG_ID}::${ACCESS_POINT_ID}`;
  const ENGINE_ERROR_MESSAGE = "Can't find table 'NOPE' in schema 'NORTHWIND'";
  const BATCH_ERROR_MESSAGE = 'Engine is unavailable';

  const buildState = (
    batchResult: V1_BatchLambdaRelationTypeResult,
    batchError?: Error,
  ): {
    state: DataProductAccessPointState;
    notifyError: jest.Mock<(message: string) => void>;
  } => {
    const notifyError = jest.fn<(message: string) => void>();
    const apgState = {
      apg: { id: APG_ID },
      dataProductViewerState: {
        batchRelationTypePromise: Promise.resolve(batchResult),
        batchRelationTypeError: batchError,
      },
      applicationStore: { notificationService: { notifyError } },
    } as unknown as DataProductAPGState;
    return {
      state: new DataProductAccessPointState(
        apgState,
        buildLakehouseAccessPoint(undefined),
      ),
      notifyError,
    };
  };

  const buildEngineError = (): V1_EngineError => {
    const engineError = new V1_EngineError();
    engineError.message = ENGINE_ERROR_MESSAGE;
    return engineError;
  };

  // the artifact arrives after the engine has answered
  const buildArtifactPromise = (
    relationType: V1_RelationType | undefined,
  ): Promise<V1_DataProductArtifact | undefined> =>
    new Promise((resolve) =>
      setTimeout(
        () =>
          resolve({
            accessPointGroups: [
              {
                id: APG_ID,
                accessPointImplementations: [
                  {
                    id: ACCESS_POINT_ID,
                    lambdaGenericType: relationType
                      ? { typeArguments: [{ rawType: relationType }] }
                      : undefined,
                  },
                ],
              },
            ],
          } as unknown as V1_DataProductArtifact),
        10,
      ),
    );

  test('uses the engine relation type when the engine returns one', async () => {
    const engineRelationType = new V1_RelationType();
    const { state, notifyError } = buildState({
      results: new Map([[BATCH_KEY, engineRelationType]]),
      errors: new Map(),
    });

    await state.fetchRelationType(undefined);

    expect(state.relationType).toBe(engineRelationType);
    expect(notifyError).not.toHaveBeenCalled();
  });

  test.each([
    [
      'an engine error for the access point',
      {
        results: new Map(),
        errors: new Map([[BATCH_KEY, buildEngineError()]]),
      },
      undefined,
    ],
    [
      'a failed batch call',
      { results: new Map(), errors: new Map() },
      new Error(BATCH_ERROR_MESSAGE),
    ],
  ])(
    'uses the artifact relation type when the engine returns %s',
    async (_, batchResult, batchError) => {
      const artifactRelationType = new V1_RelationType();
      const { state, notifyError } = buildState(batchResult, batchError);

      await state.fetchRelationType(buildArtifactPromise(artifactRelationType));

      expect(state.relationType).toBe(artifactRelationType);
      expect(notifyError).not.toHaveBeenCalled();
    },
  );

  test.each([
    [
      'an engine error for the access point',
      {
        results: new Map(),
        errors: new Map([[BATCH_KEY, buildEngineError()]]),
      },
      undefined,
      ENGINE_ERROR_MESSAGE,
    ],
    [
      'a failed batch call',
      { results: new Map(), errors: new Map() },
      new Error(BATCH_ERROR_MESSAGE),
      BATCH_ERROR_MESSAGE,
    ],
  ])(
    'notifies the engine failure when the artifact has no relation type and the engine returns %s',
    async (_, batchResult, batchError, expectedMessage) => {
      const { state, notifyError } = buildState(batchResult, batchError);

      await state.fetchRelationType(buildArtifactPromise(undefined));

      expect(state.relationType).toBeUndefined();
      expect(notifyError).toHaveBeenCalledWith(
        `Error fetching access point relation type: ${expectedMessage}`,
      );
    },
  );

  test('notifies the engine failure when there is no artifact', async () => {
    const { state, notifyError } = buildState(
      { results: new Map(), errors: new Map() },
      new Error(BATCH_ERROR_MESSAGE),
    );

    await state.fetchRelationType(undefined);

    expect(state.relationType).toBeUndefined();
    expect(notifyError).toHaveBeenCalledWith(
      `Error fetching access point relation type: ${BATCH_ERROR_MESSAGE}`,
    );
  });
});
