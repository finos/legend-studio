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

import type { BasicModel, PureModel } from '@finos/legend-graph';
import { guaranteeType } from '@finos/legend-shared';
import { ServiceStore } from '../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_ServiceStore.js';

export const getServiceStore = (path: string, graph: PureModel): ServiceStore =>
  guaranteeType(
    graph.getStore(path),
    ServiceStore,
    `Can't find service store '${path}'`,
  );

export const getOwnServiceStore = (
  path: string,
  graph: BasicModel,
): ServiceStore =>
  guaranteeType(
    graph.getOwnNullableStore(path),
    ServiceStore,
    `Can't find service store '${path}'`,
  );
