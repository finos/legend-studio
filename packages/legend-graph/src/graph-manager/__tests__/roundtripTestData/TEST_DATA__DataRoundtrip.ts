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

export const TEST_DATA__DataRoundtrip = [
  {
    path: 'my::data',
    content: {
      _type: 'dataElement',
      name: 'data',
      data: {
        _type: 'externalFormat',
        contentType: 'application/json',
        data: 'test',
      },
      package: 'my',
    },
    classifierPath: 'meta::pure::data::DataElement',
  },
  {
    path: 'my::dataWithExternalFormat',
    content: {
      _type: 'dataElement',
      name: 'dataWithExternalFormat',
      data: {
        _type: 'externalFormat',
        contentType: 'application/json',
        data: 'test',
      },
      package: 'my',
      stereotypes: [
        {
          profile: 'meta::pure::profiles::typemodifiers',
          value: 'abstract',
        },
      ],
      taggedValues: [
        {
          tag: {
            profile: 'doc',
            value: 'doc',
          },
          value: 'something',
        },
      ],
    },
    classifierPath: 'meta::pure::data::DataElement',
  },
  {
    path: 'my::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'my',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'givenNames',
          genericType: {
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
    path: 'my::dataWithModelStore',
    content: {
      _type: 'dataElement',
      name: 'dataWithModelStore',
      data: {
        _type: 'modelStore',
        modelData: [
          {
            _type: 'modelInstanceData',
            model: 'my::Person',
            instances: {
              _type: 'collection',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              values: [
                {
                  _type: 'func',
                  function: 'new',
                  parameters: [
                    {
                      _type: 'packageableElementPtr',
                      fullPath: 'my::Person',
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      values: ['dummy'],
                    },
                    {
                      _type: 'collection',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      values: [
                        {
                          _type: 'keyExpression',
                          add: false,
                          expression: {
                            _type: 'collection',
                            multiplicity: {
                              lowerBound: 2,
                              upperBound: 2,
                            },
                            values: [
                              {
                                _type: 'string',
                                multiplicity: {
                                  lowerBound: 1,
                                  upperBound: 1,
                                },
                                values: ['Fred'],
                              },
                              {
                                _type: 'string',
                                multiplicity: {
                                  lowerBound: 1,
                                  upperBound: 1,
                                },
                                values: ['William'],
                              },
                            ],
                          },
                          key: {
                            _type: 'string',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            values: ['givenNames'],
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
      package: 'my',
    },
    classifierPath: 'meta::pure::data::DataElement',
  },
];
