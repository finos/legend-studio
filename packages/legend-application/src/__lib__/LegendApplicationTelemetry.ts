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

import { APPLICATION_EVENT } from './LegendApplicationEvent.js';
import type { GenericLegendApplicationStore } from '../stores/ApplicationStore.js';
import type { TelemetryService } from '../stores/TelemetryService.js';

type ApplicationContextAccessed_TelemetryData = {
  key: string;
};

type VirtualAssistantDocumentationEntryAccessed_TelemetryData = {
  key: string;
  action: string;
};

export type VirtualAssistantSearchResultAccessed_TelemetryData = {
  key: string;
  searchText: string;
  action: string;
};

export type ExtensionPageAccessed_TelemetryData = {
  /** `ApplicationPageEntry.key` — stable identifier for the page */
  key: string;
  /** Full matched route pattern (after `generateExtensionUrlPattern`) */
  pattern: string;
  /** The actual URL path visited (relative to the app base) */
  path: string;
};

export type RouteNotFound_TelemetryData = {
  /** The URL path that failed to match any route (relative to the app base) */
  path: string;
};

export class LegendApplicationTelemetryHelper {
  static logEvent_ApplicationInitializationSucceeded(
    service: TelemetryService,
    applicationStore: GenericLegendApplicationStore,
  ): void {
    service.logEvent(APPLICATION_EVENT.APPLICATION_LOAD__SUCCESS, {
      application: {
        name: applicationStore.config.appName,
        version: applicationStore.config.appVersion,
        env: applicationStore.config.env,
      },
      browser: {
        userAgent: navigator.userAgent,
      },
      screen: {
        height: window.screen.height,
        width: window.screen.width,
      },
      userSettings: {
        theme: applicationStore.layoutService
          .TEMPORARY__isLightColorThemeEnabled
          ? 'light'
          : 'dark',
      },
    });
  }

  static logEvent_ApplicationContextAccessed(
    service: TelemetryService,
    data: ApplicationContextAccessed_TelemetryData,
  ): void {
    service.logEvent(APPLICATION_EVENT.APPLICATION_CONTEXT__ACCESS, data);
  }

  static logEvent_VirtualAssistantDocumentationEntryAccessed(
    service: TelemetryService,
    data: VirtualAssistantDocumentationEntryAccessed_TelemetryData,
  ): void {
    service.logEvent(
      APPLICATION_EVENT.VIRTUAL_ASSISTANT_DOCUMENTATION_ENTRY__ACCESS,
      data,
    );
  }

  static logEvent_ApplicationUsageInterrupted(service: TelemetryService): void {
    service.logEvent(APPLICATION_EVENT.APPLICATION_USAGE__INTERRUPT, {});
  }

  static logEvent_ExtensionPageAccessed(
    service: TelemetryService,
    data: ExtensionPageAccessed_TelemetryData,
  ): void {
    service.logEvent(APPLICATION_EVENT.EXTENSION_PAGE__ACCESS, data);
  }

  static logEvent_RouteNotFound(
    service: TelemetryService,
    data: RouteNotFound_TelemetryData,
  ): void {
    service.logEvent(APPLICATION_EVENT.ROUTE_NOT_FOUND, data);
  }
}
