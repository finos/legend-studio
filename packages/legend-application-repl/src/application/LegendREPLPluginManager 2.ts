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
  GraphManagerPluginManager,
  PureGraphManagerPlugin,
  PureGraphPlugin,
  PureProtocolProcessorPlugin,
} from '@finos/legend-graph';
import { LegendApplicationPluginManager } from '@finos/legend-application';
import type { LegendREPLApplicationPlugin } from '../stores/LegendREPLApplicationPlugin.js';

export class LegendREPLPluginManager
  extends LegendApplicationPluginManager<LegendREPLApplicationPlugin>
  implements GraphManagerPluginManager
{
  private pureProtocolProcessorPlugins: PureProtocolProcessorPlugin[] = [];
  private pureGraphManagerPlugins: PureGraphManagerPlugin[] = [];
  private pureGraphPlugins: PureGraphPlugin[] = [];

  private constructor() {
    super();
  }

  static create() {
    return new LegendREPLPluginManager();
  }

  registerPureProtocolProcessorPlugin(plugin: PureProtocolProcessorPlugin) {
    this.pureProtocolProcessorPlugins.push(plugin);
  }

  registerPureGraphManagerPlugin(plugin: PureGraphManagerPlugin) {
    this.pureGraphManagerPlugins.push(plugin);
  }

  registerPureGraphPlugin(plugin: PureGraphPlugin) {
    this.pureGraphPlugins.push(plugin);
  }

  getPureGraphManagerPlugins() {
    return [...this.pureGraphManagerPlugins];
  }

  getPureProtocolProcessorPlugins() {
    return [...this.pureProtocolProcessorPlugins];
  }

  getPureGraphPlugins() {
    return [...this.pureGraphPlugins];
  }
}
