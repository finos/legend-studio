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
        modelClass: 'org::legend::Person',
        resolutionQueries: [
          {
            keyType: 'Optional',
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
          createBlockedException: false,
          createPermitted: true,
          description: 'Single partition source',
          id: 'widget-file-single-partition',
          partitions: [
            {
              id: 'partition-1',
              tags: ['Full Universe', 'Global'],
            },
          ],
          parseService: 'org::legend::PersonParseService',
          sequentialData: true,
          stagedLoad: false,
          status: 'Development',
          transformService: 'org::legend::PersonTransformService',
          tags: ['Widget Test'],
        },
      ],
    },
  },
];
