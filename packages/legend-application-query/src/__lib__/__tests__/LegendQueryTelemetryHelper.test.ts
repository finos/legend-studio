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
import { LegendQueryTelemetryHelper } from '../LegendQueryTelemetryHelper.js';
import { LEGEND_QUERY_APP_EVENT } from '../LegendQueryEvent.js';

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

const sampleQuery = {
  id: 'q-1',
  name: 'Sample',
  groupId: 'org.example',
  artifactId: 'sample-artifact',
  versionId: '1.0.0',
};

describe(
  unitTest('LegendQueryTelemetryHelper - extra telemetry metadata'),
  () => {
    test(
      unitTest(
        'logEvent_CreateQuerySucceeded forwards arbitrary extras when present',
      ),
      () => {
        const { service, calls } = buildTelemetryStub();
        LegendQueryTelemetryHelper.logEvent_CreateQuerySucceeded(service, {
          query: sampleQuery,
          agentChat: { traceId: 'trace-create' },
        });
        expect(calls[0]?.event).toBe(
          LEGEND_QUERY_APP_EVENT.CREATE_QUERY__SUCCESS,
        );
        expect(calls[0]?.data).toEqual({
          query: sampleQuery,
          agentChat: { traceId: 'trace-create' },
        });
      },
    );

    test(
      unitTest(
        'logEvent_CreateQuerySucceeded omits extras for non-plugin flows',
      ),
      () => {
        const { service, calls } = buildTelemetryStub();
        LegendQueryTelemetryHelper.logEvent_CreateQuerySucceeded(service, {
          query: sampleQuery,
        });
        const payload = calls[0]?.data as Record<string, unknown>;
        expect(payload).toEqual({ query: sampleQuery });
        expect(payload.agentChat).toBeUndefined();
      },
    );

    test(
      unitTest(
        'logEvent_UpdateQuerySucceeded forwards arbitrary extras when present',
      ),
      () => {
        const { service, calls } = buildTelemetryStub();
        LegendQueryTelemetryHelper.logEvent_UpdateQuerySucceeded(service, {
          query: sampleQuery,
          agentChat: { traceId: 'trace-update' },
        });
        expect(calls[0]?.event).toBe(
          LEGEND_QUERY_APP_EVENT.UPDATE_QUERY__SUCCESS,
        );
        expect(calls[0]?.data).toEqual({
          query: sampleQuery,
          agentChat: { traceId: 'trace-update' },
        });
      },
    );
  },
);
