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

import packageJson from '../package.json' with { type: 'json' };
import { AbstractPreset } from '@finos/legend-shared';
import { DSL_ExternalFormat_PureGraphManagerPlugin } from './graph-manager/extensions/DSL_ExternalFormat_PureGraphManagerPlugin.js';
import { DSL_ExternalFormat_PureProtocolProcessorPlugin } from './graph-manager/protocol/pure/extensions/DSL_ExternalFormat_PureProtocolProcessorPlugin.js';
import { DSL_ExternalFormat_PureGraphPlugin } from './graph/extensions/DSL_ExternalFormat_PureGraphPlugin.js';
import { Core_PureGraphManagerPlugin } from './graph-manager/extensions/Core_PureGraphManagerPlugin.js';

export class Core_GraphManagerPreset extends AbstractPreset {
  constructor() {
    super(packageJson.extensions.graphManagerPreset, packageJson.version, [
      new Core_PureGraphManagerPlugin(),

      new DSL_ExternalFormat_PureGraphPlugin(),
      new DSL_ExternalFormat_PureGraphManagerPlugin(),
      new DSL_ExternalFormat_PureProtocolProcessorPlugin(),
    ]);
  }
}
