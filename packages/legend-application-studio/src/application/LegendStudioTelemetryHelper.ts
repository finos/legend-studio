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
import { LEGEND_STUDIO_APP_EVENT } from './LegendStudioEvent.js';

type Compilation_TelemetryData = GraphManagerOperationReport & {
  dependenciesCount: number;
};

type TestDataGeneration_TelemetryData = GraphManagerOperationReport & {
  dependenciesCount: number;
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
}
