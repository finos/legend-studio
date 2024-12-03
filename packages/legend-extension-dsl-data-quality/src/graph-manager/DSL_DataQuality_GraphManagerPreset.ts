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

import { AbstractPreset } from '@finos/legend-shared';
import packageJson from '../../package.json' with { type: 'json' };
import { DSL_DataQuality_PureGraphPlugin } from '../graph/metamodel/DSL_DataQuality_PureGraphPlugin.js';
import { DSL_DataQuality_PureGraphManagerPlugin } from './DSL_DataQuality_PureGraphManagerPlugin.js';
import { DSL_DataQuality_PureProtocolProcessorPlugin } from './protocol/pure/DSL_DataQuality_PureProtocolProcessorPlugin.js';

export class DSL_DataQuality_GraphManagerPreset extends AbstractPreset {
  constructor() {
    super(packageJson.extensions.graphManagerPreset, packageJson.version, [
      new DSL_DataQuality_PureGraphPlugin(),
      new DSL_DataQuality_PureGraphManagerPlugin(),
      new DSL_DataQuality_PureProtocolProcessorPlugin(),
    ]);
  }
}
