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
  AbstractPlugin,
  type AbstractPluginManager,
  type PlainObject,
} from '@finos/legend-shared';
import type { GenericLegendApplicationStore } from './ApplicationStore.js';

export type TelemetryData = PlainObject;

type ApplicationTelemetryConfigData = {
  userId?: string | undefined;
  appName?: string | undefined;
  appVersion?: string | undefined;
  appEnv?: string | undefined;
  appSessionId?: string | undefined;
  appStartTime?: number | undefined;
};

export interface TelemetryServicePluginManager extends AbstractPluginManager {
  getTelemetryServicePlugins(): TelemetryServicePlugin[];
  registerTelemetryServicePlugin(plugin: TelemetryServicePlugin): void;
}

export abstract class TelemetryServicePlugin extends AbstractPlugin {
  protected userId?: string | undefined;
  protected appName?: string | undefined;
  protected appVersion?: string | undefined;
  protected appEnv?: string | undefined;
  protected appSessionId?: string | undefined;
  protected appStartTime?: number | undefined;

  install(pluginManager: TelemetryServicePluginManager): void {
    pluginManager.registerTelemetryServicePlugin(this);
  }

  setup(config: ApplicationTelemetryConfigData): void {
    this.userId = config.userId;
    this.appName = config.appName;
    this.appVersion = config.appVersion;
    this.appEnv = config.appEnv;
    this.appSessionId = config.appSessionId;
    this.appStartTime = config.appStartTime;
  }

  /**
   * NOTE: However the telemetry server is configured,
   * telemetry events should be considered "fire and forget"
   * i.e. being sent asynchronously and not throwing errors
   */
  abstract logEvent(eventType: string, data: TelemetryData): void;
}

export class TelemetryService {
  readonly applicationStore: GenericLegendApplicationStore;
  private plugins: TelemetryServicePlugin[] = [];

  constructor(applicationStore: GenericLegendApplicationStore) {
    this.applicationStore = applicationStore;
  }

  registerPlugins(plugins: TelemetryServicePlugin[]): void {
    this.plugins = plugins;
  }

  setup(): void {
    const config = {
      userId: this.applicationStore.identityService.currentUser,
      appName: this.applicationStore.config.appName,
      appEnv: this.applicationStore.config.env,
      appVersion: this.applicationStore.config.appVersion,
      appSessionId: this.applicationStore.uuid,
      appStartTime: this.applicationStore.timeService.timestamp,
    };
    this.plugins.forEach((plugin) => plugin.setup(config));
  }

  logEvent(eventType: string, data: TelemetryData): void {
    this.plugins.forEach((plugin) => plugin.logEvent(eventType, data));
  }
}
