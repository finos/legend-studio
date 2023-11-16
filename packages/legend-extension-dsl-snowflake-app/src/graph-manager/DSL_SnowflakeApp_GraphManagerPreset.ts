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

import packageJson from '../../package.json' assert { type: 'json' };
import { AbstractPreset } from '@finos/legend-shared';
import { DSL_SnowflakeApp_PureGraphManagerPlugin } from './DSL_SnowflakeApp_PureGraphManagerPlugin.js';
import { DSL_SnowflakeApp_PureProtocolProcessorPlugin } from './protocol/pure/DSL_SnowflakeApp_PureProtocolProcessorPlugin.js';
import { DSL_SnowflakeApp_PureGraphPlugin } from '../graph/DSL_SnowflakeApp_PureGraphPlugin.js';

export class DSL_SnowflakeApp_GraphManagerPreset extends AbstractPreset {
  constructor() {
    super(packageJson.extensions.graphManagerPreset, packageJson.version, [
      new DSL_SnowflakeApp_PureGraphPlugin(),
      new DSL_SnowflakeApp_PureGraphManagerPlugin(),
      new DSL_SnowflakeApp_PureProtocolProcessorPlugin(),
    ]);
  }
}
