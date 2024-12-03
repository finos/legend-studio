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

export const TEST_DATA__simpleDebuggingCase = [
  {
    classifierPath: 'meta::pure::metamodel::type::Class',
    path: 'myPack::BasicPerson',
    content: {
      _type: 'class',
      name: 'BasicPerson',
      package: 'myPack',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'fullName',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'title',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
    },
  },
  {
    classifierPath: 'meta::pure::metamodel::type::Class',
    path: 'myPack::Firm',
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
                        parameters: [{ _type: 'var', name: 'this' }],
                        property: 'employees',
                      },
                    ],
                  },
                  {
                    _type: 'integer',
                    multiplicity: { lowerBound: 1, upperBound: 1 },
                    values: [2],
                  },
                ],
              },
            ],
            parameters: [{ _type: 'var', name: 'this' }],
          },
          name: 'size',
        },
      ],
      name: 'Firm',
      package: 'myPack',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'legalName',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: { lowerBound: 0 },
          name: 'employees',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'myPack::Person',
            },
          },
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
                  parameters: [{ _type: 'var', name: 'this' }],
                  property: 'employees',
                },
              ],
            },
          ],
          name: 'firstEmployee',
          parameters: [],
          returnMultiplicity: { lowerBound: 0, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'myPack::Person',
            },
          },
        },
      ],
      stereotypes: [{ profile: 'myPack::MyExtenstion', value: 'important' }],
      superTypes: [
        {
          path: 'myPack::LegalEntity',
          type: 'CLASS',
        },
      ],
      taggedValues: [
        {
          tag: { profile: 'myPack::MyExtenstion', value: 'doc' },
          value: 'An entity that does stuff',
        },
      ],
    },
  },
  {
    classifierPath: 'meta::pure::metamodel::type::Class',
    path: 'myPack::LegalEntity',
    content: { _type: 'class', name: 'LegalEntity', package: 'myPack' },
  },
  {
    classifierPath: 'meta::pure::metamodel::extension::Profile',
    path: 'myPack::MyExtenstion',
    content: {
      _type: 'profile',
      name: 'MyExtenstion',
      package: 'myPack',
      stereotypes: [
        {
          value: 'important',
        },
      ],
      tags: [
        {
          value: 'doc',
        },
      ],
    },
  },
  {
    classifierPath: 'meta::pure::mapping::Mapping',
    path: 'myPack::MyMapping',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'pureInstance',
          class: 'myPack::BasicPerson',
          id: 'myPack_BasicPerson',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              property: {
                class: 'myPack::BasicPerson',
                property: 'fullName',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'func',
                    function: 'plus',
                    parameters: [
                      {
                        _type: 'collection',
                        multiplicity: { lowerBound: 2, upperBound: 2 },
                        values: [
                          {
                            _type: 'func',
                            function: 'toOne',
                            parameters: [
                              {
                                _type: 'property',
                                parameters: [{ _type: 'var', name: 'src' }],
                                property: 'firstName',
                              },
                            ],
                          },
                          {
                            _type: 'func',
                            function: 'toOne',
                            parameters: [
                              {
                                _type: 'property',
                                parameters: [{ _type: 'var', name: 'src' }],
                                property: 'lastName',
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'purePropertyMapping',
              property: {
                class: 'myPack::BasicPerson',
                property: 'title',
              },
              source: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'string',
                    multiplicity: { lowerBound: 1, upperBound: 1 },
                    values: ['phd'],
                  },
                ],
                parameters: [],
              },
            },
          ],
          root: true,
          srcClass: 'myPack::Person',
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'MyMapping',
      package: 'myPack',
      tests: [],
    },
  },
  {
    classifierPath: 'meta::pure::metamodel::type::Class',
    path: 'myPack::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'myPack',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'firstName',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'lastName',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
    },
  },
];

export const TEST_DATA__AutoImportsWithSystemProfiles = [
  {
    path: 'test::enumeration',
    content: {
      _type: 'Enumeration',
      name: 'enumeration',
      package: 'test',
      values: [
        {
          stereotypes: [
            {
              profile: 'doc',
              value: 'deprecated',
            },
          ],
          taggedValues: [
            {
              tag: {
                profile: 'doc',
                value: 'doc',
              },
              value: 'any',
            },
          ],
          value: 'CITY',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
  },
];

export const TEST_DATA__AutoImportsWithAny = [
  {
    path: 'test::doc',
    content: {
      _type: 'class',
      name: 'doc',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'prop',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Any',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
];
