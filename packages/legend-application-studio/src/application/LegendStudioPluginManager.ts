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
  type GraphManagerPluginManager,
  type PureGraphManagerPlugin,
  type PureGraphPlugin,
  type PureProtocolProcessorPlugin,
} from '@finos/legend-graph';
import { Core_LegendStudioApplicationPlugin } from '../components/Core_LegendStudioApplicationPlugin.js';
import type { LegendStudioApplicationPlugin } from '../stores/LegendStudioApplicationPlugin.js';

export class LegendStudioPluginManager
  extends LegendApplicationPluginManager<LegendStudioApplicationPlugin>
  implements GraphManagerPluginManager
{
  private pureProtocolProcessorPlugins: PureProtocolProcessorPlugin[] = [];
  private pureGraphManagerPlugins: PureGraphManagerPlugin[] = [];
  private pureGraphPlugins: PureGraphPlugin[] = [];

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

  getPureGraphManagerPlugins(): PureGraphManagerPlugin[] {
    return [...this.pureGraphManagerPlugins];
  }

  getPureProtocolProcessorPlugins(): PureProtocolProcessorPlugin[] {
    return [...this.pureProtocolProcessorPlugins];
  }

  getPureGraphPlugins(): PureGraphPlugin[] {
    return [...this.pureGraphPlugins];
  }

  override getHiddenPluginNames(): string[] {
    return [
      Core_LegendStudioApplicationPlugin.NAME,
      CorePureGraphManagerPlugin.NAME,
    ];
  }
}
