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

// References to resolve in Class
// - Supertype
// - TaggedValue + Stereotype
// - Property:
//   - GenericType
//   - TaggedValue + Stereotype
// - DerivedProperty:
//   - GenericType
//   - TaggedValue + Stereotype
export const TEST_DATA__ClassRoundtrip = [
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
                          },
                        ],
                        property: 'ok',
                      },
                    ],
                  },
                  {
                    _type: 'integer',
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    values: [1],
                  },
                ],
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
                  values: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 's',
                        },
                      ],
                      property: 'z',
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
              ],
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
                    },
                  ],
                  property: 'name',
                },
              ],
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

export const TEST_DATA__ClassWithComplexConstraint = [
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
export const TEST_DATA__EnumerationRoundtrip = [
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
export const TEST_DATA__AssociationRoundtrip = [
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
export const TEST_DATA__FunctionRoundtrip = [
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
            },
            {
              _type: 'var',
              name: 's',
            },
          ],
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

export const TEST_DATA__MeasureRoundtrip = [
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
                    values: [
                      {
                        _type: 'var',
                        name: 'x',
                      },
                      {
                        _type: 'integer',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                        values: [1000],
                      },
                    ],
                  },
                ],
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
                    values: [
                      {
                        _type: 'var',
                        name: 'x',
                      },
                      {
                        _type: 'integer',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                        values: [400],
                      },
                    ],
                  },
                ],
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

export const TEST_DATA__MilestonedClassRoundtrip = [
  {
    path: '__internal__::SectionIndex',
    content: {
      _type: 'sectionIndex',
      name: 'SectionIndex',
      package: '__internal__',
      sections: [
        {
          _type: 'importAware',
          elements: ['test::C', 'test::D'],
          imports: ['test'],
          parserName: 'Pure',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
  {
    path: 'test::C',
    content: {
      _type: 'class',
      name: 'C',
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
      stereotypes: [
        {
          profile: 'temporal',
          value: 'businesstemporal',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::D',
    content: {
      _type: 'class',
      name: 'D',
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
      superTypes: ['C'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
];
