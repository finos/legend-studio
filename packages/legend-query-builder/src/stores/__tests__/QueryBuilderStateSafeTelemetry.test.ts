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
import { unitTest } from '@finos/legend-shared/test';
import { QueryBuilderState } from '../QueryBuilderState.js';
import {
  QUERY_BUILDER_EVENT,
  QUERY_BUILDER_OPENED_FROM,
} from '../../__lib__/QueryBuilderEvent.js';

/**
 * The `safeGet*` methods on `QueryBuilderState` wrap the raw snapshot getters
 * used for telemetry so a throw in any of them cannot abort user-visible
 * actions like `runQuery`. We test them by invoking each method with a hand
 * -rolled `this` context so we don't have to spin up a full QueryBuilderState.
 */
const buildStub = (
  overrides: Record<string, unknown>,
): { stub: unknown; warn: jest.Mock } => {
  const warn = jest.fn();
  // built on the real prototype chain, rather than a bare object literal, so
  // the private `safeGetTelemetry` helper the `safeGet*` methods delegate to
  // resolves via inheritance instead of being undefined on `this`
  const stub = Object.assign(Object.create(QueryBuilderState.prototype), {
    applicationStore: {
      logService: { warn },
    },
    ...overrides,
  }) as object;
  return { stub, warn };
};

describe(unitTest('QueryBuilderState telemetry snapshot accessors'), () => {
  test(
    unitTest(
      'safeGetQueryInfo returns the snapshot when getQueryInfo succeeds',
    ),
    () => {
      const snapshot = {
        fetchStructureType: 'TABULAR_DATA_STRUCTURE',
        parameterCount: 0,
        constantCount: 0,
        hasFilter: false,
        filterNodeCount: 0,
        watermarkEnabled: false,
        milestoningKind: 'none',
      };
      const { stub, warn } = buildStub({
        getQueryInfo: () => snapshot,
      });
      const result = QueryBuilderState.prototype.safeGetQueryInfo.call(
        stub as never,
      );
      expect(result).toBe(snapshot);
      expect(warn).not.toHaveBeenCalled();
    },
  );

  test(
    unitTest(
      'safeGetQueryInfo returns undefined and logs a warning when getQueryInfo throws',
    ),
    () => {
      const { stub, warn } = buildStub({
        getQueryInfo: () => {
          throw new Error('boom');
        },
      });
      const result = QueryBuilderState.prototype.safeGetQueryInfo.call(
        stub as never,
      );
      expect(result).toBeUndefined();
      expect(warn).toHaveBeenCalledTimes(1);
    },
  );

  test(
    unitTest(
      'safeGetTelemetryContext spreads source info flat and nests the execution context',
    ),
    () => {
      const { stub, warn } = buildStub({
        sourceInfo: {
          sourceType: 'data-product',
          groupId: 'com.company.demo',
          dataProduct: 'demo::MyProduct',
        },
        getExecutionContextInfo: () => ({
          class: 'demo::Person',
          mapping: 'demo::PersonMapping',
          runtime: 'demo::PersonRuntime',
        }),
      });
      const result = QueryBuilderState.prototype.safeGetTelemetryContext.call(
        stub as never,
      );
      expect(result).toEqual({
        sourceType: 'data-product',
        groupId: 'com.company.demo',
        dataProduct: 'demo::MyProduct',
        state: {
          class: 'demo::Person',
          mapping: 'demo::PersonMapping',
          runtime: 'demo::PersonRuntime',
        },
      });
      expect(warn).not.toHaveBeenCalled();
    },
  );

  test(
    unitTest(
      'safeGetTelemetryContext still reports source info when no execution context has resolved',
    ),
    () => {
      // the regression this shape exists to prevent: a half-configured builder
      // must not drop the entry point along with the unresolved context
      const { stub, warn } = buildStub({
        sourceInfo: { sourceType: 'data-product' },
        getExecutionContextInfo: () => undefined,
      });
      const result = QueryBuilderState.prototype.safeGetTelemetryContext.call(
        stub as never,
      );
      expect(result).toEqual({ sourceType: 'data-product' });
      expect(warn).not.toHaveBeenCalled();
    },
  );

  test(
    unitTest(
      'safeGetTelemetryContext returns {} and logs a warning when the execution context builder throws',
    ),
    () => {
      const { stub, warn } = buildStub({
        sourceInfo: { sourceType: 'data-product' },
        getExecutionContextInfo: () => {
          throw new Error('boom');
        },
      });
      const result = QueryBuilderState.prototype.safeGetTelemetryContext.call(
        stub as never,
      );
      expect(result).toEqual({});
      expect(warn).toHaveBeenCalledTimes(1);
    },
  );

  test(
    unitTest('logOpened emits the surface alongside the shared envelope'),
    () => {
      const logEvent = jest.fn();
      // prototype-backed so `logOpened` can reach `safeGetTelemetryContext`
      const stub = Object.assign(
        Object.create(QueryBuilderState.prototype) as object,
        {
          applicationStore: {
            telemetryService: { logEvent },
            logService: { warn: jest.fn() },
          },
          sourceInfo: { sourceType: 'data-space', dataSpace: 'demo::MyDS' },
          getExecutionContextInfo: () => ({ class: 'demo::Person' }),
        },
      );
      QueryBuilderState.prototype.logOpened.call(
        stub as never,
        QUERY_BUILDER_OPENED_FROM.QUERY_SAVED,
        { restoredFromRecent: false },
      );
      expect(logEvent).toHaveBeenCalledTimes(1);
      expect(logEvent.mock.calls[0]?.[0]).toBe(QUERY_BUILDER_EVENT.OPENED);
      expect(logEvent.mock.calls[0]?.[1]).toEqual({
        openedFrom: 'query.saved',
        sourceType: 'data-space',
        dataSpace: 'demo::MyDS',
        state: { class: 'demo::Person' },
        restoredFromRecent: false,
      });
    },
  );

  test(
    unitTest('logOpened still reports when no execution context has resolved'),
    () => {
      const logEvent = jest.fn();
      const stub = Object.assign(
        Object.create(QueryBuilderState.prototype) as object,
        {
          applicationStore: {
            telemetryService: { logEvent },
            logService: { warn: jest.fn() },
          },
          sourceInfo: { sourceType: 'data-space' },
          getExecutionContextInfo: () => undefined,
        },
      );
      QueryBuilderState.prototype.logOpened.call(
        stub as never,
        QUERY_BUILDER_OPENED_FROM.QUERY_CREATOR,
      );
      expect(logEvent.mock.calls[0]?.[1]).toEqual({
        openedFrom: 'query.creator',
        sourceType: 'data-space',
      });
    },
  );

  test(
    unitTest(
      'getExecutionContextInfo flags an inline runtime instead of dropping it silently',
    ),
    () => {
      // an engineered/inline runtime has no element path, so `runtime` is
      // absent — but the query must not look like "no runtime selected"
      const stub = {
        sourceClass: { path: 'demo::Person' },
        executionContextState: {
          mapping: { path: 'demo::PersonMapping' },
          runtimeValue: { notARuntimePointer: true },
        },
      };
      const result = QueryBuilderState.prototype.getExecutionContextInfo.call(
        stub as never,
      );
      expect(result).toEqual({
        class: 'demo::Person',
        mapping: 'demo::PersonMapping',
        isInlineRuntime: true,
      });
    },
  );

  test(
    unitTest(
      'getExecutionContextInfo returns undefined only when nothing has resolved',
    ),
    () => {
      const stub = {
        sourceClass: undefined,
        executionContextState: { mapping: undefined, runtimeValue: undefined },
      };
      expect(
        QueryBuilderState.prototype.getExecutionContextInfo.call(stub as never),
      ).toBeUndefined();
    },
  );

  test(
    unitTest(
      'safeGetExtraTelemetryMetadata returns {} and logs a warning when the provider throws',
    ),
    () => {
      const { stub, warn } = buildStub({
        getExtraTelemetryMetadata: () => {
          throw new Error('boom');
        },
      });
      const result =
        QueryBuilderState.prototype.safeGetExtraTelemetryMetadata.call(
          stub as never,
        );
      expect(result).toEqual({});
      expect(warn).toHaveBeenCalledTimes(1);
    },
  );

  test(
    unitTest(
      'safeGetExtraTelemetryMetadata forwards the provider result when it succeeds',
    ),
    () => {
      const { stub, warn } = buildStub({
        getExtraTelemetryMetadata: () => ({ agentChat: { traceId: 'abc' } }),
      });
      const result =
        QueryBuilderState.prototype.safeGetExtraTelemetryMetadata.call(
          stub as never,
        );
      expect(result).toEqual({ agentChat: { traceId: 'abc' } });
      expect(warn).not.toHaveBeenCalled();
    },
  );
});
