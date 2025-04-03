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
  type GraphManagerOperationReport,
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

type QueryGraphInitialization_TelemetryData = Query_TelemetryData & {
  graph: GraphInitializationReport;
};

type ViewQuery_TelemetryData = Query_TelemetryData &
  GraphManagerOperationReport & {
    dependenciesCount: number;
  };

type IntializeQueryState_TelemetryData = Query_TelemetryData &
  GraphManagerOperationReport & {
    dependenciesCount: number;
  };

export class LegendQueryTelemetryHelper {
  static logEvent_ViewQuerySucceeded(
    service: TelemetryService,
    data: ViewQuery_TelemetryData,
  ): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.VIEW_QUERY__SUCCESS, data);
  }

  static logEvent_InitializeQueryStateSucceeded(
    service: TelemetryService,
    data: IntializeQueryState_TelemetryData,
  ): void {
    service.logEvent(
      LEGEND_QUERY_APP_EVENT.INITIALIZE_QUERY_STATE__SUCCESS,
      data,
    );
  }

  static logEvent_CreateQuerySucceeded(
    service: TelemetryService,
    data: Query_TelemetryData,
  ): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.CREATE_QUERY__SUCCESS, data);
  }

  static logEvent_HostedDataCubeLaunched(
    service: TelemetryService,
    data: Query_TelemetryData,
  ): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.HOSTED_DATA_CUBE__LAUNCH, data);
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
    data: QueryGraphInitialization_TelemetryData | GraphInitializationReport,
  ): void {
    service.logEvent(GRAPH_MANAGER_EVENT.INITIALIZE_GRAPH__SUCCESS, data);
  }

  static logEvent_RenameQuerySucceeded(
    service: TelemetryService,
    data: Query_TelemetryData,
  ): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.RENAME_QUERY__SUCCESS, data);
  }

  static logEvent_QueryChatOpened(service: TelemetryService): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.LEGENDAI_QUERY_CHAT__OPENED, {});
  }
}
