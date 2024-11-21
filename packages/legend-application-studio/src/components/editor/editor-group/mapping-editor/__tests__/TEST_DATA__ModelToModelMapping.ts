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

export const TEST_DATA__ModelToModelMappingAnalysis = {
  mappedEntities: [
    {
      path: 'model::target::_Firm',
      properties: [
        {
          _type: 'entity',
          entityPath: 'model::target::_Person',
          name: 'employees',
        },
        {
          _type: 'MappedProperty',
          name: 'name',
        },
        {
          _type: 'MappedProperty',
          name: 'myLegalName',
        },
      ],
    },
    {
      path: 'model::target::_Person',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'fullName',
        },
      ],
    },
  ],
};

export const TEST_DATA__ModelToModelMapping = [
  {
    path: 'model::target::IncType',
    content: {
      _type: 'Enumeration',
      name: 'IncType',
      package: 'model::target',
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
    path: 'model::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'model',
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
    path: 'model::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'model',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
          },
          name: 'employees',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'model::Person',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'legalName',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'model::target::_Firm',
    content: {
      _type: 'class',
      name: '_Firm',
      package: 'model::target',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
          },
          name: 'employees',
          type: 'model::target::_Person',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          type: 'String',
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
                    endColumn: 44,
                    endLine: 35,
                    sourceId: '',
                    startColumn: 33,
                    startLine: 35,
                  },
                  values: [
                    {
                      _type: 'string',
                      sourceInformation: {
                        endColumn: 31,
                        endLine: 35,
                        sourceId: '',
                        startColumn: 18,
                        startLine: 35,
                      },
                      value: 'my name is: ',
                    },
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 39,
                            endLine: 35,
                            sourceId: '',
                            startColumn: 35,
                            startLine: 35,
                          },
                        },
                      ],
                      property: 'name',
                      sourceInformation: {
                        endColumn: 44,
                        endLine: 35,
                        sourceId: '',
                        startColumn: 41,
                        startLine: 35,
                      },
                    },
                  ],
                },
              ],
              sourceInformation: {
                endColumn: 44,
                endLine: 35,
                sourceId: '',
                startColumn: 33,
                startLine: 35,
              },
            },
          ],
          name: 'myLegalName',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'model::target::_Person',
    content: {
      _type: 'class',
      name: '_Person',
      package: 'model::target',
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
    path: 'mapping::ModelToModelMapping',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'pureInstance',
          class: 'model::target::_Person',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'model::target::_Person',
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
                        multiplicity: {
                          lowerBound: 3,
                          upperBound: 3,
                        },
                        values: [
                          {
                            _type: 'property',
                            parameters: [
                              {
                                _type: 'var',
                                name: 'src',
                              },
                            ],
                            property: 'firstName',
                          },
                          {
                            _type: 'string',
                            value: ' ',
                          },
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
                      },
                    ],
                  },
                ],
                parameters: [],
              },
            },
          ],
          root: true,
          srcClass: 'model::Person',
        },
        {
          _type: 'pureInstance',
          class: 'model::target::_Firm',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'model::target::_Firm',
                property: 'employees',
              },
              source: '',
              target: 'model_target__Person',
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
                    property: 'employees',
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'model::target::_Firm',
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
                    property: 'legalName',
                  },
                ],
                parameters: [],
              },
            },
          ],
          root: true,
          srcClass: 'model::Firm',
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
                  value: 'llc',
                },
              ],
            },
            {
              enumValue: 'CORP',
              sourceValues: [
                {
                  _type: 'stringSourceValue',
                  value: 'corp',
                },
              ],
            },
          ],
          enumeration: 'model::target::IncType',
        },
      ],
      includedMappings: [],
      name: 'ModelToModelMapping',
      package: 'mapping',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'data::IBMFirmData',
    content: {
      _type: 'dataElement',
      data: {
        _type: 'externalFormat',
        contentType: 'application/json',
        data: '{\n  "employees": [\n    {\n      "firstName": "John",\n      "lastName": "Smith"\n    }\n  ],\n  "legalName": "IBM",\n  "type": "llc"\n}',
      },
      name: 'IBMFirmData',
      package: 'data',
    },
    classifierPath: 'meta::pure::data::DataElement',
  },
];
