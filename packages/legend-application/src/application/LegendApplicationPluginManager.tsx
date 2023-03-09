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
  type LoggerPlugin,
  type LoggerPluginManager,
  type TracerServicePlugin,
  type TracerServicePluginManager,
  AbstractPluginManager,
} from '@finos/legend-shared';
import type {
  EventNotifierPlugin,
  EventNotifierPluginManager,
} from '../stores/event/EventService.js';
import type { LegendApplicationPlugin } from '../stores/LegendApplicationPlugin.js';
import type {
  TelemetryServicePlugin,
  TelemetryServicePluginManager,
} from '../stores/TelemetryService.js';

export class LegendApplicationPluginManager<T extends LegendApplicationPlugin>
  extends AbstractPluginManager
  implements
    LoggerPluginManager,
    TracerServicePluginManager,
    TelemetryServicePluginManager,
    EventNotifierPluginManager
{
  protected loggerPlugins: LoggerPlugin[] = [];
  protected telemetryServicePlugins: TelemetryServicePlugin[] = [];
  protected tracerServicePlugins: TracerServicePlugin<unknown>[] = [];
  protected eventNotifierPlugins: EventNotifierPlugin[] = [];
  protected applicationPlugins: T[] = [];

  registerLoggerPlugin(plugin: LoggerPlugin): void {
    this.loggerPlugins.push(plugin);
  }

  registerTelemetryServicePlugin(plugin: TelemetryServicePlugin): void {
    this.telemetryServicePlugins.push(plugin);
  }

  registerTracerServicePlugin(plugin: TracerServicePlugin<unknown>): void {
    this.tracerServicePlugins.push(plugin);
  }

  registerEventNotifierPlugin(plugin: EventNotifierPlugin): void {
    this.eventNotifierPlugins.push(plugin);
  }

  registerApplicationPlugin(plugin: T): void {
    this.applicationPlugins.push(plugin);
  }

  getLoggerPlugins(): LoggerPlugin[] {
    return [...this.loggerPlugins];
  }

  getTelemetryServicePlugins(): TelemetryServicePlugin[] {
    return [...this.telemetryServicePlugins];
  }

  getTracerServicePlugins(): TracerServicePlugin<unknown>[] {
    return [...this.tracerServicePlugins];
  }

  getEventNotifierPlugins(): EventNotifierPlugin[] {
    return [...this.eventNotifierPlugins];
  }

  getApplicationPlugins(): T[] {
    return [...this.applicationPlugins];
  }
}
