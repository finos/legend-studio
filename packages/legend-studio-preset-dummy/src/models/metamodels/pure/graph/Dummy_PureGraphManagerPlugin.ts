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

import packageJson from '../../../../../package.json';
import { PureGraphManagerPlugin } from '@finos/legend-studio';
import type { PluginManager, PackageableElement } from '@finos/legend-studio';
import type { Clazz } from '@finos/legend-studio-shared';

export class Dummy_PureGraphManagerPlugin
  extends PureGraphManagerPlugin
  // NOTE: we do this so we are reminded to add new plugin methods to this class every time we introduce a new one
  implements Required<PureGraphManagerPlugin>
{
  constructor() {
    super(
      `${packageJson.pluginPrefix}-pure-graph-manager`,
      packageJson.version,
    );
  }

  install(pluginManager: PluginManager): void {
    pluginManager.registerPureGraphManagerPlugin(this);
  }

  getExtraPureGraphExtensionClasses(): Clazz<PackageableElement>[] {
    return [];
  }
}
