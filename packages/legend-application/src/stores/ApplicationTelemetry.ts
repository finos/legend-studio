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
import { APPLICATION_EVENT } from './ApplicationEvent.js';

type ApplicationLoaded_TelemetryData = {
  application: {
    name: string;
    version: string;
    env: string;
  };
  browser: {
    userAgent: string;
  };
  screen: {
    height: number;
    width: number;
  };
};

type ApplicationContextAccessed_TelemetryData = {
  key: string;
};

type VirtualAssistantDocumentationEntryAccessed_TelemetryData = {
  key: string;
};

export class ApplicationTelemetry {
  static logEvent_ApplicationInitialized(
    telemetryService: TelemetryService,
    data: ApplicationLoaded_TelemetryData,
  ): void {
    telemetryService.logEvent(APPLICATION_EVENT.APPLICATION_LOADED, data);
  }

  static logEvent_ApplicationContextAccessed(
    telemetryService: TelemetryService,
    data: ApplicationContextAccessed_TelemetryData,
  ): void {
    telemetryService.logEvent(
      APPLICATION_EVENT.APPLICATION_CONTEXT_ACCESSED,
      data,
    );
  }

  static logEvent_VirtualAssistantDocumentationEntryAccessed(
    telemetryService: TelemetryService,
    data: VirtualAssistantDocumentationEntryAccessed_TelemetryData,
  ): void {
    telemetryService.logEvent(
      APPLICATION_EVENT.VIRTUAL_ASSISTANT_DOCUMENTATION_ENTRY_ACCESSED,
      data,
    );
  }
}
