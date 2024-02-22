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

export const TEST_DATA__roundtrip = [
  {
    path: 'alloy::mastery::connection::KafkaConnection',
    classifierPath:
      'meta::pure::mastery::metamodel::connection::KafkaConnection',
    content: {
      _type: 'kafkaConnection',
      name: 'KafkaConnection',
      package: 'alloy::mastery::connection',
      topicName: 'my-topic-name',
      topicUrls: ['some.url.com:2100', 'another.url.com:2100'],
    },
  },
  {
    path: 'alloy::mastery::connection::FTPConnection',
    classifierPath: 'meta::pure::mastery::metamodel::connection::FTPConnection',
    content: {
      _type: 'ftpConnection',
      name: 'FTPConnection',
      package: 'alloy::mastery::connection',
      host: 'site.url.com',
      port: 30,
    },
  },
  {
    path: 'alloy::mastery::connection::SFTPConnection',
    classifierPath: 'meta::pure::mastery::metamodel::connection::FTPConnection',
    content: {
      _type: 'ftpConnection',
      name: 'SFTPConnection',
      package: 'alloy::mastery::connection',
      host: 'site.url.com',
      port: 30,
      secure: true,
    },
  },
  {
    path: 'alloy::mastery::connection::HTTPConnection',
    classifierPath:
      'meta::pure::mastery::metamodel::connection::HTTPConnection',
    content: {
      _type: 'httpConnection',
      authenticationStrategy: {
        _type: 'tokenAuthenticationStrategy',
        tokenUrl: 'https://some.url.com',
      },
      name: 'HTTPConnection',
      package: 'alloy::mastery::connection',
      url: 'https://some.url.com',
      proxy: {
        authenticationStrategy: {
          _type: 'tokenAuthenticationStrategy',
          tokenUrl: 'https://some.url.com',
        },
        host: 'proxy.url.com',
        port: 85,
      },
    },
  },
  {
    path: 'org::legend::TestDataProvider',
    classifierPath: 'meta::pure::mastery::metamodel::precedence::DataProvider',
    content: {
      _type: 'dataProvider',
      name: 'TestDataProvider',
      package: 'org::legend',
      dataProviderId: 'reuters',
      dataProviderType: 'Aggregator',
    },
  },
  {
    path: 'org::legend::Person',
    classifierPath: 'meta::pure::metamodel::type::Class',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'org::legend',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'name',
          type: 'String',
        },
      ],
    },
  },
  {
    path: 'org::legend::PersonMasterRecord',
    classifierPath: 'meta::pure::mastery::metamodel::MasterRecordDefinition',
    content: {
      _type: 'mastery',
      name: 'PersonMasterRecord',
      package: 'org::legend',
      modelClass: 'org::legend::Person',
      identityResolution: {
        resolutionQueries: [
          {
            keyType: 'Optional',
            optional: true,
            precedence: 1,
            queries: [
              {
                _type: 'lambda',
                body: [
                  {
                    _type: 'func',
                    function: 'filter',
                    parameters: [
                      {
                        _type: 'func',
                        function: 'getAll',
                        parameters: [
                          {
                            _type: 'packageableElementPtr',
                            fullPath: 'org::legend::Person',
                          },
                        ],
                      },
                      {
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
                                    name: 'person',
                                  },
                                ],
                                property: 'name',
                              },
                              {
                                _type: 'property',
                                parameters: [
                                  {
                                    _type: 'var',
                                    name: 'input',
                                  },
                                ],
                                property: 'name',
                              },
                            ],
                          },
                        ],
                        parameters: [
                          {
                            _type: 'var',
                            name: 'person',
                          },
                        ],
                      },
                    ],
                  },
                ],
                parameters: [
                  {
                    _type: 'var',
                    class: 'org::legend::Person',
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    name: 'input',
                  },
                ],
              },
            ],
            filter: {
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
                          name: 'input',
                        }
                      ],
                      property: 'name',
                    },
                    {
                      _type: 'string',
                      value: 'Bob',
                    }
                  ]
                }
              ],
              parameters: [
                {
                   _type: 'var',
                   class: 'mastery::test::model::Person',
                   multiplicity: {
                     lowerBound: 1,
                     upperBound: 1,
                   },
                   name: 'input',
                }
             ]
            },
         },
       ],
      },
      precedenceRules: [
        {
          _type: 'createRule',
          masterRecordFilter: {
            _type: 'lambda',
            body: [
              {
                _type: 'var',
                name: 'person',
              },
            ],
            parameters: [
              {
                _type: 'var',
                class: 'mastery::test::model::Person',
                multiplicity: {
                  lowerBound: 1,
                  upperBound: 1,
                },
                name: 'person',
              },
            ],
          },
          paths: [
            {
              property: 'name',
              filter: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'var',
                    name: 'name',
                  },
                ],
                parameters: [
                  {
                    _type: 'var',
                    class: 'String',
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    name: 'name',
                  },
                ],
              },
            },
          ],
          scopes: [
            {
              _type: 'dataProviderIdScope',
              dataProviderId: 'reuters',
            },
            {
              _type: 'recordSourceScope',
              recordSourceId: 'reuters-equity',
            },
          ],
        },
        {
          _type: 'deleteRule',
          masterRecordFilter: {
            _type: 'lambda',
            body: [
              {
                _type: 'var',
                name: 'person',
              },
            ],
            parameters: [
              {
                _type: 'var',
                class: 'mastery::test::model::Person',
                multiplicity: {
                  lowerBound: 1,
                  upperBound: 1,
                },
                name: 'person',
              },
            ],
          },
          paths: [
            {
              property: 'name',
              filter: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'func',
                    fControl: 'equal_Any_MANY__Any_MANY__Boolean_1_',
                    function: 'equal',
                    parameters: [
                      {
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'person',
                          },
                        ],
                        property: 'name',
                      },
                      {
                        _type: 'string',
                        value: 'tobi',
                      },
                    ],
                  },
                ],
                parameters: [
                  {
                    _type: 'var',
                    class: 'mastery::test::model::Person',
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    name: 'person',
                  },
                ],
              },
            },
          ],
          scopes: [
            {
              _type: 'dataProviderTypeScope',
              dataProviderType: 'Aggregator',
            },
          ],
        },
        {
          _type: 'sourcePrecedenceRule',
          masterRecordFilter: {
            _type: 'lambda',
            body: [
              {
                _type: 'var',
                name: 'person',
              },
            ],
            parameters: [
              {
                _type: 'var',
                class: 'mastery::test::model::Person',
                multiplicity: {
                  lowerBound: 1,
                  upperBound: 1,
                },
                name: 'person',
              },
            ],
          },
          paths: [
            {
              property: 'name',
              filter: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'var',
                    name: 'name',
                  },
                ],
                parameters: [
                  {
                    _type: 'var',
                    class: 'String',
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    name: 'name',
                  },
                ],
              },
            },
          ],
          precedence: 1,
          action: 'Overwrite',
          scopes: [
            {
              _type: 'dataProviderTypeScope',
              dataProviderType: 'Aggregator',
            },
          ],
        },
        {
          _type: 'conditionalRule',
          masterRecordFilter: {
            _type: 'lambda',
            body: [
              {
                _type: 'var',
                name: 'person',
              },
            ],
            parameters: [
              {
                _type: 'var',
                class: 'mastery::test::model::Person',
                multiplicity: {
                  lowerBound: 1,
                  upperBound: 1,
                },
                name: 'person',
              },
            ],
          },
          paths: [
            {
              property: 'name',
              filter: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'var',
                    name: 'name',
                  },
                ],
                parameters: [
                  {
                    _type: 'var',
                    class: 'String',
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    name: 'name',
                  },
                ],
              },
            },
          ],
          predicate: {
            _type: 'lambda',
            body: [
              {
                _type: 'func',
                fControl: 'equal_Any_MANY__Any_MANY__Boolean_1_',
                function: 'equal',
                parameters: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'proposed',
                      },
                    ],
                    property: 'name',
                  },
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'masterRecord',
                      },
                    ],
                    property: 'name',
                  },
                ],
              },
            ],
            parameters: [
              {
                _type: 'var',
                class: 'org::legend::Person',
                multiplicity: {
                  lowerBound: 1,
                  upperBound: 1,
                },
                name: 'proposed',
              },
              {
                _type: 'var',
                class: 'org::legend::Person',
                multiplicity: {
                  lowerBound: 1,
                  upperBound: 1,
                },
                name: 'masterRecord',
              },
            ],
          },
          scopes: [
            {
              _type: 'dataProviderTypeScope',
              dataProviderType: 'Exchange',
            },
          ],
        },
      ],
      sources: [
        {
          allowFieldDelete: false,
          createBlockedException: false,
          createPermitted: true,
          description: 'Single partition source',
          id: 'widget-file-single-partition',
          recordService: {
            acquisitionProtocol: {
              _type: 'legendServiceAcquisitionProtocol',
              service:
                'alloy::mastery::booklibrary::sources::isbndb::ReadFromSnowFlakeService',
            },
            parseService: 'org::legend::PersonParseService',
            transformService: 'org::legend::PersonTransformService',
          },
          sequentialData: true,
          stagedLoad: false,
          status: 'Development',
          trigger: {
            _type: 'manualTrigger',
          },
          dataProvider: 'org::legend::TestDataProvider',
          raiseExceptionWorkflow: true,
          runProfile: 'Medium',
          timeoutInMinutes: 100,
          dependencies: [
            {
              dependentRecordSourceId: 'widget-file-source',
            },
          ],
        },
        {
          createBlockedException: false,
          createPermitted: true,
          description: 'File source',
          id: 'widget-file-source',
          recordService: {
            acquisitionProtocol: {
              _type: 'fileAcquisitionProtocol',
              fileType: 'CSV',
              filePath: '/download/day-file.csv',
              headerLines: 0,
              maxRetryTimeInMinutes: 180,
              encoding: 'Windows-1252',
              connection: 'alloy::mastery::connection::FTPConnection',
            },
            parseService: 'org::legend::PersonParseService',
            transformService: 'org::legend::PersonTransformService',
          },
          sequentialData: true,
          stagedLoad: false,
          status: 'Development',
          trigger: {
            _type: 'manualTrigger',
          },
        },
      ],
      postCurationEnrichmentService: 'org::legend::PersonEnrichmentService',
      collectionEqualities: [
        {
          modelClass: 'org::legend::Person',
          equalityFunction: 'org::legend::PersonEnrichmentService',
        },
      ],
      publishToElasticSearch: true,
      elasticSearchTransformService: 'org::legend::PersonEnrichmentService',
      exceptionWorkflowTransformService: 'org::legend::PersonEnrichmentService',
    },
  },
];
