/**
 * Copyright (c) 2026-present, Goldman Sachs
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
import { GraphQLStore } from '../graph/metamodel/pure/model/packageableElements/store/graphQL/model/STO_GraphQL_GraphQLStore.js';

export const getGraphQLStore = (path: string, graph: PureModel): GraphQLStore =>
  guaranteeType(
    graph.getStore(path),
    GraphQLStore,
    `Can't find GraphQL store '${path}'`,
  );

export const getOwnGraphQLStore = (
  path: string,
  graph: BasicModel,
): GraphQLStore =>
  guaranteeType(
    graph.getOwnNullableStore(path),
    GraphQLStore,
    `Can't find GraphQL store '${path}'`,
  );
