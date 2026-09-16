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
import { unitTest } from '@finos/legend-shared/test';
import {
  DEFAULT_TELEMETRY_MESSAGE_LENGTH_LIMIT,
  NetworkClientError,
} from '@finos/legend-shared';
import { QueryBuilderResultState } from '../QueryBuilderResultState.js';

/**
 * `buildFailureTelemetryData()` is the single source of the payload for all
 * four failure events (`run-query`, `generate-plan`, `debug-plan`,
 * `export-query-data`), so the dimensions asserted here are the ones every
 * failure dashboard joins on.
 */

const TELEMETRY_CONTEXT = {
  sourceType: 'data-product',
  groupId: 'com.company.demo',
  dataProduct: 'demo::MyProduct',
  state: { class: 'demo::Person', mapping: 'demo::PersonMapping' },
};

const QUERY_INFO = { fetchStructureType: 'TABULAR_DATA_STRUCTURE' };

const buildStub = (extraMetadata: Record<string, unknown> = {}): unknown => ({
  queryBuilderState: {
    safeGetQueryInfo: () => QUERY_INFO,
    safeGetTelemetryContext: () => TELEMETRY_CONTEXT,
    safeGetExtraTelemetryMetadata: () => extraMetadata,
  },
});

const build = (
  stub: unknown,
  error: Error,
  extra?: Parameters<
    typeof QueryBuilderResultState.prototype.buildFailureTelemetryData
  >[1],
): Record<string, unknown> =>
  QueryBuilderResultState.prototype.buildFailureTelemetryData.call(
    stub as never,
    error,
    extra,
  ) as Record<string, unknown>;

describe(unitTest('QueryBuilderResultState.buildFailureTelemetryData'), () => {
  test(
    unitTest('carries the error name and message, and the shared envelope'),
    () => {
      const payload = build(buildStub(), new Error('engine exploded'));
      expect(payload).toEqual({
        errorMessage: 'engine exploded',
        errorName: 'Error',
        httpStatus: undefined,
        queryInfo: QUERY_INFO,
        ...TELEMETRY_CONTEXT,
      });
      // the execution context must stay nested, never flattened alongside
      // the source info
      expect(payload.state).toEqual({
        class: 'demo::Person',
        mapping: 'demo::PersonMapping',
      });
      expect(payload.class).toBeUndefined();
    },
  );

  test(unitTest('extracts httpStatus from a NetworkClientError'), () => {
    const error = new NetworkClientError(
      { status: 503 } as Response,
      'Service Unavailable',
    );
    const payload = build(buildStub(), error);
    expect(payload.httpStatus).toBe(503);
  });

  test(unitTest('leaves httpStatus undefined for a non-network error'), () => {
    expect(build(buildStub(), new Error('boom')).httpStatus).toBeUndefined();
  });

  test(
    unitTest('preserves a subclassed error name rather than reporting Error'),
    () => {
      class ExecutionTimeoutError extends Error {
        override name = 'ExecutionTimeoutError';
      }
      expect(
        build(buildStub(), new ExecutionTimeoutError('too slow')).errorName,
      ).toBe('ExecutionTimeoutError');
    },
  );

  test(unitTest('merges the optional trace id, duration and timings'), () => {
    const payload = build(buildStub(), new Error('boom'), {
      executionDurationMs: 1840,
      executionTraceId: 'trace-abc',
      timings: { total: 1840, 'query-builder.run-query.prepare': 184 },
    });
    expect(payload.executionDurationMs).toBe(1840);
    expect(payload.executionTraceId).toBe('trace-abc');
    expect(payload.timings).toEqual({
      total: 1840,
      'query-builder.run-query.prepare': 184,
    });
  });

  test(unitTest('includes plugin-supplied extra telemetry metadata'), () => {
    const payload = build(
      buildStub({ agentChat: { traceId: 'abc' } }),
      new Error('boom'),
    );
    expect(payload.agentChat).toEqual({ traceId: 'abc' });
  });

  test(
    unitTest('caps an oversized error message and flags the truncation'),
    () => {
      const payload = build(
        buildStub(),
        new Error('z'.repeat(DEFAULT_TELEMETRY_MESSAGE_LENGTH_LIMIT + 500)),
      );
      expect((payload.errorMessage as string).length).toBe(
        DEFAULT_TELEMETRY_MESSAGE_LENGTH_LIMIT,
      );
      // the flag is what lets an analyst tell a missed substring search from a
      // genuinely absent substring
      expect(payload.errorMessageTruncated).toBe(true);
    },
  );

  test(unitTest('leaves a normal-length message intact and unflagged'), () => {
    const payload = build(buildStub(), new Error('engine exploded'));
    expect(payload.errorMessage).toBe('engine exploded');
    expect(payload.errorMessageTruncated).toBeUndefined();
  });

  test(
    unitTest('omits optional fields entirely when no extras are supplied'),
    () => {
      const payload = build(buildStub(), new Error('boom'));
      expect(Object.keys(payload)).not.toContain('executionTraceId');
      expect(Object.keys(payload)).not.toContain('executionDurationMs');
      expect(Object.keys(payload)).not.toContain('timings');
    },
  );
});
