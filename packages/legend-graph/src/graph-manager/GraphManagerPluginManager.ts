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

import type { PureGraphPlugin } from '../graph/PureGraphPlugin.js';
import type { PureGraphManagerPlugin } from './PureGraphManagerPlugin.js';
import type { PureProtocolProcessorPlugin } from '../graph-manager/protocol/pure/PureProtocolProcessorPlugin.js';
import type { GraphPluginManager } from '../graph/GraphPluginManager.js';

export interface GraphManagerPluginManager extends GraphPluginManager {
  getPureGraphPlugins(): PureGraphPlugin[];
  registerPureGraphPlugin(plugin: PureGraphPlugin): void;

  getPureGraphManagerPlugins(): PureGraphManagerPlugin[];
  registerPureGraphManagerPlugin(plugin: PureGraphManagerPlugin): void;

  getPureProtocolProcessorPlugins(): PureProtocolProcessorPlugin[];
  registerPureProtocolProcessorPlugin(
    plugin: PureProtocolProcessorPlugin,
  ): void;
}
