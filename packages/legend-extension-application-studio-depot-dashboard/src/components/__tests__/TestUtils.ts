/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  type LegendApplicationPlugin,
  LegendApplicationPluginManager,
} from '@finos/legend-application';
import type {
  GraphManagerPluginManager,
  PureGraphManagerPlugin,
  PureGraphPlugin,
  PureProtocolProcessorPlugin,
} from '@finos/legend-graph';

export class TEST__LegendApplicationPluginManager
  extends LegendApplicationPluginManager<LegendApplicationPlugin>
  implements GraphManagerPluginManager
{
  private pureProtocolProcessorPlugins: PureProtocolProcessorPlugin[] = [];
  private pureGraphManagerPlugins: PureGraphManagerPlugin[] = [];
  private pureGraphPlugins: PureGraphPlugin[] = [];

  private constructor() {
    super();
  }

  static create(): TEST__LegendApplicationPluginManager {
    return new TEST__LegendApplicationPluginManager();
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

  getPureProtocolProcessorPlugins(): PureProtocolProcessorPlugin[] {
    return this.pureProtocolProcessorPlugins;
  }

  getPureGraphManagerPlugins(): PureGraphManagerPlugin[] {
    return this.pureGraphManagerPlugins;
  }

  getPureGraphPlugins(): PureGraphPlugin[] {
    return this.pureGraphPlugins;
  }
}
