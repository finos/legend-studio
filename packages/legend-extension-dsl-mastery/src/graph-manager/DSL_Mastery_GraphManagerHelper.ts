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

import { MasterRecordDefinition } from '../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_MasterRecordDefinition.js';
import type { BasicModel, PureModel } from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';

export const getMasterRecordDefinition = (
  path: string,
  graph: PureModel,
): MasterRecordDefinition =>
  graph.getExtensionElement(
    path,
    MasterRecordDefinition,
    `Can't find master record definition '${path}'`,
  );

export const getOwnMasterRecordDefinition = (
  path: string,
  graph: BasicModel,
): MasterRecordDefinition =>
  guaranteeNonNullable(
    graph.getOwnNullableExtensionElement(path, MasterRecordDefinition),
    `Can't find master record definition '${path}'`,
  );
