/**
 * Copyright 2020 Goldman Sachs
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

import { uuid } from '../utils/CommonUtils';

export abstract class AbstractPlugin {
  private readonly name: string;
  private readonly version: string;
  private readonly uuid = uuid();

  constructor(name: string, version: string) {
    this.name = name;
    this.version = version;
  }

  getName(): string {
    return this.name;
  }

  getVersion(): string {
    return this.version;
  }

  getSignature(): string {
    return `${this.getName()}@${this.getVersion()}`;
  }

  getUUID(): string {
    return this.uuid;
  }

  configure(configData: object): AbstractPlugin {
    return this;
  }

  abstract install(pluginManager: AbstractPluginManager): void;
}

export abstract class AbstractPreset {
  private readonly name: string;
  private readonly version: string;
  private readonly uuid = uuid();

  constructor(name: string, version: string) {
    this.name = name;
    this.version = version;
  }

  getName(): string {
    return this.name;
  }

  getVersion(): string {
    return this.version;
  }

  getSignature(): string {
    return `${this.getName()}@${this.getVersion()}`;
  }

  getUUID(): string {
    return this.uuid;
  }

  configure(configData: object): AbstractPreset {
    return this;
  }

  abstract install(pluginManager: AbstractPluginManager): void;
}

export abstract class AbstractPluginManager {
  private plugins: AbstractPlugin[] = [];
  private presets: AbstractPreset[] = [];

  usePlugins(plugins: AbstractPlugin[]): AbstractPluginManager {
    this.plugins = plugins;
    return this;
  }

  usePresets(presets: AbstractPreset[]): AbstractPluginManager {
    this.presets = presets;
    return this;
  }

  configure(configData: Record<PropertyKey, object>): void {
    Object.keys(configData).forEach((key) => {
      this.presets.forEach((preset) => {
        if (preset.getName() === key) {
          preset.configure(configData[key]);
        }
      });
      this.plugins.forEach((plugin) => {
        if (plugin.getName() === key) {
          plugin.configure(configData[key]);
        }
      });
    });
  }

  install(): void {
    // Plugins run before presets
    // Plugins ordering is first to last
    this.plugins.forEach((plugin) => plugin.install(this));
    // Presets ordering is first to last
    this.presets.forEach((plugin) => plugin.install(this));
  }
}
