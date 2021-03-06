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
import type { PluginManager } from '@finos/legend-studio';
import { AbstractPreset } from '@finos/legend-studio-shared';
import { QueryBuilder_EditorPlugin } from './components/QueryBuilder_EditorPlugin';
import { QueryBuilder_PureProtocolProcessorPlugin } from './models/protocols/pure/QueryBuilder_PureProtocolProcessorPlugin';

export class QueryBuilder_Preset extends AbstractPreset {
  constructor() {
    super(packageJson.name, packageJson.version);
  }

  install(pluginManager: PluginManager): void {
    new QueryBuilder_EditorPlugin().install(pluginManager);
    new QueryBuilder_PureProtocolProcessorPlugin().install(pluginManager);
  }
}
