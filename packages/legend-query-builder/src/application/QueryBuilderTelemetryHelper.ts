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

import type { GraphManagerOperationReport } from '@finos/legend-graph';
import type { TelemetryService } from '@finos/legend-application';
import { QUERY_BUILDER_EVENT } from './QueryBuilderEvent.js';

type QueryExecution_TelemetryData = GraphManagerOperationReport & {
  dependenciesCount: number;
};

export class QueryBuilderTelemetryHelper {
  static logEvent_QueryRunLaunched(telemetryService: TelemetryService): void {
    telemetryService.logEvent(QUERY_BUILDER_EVENT.RUN_QUERY__LAUNCH, {});
  }

  static logEvent_ExecutionPlanGenerationLaunched(
    telemetryService: TelemetryService,
  ): void {
    telemetryService.logEvent(
      QUERY_BUILDER_EVENT.GENERATE_EXECUTION_PLAN__LAUNCH,
      {},
    );
  }

  static logEvent_ExecutionPlanDebugLaunched(
    telemetryService: TelemetryService,
  ): void {
    telemetryService.logEvent(
      QUERY_BUILDER_EVENT.DEBUG_EXECUTION_PLAN__LAUNCH,
      {},
    );
  }

  static logEvent_QueryRunSucceeded(
    telemetryService: TelemetryService,
    data: QueryExecution_TelemetryData,
  ): void {
    telemetryService.logEvent(QUERY_BUILDER_EVENT.RUN_QUERY__SUCCESS, data);
  }

  static logEvent_ExecutionPlanGenerationSucceeded(
    telemetryService: TelemetryService,
    data: QueryExecution_TelemetryData,
  ): void {
    telemetryService.logEvent(
      QUERY_BUILDER_EVENT.GENERATE_EXECUTION_PLAN__SUCCESS,
      data,
    );
  }

  static logEvent_ExecutionPlanDebugSucceeded(
    telemetryService: TelemetryService,
    data: QueryExecution_TelemetryData,
  ): void {
    telemetryService.logEvent(
      QUERY_BUILDER_EVENT.DEBUG_EXECUTION_PLAN__SUCCESS,
      data,
    );
  }
}
