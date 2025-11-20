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
  Core_PureGraphManagerPlugin,
  type GraphManagerPluginManager,
  type PureGraphManagerPlugin,
  type PureGraphPlugin,
  type PureProtocolProcessorPlugin,
} from '@finos/legend-graph';
import { Core_LegendStudioApplicationPlugin } from '../components/extensions/Core_LegendStudioApplicationPlugin.js';
import type { LegendStudioApplicationPlugin } from '../stores/LegendStudioApplicationPlugin.js';
import type {
  LegendUserPlugin,
  LegendUserPluginManager,
} from '@finos/legend-shared';

export class LegendStudioPluginManager
  extends LegendApplicationPluginManager<LegendStudioApplicationPlugin>
  implements GraphManagerPluginManager, LegendUserPluginManager
{
  private pureProtocolProcessorPlugins: PureProtocolProcessorPlugin[] = [];
  private pureGraphManagerPlugins: PureGraphManagerPlugin[] = [];
  private pureGraphPlugins: PureGraphPlugin[] = [];
  private userPlugins: LegendUserPlugin[] = [];

  private constructor() {
    super();
  }
  registerUserPlugin(plugin: LegendUserPlugin): void {
    this.userPlugins.push(plugin);
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

  getUserPlugins(): LegendUserPlugin[] {
    return [...this.userPlugins];
  }

  override getHiddenPluginNames(): string[] {
    return [
      Core_LegendStudioApplicationPlugin.NAME,
      Core_PureGraphManagerPlugin.NAME,
    ];
  }
}
