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

import packageJson from '../../../package.json' assert { type: 'json' };
import { PureGraphManagerPlugin } from '../PureGraphManagerPlugin.js';
import { CORE_PURE_PATH } from '../../graph/MetaModelConst.js';

export class Core_PureGraphManagerPlugin extends PureGraphManagerPlugin {
  static NAME = packageJson.extensions.pureGraphManagerPlugin;

  constructor() {
    super(Core_PureGraphManagerPlugin.NAME, packageJson.version);
  }

  override getExtraExposedSystemElementPath(): string[] {
    return [CORE_PURE_PATH.PROFILE_DOC, CORE_PURE_PATH.PROFILE_TEMPORAL];
  }
}
