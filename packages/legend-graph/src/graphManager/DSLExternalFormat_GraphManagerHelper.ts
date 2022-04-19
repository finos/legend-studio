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

import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import type { BasicModel } from '../graph/BasicModel';
import type { PureModel } from '../graph/PureModel';
import { SchemaSet } from '../models/metamodels/pure/packageableElements/externalFormat/schemaSet/DSLExternalFormat_SchemaSet';
import { Binding } from '../models/metamodels/pure/packageableElements/externalFormat/store/DSLExternalFormat_Binding';

export const getSchemaSet = (path: string, graph: PureModel): SchemaSet =>
  graph.getExtensionElement(path, SchemaSet, `Can't find schema set '${path}'`);

export const getOwnSchemaSet = (path: string, graph: BasicModel): SchemaSet =>
  guaranteeNonNullable(
    graph.getOwnNullableExtensionElement(path, SchemaSet),
    `Can't find schema set '${path}'`,
  );

export const getBinding = (path: string, graph: PureModel): Binding =>
  guaranteeType(graph.getStore(path), Binding, `Can't find binding '${path}'`);

export const getOwnBinding = (path: string, graph: BasicModel): Binding =>
  guaranteeNonNullable(
    graph.getOwnNullableExtensionElement(path, Binding),
    `Can't find binding '${path}'`,
  );
