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
import { guaranteeNonNullable } from '@finos/legend-shared';
import { DataSpace } from '../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';

export const getDataSpace = (path: string, graph: PureModel): DataSpace =>
  graph.getExtensionElement(path, DataSpace, `Can't find data space '${path}'`);

export const getOwnDataSpace = (path: string, graph: BasicModel): DataSpace =>
  guaranteeNonNullable(
    graph.getOwnNullableExtensionElement(path, DataSpace),
    `Can't find data space '${path}'`,
  );
