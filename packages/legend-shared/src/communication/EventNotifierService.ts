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

import type {
  AbstractPluginManager,
  PluginConsumer,
} from '../application/AbstractPluginManager';
import { AbstractPlugin } from '../application/AbstractPluginManager';

// NOTE: here, we keep event data at a very generic shape
// One of the main motivation of event notifier is Github web hook
// we would need to document event as well their event data
// See https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#webhook-payload-object-common-properties
export interface EventData {
  [key: string]: unknown;
}

export interface EventNotifierServicePluginManager
  extends AbstractPluginManager {
  registerEventNotifierPlugin(plugin: EventNotifierPlugin): void;
  getEventNotifierPlugins(): EventNotifierPlugin[];
}

export abstract class EventNotifierPlugin extends AbstractPlugin {
  install(pluginManager: EventNotifierServicePluginManager): void {
    pluginManager.registerEventNotifierPlugin(this);
  }

  /**
   * NOTE: Similar to telemetry service, event notifier should be considered "fire and forget"
   * it should not throw any error
   */
  abstract notify(event: string, data: EventData): void;
}

export class EventNotifierService implements PluginConsumer {
  private plugins: EventNotifierPlugin[] = [];

  registerPlugins(plugins: EventNotifierPlugin[]): void {
    this.plugins = plugins;
  }

  notify(event: string, data: EventData): void {
    this.plugins.forEach((plugin) => plugin.notify(event, data));
  }
}
