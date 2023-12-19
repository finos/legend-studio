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

import {
  GRAPH_MANAGER_EVENT,
  type GraphInitializationReport,
  type GraphManagerOperationReport,
} from '@finos/legend-graph';
import type { TelemetryService } from '@finos/legend-application';
import { LEGEND_STUDIO_APP_EVENT } from './LegendStudioEvent.js';

type Compilation_TelemetryData = GraphManagerOperationReport & {
  dependenciesCount: number;
};

type TestDataGeneration_TelemetryData = GraphManagerOperationReport & {
  dependenciesCount: number;
};

export type ShowcaseMetadata_TelemetryData = {
  showcasesTotalCount: number;
  showcasesDevelopmentCount: number;
};

export type ShowcaseProject_TelemetryData = {
  showcasePath: string;
};

export class LegendStudioTelemetryHelper {
  static logEvent_GraphCompilationLaunched(service: TelemetryService): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.COMPILE_GRAPH__LAUNCH, {});
  }

  static logEvent_TextCompilationLaunched(service: TelemetryService): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.COMPILE_TEXT__LAUNCH, {});
  }

  static logEvent_TestDataGenerationLaunched(service: TelemetryService): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.TEST_DATA_GENERATION__LAUNCH, {});
  }

  static logEvent_GraphCompilationSucceeded(
    service: TelemetryService,
    data: Compilation_TelemetryData,
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.FORM_MODE_COMPILATION__SUCCESS,
      data,
    );
  }

  static logEvent_TextCompilationSucceeded(
    service: TelemetryService,
    data: Compilation_TelemetryData,
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.TEXT_MODE_COMPILATION__SUCCESS,
      data,
    );
  }

  static logEvent_TestDataGenerationSucceeded(
    service: TelemetryService,
    data: TestDataGeneration_TelemetryData,
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.TEST_DATA_GENERATION__SUCCESS,
      data,
    );
  }

  static logEvent_GraphInitializationSucceeded(
    service: TelemetryService,
    data: GraphInitializationReport,
  ): void {
    service.logEvent(GRAPH_MANAGER_EVENT.INITIALIZE_GRAPH__SUCCESS, data);
  }

  // showcase manager
  static logEvent_ShowcaseManagerLaunch(
    service: TelemetryService,
    data: ShowcaseMetadata_TelemetryData,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.SHOWCASE_MANAGER_LAUNCH, data);
  }
  static logEvent_ShowcaseManagerShowcaseProjectLaunch(
    service: TelemetryService,
    data: ShowcaseProject_TelemetryData,
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.SHOWCASE_MANAGER_SHOWCASE_PROJECT_LAUNCH,
      data,
    );
  }
  static logEvent_ShowcaseViewerLaunch(
    service: TelemetryService,
    data: ShowcaseProject_TelemetryData,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.SHOWCASE_VIEWER_LAUNCH, data);
  }
}
