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

import { usingConstantValueSchema } from '@finos/legend-shared';
import {
  type ModelSchema,
  createModelSchema,
  primitive,
  optional,
  list,
  alias,
  raw,
} from 'serializr';
import { V1_GraphQLStore } from '../../model/packageableElements/store/graphQL/model/V1_STO_GraphQL_GraphQLStore.js';
import { V1_GraphQLConnection } from '../../model/packageableElements/store/graphQL/connection/V1_STO_GraphQL_GraphQLConnection.js';
import { V1_RootGraphQLClassMapping } from '../../model/packageableElements/store/graphQL/mapping/V1_STO_GraphQL_RootGraphQLClassMapping.js';

export const V1_GRAPHQL_STORE_ELEMENT_PROTOCOL_TYPE = 'graphQLStore';
export const V1_GRAPHQL_STORE_MAPPING_PROTOCOL_TYPE = 'graphQLClassMapping';
export const V1_GRAPHQL_STORE_CONNECTION_PROTOCOL_TYPE = 'graphQLConnection';

export const V1_graphQLStoreModelSchema: ModelSchema<V1_GraphQLStore> =
  createModelSchema(V1_GraphQLStore, {
    _type: usingConstantValueSchema(V1_GRAPHQL_STORE_ELEMENT_PROTOCOL_TYPE),
    includedStores: list(primitive()),
    name: primitive(),
    package: primitive(),
    schema: optional(raw()),
  });

export const V1_rootGraphQLClassMappingModelSchema: ModelSchema<V1_RootGraphQLClassMapping> =
  createModelSchema(V1_RootGraphQLClassMapping, {
    _type: usingConstantValueSchema(V1_GRAPHQL_STORE_MAPPING_PROTOCOL_TYPE),
    bindingPath: primitive(),
    class: primitive(),
    id: optional(primitive()),
    joinAccessorQualifiedProperty: optional(primitive()),
    root: primitive(),
    storePath: primitive(),
    typeName: primitive(),
  });

export const V1_graphQLConnectionModelSchema: ModelSchema<V1_GraphQLConnection> =
  createModelSchema(V1_GraphQLConnection, {
    _type: usingConstantValueSchema(V1_GRAPHQL_STORE_CONNECTION_PROTOCOL_TYPE),
    authenticationSpecification: optional(raw()),
    store: alias('element', optional(primitive())),
    name: primitive(),
    package: primitive(),
    url: primitive(),
  });
