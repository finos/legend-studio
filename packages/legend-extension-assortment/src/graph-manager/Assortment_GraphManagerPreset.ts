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

import packageJson from '../../package.json' with { type: 'json' };
import { AbstractPreset } from '@finos/legend-shared';
import { FMT_GraphQL_PureGraphManagerPlugin } from './FMT_GraphQL_PureGraphManagerPlugin.js';
import { FMT_GraphQL_PureProtocolProcessorPlugin } from './protocol/pure/FMT_GraphQL_PureProtocolProcessorPlugin.js';
import { FMT_JSONSchema_PureGraphManagerPlugin } from './FMT_JSONSchema_PureGraphManagerPlugin.js';
import { FMT_JSONSchema_PureProtocolProcessorPlugin } from './protocol/pure/FMT_JSONSchema_PureProtocolProcessorPlugin.js';

export class Assortment_GraphManagerPreset extends AbstractPreset {
  constructor() {
    super(packageJson.extensions.graphManagerPreset, packageJson.version, [
      // Graph QL
      new FMT_GraphQL_PureGraphManagerPlugin(),
      new FMT_GraphQL_PureProtocolProcessorPlugin(),
      // JSON Schema
      new FMT_JSONSchema_PureGraphManagerPlugin(),
      new FMT_JSONSchema_PureProtocolProcessorPlugin(),
    ]);
  }
}
