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
import {
  type InitializeQueryCreator_TelemetryData,
  type InitializeQueryCreatorFailure_TelemetryData,
  LegendQueryTelemetryHelper,
} from '../LegendQueryTelemetryHelper.js';
import { LegendQuerySourceType } from '../LegendQuerySourceInfo.js';
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

describe(unitTest('LegendQueryTelemetryHelper - query creator'), () => {
  test(
    unitTest(
      'logEvent_InitializeQueryCreatorSucceeded forwards source, restoredFromRecent and timings',
    ),
    () => {
      const { service, calls } = buildTelemetryStub();
      const data: InitializeQueryCreator_TelemetryData = {
        source: {
          sourceType: LegendQuerySourceType.INGEST,
          groupId: 'org.example',
          artifactId: 'sample-artifact',
          versionId: '1.0.0',
          ingestDefinitionPath: 'ingest::MyIngest',
          dataSet: 'TRADES',
        },
        restoredFromRecent: false,
        timings: { total: 1190 },
      };
      LegendQueryTelemetryHelper.logEvent_InitializeQueryCreatorSucceeded(
        service,
        data,
      );
      expect(calls).toHaveLength(1);
      expect(calls[0]?.event).toBe(
        LEGEND_QUERY_APP_EVENT.INITIALIZE_QUERY_CREATOR__SUCCESS,
      );
      expect(calls[0]?.data).toEqual(data);
    },
  );

  test(
    unitTest(
      'logEvent_InitializeQueryCreatorFailed forwards the source and the error',
    ),
    () => {
      const { service, calls } = buildTelemetryStub();
      const data: InitializeQueryCreatorFailure_TelemetryData = {
        source: {
          sourceType: LegendQuerySourceType.DATA_SPACE_TEMPLATE,
          groupId: 'org.example',
          artifactId: 'sample-artifact',
          versionId: '1.0.0',
          dataSpace: 'model::MyDataSpace',
          templateQueryId: 'missing-template',
        },
        restoredFromRecent: false,
        errorMessage: `Can't find template query with id 'missing-template'`,
        errorName: 'Illegal State Error',
        timings: { total: 640 },
      };
      LegendQueryTelemetryHelper.logEvent_InitializeQueryCreatorFailed(
        service,
        data,
      );
      expect(calls).toHaveLength(1);
      expect(calls[0]?.event).toBe(
        LEGEND_QUERY_APP_EVENT.INITIALIZE_QUERY_CREATOR__FAILURE,
      );
      expect(calls[0]?.data).toEqual(data);
    },
  );
});
