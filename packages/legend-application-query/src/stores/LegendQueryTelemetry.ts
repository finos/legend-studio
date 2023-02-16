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
import { LEGEND_QUERY_APP_EVENT } from './LegendQueryAppEvent.js';

type Query_TelemetryData = {
  query: {
    name: string;
    id: string;
    versionId: string;
    groupId: string;
    artifactId: string;
  };
};

export class LegendQueryTelemetry {
  static logEvent_ViewQuery(
    telemetryService: TelemetryService,
    data: Query_TelemetryData,
  ): void {
    telemetryService.logEvent(LEGEND_QUERY_APP_EVENT.QUERY_VIEWED, data);
  }

  static logEvent_CreateQuery(
    telemetryService: TelemetryService,
    data: Query_TelemetryData,
  ): void {
    telemetryService.logEvent(LEGEND_QUERY_APP_EVENT.QUERY_CREATED, data);
  }

  static logEvent_UpdateQuery(
    telemetryService: TelemetryService,
    data: Query_TelemetryData,
  ): void {
    telemetryService.logEvent(LEGEND_QUERY_APP_EVENT.QUERY_UPDATED, data);
  }
}
