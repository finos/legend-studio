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

import { type PlainObject, uuid } from '../CommonUtils.js';

export class PluginInfo {
  name!: string;
  version!: string;
  signature!: string;
  uuid!: string;
}

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

  getInfo(): PluginInfo {
    const info = new PluginInfo();
    info.name = this.getName();
    info.version = this.getVersion();
    info.signature = this.getSignature();
    info.uuid = this.getUUID();
    return info;
  }

  configure(configData: PlainObject): AbstractPlugin {
    return this;
  }

  abstract install(pluginManager: AbstractPluginManager): void;
}

export class PresetInfo {
  name!: string;
  version!: string;
  signature!: string;
  uuid!: string;
  plugins: PluginInfo[] = [];
}

export abstract class AbstractPreset {
  private readonly name: string;
  private readonly version: string;
  private readonly uuid = uuid();
  protected plugins: AbstractPlugin[] = [];

  constructor(name: string, version: string, plugins: AbstractPlugin[]) {
    this.name = name;
    this.version = version;
    this.plugins = plugins;
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

  getPlugins(): AbstractPlugin[] {
    return [...this.plugins];
  }

  getInfo(): PresetInfo {
    const info = new PresetInfo();
    info.name = this.getName();
    info.version = this.getVersion();
    info.signature = this.getSignature();
    info.uuid = this.getUUID();
    info.plugins = this.plugins
      .map((plugin) => plugin.getInfo())
      .sort((a, b) => a.name.localeCompare(b.name));
    return info;
  }

  configure(configData: PlainObject): AbstractPreset {
    return this;
  }

  install(pluginManager: AbstractPluginManager): void {
    this.plugins.forEach((plugin) => plugin.install(pluginManager));
  }
}

export type PluginManagerInfo = {
  plugins: PluginInfo[];
  presets: PresetInfo[];
};

export type ExtensionsConfigurationData = Record<PropertyKey, PlainObject>;

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

  configure(configData: ExtensionsConfigurationData): void {
    Object.keys(configData).forEach((key) => {
      const configObj = configData[key] as PlainObject;
      this.presets.forEach((preset) => {
        if (preset.getName() === key) {
          preset.configure(configObj);
        }
      });
      this.plugins.forEach((plugin) => {
        if (plugin.getName() === key) {
          plugin.configure(configObj);
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

  getInfo(): PluginManagerInfo {
    return {
      plugins: this.plugins
        .filter(
          (plugin) => !this.getHiddenPluginNames().includes(plugin.getName()),
        )
        .map((plugin) => plugin.getInfo())
        .sort((a, b) => a.name.localeCompare(b.name)),
      presets: this.presets
        .filter(
          (preset) => !this.getHiddenPresetNames().includes(preset.getName()),
        )
        .map((preset) => preset.getInfo())
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  /**
   * Return the list of core plugin names to be hidden
   * when getting plugin manager info, such as core plugins.
   */
  protected getHiddenPluginNames(): string[] {
    return [];
  }

  /**
   * Return the list of core presets names to be hidden
   * when getting plugin manager info, such as core presets.
   */
  protected getHiddenPresetNames(): string[] {
    return [];
  }
}
