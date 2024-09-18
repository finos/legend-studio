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
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'anything::schemaSet1',
    content: {
      _type: 'externalFormatSchemaSet',
      format: 'FlatData',
      name: 'schemaSet1',
      package: 'anything',
      schemas: [
        {
          content: 'test content',
          id: 'id1',
          location: 'location1',
        },
        {
          content: 'test content2',
          id: 'id2',
          location: 'location2',
        },
      ],
    },
    classifierPath: 'meta::external::format::shared::metamodel::SchemaSet',
  },
  {
    path: 'anything::binding1',
    content: {
      _type: 'binding',
      contentType: 'application/json',
      modelUnit: {
        packageableElementExcludes: [],
        packageableElementIncludes: [],
      },
      name: 'binding1',
      package: 'anything',
      schemaSet: 'anything::schemaSet1',
    },
    classifierPath: 'meta::external::format::shared::binding::Binding',
  },
  {
    path: 'anything::ServiceStore1',
    content: {
      _type: 'serviceStore',
      name: 'ServiceStore1',
      package: 'anything',
      elements: [
        {
          _type: 'service',
          id: 'TestService',
          method: 'GET',
          parameters: [
            {
              location: 'QUERY',
              name: 'serializationFormat',
              serializationFormat: {},
              type: {
                _type: 'string',
                list: false,
              },
            },
            {
              location: 'HEADER',
              name: 'headerParam',
              serializationFormat: {},
              type: {
                _type: 'string',
                list: false,
              },
            },
          ],
          path: '/testService',
          response: {
            _type: 'complex',
            binding: 'anything::binding1',
            list: false,
            type: 'test::A',
          },
          security: [],
        },
        {
          _type: 'service',
          id: 'TestServiceForPost',
          method: 'POST',
          parameters: [
            {
              location: 'QUERY',
              name: 'serializationFormat',
              serializationFormat: {},
              type: {
                _type: 'string',
                list: false,
              },
            },
          ],
          path: '/testServiceForPost',
          requestBody: {
            _type: 'complex',
            binding: 'anything::binding1',
            list: false,
            type: 'test::A',
          },
          response: {
            _type: 'complex',
            binding: 'anything::binding1',
            list: false,
            type: 'test::A',
          },
          security: [],
        },
      ],
      includedStores: [],
    },
    classifierPath: 'meta::external::store::service::metamodel::ServiceStore',
  },
  {
    path: 'anything::ServiceStore2',
    content: {
      _type: 'serviceStore',
      name: 'ServiceStore2',
      package: 'anything',
      elements: [
        {
          _type: 'serviceGroup',
          elements: [
            {
              _type: 'service',
              id: 'TestService1',
              method: 'GET',
              parameters: [
                {
                  location: 'QUERY',
                  name: 'param',
                  serializationFormat: {},
                  type: {
                    _type: 'string',
                    list: false,
                  },
                },
                {
                  location: 'QUERY',
                  name: 'param2',
                  serializationFormat: {},
                  type: {
                    _type: 'integer',
                    list: false,
                  },
                },
              ],
              path: '/testService1',
              response: {
                _type: 'complex',
                binding: 'anything::binding1',
                list: false,
                type: 'test::A',
              },
              security: [],
            },
            {
              _type: 'service',
              id: 'TestService2',
              method: 'GET',
              parameters: [
                {
                  location: 'QUERY',
                  name: 'param1',
                  serializationFormat: {},
                  type: {
                    _type: 'boolean',
                    list: false,
                  },
                },
              ],
              path: '/testService2',
              response: {
                _type: 'complex',
                binding: 'anything::binding1',
                list: false,
                type: 'test::A',
              },
              security: [],
            },
            {
              _type: 'service',
              id: 'TestService3',
              method: 'GET',
              parameters: [
                {
                  allowReserved: true,
                  location: 'QUERY',
                  name: 'param1',
                  required: false,
                  serializationFormat: {},
                  type: {
                    _type: 'boolean',
                    list: false,
                  },
                },
                {
                  allowReserved: false,
                  location: 'QUERY',
                  name: 'param2',
                  required: true,
                  serializationFormat: {},
                  type: {
                    _type: 'boolean',
                    list: false,
                  },
                },
              ],
              path: '/testService3',
              response: {
                _type: 'complex',
                binding: 'anything::binding1',
                list: false,
                type: 'test::A',
              },
              security: [],
            },
          ],
          id: 'TestServiceGroup',
          path: '/testServices',
        },
      ],
      includedStores: [],
    },
    classifierPath: 'meta::external::store::service::metamodel::ServiceStore',
  },
  {
    path: 'anything::mapping',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'serviceStore',
          class: 'test::A',
          localMappingProperties: [],
          root: 'true',
          servicesMapping: [
            {
              requestBuildInfo: {
                requestParametersBuildInfo: {
                  parameterBuildInfoList: [
                    {
                      serviceParameter: 'serializationFormat',
                      transform: {
                        _type: 'lambda',
                        body: [
                          {
                            _type: 'string',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            values: ['CSV'],
                          },
                        ],
                        parameters: [],
                      },
                    },
                  ],
                },
              },
              service: {
                service: 'TestService',
                serviceStore: 'anything::ServiceStore1',
              },
            },
            {
              requestBuildInfo: {
                requestParametersBuildInfo: {
                  parameterBuildInfoList: [
                    {
                      serviceParameter: 'serializationFormat',
                      transform: {
                        _type: 'lambda',
                        body: [
                          {
                            _type: 'string',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            values: ['CSV'],
                          },
                        ],
                        parameters: [],
                      },
                    },
                  ],
                },
              },
              pathOffset: {
                _type: 'path',
                path: [
                  {
                    _type: 'propertyPath',
                    parameters: [],
                    property: 'employees',
                  },
                ],
                startType: '$service.response',
              },
              service: {
                service: 'TestService',
                serviceStore: 'anything::ServiceStore1',
              },
            },
            {
              requestBuildInfo: {
                requestBodyBuildInfo: {
                  transform: {
                    _type: 'lambda',
                    body: [
                      {
                        _type: 'func',
                        function: 'new',
                        parameters: [
                          {
                            _type: 'packageableElementPtr',
                            fullPath: 'test::requestBody',
                          },
                          {
                            _type: 'string',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            values: [],
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
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'this',
                                    },
                                  ],
                                  property: 'prop',
                                },
                                key: {
                                  _type: 'string',
                                  multiplicity: {
                                    lowerBound: 1,
                                    upperBound: 1,
                                  },
                                  values: ['propA'],
                                },
                              },
                              {
                                _type: 'keyExpression',
                                add: false,
                                expression: {
                                  _type: 'integer',
                                  multiplicity: {
                                    lowerBound: 1,
                                    upperBound: 1,
                                  },
                                  values: [1],
                                },
                                key: {
                                  _type: 'string',
                                  multiplicity: {
                                    lowerBound: 1,
                                    upperBound: 1,
                                  },
                                  values: ['propB'],
                                },
                              },
                            ],
                          },
                        ],
                      },
                    ],
                    parameters: [],
                  },
                },
                requestParametersBuildInfo: {
                  parameterBuildInfoList: [
                    {
                      serviceParameter: 'serializationFormat',
                      transform: {
                        _type: 'lambda',
                        body: [
                          {
                            _type: 'string',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            values: ['CSV'],
                          },
                        ],
                        parameters: [],
                      },
                    },
                  ],
                },
              },
              pathOffset: {
                _type: 'path',
                path: [
                  {
                    _type: 'propertyPath',
                    parameters: [],
                    property: 'employees',
                  },
                ],
                startType: '$service.response',
              },
              service: {
                service: 'TestServiceForPost',
                serviceStore: 'anything::ServiceStore1',
              },
            },
          ],
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
    path: 'anything::tConn',
    content: {
      _type: 'connection',
      name: 'tConn',
      package: 'anything',
      connectionValue: {
        _type: 'serviceStore',
        baseUrl: 'test',
        element: 'anything::ServiceStore1',
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
  {
    path: 'my::MyDataWithBodyPatterns',
    content: {
      _type: 'dataElement',
      name: 'MyDataWithBodyPatterns',
      data: {
        _type: 'serviceStore',
        serviceStubMappings: [
          {
            requestPattern: {
              bodyPatterns: [
                {
                  _type: 'equalToJson',
                  expectedValue: '{\\"name\\": \\"FirstName A\\"}',
                },
              ],
              method: 'POST',
              url: '/employees',
            },
            responseDefinition: {
              body: {
                _type: 'externalFormat',
                contentType: 'application/json',
                data: 'data',
              },
            },
          },
        ],
      },
      package: 'my',
    },
    classifierPath: 'meta::pure::data::DataElement',
  },
  {
    path: 'my::MyDataWithHeaderParams',
    content: {
      _type: 'dataElement',
      name: 'MyDataWithHeaderParams',
      data: {
        _type: 'serviceStore',
        serviceStubMappings: [
          {
            requestPattern: {
              headerParams: {
                id: {
                  _type: 'equalTo',
                  expectedValue: '123',
                },
                name: {
                  _type: 'equalTo',
                  expectedValue: 'FirstName A',
                },
              },
              method: 'GET',
              url: '/employees',
            },
            responseDefinition: {
              body: {
                _type: 'externalFormat',
                contentType: 'application/json',
                data: 'data',
              },
            },
          },
        ],
      },
      package: 'my',
    },
    classifierPath: 'meta::pure::data::DataElement',
  },
  {
    path: 'my::MyDataWithMultipleStubMappings',
    content: {
      _type: 'dataElement',
      name: 'MyDataWithMultipleStubMappings',
      data: {
        _type: 'serviceStore',
        serviceStubMappings: [
          {
            requestPattern: {
              method: 'GET',
              url: '/employees',
            },
            responseDefinition: {
              body: {
                _type: 'externalFormat',
                contentType: 'application/json',
                data: 'data',
              },
            },
          },
          {
            requestPattern: {
              method: 'GET',
              url: '/employees',
            },
            responseDefinition: {
              body: {
                _type: 'externalFormat',
                contentType: 'application/json',
                data: 'data',
              },
            },
          },
        ],
      },
      package: 'my',
    },
    classifierPath: 'meta::pure::data::DataElement',
  },
  {
    path: 'my::MyDataWithQueryParams',
    content: {
      _type: 'dataElement',
      name: 'MyDataWithQueryParams',
      data: {
        _type: 'serviceStore',
        serviceStubMappings: [
          {
            requestPattern: {
              method: 'GET',
              queryParams: {
                id: {
                  _type: 'equalTo',
                  expectedValue: '123',
                },
                name: {
                  _type: 'equalTo',
                  expectedValue: 'FirstName A',
                },
              },
              urlPath: '/employees',
            },
            responseDefinition: {
              body: {
                _type: 'externalFormat',
                contentType: 'application/json',
                data: 'data',
              },
            },
          },
        ],
      },
      package: 'my',
    },
    classifierPath: 'meta::pure::data::DataElement',
  },
  {
    path: 'my::MyData',
    content: {
      _type: 'dataElement',
      name: 'MyData',
      data: {
        _type: 'serviceStore',
        serviceStubMappings: [
          {
            requestPattern: {
              method: 'GET',
              url: '/employees',
            },
            responseDefinition: {
              body: {
                _type: 'externalFormat',
                contentType: 'application/json',
                data: 'data',
              },
            },
          },
        ],
      },
      package: 'my',
    },
    classifierPath: 'meta::pure::data::DataElement',
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
          elements: ['test::A'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['anything'],
          elements: ['anything::ServiceStore1'],
          parserName: 'ServiceStore',
        },
        {
          _type: 'importAware',
          imports: ['anything'],
          elements: ['anything::ServiceStore2'],
          parserName: 'ServiceStore',
        },
        {
          _type: 'importAware',
          imports: ['anything'],
          elements: ['anything::binding1'],
          parserName: 'Binding',
        },
        {
          _type: 'importAware',
          imports: ['anything'],
          elements: ['anything::mapping'],
          parserName: 'Mapping',
        },
        {
          _type: 'importAware',
          imports: ['anything'],
          elements: ['anything::tConn'],
          parserName: 'Connection',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];
