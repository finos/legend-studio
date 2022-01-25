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

const APPLICATION_LOADED = 'application_loaded';
type ApplicationLoaded_TelemetryData = {
  browser: {
    userAgent: string;
  };
  screen: {
    height: number;
    width: number;
  };
};

export class LegendStudioTelemetryService {
  private telemetryService!: TelemetryService;

  private constructor(telemetryService: TelemetryService) {
    this.telemetryService = telemetryService;
  }

  static create(
    telemetryService: TelemetryService,
  ): LegendStudioTelemetryService {
    return new LegendStudioTelemetryService(telemetryService);
  }

  logEvent_ApplicationLoaded(data: ApplicationLoaded_TelemetryData): void {
    this.telemetryService.logEvent(APPLICATION_LOADED, data);
  }
}
