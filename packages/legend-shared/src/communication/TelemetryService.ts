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
} from '../application/AbstractPluginManager.js';
import type { PlainObject } from '../CommonUtils.js';

export type TelemetryData = PlainObject;

export interface TelemetryServicePluginManager extends AbstractPluginManager {
  getTelemetryServicePlugins(): TelemetryServicePlugin[];
  registerTelemetryServicePlugin(plugin: TelemetryServicePlugin): void;
}

export abstract class TelemetryServicePlugin extends AbstractPlugin {
  install(pluginManager: TelemetryServicePluginManager): void {
    pluginManager.registerTelemetryServicePlugin(this);
  }

  /**
   * Certain telemetry service needs the user ID set in order to derive more information of the user
   * from directory service in the telemetry server.
   */
  abstract setUserId(val: string): TelemetryServicePlugin;

  /**
   * NOTE: However the telemetry server is configured,
   * telemetry events should be considered "fire and forget"
   * i.e. being sent asynchronously and not throwing errors
   */
  abstract logEvent(eventType: string, data: TelemetryData): void;
}

export class TelemetryService {
  private plugins: TelemetryServicePlugin[] = [];

  registerPlugins(plugins: TelemetryServicePlugin[]): void {
    this.plugins = plugins;
  }

  setUserId(val: string): void {
    this.plugins.forEach((plugin) => plugin.setUserId(val));
  }

  logEvent(eventType: string, data: TelemetryData): void {
    this.plugins.forEach((plugin) => plugin.logEvent(eventType, data));
  }
}
