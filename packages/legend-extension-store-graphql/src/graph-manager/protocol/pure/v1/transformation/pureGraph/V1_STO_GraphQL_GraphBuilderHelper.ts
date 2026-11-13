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

import { getGraphQLStore } from '../../../../../STO_GraphQL_GraphManagerHelper.js';
import type { GraphQLStore } from '../../../../../../graph/metamodel/pure/model/packageableElements/store/graphQL/model/STO_GraphQL_GraphQLStore.js';
import type {
  PackageableElementImplicitReference,
  V1_GraphBuilderContext,
} from '@finos/legend-graph';

export const V1_resolveGraphQLStore = (
  path: string,
  context: V1_GraphBuilderContext,
): PackageableElementImplicitReference<GraphQLStore> =>
  context.createImplicitPackageableElementReference(path, (_path: string) =>
    getGraphQLStore(_path, context.graph),
  );
