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

import { LegendApplicationPluginManager } from '@finos/legend-application';
import {
  CorePureGraphManagerPlugin,
  type GraphPluginManager,
  type PureGraphManagerPlugin,
  type PureGraphPlugin,
  type PureProtocolProcessorPlugin,
} from '@finos/legend-graph';
import { Core_LegendStudioPlugin } from '../components/Core_LegendStudioPlugin.js';
import type { LegendStudioPlugin } from '../stores/LegendStudioPlugin.js';

export class LegendStudioPluginManager
  extends LegendApplicationPluginManager
  implements GraphPluginManager
{
  private pureProtocolProcessorPlugins: PureProtocolProcessorPlugin[] = [];
  private pureGraphManagerPlugins: PureGraphManagerPlugin[] = [];
  private pureGraphPlugins: PureGraphPlugin[] = [];
  private studioPlugins: LegendStudioPlugin[] = [];

  private constructor() {
    super();
  }

  static create(): LegendStudioPluginManager {
    return new LegendStudioPluginManager();
  }

  registerPureProtocolProcessorPlugin(
    plugin: PureProtocolProcessorPlugin,
  ): void {
    this.pureProtocolProcessorPlugins.push(plugin);
  }

  registerPureGraphManagerPlugin(plugin: PureGraphManagerPlugin): void {
    this.pureGraphManagerPlugins.push(plugin);
  }

  registerPureGraphPlugin(plugin: PureGraphPlugin): void {
    this.pureGraphPlugins.push(plugin);
  }

  registerStudioPlugin(plugin: LegendStudioPlugin): void {
    this.studioPlugins.push(plugin);
  }

  getPureGraphManagerPlugins(): PureGraphManagerPlugin[] {
    return [...this.pureGraphManagerPlugins];
  }

  getPureProtocolProcessorPlugins(): PureProtocolProcessorPlugin[] {
    return [...this.pureProtocolProcessorPlugins];
  }

  getPureGraphPlugins(): PureGraphPlugin[] {
    return [...this.pureGraphPlugins];
  }

  getStudioPlugins(): LegendStudioPlugin[] {
    return [...this.studioPlugins];
  }

  override getHiddenPluginNames(): string[] {
    return [Core_LegendStudioPlugin.NAME, CorePureGraphManagerPlugin.NAME];
  }
}
