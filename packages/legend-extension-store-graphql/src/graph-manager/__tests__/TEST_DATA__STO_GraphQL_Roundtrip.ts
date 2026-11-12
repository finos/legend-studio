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

export const roundtripTestData = [
  {
    path: 'test::A',
    content: {
      _type: 'class',
      name: 'A',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'z',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'anything::GraphQLStore1',
    content: {
      _type: 'graphQLStore',
      includedStores: [],
      name: 'GraphQLStore1',
      package: 'anything',
      schema: {
        sdl: 'type Query { field: String }',
      },
    },
    classifierPath:
      'meta::external::store::graphQL::metamodel::pure::GraphQLStore',
  },
  {
    // a store with no schema yet, e.g. an empty scaffold before introspection: it must be written
    // back without a schema, since an empty object is not a valid engine Document (it has no _type)
    path: 'anything::EmptyGraphQLStore',
    content: {
      _type: 'graphQLStore',
      includedStores: [],
      name: 'EmptyGraphQLStore',
      package: 'anything',
    },
    classifierPath:
      'meta::external::store::graphQL::metamodel::pure::GraphQLStore',
  },
  {
    path: 'anything::mapping',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'graphQLClassMapping',
          bindingPath: 'anything::binding1',
          class: 'test::A',
          joinAccessorQualifiedProperty: 'someProperty',
          root: true,
          storePath: 'anything::GraphQLStore1',
          typeName: 'Query',
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'mapping',
      package: 'anything',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'anything::gqlConn',
    content: {
      _type: 'connection',
      name: 'gqlConn',
      package: 'anything',
      connectionValue: {
        _type: 'graphQLConnection',
        authenticationSpecification: {
          _type: 'oneGS',
        },
        element: 'anything::GraphQLStore1',
        url: 'http://localhost:9000/graphql',
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
  {
    path: 'anything::gqlConnNoAuth',
    content: {
      _type: 'connection',
      name: 'gqlConnNoAuth',
      package: 'anything',
      connectionValue: {
        _type: 'graphQLConnection',
        element: 'anything::GraphQLStore1',
        url: 'http://localhost:9000/graphql',
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
];
