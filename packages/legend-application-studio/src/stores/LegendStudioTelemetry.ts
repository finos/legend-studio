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
import { LEGEND_STUDIO_APP_EVENT } from './LegendStudioAppEvent.js';

export class LegendStudioTelemetry {
  // static logEvent_compileInFormMode(telemetryService: TelemetryService): void {
  //   telemetryService.logEvent(
  //     LEGEND_STUDIO_APP_EVENT.FORM_MODE_COMPILATION,
  //     {},
  //   );
  // }

  // static logEvent_compileInTextMode(telemetryService: TelemetryService): void {
  //   telemetryService.logEvent(
  //     LEGEND_STUDIO_APP_EVENT.TEXT_MODE_COMPILATION,
  //     {},
  //   );
  // }

  static logEvent_GraphCompilationLaunched(
    telemetryService: TelemetryService,
  ): void {
    telemetryService.logEvent(
      LEGEND_STUDIO_APP_EVENT.COMPILE_GRAPH__LAUNCH,
      {},
    );
  }

  static logEvent_TextCompilationLaunched(
    telemetryService: TelemetryService,
  ): void {
    telemetryService.logEvent(LEGEND_STUDIO_APP_EVENT.COMPILE_TEXT__LAUNCH, {});
  }
}
