/**
 * Copyright 2020 Goldman Sachs
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

export const graphFetchData = [
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
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'testing',
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
                        endLine: 10,
                        sourceId: '',
                        startColumn: 20,
                        startLine: 10,
                      },
                    },
                  ],
                  property: 'employees',
                  sourceInformation: {
                    endColumn: 34,
                    endLine: 10,
                    sourceId: '',
                    startColumn: 26,
                    startLine: 10,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 41,
                endLine: 10,
                sourceId: '',
                startColumn: 37,
                startLine: 10,
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
                          endLine: 25,
                          sourceId: '',
                          startColumn: 15,
                          startLine: 25,
                        },
                      },
                    ],
                    property: 'name',
                    sourceInformation: {
                      endColumn: 24,
                      endLine: 25,
                      sourceId: '',
                      startColumn: 21,
                      startLine: 25,
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
                      endLine: 25,
                      sourceId: '',
                      startColumn: 38,
                      startLine: 25,
                    },
                    values: ['MC'],
                  },
                ],
                sourceInformation: {
                  endColumn: 36,
                  endLine: 25,
                  sourceId: '',
                  startColumn: 27,
                  startLine: 25,
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
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'nTesting',
          type: 'String',
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
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name1',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'name2',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name3',
          type: 'String',
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
                          endColumn: 37,
                          endLine: 1,
                          sourceId:
                            'demo::MyMapping-pureInstanceClassMapping-demo_other_NPerson-fullName--0',
                          startColumn: 17,
                          startLine: 1,
                        },
                        values: [
                          {
                            _type: 'property',
                            parameters: [
                              {
                                _type: 'var',
                                name: 'src',
                                sourceInformation: {
                                  endColumn: 5,
                                  endLine: 1,
                                  sourceId:
                                    'demo::MyMapping-pureInstanceClassMapping-demo_other_NPerson-fullName--0',
                                  startColumn: 2,
                                  startLine: 1,
                                },
                              },
                            ],
                            property: 'firstName',
                            sourceInformation: {
                              endColumn: 15,
                              endLine: 1,
                              sourceId:
                                'demo::MyMapping-pureInstanceClassMapping-demo_other_NPerson-fullName--0',
                              startColumn: 7,
                              startLine: 1,
                            },
                          },
                          {
                            _type: 'string',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            sourceInformation: {
                              endColumn: 21,
                              endLine: 1,
                              sourceId:
                                'demo::MyMapping-pureInstanceClassMapping-demo_other_NPerson-fullName--0',
                              startColumn: 19,
                              startLine: 1,
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
                                  endColumn: 28,
                                  endLine: 1,
                                  sourceId:
                                    'demo::MyMapping-pureInstanceClassMapping-demo_other_NPerson-fullName--0',
                                  startColumn: 25,
                                  startLine: 1,
                                },
                              },
                            ],
                            property: 'lastName',
                            sourceInformation: {
                              endColumn: 37,
                              endLine: 1,
                              sourceId:
                                'demo::MyMapping-pureInstanceClassMapping-demo_other_NPerson-fullName--0',
                              startColumn: 30,
                              startLine: 1,
                            },
                          },
                        ],
                      },
                    ],
                    sourceInformation: {
                      endColumn: 37,
                      endLine: 1,
                      sourceId:
                        'demo::MyMapping-pureInstanceClassMapping-demo_other_NPerson-fullName--0',
                      startColumn: 17,
                      startLine: 1,
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
                class: 'demo::other::NPerson',
                property: 'name1',
              },
              source: 'demo_other_NPerson',
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
                          endColumn: 5,
                          endLine: 1,
                          sourceId:
                            'demo::MyMapping-pureInstanceClassMapping-demo_other_NPerson-name1--1',
                          startColumn: 2,
                          startLine: 1,
                        },
                      },
                    ],
                    property: 'firstName',
                    sourceInformation: {
                      endColumn: 15,
                      endLine: 1,
                      sourceId:
                        'demo::MyMapping-pureInstanceClassMapping-demo_other_NPerson-name1--1',
                      startColumn: 7,
                      startLine: 1,
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
                class: 'demo::other::NPerson',
                property: 'name3',
              },
              source: 'demo_other_NPerson',
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
                          endColumn: 5,
                          endLine: 1,
                          sourceId:
                            'demo::MyMapping-pureInstanceClassMapping-demo_other_NPerson-name3--2',
                          startColumn: 2,
                          startLine: 1,
                        },
                      },
                    ],
                    property: 'lastName',
                    sourceInformation: {
                      endColumn: 14,
                      endLine: 1,
                      sourceId:
                        'demo::MyMapping-pureInstanceClassMapping-demo_other_NPerson-name3--2',
                      startColumn: 7,
                      startLine: 1,
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
                          endLine: 62,
                          sourceId: 'demo::MyMapping',
                          startColumn: 37,
                          startLine: 62,
                        },
                      },
                    ],
                    property: 'employees',
                    sourceInformation: {
                      endColumn: 50,
                      endLine: 62,
                      sourceId: 'demo::MyMapping',
                      startColumn: 42,
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
                          endLine: 63,
                          sourceId: 'demo::MyMapping',
                          startColumn: 11,
                          startLine: 63,
                        },
                      },
                    ],
                    property: 'legalName',
                    sourceInformation: {
                      endColumn: 24,
                      endLine: 63,
                      sourceId: 'demo::MyMapping',
                      startColumn: 16,
                      startLine: 63,
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
                          endLine: 64,
                          sourceId: 'demo::MyMapping',
                          startColumn: 53,
                          startLine: 64,
                        },
                      },
                    ],
                    property: 'incType',
                    sourceInformation: {
                      endColumn: 64,
                      endLine: 64,
                      sourceId: 'demo::MyMapping',
                      startColumn: 58,
                      startLine: 64,
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
                  value: 'LLC',
                },
              ],
            },
            {
              enumValue: 'CORP',
              sourceValues: [
                {
                  _type: 'stringSourceValue',
                  value: 'Corp',
                },
              ],
            },
          ],
          enumeration: 'demo::other::IncType',
        },
      ],
      name: 'MyMapping',
      package: 'demo',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
];
