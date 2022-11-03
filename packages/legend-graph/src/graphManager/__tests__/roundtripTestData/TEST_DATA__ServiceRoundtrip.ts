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
export const TEST_DATA__ServiceRoundtrip = [
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
    path: 'my::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'my',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'givenNames',
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
    path: 'my::map',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'pureInstance',
          class: 'my::Person',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                propertyOwner: 'my::Person',
                property: 'givenNames',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'string',
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    values: ['name'],
                  },
                ],
                parameters: [],
              },
            },
          ],
          root: true,
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'map',
      package: 'my',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'test::pure::tService_Single',
    content: {
      _type: 'service',
      stereotypes: [
        {
          profile: 'meta::pure::profiles::typemodifiers',
          value: 'abstract',
        },
      ],
      taggedValues: [
        {
          tag: {
            profile: 'meta::pure::profiles::doc',
            value: 'doc',
          },
          value: 'something',
        },
      ],
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
                },
              ],
              property: 'name',
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
                        },
                      ],
                      property: 'name',
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      values: ['1'],
                    },
                  ],
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
                },
              ],
              property: 'name',
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
                            },
                          ],
                          property: 'name',
                        },
                        {
                          _type: 'string',
                          multiplicity: {
                            lowerBound: 1,
                            upperBound: 1,
                          },
                          values: ['1'],
                        },
                      ],
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
                },
              ],
              property: 'name',
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
    path: 'my::serviceWithEmptyTestSuite',
    content: {
      _type: 'service',
      autoActivateUpdates: true,
      documentation: '',
      execution: {
        _type: 'pureSingleExecution',
        func: {
          _type: 'lambda',
          body: [
            {
              _type: 'func',
              function: 'project',
              parameters: [
                {
                  _type: 'func',
                  function: 'getAll',
                  parameters: [
                    {
                      _type: 'packageableElementPtr',
                      fullPath: 'my::Person',
                    },
                  ],
                },
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  values: [
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
                            },
                          ],
                          property: 'givenNames',
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  values: [
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      values: ['Given Names'],
                    },
                  ],
                },
              ],
            },
          ],
          parameters: [],
        },
        mapping: 'my::map',
        runtime: {
          _type: 'engineRuntime',
          connections: [],
          mappings: [
            {
              path: 'my::map',
              type: 'MAPPING',
            },
          ],
        },
      },
      name: 'serviceWithEmptyTestSuite',
      owners: [],
      package: 'my',
      pattern: '/e2a5e5a9-aac2-49c6-a539-fcdd61f69e9d',
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
    path: 'my::serviceWithTestSuite',
    content: {
      _type: 'service',
      autoActivateUpdates: true,
      documentation: '',
      execution: {
        _type: 'pureSingleExecution',
        func: {
          _type: 'lambda',
          body: [
            {
              _type: 'func',
              function: 'project',
              parameters: [
                {
                  _type: 'func',
                  function: 'getAll',
                  parameters: [
                    {
                      _type: 'packageableElementPtr',
                      fullPath: 'my::Person',
                    },
                  ],
                },
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  values: [
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
                            },
                          ],
                          property: 'givenNames',
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  values: [
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      values: ['Given Names'],
                    },
                  ],
                },
              ],
            },
          ],
          parameters: [],
        },
        mapping: 'my::map',
        runtime: {
          _type: 'engineRuntime',
          connections: [],
          mappings: [
            {
              path: 'my::map',
              type: 'MAPPING',
            },
          ],
        },
      },
      name: 'serviceWithTestSuite',
      owners: [],
      package: 'my',
      pattern: '/e2a5e5a9-aac2-49c6-a539-fcdd61f69e9d',
      testSuites: [
        {
          _type: 'serviceTestSuite',
          id: 'testSuite1',
          testData: {
            connectionsTestData: [
              {
                data: {
                  _type: 'externalFormat',
                  contentType: 'application/json',
                  data: '[{"employees":[{"firstName":"firstName 36","lastName":"lastName 77"}],"legalName":"legalName 19"}, {"employees":[{"firstName":"firstName 37","lastName":"lastName 78"}],"legalName":"legalName 20"}]',
                },
                id: 'connection1',
              },
            ],
          },
          tests: [
            {
              _type: 'serviceTest',
              assertions: [
                {
                  _type: 'equalToJson',
                  expected: {
                    _type: 'externalFormat',
                    contentType: 'application/json',
                    data: '{"employees":[{"firstName":"firstName 36","lastName":"lastName 77"}],"legalName":"legalName 19"}',
                  },
                  id: 'assert1',
                },
              ],
              id: 'test1',
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::legend::service::metamodel::Service',
  },
  {
    path: 'my::serviceWithTestSuiteWithMultipleTests',
    content: {
      _type: 'service',
      autoActivateUpdates: true,
      documentation: '',
      execution: {
        _type: 'pureSingleExecution',
        func: {
          _type: 'lambda',
          body: [
            {
              _type: 'func',
              function: 'project',
              parameters: [
                {
                  _type: 'func',
                  function: 'getAll',
                  parameters: [
                    {
                      _type: 'packageableElementPtr',
                      fullPath: 'my::Person',
                    },
                  ],
                },
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  values: [
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
                            },
                          ],
                          property: 'givenNames',
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  values: [
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      values: ['Given Names'],
                    },
                  ],
                },
              ],
            },
          ],
          parameters: [],
        },
        mapping: 'my::map',
        runtime: {
          _type: 'engineRuntime',
          connections: [],
          mappings: [
            {
              path: 'my::map',
              type: 'MAPPING',
            },
          ],
        },
      },
      name: 'serviceWithTestSuiteWithMultipleTests',
      owners: [],
      package: 'my',
      pattern: '/e2a5e5a9-aac2-49c6-a539-fcdd61f69e9d',
      testSuites: [
        {
          _type: 'serviceTestSuite',
          id: 'testSuite1',
          testData: {
            connectionsTestData: [
              {
                data: {
                  _type: 'externalFormat',
                  contentType: 'application/json',
                  data: '[{"employees":[{"firstName":"firstName 36","lastName":"lastName 77"}],"legalName":"legalName 19"}, {"employees":[{"firstName":"firstName 37","lastName":"lastName 78"}],"legalName":"legalName 20"}]',
                },
                id: 'connection1',
              },
            ],
          },
          tests: [
            {
              _type: 'serviceTest',
              assertions: [
                {
                  _type: 'equalToJson',
                  expected: {
                    _type: 'externalFormat',
                    contentType: 'application/json',
                    data: '{"employees":[{"firstName":"firstName 36","lastName":"lastName 77"}],"legalName":"legalName 19"}',
                  },
                  id: 'assert1',
                },
              ],
              id: 'test1',
            },
            {
              _type: 'serviceTest',
              assertions: [
                {
                  _type: 'equalToJson',
                  expected: {
                    _type: 'externalFormat',
                    contentType: 'application/json',
                    data: 'data',
                  },
                  id: 'assert1',
                },
              ],
              id: 'test2',
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::legend::service::metamodel::Service',
  },
  {
    path: 'my::serviceWithMultipleConnectionsData',
    content: {
      _type: 'service',
      autoActivateUpdates: true,
      documentation: '',
      execution: {
        _type: 'pureSingleExecution',
        func: {
          _type: 'lambda',
          body: [
            {
              _type: 'func',
              function: 'project',
              parameters: [
                {
                  _type: 'func',
                  function: 'getAll',
                  parameters: [
                    {
                      _type: 'packageableElementPtr',
                      fullPath: 'my::Person',
                    },
                  ],
                },
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  values: [
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
                            },
                          ],
                          property: 'givenNames',
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  values: [
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      values: ['Given Names'],
                    },
                  ],
                },
              ],
            },
          ],
          parameters: [],
        },
        mapping: 'my::map',
        runtime: {
          _type: 'engineRuntime',
          connections: [],
          mappings: [
            {
              path: 'my::map',
              type: 'MAPPING',
            },
          ],
        },
      },
      name: 'serviceWithMultipleConnectionsData',
      owners: [],
      package: 'my',
      pattern: '/e2a5e5a9-aac2-49c6-a539-fcdd61f69e9d',
      testSuites: [
        {
          _type: 'serviceTestSuite',
          id: 'testSuite1',
          testData: {
            connectionsTestData: [
              {
                data: {
                  _type: 'modelStore',
                  instances: {
                    'my::Person': {
                      _type: 'collection',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      values: [
                        {
                          _type: 'func',
                          function: 'new',
                          parameters: [
                            {
                              _type: 'packageableElementPtr',
                              fullPath: 'my::Person',
                            },
                            {
                              _type: 'string',
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                              values: ['dummy'],
                            },
                            {
                              _type: 'collection',
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                              values: [
                                {
                                  _type: 'keyExpression',
                                  add: false,
                                  expression: {
                                    _type: 'collection',
                                    multiplicity: {
                                      lowerBound: 2,
                                      upperBound: 2,
                                    },
                                    values: [
                                      {
                                        _type: 'string',
                                        multiplicity: {
                                          lowerBound: 1,
                                          upperBound: 1,
                                        },
                                        values: ['Fred'],
                                      },
                                      {
                                        _type: 'string',
                                        multiplicity: {
                                          lowerBound: 1,
                                          upperBound: 1,
                                        },
                                        values: ['William'],
                                      },
                                    ],
                                  },
                                  key: {
                                    _type: 'string',
                                    multiplicity: {
                                      lowerBound: 1,
                                      upperBound: 1,
                                    },
                                    values: ['givenNames'],
                                  },
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
                id: 'connection1',
              },
              {
                data: {
                  _type: 'externalFormat',
                  contentType: 'application/json',
                  data: '[{"employees":[{"firstName":"firstName 36","lastName":"lastName 77"}],"legalName":"legalName 19"}, {"employees":[{"firstName":"firstName 37","lastName":"lastName 78"}],"legalName":"legalName 20"}]',
                },
                id: 'connection2',
              },
            ],
          },
          tests: [
            {
              _type: 'serviceTest',
              assertions: [
                {
                  _type: 'equalToJson',
                  expected: {
                    _type: 'externalFormat',
                    contentType: 'application/json',
                    data: '{"employees":[{"firstName":"firstName 36","lastName":"lastName 77"}],"legalName":"legalName 19"}',
                  },
                  id: 'assert1',
                },
              ],
              id: 'test1',
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::legend::service::metamodel::Service',
  },
  {
    path: 'my::serviceWithTestSuiteWithParams',
    content: {
      _type: 'service',
      autoActivateUpdates: true,
      documentation: '',
      execution: {
        _type: 'pureSingleExecution',
        func: {
          _type: 'lambda',
          body: [
            {
              _type: 'func',
              function: 'project',
              parameters: [
                {
                  _type: 'func',
                  function: 'getAll',
                  parameters: [
                    {
                      _type: 'packageableElementPtr',
                      fullPath: 'my::Person',
                    },
                  ],
                },
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  values: [
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
                            },
                          ],
                          property: 'givenNames',
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  values: [
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      values: ['Given Names'],
                    },
                  ],
                },
              ],
            },
          ],
          parameters: [],
        },
        mapping: 'my::map',
        runtime: {
          _type: 'engineRuntime',
          connections: [],
          mappings: [
            {
              path: 'my::map',
              type: 'MAPPING',
            },
          ],
        },
      },
      name: 'serviceWithTestSuiteWithParams',
      owners: [],
      package: 'my',
      pattern: '/e2a5e5a9-aac2-49c6-a539-fcdd61f69e9d',
      testSuites: [
        {
          _type: 'serviceTestSuite',
          id: 'testSuite1',
          testData: {
            connectionsTestData: [
              {
                data: {
                  _type: 'externalFormat',
                  contentType: 'application/json',
                  data: '[{"employees":[{"firstName":"firstName 36","lastName":"lastName 77"}],"legalName":"legalName 19"}, {"employees":[{"firstName":"firstName 37","lastName":"lastName 78"}],"legalName":"legalName 20"}]',
                },
                id: 'connection1',
              },
            ],
          },
          tests: [
            {
              _type: 'serviceTest',
              assertions: [
                {
                  _type: 'equalToJson',
                  expected: {
                    _type: 'externalFormat',
                    contentType: 'application/json',
                    data: '{"employees":[{"firstName":"firstName 36","lastName":"lastName 77"}],"legalName":"legalName 19"}',
                  },
                  id: 'assert1',
                },
              ],
              id: 'test1',
              parameters: [
                {
                  name: 'stringParam',
                  value: {
                    _type: 'string',
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    values: ['dummy'],
                  },
                },
                {
                  name: 'stringOptionalParam',
                  value: {
                    _type: 'string',
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    values: ['dummy'],
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::legend::service::metamodel::Service',
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
