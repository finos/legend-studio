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
import {
  QUERY_BUILDER_EVENT,
  QUERY_BUILDER_FILTER_EVENT,
  QUERY_BUILDER_POST_FILTER_EVENT,
} from './QueryBuilderEvent.js';

type QueryExecution_TelemetryData = GraphManagerOperationReport & {
  dependenciesCount: number;
};
type QueryMappingModelCoverageAnalysis_TelemetryData =
  GraphManagerOperationReport & {
    dependenciesCount: number;
  };

export class QueryBuilderTelemetryHelper {
  static logEvent_QueryRunLaunched(service: TelemetryService): void {
    service.logEvent(QUERY_BUILDER_EVENT.RUN_QUERY__LAUNCH, {});
  }

  static logEvent_ExecutionPlanGenerationLaunched(
    service: TelemetryService,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.GENERATE_EXECUTION_PLAN__LAUNCH, {});
  }

  static logEvent_ExecutionPlanDebugLaunched(service: TelemetryService): void {
    service.logEvent(QUERY_BUILDER_EVENT.DEBUG_EXECUTION_PLAN__LAUNCH, {});
  }

  static logEvent_QueryRunSucceeded(
    service: TelemetryService,
    data: QueryExecution_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.RUN_QUERY__SUCCESS, data);
  }

  static logEvent_ExecutionPlanGenerationSucceeded(
    service: TelemetryService,
    data: QueryExecution_TelemetryData,
  ): void {
    service.logEvent(
      QUERY_BUILDER_EVENT.GENERATE_EXECUTION_PLAN__SUCCESS,
      data,
    );
  }

  static logEvent_ExecutionPlanDebugSucceeded(
    service: TelemetryService,
    data: QueryExecution_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.DEBUG_EXECUTION_PLAN__SUCCESS, data);
  }

  static logEvent_FilterCreateConditionLaunched(
    service: TelemetryService,
  ): void {
    service.logEvent(
      QUERY_BUILDER_FILTER_EVENT.FILTER__CREATE__CONDITION__LAUNCH,
      {},
    );
  }

  static logEvent_FilterCleanupTreeLaunched(service: TelemetryService): void {
    service.logEvent(
      QUERY_BUILDER_FILTER_EVENT.FILTER__CLEANUP__TREE__LAUNCH,
      {},
    );
  }

  static logEvent_FilterCollapseTreeLaunched(service: TelemetryService): void {
    service.logEvent(
      QUERY_BUILDER_FILTER_EVENT.FILTER__COLLAPSE__TREE__LAUNCH,
      {},
    );
  }

  static logEvent_FilterCreateGroupFromConditionLaunched(
    service: TelemetryService,
  ): void {
    service.logEvent(
      QUERY_BUILDER_FILTER_EVENT.FILTER__CREATE__GROUP__FROM__CONDITION__LAUNCH,
      {},
    );
  }

  static logEvent_FilterCreateLogicalGroupLaunched(
    service: TelemetryService,
  ): void {
    service.logEvent(
      QUERY_BUILDER_FILTER_EVENT.FILTER__CREATE__LOGICAL__GROUP__LAUNCH,
      {},
    );
  }

  static logEvent_FilterExpandTreeLaunched(service: TelemetryService): void {
    service.logEvent(
      QUERY_BUILDER_FILTER_EVENT.FILTER__EXPAND__TREE__LAUNCH,
      {},
    );
  }

  static logEvent_FilterSimplifyTreeLaunched(service: TelemetryService): void {
    service.logEvent(
      QUERY_BUILDER_FILTER_EVENT.FILTER__SIMPLIFY__TREE__LAUNCH,
      {},
    );
  }

  static logEvent_PostFilterCreateConditionLaunched(
    service: TelemetryService,
  ): void {
    service.logEvent(
      QUERY_BUILDER_POST_FILTER_EVENT.FILTER__CREATE__CONDITION__LAUNCH,
      {},
    );
  }

  static logEvent_PostFilterCleanupTreeLaunched(
    service: TelemetryService,
  ): void {
    service.logEvent(
      QUERY_BUILDER_POST_FILTER_EVENT.FILTER__CLEANUP__TREE__LAUNCH,
      {},
    );
  }

  static logEvent_PostFilterCollapseTreeLaunched(
    service: TelemetryService,
  ): void {
    service.logEvent(
      QUERY_BUILDER_POST_FILTER_EVENT.FILTER__COLLAPSE__TREE__LAUNCH,
      {},
    );
  }

  static logEvent_PostFilterCreateGroupFromConditionLaunched(
    service: TelemetryService,
  ): void {
    service.logEvent(
      QUERY_BUILDER_POST_FILTER_EVENT.FILTER__CREATE__GROUP__FROM__CONDITION__LAUNCH,
      {},
    );
  }

  static logEvent_PostFilterCreateLogicalGroupLaunched(
    service: TelemetryService,
  ): void {
    service.logEvent(
      QUERY_BUILDER_POST_FILTER_EVENT.FILTER__CREATE__LOGICAL__GROUP__LAUNCH,
      {},
    );
  }

  static logEvent_PostFilterExpandTreeLaunched(
    service: TelemetryService,
  ): void {
    service.logEvent(
      QUERY_BUILDER_POST_FILTER_EVENT.FILTER__EXPAND__TREE__LAUNCH,
      {},
    );
  }

  static logEvent_PostFilterSimplifyTreeLaunched(
    service: TelemetryService,
  ): void {
    service.logEvent(
      QUERY_BUILDER_POST_FILTER_EVENT.FILTER__SIMPLIFY__TREE__LAUNCH,
      {},
    );
  }

  static logEvent_QueryMappingModelCoverageAnalysisLaunched(
    service: TelemetryService,
  ): void {
    service.logEvent(
      QUERY_BUILDER_EVENT.MAPPING_MODEL_COVERAGE_ANALYSYS__LAUNCH,
      {},
    );
  }

  static logEvent_QueryMappingModelCoverageAnalysisSucceeded(
    service: TelemetryService,
    data: QueryMappingModelCoverageAnalysis_TelemetryData,
  ): void {
    service.logEvent(
      QUERY_BUILDER_EVENT.MAPPING_MODEL_COVERAGE_ANALYSYS__SUCCESS,
      data,
    );
  }
}
