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

// References to resolve in Service
// - Execution - MappingPointer
// - Execution - RuntimePointer
export const testServiceRoundtrip = [
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
          type: 'String',
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
    path: 'test::pure::tService_Single',
    content: {
      _type: 'service',
      autoActivateUpdates: true,
      documentation: 'this is just for context',
      execution: {
        _type: 'pureSingleExecution',
        func: {
          _type: 'lambda',
          body: [
            {
              _type: 'property',
              parameters: [
                {
                  _type: 'var',
                  name: 'src',
                  sourceInformation: {
                    endColumn: 30,
                    endLine: 38,
                    sourceId: '',
                    startColumn: 27,
                    startLine: 38,
                  },
                },
              ],
              property: 'name',
              sourceInformation: {
                endColumn: 35,
                endLine: 38,
                sourceId: '',
                startColumn: 32,
                startLine: 38,
              },
            },
          ],
          parameters: [
            {
              _type: 'var',
              class: 'tClass',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'src',
              sourceInformation: {
                endColumn: 22,
                endLine: 38,
                sourceId: '',
                startColumn: 17,
                startLine: 38,
              },
            },
          ],
        },
        mapping: 'tMapping',
        runtime: {
          _type: 'runtimePointer',
          runtime: 'tRuntime',
        },
      },
      name: 'tService_Single',
      owners: [],
      package: 'test::pure',
      pattern: 'url/myUrl/',
      test: {
        _type: 'singleExecutionTest',
        asserts: [
          {
            assert: {
              _type: 'lambda',
              body: [
                {
                  _type: 'func',
                  function: 'equal',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'res',
                          sourceInformation: {
                            endColumn: 31,
                            endLine: 47,
                            sourceId: '',
                            startColumn: 28,
                            startLine: 47,
                          },
                        },
                      ],
                      property: 'name',
                      sourceInformation: {
                        endColumn: 36,
                        endLine: 47,
                        sourceId: '',
                        startColumn: 33,
                        startLine: 47,
                      },
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 43,
                        endLine: 47,
                        sourceId: '',
                        startColumn: 41,
                        startLine: 47,
                      },
                      values: ['1'],
                    },
                  ],
                  sourceInformation: {
                    endColumn: 39,
                    endLine: 47,
                    sourceId: '',
                    startColumn: 38,
                    startLine: 47,
                  },
                },
              ],
              parameters: [
                {
                  _type: 'var',
                  class: 'tClass',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  name: 'res',
                  sourceInformation: {
                    endColumn: 23,
                    endLine: 47,
                    sourceId: '',
                    startColumn: 18,
                    startLine: 47,
                  },
                },
              ],
            },
          },
        ],
        data: 'moreThanData',
      },
    },
    classifierPath: 'meta::legend::service::metamodel::Service',
  },
  {
    path: 'test::pure::tService_Multi',
    content: {
      _type: 'service',
      autoActivateUpdates: true,
      documentation: 'this is just for context',
      execution: {
        _type: 'pureMultiExecution',
        executionKey: 'env',
        func: {
          _type: 'lambda',
          body: [
            {
              _type: 'property',
              parameters: [
                {
                  _type: 'var',
                  name: 'src',
                  sourceInformation: {
                    endColumn: 30,
                    endLine: 60,
                    sourceId: '',
                    startColumn: 27,
                    startLine: 60,
                  },
                },
              ],
              property: 'name',
              sourceInformation: {
                endColumn: 35,
                endLine: 60,
                sourceId: '',
                startColumn: 32,
                startLine: 60,
              },
            },
          ],
          parameters: [
            {
              _type: 'var',
              class: 'tClass',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'src',
              sourceInformation: {
                endColumn: 22,
                endLine: 60,
                sourceId: '',
                startColumn: 17,
                startLine: 60,
              },
            },
          ],
        },
        executionParameters: [
          {
            key: 'QA',
            mapping: 'tMapping',
            runtime: {
              _type: 'runtimePointer',
              runtime: 'tRuntime',
            },
          },
        ],
      },
      name: 'tService_Multi',
      owners: [],
      package: 'test::pure',
      pattern: 'url/myUrl/',
      test: {
        _type: 'multiExecutionTest',
        tests: [
          {
            asserts: [
              {
                assert: {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'equal',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'res',
                              sourceInformation: {
                                endColumn: 31,
                                endLine: 75,
                                sourceId: '',
                                startColumn: 28,
                                startLine: 75,
                              },
                            },
                          ],
                          property: 'name',
                          sourceInformation: {
                            endColumn: 36,
                            endLine: 75,
                            sourceId: '',
                            startColumn: 33,
                            startLine: 75,
                          },
                        },
                        {
                          _type: 'string',
                          multiplicity: {
                            lowerBound: 1,
                            upperBound: 1,
                          },
                          sourceInformation: {
                            endColumn: 43,
                            endLine: 75,
                            sourceId: '',
                            startColumn: 41,
                            startLine: 75,
                          },
                          values: ['1'],
                        },
                      ],
                      sourceInformation: {
                        endColumn: 39,
                        endLine: 75,
                        sourceId: '',
                        startColumn: 38,
                        startLine: 75,
                      },
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      class: 'tClass',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      name: 'res',
                      sourceInformation: {
                        endColumn: 23,
                        endLine: 75,
                        sourceId: '',
                        startColumn: 18,
                        startLine: 75,
                      },
                    },
                  ],
                },
              },
            ],
            data: 'moreData',
            key: 'QA',
          },
        ],
      },
    },
    classifierPath: 'meta::legend::service::metamodel::Service',
  },
  {
    path: 'test::pure::tService_SingleWithEmbeddedRuntime',
    content: {
      _type: 'service',
      autoActivateUpdates: true,
      documentation: 'this is just for context',
      execution: {
        _type: 'pureSingleExecution',
        func: {
          _type: 'lambda',
          body: [
            {
              _type: 'property',
              parameters: [
                {
                  _type: 'var',
                  name: 'src',
                  sourceInformation: {
                    endColumn: 30,
                    endLine: 88,
                    sourceId: '',
                    startColumn: 27,
                    startLine: 88,
                  },
                },
              ],
              property: 'name',
              sourceInformation: {
                endColumn: 35,
                endLine: 88,
                sourceId: '',
                startColumn: 32,
                startLine: 88,
              },
            },
          ],
          parameters: [
            {
              _type: 'var',
              class: 'tClass',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'src',
              sourceInformation: {
                endColumn: 22,
                endLine: 88,
                sourceId: '',
                startColumn: 17,
                startLine: 88,
              },
            },
          ],
        },
        mapping: 'tMapping',
        runtime: {
          _type: 'engineRuntime',
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
                    connection: 'myConnection',
                  },
                  id: 'id1',
                },
                {
                  connection: {
                    _type: 'JsonModelConnection',
                    class: 'tClass',
                    url: 'my_url',
                  },
                  id: 'id3',
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
      name: 'tService_SingleWithEmbeddedRuntime',
      owners: [],
      package: 'test::pure',
      pattern: 'url/myUrl/',
      test: {
        _type: 'singleExecutionTest',
        asserts: [],
        data: 'moreThanData',
      },
    },
    classifierPath: 'meta::legend::service::metamodel::Service',
  },
  {
    path: 'test::myConnection',
    content: {
      _type: 'connection',
      connectionValue: {
        _type: 'JsonModelConnection',
        class: 'test::tClass',
        url: 'dummy',
      },
      name: 'myConnection',
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
        connections: [],
        mappings: [
          {
            path: 'test::tMapping',
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
          elements: ['test::myConnection'],
          parserName: 'Connection',
        },
        {
          _type: 'importAware',
          imports: [],
          elements: ['test::tRuntime'],
          parserName: 'Runtime',
        },
        {
          _type: 'importAware',
          imports: ['test'],
          elements: [
            'test::pure::tService_Single',
            'test::pure::tService_Multi',
            'test::pure::tService_SingleWithEmbeddedRuntime',
          ],
          parserName: 'Service',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];
