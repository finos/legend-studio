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

import type { AbstractPureGraphManager } from '../../../graph-manager/AbstractPureGraphManager.js';
import { V1_PureGraphManager } from './v1/V1_PureGraphManager.js';
import type { LogService } from '@finos/legend-shared';
import type { GraphManagerPluginManager } from '../../GraphManagerPluginManager.js';
import type { V1_EngineServerClient } from './v1/engine/V1_EngineServerClient.js';

export const buildPureGraphManager = (
  pluginManager: GraphManagerPluginManager,
  logService: LogService,
  serverClient?: V1_EngineServerClient,
): AbstractPureGraphManager =>
  // NOTE: until we support more client versions, we always default to return V1
  new V1_PureGraphManager(pluginManager, logService, serverClient);
