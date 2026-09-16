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

import { describe, test, expect, jest } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { flowResult } from 'mobx';
import {
  DataSpaceQualityState,
  DATA_SPACE_QUALITY_LEVEL,
  type DataSpaceQualityResult,
} from '../DataSpaceQualityState.js';
import type { DataSpaceViewerState } from '../DataSpaceViewerState.js';

const TEST_RESULT: DataSpaceQualityResult = {
  qualityLevel: DATA_SPACE_QUALITY_LEVEL.GOLD,
  qualityBreakdown: {
    isDescriptionDocumented: true,
    isExecutablesPresent: true,
    isModelsDocumentationPresent: true,
    isEveryServiceDocumented: true,
    attributeCoverage: 0.6,
    documentedAttributeCount: 6,
    totalAttributeCount: 10,
  },
};

function makeViewerStateStub(
  fetchDataSpaceQuality?: () => Promise<DataSpaceQualityResult>,
  warn: () => void = jest.fn(),
): DataSpaceViewerState {
  return {
    fetchDataSpaceQuality,
    applicationStore: {
      logService: { warn },
    },
  } as unknown as DataSpaceViewerState;
}

describe(unitTest('DataSpaceQualityState'), () => {
  test('isSupported is false when the host app did not wire up fetchDataSpaceQuality', () => {
    const qualityState = new DataSpaceQualityState(makeViewerStateStub());

    expect(qualityState.isSupported).toBe(false);
  });

  test('isSupported is true when the host app wired up fetchDataSpaceQuality', () => {
    const qualityState = new DataSpaceQualityState(
      makeViewerStateStub(async () => TEST_RESULT),
    );

    expect(qualityState.isSupported).toBe(true);
  });

  test('computeQuality completes as failed and leaves state undefined when unsupported', async () => {
    const qualityState = new DataSpaceQualityState(makeViewerStateStub());

    await flowResult(qualityState.computeQuality());

    expect(qualityState.computingQualityState.hasFailed).toBe(true);
    expect(qualityState.qualityLevel).toBeUndefined();
    expect(qualityState.qualityBreakdown).toBeUndefined();
  });

  test('computeQuality fetches and stores the result on success', async () => {
    const qualityState = new DataSpaceQualityState(
      makeViewerStateStub(async () => TEST_RESULT),
    );

    await flowResult(qualityState.computeQuality());

    expect(qualityState.computingQualityState.hasSucceeded).toBe(true);
    expect(qualityState.qualityLevel).toBe(DATA_SPACE_QUALITY_LEVEL.GOLD);
    expect(qualityState.qualityBreakdown).toEqual(TEST_RESULT.qualityBreakdown);
  });

  test('computeQuality completes as failed and logs a warning when the fetch throws', async () => {
    const warn = jest.fn();
    const qualityState = new DataSpaceQualityState(
      makeViewerStateStub(async () => {
        throw new Error('boom');
      }, warn),
    );

    await flowResult(qualityState.computeQuality());

    expect(qualityState.computingQualityState.hasFailed).toBe(true);
    expect(qualityState.qualityLevel).toBeUndefined();
    expect(qualityState.qualityBreakdown).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  test('computeQuality only fetches once, even if called again after completing', async () => {
    const fetchDataSpaceQuality = jest.fn(async () => TEST_RESULT);
    const qualityState = new DataSpaceQualityState(
      makeViewerStateStub(fetchDataSpaceQuality),
    );

    await flowResult(qualityState.computeQuality());
    await flowResult(qualityState.computeQuality());

    expect(fetchDataSpaceQuality).toHaveBeenCalledTimes(1);
  });
});
