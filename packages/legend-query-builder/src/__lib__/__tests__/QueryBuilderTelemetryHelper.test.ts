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
          errorName: 'Error',
          agentChat: { traceId: 'trace-fail' },
        });
        expect(calls[0]?.event).toBe(QUERY_BUILDER_EVENT.RUN_QUERY__FAILURE);
        expect(calls[0]?.data).toEqual({
          errorMessage: 'boom',
          errorName: 'Error',
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
          errorName: 'Error',
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

    test(
      unitTest(
        'logEvent_QueryRunSucceeded forwards queryInfo shape and executionDurationMs',
      ),
      () => {
        const { service, calls } = buildTelemetryStub();
        QueryBuilderTelemetryHelper.logEvent_QueryRunSucceeded(service, {
          dependenciesCount: 0,
          timings: {},
          queryInfo: {
            fetchStructureType: 'TABULAR_DATA_STRUCTURE',
            parameterCount: 2,
            constantCount: 0,
            hasFilter: true,
            filterNodeCount: 3,
            watermarkEnabled: false,
            milestoningKind: 'none',
            projectionColumnCount: 4,
            windowColumnCount: 0,
            aggregationColumnCount: 1,
            postFilterNodeCount: 0,
            hasLimit: true,
            hasDistinct: false,
            sortColumnCount: 1,
            hasSlice: false,
          },
          executionDurationMs: 1234,
        } as never);
        const payload = calls[0]?.data as {
          queryInfo?: { fetchStructureType?: string };
          executionDurationMs?: number;
        };
        expect(payload.queryInfo?.fetchStructureType).toBe(
          'TABULAR_DATA_STRUCTURE',
        );
        expect(payload.executionDurationMs).toBe(1234);
      },
    );

    test(
      unitTest(
        'logEvent_ExecutionContextChanged emits CHANGE with the full telemetry envelope',
      ),
      () => {
        const { service, calls } = buildTelemetryStub();
        QueryBuilderTelemetryHelper.logEvent_ExecutionContextChanged(service, {
          // sourceInfo — what the builder was opened with — spread flat
          sourceType: 'data-product',
          groupId: 'com.company.demo',
          artifactId: 'demo-model',
          versionId: '1.4.0',
          dataProduct: 'demo::MyProduct',
          // the execution context it resolved to, nested
          state: {
            class: 'demo::Person',
            mapping: 'demo::PersonMapping',
            runtime: 'demo::PersonRuntime',
          },
          change: { subtype: 'mapping' },
        });
        expect(calls[0]?.event).toBe(
          QUERY_BUILDER_EVENT.EXECUTION_CONTEXT__CHANGE,
        );
        expect(calls[0]?.data).toEqual({
          sourceType: 'data-product',
          groupId: 'com.company.demo',
          artifactId: 'demo-model',
          versionId: '1.4.0',
          dataProduct: 'demo::MyProduct',
          state: {
            class: 'demo::Person',
            mapping: 'demo::PersonMapping',
            runtime: 'demo::PersonRuntime',
          },
          change: { subtype: 'mapping' },
        });
      },
    );

    test(
      unitTest(
        'logEvent_ExecutionContextChanged keeps source info when the execution context has not resolved',
      ),
      () => {
        const { service, calls } = buildTelemetryStub();
        // a class picked before a mapping: `state` is absent, but the entry
        // point the builder was opened with must still be reported
        QueryBuilderTelemetryHelper.logEvent_ExecutionContextChanged(service, {
          sourceType: 'data-product',
          dataProduct: 'demo::MyProduct',
          change: { subtype: 'class' },
        });
        expect(calls[0]?.data).toEqual({
          sourceType: 'data-product',
          dataProduct: 'demo::MyProduct',
          change: { subtype: 'class' },
        });
      },
    );

    test(
      unitTest(
        'logEvent_ProjectionChanged nests its own sourceType under change, distinct from the entry point sourceType',
      ),
      () => {
        const { service, calls } = buildTelemetryStub();
        QueryBuilderTelemetryHelper.logEvent_ProjectionChanged(service, {
          sourceType: 'data-product',
          change: {
            action: 'add',
            sourceType: 'explorer-property',
            columnCount: 3,
          },
        });
        expect(calls[0]?.event).toBe(QUERY_BUILDER_EVENT.PROJECTION__CHANGE);
        expect(calls[0]?.data).toEqual({
          sourceType: 'data-product',
          change: {
            action: 'add',
            sourceType: 'explorer-property',
            columnCount: 3,
          },
        });
      },
    );

    test(
      unitTest(
        'logEvent_ResultModifierChanged emits CHANGE with limit/distinct/sort/slice flags',
      ),
      () => {
        const { service, calls } = buildTelemetryStub();
        QueryBuilderTelemetryHelper.logEvent_ResultModifierChanged(service, {
          change: {
            limitSet: true,
            distinctOn: false,
            sortColumnCount: 2,
            sliceSet: false,
          },
        });
        expect(calls[0]?.event).toBe(
          QUERY_BUILDER_EVENT.RESULT_MODIFIER__CHANGE,
        );
        expect(calls[0]?.data).toEqual({
          change: {
            limitSet: true,
            distinctOn: false,
            sortColumnCount: 2,
            sliceSet: false,
          },
        });
      },
    );

    test(
      unitTest(
        'logEvent_AggregationChanged emits CHANGE with action and operator name',
      ),
      () => {
        const { service, calls } = buildTelemetryStub();
        QueryBuilderTelemetryHelper.logEvent_AggregationChanged(service, {
          change: { action: 'operator-change', operatorName: 'sum' },
        });
        expect(calls[0]?.event).toBe(QUERY_BUILDER_EVENT.AGGREGATION__CHANGE);
        expect(calls[0]?.data).toEqual({
          change: { action: 'operator-change', operatorName: 'sum' },
        });
      },
    );

    test(
      unitTest(
        'logEvent_WindowChanged emits CHANGE with action and column count',
      ),
      () => {
        const { service, calls } = buildTelemetryStub();
        QueryBuilderTelemetryHelper.logEvent_WindowChanged(service, {
          change: { action: 'add', columnCount: 1 },
        });
        expect(calls[0]?.event).toBe(QUERY_BUILDER_EVENT.WINDOW__CHANGE);
        expect(calls[0]?.data).toEqual({
          change: { action: 'add', columnCount: 1 },
        });
      },
    );

    test(
      unitTest(
        'logEvent_ParameterChanged emits CHANGE with action and parameter count',
      ),
      () => {
        const { service, calls } = buildTelemetryStub();
        QueryBuilderTelemetryHelper.logEvent_ParameterChanged(service, {
          change: { action: 'remove', parameterCount: 2 },
        });
        expect(calls[0]?.event).toBe(QUERY_BUILDER_EVENT.PARAMETER__CHANGE);
        expect(calls[0]?.data).toEqual({
          change: { action: 'remove', parameterCount: 2 },
        });
      },
    );

    test(
      unitTest(
        'logEvent_ConstantChanged emits CHANGE with action and constant count',
      ),
      () => {
        const { service, calls } = buildTelemetryStub();
        QueryBuilderTelemetryHelper.logEvent_ConstantChanged(service, {
          change: { action: 'edit', constantCount: 4 },
        });
        expect(calls[0]?.event).toBe(QUERY_BUILDER_EVENT.CONSTANT__CHANGE);
        expect(calls[0]?.data).toEqual({
          change: { action: 'edit', constantCount: 4 },
        });
      },
    );

    test(
      unitTest('logEvent_WatermarkChanged emits CHANGE with enabled flag'),
      () => {
        const { service, calls } = buildTelemetryStub();
        QueryBuilderTelemetryHelper.logEvent_WatermarkChanged(service, {
          change: { enabled: true },
        });
        expect(calls[0]?.event).toBe(QUERY_BUILDER_EVENT.WATERMARK__CHANGE);
        expect(calls[0]?.data).toEqual({ change: { enabled: true } });
      },
    );

    test(
      unitTest('logEvent_MilestoningChanged emits CHANGE with subtype'),
      () => {
        const { service, calls } = buildTelemetryStub();
        QueryBuilderTelemetryHelper.logEvent_MilestoningChanged(service, {
          change: { subtype: 'business-date' },
        });
        expect(calls[0]?.event).toBe(QUERY_BUILDER_EVENT.MILESTONING__CHANGE);
        expect(calls[0]?.data).toEqual({
          change: { subtype: 'business-date' },
        });
      },
    );

    test(
      unitTest(
        'logEvent_GraphFetchChanged emits CHANGE with action, node count, and optional serialization type',
      ),
      () => {
        const { service, calls } = buildTelemetryStub();
        QueryBuilderTelemetryHelper.logEvent_GraphFetchChanged(service, {
          change: {
            action: 'serialization-change',
            nodeCount: 4,
            serializationType: 'EXTERNAL_FORMAT',
          },
        });
        expect(calls[0]?.event).toBe(QUERY_BUILDER_EVENT.GRAPH_FETCH__CHANGE);
        expect(calls[0]?.data).toEqual({
          change: {
            action: 'serialization-change',
            nodeCount: 4,
            serializationType: 'EXTERNAL_FORMAT',
          },
        });
      },
    );

    test(
      unitTest(
        'logEvent_FilterChanged emits CHANGE with action and optional group operation',
      ),
      () => {
        const { service, calls } = buildTelemetryStub();
        QueryBuilderTelemetryHelper.logEvent_FilterChanged(service, {
          change: { action: 'group-operation-change', groupOperation: 'or' },
        });
        expect(calls[0]?.event).toBe(QUERY_BUILDER_EVENT.FILTER__CHANGE);
        expect(calls[0]?.data).toEqual({
          change: { action: 'group-operation-change', groupOperation: 'or' },
        });
      },
    );

    test(
      unitTest('logEvent_PostFilterChanged emits CHANGE with action'),
      () => {
        const { service, calls } = buildTelemetryStub();
        QueryBuilderTelemetryHelper.logEvent_PostFilterChanged(service, {
          change: { action: 'remove' },
        });
        expect(calls[0]?.event).toBe(QUERY_BUILDER_EVENT.POST_FILTER__CHANGE);
        expect(calls[0]?.data).toEqual({ change: { action: 'remove' } });
      },
    );

    test(
      unitTest(
        'logEvent_QueryRunFailed forwards error metadata, traceId, and duration',
      ),
      () => {
        const { service, calls } = buildTelemetryStub();
        QueryBuilderTelemetryHelper.logEvent_QueryRunFailed(service, {
          errorMessage: 'network down',
          errorName: 'NetworkClientError',
          httpStatus: 503,
          executionTraceId: 'trace-fail',
          executionDurationMs: 42,
        });
        expect(calls[0]?.event).toBe(QUERY_BUILDER_EVENT.RUN_QUERY__FAILURE);
        expect(calls[0]?.data).toEqual({
          errorMessage: 'network down',
          errorName: 'NetworkClientError',
          httpStatus: 503,
          executionTraceId: 'trace-fail',
          executionDurationMs: 42,
        });
      },
    );

    test(
      unitTest(
        'logEvent_ExportQueryDataFailed emits FAILURE with error metadata',
      ),
      () => {
        const { service, calls } = buildTelemetryStub();
        QueryBuilderTelemetryHelper.logEvent_ExportQueryDataFailed(service, {
          errorMessage: 'export blew up',
          errorName: 'Error',
        });
        expect(calls[0]?.event).toBe(
          QUERY_BUILDER_EVENT.EXPORT_QUERY_DATA__FAILURE,
        );
        expect(calls[0]?.data).toEqual({
          errorMessage: 'export blew up',
          errorName: 'Error',
        });
      },
    );

    test(
      unitTest(
        'logEvent_ExecutionPlanGenerationFailed emits FAILURE with error metadata',
      ),
      () => {
        const { service, calls } = buildTelemetryStub();
        QueryBuilderTelemetryHelper.logEvent_ExecutionPlanGenerationFailed(
          service,
          {
            errorMessage: 'plan blew up',
            errorName: 'NetworkClientError',
            httpStatus: 500,
          },
        );
        expect(calls[0]?.event).toBe(
          QUERY_BUILDER_EVENT.GENERATE_EXECUTION_PLAN__FAILURE,
        );
        expect(calls[0]?.data).toEqual({
          errorMessage: 'plan blew up',
          errorName: 'NetworkClientError',
          httpStatus: 500,
        });
      },
    );

    test(
      unitTest(
        'logEvent_ExecutionPlanDebugFailed emits FAILURE with error metadata',
      ),
      () => {
        const { service, calls } = buildTelemetryStub();
        QueryBuilderTelemetryHelper.logEvent_ExecutionPlanDebugFailed(service, {
          errorMessage: 'debug blew up',
          errorName: 'Error',
        });
        expect(calls[0]?.event).toBe(
          QUERY_BUILDER_EVENT.DEBUG_EXECUTION_PLAN__FAILURE,
        );
        expect(calls[0]?.data).toEqual({
          errorMessage: 'debug blew up',
          errorName: 'Error',
        });
      },
    );
  },
);
