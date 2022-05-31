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
import { DSLPersistence_PureGraphPlugin } from './graph/DSLPersistence_PureGraphPlugin';
import { DSLPersistence_PureGraphManagerPlugin } from './graphManager/DSLPersistence_PureGraphManagerPlugin';
import { DSLPersistence_PureProtocolProcessorPlugin } from './models/protocols/pure/DSLPersistence_PureProtocolProcessorPlugin';

export class DSLPersistence_GraphPreset extends AbstractPreset {
  constructor() {
    super(packageJson.extensions.graphPreset, packageJson.version, [
      new DSLPersistence_PureGraphPlugin(),
      new DSLPersistence_PureGraphManagerPlugin(),
      new DSLPersistence_PureProtocolProcessorPlugin(),
    ]);
  }
}
