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
import { AbstractPreset } from '@finos/legend-shared';
import { DSLDataSpace_PureGraphManagerPlugin } from './graphManager/DSLDataSpace_PureGraphManagerPlugin';
import { DSLDataSpace_PureProtocolProcessorPlugin } from './models/protocols/pure/DSLDataSpace_PureProtocolProcessorPlugin';
import type { GraphPluginManager } from '@finos/legend-graph';
import { DSLDataSpace_PureGraphPlugin } from './graph/DSLDataSpace_PureGraphPlugin';

export class DSLDataSpace_GraphPreset extends AbstractPreset {
  constructor() {
    super(packageJson.extensions.graphPreset, packageJson.version);
  }

  install(pluginManager: GraphPluginManager): void {
    new DSLDataSpace_PureGraphPlugin().install(pluginManager);
    new DSLDataSpace_PureGraphManagerPlugin().install(pluginManager);
    new DSLDataSpace_PureProtocolProcessorPlugin().install(pluginManager);
  }
}
