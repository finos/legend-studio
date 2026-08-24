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
import type { TelemetryService } from '@finos/legend-application';
import { QueryBuilderTelemetryHelper } from '../QueryBuilderTelemetryHelper.js';
import { QUERY_BUILDER_EVENT } from '../QueryBuilderEvent.js';

type LoggedCall = { event: string; data: unknown };

const buildTelemetryStub = (): {
  service: TelemetryService;
  calls: LoggedCall[];
} => {
  const calls: LoggedCall[] = [];
  const service = {
    logEvent: jest.fn((event: string, data: unknown) => {
      calls.push({ event, data });
    }),
  } as unknown as TelemetryService;
  return { service, calls };
};

describe(
  unitTest('QueryBuilderTelemetryHelper - extra telemetry metadata'),
  () => {
    test(
      unitTest(
        'logEvent_QueryRunLaunched emits an empty payload when no extras are supplied',
      ),
      () => {
        const { service, calls } = buildTelemetryStub();
        QueryBuilderTelemetryHelper.logEvent_QueryRunLaunched(service);
        expect(calls).toHaveLength(1);
        expect(calls[0]?.event).toBe(QUERY_BUILDER_EVENT.RUN_QUERY__LAUNCH);
        expect(calls[0]?.data).toEqual({});
      },
    );

    test(
      unitTest(
        'logEvent_QueryRunLaunched forwards arbitrary extras metadata when supplied',
      ),
      () => {
        const { service, calls } = buildTelemetryStub();
        QueryBuilderTelemetryHelper.logEvent_QueryRunLaunched(service, {
          agentChat: { traceId: 'trace-launch' },
        });
        expect(calls[0]?.data).toEqual({
          agentChat: { traceId: 'trace-launch' },
        });
      },
    );

    test(
      unitTest(
        'logEvent_QueryRunFailed emits FAILURE with the errorMessage and arbitrary extras',
      ),
      () => {
        const { service, calls } = buildTelemetryStub();
        QueryBuilderTelemetryHelper.logEvent_QueryRunFailed(service, {
          errorMessage: 'boom',
          agentChat: { traceId: 'trace-fail' },
        });
        expect(calls[0]?.event).toBe(QUERY_BUILDER_EVENT.RUN_QUERY__FAILURE);
        expect(calls[0]?.data).toEqual({
          errorMessage: 'boom',
          agentChat: { traceId: 'trace-fail' },
        });
      },
    );

    test(
      unitTest(
        'logEvent_QueryRunFailed emits FAILURE with only the errorMessage when no extras are supplied',
      ),
      () => {
        const { service, calls } = buildTelemetryStub();
        QueryBuilderTelemetryHelper.logEvent_QueryRunFailed(service, {
          errorMessage: 'boom',
        });
        const payload = calls[0]?.data as Record<string, unknown>;
        expect(payload.errorMessage).toBe('boom');
        expect(payload.agentChat).toBeUndefined();
      },
    );

    test(
      unitTest(
        'logEvent_QueryRunCancelled emits CANCELLED with the extras when supplied',
      ),
      () => {
        const { service, calls } = buildTelemetryStub();
        QueryBuilderTelemetryHelper.logEvent_QueryRunCancelled(service, {
          agentChat: { traceId: 'trace-cancel' },
        });
        expect(calls[0]?.event).toBe(QUERY_BUILDER_EVENT.RUN_QUERY__CANCELLED);
        expect(calls[0]?.data).toEqual({
          agentChat: { traceId: 'trace-cancel' },
        });
      },
    );

    test(
      unitTest('logEvent_QueryRunCancelled emits an empty payload otherwise'),
      () => {
        const { service, calls } = buildTelemetryStub();
        QueryBuilderTelemetryHelper.logEvent_QueryRunCancelled(service);
        expect(calls[0]?.event).toBe(QUERY_BUILDER_EVENT.RUN_QUERY__CANCELLED);
        expect(calls[0]?.data).toEqual({});
      },
    );

    test(
      unitTest(
        'logEvent_QueryRunSucceeded forwards arbitrary extras inside the execution report',
      ),
      () => {
        const { service, calls } = buildTelemetryStub();
        // QueryExecution_TelemetryData is intersected with GraphManagerOperationReport
        // + dependenciesCount + Record<string, unknown>, but the helper is a
        // pure passthrough, so we only need to assert the payload is
        // forwarded unchanged.
        QueryBuilderTelemetryHelper.logEvent_QueryRunSucceeded(service, {
          dependenciesCount: 0,
          timings: {},
          agentChat: { traceId: 'trace-success' },
        } as never);
        expect(calls[0]?.event).toBe(QUERY_BUILDER_EVENT.RUN_QUERY__SUCCESS);
        expect(
          (calls[0]?.data as { agentChat?: { traceId: string } }).agentChat,
        ).toEqual({ traceId: 'trace-success' });
      },
    );
  },
);
