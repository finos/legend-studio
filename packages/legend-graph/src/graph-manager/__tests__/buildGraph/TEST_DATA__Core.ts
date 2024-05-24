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

export const TEST_DATA__SimpleGraph = [
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
            parameters: [],
          },
          name: 'constraintSize',
        },
      ],
      name: 'Firm',
      package: 'demo',
      properties: [
        {
          multiplicity: { lowerBound: 1 },
          name: 'employees',
          type: 'demo::Person',
        },
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'legalName',
          type: 'String',
        },
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
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
                  parameters: [{ _type: 'var', name: 'this' }],
                  property: 'employees',
                },
              ],
            },
          ],
          name: 'firstEmployee',
          parameters: [],
          returnMultiplicity: { lowerBound: 0, upperBound: 1 },
          returnType: 'demo::Person',
        },
      ],
      superTypes: ['demo::LegalEntity'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'demo::LegalEntity',
    content: { _type: 'class', name: 'LegalEntity', package: 'demo' },
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
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'firstName',
          type: 'String',
        },
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'lastName',
          type: 'String',
        },
      ],
      stereotypes: [{ profile: 'demo::ProfileExtension', value: 'important' }],
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
          multiplicity: { lowerBound: 1, upperBound: 1 },
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
                    parameters: [{ _type: 'var', name: 'this' }],
                    property: 'name',
                  },
                  {
                    _type: 'string',
                    multiplicity: { lowerBound: 1, upperBound: 1 },
                    values: ['MC'],
                  },
                ],
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
          multiplicity: { lowerBound: 1 },
          name: 'nEmployees',
          type: 'demo::other::NPerson',
        },
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'name',
          type: 'String',
        },
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
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
      values: [{ value: 'LLC' }, { value: 'CORP' }],
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
                        multiplicity: { lowerBound: 3, upperBound: 3 },
                        values: [
                          {
                            _type: 'property',
                            parameters: [{ _type: 'var', name: 'src' }],
                            property: 'firstName',
                          },
                          {
                            _type: 'string',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            values: [' '],
                          },
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
                    parameters: [{ _type: 'var', name: 'src' }],
                    property: 'employees',
                  },
                ],
                parameters: [],
              },
              explodeProperty: false,
            },
            {
              _type: 'purePropertyMapping',
              property: { class: 'demo::other::NFirm', property: 'name' },
              source: 'demo_other_NFirm',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [{ _type: 'var', name: 'src' }],
                    property: 'legalName',
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
                    parameters: [{ _type: 'var', name: 'src' }],
                    property: 'incType',
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
              sourceValues: [{ _type: 'stringSourceValue', value: 'Llc' }],
            },
            {
              enumValue: 'CORP',
              sourceValues: [
                { _type: 'stringSourceValue', value: 'Corporation' },
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
                            _type: 'packageableElementPtr',
                            fullPath: 'demo::other::NFirm',
                          },
                        ],
                      },
                      {
                        _type: 'rootGraphFetchTree',
                        class: 'demo::other::NFirm',
                        subTrees: [
                          {
                            _type: 'propertyGraphFetchTree',
                            parameters: [],
                            property: 'incType',
                            subTrees: [],
                          },
                          {
                            _type: 'propertyGraphFetchTree',
                            parameters: [],
                            property: 'name',
                            subTrees: [],
                          },
                          {
                            _type: 'propertyGraphFetchTree',
                            parameters: [],
                            property: 'nEmployees',
                            subTrees: [
                              {
                                _type: 'propertyGraphFetchTree',
                                parameters: [],
                                property: 'fullName',
                                subTrees: [],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    _type: 'rootGraphFetchTree',
                    class: 'demo::other::NFirm',
                    subTrees: [
                      {
                        _type: 'propertyGraphFetchTree',
                        parameters: [],
                        property: 'incType',
                        subTrees: [],
                      },
                      {
                        _type: 'propertyGraphFetchTree',
                        parameters: [],
                        property: 'name',
                        subTrees: [],
                      },
                      {
                        _type: 'propertyGraphFetchTree',
                        parameters: [],
                        property: 'nEmployees',
                        subTrees: [
                          {
                            _type: 'propertyGraphFetchTree',
                            parameters: [],
                            property: 'fullName',
                            subTrees: [],
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
      ],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'unknownElement::3bbdf0a0_b0d5_11ee_84b2_efcc77532342',
    content: {
      config: {
        createdBy: 'someone',
        createdDate: '2024-01-12T23:01:02.250Z',
        data: null,
        updatedBy: 'someone',
        updatedDate: '2024-01-12T23:02:43.045Z',
      },
      datasourceName: 'datasourceName',
      datasourceType: 'someType',
      id: '3bbdf0a0-b0d5-11ee-84b2-efcc77532342',
      name: '3bbdf0a0_b0d5_11ee_84b2_efcc77532342',
      package: 'unknownElement',
    },
    classifierPath: 'meta::unknownElement',
  },
  {
    path: 'anotherUnknownElement::3bbdf0a0_b0d5_11ee_84b2_efcc77532342',
    content: {
      config: {
        createdBy: 'someone',
        createdDate: '2024-01-12T23:01:02.250Z',
        data: null,
        updatedBy: 'someone',
        updatedDate: '2024-01-12T23:02:43.045Z',
      },
      datasourceName: 'datasourceName',
      datasourceType: 'someType',
      id: '3bbdf0a0-b0d5-11ee-84b2-efcc77532342',
      name: '3bbdf0a0_b0d5_11ee_84b2_efcc77532342',
      package: 'anotherUnknownElement',
    },
    classifierPath: 'meta::anotherUnknownElement',
  },
];
