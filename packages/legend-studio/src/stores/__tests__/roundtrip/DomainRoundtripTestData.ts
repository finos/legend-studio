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

// References to resolve in Class
// - Supertype
// - TaggedValue + Stereotype
// - Property:
//   - GenericType
//   - TaggedValue + Stereotype
// - DerivedProperty:
//   - GenericType
//   - TaggedValue + Stereotype
export const testClassRoundtrip = [
  {
    path: '__internal__::SectionIndex',
    content: {
      _type: 'sectionIndex',
      name: 'SectionIndex',
      package: '__internal__',
      sections: [
        {
          _type: 'importAware',
          elements: ['test::A', 'test::B', 'test::tEnum', 'test::tProf'],
          imports: ['test'],
          parserName: 'Pure',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
  {
    path: 'test::A',
    content: {
      _type: 'class',
      constraints: [
        {
          functionDefinition: {
            _type: 'lambda',
            body: [
              {
                _type: 'func',
                function: 'equal',
                parameters: [
                  {
                    _type: 'func',
                    function: 'toOne',
                    parameters: [
                      {
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'this',
                            sourceInformation: {
                              endColumn: 7,
                              endLine: 4,
                              sourceId: '',
                              startColumn: 3,
                              startLine: 4,
                            },
                          },
                        ],
                        property: 'ok',
                        sourceInformation: {
                          endColumn: 10,
                          endLine: 4,
                          sourceId: '',
                          startColumn: 9,
                          startLine: 4,
                        },
                      },
                    ],
                    sourceInformation: {
                      endColumn: 17,
                      endLine: 4,
                      sourceId: '',
                      startColumn: 13,
                      startLine: 4,
                    },
                  },
                  {
                    _type: 'integer',
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    sourceInformation: {
                      endColumn: 24,
                      endLine: 4,
                      sourceId: '',
                      startColumn: 24,
                      startLine: 4,
                    },
                    values: [1],
                  },
                ],
                sourceInformation: {
                  endColumn: 22,
                  endLine: 4,
                  sourceId: '',
                  startColumn: 21,
                  startLine: 4,
                },
              },
            ],
            parameters: [],
          },
          name: '0',
        },
        {
          functionDefinition: {
            _type: 'lambda',
            body: [
              {
                _type: 'func',
                function: 'if',
                parameters: [
                  {
                    _type: 'func',
                    function: 'equal',
                    parameters: [
                      {
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'this',
                            sourceInformation: {
                              endColumn: 23,
                              endLine: 5,
                              sourceId: '',
                              startColumn: 19,
                              startLine: 5,
                            },
                          },
                        ],
                        property: 'ok',
                        sourceInformation: {
                          endColumn: 26,
                          endLine: 5,
                          sourceId: '',
                          startColumn: 25,
                          startLine: 5,
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
                          endLine: 5,
                          sourceId: '',
                          startColumn: 31,
                          startLine: 5,
                        },
                        values: ['ok'],
                      },
                    ],
                    sourceInformation: {
                      endColumn: 29,
                      endLine: 5,
                      sourceId: '',
                      startColumn: 28,
                      startLine: 5,
                    },
                  },
                  {
                    _type: 'lambda',
                    body: [
                      {
                        _type: 'boolean',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                        sourceInformation: {
                          endColumn: 41,
                          endLine: 5,
                          sourceId: '',
                          startColumn: 38,
                          startLine: 5,
                        },
                        values: [true],
                      },
                    ],
                    parameters: [],
                    sourceInformation: {
                      endColumn: 41,
                      endLine: 5,
                      sourceId: '',
                      startColumn: 37,
                      startLine: 5,
                    },
                  },
                  {
                    _type: 'lambda',
                    body: [
                      {
                        _type: 'boolean',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                        sourceInformation: {
                          endColumn: 49,
                          endLine: 5,
                          sourceId: '',
                          startColumn: 45,
                          startLine: 5,
                        },
                        values: [false],
                      },
                    ],
                    parameters: [],
                    sourceInformation: {
                      endColumn: 49,
                      endLine: 5,
                      sourceId: '',
                      startColumn: 44,
                      startLine: 5,
                    },
                  },
                ],
                sourceInformation: {
                  endColumn: 17,
                  endLine: 5,
                  sourceId: '',
                  startColumn: 16,
                  startLine: 5,
                },
              },
            ],
            parameters: [],
          },
          name: 'constraint2',
        },
      ],
      name: 'A',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'name',
          taggedValues: [
            {
              tag: {
                profile: 'tProf',
                value: 'todo',
              },
              value: 'bla',
            },
          ],
          type: 'B',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 2,
          },
          name: 'ok',
          taggedValues: [
            {
              tag: {
                profile: 'tProf',
                value: 'doc',
              },
              value: 'bla',
            },
          ],
          type: 'A',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 2,
          },
          name: 'dance',
          type: 'tEnum',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'plus',
              parameters: [
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 2,
                    upperBound: 2,
                  },
                  sourceInformation: {
                    endColumn: 61,
                    endLine: 11,
                    sourceId: '',
                    startColumn: 56,
                    startLine: 11,
                  },
                  values: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 's',
                          sourceInformation: {
                            endColumn: 52,
                            endLine: 11,
                            sourceId: '',
                            startColumn: 51,
                            startLine: 11,
                          },
                        },
                      ],
                      property: 'z',
                      sourceInformation: {
                        endColumn: 54,
                        endLine: 11,
                        sourceId: '',
                        startColumn: 54,
                        startLine: 11,
                      },
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 61,
                        endLine: 11,
                        sourceId: '',
                        startColumn: 58,
                        startLine: 11,
                      },
                      values: ['ok'],
                    },
                  ],
                },
              ],
              sourceInformation: {
                endColumn: 61,
                endLine: 11,
                sourceId: '',
                startColumn: 56,
                startLine: 11,
              },
            },
          ],
          name: 'xza',
          parameters: [
            {
              _type: 'var',
              class: 'B',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 's',
              sourceInformation: {
                endColumn: 47,
                endLine: 11,
                sourceId: '',
                startColumn: 42,
                startLine: 11,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
          stereotypes: [
            {
              profile: 'tProf',
              value: 'test',
            },
          ],
          taggedValues: [
            {
              tag: {
                profile: 'tProf',
                value: 'doc',
              },
              value: 'bla',
            },
          ],
        },
        {
          body: [
            {
              _type: 'func',
              function: 'toOne',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                      sourceInformation: {
                        endColumn: 21,
                        endLine: 12,
                        sourceId: '',
                        startColumn: 17,
                        startLine: 12,
                      },
                    },
                  ],
                  property: 'name',
                  sourceInformation: {
                    endColumn: 26,
                    endLine: 12,
                    sourceId: '',
                    startColumn: 23,
                    startLine: 12,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 33,
                endLine: 12,
                sourceId: '',
                startColumn: 29,
                startLine: 12,
              },
            },
          ],
          name: 'anotherOne',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'B',
        },
      ],
      stereotypes: [
        {
          profile: 'tProf',
          value: 'test',
        },
      ],
      superTypes: ['B'],
      taggedValues: [
        {
          tag: {
            profile: 'doc',
            value: 'doc',
          },
          value: 'bla',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::B',
    content: {
      _type: 'class',
      name: 'B',
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
    path: 'test::tEnum',
    content: {
      _type: 'Enumeration',
      name: 'tEnum',
      package: 'test',
      values: [
        {
          value: 'c',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
  },
  {
    path: 'test::tProf',
    content: {
      _type: 'profile',
      name: 'tProf',
      package: 'test',
      stereotypes: ['test'],
      tags: ['doc', 'todo'],
    },
    classifierPath: 'meta::pure::metamodel::extension::Profile',
  },
];

export const testClassWithComplexConstraint = [
  {
    path: 'test::A',
    content: {
      _type: 'class',
      constraints: [
        {
          functionDefinition: {
            _type: 'lambda',
            body: [
              {
                _type: 'func',
                function: 'if',
                parameters: [
                  {
                    _type: 'func',
                    function: 'equal',
                    parameters: [
                      {
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'this',
                          },
                        ],
                        property: 'ok',
                      },
                      {
                        _type: 'string',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                        values: ['ok'],
                      },
                    ],
                  },
                  {
                    _type: 'lambda',
                    body: [
                      {
                        _type: 'boolean',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                        values: [true],
                      },
                    ],
                    parameters: [],
                  },
                  {
                    _type: 'lambda',
                    body: [
                      {
                        _type: 'boolean',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                        values: [false],
                      },
                    ],
                    parameters: [],
                  },
                ],
              },
            ],
            parameters: [],
          },
          name: 'constraint1',
          externalId: 'ext ID',
          enforcementLevel: 'Warn',
          messageFunction: {
            _type: 'lambda',
            body: [
              {
                _type: 'func',
                function: 'plus',
                parameters: [
                  {
                    _type: 'collection',
                    multiplicity: {
                      lowerBound: 2,
                      upperBound: 2,
                    },
                    values: [
                      {
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'this',
                          },
                        ],
                        property: 'ok',
                      },
                      {
                        _type: 'string',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                        values: [' is not ok'],
                      },
                    ],
                  },
                ],
              },
            ],
            parameters: [],
          },
        },
      ],
      name: 'A',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 2,
          },
          name: 'ok',
          type: 'Integer',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
];

// References to resolve in Enumeration
// - TaggedValue + Stereotype
// - EnumValue: TaggedValue + Stereotype
export const testEnumerationRoundtrip = [
  {
    path: '__internal__::SectionIndex',
    content: {
      _type: 'sectionIndex',
      name: 'SectionIndex',
      package: '__internal__',
      sections: [
        {
          _type: 'importAware',
          elements: ['test::tEnum', 'test::tProf'],
          imports: ['test'],
          parserName: 'Pure',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
  {
    path: 'test::tEnum',
    content: {
      _type: 'Enumeration',
      name: 'tEnum',
      package: 'test',
      stereotypes: [
        {
          profile: 'tProf',
          value: 'test',
        },
      ],
      taggedValues: [
        {
          tag: {
            profile: 'tProf',
            value: 'doc',
          },
          value: 'bla',
        },
      ],
      values: [
        {
          stereotypes: [
            {
              profile: 'tProf',
              value: 'test',
            },
          ],
          taggedValues: [
            {
              tag: {
                profile: 'tProf',
                value: 'doc',
              },
              value: 'Tag Value for enum Value',
            },
          ],
          value: 'a',
        },
        {
          stereotypes: [
            {
              profile: 'tProf',
              value: 'test',
            },
            {
              profile: 'tProf',
              value: 'test',
            },
          ],
          taggedValues: [
            {
              tag: {
                profile: 'tProf',
                value: 'doc',
              },
              value: 'Tag Value for enum Value',
            },
          ],
          value: 'b',
        },
        {
          value: 'c',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
  },
  {
    path: 'test::tProf',
    content: {
      _type: 'profile',
      name: 'tProf',
      package: 'test',
      stereotypes: ['test'],
      tags: ['doc', 'todo'],
    },
    classifierPath: 'meta::pure::metamodel::extension::Profile',
  },
];

// References to resolve in Association
// - Property:
//   - GenericType
//   - TaggedValue + Stereotype
// - DerivedProperty:
//   - GenericType
//   - TaggedValue + Stereotype
export const testAssociationRoundtrip = [
  {
    path: '__internal__::SectionIndex',
    content: {
      _type: 'sectionIndex',
      name: 'SectionIndex',
      package: '__internal__',
      sections: [
        {
          _type: 'importAware',
          elements: ['test::tClass', 'test::tAssoc', 'test::tProf'],
          imports: ['test'],
          parserName: 'Pure',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
  {
    path: 'test::tClass',
    content: {
      _type: 'class',
      name: 'tClass',
      package: 'test',
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::tAssoc',
    content: {
      _type: 'association',
      name: 'tAssoc',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'a',
          stereotypes: [
            {
              profile: 'tProf',
              value: 'test',
            },
          ],
          taggedValues: [
            {
              tag: {
                profile: 'tProf',
                value: 'doc',
              },
              value: 'Tag Value for assoc prop',
            },
          ],
          type: 'tClass',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'b',
          stereotypes: [
            {
              profile: 'tProf',
              value: 'test',
            },
          ],
          taggedValues: [
            {
              tag: {
                profile: 'tProf',
                value: 'doc',
              },
              value: 'Tag Value for assoc prop',
            },
          ],
          type: 'tClass',
        },
      ],
      stereotypes: [
        {
          profile: 'tProf',
          value: 'test',
        },
      ],
      taggedValues: [
        {
          tag: {
            profile: 'tProf',
            value: 'doc',
          },
          value: 'Tag Value for assoc prop',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'test::tProf',
    content: {
      _type: 'profile',
      name: 'tProf',
      package: 'test',
      stereotypes: ['test'],
      tags: ['doc', 'todo'],
    },
    classifierPath: 'meta::pure::metamodel::extension::Profile',
  },
];

// References to resolve in Function
// - TaggedValue + Stereotype
// - ReturnType
// - VariableType
export const testFunctionRoundtrip = [
  {
    path: '__internal__::SectionIndex',
    content: {
      _type: 'sectionIndex',
      name: 'SectionIndex',
      package: '__internal__',
      sections: [
        {
          _type: 'importAware',
          elements: ['test::tClass', 'test::tProf', 'test::tFunc'],
          imports: ['test'],
          parserName: 'Pure',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
  {
    path: 'test::tClass',
    content: {
      _type: 'class',
      name: 'tClass',
      package: 'test',
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::tProf',
    content: {
      _type: 'profile',
      name: 'tProf',
      package: 'test',
      stereotypes: ['test'],
      tags: ['doc', 'todo'],
    },
    classifierPath: 'meta::pure::metamodel::extension::Profile',
  },
  {
    path: 'test::tFunc',
    content: {
      _type: 'function',
      body: [
        {
          _type: 'func',
          function: 'tFunc',
          parameters: [
            {
              _type: 'var',
              name: 's1',
              sourceInformation: {
                endColumn: 6,
                endLine: 9,
                sourceId: '',
                startColumn: 4,
                startLine: 9,
              },
            },
            {
              _type: 'var',
              name: 's',
              sourceInformation: {
                endColumn: 16,
                endLine: 9,
                sourceId: '',
                startColumn: 15,
                startLine: 9,
              },
            },
          ],
          sourceInformation: {
            endColumn: 13,
            endLine: 9,
            sourceId: '',
            startColumn: 9,
            startLine: 9,
          },
        },
      ],
      name: 'tFunc',
      package: 'test',
      parameters: [
        {
          _type: 'var',
          class: 'tClass',
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 's',
        },
        {
          _type: 'var',
          class: 'tClass',
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 's1',
        },
      ],
      returnMultiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      returnType: 'tClass',
      stereotypes: [
        {
          profile: 'tProf',
          value: 'test',
        },
      ],
      taggedValues: [
        {
          tag: {
            profile: 'tProf',
            value: 'doc',
          },
          value: 'example',
        },
      ],
    },
    classifierPath:
      'meta::pure::metamodel::function::ConcreteFunctionDefinition',
  },
];

export const testMeasureRoundtrip = [
  {
    path: 'test::newMeasure',
    content: {
      _type: 'measure',
      canonicalUnit: {
        _type: 'unit',
        name: 'UnitOne',
        conversionFunction: {
          _type: 'lambda',
          body: [
            {
              _type: 'var',
              name: 'x',
              sourceInformation: {
                endColumn: 20,
                endLine: 3,
                sourceId: '',
                startColumn: 19,
                startLine: 3,
              },
            },
          ],
          parameters: [
            {
              _type: 'var',
              name: 'x',
            },
          ],
        },
        measure: 'test::newMeasure',
        package: 'test::newmeasure',
      },
      name: 'newMeasure',
      nonCanonicalUnits: [
        {
          _type: 'unit',
          name: 'UnitTwo',
          conversionFunction: {
            _type: 'lambda',
            body: [
              {
                _type: 'func',
                function: 'times',
                parameters: [
                  {
                    _type: 'collection',
                    multiplicity: {
                      lowerBound: 2,
                      upperBound: 2,
                    },
                    sourceInformation: {
                      endColumn: 26,
                      endLine: 4,
                      sourceId: '',
                      startColumn: 21,
                      startLine: 4,
                    },
                    values: [
                      {
                        _type: 'var',
                        name: 'x',
                        sourceInformation: {
                          endColumn: 19,
                          endLine: 4,
                          sourceId: '',
                          startColumn: 18,
                          startLine: 4,
                        },
                      },
                      {
                        _type: 'integer',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                        sourceInformation: {
                          endColumn: 26,
                          endLine: 4,
                          sourceId: '',
                          startColumn: 23,
                          startLine: 4,
                        },
                        values: [1000],
                      },
                    ],
                  },
                ],
                sourceInformation: {
                  endColumn: 26,
                  endLine: 4,
                  sourceId: '',
                  startColumn: 21,
                  startLine: 4,
                },
              },
            ],
            parameters: [
              {
                _type: 'var',
                name: 'x',
              },
            ],
          },
          measure: 'test::newMeasure',
          package: 'test::newmeasure',
        },
        {
          _type: 'unit',
          name: 'UnitThree',
          conversionFunction: {
            _type: 'lambda',
            body: [
              {
                _type: 'func',
                function: 'times',
                parameters: [
                  {
                    _type: 'collection',
                    multiplicity: {
                      lowerBound: 2,
                      upperBound: 2,
                    },
                    sourceInformation: {
                      endColumn: 27,
                      endLine: 5,
                      sourceId: '',
                      startColumn: 23,
                      startLine: 5,
                    },
                    values: [
                      {
                        _type: 'var',
                        name: 'x',
                        sourceInformation: {
                          endColumn: 21,
                          endLine: 5,
                          sourceId: '',
                          startColumn: 20,
                          startLine: 5,
                        },
                      },
                      {
                        _type: 'integer',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                        sourceInformation: {
                          endColumn: 27,
                          endLine: 5,
                          sourceId: '',
                          startColumn: 25,
                          startLine: 5,
                        },
                        values: [400],
                      },
                    ],
                  },
                ],
                sourceInformation: {
                  endColumn: 27,
                  endLine: 5,
                  sourceId: '',
                  startColumn: 23,
                  startLine: 5,
                },
              },
            ],
            parameters: [
              {
                _type: 'var',
                name: 'x',
              },
            ],
          },
          measure: 'test::newMeasure',
          package: 'test::newmeasure',
        },
      ],
      package: 'test',
    },
    classifierPath: 'meta::pure::metamodel::type::Measure',
  },
];
