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

import packageJson from '../package.json';
import type { GraphPluginManager } from '@finos/legend-graph';
import { AbstractPreset } from '@finos/legend-shared';
import { DSLServiceStore_PureGraphManagerPlugin } from './graphManager/DSLServiceStore_PureGraphManagerPlugin';
import { DSLServiceStore_PureProtocolProcessorPlugin } from './models/protocols/pure/DSLServiceStore_PureProtocolProcessorPlugin';
import type { StudioPluginManager } from '@finos/legend-studio';
import { DSLServiceStore_PureGraphPlugin } from './graph/DSLServiceStore_PureGraphPlugin';
import { DSLServiceStore_StudioPlugin } from './components/DSLServiceStore_StudioPlugin';

export class DSLServiceStore_GraphPreset extends AbstractPreset {
  constructor() {
    super(packageJson.extensions.graphPreset, packageJson.version);
  }

  install(pluginManager: GraphPluginManager): void {
    new DSLServiceStore_PureGraphPlugin().install(pluginManager);
    new DSLServiceStore_PureGraphManagerPlugin().install(pluginManager);
    new DSLServiceStore_PureProtocolProcessorPlugin().install(pluginManager);
  }
}

export class DSLServiceStore_StudioPreset extends AbstractPreset {
  constructor() {
    super(packageJson.extensions.studioPreset, packageJson.version);
  }

  install(pluginManager: StudioPluginManager): void {
    new DSLServiceStore_StudioPlugin().install(pluginManager);
    new DSLServiceStore_PureGraphPlugin().install(pluginManager);
    new DSLServiceStore_PureGraphManagerPlugin().install(pluginManager);
    new DSLServiceStore_PureProtocolProcessorPlugin().install(pluginManager);
  }
}
