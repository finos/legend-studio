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
import { ESService_PureGraphManagerPlugin } from './graphManager/ESService_PureGraphManagerPlugin';
import { ESService_PureProtocolProcessorPlugin } from './models/protocols/pure/ESService_PureProtocolProcessorPlugin';
import type { LegendStudioPluginManager } from '@finos/legend-studio';
import { ESService_PureGraphPlugin } from './graph/ESService_PureGraphPlugin';
import { ESService_LegendStudioPlugin } from './components/ESService_LegendStudioPlugin';

export class ESService_GraphPreset extends AbstractPreset {
  constructor() {
    super(packageJson.extensions.graphPreset, packageJson.version);
  }

  install(pluginManager: GraphPluginManager): void {
    new ESService_PureGraphPlugin().install(pluginManager);
    new ESService_PureGraphManagerPlugin().install(pluginManager);
    new ESService_PureProtocolProcessorPlugin().install(pluginManager);
  }
}

export class ESService_LegendStudioPreset extends AbstractPreset {
  constructor() {
    super(packageJson.extensions.studioPreset, packageJson.version);
  }

  install(pluginManager: LegendStudioPluginManager): void {
    new ESService_LegendStudioPlugin().install(pluginManager);
    new ESService_PureGraphPlugin().install(pluginManager);
    new ESService_PureGraphManagerPlugin().install(pluginManager);
    new ESService_PureProtocolProcessorPlugin().install(pluginManager);
  }
}
