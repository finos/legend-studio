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

import type { TelemetryService } from '@finos/legend-application';
import { LEGEND_QUERY_APP_EVENT } from './LegendQueryEvent.js';
import {
  GRAPH_MANAGER_EVENT,
  type GraphInitializationReport,
} from '@finos/legend-graph';

type Query_TelemetryData = {
  query: {
    name: string;
    id: string;
    versionId: string;
    groupId: string;
    artifactId: string;
  };
};

export class LegendQueryTelemetryHelper {
  static logEvent_ViewQuerySucceeded(
    service: TelemetryService,
    data: Query_TelemetryData,
  ): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.VIEW_QUERY__SUCCESS, data);
  }

  static logEvent_CreateQuerySucceeded(
    service: TelemetryService,
    data: Query_TelemetryData,
  ): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.CREATE_QUERY__SUCCESS, data);
  }

  static logEvent_UpdateQuerySucceeded(
    service: TelemetryService,
    data: Query_TelemetryData,
  ): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.UPDATE_QUERY__SUCCESS, data);
  }

  static logEvent_QueryViewProjectLaunched(service: TelemetryService): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.VIEW_PROJECT__LAUNCH, {});
  }

  static logEvent_QueryViewSdlcProjectLaunched(
    service: TelemetryService,
  ): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.VIEW_SDLC_PROJECT__LAUNCH, {});
  }

  static logEvent_GraphInitializationSucceeded(
    service: TelemetryService,
    data: GraphInitializationReport,
  ): void {
    service.logEvent(GRAPH_MANAGER_EVENT.INITIALIZE_GRAPH__SUCCESS, data);
  }

  static logEvent_RenameQuerySucceeded(
    service: TelemetryService,
    data: Query_TelemetryData,
  ): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.RENAME_QUERY__SUCCESS, data);
  }
}
