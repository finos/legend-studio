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

export const simpleCoreModelData = [
  {
    path: 'demo::Firm',
    content: {
      _type: 'class',
      constraints: [
        {
          functionDefinition: {
            _type: 'lambda',
            body: [
              {
                _type: 'func',
                function: 'greaterThan',
                parameters: [
                  {
                    _type: 'func',
                    function: 'size',
                    parameters: [
                      {
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'this',
                            sourceInformation: {
                              endColumn: 23,
                              endLine: 3,
                              sourceId: '',
                              startColumn: 19,
                              startLine: 3,
                            },
                          },
                        ],
                        property: 'employees',
                        sourceInformation: {
                          endColumn: 33,
                          endLine: 3,
                          sourceId: '',
                          startColumn: 25,
                          startLine: 3,
                        },
                      },
                    ],
                    sourceInformation: {
                      endColumn: 39,
                      endLine: 3,
                      sourceId: '',
                      startColumn: 36,
                      startLine: 3,
                    },
                  },
                  {
                    _type: 'integer',
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    sourceInformation: {
                      endColumn: 45,
                      endLine: 3,
                      sourceId: '',
                      startColumn: 45,
                      startLine: 3,
                    },
                    values: [2],
                  },
                ],
                sourceInformation: {
                  endColumn: 45,
                  endLine: 3,
                  sourceId: '',
                  startColumn: 43,
                  startLine: 3,
                },
              },
            ],
            parameters: [],
          },
          name: 'constraintSize',
        },
      ],
      name: 'Firm',
      package: 'demo',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
          },
          name: 'employees',
          type: 'demo::Person',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'legalName',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'incType',
          type: 'String',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'first',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                      sourceInformation: {
                        endColumn: 24,
                        endLine: 9,
                        sourceId: '',
                        startColumn: 20,
                        startLine: 9,
                      },
                    },
                  ],
                  property: 'employees',
                  sourceInformation: {
                    endColumn: 34,
                    endLine: 9,
                    sourceId: '',
                    startColumn: 26,
                    startLine: 9,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 41,
                endLine: 9,
                sourceId: '',
                startColumn: 37,
                startLine: 9,
              },
            },
          ],
          name: 'firstEmployee',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnType: 'demo::Person',
        },
      ],
      superTypes: ['demo::LegalEntity'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'demo::LegalEntity',
    content: {
      _type: 'class',
      name: 'LegalEntity',
      package: 'demo',
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'demo::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'demo',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'firstName',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'lastName',
          type: 'String',
        },
      ],
      stereotypes: [
        {
          profile: 'demo::ProfileExtension',
          value: 'important',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'demo::other::NPerson',
    content: {
      _type: 'class',
      name: 'NPerson',
      package: 'demo::other',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'fullName',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'demo::other::NFirm',
    content: {
      _type: 'class',
      constraints: [
        {
          functionDefinition: {
            _type: 'lambda',
            body: [
              {
                _type: 'func',
                function: 'startsWith',
                parameters: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'this',
                        sourceInformation: {
                          endColumn: 19,
                          endLine: 29,
                          sourceId: '',
                          startColumn: 15,
                          startLine: 29,
                        },
                      },
                    ],
                    property: 'name',
                    sourceInformation: {
                      endColumn: 24,
                      endLine: 29,
                      sourceId: '',
                      startColumn: 21,
                      startLine: 29,
                    },
                  },
                  {
                    _type: 'string',
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    sourceInformation: {
                      endColumn: 41,
                      endLine: 29,
                      sourceId: '',
                      startColumn: 38,
                      startLine: 29,
                    },
                    values: ['MC'],
                  },
                ],
                sourceInformation: {
                  endColumn: 36,
                  endLine: 29,
                  sourceId: '',
                  startColumn: 27,
                  startLine: 29,
                },
              },
            ],
            parameters: [],
          },
          name: 'namePrefix',
        },
      ],
      name: 'NFirm',
      package: 'demo::other',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
          },
          name: 'nEmployees',
          type: 'demo::other::NPerson',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'incType',
          type: 'demo::other::IncType',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'demo::other::IncType',
    content: {
      _type: 'Enumeration',
      name: 'IncType',
      package: 'demo::other',
      values: [
        {
          value: 'LLC',
        },
        {
          value: 'CORP',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
  },
  {
    path: 'demo::ProfileExtension',
    content: {
      _type: 'profile',
      name: 'ProfileExtension',
      package: 'demo',
      stereotypes: ['important'],
      tags: ['doc'],
    },
    classifierPath: 'meta::pure::metamodel::extension::Profile',
  },
  {
    path: 'demo::MyMapping',
    content: {
      _type: 'mapping',
      includedMappings: [],
      classMappings: [
        {
          _type: 'pureInstance',
          class: 'demo::other::NPerson',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              property: {
                class: 'demo::other::NPerson',
                property: 'fullName',
              },
              source: 'demo_other_NPerson',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'func',
                    function: 'plus',
                    parameters: [
                      {
                        _type: 'collection',
                        multiplicity: {
                          lowerBound: 3,
                          upperBound: 3,
                        },
                        sourceInformation: {
                          endColumn: 50,
                          endLine: 56,
                          sourceId: 'demo::MyMapping',
                          startColumn: 30,
                          startLine: 56,
                        },
                        values: [
                          {
                            _type: 'property',
                            parameters: [
                              {
                                _type: 'var',
                                name: 'src',
                                sourceInformation: {
                                  endColumn: 18,
                                  endLine: 56,
                                  sourceId: 'demo::MyMapping',
                                  startColumn: 15,
                                  startLine: 56,
                                },
                              },
                            ],
                            property: 'firstName',
                            sourceInformation: {
                              endColumn: 28,
                              endLine: 56,
                              sourceId: 'demo::MyMapping',
                              startColumn: 20,
                              startLine: 56,
                            },
                          },
                          {
                            _type: 'string',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            sourceInformation: {
                              endColumn: 34,
                              endLine: 56,
                              sourceId: 'demo::MyMapping',
                              startColumn: 32,
                              startLine: 56,
                            },
                            values: [' '],
                          },
                          {
                            _type: 'property',
                            parameters: [
                              {
                                _type: 'var',
                                name: 'src',
                                sourceInformation: {
                                  endColumn: 41,
                                  endLine: 56,
                                  sourceId: 'demo::MyMapping',
                                  startColumn: 38,
                                  startLine: 56,
                                },
                              },
                            ],
                            property: 'lastName',
                            sourceInformation: {
                              endColumn: 50,
                              endLine: 56,
                              sourceId: 'demo::MyMapping',
                              startColumn: 43,
                              startLine: 56,
                            },
                          },
                        ],
                      },
                    ],
                    sourceInformation: {
                      endColumn: 50,
                      endLine: 56,
                      sourceId: 'demo::MyMapping',
                      startColumn: 30,
                      startLine: 56,
                    },
                  },
                ],
                parameters: [],
              },
              explodeProperty: false,
            },
          ],
          root: true,
          srcClass: 'demo::Person',
        },
        {
          _type: 'pureInstance',
          class: 'demo::other::NFirm',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              property: {
                class: 'demo::other::NFirm',
                property: 'nEmployees',
              },
              source: 'demo_other_NFirm',
              target: 'demo_other_NPerson',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                        sourceInformation: {
                          endColumn: 40,
                          endLine: 61,
                          sourceId: 'demo::MyMapping',
                          startColumn: 37,
                          startLine: 61,
                        },
                      },
                    ],
                    property: 'employees',
                    sourceInformation: {
                      endColumn: 50,
                      endLine: 61,
                      sourceId: 'demo::MyMapping',
                      startColumn: 42,
                      startLine: 61,
                    },
                  },
                ],
                parameters: [],
              },
              explodeProperty: false,
            },
            {
              _type: 'purePropertyMapping',
              property: {
                class: 'demo::other::NFirm',
                property: 'name',
              },
              source: 'demo_other_NFirm',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                        sourceInformation: {
                          endColumn: 14,
                          endLine: 62,
                          sourceId: 'demo::MyMapping',
                          startColumn: 11,
                          startLine: 62,
                        },
                      },
                    ],
                    property: 'legalName',
                    sourceInformation: {
                      endColumn: 24,
                      endLine: 62,
                      sourceId: 'demo::MyMapping',
                      startColumn: 16,
                      startLine: 62,
                    },
                  },
                ],
                parameters: [],
              },
              explodeProperty: false,
            },
            {
              _type: 'purePropertyMapping',
              enumMappingId: 'demo_other_IncType',
              property: {
                class: 'demo::other::NFirm',
                property: 'incType',
              },
              source: 'demo_other_NFirm',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                        sourceInformation: {
                          endColumn: 56,
                          endLine: 63,
                          sourceId: 'demo::MyMapping',
                          startColumn: 53,
                          startLine: 63,
                        },
                      },
                    ],
                    property: 'incType',
                    sourceInformation: {
                      endColumn: 64,
                      endLine: 63,
                      sourceId: 'demo::MyMapping',
                      startColumn: 58,
                      startLine: 63,
                    },
                  },
                ],
                parameters: [],
              },
              explodeProperty: false,
            },
          ],
          root: true,
          srcClass: 'demo::Firm',
        },
      ],
      enumerationMappings: [
        {
          enumValueMappings: [
            {
              enumValue: 'LLC',
              sourceValues: [
                {
                  _type: 'stringSourceValue',
                  value: 'Llc',
                },
              ],
            },
            {
              enumValue: 'CORP',
              sourceValues: [
                {
                  _type: 'stringSourceValue',
                  value: 'Corporation',
                },
              ],
            },
          ],
          enumeration: 'demo::other::IncType',
        },
      ],
      name: 'MyMapping',
      package: 'demo',
      tests: [
        {
          assert: {
            _type: 'expectedOutputMappingTestAssert',
            expectedOutput:
              '{"defects":[],"source":{"defects":[],"source":{"number":1,"record":"{ \\"employees\\": [{ \\"firstName\\": \\"Tyler\\", \\"lastName\\": \\"Durden\\"}, { \\"firstName\\": \\"Big\\", \\"lastName\\": \\"Lebowski\\"}, { \\"firstName\\": \\"Geralt\\", \\"lastName\\": \\"Witcher\\"}], \\"legalName\\": \\"MCDataTeam\\", \\"incType\\": \\"Corporation\\" } "},"value":{"incType":"Corporation","legalName":"MCDataTeam","employees":[{"firstName":"Tyler","lastName":"Durden"},{"firstName":"Big","lastName":"Lebowski"},{"firstName":"Geralt","lastName":"Witcher"}]}},"value":{"incType":"CORP","name":"MCDataTeam","nEmployees":[{"fullName":"Tyler Durden"},{"fullName":"Big Lebowski"},{"fullName":"Geralt Witcher"}]}}',
          },
          inputData: [
            {
              _type: 'object',
              data: '{"employees":[{"firstName":"Tyler","lastName":"Durden"},{"firstName":"Big","lastName":"Lebowski"},{"firstName":"Geralt","lastName":"Witcher"}],"legalName":"MCDataTeam","incType":"Corporation"}',
              inputType: 'JSON',
              sourceClass: 'demo::Firm',
            },
          ],
          name: 'test_1',
          query: {
            _type: 'lambda',
            body: [
              {
                _type: 'func',
                function: 'serialize',
                parameters: [
                  {
                    _type: 'func',
                    function: 'graphFetchChecked',
                    parameters: [
                      {
                        _type: 'func',
                        function: 'getAll',
                        parameters: [
                          {
                            _type: 'class',
                            fullPath: 'demo::other::NFirm',
                            sourceInformation: {
                              endColumn: 32,
                              endLine: 76,
                              sourceId: 'demo::MyMapping',
                              startColumn: 15,
                              startLine: 76,
                            },
                          },
                        ],
                        sourceInformation: {
                          endColumn: 38,
                          endLine: 76,
                          sourceId: 'demo::MyMapping',
                          startColumn: 33,
                          startLine: 76,
                        },
                      },
                      {
                        _type: 'rootGraphFetchTree',
                        class: 'demo::other::NFirm',
                        sourceInformation: {
                          endColumn: 78,
                          endLine: 76,
                          sourceId: 'demo::MyMapping',
                          startColumn: 61,
                          startLine: 76,
                        },
                        subTrees: [
                          {
                            _type: 'propertyGraphFetchTree',
                            parameters: [],
                            property: 'incType',
                            sourceInformation: {
                              endColumn: 86,
                              endLine: 76,
                              sourceId: 'demo::MyMapping',
                              startColumn: 80,
                              startLine: 76,
                            },
                            subTrees: [],
                          },
                          {
                            _type: 'propertyGraphFetchTree',
                            parameters: [],
                            property: 'name',
                            sourceInformation: {
                              endColumn: 91,
                              endLine: 76,
                              sourceId: 'demo::MyMapping',
                              startColumn: 88,
                              startLine: 76,
                            },
                            subTrees: [],
                          },
                          {
                            _type: 'propertyGraphFetchTree',
                            parameters: [],
                            property: 'nEmployees',
                            sourceInformation: {
                              endColumn: 102,
                              endLine: 76,
                              sourceId: 'demo::MyMapping',
                              startColumn: 93,
                              startLine: 76,
                            },
                            subTrees: [
                              {
                                _type: 'propertyGraphFetchTree',
                                parameters: [],
                                property: 'fullName',
                                sourceInformation: {
                                  endColumn: 111,
                                  endLine: 76,
                                  sourceId: 'demo::MyMapping',
                                  startColumn: 104,
                                  startLine: 76,
                                },
                                subTrees: [],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                    sourceInformation: {
                      endColumn: 57,
                      endLine: 76,
                      sourceId: 'demo::MyMapping',
                      startColumn: 41,
                      startLine: 76,
                    },
                  },
                  {
                    _type: 'rootGraphFetchTree',
                    class: 'demo::other::NFirm',
                    sourceInformation: {
                      endColumn: 148,
                      endLine: 76,
                      sourceId: 'demo::MyMapping',
                      startColumn: 131,
                      startLine: 76,
                    },
                    subTrees: [
                      {
                        _type: 'propertyGraphFetchTree',
                        parameters: [],
                        property: 'incType',
                        sourceInformation: {
                          endColumn: 156,
                          endLine: 76,
                          sourceId: 'demo::MyMapping',
                          startColumn: 150,
                          startLine: 76,
                        },
                        subTrees: [],
                      },
                      {
                        _type: 'propertyGraphFetchTree',
                        parameters: [],
                        property: 'name',
                        sourceInformation: {
                          endColumn: 161,
                          endLine: 76,
                          sourceId: 'demo::MyMapping',
                          startColumn: 158,
                          startLine: 76,
                        },
                        subTrees: [],
                      },
                      {
                        _type: 'propertyGraphFetchTree',
                        parameters: [],
                        property: 'nEmployees',
                        sourceInformation: {
                          endColumn: 172,
                          endLine: 76,
                          sourceId: 'demo::MyMapping',
                          startColumn: 163,
                          startLine: 76,
                        },
                        subTrees: [
                          {
                            _type: 'propertyGraphFetchTree',
                            parameters: [],
                            property: 'fullName',
                            sourceInformation: {
                              endColumn: 181,
                              endLine: 76,
                              sourceId: 'demo::MyMapping',
                              startColumn: 174,
                              startLine: 76,
                            },
                            subTrees: [],
                          },
                        ],
                      },
                    ],
                  },
                ],
                sourceInformation: {
                  endColumn: 127,
                  endLine: 76,
                  sourceId: 'demo::MyMapping',
                  startColumn: 119,
                  startLine: 76,
                },
              },
            ],
            parameters: [],
          },
        },
      ],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
];
