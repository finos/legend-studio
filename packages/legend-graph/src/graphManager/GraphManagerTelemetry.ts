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

import type { TelemetryService } from '@finos/legend-shared';
import type { GraphManagerOperationReport } from './GraphManagerMetrics.js';
import { GRAPH_MANAGER_EVENT } from './GraphManagerEvent.js';

type GraphInitialized_TelemetryData = {
  timings: Record<string, number>;
  dependencies: GraphManagerOperationReport;
  dependenciesCount: number;
  graph: GraphManagerOperationReport;
  generations?: GraphManagerOperationReport;
  generationCount?: number;
};

export class GraphManagerTelemetry {
  static logEvent_GraphInitialized(
    telemetryService: TelemetryService,
    data: GraphInitialized_TelemetryData,
  ): void {
    telemetryService.logEvent(GRAPH_MANAGER_EVENT.GRAPH_INITIALIZED, data);
  }
}
