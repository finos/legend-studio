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
import { Query_GraphQL_PureGraphManagerPlugin as Query_GraphQL_PureGraphManagerPlugin } from './graphManager/Query_GraphQL_PureGraphManagerPlugin.js';
import { Query_GraphQL_PureProtocolProcessorPlugin as Query_GraphQL_PureProtocolProcessorPlugin } from './graphManager/protocol/pure/Query_GraphQL_PureProtocolProcessorPlugin.js';

export class Query_GraphQL_GraphManagerPreset extends AbstractPreset {
  constructor() {
    super(packageJson.extensions.graphManagerPreset, packageJson.version, [
      new Query_GraphQL_PureGraphManagerPlugin(),
      new Query_GraphQL_PureProtocolProcessorPlugin(),
    ]);
  }
}
