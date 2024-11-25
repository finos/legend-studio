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
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
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
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
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
                class: 'my::Person',
                property: 'givenNames',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'string',
                    value: 'name',
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
                      value: 'Given Names',
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
          connectionStores: [],
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
              keys: [],
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
              keys: [],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::legend::service::metamodel::Service',
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
                      value: 'Given Names',
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
          connectionStores: [],
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
              keys: [],
            },
          ],
        },
      ],
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
                      value: 'Given Names',
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
          connectionStores: [],
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
                },
              ],
              property: 'name',
            },
          ],
          parameters: [
            {
              _type: 'var',
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'test::tClass',
                },
                typeArguments: [],
                typeVariableValues: [],
              },
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'src',
            },
          ],
        },
        mapping: 'test::tMapping',
        runtime: {
          _type: 'runtimePointer',
          runtime: 'test::tRuntime',
        },
      },
      name: 'tService_Single',
      owners: [],
      package: 'test::pure',
      pattern: 'url/myUrl/',
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
                      value: '1',
                    },
                  ],
                },
              ],
              parameters: [
                {
                  _type: 'var',
                  genericType: {
                    rawType: {
                      _type: 'packageableType',
                      fullPath: 'test::tClass',
                    },
                    typeArguments: [],
                    typeVariableValues: [],
                  },
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
    path: 'test::pure::serviceWithByteParam',
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
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'Byte',
                },
                typeArguments: [],
                typeVariableValues: [],
              },
              multiplicity: {
                lowerBound: 0,
              },
              name: 'src',
            },
          ],
        },
        mapping: 'test::tMapping',
        runtime: {
          _type: 'runtimePointer',
          runtime: 'test::tRuntime',
        },
      },
      name: 'serviceWithByteParam',
      owners: [],
      package: 'test::pure',
      pattern: 'url/myUrl/',
      taggedValues: [
        {
          tag: {
            profile: 'meta::pure::profiles::doc',
            value: 'doc',
          },
          value: 'something',
        },
      ],
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
        executionParameters: [
          {
            key: 'QA',
            mapping: 'test::tMapping',
            runtime: {
              _type: 'runtimePointer',
              runtime: 'test::tRuntime',
            },
          },
        ],
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
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'est::tClass',
                },
                typeArguments: [],
                typeVariableValues: [],
              },
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'src',
            },
          ],
        },
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
                          value: '1',
                        },
                      ],
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      genericType: {
                        rawType: {
                          _type: 'packageableType',
                          fullPath: 'est::tClass',
                        },
                        typeArguments: [],
                        typeVariableValues: [],
                      },
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
                      value: 'Given Names',
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
          connectionStores: [],
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
              keys: [],
              parameters: [
                {
                  name: 'stringParam',
                  value: {
                    _type: 'string',
                    value: 'dummy',
                  },
                },
                {
                  name: 'stringOptionalParam',
                  value: {
                    _type: 'string',
                    value: 'dummy',
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
                      value: 'Given Names',
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
          connectionStores: [],
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
                  modelData: [
                    {
                      _type: 'modelInstanceData',
                      model: 'my::Person',
                      instances: [
                        {
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
                                  value: 'dummy',
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
                                            value: 'Fred',
                                          },
                                          {
                                            _type: 'string',
                                            value: 'William',
                                          },
                                        ],
                                      },
                                      key: {
                                        _type: 'string',
                                        value: 'givenNames',
                                      },
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
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
              keys: [],
            },
          ],
        },
      ],
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
              genericType: {
                rawType: {
                  _type: 'packageableType',
                  fullPath: 'est::tClass',
                },
                typeArguments: [],
                typeVariableValues: [],
              },
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'src',
            },
          ],
        },
        mapping: 'test::tMapping',
        runtime: {
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
                    connection: 'test::myConnection',
                  },
                  id: 'id1',
                },
                {
                  connection: {
                    _type: 'JsonModelConnection',
                    class: 'test::tClass',
                    url: 'my_url',
                  },
                  id: 'id3',
                },
              ],
            },
          ],
          mappings: [
            {
              path: 'test::tMapping',
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
    path: 'test::tRuntime',
    content: {
      _type: 'runtime',
      name: 'tRuntime',
      package: 'test',
      runtimeValue: {
        _type: 'engineRuntime',
        connectionStores: [],
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
    path: 'test::myConnection',
    content: {
      _type: 'connection',
      connectionValue: {
        _type: 'JsonModelConnection',
        class: 'test::tClass',
        element: 'ModelStore',
        url: 'dummy',
      },
      name: 'myConnection',
      package: 'test',
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
];

export const TEST_DATA__SERVICE_WITH_ONLY_QUERY_Roundtrip = [
  {
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
    content: {
      _type: 'Enumeration',
      name: 'EmployeeType',
      package: 'model',
      values: [
        {
          value: 'CONTRACT',
        },
        {
          value: 'FULL_TIME',
        },
      ],
    },
    path: 'model::EmployeeType',
  },
  {
    classifierPath: 'meta::pure::metamodel::type::Class',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'model',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'firstName',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'lastName',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'employeeType',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'model::EmployeeType',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
      ],
    },
    path: 'model::Person',
  },
  {
    classifierPath: 'meta::pure::metamodel::type::Class',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'model',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'legalName',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'employees',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'model::Person',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
      ],
    },
    path: 'model::Firm',
  },
  {
    classifierPath: 'meta::relational::metamodel::Database',
    content: {
      _type: 'relational',
      filters: [],
      includedStores: [],
      joins: [
        {
          name: 'FirmPerson',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'firm_id',
                table: {
                  _type: 'Table',
                  database: 'store::TestDB',
                  mainTableDb: 'store::TestDB',
                  schema: 'default',
                  table: 'PersonTable',
                },
                tableAlias: 'PersonTable',
              },
              {
                _type: 'column',
                column: 'id',
                table: {
                  _type: 'Table',
                  database: 'store::TestDB',
                  mainTableDb: 'store::TestDB',
                  schema: 'default',
                  table: 'FirmTable',
                },
                tableAlias: 'FirmTable',
              },
            ],
          },
        },
      ],
      name: 'TestDB',
      package: 'store',
      schemas: [
        {
          name: 'default',
          tables: [
            {
              columns: [
                {
                  name: 'id',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'legal_name',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'FirmTable',
              primaryKey: ['id'],
            },
            {
              columns: [
                {
                  name: 'id',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'firm_id',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'firstName',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'lastName',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'employeeType',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'PersonTable',
              primaryKey: ['id'],
            },
          ],
          views: [],
        },
      ],
    },
    path: 'store::TestDB',
  },
  {
    classifierPath: 'meta::pure::mapping::Mapping',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'relational',
          class: 'model::Person',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'store::TestDB',
            mainTableDb: 'store::TestDB',
            schema: 'default',
            table: 'PersonTable',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'id',
              table: {
                _type: 'Table',
                database: 'store::TestDB',
                mainTableDb: 'store::TestDB',
                schema: 'default',
                table: 'PersonTable',
              },
              tableAlias: 'PersonTable',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'model::Person',
                property: 'firstName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'firstName',
                table: {
                  _type: 'Table',
                  database: 'store::TestDB',
                  mainTableDb: 'store::TestDB',
                  schema: 'default',
                  table: 'PersonTable',
                },
                tableAlias: 'PersonTable',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'model::Person',
                property: 'lastName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'lastName',
                table: {
                  _type: 'Table',
                  database: 'store::TestDB',
                  mainTableDb: 'store::TestDB',
                  schema: 'default',
                  table: 'PersonTable',
                },
                tableAlias: 'PersonTable',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              enumMappingId: 'EmployeeTypeMapping',
              property: {
                class: 'model::Person',
                property: 'employeeType',
              },
              relationalOperation: {
                _type: 'column',
                column: 'employeeType',
                table: {
                  _type: 'Table',
                  database: 'store::TestDB',
                  mainTableDb: 'store::TestDB',
                  schema: 'default',
                  table: 'PersonTable',
                },
                tableAlias: 'PersonTable',
              },
            },
          ],
          root: true,
        },
        {
          _type: 'relational',
          class: 'model::Firm',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'store::TestDB',
            mainTableDb: 'store::TestDB',
            schema: 'default',
            table: 'FirmTable',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'id',
              table: {
                _type: 'Table',
                database: 'store::TestDB',
                mainTableDb: 'store::TestDB',
                schema: 'default',
                table: 'FirmTable',
              },
              tableAlias: 'FirmTable',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'model::Firm',
                property: 'legalName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'legal_name',
                table: {
                  _type: 'Table',
                  database: 'store::TestDB',
                  mainTableDb: 'store::TestDB',
                  schema: 'default',
                  table: 'FirmTable',
                },
                tableAlias: 'FirmTable',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'model::Firm',
                property: 'employees',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'store::TestDB',
                    name: 'FirmPerson',
                  },
                ],
              },
              target: 'model_Person',
            },
          ],
          root: true,
        },
      ],
      enumerationMappings: [
        {
          enumValueMappings: [
            {
              enumValue: 'CONTRACT',
              sourceValues: [
                {
                  _type: 'stringSourceValue',
                  value: 'FTC',
                },
                {
                  _type: 'stringSourceValue',
                  value: 'FTO',
                },
              ],
            },
            {
              enumValue: 'FULL_TIME',
              sourceValues: [
                {
                  _type: 'stringSourceValue',
                  value: 'FTE',
                },
              ],
            },
          ],
          enumeration: 'model::EmployeeType',
          id: 'EmployeeTypeMapping',
        },
      ],
      includedMappings: [],
      name: 'RelationalMapping',
      package: 'execution',
      tests: [],
    },
    path: 'execution::RelationalMapping',
  },
  {
    classifierPath: 'meta::legend::service::metamodel::Service',
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
              function: 'from',
              parameters: [
                {
                  _type: 'func',
                  function: 'project',
                  parameters: [[Object], [Object], [Object]],
                },
                {
                  _type: 'packageableElementPtr',
                  fullPath: 'execution::RelationalMapping',
                },
                {
                  _type: 'packageableElementPtr',
                  fullPath: 'execution::Runtime',
                },
              ],
            },
          ],
          parameters: [],
        },
      },
      name: 'SimpleRelationalPassFailing',
      owners: [],
      package: 'service',
      pattern: '/d2c48a9c-70fa-46e3-8173-c355e774004f',
      testSuites: [
        {
          _type: 'serviceTestSuite',
          id: 'testSuite1',
          testData: {
            connectionsTestData: [
              {
                data: {
                  _type: 'reference',
                  dataElement: {
                    type: 'DATA',
                    path: 'data::RelationalData',
                  },
                },
                id: 'connection_1',
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
                    data: '[{"Employees/First Name":"John","Employees/Last Name":"Doe","Legal Name":"Finos"},{"Employees/First Name":"Nicole","Employees/Last Name":"Smith","Legal Name":"Finos"},{"Employees/First Name":"Time","Employees/Last Name":"Smith","Legal Name":"Apple"}]',
                  },
                  id: 'shouldPass',
                },
                {
                  _type: 'equalToJson',
                  expected: {
                    _type: 'externalFormat',
                    contentType: 'application/json',
                    data: '[{"Employees/First Name":"JohnDIFF","Employees/Last Name":"Doe","Legal Name":"Finos"},{"Employees/First Name":"Nicole","Employees/Last Name":"Smith","Legal Name":"Finos"},{"Employees/First Name":"Time","Employees/Last Name":"Smith","Legal Name":"Apple"}]',
                  },
                  id: 'shouldFail',
                },
              ],
              id: 'test1',
              keys: [],
              serializationFormat: 'PURE_TDSOBJECT',
            },
          ],
        },
      ],
    },
    path: 'service::SimpleRelationalPassFailing',
  },
  {
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
    content: {
      _type: 'runtime',
      name: 'Runtime',
      package: 'execution',
      runtimeValue: {
        _type: 'engineRuntime',
        connectionStores: [],
        connections: [
          {
            store: {
              path: 'store::TestDB',
              type: 'STORE',
            },
            storeConnections: [
              {
                connection: {
                  _type: 'connectionPointer',
                  connection: 'model::MyConnection',
                },
                id: 'connection_1',
              },
            ],
          },
        ],
        mappings: [
          {
            path: 'execution::RelationalMapping',
            type: 'MAPPING',
          },
        ],
      },
    },
    path: 'execution::Runtime',
  },
  {
    classifierPath: 'meta::pure::runtime::PackageableConnection',
    content: {
      _type: 'connection',
      connectionValue: {
        _type: 'RelationalDatabaseConnection',
        authenticationStrategy: {
          _type: 'h2Default',
        },
        databaseType: 'H2',
        datasourceSpecification: {
          _type: 'h2Local',
          testDataSetupSqls: [''],
        },
        element: 'store::TestDB',
        type: 'H2',
      },
      name: 'MyConnection',
      package: 'model',
    },
    path: 'model::MyConnection',
  },
  {
    classifierPath: 'meta::pure::data::DataElement',
    content: {
      _type: 'dataElement',
      data: {
        _type: 'relationalCSVData',
        tables: [
          {
            schema: 'default',
            table: 'PersonTable',
            values:
              'id,firm_id,firstName,lastName,employeeType\n1,1,John,Doe,FTO\n2,1,Nicole,Smith,FTC\n3,2,Time,Smith,FTE',
          },
          {
            schema: 'default',
            table: 'FirmTable',
            values: 'id,legal_name\n1,Finos\n2,Apple',
          },
        ],
      },
      name: 'RelationalData',
      package: 'data',
    },
    path: 'data::RelationalData',
  },
];
