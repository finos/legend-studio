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
import { APPLICATION_EVENT } from './ApplicationEvent';

type ApplicationLoaded_TelemetryData = {
  browser: {
    userAgent: string;
  };
  screen: {
    height: number;
    width: number;
  };
};

export class ApplicationTelemetry {
  static logEvent_GraphInitialized(
    telemetryService: TelemetryService,
    data: ApplicationLoaded_TelemetryData,
  ): void {
    telemetryService.logEvent(APPLICATION_EVENT.APPLICATION_LOADED, data);
  }
}
