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
} from '@finos/legend-shared';

// NOTE: here, we keep event data at a very generic shape
// One of the main motivation of event notifier is Github web-hook
// we would need to document event as well their event data
// See https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#webhook-payload-object-common-properties
export interface NotificationEventData {
  [key: string]: unknown;
}

export interface EventNotifierPluginManager extends AbstractPluginManager {
  registerEventNotifierPlugin(plugin: EventNotifierPlugin): void;
  getEventNotifierPlugins(): EventNotifierPlugin[];
}

export abstract class EventNotifierPlugin extends AbstractPlugin {
  install(pluginManager: EventNotifierPluginManager): void {
    pluginManager.registerEventNotifierPlugin(this);
  }

  /**
   * NOTE: Similar to telemetry service, event notifier should be considered "fire and forget"
   * it should not throw any error
   */
  abstract notify(event: string, data: NotificationEventData): void;
}

export class EventService {
  private notifierPlugins: EventNotifierPlugin[] = [];

  registerEventNotifierPlugins(plugins: EventNotifierPlugin[]): void {
    this.notifierPlugins = plugins;
  }

  notify(event: string, data: NotificationEventData): void {
    this.notifierPlugins.forEach((plugin) => plugin.notify(event, data));
  }
}
