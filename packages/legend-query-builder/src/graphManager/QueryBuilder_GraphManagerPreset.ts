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

import packageJson from '../../package.json';
import { AbstractPreset } from '@finos/legend-shared';
import { QueryBuilder_PureProtocolProcessorPlugin } from './protocol/pure/QueryBuilder_PureProtocolProcessorPlugin.js';
import { QueryBuilder_PureGraphManagerPlugin } from './QueryBuilder_GraphManagerPlugin.js';

/**
 * This is the core graph manager preset and should not be exported
 * and consumed outside of this package
 */
export class QueryBuilder_GraphManagerPreset extends AbstractPreset {
  constructor() {
    super(packageJson.extensions.graphManagerPreset, packageJson.version, [
      new QueryBuilder_PureGraphManagerPlugin(),
      new QueryBuilder_PureProtocolProcessorPlugin(),
    ]);
  }
}
