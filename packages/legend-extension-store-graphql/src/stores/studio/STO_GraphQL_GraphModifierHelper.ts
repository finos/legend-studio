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

import {
  observe_PackageableElementReference,
  type PackageableElementReference,
} from '@finos/legend-graph';
import type { PlainObject } from '@finos/legend-shared';
import { action } from 'mobx';
import type { GraphQLConnection } from '../../graph/metamodel/pure/model/packageableElements/store/graphQL/connection/STO_GraphQL_GraphQLConnection.js';
import type { GraphQLStore } from '../../graph/metamodel/pure/model/packageableElements/store/graphQL/model/STO_GraphQL_GraphQLStore.js';

export const graphQL_connection_setStore = action(
  (
    con: GraphQLConnection,
    val: PackageableElementReference<GraphQLStore>,
  ): void => {
    con.store = observe_PackageableElementReference(val);
  },
);

export const graphQL_connection_setUrl = action(
  (con: GraphQLConnection, url: string): void => {
    con.url = url;
  },
);

export const graphQL_store_setSchema = action(
  (store: GraphQLStore, schema: PlainObject<unknown>): void => {
    store.schema = schema;
  },
);
