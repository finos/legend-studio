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

// =====================================================================
// ModelJoin association mapping roundtrip test data
// =====================================================================

/**
 * Simple ModelJoin association mapping with a basic join condition:
 *   $firm.id == $person.firmId
 */
export const TEST_DATA__ModelJoinAssociationMapping_Simple = [
  {
    path: 'test::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'test',
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
          name: 'legalName',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'firmId',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::Firm_Person',
    content: {
      _type: 'association',
      name: 'Firm_Person',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'employer',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'test::Firm',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'employees',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'test::Person',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'test::MyMapping',
    content: {
      _type: 'mapping',
      associationMappings: [
        {
          _type: 'modelJoin',
          association: {
            path: 'test::Firm_Person',
            type: 'ASSOCIATION',
          },
          joinCondition: {
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
                        name: '_mj_src',
                      },
                    ],
                    property: 'id',
                  },
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: '_mj_tgt',
                      },
                    ],
                    property: 'firmId',
                  },
                ],
              },
            ],
            parameters: [],
          },
          stores: [],
        },
      ],
      classMappings: [
        {
          _type: 'pureInstance',
          class: 'test::Person',
          id: 'p',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'test::Person',
                property: 'name',
              },
              source: '',
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
                parameters: [],
              },
            },
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'test::Person',
                property: 'firmId',
              },
              source: '',
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
                    property: 'firmId',
                  },
                ],
                parameters: [],
              },
            },
          ],
          root: false,
          srcClass: 'test::Person',
        },
        {
          _type: 'pureInstance',
          class: 'test::Firm',
          id: 'f',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'test::Firm',
                property: 'id',
              },
              source: '',
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
                    property: 'id',
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'test::Firm',
                property: 'legalName',
              },
              source: '',
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
                    property: 'legalName',
                  },
                ],
                parameters: [],
              },
            },
          ],
          root: false,
          srcClass: 'test::Firm',
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'MyMapping',
      package: 'test',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
];

/**
 * ModelJoin association mapping with an explicit id and stores
 */
export const TEST_DATA__ModelJoinAssociationMapping_WithIdAndStores = [
  {
    path: 'test::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'test',
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
              fullPath: 'String',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'firmId',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::Firm_Person',
    content: {
      _type: 'association',
      name: 'Firm_Person',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'employer',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'test::Firm',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'employees',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'test::Person',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'test::MyMapping',
    content: {
      _type: 'mapping',
      associationMappings: [
        {
          _type: 'modelJoin',
          association: {
            path: 'test::Firm_Person',
            type: 'ASSOCIATION',
          },
          id: 'myModelJoinId',
          joinCondition: {
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
                        name: '_mj_src',
                      },
                    ],
                    property: 'id',
                  },
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: '_mj_tgt',
                      },
                    ],
                    property: 'firmId',
                  },
                ],
              },
            ],
            parameters: [],
          },
          stores: [],
        },
      ],
      classMappings: [
        {
          _type: 'pureInstance',
          class: 'test::Person',
          id: 'p',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'test::Person',
                property: 'firmId',
              },
              source: '',
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
                    property: 'firmId',
                  },
                ],
                parameters: [],
              },
            },
          ],
          root: false,
          srcClass: 'test::Person',
        },
        {
          _type: 'pureInstance',
          class: 'test::Firm',
          id: 'f',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'test::Firm',
                property: 'id',
              },
              source: '',
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
                    property: 'id',
                  },
                ],
                parameters: [],
              },
            },
          ],
          root: false,
          srcClass: 'test::Firm',
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'MyMapping',
      package: 'test',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
];

/**
 * ModelJoin with a complex join condition using 'and':
 *   $firm.id == $person.firmId && $firm.legalName == $person.name
 */
export const TEST_DATA__ModelJoinAssociationMapping_ComplexCondition = [
  {
    path: 'test::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'test',
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
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'legalName',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'firmId',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::Firm_Person',
    content: {
      _type: 'association',
      name: 'Firm_Person',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'employer',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'test::Firm',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'employees',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'test::Person',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'test::MyMapping',
    content: {
      _type: 'mapping',
      associationMappings: [
        {
          _type: 'modelJoin',
          association: {
            path: 'test::Firm_Person',
            type: 'ASSOCIATION',
          },
          joinCondition: {
            _type: 'lambda',
            body: [
              {
                _type: 'func',
                function: 'and',
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
                            name: '_mj_src',
                          },
                        ],
                        property: 'id',
                      },
                      {
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: '_mj_tgt',
                          },
                        ],
                        property: 'firmId',
                      },
                    ],
                  },
                  {
                    _type: 'func',
                    function: 'equal',
                    parameters: [
                      {
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: '_mj_src',
                          },
                        ],
                        property: 'legalName',
                      },
                      {
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: '_mj_tgt',
                          },
                        ],
                        property: 'name',
                      },
                    ],
                  },
                ],
              },
            ],
            parameters: [],
          },
          stores: [],
        },
      ],
      classMappings: [
        {
          _type: 'pureInstance',
          class: 'test::Person',
          id: 'p',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'test::Person',
                property: 'firmId',
              },
              source: '',
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
                    property: 'firmId',
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'test::Person',
                property: 'name',
              },
              source: '',
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
                parameters: [],
              },
            },
          ],
          root: false,
          srcClass: 'test::Person',
        },
        {
          _type: 'pureInstance',
          class: 'test::Firm',
          id: 'f',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'test::Firm',
                property: 'id',
              },
              source: '',
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
                    property: 'id',
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'test::Firm',
                property: 'legalName',
              },
              source: '',
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
                    property: 'legalName',
                  },
                ],
                parameters: [],
              },
            },
          ],
          root: false,
          srcClass: 'test::Firm',
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'MyMapping',
      package: 'test',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
];
