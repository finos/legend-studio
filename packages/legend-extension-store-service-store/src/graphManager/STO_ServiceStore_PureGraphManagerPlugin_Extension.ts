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

import type {
  ObserverContext,
  PureGraphManagerPlugin,
} from '@finos/legend-graph';
import type { SecurityScheme } from '../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_SecurityScheme.js';

export type SecuritySchemeObserver = (
  metamodel: SecurityScheme,
  context: ObserverContext,
) => SecurityScheme | undefined;

export interface STO_ServiceStore_PureGraphManagerPlugin_Extension
  extends PureGraphManagerPlugin {
  getExtraSecuritySchemeObservers?(): SecuritySchemeObserver[];
}
