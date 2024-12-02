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

export const TEST_DATA__MissingSuperType = [
  {
    classifierPath: 'meta::pure::metamodel::type::Class',
    path: 'ui::test1::Animal',
    content: {
      _type: 'class',
      name: 'Animal',
      package: 'ui::test1',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'legs',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'arms',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
      ],
      superTypes: ['ui::test1::Organism'],
    },
  },
];

export const TEST_DATA__MissingProfile = [
  {
    classifierPath: 'meta::pure::metamodel::type::Class',
    path: 'ui::test1::Anyone',
    content: {
      _type: 'class',
      name: 'Anyone',
      package: 'ui::test1',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'legs',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'arms',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
      ],
      superTypes: [],
      taggedValues: [
        {
          tag: {
            profile: 'ui::test1::ProfileTest',
            value: 'tag1',
          },
          value: 'hello',
        },
      ],
    },
  },
];

export const TEST_DATA__MissingStereoType = [
  {
    classifierPath: 'meta::pure::metamodel::type::Class',
    path: 'ui::test2::Broken',
    content: {
      _type: 'class',
      name: 'Broken',
      package: 'ui::test2',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'id',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
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
          name: 'type',
          type: 'String',
        },
      ],
      stereotypes: [
        {
          profile: 'ui::meta::pure::profiles::TestProfile',
          value: 'missingStereotype',
        },
      ],
    },
  },
  {
    classifierPath: 'meta::pure::metamodel::extension::Profile',
    path: 'ui::meta::pure::profiles::TestProfile',
    content: {
      _type: 'profile',
      name: 'TestProfile',
      package: 'ui::meta::pure::profiles',
      stereotypes: ['testStereotype'],
      tags: ['here'],
    },
  },
];

export const TEST_DATA__MissingTagValue = [
  {
    classifierPath: 'meta::pure::metamodel::type::Class',
    path: 'ui::test2::milestoning::Broken',
    content: {
      _type: 'class',
      name: 'Broken',
      package: 'ui::test2::milestoning',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'id',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
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
          name: 'type',
          type: 'String',
        },
      ],
      taggedValues: [
        {
          tag: {
            profile: 'ui::meta::pure::profiles::TestProfile',
            value: 'missingTag',
          },
          value: 'not here',
        },
      ],
    },
  },
  {
    classifierPath: 'meta::pure::metamodel::extension::Profile',
    path: 'ui::meta::pure::profiles::TestProfile',
    content: {
      _type: 'profile',
      name: 'TestProfile',
      package: 'ui::meta::pure::profiles',
      stereotypes: ['testStereotype'],
      tags: ['here'],
    },
  },
];

export const TEST_DATA__DuplicatedElement = [
  {
    classifierPath: 'meta::pure::metamodel::type::Class',
    path: 'ui::test1::Animal',
    content: {
      _type: 'class',
      name: 'Animal',
      package: 'ui::test1',
      properties: [],
      superTypes: [],
    },
  },
  {
    classifierPath: 'meta::pure::metamodel::type::Class',
    path: 'ui::test1::Animal',
    content: {
      _type: 'class',
      name: 'Animal',
      package: 'ui::test1',
      properties: [],
      superTypes: [],
    },
  },
];

export const TEST_DATA__MissingProperty = [
  {
    classifierPath: 'meta::pure::metamodel::type::Class',
    path: 'ui::test1::Animal',
    content: {
      _type: 'class',
      name: 'Animal',
      package: 'ui::test1',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'legs',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'arms',
          type: 'ui::test1::NotFound',
        },
      ],
      superTypes: [],
    },
  },
];

export const TEST_DATA__MissingTargetClassinMapping = [
  {
    classifierPath: 'meta::pure::mapping::Mapping',
    path: 'ui::mapping::testMapping',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'pureInstance',
          class: 'ui::test1::Target_Something',
          id: 'ui_mapping_editor_domain_Target_Something',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              property: {
                class: 'ui::test1::Target_Something',
                property: 'fullName',
              },
              source: 'ui_mapping_editor_domain_Target_Something',
              target: '',
              transform: {
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
                    class: 'ui::test1::Source_Something',
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    name: 'src',
                  },
                ],
              },
            },
            {
              _type: 'purePropertyMapping',
              property: {
                class: 'ui::test1::Target_Something',
                property: 'age',
              },
              source: 'ui_mapping_editor_domain_Target_Something',
              target: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'integer',
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    values: [25],
                  },
                ],
                parameters: [
                  {
                    _type: 'var',
                    class: 'ui::test1::Source_Something',
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    name: 'src',
                  },
                ],
              },
            },
            {
              _type: 'purePropertyMapping',
              property: {
                class: 'ui::test1::Target_Something',
                property: 'description',
              },
              source: 'ui_mapping_editor_domain_Target_Something',
              target: '',
              transform: {
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
                    property: 'lastName',
                  },
                ],
                parameters: [
                  {
                    _type: 'var',
                    class: 'ui::test1::Source_Something',
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    name: 'src',
                  },
                ],
              },
            },
          ],
          root: false,
          srcClass: 'ui::test1::Source_Something',
        },
        {
          _type: 'pureInstance',
          class: 'ui::test1::Target_Something',
          id: 'targetSomething',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              property: {
                class: 'ui::test1::Target_Something',
                property: 'fullName',
              },
              source: 'targetSomething',
              target: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'string',
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    values: ['bye'],
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'purePropertyMapping',
              property: {
                class: 'ui::test1::Target_Something',
                property: 'age',
              },
              source: 'targetSomething',
              target: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'integer',
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    values: [11],
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'purePropertyMapping',
              property: {
                class: 'ui::test1::Target_Something',
                property: 'description',
              },
              source: 'targetSomething',
              target: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'string',
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    values: ['hello'],
                  },
                ],
                parameters: [],
              },
            },
          ],
          root: false,
        },
        {
          _type: 'operation',
          class: 'ui::test1::Target_Something',
          id: 'unionOfSomething',
          operation: 'STORE_UNION',
          parameters: [
            'ui_mapping_editor_domain_Target_Something',
            'targetSomething',
          ],
          root: true,
        },
      ],
      enumerationMappings: [],
      name: 'testMapping',
      package: 'ui::mapping',
    },
  },
];

export const TEST_DATA__MissingClassMappingWithTargetId = [
  {
    path: 'ui::Employeer',
    content: {
      _type: 'class',
      constraints: [],
      name: 'Employeer',
      originalMilestonedProperties: [],
      package: 'ui',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'name',
          stereotypes: [],
          taggedValues: [],
          type: 'String',
        },
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'employees',
          stereotypes: [],
          taggedValues: [],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
      ],
      qualifiedProperties: [],
      stereotypes: [],
      superTypes: [],
      taggedValues: [],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'ui::Person',
    content: {
      _type: 'class',
      constraints: [],
      name: 'Person',
      originalMilestonedProperties: [],
      package: 'ui',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'name',
          stereotypes: [],
          taggedValues: [],
          type: 'String',
        },
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'employer',
          stereotypes: [],
          taggedValues: [],
          type: 'ui::Employeer',
        },
      ],
      qualifiedProperties: [],
      stereotypes: [],
      superTypes: [],
      taggedValues: [],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'ui::PersonSource',
    content: {
      _type: 'class',
      constraints: [],
      name: 'PersonSource',
      originalMilestonedProperties: [],
      package: 'ui',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'name',
          stereotypes: [],
          taggedValues: [],
          type: 'String',
        },
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'employer',
          stereotypes: [],
          taggedValues: [],
          type: 'String',
        },
      ],
      qualifiedProperties: [],
      stereotypes: [],
      superTypes: [],
      taggedValues: [],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'ui::myMap',
    content: {
      _type: 'mapping',
      associationMappings: [],
      classMappings: [
        {
          _type: 'pureInstance',
          class: 'ui::Person',
          id: 'ui_Person',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: { class: 'ui::Person', property: 'name' },
              source: 'ui_Person',
              target: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'string',
                    multiplicity: { lowerBound: 1, upperBound: 1 },
                    values: ['string'],
                  },
                ],
                parameters: [
                  {
                    _type: 'var',
                    class: 'ui::PersonSource',
                    multiplicity: { lowerBound: 1, upperBound: 1 },
                    name: 'src',
                  },
                ],
              },
            },
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: { class: 'ui::Person', property: 'employer' },
              source: 'ui_Person',
              target: 'notFound',
              transform: {
                _type: 'lambda',
                body: [{ _type: 'var', name: 'src' }],
                parameters: [
                  {
                    _type: 'var',
                    class: 'ui::PersonSource',
                    multiplicity: { lowerBound: 1, upperBound: 1 },
                    name: 'src',
                  },
                ],
              },
            },
          ],
          root: true,
          srcClass: 'ui::PersonSource',
        },
        {
          _type: 'pureInstance',
          class: 'ui::Employeer',
          id: 'ui__Employee',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: { class: 'ui::Employeer', property: 'name' },
              source: 'ui__Employee',
              target: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'string',
                    multiplicity: { lowerBound: 1, upperBound: 1 },
                    values: ['string'],
                  },
                ],
                parameters: [
                  {
                    _type: 'var',
                    class: 'ui::PersonSource',
                    multiplicity: { lowerBound: 1, upperBound: 1 },
                    name: 'src',
                  },
                ],
              },
            },
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: { class: 'ui::Employeer', property: 'employees' },
              source: 'ui__Employee',
              target: '',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'integer',
                    multiplicity: { lowerBound: 1, upperBound: 1 },
                    values: [4],
                  },
                ],
                parameters: [
                  {
                    _type: 'var',
                    class: 'ui::PersonSource',
                    multiplicity: { lowerBound: 1, upperBound: 1 },
                    name: 'src',
                  },
                ],
              },
            },
          ],
          root: true,
          srcClass: 'ui::PersonSource',
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'myMap',
      package: 'ui',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
];

export const TEST_DATA__DuplicateEnumerationValues = [
  {
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
    path: 'test::enum',
    content: {
      _type: 'Enumeration',
      name: 'enum',
      package: 'test',
      values: [
        {
          value: 'enum_value',
        },
        {
          value: 'enum_value',
        },
      ],
    },
  },
];

export const TEST_DATA__DuplicateProfileTags = [
  {
    classifierPath: 'meta::pure::metamodel::extension::Profile',
    path: 'test::profile1',
    content: {
      _type: 'profile',
      name: 'profile1',
      package: 'test',
      tags: ['tag1', 'tag1'],
    },
  },
];

export const TEST_DATA__DuplicateProfileStereotypes = [
  {
    classifierPath: 'meta::pure::metamodel::extension::Profile',
    path: 'test::profile2',
    content: {
      _type: 'profile',
      name: 'profile2',
      package: 'test',
      stereotypes: ['stereotype1', 'stereotype1'],
    },
  },
];

export const TEST_DATA__DuplicateClassProperties = [
  {
    classifierPath: 'meta::pure::metamodel::type::Class',
    path: 'test::class',
    content: {
      _type: 'class',
      name: 'class',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'abc',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'abc',
          type: 'String',
        },
      ],
    },
  },
];

export const TEST_DATA__DuplicateAssociationProperties = [
  {
    classifierPath: 'meta::pure::metamodel::relationship::Association',
    path: 'test::association',
    content: {
      _type: 'association',
      name: 'association',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'abc',
          type: 'pack::class',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'abc',
          type: 'pack::c',
        },
      ],
    },
  },
];

export const TEST_DATA__InvalidAssociationProperty = [
  {
    path: 'test::class',
    content: {
      _type: 'class',
      name: 'class',
      package: 'test',
      properties: [
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
          name: 'p',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::association',
    content: {
      _type: 'association',
      name: 'association',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'p',
          type: 'meta::pure::tds::TabularDataSet',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'q',
          type: 'test::class',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
];

export const TEST_DATA__UnknownElement = [
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
];
