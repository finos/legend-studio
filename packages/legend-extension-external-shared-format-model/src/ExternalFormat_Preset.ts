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
import { SchemaSet_PureGraphManagerPlugin } from './graphManager/SchemaSet_PureGraphManagerPlugin';
import { Binding_PureGraphManagerPlugin } from './graphManager/Binding_PureGraphManagerPlugin';
import { SchemaSet_PureProtocolProcessorPlugin } from './models/protocols/pure/SchemaSet_PureProtocolProcessorPlugin';
import { Binding_PureProtocolProcessorPlugin } from './models/protocols/pure/Binding_PureProtocolProcessorPlugin';
import type { StudioPluginManager } from '@finos/legend-studio';
import { SchemaSet_StudioPlugin } from './components/SchemaSet_StudioPlugin';
import { Binding_StudioPlugin } from './components/Binding_StudioPlugin';
import { SchemaSet_PureGraphPlugin } from './graph/SchemaSet_PureGraphPlugin';
import { Binding_PureGraphPlugin } from './graph/Binding_PureGraphPlugin';

export class ExternalFormat_GraphPreset extends AbstractPreset {
  constructor() {
    super(packageJson.extensions.graphPreset, packageJson.version);
  }

  install(pluginManager: GraphPluginManager): void {
    new SchemaSet_PureGraphPlugin().install(pluginManager);
    new Binding_PureGraphPlugin().install(pluginManager);
    new SchemaSet_PureGraphManagerPlugin().install(pluginManager);
    new Binding_PureGraphManagerPlugin().install(pluginManager);
    new SchemaSet_PureProtocolProcessorPlugin().install(pluginManager);
    new Binding_PureProtocolProcessorPlugin().install(pluginManager);
  }
}

export class ExternalFormat_StudioPreset extends AbstractPreset {
  constructor() {
    super(packageJson.extensions.studioPreset, packageJson.version);
  }

  install(pluginManager: StudioPluginManager): void {
    new SchemaSet_StudioPlugin().install(pluginManager);
    new Binding_StudioPlugin().install(pluginManager);
    new SchemaSet_PureGraphPlugin().install(pluginManager);
    new Binding_PureGraphPlugin().install(pluginManager);
    new SchemaSet_PureGraphManagerPlugin().install(pluginManager);
    new Binding_PureGraphManagerPlugin().install(pluginManager);
    new SchemaSet_PureProtocolProcessorPlugin().install(pluginManager);
    new Binding_PureProtocolProcessorPlugin().install(pluginManager);
  }
}
