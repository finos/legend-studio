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

// References to resolve in Runtime
// - ConnectionPointer
// - EngineRuntime mapping
// - EngineRuntime store
export const TEST_DATA__RuntimeRoundtrip = [
  {
    path: 'test::tClass',
    content: {
      _type: 'class',
      name: 'tClass',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
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
    path: 'test::tMapping',
    content: {
      _type: 'mapping',
      classMappings: [],
      enumerationMappings: [],
      includedMappings: [],
      name: 'tMapping',
      package: 'test',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'test::tConnection',
    content: {
      _type: 'connection',
      connectionValue: {
        _type: 'JsonModelConnection',
        class: 'test::tClass',
        url: 'my_url',
      },
      name: 'tConnection',
      package: 'test',
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
  {
    path: 'test::tRuntime',
    content: {
      _type: 'runtime',
      name: 'tRuntime',
      package: 'test',
      runtimeValue: {
        _type: 'engineRuntime',
        connectionStores: [],
        connections: [
          {
            store: {
              path: 'ModelStore',
              type: 'STORE',
            },
            storeConnections: [
              {
                connection: {
                  _type: 'connectionPointer',
                  connection: 'tConnection',
                },
                id: 'id3',
              },
              {
                connection: {
                  _type: 'JsonModelConnection',
                  class: 'tClass',
                  url: 'my_url',
                },
                id: 'id4',
              },
            ],
          },
        ],
        mappings: [
          {
            path: 'tMapping',
            type: 'MAPPING',
          },
        ],
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
  },
  {
    path: '__internal__::SectionIndex',
    content: {
      _type: 'sectionIndex',
      name: 'SectionIndex',
      package: '__internal__',
      sections: [
        {
          _type: 'importAware',
          imports: [],
          elements: ['test::tClass'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: [],
          elements: ['test::tMapping'],
          parserName: 'Mapping',
        },
        {
          _type: 'importAware',
          imports: [],
          elements: ['test::tConnection'],
          parserName: 'Connection',
        },
        {
          _type: 'importAware',
          imports: ['test'],
          elements: ['test::tRuntime'],
          parserName: 'Runtime',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];
