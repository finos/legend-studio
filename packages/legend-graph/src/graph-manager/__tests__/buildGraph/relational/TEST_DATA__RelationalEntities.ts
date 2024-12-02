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

export const TEST_DATA__relationalCompleteGraphEntities = [
  {
    path: 'meta::pure::tests::model::simple::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'meta::pure::tests::model::simple',
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
        { multiplicity: { lowerBound: 0 }, name: 'otherNames', type: 'String' },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'extraInformation',
          type: 'String',
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'manager',
          type: 'Person',
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'age',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'nickName',
          type: 'String',
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'activeEmployment',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Boolean',
            },
          },
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
                  multiplicity: { lowerBound: 3, upperBound: 3 },
                  values: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'firstName',
                    },
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: [' '],
                    },
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'lastName',
                    },
                  ],
                },
              ],
            },
          ],
          name: 'name',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'plus',
              parameters: [
                {
                  _type: 'collection',
                  multiplicity: { lowerBound: 5, upperBound: 5 },
                  values: [
                    { _type: 'var', name: 'title' },
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: [' '],
                    },
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'firstName',
                    },
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: [' '],
                    },
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'lastName',
                    },
                  ],
                },
              ],
            },
          ],
          name: 'nameWithTitle',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'title',
            },
          ],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'if',
              parameters: [
                {
                  _type: 'func',
                  function: 'isEmpty',
                  parameters: [{ _type: 'var', name: 'prefix' }],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'if',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'isEmpty',
                          parameters: [{ _type: 'var', name: 'suffixes' }],
                        },
                        {
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
                                        { _type: 'var', name: 'this' },
                                      ],
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
                                      parameters: [
                                        { _type: 'var', name: 'this' },
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
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'plus',
                              parameters: [
                                {
                                  _type: 'collection',
                                  multiplicity: {
                                    lowerBound: 5,
                                    upperBound: 5,
                                  },
                                  values: [
                                    {
                                      _type: 'property',
                                      parameters: [
                                        { _type: 'var', name: 'this' },
                                      ],
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
                                      parameters: [
                                        { _type: 'var', name: 'this' },
                                      ],
                                      property: 'lastName',
                                    },
                                    {
                                      _type: 'string',
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                      values: [', '],
                                    },
                                    {
                                      _type: 'func',
                                      function: 'joinStrings',
                                      parameters: [
                                        { _type: 'var', name: 'suffixes' },
                                        {
                                          _type: 'string',
                                          multiplicity: {
                                            lowerBound: 1,
                                            upperBound: 1,
                                          },
                                          values: [', '],
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
                      ],
                    },
                  ],
                  parameters: [],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'if',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'isEmpty',
                          parameters: [{ _type: 'var', name: 'suffixes' }],
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'plus',
                              parameters: [
                                {
                                  _type: 'collection',
                                  multiplicity: {
                                    lowerBound: 5,
                                    upperBound: 5,
                                  },
                                  values: [
                                    {
                                      _type: 'func',
                                      function: 'toOne',
                                      parameters: [
                                        { _type: 'var', name: 'prefix' },
                                      ],
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
                                      parameters: [
                                        { _type: 'var', name: 'this' },
                                      ],
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
                                      parameters: [
                                        { _type: 'var', name: 'this' },
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
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'plus',
                              parameters: [
                                {
                                  _type: 'collection',
                                  multiplicity: {
                                    lowerBound: 7,
                                    upperBound: 7,
                                  },
                                  values: [
                                    {
                                      _type: 'func',
                                      function: 'toOne',
                                      parameters: [
                                        { _type: 'var', name: 'prefix' },
                                      ],
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
                                      parameters: [
                                        { _type: 'var', name: 'this' },
                                      ],
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
                                      parameters: [
                                        { _type: 'var', name: 'this' },
                                      ],
                                      property: 'lastName',
                                    },
                                    {
                                      _type: 'string',
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                      values: [', '],
                                    },
                                    {
                                      _type: 'func',
                                      function: 'joinStrings',
                                      parameters: [
                                        { _type: 'var', name: 'suffixes' },
                                        {
                                          _type: 'string',
                                          multiplicity: {
                                            lowerBound: 1,
                                            upperBound: 1,
                                          },
                                          values: [', '],
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
                      ],
                    },
                  ],
                  parameters: [],
                },
              ],
            },
          ],
          name: 'nameWithPrefixAndSuffix',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: { lowerBound: 0, upperBound: 1 },
              name: 'prefix',
            },
            {
              _type: 'var',
              class: 'String',
              multiplicity: { lowerBound: 0 },
              name: 'suffixes',
            },
          ],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'if',
              parameters: [
                { _type: 'var', name: 'lastNameFirst' },
                {
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
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'lastName',
                            },
                            {
                              _type: 'string',
                              multiplicity: { lowerBound: 1, upperBound: 1 },
                              values: [', '],
                            },
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'firstName',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [],
                },
                {
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
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'firstName',
                            },
                            {
                              _type: 'string',
                              multiplicity: { lowerBound: 1, upperBound: 1 },
                              values: [' '],
                            },
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'lastName',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [],
                },
              ],
            },
          ],
          name: 'fullName',
          parameters: [
            {
              _type: 'var',
              class: 'Boolean',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'lastNameFirst',
            },
          ],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'if',
              parameters: [
                {
                  _type: 'property',
                  parameters: [{ _type: 'var', name: 'personNameParameter' }],
                  property: 'lastNameFirst',
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'plus',
                      parameters: [
                        {
                          _type: 'collection',
                          multiplicity: { lowerBound: 5, upperBound: 5 },
                          values: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'personNameParameter',
                                    },
                                  ],
                                  property: 'nested',
                                },
                              ],
                              property: 'prefix',
                            },
                            {
                              _type: 'string',
                              multiplicity: { lowerBound: 1, upperBound: 1 },
                              values: [' '],
                            },
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'lastName',
                            },
                            {
                              _type: 'string',
                              multiplicity: { lowerBound: 1, upperBound: 1 },
                              values: [', '],
                            },
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'firstName',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [],
                },
                {
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
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'firstName',
                            },
                            {
                              _type: 'string',
                              multiplicity: { lowerBound: 1, upperBound: 1 },
                              values: [' '],
                            },
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'lastName',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [],
                },
              ],
            },
          ],
          name: 'parameterizedName',
          parameters: [
            {
              _type: 'var',
              class: 'PersonNameParameter',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'personNameParameter',
            },
          ],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'removeDuplicates',
              parameters: [
                {
                  _type: 'func',
                  function: 'concatenate',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'organizations',
                    },
                    {
                      _type: 'func',
                      function: 'map',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [{ _type: 'var', name: 'this' }],
                          property: 'organizations',
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'o' }],
                              property: 'superOrganizations',
                            },
                          ],
                          parameters: [{ _type: 'var', name: 'o' }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'allOrganizations',
          parameters: [],
          returnMultiplicity: { lowerBound: 0 },
          returnType: 'Organization',
        },
        {
          body: [
            {
              _type: 'string',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              values: ['constant'],
            },
          ],
          name: 'constant',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'concatenate',
              parameters: [
                {
                  _type: 'property',
                  parameters: [{ _type: 'var', name: 'this' }],
                  property: 'address',
                },
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'firm',
                    },
                  ],
                  property: 'address',
                },
              ],
            },
          ],
          name: 'addresses',
          parameters: [],
          returnMultiplicity: { lowerBound: 0 },
          returnType: 'Address',
        },
      ],
      superTypes: ['EntityWithAddress', 'EntityWithLocations'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'legalName',
          type: 'String',
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'nickName',
          type: 'String',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'times',
              parameters: [
                {
                  _type: 'collection',
                  multiplicity: { lowerBound: 2, upperBound: 2 },
                  values: [
                    {
                      _type: 'func',
                      function: 'average',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'employees',
                            },
                          ],
                          property: 'age',
                        },
                      ],
                    },
                    {
                      _type: 'float',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: [2],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'averageEmployeesAge',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'sum',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'employees',
                    },
                  ],
                  property: 'age',
                },
              ],
            },
          ],
          name: 'sumEmployeesAge',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'max',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'employees',
                    },
                  ],
                  property: 'age',
                },
              ],
            },
          ],
          name: 'maxEmployeesAge',
          parameters: [],
          returnMultiplicity: { lowerBound: 0, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
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
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'legalName',
                    },
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: [','],
                    },
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'toOne',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'address',
                            },
                          ],
                        },
                      ],
                      property: 'name',
                    },
                  ],
                },
              ],
            },
          ],
          name: 'nameAndAddress',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
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
                      _type: 'func',
                      function: 'toOne',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [{ _type: 'var', name: 'this' }],
                          property: 'legalName',
                        },
                      ],
                    },
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: ['Firm X'],
                    },
                  ],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: ['Yes'],
                    },
                  ],
                  parameters: [],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: ['No'],
                    },
                  ],
                  parameters: [],
                },
              ],
            },
          ],
          name: 'isfirmX',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
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
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'legalName',
                    },
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: ['Firm X'],
                    },
                  ],
                },
                {
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
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'legalName',
                            },
                            {
                              _type: 'string',
                              multiplicity: { lowerBound: 1, upperBound: 1 },
                              values: [' , Top Secret'],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [],
                },
                {
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
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'legalName',
                            },
                            {
                              _type: 'string',
                              multiplicity: { lowerBound: 1, upperBound: 1 },
                              values: [','],
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'func',
                                  function: 'toOne',
                                  parameters: [
                                    {
                                      _type: 'property',
                                      parameters: [
                                        { _type: 'var', name: 'this' },
                                      ],
                                      property: 'address',
                                    },
                                  ],
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
              ],
            },
          ],
          name: 'nameAndMaskedAddress',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'toOne',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'employees',
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'e' }],
                              property: 'lastName',
                            },
                            { _type: 'var', name: 'lastName' },
                          ],
                        },
                      ],
                      parameters: [{ _type: 'var', name: 'e' }],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'employeeByLastName',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'lastName',
            },
          ],
          returnMultiplicity: { lowerBound: 0, upperBound: 1 },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'property',
              parameters: [
                {
                  _type: 'func',
                  function: 'toOne',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'filter',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [{ _type: 'var', name: 'this' }],
                          property: 'employees',
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'equal',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [{ _type: 'var', name: 'e' }],
                                  property: 'lastName',
                                },
                                { _type: 'var', name: 'lastName' },
                              ],
                            },
                          ],
                          parameters: [{ _type: 'var', name: 'e' }],
                        },
                      ],
                    },
                  ],
                },
              ],
              property: 'firstName',
            },
          ],
          name: 'employeeByLastNameFirstName',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'lastName',
            },
          ],
          returnMultiplicity: { lowerBound: 0, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'toOne',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'employees',
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            { _type: 'var', name: 'lastName' },
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'e' }],
                              property: 'lastName',
                            },
                          ],
                        },
                      ],
                      parameters: [{ _type: 'var', name: 'e' }],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'employeeByLastNameWhereVarIsFirstEqualArg',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'lastName',
            },
          ],
          returnMultiplicity: { lowerBound: 0, upperBound: 1 },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'property',
                  parameters: [{ _type: 'var', name: 'this' }],
                  property: 'employees',
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'lessThan',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'toOne',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'e' }],
                              property: 'age',
                            },
                          ],
                        },
                        { _type: 'var', name: 'age' },
                      ],
                    },
                  ],
                  parameters: [{ _type: 'var', name: 'e' }],
                },
              ],
            },
          ],
          name: 'employeesByAge',
          parameters: [
            {
              _type: 'var',
              class: 'Integer',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'age',
            },
          ],
          returnMultiplicity: { lowerBound: 0 },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'property',
                  parameters: [{ _type: 'var', name: 'this' }],
                  property: 'employees',
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'or',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [{ _type: 'var', name: 'e' }],
                                  property: 'address',
                                },
                              ],
                              property: 'name',
                            },
                            { _type: 'var', name: 'city' },
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
                                  _type: 'property',
                                  parameters: [{ _type: 'var', name: 'e' }],
                                  property: 'manager',
                                },
                              ],
                              property: 'name',
                            },
                            { _type: 'var', name: 'managerName' },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [{ _type: 'var', name: 'e' }],
                },
              ],
            },
          ],
          name: 'employeesByCityOrManager',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'city',
            },
            {
              _type: 'var',
              class: 'String',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'managerName',
            },
          ],
          returnMultiplicity: { lowerBound: 0 },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'toOne',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'employees',
                    },
                    {
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
                                  parameters: [{ _type: 'var', name: 'e' }],
                                  property: 'lastName',
                                },
                                { _type: 'var', name: 'name' },
                              ],
                            },
                            {
                              _type: 'func',
                              function: 'or',
                              parameters: [
                                {
                                  _type: 'func',
                                  function: 'equal',
                                  parameters: [
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'property',
                                          parameters: [
                                            { _type: 'var', name: 'e' },
                                          ],
                                          property: 'address',
                                        },
                                      ],
                                      property: 'name',
                                    },
                                    { _type: 'var', name: 'city' },
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
                                          _type: 'property',
                                          parameters: [
                                            { _type: 'var', name: 'e' },
                                          ],
                                          property: 'manager',
                                        },
                                      ],
                                      property: 'name',
                                    },
                                    { _type: 'var', name: 'managerName' },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                      parameters: [{ _type: 'var', name: 'e' }],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'employeesByCityOrManagerAndLastName',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'name',
            },
            {
              _type: 'var',
              class: 'String',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'city',
            },
            {
              _type: 'var',
              class: 'String',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'managerName',
            },
          ],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'exists',
              parameters: [
                {
                  _type: 'property',
                  parameters: [{ _type: 'var', name: 'this' }],
                  property: 'employees',
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'lessThan',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'toOne',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'e' }],
                              property: 'age',
                            },
                          ],
                        },
                        { _type: 'var', name: 'age' },
                      ],
                    },
                  ],
                  parameters: [{ _type: 'var', name: 'e' }],
                },
              ],
            },
          ],
          name: 'hasEmployeeBelowAge',
          parameters: [
            {
              _type: 'var',
              class: 'Integer',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'age',
            },
          ],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Boolean',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'first',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'employees',
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'e' }],
                              property: 'name',
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [{ _type: 'var', name: 'this' }],
                                  property: 'address',
                                },
                              ],
                              property: 'name',
                            },
                          ],
                        },
                      ],
                      parameters: [{ _type: 'var', name: 'e' }],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'employeeWithFirmAddressName',
          parameters: [],
          returnMultiplicity: { lowerBound: 0, upperBound: 1 },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'first',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'employees',
                    },
                    {
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
                                  _type: 'property',
                                  parameters: [{ _type: 'var', name: 'e' }],
                                  property: 'address',
                                },
                              ],
                              property: 'name',
                            },
                            { _type: 'var', name: 'name' },
                          ],
                        },
                      ],
                      parameters: [{ _type: 'var', name: 'e' }],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'employeeWithAddressName',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'name',
            },
          ],
          returnMultiplicity: { lowerBound: 0, upperBound: 1 },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'joinStrings',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'sortBy',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'filter',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'employees',
                            },
                            {
                              _type: 'lambda',
                              body: [
                                {
                                  _type: 'func',
                                  function: 'equal',
                                  parameters: [
                                    {
                                      _type: 'func',
                                      function: 'trim',
                                      parameters: [
                                        {
                                          _type: 'func',
                                          function: 'toOne',
                                          parameters: [
                                            {
                                              _type: 'property',
                                              parameters: [
                                                {
                                                  _type: 'property',
                                                  parameters: [
                                                    { _type: 'var', name: 'e' },
                                                  ],
                                                  property: 'address',
                                                },
                                              ],
                                              property: 'name',
                                            },
                                          ],
                                        },
                                      ],
                                    },
                                    { _type: 'var', name: 'name' },
                                  ],
                                },
                              ],
                              parameters: [{ _type: 'var', name: 'e' }],
                            },
                          ],
                        },
                        {
                          _type: 'path',
                          path: [
                            {
                              _type: 'propertyPath',
                              parameters: [],
                              property: 'lastName',
                            },
                          ],
                          startType: 'Person',
                        },
                      ],
                    },
                  ],
                  property: 'lastName',
                },
                {
                  _type: 'string',
                  multiplicity: { lowerBound: 1, upperBound: 1 },
                  values: [''],
                },
              ],
            },
          ],
          name: 'employeesWithAddressNameSorted',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'name',
            },
          ],
          returnMultiplicity: { lowerBound: 0, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'func',
                  function: 'map',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'employees',
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          parameters: [{ _type: 'var', name: 'e' }],
                          property: 'address',
                        },
                      ],
                      parameters: [{ _type: 'var', name: 'e' }],
                    },
                  ],
                },
                {
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
                            { _type: 'var', name: 'name' },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [{ _type: 'var', name: 'this' }],
                                  property: 'address',
                                },
                              ],
                              property: 'name',
                            },
                          ],
                        },
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            { _type: 'var', name: 't' },
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'x' }],
                              property: 'type',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [{ _type: 'var', name: 'x' }],
                },
              ],
            },
          ],
          name: 'employeeAddressesWithFirmAddressName',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'name',
            },
            {
              _type: 'var',
              class: 'GeographicEntityType',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 't',
            },
          ],
          returnMultiplicity: { lowerBound: 0 },
          returnType: 'Address',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'in',
              parameters: [
                {
                  _type: 'property',
                  parameters: [{ _type: 'var', name: 'this' }],
                  property: 'legalName',
                },
                {
                  _type: 'collection',
                  multiplicity: { lowerBound: 3, upperBound: 3 },
                  values: [
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: ['Firm X'],
                    },
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: ['Firm X & Co.'],
                    },
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: ['Firm X and Group'],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'isfirmXGroup',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Boolean',
            },
          },
        },
      ],
      superTypes: ['EntityWithAddress'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::FirmExtension',
    content: {
      _type: 'class',
      name: 'FirmExtension',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'establishedDate',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Date',
            },
          },
        },
        {
          multiplicity: { lowerBound: 0 },
          name: 'employeesExt',
          type: 'meta::pure::tests::model::simple::PersonExtension',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'year',
              parameters: [
                {
                  _type: 'property',
                  parameters: [{ _type: 'var', name: 'this' }],
                  property: 'establishedDate',
                },
              ],
            },
          ],
          name: 'establishedYear',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'joinStrings',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'employeesExt',
                    },
                  ],
                  property: 'lastName',
                },
                {
                  _type: 'string',
                  multiplicity: { lowerBound: 1, upperBound: 1 },
                  values: [','],
                },
              ],
            },
          ],
          name: 'allEmployeesLastName',
          parameters: [],
          returnMultiplicity: { lowerBound: 0, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
      superTypes: ['Firm'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Address',
    content: {
      _type: 'class',
      name: 'Address',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'name',
          type: 'String',
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'street',
          type: 'String',
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'comments',
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
                  multiplicity: { lowerBound: 2, upperBound: 2 },
                  values: [
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: ['D:'],
                    },
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'name',
                    },
                  ],
                },
              ],
            },
          ],
          name: 'description',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
      superTypes: ['GeographicEntity'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Location',
    content: {
      _type: 'class',
      name: 'Location',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'place',
          type: 'String',
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'censusdate',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Date',
            },
          },
        },
      ],
      superTypes: ['GeographicEntity'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::PlaceOfInterest',
    content: {
      _type: 'class',
      name: 'PlaceOfInterest',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'name',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::PersonExtension',
    content: {
      _type: 'class',
      name: 'PersonExtension',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'birthdate',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Date',
            },
          },
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'year',
              parameters: [
                {
                  _type: 'property',
                  parameters: [{ _type: 'var', name: 'this' }],
                  property: 'birthdate',
                },
              ],
            },
          ],
          name: 'birthYear',
          parameters: [],
          returnMultiplicity: { lowerBound: 0, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
      ],
      superTypes: ['meta::pure::tests::model::simple::Person'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Product',
    content: {
      _type: 'class',
      name: 'Product',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'name',
          type: 'String',
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'classification',
          type: 'ProductClassification',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'property',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    { _type: 'var', name: 'this' },
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'packageableElementPtr',
                          fullPath: 'ProductSynonymType',
                        },
                      ],
                      property: 'CUSIP',
                    },
                  ],
                  property: 'synonymByType',
                },
              ],
              property: 'name',
            },
          ],
          name: 'cusip',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'property',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    { _type: 'var', name: 'this' },
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'packageableElementPtr',
                          fullPath: 'ProductSynonymType',
                        },
                      ],
                      property: 'ISIN',
                    },
                  ],
                  property: 'synonymByType',
                },
              ],
              property: 'name',
            },
          ],
          name: 'isin',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'property',
              parameters: [
                { _type: 'var', name: 'this' },
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'packageableElementPtr',
                      fullPath: 'ProductSynonymType',
                    },
                  ],
                  property: 'CUSIP',
                },
              ],
              property: 'synonymByType',
            },
          ],
          name: 'cusipSynonym',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnType: 'Synonym',
        },
        {
          body: [
            {
              _type: 'property',
              parameters: [
                { _type: 'var', name: 'this' },
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'packageableElementPtr',
                      fullPath: 'ProductSynonymType',
                    },
                  ],
                  property: 'ISIN',
                },
              ],
              property: 'synonymByType',
            },
          ],
          name: 'isinSynonym',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnType: 'Synonym',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Synonym',
    content: {
      _type: 'class',
      name: 'Synonym',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'typeAsString',
          type: 'String',
        },
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'type',
          type: 'ProductSynonymType',
        },
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'name',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Trade',
    content: {
      _type: 'class',
      name: 'Trade',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'id',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'date',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'StrictDate',
            },
          },
        },
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'quantity',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'product',
          type: 'Product',
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'settlementDateTime',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'DateTime',
            },
          },
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'latestEventDate',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'StrictDate',
            },
          },
        },
        { multiplicity: { lowerBound: 0 }, name: 'events', type: 'TradeEvent' },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'if',
              parameters: [
                {
                  _type: 'func',
                  function: 'isNotEmpty',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'product',
                    },
                  ],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'if',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'isNotEmpty',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [{ _type: 'var', name: 'this' }],
                                  property: 'product',
                                },
                              ],
                              property: 'cusip',
                            },
                          ],
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'toOne',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'property',
                                      parameters: [
                                        { _type: 'var', name: 'this' },
                                      ],
                                      property: 'product',
                                    },
                                  ],
                                  property: 'cusip',
                                },
                              ],
                            },
                          ],
                          parameters: [],
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'func',
                                  function: 'toOne',
                                  parameters: [
                                    {
                                      _type: 'property',
                                      parameters: [
                                        { _type: 'var', name: 'this' },
                                      ],
                                      property: 'product',
                                    },
                                  ],
                                },
                              ],
                              property: 'name',
                            },
                          ],
                          parameters: [],
                        },
                      ],
                    },
                  ],
                  parameters: [],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: ['Unknown'],
                    },
                  ],
                  parameters: [],
                },
              ],
            },
          ],
          name: 'productIdentifier',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'property',
                  parameters: [{ _type: 'var', name: 'this' }],
                  property: 'product',
                },
                {
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
                              parameters: [{ _type: 'var', name: 'p' }],
                              property: 'name',
                            },
                            {
                              _type: 'string',
                              multiplicity: { lowerBound: 1, upperBound: 1 },
                              values: [' test'],
                            },
                          ],
                        },
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'date',
                            },
                            {
                              _type: 'strictDate',
                              multiplicity: { lowerBound: 1, upperBound: 1 },
                              values: ['2020-01-01'],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [{ _type: 'var', name: 'p' }],
                },
              ],
            },
          ],
          name: 'filterProductByNameAndTradeDate',
          parameters: [],
          returnMultiplicity: { lowerBound: 0 },
          returnType: 'Product',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'letFunction',
              parameters: [
                {
                  _type: 'string',
                  multiplicity: { lowerBound: 1, upperBound: 1 },
                  values: ['clasfByProductName'],
                },
                {
                  _type: 'func',
                  function: 'toOne',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'filter',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'product',
                            },
                            {
                              _type: 'lambda',
                              body: [
                                {
                                  _type: 'func',
                                  function: 'equal',
                                  parameters: [
                                    {
                                      _type: 'property',
                                      parameters: [{ _type: 'var', name: 'p' }],
                                      property: 'name',
                                    },
                                    {
                                      _type: 'string',
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                      values: [' test'],
                                    },
                                  ],
                                },
                              ],
                              parameters: [{ _type: 'var', name: 'p' }],
                            },
                          ],
                        },
                        {
                          _type: 'strictDate',
                          multiplicity: { lowerBound: 1, upperBound: 1 },
                          values: ['2020-01-01'],
                        },
                      ],
                      property: 'classification',
                    },
                  ],
                },
              ],
            },
            {
              _type: 'property',
              parameters: [{ _type: 'var', name: 'clasfByProductName' }],
              property: 'type',
            },
          ],
          name: 'classificationType',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'if',
              parameters: [
                {
                  _type: 'func',
                  function: 'isEmpty',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'product',
                    },
                  ],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: ['Unknown'],
                    },
                  ],
                  parameters: [],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'toOne',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'product',
                            },
                          ],
                        },
                      ],
                      property: 'name',
                    },
                  ],
                  parameters: [],
                },
              ],
            },
          ],
          name: 'productDescription',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'if',
              parameters: [
                {
                  _type: 'func',
                  function: 'isNotEmpty',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'account',
                    },
                  ],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'toOne',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'account',
                            },
                          ],
                        },
                      ],
                      property: 'name',
                    },
                  ],
                  parameters: [],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: ['Unknown'],
                    },
                  ],
                  parameters: [],
                },
              ],
            },
          ],
          name: 'accountDescription',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'if',
              parameters: [
                {
                  _type: 'func',
                  function: 'isNotEmpty',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'product',
                    },
                  ],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'if',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'isNotEmpty',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [{ _type: 'var', name: 'this' }],
                                  property: 'product',
                                },
                              ],
                              property: 'cusip',
                            },
                          ],
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [{ _type: 'var', name: 'this' }],
                                  property: 'product',
                                },
                              ],
                              property: 'cusip',
                            },
                          ],
                          parameters: [],
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [{ _type: 'var', name: 'this' }],
                                  property: 'product',
                                },
                              ],
                              property: 'name',
                            },
                          ],
                          parameters: [],
                        },
                      ],
                    },
                  ],
                  parameters: [],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'collection',
                      multiplicity: { lowerBound: 0, upperBound: 0 },
                      values: [],
                    },
                  ],
                  parameters: [],
                },
              ],
            },
          ],
          name: 'productIdentifierWithNull',
          parameters: [],
          returnMultiplicity: { lowerBound: 0, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'minus',
              parameters: [
                {
                  _type: 'property',
                  parameters: [{ _type: 'var', name: 'this' }],
                  property: 'quantity',
                },
              ],
            },
          ],
          name: 'customerQuantity',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'dateDiff',
              parameters: [
                {
                  _type: 'func',
                  function: 'toOne',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'latestEventDate',
                    },
                  ],
                },
                {
                  _type: 'property',
                  parameters: [{ _type: 'var', name: 'this' }],
                  property: 'date',
                },
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'packageableElementPtr',
                      fullPath: 'DurationUnit',
                    },
                  ],
                  property: 'DAYS',
                },
              ],
            },
          ],
          name: 'daysToLastEvent',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'toOne',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'events',
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'e' }],
                              property: 'date',
                            },
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'latestEventDate',
                            },
                          ],
                        },
                      ],
                      parameters: [{ _type: 'var', name: 'e' }],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'latestEvent',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnType: 'TradeEvent',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'property',
                  parameters: [{ _type: 'var', name: 'this' }],
                  property: 'events',
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'equal',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [{ _type: 'var', name: 'e' }],
                          property: 'date',
                        },
                        { _type: 'var', name: 'date' },
                      ],
                    },
                  ],
                  parameters: [{ _type: 'var', name: 'e' }],
                },
              ],
            },
          ],
          name: 'eventsByDate',
          parameters: [
            {
              _type: 'var',
              class: 'Date',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'date',
            },
          ],
          returnMultiplicity: { lowerBound: 0 },
          returnType: 'TradeEvent',
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
                      _type: 'property',
                      parameters: [
                        { _type: 'var', name: 'this' },
                        {
                          _type: 'func',
                          function: 'toOne',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'date',
                            },
                          ],
                        },
                      ],
                      property: 'eventsByDate',
                    },
                  ],
                  property: 'eventType',
                },
              ],
            },
          ],
          name: 'tradeDateEventType',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
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
                    { _type: 'var', name: 'this' },
                    {
                      _type: 'func',
                      function: 'toOne',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [{ _type: 'var', name: 'this' }],
                          property: 'date',
                        },
                      ],
                    },
                  ],
                  property: 'eventsByDate',
                },
              ],
            },
          ],
          name: 'tradeDateEvent',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnType: 'TradeEvent',
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
                      _type: 'func',
                      function: 'filter',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [{ _type: 'var', name: 'this' }],
                          property: 'events',
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'equal',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [{ _type: 'var', name: 'e' }],
                                  property: 'date',
                                },
                                {
                                  _type: 'property',
                                  parameters: [{ _type: 'var', name: 'this' }],
                                  property: 'date',
                                },
                              ],
                            },
                          ],
                          parameters: [{ _type: 'var', name: 'e' }],
                        },
                      ],
                    },
                  ],
                  property: 'eventType',
                },
              ],
            },
          ],
          name: 'tradeDateEventTypeInlined',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
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
                      _type: 'property',
                      parameters: [
                        { _type: 'var', name: 'this' },
                        {
                          _type: 'property',
                          parameters: [{ _type: 'var', name: 'this' }],
                          property: 'date',
                        },
                      ],
                      property: 'eventsByDate',
                    },
                  ],
                  property: 'initiator',
                },
              ],
            },
          ],
          name: 'initiator',
          parameters: [],
          returnMultiplicity: { lowerBound: 0, upperBound: 1 },
          returnType: 'Person',
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
                      _type: 'func',
                      function: 'filter',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [{ _type: 'var', name: 'this' }],
                          property: 'events',
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'equal',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [{ _type: 'var', name: 'e' }],
                                  property: 'date',
                                },
                                {
                                  _type: 'property',
                                  parameters: [{ _type: 'var', name: 'this' }],
                                  property: 'date',
                                },
                              ],
                            },
                          ],
                          parameters: [{ _type: 'var', name: 'e' }],
                        },
                      ],
                    },
                  ],
                  property: 'initiator',
                },
              ],
            },
          ],
          name: 'initiatorInlined',
          parameters: [],
          returnMultiplicity: { lowerBound: 0, upperBound: 1 },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'toOneMany',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'filter',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [{ _type: 'var', name: 'this' }],
                          property: 'events',
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'equal',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [{ _type: 'var', name: 'e' }],
                                  property: 'eventType',
                                },
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'property',
                                      parameters: [
                                        { _type: 'var', name: 'this' },
                                      ],
                                      property: 'product',
                                    },
                                  ],
                                  property: 'name',
                                },
                              ],
                            },
                          ],
                          parameters: [{ _type: 'var', name: 'e' }],
                        },
                      ],
                    },
                  ],
                  property: 'initiator',
                },
              ],
            },
          ],
          name: 'initiatorInlinedByProductName',
          parameters: [],
          returnMultiplicity: { lowerBound: 1 },
          returnType: 'Person',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Order',
    content: {
      _type: 'class',
      name: 'Order',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'id',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'date',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'StrictDate',
            },
          },
        },
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'quantity',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'settlementDateTime',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'DateTime',
            },
          },
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'pnl',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'pnlContact',
          type: 'Person',
        },
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'zeroPnl',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Boolean',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::OrderPnl',
    content: {
      _type: 'class',
      name: 'OrderPnl',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'pnl',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'supportContactName',
          type: 'String',
        },
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'order',
          type: 'Order',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::AccountPnl',
    content: {
      _type: 'class',
      name: 'AccountPnl',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'pnl',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::TradeEvent',
    content: {
      _type: 'class',
      name: 'TradeEvent',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'eventType',
          type: 'String',
        },
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'date',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'StrictDate',
            },
          },
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'initiator',
          type: 'Person',
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'traderAddress',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Account',
    content: {
      _type: 'class',
      name: 'Account',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'name',
          type: 'String',
        },
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'createDate',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'StrictDate',
            },
          },
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'if',
              parameters: [
                {
                  _type: 'func',
                  function: 'in',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'name',
                    },
                    {
                      _type: 'collection',
                      multiplicity: { lowerBound: 2, upperBound: 2 },
                      values: [
                        {
                          _type: 'string',
                          multiplicity: { lowerBound: 1, upperBound: 1 },
                          values: ['Account 1'],
                        },
                        {
                          _type: 'string',
                          multiplicity: { lowerBound: 1, upperBound: 1 },
                          values: ['Account 2'],
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: ['A'],
                    },
                  ],
                  parameters: [],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: ['B'],
                    },
                  ],
                  parameters: [],
                },
              ],
            },
          ],
          name: 'accountCategory',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'if',
              parameters: [
                {
                  _type: 'func',
                  function: 'contains',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'name',
                    },
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: ['2'],
                    },
                  ],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'boolean',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
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
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: [false],
                    },
                  ],
                  parameters: [],
                },
              ],
            },
          ],
          name: 'isTypeA',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Boolean',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Interaction',
    content: {
      _type: 'class',
      name: 'Interaction',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'id',
          type: 'String',
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'source',
          type: 'Person',
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'target',
          type: 'Person',
        },
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'active',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Boolean',
            },
          },
        },
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'time',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'longestInteractionBetweenSourceAndTarget',
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
    path: 'meta::pure::tests::model::simple::EntityWithAddress',
    content: {
      _type: 'class',
      name: 'EntityWithAddress',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'address',
          type: 'Address',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::EntityWithLocations',
    content: {
      _type: 'class',
      name: 'EntityWithLocations',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 0 },
          name: 'locations',
          type: 'Location',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'property',
                  parameters: [{ _type: 'var', name: 'this' }],
                  property: 'locations',
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'exists',
                      parameters: [
                        { _type: 'var', name: 'types' },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'is',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [{ _type: 'var', name: 'l' }],
                                  property: 'type',
                                },
                                { _type: 'var', name: 'type' },
                              ],
                            },
                          ],
                          parameters: [{ _type: 'var', name: 'type' }],
                        },
                      ],
                    },
                  ],
                  parameters: [{ _type: 'var', name: 'l' }],
                },
              ],
            },
          ],
          name: 'locationsByType',
          parameters: [
            {
              _type: 'var',
              class: 'GeographicEntityType',
              multiplicity: { lowerBound: 0 },
              name: 'types',
            },
          ],
          returnMultiplicity: { lowerBound: 0 },
          returnType: 'Location',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::GeographicEntity',
    content: {
      _type: 'class',
      name: 'GeographicEntity',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'type',
          type: 'GeographicEntityType',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::relational::tests::mapping::union::extend::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'meta::relational::tests::mapping::union::extend',
      superTypes: ['meta::pure::tests::model::simple::Person'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::relational::tests::mapping::union::extend::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'meta::relational::tests::mapping::union::extend',
      superTypes: ['meta::pure::tests::model::simple::Firm'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::relational::tests::mapping::union::extend::Address',
    content: {
      _type: 'class',
      name: 'Address',
      package: 'meta::relational::tests::mapping::union::extend',
      superTypes: ['meta::pure::tests::model::simple::Address'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::relational::tests::mapping::subType::MyProduct',
    content: {
      _type: 'class',
      name: 'MyProduct',
      package: 'meta::relational::tests::mapping::subType',
      superTypes: ['Product'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Organization',
    content: {
      _type: 'class',
      name: 'Organization',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'name',
          type: 'String',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'letFunction',
              parameters: [
                {
                  _type: 'string',
                  multiplicity: { lowerBound: 1, upperBound: 1 },
                  values: ['parent'],
                },
                {
                  _type: 'property',
                  parameters: [{ _type: 'var', name: 'this' }],
                  property: 'parent',
                },
              ],
            },
            {
              _type: 'func',
              function: 'if',
              parameters: [
                {
                  _type: 'func',
                  function: 'isEmpty',
                  parameters: [{ _type: 'var', name: 'parent' }],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'collection',
                      multiplicity: { lowerBound: 0, upperBound: 0 },
                      values: [],
                    },
                  ],
                  parameters: [],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'concatenate',
                      parameters: [
                        { _type: 'var', name: 'parent' },
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'func',
                              function: 'toOne',
                              parameters: [{ _type: 'var', name: 'parent' }],
                            },
                          ],
                          property: 'superOrganizations',
                        },
                      ],
                    },
                  ],
                  parameters: [],
                },
              ],
            },
          ],
          name: 'superOrganizations',
          parameters: [],
          returnMultiplicity: { lowerBound: 0 },
          returnType: 'Organization',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'removeDuplicates',
              parameters: [
                {
                  _type: 'func',
                  function: 'concatenate',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'children',
                    },
                    {
                      _type: 'func',
                      function: 'map',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [{ _type: 'var', name: 'this' }],
                          property: 'children',
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'c' }],
                              property: 'subOrganizations',
                            },
                          ],
                          parameters: [{ _type: 'var', name: 'c' }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'subOrganizations',
          parameters: [],
          returnMultiplicity: { lowerBound: 0 },
          returnType: 'Organization',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'toOne',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'children',
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'c' }],
                              property: 'name',
                            },
                            { _type: 'var', name: 'name' },
                          ],
                        },
                      ],
                      parameters: [{ _type: 'var', name: 'c' }],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'child',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'name',
            },
          ],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnType: 'Organization',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'removeDuplicates',
              parameters: [
                {
                  _type: 'func',
                  function: 'concatenate',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'members',
                    },
                    {
                      _type: 'func',
                      function: 'map',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [{ _type: 'var', name: 'this' }],
                          property: 'subOrganizations',
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'o' }],
                              property: 'members',
                            },
                          ],
                          parameters: [{ _type: 'var', name: 'o' }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'allMembers',
          parameters: [],
          returnMultiplicity: { lowerBound: 0 },
          returnType: 'Person',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Bridge',
    content: {
      _type: 'class',
      name: 'Bridge',
      package: 'meta::pure::tests::model::simple',
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::PersonNameParameter',
    content: {
      _type: 'class',
      name: 'PersonNameParameter',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'lastNameFirst',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Boolean',
            },
          },
        },
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'nested',
          type: 'PersonNameParameterNested',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::ProductClassification',
    content: {
      _type: 'class',
      name: 'ProductClassification',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'type',
          type: 'String',
        },
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'description',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::owl::tests::model::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'meta::owl::tests::model',
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
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'gender',
          type: 'GenderType',
        },
        { multiplicity: { lowerBound: 2 }, name: 'nicknames', type: 'String' },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Division',
    content: {
      _type: 'class',
      name: 'Division',
      package: 'meta::pure::tests::model::simple',
      superTypes: ['Organization'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Department',
    content: {
      _type: 'class',
      name: 'Department',
      package: 'meta::pure::tests::model::simple',
      superTypes: ['Organization'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Team',
    content: {
      _type: 'class',
      name: 'Team',
      package: 'meta::pure::tests::model::simple',
      superTypes: ['Organization'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::owl::tests::model::FemalePerson',
    content: {
      _type: 'class',
      name: 'FemalePerson',
      package: 'meta::owl::tests::model',
      superTypes: ['Person'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::owl::tests::model::FemaleExecutive',
    content: {
      _type: 'class',
      name: 'FemaleExecutive',
      package: 'meta::owl::tests::model',
      superTypes: ['Executive', 'FemalePerson'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::owl::tests::model::MalePerson',
    content: {
      _type: 'class',
      name: 'MalePerson',
      package: 'meta::owl::tests::model',
      superTypes: ['Person'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::owl::tests::model::MaleExecutive',
    content: {
      _type: 'class',
      name: 'MaleExecutive',
      package: 'meta::owl::tests::model',
      superTypes: ['Executive', 'MalePerson'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::relational::tests::mapping::subType::CreditRating',
    content: {
      _type: 'class',
      name: 'CreditRating',
      package: 'meta::relational::tests::mapping::subType',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'description',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::PersonNameParameterNested',
    content: {
      _type: 'class',
      name: 'PersonNameParameterNested',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'prefix',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::owl::tests::model::Business',
    content: {
      _type: 'class',
      name: 'Business',
      package: 'meta::owl::tests::model',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'address',
          type: 'String',
        },
      ],
      superTypes: ['Organization', 'EntityWithLocation'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::owl::tests::model::Executive',
    content: {
      _type: 'class',
      name: 'Executive',
      package: 'meta::owl::tests::model',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'organization',
          type: 'Business',
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'seniorityLevel',
          type: 'OrgLevelType',
        },
      ],
      superTypes: ['Professional'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::owl::tests::model::Professional',
    content: {
      _type: 'class',
      name: 'Professional',
      package: 'meta::owl::tests::model',
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::owl::tests::model::Organization',
    content: {
      _type: 'class',
      name: 'Organization',
      package: 'meta::owl::tests::model',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'officialName',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::owl::tests::model::EntityWithLocation',
    content: {
      _type: 'class',
      name: 'EntityWithLocation',
      package: 'meta::owl::tests::model',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'location',
          type: 'GeoLocation',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::owl::tests::model::GeoLocation',
    content: {
      _type: 'class',
      name: 'GeoLocation',
      package: 'meta::owl::tests::model',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'engName',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Employment',
    content: {
      _type: 'association',
      name: 'Employment',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'firm',
          type: 'Firm',
        },
        { multiplicity: { lowerBound: 0 }, name: 'employees', type: 'Person' },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::FirmCEO',
    content: {
      _type: 'association',
      name: 'FirmCEO',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'ceoFirm',
          type: 'Firm',
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'ceo',
          type: 'Person',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::Membership',
    content: {
      _type: 'association',
      name: 'Membership',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 0 },
          name: 'organizations',
          type: 'Organization',
        },
        { multiplicity: { lowerBound: 0 }, name: 'members', type: 'Person' },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::BridgeAsso1',
    content: {
      _type: 'association',
      name: 'BridgeAsso1',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'bridge',
          type: 'Bridge',
        },
        { multiplicity: { lowerBound: 0 }, name: 'employees', type: 'Person' },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::FirmOrganizations',
    content: {
      _type: 'association',
      name: 'FirmOrganizations',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'firm',
          type: 'Firm',
        },
        {
          multiplicity: { lowerBound: 0 },
          name: 'organizations',
          type: 'Organization',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::BridgeAsso2',
    content: {
      _type: 'association',
      name: 'BridgeAsso2',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'bridge',
          type: 'Bridge',
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'firm',
          type: 'Firm',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::AddressLocation',
    content: {
      _type: 'association',
      name: 'AddressLocation',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'location',
          type: 'Location',
        },
        { multiplicity: { lowerBound: 0 }, name: 'addresses', type: 'Address' },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::PlacesOfInterest',
    content: {
      _type: 'association',
      name: 'PlacesOfInterest',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'location',
          type: 'Location',
        },
        {
          multiplicity: { lowerBound: 0 },
          name: 'placeOfInterest',
          type: 'PlaceOfInterest',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::ProdSynonym',
    content: {
      _type: 'association',
      name: 'ProdSynonym',
      package: 'meta::pure::tests::model::simple',
      properties: [
        { multiplicity: { lowerBound: 0 }, name: 'synonyms', type: 'Synonym' },
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'product',
          type: 'Product',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'toOne',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'synonyms',
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 's' }],
                              property: 'type',
                            },
                            { _type: 'var', name: 'type' },
                          ],
                        },
                      ],
                      parameters: [{ _type: 'var', name: 's' }],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'synonymByType',
          parameters: [
            {
              _type: 'var',
              class: 'ProductSynonymType',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'type',
            },
          ],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnType: 'Synonym',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'property',
                  parameters: [{ _type: 'var', name: 'this' }],
                  property: 'synonyms',
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'in',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [{ _type: 'var', name: 's' }],
                          property: 'type',
                        },
                        { _type: 'var', name: 'types' },
                      ],
                    },
                  ],
                  parameters: [{ _type: 'var', name: 's' }],
                },
              ],
            },
          ],
          name: 'synonymsByTypes',
          parameters: [
            {
              _type: 'var',
              class: 'ProductSynonymType',
              multiplicity: { lowerBound: 0 },
              name: 'types',
            },
          ],
          returnMultiplicity: { lowerBound: 0 },
          returnType: 'Synonym',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::Trade_Accounts',
    content: {
      _type: 'association',
      name: 'Trade_Accounts',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'account',
          type: 'Account',
        },
        { multiplicity: { lowerBound: 0 }, name: 'trades', type: 'Trade' },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::Trade_Orders',
    content: {
      _type: 'association',
      name: 'Trade_Orders',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'account',
          type: 'Account',
        },
        { multiplicity: { lowerBound: 0 }, name: 'orders', type: 'Order' },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::Account_AccountPnl',
    content: {
      _type: 'association',
      name: 'Account_AccountPnl',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'account',
          type: 'Account',
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'accountPnl',
          type: 'AccountPnl',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::owl::tests::model::Person_Accounts',
    content: {
      _type: 'association',
      name: 'Person_Accounts',
      package: 'meta::owl::tests::model',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'acctOwner',
          type: 'Person',
        },
        {
          multiplicity: { lowerBound: 0 },
          name: 'accounts',
          type: 'meta::pure::tests::model::simple::Account',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::relational::tests::mapping::subType::ProductRating',
    content: {
      _type: 'association',
      name: 'ProductRating',
      package: 'meta::relational::tests::mapping::subType',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'product',
          type: 'MyProduct',
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'rating',
          type: 'CreditRating',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::SubOrganization',
    content: {
      _type: 'association',
      name: 'SubOrganization',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'parent',
          type: 'Organization',
        },
        {
          multiplicity: { lowerBound: 0 },
          name: 'children',
          type: 'Organization',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::owl::tests::model::Business_Employees',
    content: {
      _type: 'association',
      name: 'Business_Employees',
      package: 'meta::owl::tests::model',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'firm',
          type: 'Business',
        },
        { multiplicity: { lowerBound: 0 }, name: 'employs', type: 'Person' },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::owl::tests::model::Parent_Children',
    content: {
      _type: 'association',
      name: 'Parent_Children',
      package: 'meta::owl::tests::model',
      properties: [
        {
          multiplicity: { lowerBound: 2, upperBound: 2 },
          name: 'parents',
          type: 'Person',
        },
        { multiplicity: { lowerBound: 0 }, name: 'children', type: 'Person' },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::owl::tests::model::OrgStructures',
    content: {
      _type: 'association',
      name: 'OrgStructures',
      package: 'meta::owl::tests::model',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'parentOrg',
          type: 'Organization',
        },
        {
          multiplicity: { lowerBound: 0 },
          name: 'subOrgs',
          type: 'Organization',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::ProductSynonymType',
    content: {
      _type: 'Enumeration',
      name: 'ProductSynonymType',
      package: 'meta::pure::tests::model::simple',
      values: [{ value: 'CUSIP' }, { value: 'ISIN' }, { value: 'GSN' }],
    },
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
  },
  {
    path: 'meta::pure::tests::model::simple::GeographicEntityType',
    content: {
      _type: 'Enumeration',
      name: 'GeographicEntityType',
      package: 'meta::pure::tests::model::simple',
      values: [
        {
          taggedValues: [
            {
              tag: { profile: 'doc', value: 'doc' },
              value: 'A city, town, village, or other urban area.',
            },
          ],
          value: 'CITY',
        },
        {
          stereotypes: [{ profile: 'doc', value: 'deprecated' }],
          value: 'COUNTRY',
        },
        {
          taggedValues: [
            {
              tag: { profile: 'doc', value: 'doc' },
              value: 'Any geographic entity other than a city or country.',
            },
          ],
          value: 'REGION',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
  },
  {
    path: 'meta::owl::tests::model::GenderType',
    content: {
      _type: 'Enumeration',
      name: 'GenderType',
      package: 'meta::owl::tests::model',
      values: [{ value: 'MALE' }, { value: 'FEMALE' }],
    },
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
  },
  {
    path: 'meta::owl::tests::model::OrgLevelType',
    content: {
      _type: 'Enumeration',
      name: 'OrgLevelType',
      package: 'meta::owl::tests::model',
      values: [{ value: 'VP' }, { value: 'MD' }, { value: 'PMD' }],
    },
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
  },
  {
    path: 'meta::relational::tests::db',
    content: {
      _type: 'relational',
      filters: [
        {
          _type: 'filter',
          name: 'PositiveInteractionTimeFilter',
          operation: {
            _type: 'dynaFunc',
            funcName: 'greaterThan',
            parameters: [
              {
                _type: 'column',
                column: 'time',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'interactionTable',
                },
                tableAlias: 'interactionTable',
              },
              { _type: 'literal', value: 0 },
            ],
          },
        },
        {
          _type: 'filter',
          name: 'ProductSynonymFilter',
          operation: {
            _type: 'dynaFunc',
            funcName: 'notEqual',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'productSchema',
                  table: 'synonymTable',
                },
                tableAlias: 'synonymTable',
              },
              { _type: 'literal', value: 1 },
            ],
          },
        },
        {
          _type: 'filter',
          name: 'NonNegativePnlFilter',
          operation: {
            _type: 'dynaFunc',
            funcName: 'greaterThan',
            parameters: [
              {
                _type: 'column',
                column: 'pnl',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'orderPnlTable',
                },
                tableAlias: 'orderPnlTable',
              },
              { _type: 'literal', value: 0 },
            ],
          },
        },
        {
          _type: 'filter',
          name: 'LessThanEqualZeroPnlFilter',
          operation: {
            _type: 'dynaFunc',
            funcName: 'lessThanEqual',
            parameters: [
              {
                _type: 'column',
                column: 'pnl',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'orderPnlTable',
                },
                tableAlias: 'orderPnlTable',
              },
              { _type: 'literal', value: 0 },
            ],
          },
        },
      ],
      joins: [
        {
          name: 'Product_Synonym',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'PRODID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'productSchema',
                  table: 'synonymTable',
                },
                tableAlias: 'synonymTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'productSchema',
                  table: 'productTable',
                },
                tableAlias: 'productTable',
              },
            ],
          },
        },
        {
          name: 'Trade_Product',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'prodId',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'tradeTable',
                },
                tableAlias: 'tradeTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'productSchema',
                  table: 'productTable',
                },
                tableAlias: 'productTable',
              },
            ],
          },
        },
        {
          name: 'Trade_Account',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'accountID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'tradeTable',
                },
                tableAlias: 'tradeTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'accountTable',
                },
                tableAlias: 'accountTable',
              },
            ],
          },
        },
        {
          name: 'Interaction_Source',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'sourceId',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'interactionTable',
                },
                tableAlias: 'interactionTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            ],
          },
        },
        {
          name: 'Interaction_Target',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'targetId',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'interactionTable',
                },
                tableAlias: 'interactionTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            ],
          },
        },
        {
          name: 'InteractionTable_InteractionViewMaxTime',
          operation: {
            _type: 'dynaFunc',
            funcName: 'and',
            parameters: [
              {
                _type: 'dynaFunc',
                funcName: 'equal',
                parameters: [
                  {
                    _type: 'column',
                    column: 'sourceId',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'interactionTable',
                    },
                    tableAlias: 'interactionTable',
                  },
                  {
                    _type: 'column',
                    column: 'sourceId',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'interactionViewMaxTime',
                    },
                    tableAlias: 'interactionViewMaxTime',
                  },
                ],
              },
              {
                _type: 'dynaFunc',
                funcName: 'equal',
                parameters: [
                  {
                    _type: 'column',
                    column: 'targetId',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'interactionTable',
                    },
                    tableAlias: 'interactionTable',
                  },
                  {
                    _type: 'column',
                    column: 'targetId',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'interactionViewMaxTime',
                    },
                    tableAlias: 'interactionViewMaxTime',
                  },
                ],
              },
            ],
          },
        },
        {
          name: 'Trade_TradeEvent',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'tradeTable',
                },
                tableAlias: 'tradeTable',
              },
              {
                _type: 'column',
                column: 'trade_id',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'tradeEventTable',
                },
                tableAlias: 'tradeEventTable',
              },
            ],
          },
        },
        {
          name: 'Trade_TradeEventViewMaxTradeEventDate',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'tradeTable',
                },
                tableAlias: 'tradeTable',
              },
              {
                _type: 'column',
                column: 'trade_id',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'tradeEventViewMaxTradeEventDate',
                },
                tableAlias: 'tradeEventViewMaxTradeEventDate',
              },
            ],
          },
        },
        {
          name: 'TradeEvent_Person',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'person_id',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'tradeEventTable',
                },
                tableAlias: 'tradeEventTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            ],
          },
        },
        {
          name: 'Interaction_Interaction',
          operation: {
            _type: 'dynaFunc',
            funcName: 'and',
            parameters: [
              {
                _type: 'dynaFunc',
                funcName: 'equal',
                parameters: [
                  {
                    _type: 'column',
                    column: 'sourceId',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'interactionTable',
                    },
                    tableAlias: 'interactionTable',
                  },
                  {
                    _type: 'column',
                    column: 'sourceId',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'interactionTable',
                    },
                    tableAlias: 't_interactionTable',
                  },
                ],
              },
              {
                _type: 'dynaFunc',
                funcName: 'equal',
                parameters: [
                  {
                    _type: 'column',
                    column: 'targetId',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'interactionTable',
                    },
                    tableAlias: 'interactionTable',
                  },
                  {
                    _type: 'column',
                    column: 'targetId',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'interactionTable',
                    },
                    tableAlias: 't_interactionTable',
                  },
                ],
              },
            ],
          },
          target: 't_interactionTable',
        },
        {
          name: 'Order_SalesPerson',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'accountID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'orderTable',
                },
                tableAlias: 'orderTable',
              },
              {
                _type: 'column',
                column: 'ACCOUNT_ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'salesPersonTable',
                },
                tableAlias: 'salesPersonTable',
              },
            ],
          },
        },
        {
          name: 'Order_Account',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'accountID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'orderTable',
                },
                tableAlias: 'orderTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'accountTable',
                },
                tableAlias: 'accountTable',
              },
            ],
          },
        },
        {
          name: 'OrderPnlView_Order',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ORDER_ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'orderPnlView',
                },
                tableAlias: 'orderPnlView',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'orderTable',
                },
                tableAlias: 'orderTable',
              },
            ],
          },
        },
        {
          name: 'OrderPnlViewOnView_Order',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ORDER_ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'orderPnlViewOnView',
                },
                tableAlias: 'orderPnlViewOnView',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'orderTable',
                },
                tableAlias: 'orderTable',
              },
            ],
          },
        },
        {
          name: 'OrderNetativePnlView_Order',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ORDER_ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'orderNegativePnlView',
                },
                tableAlias: 'orderNegativePnlView',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'orderTable',
                },
                tableAlias: 'orderTable',
              },
            ],
          },
        },
        {
          name: 'OrderNegativePnlViewOnView_Order',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ORDER_ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'orderNegativePnlViewOnView',
                },
                tableAlias: 'orderNegativePnlViewOnView',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'orderTable',
                },
                tableAlias: 'orderTable',
              },
            ],
          },
        },
        {
          name: 'OrderPnlView_Person',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'supportContactId',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'orderPnlView',
                },
                tableAlias: 'orderPnlView',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            ],
          },
        },
        {
          name: 'SalesPerson_PersonView',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'PERSON_ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'salesPersonTable',
                },
                tableAlias: 'salesPersonTable',
              },
              {
                _type: 'column',
                column: 'PERSON_ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'PersonFirmView',
                },
                tableAlias: 'PersonFirmView',
              },
            ],
          },
        },
        {
          name: 'OrderPnlTable_Order',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ORDER_ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'orderPnlTable',
                },
                tableAlias: 'orderPnlTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'orderTable',
                },
                tableAlias: 'orderTable',
              },
            ],
          },
        },
        {
          name: 'AccountPnlView_Account',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'accountId',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'accountOrderPnlView',
                },
                tableAlias: 'accountOrderPnlView',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'accountTable',
                },
                tableAlias: 'accountTable',
              },
            ],
          },
        },
        {
          name: 'Person_OtherNames',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
              {
                _type: 'column',
                column: 'PERSON_ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'otherNamesTable',
                },
                tableAlias: 'otherNamesTable',
              },
            ],
          },
        },
      ],
      name: 'db',
      package: 'meta::relational::tests',
      schemas: [
        {
          name: 'productSchema',
          tables: [
            {
              columns: [
                { name: 'ID', nullable: false, type: { _type: 'Integer' } },
                { name: 'PRODID', nullable: true, type: { _type: 'Integer' } },
                {
                  name: 'TYPE',
                  nullable: true,
                  type: { _type: 'Varchar', size: 200 },
                },
                {
                  name: 'NAME',
                  nullable: true,
                  type: { _type: 'Varchar', size: 200 },
                },
              ],
              name: 'synonymTable',
              primaryKey: ['ID'],
            },
          ],
          views: [],
        },
        {
          name: 'default',
          tables: [
            {
              columns: [
                { name: 'ID', nullable: false, type: { _type: 'Integer' } },
                {
                  name: 'sourceId',
                  nullable: true,
                  type: { _type: 'Integer' },
                },
                {
                  name: 'targetId',
                  nullable: true,
                  type: { _type: 'Integer' },
                },
                { name: 'time', nullable: true, type: { _type: 'Integer' } },
                {
                  name: 'active',
                  nullable: true,
                  type: { _type: 'Varchar', size: 1 },
                },
              ],
              name: 'interactionTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                { name: 'ID', nullable: false, type: { _type: 'Integer' } },
                { name: 'prodId', nullable: true, type: { _type: 'Integer' } },
                {
                  name: 'accountID',
                  nullable: true,
                  type: { _type: 'Integer' },
                },
                { name: 'quantity', nullable: true, type: { _type: 'Float' } },
                { name: 'tradeDate', nullable: true, type: { _type: 'Date' } },
                {
                  name: 'settlementDateTime',
                  nullable: true,
                  type: { _type: 'Timestamp' },
                },
              ],
              name: 'tradeTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                { name: 'ID', nullable: false, type: { _type: 'Integer' } },
                {
                  name: 'name',
                  nullable: true,
                  type: { _type: 'Varchar', size: 200 },
                },
                { name: 'createDate', nullable: true, type: { _type: 'Date' } },
              ],
              name: 'accountTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'EVENT_ID',
                  nullable: false,
                  type: { _type: 'Integer' },
                },
                {
                  name: 'trade_id',
                  nullable: true,
                  type: { _type: 'Integer' },
                },
                {
                  name: 'eventType',
                  nullable: true,
                  type: { _type: 'Varchar', size: 10 },
                },
                { name: 'eventDate', nullable: true, type: { _type: 'Date' } },
                {
                  name: 'person_id',
                  nullable: true,
                  type: { _type: 'Integer' },
                },
              ],
              name: 'tradeEventTable',
              primaryKey: ['EVENT_ID'],
            },
            {
              columns: [
                { name: 'ID', nullable: false, type: { _type: 'Integer' } },
                { name: 'prodId', nullable: true, type: { _type: 'Integer' } },
                {
                  name: 'accountID',
                  nullable: true,
                  type: { _type: 'Integer' },
                },
                {
                  name: 'quantity',
                  nullable: true,
                  type: { _type: 'Integer' },
                },
                { name: 'orderDate', nullable: true, type: { _type: 'Date' } },
                {
                  name: 'settlementDateTime',
                  nullable: true,
                  type: { _type: 'Timestamp' },
                },
              ],
              name: 'orderTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'ORDER_ID',
                  nullable: false,
                  type: { _type: 'Integer' },
                },
                { name: 'pnl', nullable: true, type: { _type: 'Float' } },
                { name: 'from_z', nullable: true, type: { _type: 'Date' } },
                { name: 'thru_z', nullable: true, type: { _type: 'Date' } },
              ],
              name: 'orderPnlTable',
              primaryKey: ['ORDER_ID'],
            },
            {
              columns: [
                {
                  name: 'PERSON_ID',
                  nullable: false,
                  type: { _type: 'Integer' },
                },
                {
                  name: 'ACCOUNT_ID',
                  nullable: false,
                  type: { _type: 'Integer' },
                },
                {
                  name: 'NAME',
                  nullable: true,
                  type: { _type: 'Varchar', size: 200 },
                },
                { name: 'from_z', nullable: true, type: { _type: 'Date' } },
                { name: 'thru_z', nullable: true, type: { _type: 'Date' } },
              ],
              name: 'salesPersonTable',
              primaryKey: ['PERSON_ID', 'ACCOUNT_ID'],
            },
            {
              columns: [
                {
                  name: 'PERSON_ID',
                  nullable: true,
                  type: { _type: 'Integer' },
                },
                {
                  name: 'OTHER_NAME',
                  nullable: true,
                  type: { _type: 'Varchar', size: 200 },
                },
              ],
              name: 'otherNamesTable',
              primaryKey: [],
            },
          ],
          views: [
            {
              name: 'interactionViewMaxTime',
              distinct: false,
              primaryKey: [],
              columnMappings: [
                {
                  name: 'sourceId',
                  operation: {
                    _type: 'column',
                    column: 'sourceId',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'interactionTable',
                    },
                    tableAlias: 'interactionTable',
                  },
                },
                {
                  name: 'targetId',
                  operation: {
                    _type: 'column',
                    column: 'targetId',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'interactionTable',
                    },
                    tableAlias: 'interactionTable',
                  },
                },
                {
                  name: 'maxTime',
                  operation: {
                    _type: 'dynaFunc',
                    funcName: 'max',
                    parameters: [
                      {
                        _type: 'column',
                        column: 'time',
                        table: {
                          _type: 'Table',
                          database: 'meta::relational::tests::db',
                          schema: 'default',
                          table: 'interactionTable',
                        },
                        tableAlias: 'interactionTable',
                      },
                    ],
                  },
                },
              ],
              groupBy: [
                {
                  _type: 'column',
                  column: 'sourceId',
                  table: {
                    _type: 'Table',
                    database: 'meta::relational::tests::db',
                    schema: 'default',
                    table: 'interactionTable',
                  },
                  tableAlias: 'interactionTable',
                },
                {
                  _type: 'column',
                  column: 'targetId',
                  table: {
                    _type: 'Table',
                    database: 'meta::relational::tests::db',
                    schema: 'default',
                    table: 'interactionTable',
                  },
                  tableAlias: 'interactionTable',
                },
              ],
            },
            {
              name: 'tradeEventViewMaxTradeEventDate',
              distinct: false,
              primaryKey: [],
              columnMappings: [
                {
                  name: 'trade_id',
                  operation: {
                    _type: 'column',
                    column: 'trade_id',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'tradeEventTable',
                    },
                    tableAlias: 'tradeEventTable',
                  },
                },
                {
                  name: 'maxTradeEventDate',
                  operation: {
                    _type: 'dynaFunc',
                    funcName: 'max',
                    parameters: [
                      {
                        _type: 'column',
                        column: 'eventDate',
                        table: {
                          _type: 'Table',
                          database: 'meta::relational::tests::db',
                          schema: 'default',
                          table: 'tradeEventTable',
                        },
                        tableAlias: 'tradeEventTable',
                      },
                    ],
                  },
                },
              ],
              groupBy: [
                {
                  _type: 'column',
                  column: 'trade_id',
                  table: {
                    _type: 'Table',
                    database: 'meta::relational::tests::db',
                    schema: 'default',
                    table: 'tradeEventTable',
                  },
                  tableAlias: 'tradeEventTable',
                },
              ],
            },
            {
              name: 'orderPnlView',
              distinct: true,
              primaryKey: ['ORDER_ID'],
              columnMappings: [
                {
                  name: 'ORDER_ID',
                  operation: {
                    _type: 'column',
                    column: 'ORDER_ID',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'orderPnlTable',
                    },
                    tableAlias: 'orderPnlTable',
                  },
                },
                {
                  name: 'pnl',
                  operation: {
                    _type: 'column',
                    column: 'pnl',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'orderPnlTable',
                    },
                    tableAlias: 'orderPnlTable',
                  },
                },
                {
                  name: 'accountId',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'meta::relational::tests::db',
                        name: 'OrderPnlTable_Order',
                      },
                      {
                        db: 'meta::relational::tests::db',
                        name: 'Order_Account',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'ID',
                      table: {
                        _type: 'Table',
                        database: 'meta::relational::tests::db',
                        schema: 'default',
                        table: 'accountTable',
                      },
                      tableAlias: 'accountTable',
                    },
                  },
                },
                {
                  name: 'supportContact',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'meta::relational::tests::db',
                        name: 'OrderPnlTable_Order',
                      },
                      {
                        db: 'meta::relational::tests::db',
                        name: 'Order_SalesPerson',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'NAME',
                      table: {
                        _type: 'Table',
                        database: 'meta::relational::tests::db',
                        schema: 'default',
                        table: 'salesPersonTable',
                      },
                      tableAlias: 'salesPersonTable',
                    },
                  },
                },
                {
                  name: 'supportContactId',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'meta::relational::tests::db',
                        name: 'OrderPnlTable_Order',
                      },
                      {
                        db: 'meta::relational::tests::db',
                        name: 'Order_SalesPerson',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'PERSON_ID',
                      table: {
                        _type: 'Table',
                        database: 'meta::relational::tests::db',
                        schema: 'default',
                        table: 'salesPersonTable',
                      },
                      tableAlias: 'salesPersonTable',
                    },
                  },
                },
              ],
            },
            {
              name: 'orderPnlViewOnView',
              distinct: false,
              primaryKey: ['ORDER_ID'],
              columnMappings: [
                {
                  name: 'ORDER_ID',
                  operation: {
                    _type: 'column',
                    column: 'ORDER_ID',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'orderPnlView',
                    },
                    tableAlias: 'orderPnlView',
                  },
                },
                {
                  name: 'pnl',
                  operation: {
                    _type: 'column',
                    column: 'pnl',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'orderPnlView',
                    },
                    tableAlias: 'orderPnlView',
                  },
                },
              ],
            },
            {
              name: 'orderNegativePnlView',
              distinct: true,
              primaryKey: ['ORDER_ID'],
              columnMappings: [
                {
                  name: 'ORDER_ID',
                  operation: {
                    _type: 'column',
                    column: 'ORDER_ID',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'orderPnlTable',
                    },
                    tableAlias: 'orderPnlTable',
                  },
                },
                {
                  name: 'pnl',
                  operation: {
                    _type: 'column',
                    column: 'pnl',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'orderPnlTable',
                    },
                    tableAlias: 'orderPnlTable',
                  },
                },
                {
                  name: 'accountId',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'meta::relational::tests::db',
                        name: 'OrderPnlTable_Order',
                      },
                      {
                        db: 'meta::relational::tests::db',
                        name: 'Order_Account',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'ID',
                      table: {
                        _type: 'Table',
                        database: 'meta::relational::tests::db',
                        schema: 'default',
                        table: 'accountTable',
                      },
                      tableAlias: 'accountTable',
                    },
                  },
                },
                {
                  name: 'supportContact',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'meta::relational::tests::db',
                        name: 'OrderPnlTable_Order',
                      },
                      {
                        db: 'meta::relational::tests::db',
                        name: 'Order_SalesPerson',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'NAME',
                      table: {
                        _type: 'Table',
                        database: 'meta::relational::tests::db',
                        schema: 'default',
                        table: 'salesPersonTable',
                      },
                      tableAlias: 'salesPersonTable',
                    },
                  },
                },
                {
                  name: 'supportContactId',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'meta::relational::tests::db',
                        name: 'OrderPnlTable_Order',
                      },
                      {
                        db: 'meta::relational::tests::db',
                        name: 'Order_SalesPerson',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'PERSON_ID',
                      table: {
                        _type: 'Table',
                        database: 'meta::relational::tests::db',
                        schema: 'default',
                        table: 'salesPersonTable',
                      },
                      tableAlias: 'salesPersonTable',
                    },
                  },
                },
              ],
            },
            {
              name: 'orderNegativePnlViewOnView',
              distinct: false,
              primaryKey: ['ORDER_ID'],
              columnMappings: [
                {
                  name: 'ORDER_ID',
                  operation: {
                    _type: 'column',
                    column: 'ORDER_ID',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'orderNegativePnlView',
                    },
                    tableAlias: 'orderNegativePnlView',
                  },
                },
                {
                  name: 'pnl',
                  operation: {
                    _type: 'column',
                    column: 'pnl',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'orderNegativePnlView',
                    },
                    tableAlias: 'orderNegativePnlView',
                  },
                },
              ],
            },
            {
              name: 'accountOrderPnlView',
              distinct: false,
              primaryKey: ['accountId'],
              columnMappings: [
                {
                  name: 'accountId',
                  operation: {
                    _type: 'column',
                    column: 'accountID',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'orderTable',
                    },
                    tableAlias: 'orderTable',
                  },
                },
                {
                  name: 'orderPnl',
                  operation: {
                    _type: 'dynaFunc',
                    funcName: 'sum',
                    parameters: [
                      {
                        _type: 'elemtWithJoins',
                        joins: [
                          {
                            db: 'meta::relational::tests::db',
                            name: 'OrderPnlTable_Order',
                          },
                        ],
                        relationalElement: {
                          _type: 'column',
                          column: 'pnl',
                          table: {
                            _type: 'Table',
                            database: 'meta::relational::tests::db',
                            schema: 'default',
                            table: 'orderPnlTable',
                          },
                          tableAlias: 'orderPnlTable',
                        },
                      },
                    ],
                  },
                },
              ],
              groupBy: [
                {
                  _type: 'column',
                  column: 'accountID',
                  table: {
                    _type: 'Table',
                    database: 'meta::relational::tests::db',
                    schema: 'default',
                    table: 'orderTable',
                  },
                  tableAlias: 'orderTable',
                },
              ],
            },
          ],
        },
      ],
      includedStores: ['meta::relational::tests::dbInc'],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'meta::relational::tests::dbInc',
    content: {
      _type: 'relational',
      filters: [
        {
          _type: 'filter',
          name: 'FirmXFilter',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'LEGALNAME',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'firmTable',
                },
                tableAlias: 'firmTable',
              },
              { _type: 'literal', value: 'Firm X' },
            ],
          },
        },
      ],
      joins: [
        {
          name: 'personViewWithFirmTable',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'firmTable',
                },
                tableAlias: 'firmTable',
              },
              {
                _type: 'column',
                column: 'firmId',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'PersonViewWithDistinct',
                },
                tableAlias: 'PersonViewWithDistinct',
              },
            ],
          },
        },
        {
          name: 'PersonWithPersonView',
          operation: {
            _type: 'dynaFunc',
            funcName: 'and',
            parameters: [
              {
                _type: 'dynaFunc',
                funcName: 'equal',
                parameters: [
                  {
                    _type: 'column',
                    column: 'ID',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::dbInc',
                      schema: 'default',
                      table: 'personTable',
                    },
                    tableAlias: 'personTable',
                  },
                  {
                    _type: 'column',
                    column: 'id',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::dbInc',
                      schema: 'default',
                      table: 'personViewWithGroupBy',
                    },
                    tableAlias: 'personViewWithGroupBy',
                  },
                ],
              },
              {
                _type: 'dynaFunc',
                funcName: 'equal',
                parameters: [
                  {
                    _type: 'column',
                    column: 'AGE',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::dbInc',
                      schema: 'default',
                      table: 'personTable',
                    },
                    tableAlias: 'personTable',
                  },
                  {
                    _type: 'column',
                    column: 'maxage',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::dbInc',
                      schema: 'default',
                      table: 'personViewWithGroupBy',
                    },
                    tableAlias: 'personViewWithGroupBy',
                  },
                ],
              },
            ],
          },
        },
        {
          name: 'Address_Firm',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'addressTable',
                },
                tableAlias: 'addressTable',
              },
              {
                _type: 'column',
                column: 'ADDRESSID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'firmTable',
                },
                tableAlias: 'firmTable',
              },
            ],
          },
        },
        {
          name: 'Address_Person',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'addressTable',
                },
                tableAlias: 'addressTable',
              },
              {
                _type: 'column',
                column: 'ADDRESSID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            ],
          },
        },
        {
          name: 'Firm_Ceo',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'CEOID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'firmTable',
                },
                tableAlias: 'firmTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            ],
          },
        },
        {
          name: 'Firm_Person',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'firmTable',
                },
                tableAlias: 'firmTable',
              },
              {
                _type: 'column',
                column: 'FIRMID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            ],
          },
        },
        {
          name: 'FirmExtension_PersonExtension',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'firmId',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'firmExtensionTable',
                },
                tableAlias: 'firmExtensionTable',
              },
              {
                _type: 'column',
                column: 'FIRMID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'PersonTableExtension',
                },
                tableAlias: 'PersonTableExtension',
              },
            ],
          },
        },
        {
          name: 'Person_Location',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
              {
                _type: 'column',
                column: 'PERSONID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'locationTable',
                },
                tableAlias: 'locationTable',
              },
            ],
          },
        },
        {
          name: 'Person_Manager',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'MANAGERID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 't_personTable',
              },
            ],
          },
          target: 't_personTable',
        },
        {
          name: 'location_PlaceOfInterest',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'locationTable',
                },
                tableAlias: 'locationTable',
              },
              {
                _type: 'column',
                column: 'locationID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'placeOfInterestTable',
                },
                tableAlias: 'placeOfInterestTable',
              },
            ],
          },
        },
        {
          name: 'Person_OtherFirm',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'FIRMID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'otherFirmTable',
                },
                tableAlias: 'otherFirmTable',
              },
            ],
          },
        },
      ],
      name: 'dbInc',
      package: 'meta::relational::tests',
      schemas: [
        {
          name: 'productSchema',
          tables: [
            {
              columns: [
                { name: 'ID', nullable: false, type: { _type: 'Integer' } },
                {
                  name: 'NAME',
                  nullable: true,
                  type: { _type: 'Varchar', size: 200 },
                },
              ],
              name: 'productTable',
              primaryKey: ['ID'],
            },
          ],
          views: [],
        },
        {
          name: 'default',
          tables: [
            {
              columns: [
                { name: 'ID', nullable: false, type: { _type: 'Integer' } },
                {
                  name: 'FIRSTNAME',
                  nullable: true,
                  type: { _type: 'Varchar', size: 200 },
                },
                {
                  name: 'LASTNAME',
                  nullable: true,
                  type: { _type: 'Varchar', size: 200 },
                },
                { name: 'AGE', nullable: true, type: { _type: 'Integer' } },
                {
                  name: 'ADDRESSID',
                  nullable: true,
                  type: { _type: 'Integer' },
                },
                { name: 'FIRMID', nullable: true, type: { _type: 'Integer' } },
                {
                  name: 'MANAGERID',
                  nullable: true,
                  type: { _type: 'Integer' },
                },
              ],
              name: 'personTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                { name: 'ID', nullable: false, type: { _type: 'Integer' } },
                {
                  name: 'FIRSTNAME',
                  nullable: true,
                  type: { _type: 'Varchar', size: 200 },
                },
                {
                  name: 'LASTNAME',
                  nullable: true,
                  type: { _type: 'Varchar', size: 200 },
                },
                { name: 'AGE', nullable: true, type: { _type: 'Integer' } },
                {
                  name: 'ADDRESSID',
                  nullable: true,
                  type: { _type: 'Integer' },
                },
                { name: 'FIRMID', nullable: true, type: { _type: 'Integer' } },
                {
                  name: 'MANAGERID',
                  nullable: true,
                  type: { _type: 'Integer' },
                },
                { name: 'birthDate', nullable: true, type: { _type: 'Date' } },
              ],
              name: 'PersonTableExtension',
              primaryKey: ['ID'],
            },
            {
              columns: [
                { name: 'ID', nullable: false, type: { _type: 'Integer' } },
                {
                  name: 'FIRSTNAME',
                  nullable: true,
                  type: { _type: 'Varchar', size: 200 },
                },
                {
                  name: 'LASTNAME',
                  nullable: true,
                  type: { _type: 'Varchar', size: 200 },
                },
                { name: 'AGE', nullable: true, type: { _type: 'Integer' } },
                {
                  name: 'ADDRESSID',
                  nullable: true,
                  type: { _type: 'Integer' },
                },
                { name: 'FIRMID', nullable: true, type: { _type: 'Integer' } },
                {
                  name: 'MANAGERID',
                  nullable: true,
                  type: { _type: 'Integer' },
                },
              ],
              name: 'differentPersonTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                { name: 'ID', nullable: false, type: { _type: 'Integer' } },
                {
                  name: 'LEGALNAME',
                  nullable: true,
                  type: { _type: 'Varchar', size: 200 },
                },
                {
                  name: 'ADDRESSID',
                  nullable: true,
                  type: { _type: 'Integer' },
                },
                { name: 'CEOID', nullable: true, type: { _type: 'Integer' } },
              ],
              name: 'firmTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                { name: 'firmId', nullable: false, type: { _type: 'Integer' } },
                {
                  name: 'legalName',
                  nullable: true,
                  type: { _type: 'Varchar', size: 200 },
                },
                {
                  name: 'establishedDate',
                  nullable: true,
                  type: { _type: 'Date' },
                },
              ],
              name: 'firmExtensionTable',
              primaryKey: ['firmId'],
            },
            {
              columns: [
                { name: 'ID', nullable: false, type: { _type: 'Integer' } },
                {
                  name: 'LEGALNAME',
                  nullable: true,
                  type: { _type: 'Varchar', size: 200 },
                },
                {
                  name: 'ADDRESSID',
                  nullable: true,
                  type: { _type: 'Integer' },
                },
              ],
              name: 'otherFirmTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                { name: 'ID', nullable: false, type: { _type: 'Integer' } },
                { name: 'TYPE', nullable: true, type: { _type: 'Integer' } },
                {
                  name: 'NAME',
                  nullable: true,
                  type: { _type: 'Varchar', size: 200 },
                },
                {
                  name: 'STREET',
                  nullable: true,
                  type: { _type: 'Varchar', size: 100 },
                },
                {
                  name: 'COMMENTS',
                  nullable: true,
                  type: { _type: 'Varchar', size: 100 },
                },
              ],
              name: 'addressTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                { name: 'ID', nullable: false, type: { _type: 'Integer' } },
                {
                  name: 'PERSONID',
                  nullable: true,
                  type: { _type: 'Integer' },
                },
                {
                  name: 'PLACE',
                  nullable: true,
                  type: { _type: 'Varchar', size: 200 },
                },
                { name: 'date', nullable: true, type: { _type: 'Date' } },
              ],
              name: 'locationTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                { name: 'ID', nullable: false, type: { _type: 'Integer' } },
                {
                  name: 'locationID',
                  nullable: false,
                  type: { _type: 'Integer' },
                },
                {
                  name: 'NAME',
                  nullable: true,
                  type: { _type: 'Varchar', size: 200 },
                },
              ],
              name: 'placeOfInterestTable',
              primaryKey: ['ID', 'locationID'],
            },
          ],
          views: [
            {
              name: 'PersonFirmView',
              distinct: false,
              primaryKey: ['PERSON_ID'],
              columnMappings: [
                {
                  name: 'PERSON_ID',
                  operation: {
                    _type: 'column',
                    column: 'ID',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::dbInc',
                      schema: 'default',
                      table: 'personTable',
                    },
                    tableAlias: 'personTable',
                  },
                },
                {
                  name: 'lastName',
                  operation: {
                    _type: 'column',
                    column: 'LASTNAME',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::dbInc',
                      schema: 'default',
                      table: 'personTable',
                    },
                    tableAlias: 'personTable',
                  },
                },
                {
                  name: 'firm_name',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'meta::relational::tests::dbInc',
                        name: 'Firm_Person',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'LEGALNAME',
                      table: {
                        _type: 'Table',
                        database: 'meta::relational::tests::dbInc',
                        schema: 'default',
                        table: 'firmTable',
                      },
                      tableAlias: 'firmTable',
                    },
                  },
                },
              ],
            },
            {
              name: 'personViewWithGroupBy',
              distinct: false,
              primaryKey: ['id'],
              columnMappings: [
                {
                  name: 'id',
                  operation: {
                    _type: 'column',
                    column: 'ID',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::dbInc',
                      schema: 'default',
                      table: 'personTable',
                    },
                    tableAlias: 'personTable',
                  },
                },
                {
                  name: 'maxage',
                  operation: {
                    _type: 'dynaFunc',
                    funcName: 'max',
                    parameters: [
                      {
                        _type: 'column',
                        column: 'AGE',
                        table: {
                          _type: 'Table',
                          database: 'meta::relational::tests::dbInc',
                          schema: 'default',
                          table: 'personTable',
                        },
                        tableAlias: 'personTable',
                      },
                    ],
                  },
                },
              ],
              groupBy: [
                {
                  _type: 'column',
                  column: 'ID',
                  table: {
                    _type: 'Table',
                    database: 'meta::relational::tests::dbInc',
                    schema: 'default',
                    table: 'personTable',
                  },
                  tableAlias: 'personTable',
                },
              ],
            },
            {
              name: 'PersonViewWithDistinct',
              distinct: true,
              primaryKey: ['id'],
              columnMappings: [
                {
                  name: 'id',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'meta::relational::tests::dbInc',
                        name: 'PersonWithPersonView',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'ID',
                      table: {
                        _type: 'Table',
                        database: 'meta::relational::tests::dbInc',
                        schema: 'default',
                        table: 'personTable',
                      },
                      tableAlias: 'personTable',
                    },
                  },
                },
                {
                  name: 'firstName',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'meta::relational::tests::dbInc',
                        name: 'PersonWithPersonView',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'FIRSTNAME',
                      table: {
                        _type: 'Table',
                        database: 'meta::relational::tests::dbInc',
                        schema: 'default',
                        table: 'personTable',
                      },
                      tableAlias: 'personTable',
                    },
                  },
                },
                {
                  name: 'lastName',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'meta::relational::tests::dbInc',
                        name: 'PersonWithPersonView',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'LASTNAME',
                      table: {
                        _type: 'Table',
                        database: 'meta::relational::tests::dbInc',
                        schema: 'default',
                        table: 'personTable',
                      },
                      tableAlias: 'personTable',
                    },
                  },
                },
                {
                  name: 'firmId',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'meta::relational::tests::dbInc',
                        name: 'PersonWithPersonView',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'FIRMID',
                      table: {
                        _type: 'Table',
                        database: 'meta::relational::tests::dbInc',
                        schema: 'default',
                        table: 'personTable',
                      },
                      tableAlias: 'personTable',
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
      includedStores: [],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'meta::relational::tests::simpleRelationalMapping',
    content: {
      _type: 'mapping',
      includedMappings: [
        {
          _type: 'mappingIncludeMapping',
          includedMapping: 'simpleRelationalMappingInc',
        },
      ],
      classMappings: [
        {
          _type: 'relational',
          class: 'Product',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'db',
            schema: 'productSchema',
            table: 'productTable',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Product',
                property: 'name',
              },
              relationalOperation: {
                _type: 'column',
                column: 'NAME',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'productSchema',
                  table: 'productTable',
                },
                tableAlias: 'productTable',
              },
              source: 'meta_pure_tests_model_simple_Product',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Product',
                property: 'synonyms',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [{ db: 'db', name: 'Product_Synonym' }],
              },
              source: 'meta_pure_tests_model_simple_Product',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'Synonym',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'db',
            schema: 'productSchema',
            table: 'synonymTable',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Synonym',
                property: 'name',
              },
              relationalOperation: {
                _type: 'column',
                column: 'NAME',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'productSchema',
                  table: 'synonymTable',
                },
                tableAlias: 'synonymTable',
              },
              source: 'meta_pure_tests_model_simple_Synonym',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Synonym',
                property: 'typeAsString',
              },
              relationalOperation: {
                _type: 'column',
                column: 'TYPE',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'productSchema',
                  table: 'synonymTable',
                },
                tableAlias: 'synonymTable',
              },
              source: 'meta_pure_tests_model_simple_Synonym',
            },
            {
              _type: 'relationalPropertyMapping',
              enumMappingId: 'SynonymEnum',
              property: {
                class: 'meta::pure::tests::model::simple::Synonym',
                property: 'type',
              },
              relationalOperation: {
                _type: 'column',
                column: 'TYPE',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'productSchema',
                  table: 'synonymTable',
                },
                tableAlias: 'synonymTable',
              },
              source: 'meta_pure_tests_model_simple_Synonym',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Synonym',
                property: 'product',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [{ db: 'db', name: 'Product_Synonym' }],
              },
              source: 'meta_pure_tests_model_simple_Synonym',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'Trade',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'db',
            schema: 'default',
            table: 'tradeTable',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Trade',
                property: 'id',
              },
              relationalOperation: {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'tradeTable',
                },
                tableAlias: 'tradeTable',
              },
              source: 'meta_pure_tests_model_simple_Trade',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Trade',
                property: 'quantity',
              },
              relationalOperation: {
                _type: 'column',
                column: 'quantity',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'tradeTable',
                },
                tableAlias: 'tradeTable',
              },
              source: 'meta_pure_tests_model_simple_Trade',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Trade',
                property: 'account',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [{ db: 'db', name: 'Trade_Account' }],
              },
              source: 'meta_pure_tests_model_simple_Trade',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Trade',
                property: 'product',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [{ db: 'db', name: 'Trade_Product' }],
              },
              source: 'meta_pure_tests_model_simple_Trade',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Trade',
                property: 'date',
              },
              relationalOperation: {
                _type: 'column',
                column: 'tradeDate',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'tradeTable',
                },
                tableAlias: 'tradeTable',
              },
              source: 'meta_pure_tests_model_simple_Trade',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Trade',
                property: 'settlementDateTime',
              },
              relationalOperation: {
                _type: 'column',
                column: 'settlementDateTime',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'tradeTable',
                },
                tableAlias: 'tradeTable',
              },
              source: 'meta_pure_tests_model_simple_Trade',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Trade',
                property: 'latestEventDate',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  { db: 'db', name: 'Trade_TradeEventViewMaxTradeEventDate' },
                ],
                relationalElement: {
                  _type: 'column',
                  column: 'maxTradeEventDate',
                  table: {
                    _type: 'Table',
                    database: 'db',
                    schema: 'default',
                    table: 'tradeEventViewMaxTradeEventDate',
                  },
                  tableAlias: 'tradeEventViewMaxTradeEventDate',
                },
              },
              source: 'meta_pure_tests_model_simple_Trade',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Trade',
                property: 'events',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [{ db: 'db', name: 'Trade_TradeEvent' }],
              },
              source: 'meta_pure_tests_model_simple_Trade',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'Order',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'db',
            schema: 'default',
            table: 'orderTable',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Order',
                property: 'id',
              },
              relationalOperation: {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'orderTable',
                },
                tableAlias: 'orderTable',
              },
              source: 'meta_pure_tests_model_simple_Order',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Order',
                property: 'quantity',
              },
              relationalOperation: {
                _type: 'column',
                column: 'quantity',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'orderTable',
                },
                tableAlias: 'orderTable',
              },
              source: 'meta_pure_tests_model_simple_Order',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Order',
                property: 'date',
              },
              relationalOperation: {
                _type: 'column',
                column: 'orderDate',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'orderTable',
                },
                tableAlias: 'orderTable',
              },
              source: 'meta_pure_tests_model_simple_Order',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Order',
                property: 'settlementDateTime',
              },
              relationalOperation: {
                _type: 'column',
                column: 'settlementDateTime',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'orderTable',
                },
                tableAlias: 'orderTable',
              },
              source: 'meta_pure_tests_model_simple_Order',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Order',
                property: 'pnl',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [{ db: 'db', name: 'OrderPnlView_Order' }],
                relationalElement: {
                  _type: 'column',
                  column: 'pnl',
                  table: {
                    _type: 'Table',
                    database: 'db',
                    schema: 'default',
                    table: 'orderPnlView',
                  },
                  tableAlias: 'orderPnlView',
                },
              },
              source: 'meta_pure_tests_model_simple_Order',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Order',
                property: 'pnlContact',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  { db: 'db', name: 'OrderPnlView_Order' },
                  { db: 'db', name: 'OrderPnlView_Person' },
                ],
              },
              source: 'meta_pure_tests_model_simple_Order',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Order',
                property: 'zeroPnl',
              },
              relationalOperation: {
                _type: 'dynaFunc',
                funcName: 'case',
                parameters: [
                  {
                    _type: 'dynaFunc',
                    funcName: 'equal',
                    parameters: [
                      {
                        _type: 'elemtWithJoins',
                        joins: [{ db: 'db', name: 'OrderPnlView_Order' }],
                        relationalElement: {
                          _type: 'column',
                          column: 'pnl',
                          table: {
                            _type: 'Table',
                            database: 'db',
                            schema: 'default',
                            table: 'orderPnlView',
                          },
                          tableAlias: 'orderPnlView',
                        },
                      },
                      { _type: 'literal', value: 0 },
                    ],
                  },
                  { _type: 'literal', value: 'true' },
                  { _type: 'literal', value: 'false' },
                ],
              },
              source: 'meta_pure_tests_model_simple_Order',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'OrderPnl',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'db',
            schema: 'default',
            table: 'orderPnlView',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::OrderPnl',
                property: 'pnl',
              },
              relationalOperation: {
                _type: 'column',
                column: 'pnl',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'orderPnlView',
                },
                tableAlias: 'orderPnlView',
              },
              source: 'meta_pure_tests_model_simple_OrderPnl',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::OrderPnl',
                property: 'supportContactName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'supportContact',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'orderPnlView',
                },
                tableAlias: 'orderPnlView',
              },
              source: 'meta_pure_tests_model_simple_OrderPnl',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::OrderPnl',
                property: 'order',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [{ db: 'db', name: 'OrderPnlView_Order' }],
              },
              source: 'meta_pure_tests_model_simple_OrderPnl',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'AccountPnl',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'db',
            schema: 'default',
            table: 'accountOrderPnlView',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::AccountPnl',
                property: 'pnl',
              },
              relationalOperation: {
                _type: 'column',
                column: 'orderPnl',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'accountOrderPnlView',
                },
                tableAlias: 'accountOrderPnlView',
              },
              source: 'meta_pure_tests_model_simple_AccountPnl',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::AccountPnl',
                property: 'account',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [{ db: 'db', name: 'AccountPnlView_Account' }],
              },
              source: 'meta_pure_tests_model_simple_AccountPnl',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'TradeEvent',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'db',
            schema: 'default',
            table: 'tradeEventTable',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::TradeEvent',
                property: 'eventType',
              },
              relationalOperation: {
                _type: 'column',
                column: 'eventType',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'tradeEventTable',
                },
                tableAlias: 'tradeEventTable',
              },
              source: 'meta_pure_tests_model_simple_TradeEvent',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::TradeEvent',
                property: 'date',
              },
              relationalOperation: {
                _type: 'column',
                column: 'eventDate',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'tradeEventTable',
                },
                tableAlias: 'tradeEventTable',
              },
              source: 'meta_pure_tests_model_simple_TradeEvent',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::TradeEvent',
                property: 'initiator',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [{ db: 'db', name: 'TradeEvent_Person' }],
              },
              source: 'meta_pure_tests_model_simple_TradeEvent',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::TradeEvent',
                property: 'traderAddress',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  { db: 'db', name: 'TradeEvent_Person' },
                  { db: 'dbInc', name: 'Address_Person' },
                ],
                relationalElement: {
                  _type: 'dynaFunc',
                  funcName: 'concat',
                  parameters: [
                    {
                      _type: 'column',
                      column: 'NAME',
                      table: {
                        _type: 'Table',
                        database: 'db',
                        schema: 'default',
                        table: 'addressTable',
                      },
                      tableAlias: 'addressTable',
                    },
                    {
                      _type: 'column',
                      column: 'STREET',
                      table: {
                        _type: 'Table',
                        database: 'db',
                        schema: 'default',
                        table: 'addressTable',
                      },
                      tableAlias: 'addressTable',
                    },
                  ],
                },
              },
              source: 'meta_pure_tests_model_simple_TradeEvent',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'Account',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'db',
            schema: 'default',
            table: 'accountTable',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Account',
                property: 'name',
              },
              relationalOperation: {
                _type: 'column',
                column: 'name',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'accountTable',
                },
                tableAlias: 'accountTable',
              },
              source: 'meta_pure_tests_model_simple_Account',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Account',
                property: 'createDate',
              },
              relationalOperation: {
                _type: 'column',
                column: 'createDate',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'accountTable',
                },
                tableAlias: 'accountTable',
              },
              source: 'meta_pure_tests_model_simple_Account',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Account',
                property: 'trades',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [{ db: 'db', name: 'Trade_Account' }],
              },
              source: 'meta_pure_tests_model_simple_Account',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Account',
                property: 'orders',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [{ db: 'db', name: 'Order_Account' }],
              },
              source: 'meta_pure_tests_model_simple_Account',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Account',
                property: 'accountPnl',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [{ db: 'db', name: 'AccountPnlView_Account' }],
              },
              source: 'meta_pure_tests_model_simple_Account',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'Interaction',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'db',
            schema: 'default',
            table: 'interactionTable',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Interaction',
                property: 'id',
              },
              relationalOperation: {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'interactionTable',
                },
                tableAlias: 'interactionTable',
              },
              source: 'meta_pure_tests_model_simple_Interaction',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Interaction',
                property: 'time',
              },
              relationalOperation: {
                _type: 'column',
                column: 'time',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'interactionTable',
                },
                tableAlias: 'interactionTable',
              },
              source: 'meta_pure_tests_model_simple_Interaction',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Interaction',
                property: 'source',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [{ db: 'db', name: 'Interaction_Source' }],
              },
              source: 'meta_pure_tests_model_simple_Interaction',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Interaction',
                property: 'target',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [{ db: 'db', name: 'Interaction_Target' }],
              },
              source: 'meta_pure_tests_model_simple_Interaction',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Interaction',
                property: 'active',
              },
              relationalOperation: {
                _type: 'dynaFunc',
                funcName: 'case',
                parameters: [
                  {
                    _type: 'dynaFunc',
                    funcName: 'equal',
                    parameters: [
                      {
                        _type: 'column',
                        column: 'active',
                        table: {
                          _type: 'Table',
                          database: 'db',
                          schema: 'default',
                          table: 'interactionTable',
                        },
                        tableAlias: 'interactionTable',
                      },
                      { _type: 'literal', value: 'Y' },
                    ],
                  },
                  { _type: 'literal', value: 'true' },
                  { _type: 'literal', value: 'false' },
                ],
              },
              source: 'meta_pure_tests_model_simple_Interaction',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Interaction',
                property: 'longestInteractionBetweenSourceAndTarget',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  { db: 'db', name: 'InteractionTable_InteractionViewMaxTime' },
                ],
                relationalElement: {
                  _type: 'column',
                  column: 'maxTime',
                  table: {
                    _type: 'Table',
                    database: 'db',
                    schema: 'default',
                    table: 'interactionViewMaxTime',
                  },
                  tableAlias: 'interactionViewMaxTime',
                },
              },
              source: 'meta_pure_tests_model_simple_Interaction',
            },
          ],
          root: false,
        },
      ],
      enumerationMappings: [
        {
          enumValueMappings: [
            {
              enumValue: 'CUSIP',
              sourceValues: [{ _type: 'stringSourceValue', value: 'CUSIP' }],
            },
            {
              enumValue: 'ISIN',
              sourceValues: [{ _type: 'stringSourceValue', value: 'ISIN' }],
            },
          ],
          enumeration: 'ProductSynonymType',
          id: 'SynonymEnum',
        },
      ],
      name: 'simpleRelationalMapping',
      package: 'meta::relational::tests',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'meta::relational::tests::simpleRelationalMappingInc',
    content: {
      _type: 'mapping',
      includedMappings: [],
      classMappings: [
        {
          _type: 'relational',
          class: 'Person',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'dbInc',
            schema: 'default',
            table: 'personTable',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Person',
                property: 'firstName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'FIRSTNAME',
                table: {
                  _type: 'Table',
                  database: 'dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
              source: 'meta_pure_tests_model_simple_Person',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Person',
                property: 'age',
              },
              relationalOperation: {
                _type: 'column',
                column: 'AGE',
                table: {
                  _type: 'Table',
                  database: 'dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
              source: 'meta_pure_tests_model_simple_Person',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Person',
                property: 'lastName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'LASTNAME',
                table: {
                  _type: 'Table',
                  database: 'dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
              source: 'meta_pure_tests_model_simple_Person',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Person',
                property: 'firm',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [{ db: 'dbInc', name: 'Firm_Person' }],
              },
              source: 'meta_pure_tests_model_simple_Person',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::EntityWithAddress',
                property: 'address',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [{ db: 'dbInc', name: 'Address_Person' }],
              },
              source: 'meta_pure_tests_model_simple_Person',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::EntityWithLocations',
                property: 'locations',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [{ db: 'dbInc', name: 'Person_Location' }],
              },
              source: 'meta_pure_tests_model_simple_Person',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Person',
                property: 'manager',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [{ db: 'dbInc', name: 'Person_Manager' }],
              },
              source: 'meta_pure_tests_model_simple_Person',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'Firm',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'dbInc',
            schema: 'default',
            table: 'firmTable',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Firm',
                property: 'legalName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'LEGALNAME',
                table: {
                  _type: 'Table',
                  database: 'dbInc',
                  schema: 'default',
                  table: 'firmTable',
                },
                tableAlias: 'firmTable',
              },
              source: 'meta_pure_tests_model_simple_Firm',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Firm',
                property: 'employees',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [{ db: 'dbInc', name: 'Firm_Person' }],
              },
              source: 'meta_pure_tests_model_simple_Firm',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::EntityWithAddress',
                property: 'address',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [{ db: 'dbInc', name: 'Address_Firm' }],
              },
              source: 'meta_pure_tests_model_simple_Firm',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'FirmExtension',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'dbInc',
            schema: 'default',
            table: 'firmExtensionTable',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Firm',
                property: 'legalName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'legalName',
                table: {
                  _type: 'Table',
                  database: 'dbInc',
                  schema: 'default',
                  table: 'firmExtensionTable',
                },
                tableAlias: 'firmExtensionTable',
              },
              source: 'meta_pure_tests_model_simple_FirmExtension',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::FirmExtension',
                property: 'establishedDate',
              },
              relationalOperation: {
                _type: 'column',
                column: 'establishedDate',
                table: {
                  _type: 'Table',
                  database: 'dbInc',
                  schema: 'default',
                  table: 'firmExtensionTable',
                },
                tableAlias: 'firmExtensionTable',
              },
              source: 'meta_pure_tests_model_simple_FirmExtension',
            },
            {
              _type: 'embeddedPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::FirmExtension',
                property: 'employeesExt',
              },
              source: 'meta_pure_tests_model_simple_FirmExtension',
              classMapping: {
                _type: 'embedded',
                class: 'meta::pure::tests::model::simple::PersonExtension',
                id: 'meta_pure_tests_model_simple_PersonExtension.employeesExt',
                primaryKey: [],
                propertyMappings: [
                  {
                    _type: 'relationalPropertyMapping',
                    property: {
                      class:
                        'meta::pure::tests::model::simple::PersonExtension',
                      property: 'birthdate',
                    },
                    relationalOperation: {
                      _type: 'elemtWithJoins',
                      joins: [
                        { db: 'dbInc', name: 'FirmExtension_PersonExtension' },
                      ],
                      relationalElement: {
                        _type: 'column',
                        column: 'birthDate',
                        table: {
                          _type: 'Table',
                          database: 'dbInc',
                          schema: 'default',
                          table: 'PersonTableExtension',
                        },
                        tableAlias: 'PersonTableExtension',
                      },
                    },
                    source: 'meta_pure_tests_model_simple_FirmExtension',
                  },
                ],
                root: false,
              },
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'Address',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'dbInc',
            schema: 'default',
            table: 'addressTable',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Address',
                property: 'name',
              },
              relationalOperation: {
                _type: 'column',
                column: 'NAME',
                table: {
                  _type: 'Table',
                  database: 'dbInc',
                  schema: 'default',
                  table: 'addressTable',
                },
                tableAlias: 'addressTable',
              },
              source: 'meta_pure_tests_model_simple_Address',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Address',
                property: 'street',
              },
              relationalOperation: {
                _type: 'column',
                column: 'STREET',
                table: {
                  _type: 'Table',
                  database: 'dbInc',
                  schema: 'default',
                  table: 'addressTable',
                },
                tableAlias: 'addressTable',
              },
              source: 'meta_pure_tests_model_simple_Address',
            },
            {
              _type: 'relationalPropertyMapping',
              enumMappingId: 'GE',
              property: {
                class: 'meta::pure::tests::model::simple::GeographicEntity',
                property: 'type',
              },
              relationalOperation: {
                _type: 'column',
                column: 'TYPE',
                table: {
                  _type: 'Table',
                  database: 'dbInc',
                  schema: 'default',
                  table: 'addressTable',
                },
                tableAlias: 'addressTable',
              },
              source: 'meta_pure_tests_model_simple_Address',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Address',
                property: 'comments',
              },
              relationalOperation: {
                _type: 'column',
                column: 'COMMENTS',
                table: {
                  _type: 'Table',
                  database: 'dbInc',
                  schema: 'default',
                  table: 'addressTable',
                },
                tableAlias: 'addressTable',
              },
              source: 'meta_pure_tests_model_simple_Address',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'Location',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'dbInc',
            schema: 'default',
            table: 'locationTable',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Location',
                property: 'place',
              },
              relationalOperation: {
                _type: 'column',
                column: 'PLACE',
                table: {
                  _type: 'Table',
                  database: 'dbInc',
                  schema: 'default',
                  table: 'locationTable',
                },
                tableAlias: 'locationTable',
              },
              source: 'meta_pure_tests_model_simple_Location',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Location',
                property: 'censusdate',
              },
              relationalOperation: {
                _type: 'column',
                column: 'date',
                table: {
                  _type: 'Table',
                  database: 'dbInc',
                  schema: 'default',
                  table: 'locationTable',
                },
                tableAlias: 'locationTable',
              },
              source: 'meta_pure_tests_model_simple_Location',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'PlaceOfInterest',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'dbInc',
            schema: 'default',
            table: 'placeOfInterestTable',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::PlaceOfInterest',
                property: 'name',
              },
              relationalOperation: {
                _type: 'column',
                column: 'NAME',
                table: {
                  _type: 'Table',
                  database: 'dbInc',
                  schema: 'default',
                  table: 'placeOfInterestTable',
                },
                tableAlias: 'placeOfInterestTable',
              },
              source: 'meta_pure_tests_model_simple_PlaceOfInterest',
            },
          ],
          root: false,
        },
      ],
      enumerationMappings: [
        {
          enumValueMappings: [
            {
              enumValue: 'CITY',
              sourceValues: [{ _type: 'integerSourceValue', value: 1 }],
            },
          ],
          enumeration: 'GeographicEntityType',
          id: 'GE',
        },
      ],
      name: 'simpleRelationalMappingInc',
      package: 'meta::relational::tests',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: '__internal__::SectionIndex',
    content: {
      _type: 'sectionIndex',
      name: 'SectionIndex',
      package: '__internal__',
      sections: [
        { _type: 'importAware', imports: [], elements: [], parserName: 'Pure' },
        {
          _type: 'importAware',
          imports: [
            'meta::pure::tests::model::simple',
            'meta::relational::tests',
          ],
          elements: ['meta::relational::tests::simpleRelationalMapping'],
          parserName: 'Mapping',
        },
        {
          _type: 'importAware',
          imports: [
            'meta::pure::tests::model::simple',
            'meta::relational::tests',
          ],
          elements: ['meta::relational::tests::simpleRelationalMappingInc'],
          parserName: 'Mapping',
        },
        {
          _type: 'importAware',
          imports: [
            'meta::pure::tests::model::simple',
            'meta::relational::tests',
          ],
          elements: [
            'meta::relational::tests::simpleRelationalMappingWithBackwardCompatibleProtocol',
          ],
          parserName: 'Mapping',
        },
        {
          _type: 'default',
          elements: ['meta::relational::tests::db'],
          parserName: 'Relational',
        },
        {
          _type: 'default',
          elements: ['meta::relational::tests::dbInc'],
          parserName: 'Relational',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Person'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Firm'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::FirmExtension'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Address'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Location'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::PlaceOfInterest'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::PersonExtension'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Product'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Synonym'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Trade'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Order'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::OrderPnl'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::AccountPnl'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::TradeEvent'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Account'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Interaction'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::EntityWithAddress'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::EntityWithLocations'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::GeographicEntity'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: [],
          elements: ['meta::relational::tests::mapping::union::extend::Person'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: [],
          elements: ['meta::relational::tests::mapping::union::extend::Firm'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: [],
          elements: [
            'meta::relational::tests::mapping::union::extend::Address',
          ],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: [
            'meta::relational::tests::mapping::subType',
            'meta::relational::tests',
            'meta::pure::tests::model::simple',
          ],
          elements: ['meta::relational::tests::mapping::subType::MyProduct'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Organization'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Bridge'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::PersonNameParameter'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::ProductClassification'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::Person'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Division'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Department'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Team'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::FemalePerson'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::FemaleExecutive'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::MalePerson'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::MaleExecutive'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: [
            'meta::relational::tests::mapping::subType',
            'meta::relational::tests',
            'meta::pure::tests::model::simple',
          ],
          elements: ['meta::relational::tests::mapping::subType::CreditRating'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: [
            'meta::pure::tests::model::simple::PersonNameParameterNested',
          ],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::Business'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::Executive'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::Professional'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::Organization'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::EntityWithLocation'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::GeoLocation'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::ProductSynonymType'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::GeographicEntityType'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::GenderType'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::OrgLevelType'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Employment'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::FirmCEO'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Membership'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::BridgeAsso1'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::FirmOrganizations'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::BridgeAsso2'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::AddressLocation'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::PlacesOfInterest'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::ProdSynonym'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Trade_Accounts'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Trade_Orders'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Account_AccountPnl'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::Person_Accounts'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: [
            'meta::relational::tests::mapping::subType',
            'meta::relational::tests',
            'meta::pure::tests::model::simple',
          ],
          elements: [
            'meta::relational::tests::mapping::subType::ProductRating',
          ],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::SubOrganization'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::Business_Employees'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::Parent_Children'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::OrgStructures'],
          parserName: 'Pure',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
  {
    path: 'meta::relational::tests::simpleRelationalMappingWithBackwardCompatibleProtocol',
    content: {
      _type: 'mapping',
      includedMappings: [
        {
          includedMapping: 'simpleRelationalMappingInc',
        },
      ],
      classMappings: [],
      name: 'simpleRelationalMappingWithBackwardCompatibleProtocol',
      package: 'meta::relational::tests',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
];

export const TEST_DATA__targetSetImplementationThroughAssociation = [
  {
    path: 'apps::pure::studio::model::simple::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'apps::pure::studio::model::simple',
      properties: [
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
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'nickName',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'apps::pure::studio::model::simple::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'apps::pure::studio::model::simple',
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
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'otherNames',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'nickName',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'activeEmployment',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Boolean',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'apps::pure::studio::model::simple::Employment',
    content: {
      _type: 'association',
      name: 'Employment',
      package: 'apps::pure::studio::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'firm',
          type: 'apps::pure::studio::model::simple::Firm',
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'employees',
          type: 'apps::pure::studio::model::simple::Person',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'apps::pure::studio::model::simple::dbInc',
    content: {
      _type: 'relational',
      filters: [],
      joins: [
        {
          name: 'Firm_Person',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'apps::pure::studio::model::simple::dbInc',
                  schema: 'default',
                  table: 'firmTable',
                },
                tableAlias: 'firmTable',
              },
              {
                _type: 'column',
                column: 'FIRMID',
                table: {
                  _type: 'Table',
                  database: 'apps::pure::studio::model::simple::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            ],
          },
        },
      ],
      name: 'dbInc',
      package: 'apps::pure::studio::model::simple',
      schemas: [
        {
          name: 'default',
          tables: [
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'FIRSTNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'LASTNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'AGE',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'ADDRESSID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'FIRMID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'MANAGERID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
              ],
              name: 'personTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'LEGALNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'ADDRESSID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'CEOID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
              ],
              name: 'firmTable',
              primaryKey: ['ID'],
            },
          ],
          views: [],
        },
      ],
      includedStores: [],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'apps::pure::studio::model::simple::simpleRelationalMapping',
    content: {
      _type: 'mapping',
      includedMappings: [],
      classMappings: [
        {
          _type: 'relational',
          class: 'apps::pure::studio::model::simple::Person',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'apps::pure::studio::model::simple::dbInc',
            schema: 'default',
            table: 'personTable',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'apps::pure::studio::model::simple::Person',
                property: 'firstName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'FIRSTNAME',
                table: {
                  _type: 'Table',
                  database: 'apps::pure::studio::model::simple::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
              source: 'apps_pure_studio_model_simple_Person',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'apps::pure::studio::model::simple::Person',
                property: 'lastName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'LASTNAME',
                table: {
                  _type: 'Table',
                  database: 'apps::pure::studio::model::simple::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
              source: 'apps_pure_studio_model_simple_Person',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'apps::pure::studio::model::simple::Person',
                property: 'firm',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'apps::pure::studio::model::simple::dbInc',
                    name: 'Firm_Person',
                  },
                ],
              },
              source: 'apps_pure_studio_model_simple_Person',
              target: 'apps_pure_studio_model_simple_Firm',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'apps::pure::studio::model::simple::Firm',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'apps::pure::studio::model::simple::dbInc',
            schema: 'default',
            table: 'firmTable',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'apps::pure::studio::model::simple::Firm',
                property: 'legalName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'LEGALNAME',
                table: {
                  _type: 'Table',
                  database: 'apps::pure::studio::model::simple::dbInc',
                  schema: 'default',
                  table: 'firmTable',
                },
                tableAlias: 'firmTable',
              },
              source: 'apps_pure_studio_model_simple_Firm',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'apps::pure::studio::model::simple::Firm',
                property: 'employees',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'apps::pure::studio::model::simple::dbInc',
                    name: 'Firm_Person',
                  },
                ],
              },
              source: 'apps_pure_studio_model_simple_Firm',
            },
          ],
          root: false,
        },
      ],
      enumerationMappings: [],
      name: 'simpleRelationalMapping',
      package: 'apps::pure::studio::model::simple',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'apps::Name_toDefine',
    content: {
      _type: 'service',
      autoActivateUpdates: true,
      documentation: 'service for studio test',
      execution: {
        _type: 'pureSingleExecution',
        func: {
          _type: 'lambda',
          body: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'func',
                  function: 'getAll',
                  parameters: [
                    {
                      _type: 'packageableElementPtr',
                      fullPath: 'apps::pure::studio::model::simple::Person',
                    },
                  ],
                },
                {
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
                              _type: 'func',
                              function: 'toOne',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'p',
                                    },
                                  ],
                                  property: 'firm',
                                },
                              ],
                            },
                          ],
                          property: 'legalName',
                        },
                        {
                          _type: 'string',
                          multiplicity: {
                            lowerBound: 1,
                            upperBound: 1,
                          },
                          values: ['Firm X'],
                        },
                      ],
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'p',
                    },
                  ],
                },
              ],
            },
          ],
          parameters: [],
        },
        mapping: 'apps::pure::studio::model::simple::simpleRelationalMapping',
        runtime: {
          _type: 'engineRuntime',
          connections: [
            {
              store: {
                path: 'apps::pure::studio::model::simple::dbInc',
                type: 'STORE',
              },
              storeConnections: [
                {
                  connection: {
                    _type: 'connectionPointer',
                    connection: 'simple::H2Connection',
                  },
                  id: 'id1',
                },
              ],
            },
          ],
          mappings: [
            {
              path: 'apps::pure::studio::model::simple::simpleRelationalMapping',
              type: 'MAPPING',
            },
          ],
        },
      },
      name: 'Name_toDefine',
      owners: ['uyagum'],
      package: 'apps',
      pattern: '/test/StudioTest5',
      test: {
        _type: 'singleExecutionTest',
        asserts: [
          {
            assert: {
              _type: 'lambda',
              body: [
                {
                  _type: 'func',
                  function: 'equal',
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
                              name: 'res',
                            },
                          ],
                          property: 'values',
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
              parameters: [
                {
                  _type: 'var',
                  class: 'meta::pure::mapping::Result',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  name: 'res',
                },
              ],
            },
          },
          {
            assert: {
              _type: 'lambda',
              body: [
                {
                  _type: 'func',
                  function: 'not',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'equal',
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
                                  name: 'res',
                                },
                              ],
                              property: 'values',
                            },
                          ],
                        },
                        {
                          _type: 'integer',
                          multiplicity: {
                            lowerBound: 1,
                            upperBound: 1,
                          },
                          values: [2],
                        },
                      ],
                    },
                  ],
                },
              ],
              parameters: [
                {
                  _type: 'var',
                  class: 'meta::pure::mapping::Result',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  name: 'res',
                },
              ],
            },
          },
        ],
        data: 'default\npersonTable\nFIRSTNAME,ID\nfirstName1,1\nfirstName2,2\nfirstName3,3\nfirstName4,4\nfirstName5,5\nfirstName6,6\nfirstName7,7\n-----\n',
      },
    },
    classifierPath: 'meta::legend::service::metamodel::Service',
  },
  {
    path: 'simple::H2Connection',
    content: {
      _type: 'connection',
      connectionValue: {
        _type: 'RelationalDatabaseConnection',
        authenticationStrategy: {
          _type: 'h2Default',
        },
        datasourceSpecification: {
          _type: 'static',
          databaseName: 'myDb',
          host: 'somehost',
          port: 999,
        },
        element: 'apps::pure::studio::model::simple::dbInc',
        type: 'H2',
      },
      name: 'H2Connection',
      package: 'simple',
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
];

export const TEST_DATA__embeddedRelationalTestData = [
  {
    path: 'meta::pure::tests::model::simple::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'meta::pure::tests::model::simple',
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
        { multiplicity: { lowerBound: 0 }, name: 'otherNames', type: 'String' },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'extraInformation',
          type: 'String',
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'manager',
          type: 'Person',
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'age',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'nickName',
          type: 'String',
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'activeEmployment',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Boolean',
            },
          },
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
                  multiplicity: { lowerBound: 3, upperBound: 3 },
                  values: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'firstName',
                    },
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: [' '],
                    },
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'lastName',
                    },
                  ],
                },
              ],
            },
          ],
          name: 'name',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'plus',
              parameters: [
                {
                  _type: 'collection',
                  multiplicity: { lowerBound: 5, upperBound: 5 },
                  values: [
                    { _type: 'var', name: 'title' },
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: [' '],
                    },
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'firstName',
                    },
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: [' '],
                    },
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'lastName',
                    },
                  ],
                },
              ],
            },
          ],
          name: 'nameWithTitle',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'title',
            },
          ],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'if',
              parameters: [
                {
                  _type: 'func',
                  function: 'isEmpty',
                  parameters: [{ _type: 'var', name: 'prefix' }],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'if',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'isEmpty',
                          parameters: [{ _type: 'var', name: 'suffixes' }],
                        },
                        {
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
                                        { _type: 'var', name: 'this' },
                                      ],
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
                                      parameters: [
                                        { _type: 'var', name: 'this' },
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
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'plus',
                              parameters: [
                                {
                                  _type: 'collection',
                                  multiplicity: {
                                    lowerBound: 5,
                                    upperBound: 5,
                                  },
                                  values: [
                                    {
                                      _type: 'property',
                                      parameters: [
                                        { _type: 'var', name: 'this' },
                                      ],
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
                                      parameters: [
                                        { _type: 'var', name: 'this' },
                                      ],
                                      property: 'lastName',
                                    },
                                    {
                                      _type: 'string',
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                      values: [', '],
                                    },
                                    {
                                      _type: 'func',
                                      function: 'joinStrings',
                                      parameters: [
                                        { _type: 'var', name: 'suffixes' },
                                        {
                                          _type: 'string',
                                          multiplicity: {
                                            lowerBound: 1,
                                            upperBound: 1,
                                          },
                                          values: [', '],
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
                      ],
                    },
                  ],
                  parameters: [],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'if',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'isEmpty',
                          parameters: [{ _type: 'var', name: 'suffixes' }],
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'plus',
                              parameters: [
                                {
                                  _type: 'collection',
                                  multiplicity: {
                                    lowerBound: 5,
                                    upperBound: 5,
                                  },
                                  values: [
                                    {
                                      _type: 'func',
                                      function: 'toOne',
                                      parameters: [
                                        { _type: 'var', name: 'prefix' },
                                      ],
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
                                      parameters: [
                                        { _type: 'var', name: 'this' },
                                      ],
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
                                      parameters: [
                                        { _type: 'var', name: 'this' },
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
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'plus',
                              parameters: [
                                {
                                  _type: 'collection',
                                  multiplicity: {
                                    lowerBound: 7,
                                    upperBound: 7,
                                  },
                                  values: [
                                    {
                                      _type: 'func',
                                      function: 'toOne',
                                      parameters: [
                                        { _type: 'var', name: 'prefix' },
                                      ],
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
                                      parameters: [
                                        { _type: 'var', name: 'this' },
                                      ],
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
                                      parameters: [
                                        { _type: 'var', name: 'this' },
                                      ],
                                      property: 'lastName',
                                    },
                                    {
                                      _type: 'string',
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                      values: [', '],
                                    },
                                    {
                                      _type: 'func',
                                      function: 'joinStrings',
                                      parameters: [
                                        { _type: 'var', name: 'suffixes' },
                                        {
                                          _type: 'string',
                                          multiplicity: {
                                            lowerBound: 1,
                                            upperBound: 1,
                                          },
                                          values: [', '],
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
                      ],
                    },
                  ],
                  parameters: [],
                },
              ],
            },
          ],
          name: 'nameWithPrefixAndSuffix',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: { lowerBound: 0, upperBound: 1 },
              name: 'prefix',
            },
            {
              _type: 'var',
              class: 'String',
              multiplicity: { lowerBound: 0 },
              name: 'suffixes',
            },
          ],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'if',
              parameters: [
                { _type: 'var', name: 'lastNameFirst' },
                {
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
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'lastName',
                            },
                            {
                              _type: 'string',
                              multiplicity: { lowerBound: 1, upperBound: 1 },
                              values: [', '],
                            },
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'firstName',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [],
                },
                {
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
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'firstName',
                            },
                            {
                              _type: 'string',
                              multiplicity: { lowerBound: 1, upperBound: 1 },
                              values: [' '],
                            },
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'lastName',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [],
                },
              ],
            },
          ],
          name: 'fullName',
          parameters: [
            {
              _type: 'var',
              class: 'Boolean',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'lastNameFirst',
            },
          ],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'if',
              parameters: [
                {
                  _type: 'property',
                  parameters: [{ _type: 'var', name: 'personNameParameter' }],
                  property: 'lastNameFirst',
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'plus',
                      parameters: [
                        {
                          _type: 'collection',
                          multiplicity: { lowerBound: 5, upperBound: 5 },
                          values: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'personNameParameter',
                                    },
                                  ],
                                  property: 'nested',
                                },
                              ],
                              property: 'prefix',
                            },
                            {
                              _type: 'string',
                              multiplicity: { lowerBound: 1, upperBound: 1 },
                              values: [' '],
                            },
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'lastName',
                            },
                            {
                              _type: 'string',
                              multiplicity: { lowerBound: 1, upperBound: 1 },
                              values: [', '],
                            },
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'firstName',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [],
                },
                {
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
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'firstName',
                            },
                            {
                              _type: 'string',
                              multiplicity: { lowerBound: 1, upperBound: 1 },
                              values: [' '],
                            },
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'lastName',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [],
                },
              ],
            },
          ],
          name: 'parameterizedName',
          parameters: [
            {
              _type: 'var',
              class: 'PersonNameParameter',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'personNameParameter',
            },
          ],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'removeDuplicates',
              parameters: [
                {
                  _type: 'func',
                  function: 'concatenate',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'organizations',
                    },
                    {
                      _type: 'func',
                      function: 'map',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [{ _type: 'var', name: 'this' }],
                          property: 'organizations',
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'o' }],
                              property: 'superOrganizations',
                            },
                          ],
                          parameters: [{ _type: 'var', name: 'o' }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'allOrganizations',
          parameters: [],
          returnMultiplicity: { lowerBound: 0 },
          returnType: 'Organization',
        },
        {
          body: [
            {
              _type: 'string',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              values: ['constant'],
            },
          ],
          name: 'constant',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'concatenate',
              parameters: [
                {
                  _type: 'property',
                  parameters: [{ _type: 'var', name: 'this' }],
                  property: 'address',
                },
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'firm',
                    },
                  ],
                  property: 'address',
                },
              ],
            },
          ],
          name: 'addresses',
          parameters: [],
          returnMultiplicity: { lowerBound: 0 },
          returnType: 'Address',
        },
      ],
      superTypes: ['EntityWithAddress', 'EntityWithLocations'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Address',
    content: {
      _type: 'class',
      name: 'Address',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'name',
          type: 'String',
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'street',
          type: 'String',
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'comments',
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
                  multiplicity: { lowerBound: 2, upperBound: 2 },
                  values: [
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: ['D:'],
                    },
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'name',
                    },
                  ],
                },
              ],
            },
          ],
          name: 'description',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
      superTypes: ['GeographicEntity'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'legalName',
          type: 'String',
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'nickName',
          type: 'String',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'times',
              parameters: [
                {
                  _type: 'collection',
                  multiplicity: { lowerBound: 2, upperBound: 2 },
                  values: [
                    {
                      _type: 'func',
                      function: 'average',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'employees',
                            },
                          ],
                          property: 'age',
                        },
                      ],
                    },
                    {
                      _type: 'float',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: [2],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'averageEmployeesAge',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'sum',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'employees',
                    },
                  ],
                  property: 'age',
                },
              ],
            },
          ],
          name: 'sumEmployeesAge',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'max',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'employees',
                    },
                  ],
                  property: 'age',
                },
              ],
            },
          ],
          name: 'maxEmployeesAge',
          parameters: [],
          returnMultiplicity: { lowerBound: 0, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
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
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'legalName',
                    },
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: [','],
                    },
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'toOne',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'address',
                            },
                          ],
                        },
                      ],
                      property: 'name',
                    },
                  ],
                },
              ],
            },
          ],
          name: 'nameAndAddress',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
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
                      _type: 'func',
                      function: 'toOne',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [{ _type: 'var', name: 'this' }],
                          property: 'legalName',
                        },
                      ],
                    },
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: ['Firm X'],
                    },
                  ],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: ['Yes'],
                    },
                  ],
                  parameters: [],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: ['No'],
                    },
                  ],
                  parameters: [],
                },
              ],
            },
          ],
          name: 'isfirmX',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
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
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'legalName',
                    },
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: ['Firm X'],
                    },
                  ],
                },
                {
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
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'legalName',
                            },
                            {
                              _type: 'string',
                              multiplicity: { lowerBound: 1, upperBound: 1 },
                              values: [' , Top Secret'],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [],
                },
                {
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
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'legalName',
                            },
                            {
                              _type: 'string',
                              multiplicity: { lowerBound: 1, upperBound: 1 },
                              values: [','],
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'func',
                                  function: 'toOne',
                                  parameters: [
                                    {
                                      _type: 'property',
                                      parameters: [
                                        { _type: 'var', name: 'this' },
                                      ],
                                      property: 'address',
                                    },
                                  ],
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
              ],
            },
          ],
          name: 'nameAndMaskedAddress',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'toOne',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'employees',
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'e' }],
                              property: 'lastName',
                            },
                            { _type: 'var', name: 'lastName' },
                          ],
                        },
                      ],
                      parameters: [{ _type: 'var', name: 'e' }],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'employeeByLastName',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'lastName',
            },
          ],
          returnMultiplicity: { lowerBound: 0, upperBound: 1 },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'property',
              parameters: [
                {
                  _type: 'func',
                  function: 'toOne',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'filter',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [{ _type: 'var', name: 'this' }],
                          property: 'employees',
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'equal',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [{ _type: 'var', name: 'e' }],
                                  property: 'lastName',
                                },
                                { _type: 'var', name: 'lastName' },
                              ],
                            },
                          ],
                          parameters: [{ _type: 'var', name: 'e' }],
                        },
                      ],
                    },
                  ],
                },
              ],
              property: 'firstName',
            },
          ],
          name: 'employeeByLastNameFirstName',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'lastName',
            },
          ],
          returnMultiplicity: { lowerBound: 0, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'toOne',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'employees',
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            { _type: 'var', name: 'lastName' },
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'e' }],
                              property: 'lastName',
                            },
                          ],
                        },
                      ],
                      parameters: [{ _type: 'var', name: 'e' }],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'employeeByLastNameWhereVarIsFirstEqualArg',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'lastName',
            },
          ],
          returnMultiplicity: { lowerBound: 0, upperBound: 1 },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'property',
                  parameters: [{ _type: 'var', name: 'this' }],
                  property: 'employees',
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'lessThan',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'toOne',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'e' }],
                              property: 'age',
                            },
                          ],
                        },
                        { _type: 'var', name: 'age' },
                      ],
                    },
                  ],
                  parameters: [{ _type: 'var', name: 'e' }],
                },
              ],
            },
          ],
          name: 'employeesByAge',
          parameters: [
            {
              _type: 'var',
              class: 'Integer',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'age',
            },
          ],
          returnMultiplicity: { lowerBound: 0 },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'property',
                  parameters: [{ _type: 'var', name: 'this' }],
                  property: 'employees',
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'or',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [{ _type: 'var', name: 'e' }],
                                  property: 'address',
                                },
                              ],
                              property: 'name',
                            },
                            { _type: 'var', name: 'city' },
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
                                  _type: 'property',
                                  parameters: [{ _type: 'var', name: 'e' }],
                                  property: 'manager',
                                },
                              ],
                              property: 'name',
                            },
                            { _type: 'var', name: 'managerName' },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [{ _type: 'var', name: 'e' }],
                },
              ],
            },
          ],
          name: 'employeesByCityOrManager',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'city',
            },
            {
              _type: 'var',
              class: 'String',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'managerName',
            },
          ],
          returnMultiplicity: { lowerBound: 0 },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'toOne',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'employees',
                    },
                    {
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
                                  parameters: [{ _type: 'var', name: 'e' }],
                                  property: 'lastName',
                                },
                                { _type: 'var', name: 'name' },
                              ],
                            },
                            {
                              _type: 'func',
                              function: 'or',
                              parameters: [
                                {
                                  _type: 'func',
                                  function: 'equal',
                                  parameters: [
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'property',
                                          parameters: [
                                            { _type: 'var', name: 'e' },
                                          ],
                                          property: 'address',
                                        },
                                      ],
                                      property: 'name',
                                    },
                                    { _type: 'var', name: 'city' },
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
                                          _type: 'property',
                                          parameters: [
                                            { _type: 'var', name: 'e' },
                                          ],
                                          property: 'manager',
                                        },
                                      ],
                                      property: 'name',
                                    },
                                    { _type: 'var', name: 'managerName' },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                      parameters: [{ _type: 'var', name: 'e' }],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'employeesByCityOrManagerAndLastName',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'name',
            },
            {
              _type: 'var',
              class: 'String',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'city',
            },
            {
              _type: 'var',
              class: 'String',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'managerName',
            },
          ],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'exists',
              parameters: [
                {
                  _type: 'property',
                  parameters: [{ _type: 'var', name: 'this' }],
                  property: 'employees',
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'lessThan',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'toOne',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'e' }],
                              property: 'age',
                            },
                          ],
                        },
                        { _type: 'var', name: 'age' },
                      ],
                    },
                  ],
                  parameters: [{ _type: 'var', name: 'e' }],
                },
              ],
            },
          ],
          name: 'hasEmployeeBelowAge',
          parameters: [
            {
              _type: 'var',
              class: 'Integer',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'age',
            },
          ],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Boolean',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'first',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'employees',
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'e' }],
                              property: 'name',
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [{ _type: 'var', name: 'this' }],
                                  property: 'address',
                                },
                              ],
                              property: 'name',
                            },
                          ],
                        },
                      ],
                      parameters: [{ _type: 'var', name: 'e' }],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'employeeWithFirmAddressName',
          parameters: [],
          returnMultiplicity: { lowerBound: 0, upperBound: 1 },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'first',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'employees',
                    },
                    {
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
                                  _type: 'property',
                                  parameters: [{ _type: 'var', name: 'e' }],
                                  property: 'address',
                                },
                              ],
                              property: 'name',
                            },
                            { _type: 'var', name: 'name' },
                          ],
                        },
                      ],
                      parameters: [{ _type: 'var', name: 'e' }],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'employeeWithAddressName',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'name',
            },
          ],
          returnMultiplicity: { lowerBound: 0, upperBound: 1 },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'joinStrings',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'sortBy',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'filter',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'this' }],
                              property: 'employees',
                            },
                            {
                              _type: 'lambda',
                              body: [
                                {
                                  _type: 'func',
                                  function: 'equal',
                                  parameters: [
                                    {
                                      _type: 'func',
                                      function: 'trim',
                                      parameters: [
                                        {
                                          _type: 'func',
                                          function: 'toOne',
                                          parameters: [
                                            {
                                              _type: 'property',
                                              parameters: [
                                                {
                                                  _type: 'property',
                                                  parameters: [
                                                    { _type: 'var', name: 'e' },
                                                  ],
                                                  property: 'address',
                                                },
                                              ],
                                              property: 'name',
                                            },
                                          ],
                                        },
                                      ],
                                    },
                                    { _type: 'var', name: 'name' },
                                  ],
                                },
                              ],
                              parameters: [{ _type: 'var', name: 'e' }],
                            },
                          ],
                        },
                        {
                          _type: 'path',
                          path: [
                            {
                              _type: 'propertyPath',
                              parameters: [],
                              property: 'lastName',
                            },
                          ],
                          startType: 'Person',
                        },
                      ],
                    },
                  ],
                  property: 'lastName',
                },
                {
                  _type: 'string',
                  multiplicity: { lowerBound: 1, upperBound: 1 },
                  values: [''],
                },
              ],
            },
          ],
          name: 'employeesWithAddressNameSorted',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'name',
            },
          ],
          returnMultiplicity: { lowerBound: 0, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'func',
                  function: 'map',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'employees',
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          parameters: [{ _type: 'var', name: 'e' }],
                          property: 'address',
                        },
                      ],
                      parameters: [{ _type: 'var', name: 'e' }],
                    },
                  ],
                },
                {
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
                            { _type: 'var', name: 'name' },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [{ _type: 'var', name: 'this' }],
                                  property: 'address',
                                },
                              ],
                              property: 'name',
                            },
                          ],
                        },
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            { _type: 'var', name: 't' },
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'x' }],
                              property: 'type',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [{ _type: 'var', name: 'x' }],
                },
              ],
            },
          ],
          name: 'employeeAddressesWithFirmAddressName',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'name',
            },
            {
              _type: 'var',
              class: 'GeographicEntityType',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 't',
            },
          ],
          returnMultiplicity: { lowerBound: 0 },
          returnType: 'Address',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'in',
              parameters: [
                {
                  _type: 'property',
                  parameters: [{ _type: 'var', name: 'this' }],
                  property: 'legalName',
                },
                {
                  _type: 'collection',
                  multiplicity: { lowerBound: 3, upperBound: 3 },
                  values: [
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: ['Firm X'],
                    },
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: ['Firm X & Co.'],
                    },
                    {
                      _type: 'string',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: ['Firm X and Group'],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'isfirmXGroup',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Boolean',
            },
          },
        },
      ],
      superTypes: ['EntityWithAddress'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::EntityWithAddress',
    content: {
      _type: 'class',
      name: 'EntityWithAddress',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'address',
          type: 'Address',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::EntityWithLocations',
    content: {
      _type: 'class',
      name: 'EntityWithLocations',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 0 },
          name: 'locations',
          type: 'Location',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'property',
                  parameters: [{ _type: 'var', name: 'this' }],
                  property: 'locations',
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'exists',
                      parameters: [
                        { _type: 'var', name: 'types' },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'is',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [{ _type: 'var', name: 'l' }],
                                  property: 'type',
                                },
                                { _type: 'var', name: 'type' },
                              ],
                            },
                          ],
                          parameters: [{ _type: 'var', name: 'type' }],
                        },
                      ],
                    },
                  ],
                  parameters: [{ _type: 'var', name: 'l' }],
                },
              ],
            },
          ],
          name: 'locationsByType',
          parameters: [
            {
              _type: 'var',
              class: 'GeographicEntityType',
              multiplicity: { lowerBound: 0 },
              name: 'types',
            },
          ],
          returnMultiplicity: { lowerBound: 0 },
          returnType: 'Location',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::GeographicEntity',
    content: {
      _type: 'class',
      name: 'GeographicEntity',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'type',
          type: 'GeographicEntityType',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::relational::tests::mapping::union::extend::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'meta::relational::tests::mapping::union::extend',
      superTypes: ['meta::pure::tests::model::simple::Person'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::PersonExtension',
    content: {
      _type: 'class',
      name: 'PersonExtension',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'birthdate',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Date',
            },
          },
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'year',
              parameters: [
                {
                  _type: 'property',
                  parameters: [{ _type: 'var', name: 'this' }],
                  property: 'birthdate',
                },
              ],
            },
          ],
          name: 'birthYear',
          parameters: [],
          returnMultiplicity: { lowerBound: 0, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
      ],
      superTypes: ['meta::pure::tests::model::simple::Person'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::relational::tests::mapping::union::extend::Address',
    content: {
      _type: 'class',
      name: 'Address',
      package: 'meta::relational::tests::mapping::union::extend',
      superTypes: ['meta::pure::tests::model::simple::Address'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::relational::tests::mapping::union::extend::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'meta::relational::tests::mapping::union::extend',
      superTypes: ['meta::pure::tests::model::simple::Firm'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::FirmExtension',
    content: {
      _type: 'class',
      name: 'FirmExtension',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'establishedDate',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Date',
            },
          },
        },
        {
          multiplicity: { lowerBound: 0 },
          name: 'employeesExt',
          type: 'meta::pure::tests::model::simple::PersonExtension',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'year',
              parameters: [
                {
                  _type: 'property',
                  parameters: [{ _type: 'var', name: 'this' }],
                  property: 'establishedDate',
                },
              ],
            },
          ],
          name: 'establishedYear',
          parameters: [],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          body: [
            {
              _type: 'func',
              function: 'joinStrings',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'employeesExt',
                    },
                  ],
                  property: 'lastName',
                },
                {
                  _type: 'string',
                  multiplicity: { lowerBound: 1, upperBound: 1 },
                  values: [','],
                },
              ],
            },
          ],
          name: 'allEmployeesLastName',
          parameters: [],
          returnMultiplicity: { lowerBound: 0, upperBound: 1 },
          returnGenericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
      superTypes: ['Firm'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Organization',
    content: {
      _type: 'class',
      name: 'Organization',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'name',
          type: 'String',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'letFunction',
              parameters: [
                {
                  _type: 'string',
                  multiplicity: { lowerBound: 1, upperBound: 1 },
                  values: ['parent'],
                },
                {
                  _type: 'property',
                  parameters: [{ _type: 'var', name: 'this' }],
                  property: 'parent',
                },
              ],
            },
            {
              _type: 'func',
              function: 'if',
              parameters: [
                {
                  _type: 'func',
                  function: 'isEmpty',
                  parameters: [{ _type: 'var', name: 'parent' }],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'collection',
                      multiplicity: { lowerBound: 0, upperBound: 0 },
                      values: [],
                    },
                  ],
                  parameters: [],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'concatenate',
                      parameters: [
                        { _type: 'var', name: 'parent' },
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'func',
                              function: 'toOne',
                              parameters: [{ _type: 'var', name: 'parent' }],
                            },
                          ],
                          property: 'superOrganizations',
                        },
                      ],
                    },
                  ],
                  parameters: [],
                },
              ],
            },
          ],
          name: 'superOrganizations',
          parameters: [],
          returnMultiplicity: { lowerBound: 0 },
          returnType: 'Organization',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'removeDuplicates',
              parameters: [
                {
                  _type: 'func',
                  function: 'concatenate',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'children',
                    },
                    {
                      _type: 'func',
                      function: 'map',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [{ _type: 'var', name: 'this' }],
                          property: 'children',
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'c' }],
                              property: 'subOrganizations',
                            },
                          ],
                          parameters: [{ _type: 'var', name: 'c' }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'subOrganizations',
          parameters: [],
          returnMultiplicity: { lowerBound: 0 },
          returnType: 'Organization',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'toOne',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'children',
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'c' }],
                              property: 'name',
                            },
                            { _type: 'var', name: 'name' },
                          ],
                        },
                      ],
                      parameters: [{ _type: 'var', name: 'c' }],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'child',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              name: 'name',
            },
          ],
          returnMultiplicity: { lowerBound: 1, upperBound: 1 },
          returnType: 'Organization',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'removeDuplicates',
              parameters: [
                {
                  _type: 'func',
                  function: 'concatenate',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'this' }],
                      property: 'members',
                    },
                    {
                      _type: 'func',
                      function: 'map',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [{ _type: 'var', name: 'this' }],
                          property: 'subOrganizations',
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'o' }],
                              property: 'members',
                            },
                          ],
                          parameters: [{ _type: 'var', name: 'o' }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          name: 'allMembers',
          parameters: [],
          returnMultiplicity: { lowerBound: 0 },
          returnType: 'Person',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Bridge',
    content: {
      _type: 'class',
      name: 'Bridge',
      package: 'meta::pure::tests::model::simple',
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::PersonNameParameter',
    content: {
      _type: 'class',
      name: 'PersonNameParameter',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'lastNameFirst',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Boolean',
            },
          },
        },
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'nested',
          type: 'PersonNameParameterNested',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Location',
    content: {
      _type: 'class',
      name: 'Location',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'place',
          type: 'String',
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'censusdate',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Date',
            },
          },
        },
      ],
      superTypes: ['GeographicEntity'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Division',
    content: {
      _type: 'class',
      name: 'Division',
      package: 'meta::pure::tests::model::simple',
      superTypes: ['Organization'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Department',
    content: {
      _type: 'class',
      name: 'Department',
      package: 'meta::pure::tests::model::simple',
      superTypes: ['Organization'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Team',
    content: {
      _type: 'class',
      name: 'Team',
      package: 'meta::pure::tests::model::simple',
      superTypes: ['Organization'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::PersonNameParameterNested',
    content: {
      _type: 'class',
      name: 'PersonNameParameterNested',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'prefix',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::PlaceOfInterest',
    content: {
      _type: 'class',
      name: 'PlaceOfInterest',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'name',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Employment',
    content: {
      _type: 'association',
      name: 'Employment',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'firm',
          type: 'Firm',
        },
        { multiplicity: { lowerBound: 0 }, name: 'employees', type: 'Person' },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::FirmCEO',
    content: {
      _type: 'association',
      name: 'FirmCEO',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'ceoFirm',
          type: 'Firm',
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'ceo',
          type: 'Person',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::Membership',
    content: {
      _type: 'association',
      name: 'Membership',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 0 },
          name: 'organizations',
          type: 'Organization',
        },
        { multiplicity: { lowerBound: 0 }, name: 'members', type: 'Person' },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::BridgeAsso1',
    content: {
      _type: 'association',
      name: 'BridgeAsso1',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'bridge',
          type: 'Bridge',
        },
        { multiplicity: { lowerBound: 0 }, name: 'employees', type: 'Person' },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::AddressLocation',
    content: {
      _type: 'association',
      name: 'AddressLocation',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'location',
          type: 'Location',
        },
        { multiplicity: { lowerBound: 0 }, name: 'addresses', type: 'Address' },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::FirmOrganizations',
    content: {
      _type: 'association',
      name: 'FirmOrganizations',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'firm',
          type: 'Firm',
        },
        {
          multiplicity: { lowerBound: 0 },
          name: 'organizations',
          type: 'Organization',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::BridgeAsso2',
    content: {
      _type: 'association',
      name: 'BridgeAsso2',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'bridge',
          type: 'Bridge',
        },
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'firm',
          type: 'Firm',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::SubOrganization',
    content: {
      _type: 'association',
      name: 'SubOrganization',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 0, upperBound: 1 },
          name: 'parent',
          type: 'Organization',
        },
        {
          multiplicity: { lowerBound: 0 },
          name: 'children',
          type: 'Organization',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::PlacesOfInterest',
    content: {
      _type: 'association',
      name: 'PlacesOfInterest',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'location',
          type: 'Location',
        },
        {
          multiplicity: { lowerBound: 0 },
          name: 'placeOfInterest',
          type: 'PlaceOfInterest',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::GeographicEntityType',
    content: {
      _type: 'Enumeration',
      name: 'GeographicEntityType',
      package: 'meta::pure::tests::model::simple',
      values: [
        {
          taggedValues: [
            {
              tag: { profile: 'doc', value: 'doc' },
              value: 'A city, town, village, or other urban area.',
            },
          ],
          value: 'CITY',
        },
        {
          stereotypes: [{ profile: 'doc', value: 'deprecated' }],
          value: 'COUNTRY',
        },
        {
          taggedValues: [
            {
              tag: { profile: 'doc', value: 'doc' },
              value: 'Any geographic entity other than a city or country.',
            },
          ],
          value: 'REGION',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
  },
  {
    path: 'meta::relational::tests::mapping::embedded::model::store::myDB',
    content: {
      _type: 'relational',
      filters: [],
      joins: [
        {
          name: 'firmEmployees',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'FIRM_ID',
                table: {
                  _type: 'Table',
                  database:
                    'meta::relational::tests::mapping::embedded::model::store::myDB',
                  schema: 'default',
                  table: 'PERSON_FIRM_DENORM',
                },
                tableAlias: 'PERSON_FIRM_DENORM',
              },
              {
                _type: 'column',
                column: 'FIRM_ID',
                table: {
                  _type: 'Table',
                  database:
                    'meta::relational::tests::mapping::embedded::model::store::myDB',
                  schema: 'default',
                  table: 'PERSON_FIRM_DENORM',
                },
                tableAlias: 't_PERSON_FIRM_DENORM',
              },
            ],
          },
          target: 't_PERSON_FIRM_DENORM',
        },
        {
          name: 'personFirmOther',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'FIRM_ID',
                table: {
                  _type: 'Table',
                  database:
                    'meta::relational::tests::mapping::embedded::model::store::myDB',
                  schema: 'default',
                  table: 'PERSON_FIRM_DENORM',
                },
                tableAlias: 'PERSON_FIRM_DENORM',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database:
                    'meta::relational::tests::mapping::embedded::model::store::myDB',
                  schema: 'default',
                  table: 'FIRM_OTHER',
                },
                tableAlias: 'FIRM_OTHER',
              },
            ],
          },
        },
        {
          name: 'personFirmMiddle',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'FIRM_ID',
                table: {
                  _type: 'Table',
                  database:
                    'meta::relational::tests::mapping::embedded::model::store::myDB',
                  schema: 'default',
                  table: 'PERSON_FIRM_DENORM',
                },
                tableAlias: 'PERSON_FIRM_DENORM',
              },
              {
                _type: 'column',
                column: 'FIRM_ID',
                table: {
                  _type: 'Table',
                  database:
                    'meta::relational::tests::mapping::embedded::model::store::myDB',
                  schema: 'default',
                  table: 'FIRM_MIDDLETABLE',
                },
                tableAlias: 'FIRM_MIDDLETABLE',
              },
            ],
          },
        },
        {
          name: 'middleAddress',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ADDRESS_ID',
                table: {
                  _type: 'Table',
                  database:
                    'meta::relational::tests::mapping::embedded::model::store::myDB',
                  schema: 'default',
                  table: 'FIRM_MIDDLETABLE',
                },
                tableAlias: 'FIRM_MIDDLETABLE',
              },
              {
                _type: 'column',
                column: 'ADDRESS_ID',
                table: {
                  _type: 'Table',
                  database:
                    'meta::relational::tests::mapping::embedded::model::store::myDB',
                  schema: 'default',
                  table: 'ADDRESSES',
                },
                tableAlias: 'ADDRESSES',
              },
            ],
          },
        },
        {
          name: 'Firm_Organizations',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'FIRM_ID',
                table: {
                  _type: 'Table',
                  database:
                    'meta::relational::tests::mapping::embedded::model::store::myDB',
                  schema: 'default',
                  table: 'PERSON_FIRM_DENORM',
                },
                tableAlias: 'PERSON_FIRM_DENORM',
              },
              {
                _type: 'column',
                column: 'FIRM_ID',
                table: {
                  _type: 'Table',
                  database:
                    'meta::relational::tests::mapping::embedded::model::store::myDB',
                  schema: 'default',
                  table: 'ORGANIZATIONS',
                },
                tableAlias: 'ORGANIZATIONS',
              },
            ],
          },
        },
        {
          name: 'Firm_Address_location',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'FIRM_ADDRESS_NAME',
                table: {
                  _type: 'Table',
                  database:
                    'meta::relational::tests::mapping::embedded::model::store::myDB',
                  schema: 'default',
                  table: 'PERSON_FIRM_DENORM',
                },
                tableAlias: 'PERSON_FIRM_DENORM',
              },
              {
                _type: 'column',
                column: 'ADDRESS_ID',
                table: {
                  _type: 'Table',
                  database:
                    'meta::relational::tests::mapping::embedded::model::store::myDB',
                  schema: 'default',
                  table: 'ADDRESS_LOCATION',
                },
                tableAlias: 'ADDRESS_LOCATION',
              },
            ],
          },
        },
        {
          name: 'Address_location',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'LOCATION_ID',
                table: {
                  _type: 'Table',
                  database:
                    'meta::relational::tests::mapping::embedded::model::store::myDB',
                  schema: 'default',
                  table: 'ADDRESS_LOCATION',
                },
                tableAlias: 'ADDRESS_LOCATION',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database:
                    'meta::relational::tests::mapping::embedded::model::store::myDB',
                  schema: 'default',
                  table: 'LOCATIONS',
                },
                tableAlias: 'LOCATIONS',
              },
            ],
          },
        },
      ],
      name: 'myDB',
      package: 'meta::relational::tests::mapping::embedded::model::store',
      schemas: [
        {
          name: 'default',
          tables: [
            {
              columns: [
                {
                  name: 'PERSON_ID',
                  nullable: false,
                  type: { _type: 'Integer' },
                },
                {
                  name: 'PERSON_FIRSTNAME',
                  nullable: true,
                  type: { _type: 'Varchar', size: 200 },
                },
                {
                  name: 'PERSON_LASTNAME',
                  nullable: true,
                  type: { _type: 'Varchar', size: 200 },
                },
                {
                  name: 'PERSON_ADDRESS_NAME',
                  nullable: true,
                  type: { _type: 'Varchar', size: 200 },
                },
                {
                  name: 'PERSON_ADDRESS_TYPE',
                  nullable: true,
                  type: { _type: 'Integer' },
                },
                {
                  name: 'PERSON_AGE',
                  nullable: true,
                  type: { _type: 'Integer' },
                },
                {
                  name: 'FIRM_ID',
                  nullable: false,
                  type: { _type: 'Integer' },
                },
                {
                  name: 'FIRM_LEGALNAME',
                  nullable: true,
                  type: { _type: 'Varchar', size: 200 },
                },
                {
                  name: 'FIRM_ADDRESS_NAME',
                  nullable: true,
                  type: { _type: 'Varchar', size: 200 },
                },
                {
                  name: 'FIRM_ADDRESS_TYPE',
                  nullable: true,
                  type: { _type: 'Integer' },
                },
              ],
              name: 'PERSON_FIRM_DENORM',
              primaryKey: ['PERSON_ID', 'FIRM_ID'],
            },
            {
              columns: [
                { name: 'ID', nullable: false, type: { _type: 'Integer' } },
                {
                  name: 'BETTER_LEGALNAME',
                  nullable: true,
                  type: { _type: 'Varchar', size: 200 },
                },
              ],
              name: 'FIRM_OTHER',
              primaryKey: ['ID'],
            },
            {
              columns: [
                { name: 'ID1', nullable: false, type: { _type: 'Integer' } },
                { name: 'ID2', nullable: false, type: { _type: 'Timestamp' } },
                { name: 'ID3', nullable: true, type: { _type: 'Integer' } },
                {
                  name: 'PROP_STRING',
                  nullable: true,
                  type: { _type: 'Varchar', size: 200 },
                },
                {
                  name: 'PROP_INT',
                  nullable: true,
                  type: { _type: 'Integer' },
                },
              ],
              name: 'DATA_WITH_TIMESTAMPS_KEYS',
              primaryKey: ['ID1', 'ID2'],
            },
            {
              columns: [
                {
                  name: 'FIRM_ID',
                  nullable: false,
                  type: { _type: 'Integer' },
                },
                {
                  name: 'ADDRESS_ID',
                  nullable: true,
                  type: { _type: 'Integer' },
                },
              ],
              name: 'FIRM_MIDDLETABLE',
              primaryKey: ['FIRM_ID'],
            },
            {
              columns: [
                {
                  name: 'ADDRESS_ID',
                  nullable: false,
                  type: { _type: 'Integer' },
                },
                {
                  name: 'TYPE',
                  nullable: true,
                  type: { _type: 'Varchar', size: 200 },
                },
                {
                  name: 'NAME',
                  nullable: true,
                  type: { _type: 'Varchar', size: 200 },
                },
              ],
              name: 'ADDRESSES',
              primaryKey: ['ADDRESS_ID'],
            },
            {
              columns: [
                { name: 'ORG_ID', nullable: false, type: { _type: 'Integer' } },
                { name: 'FIRM_ID', nullable: true, type: { _type: 'Integer' } },
                {
                  name: 'NAME',
                  nullable: true,
                  type: { _type: 'Varchar', size: 200 },
                },
              ],
              name: 'ORGANIZATIONS',
              primaryKey: ['ORG_ID'],
            },
            {
              columns: [
                { name: 'ID', nullable: false, type: { _type: 'Integer' } },
                {
                  name: 'PLACE',
                  nullable: true,
                  type: { _type: 'Varchar', size: 200 },
                },
              ],
              name: 'LOCATIONS',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'ADDRESS_ID',
                  nullable: true,
                  type: { _type: 'Varchar', size: 200 },
                },
                {
                  name: 'LOCATION_ID',
                  nullable: true,
                  type: { _type: 'Integer' },
                },
              ],
              name: 'ADDRESS_LOCATION',
              primaryKey: [],
            },
          ],
          views: [],
        },
      ],
      includedStores: [],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'meta::relational::tests::mapping::embedded::model::mapping::testMappingEmbedded',
    content: {
      _type: 'mapping',
      includedMappings: [],
      classMappings: [
        {
          _type: 'relational',
          class: 'Person',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'myDB',
            schema: 'default',
            table: 'PERSON_FIRM_DENORM',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'PERSON_ID',
              table: {
                _type: 'Table',
                database: 'myDB',
                schema: 'default',
                table: 'PERSON_FIRM_DENORM',
              },
              tableAlias: '',
            },
            {
              _type: 'column',
              column: 'FIRM_ID',
              table: {
                _type: 'Table',
                database: 'myDB',
                schema: 'default',
                table: 'PERSON_FIRM_DENORM',
              },
              tableAlias: '',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Person',
                property: 'firstName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'PERSON_FIRSTNAME',
                table: {
                  _type: 'Table',
                  database: 'myDB',
                  schema: 'default',
                  table: 'PERSON_FIRM_DENORM',
                },
                tableAlias: 'PERSON_FIRM_DENORM',
              },
              source: 'meta_pure_tests_model_simple_Person',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Person',
                property: 'lastName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'PERSON_LASTNAME',
                table: {
                  _type: 'Table',
                  database: 'myDB',
                  schema: 'default',
                  table: 'PERSON_FIRM_DENORM',
                },
                tableAlias: 'PERSON_FIRM_DENORM',
              },
              source: 'meta_pure_tests_model_simple_Person',
            },
            {
              _type: 'embeddedPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Person',
                property: 'firm',
              },
              source: 'meta_pure_tests_model_simple_Person',
              classMapping: {
                _type: 'embedded',
                class: 'meta::pure::tests::model::simple::Firm',
                id: 'meta_pure_tests_model_simple_Person_firm',
                primaryKey: [],
                propertyMappings: [
                  {
                    _type: 'relationalPropertyMapping',
                    property: {
                      class: 'meta::pure::tests::model::simple::Firm',
                      property: 'legalName',
                    },
                    relationalOperation: {
                      _type: 'column',
                      column: 'FIRM_LEGALNAME',
                      table: {
                        _type: 'Table',
                        database: 'myDB',
                        schema: 'default',
                        table: 'PERSON_FIRM_DENORM',
                      },
                      tableAlias: 'PERSON_FIRM_DENORM',
                    },
                    source: 'meta_pure_tests_model_simple_Person',
                  },
                  {
                    _type: 'embeddedPropertyMapping',
                    property: {
                      class:
                        'meta::pure::tests::model::simple::EntityWithAddress',
                      property: 'address',
                    },
                    source: 'meta_pure_tests_model_simple_Person',
                    classMapping: {
                      _type: 'embedded',
                      class: 'meta::pure::tests::model::simple::Address',
                      id: 'meta_pure_tests_model_simple_Person_firm_address',
                      primaryKey: [],
                      propertyMappings: [
                        {
                          _type: 'relationalPropertyMapping',
                          property: {
                            class: 'meta::pure::tests::model::simple::Address',
                            property: 'name',
                          },
                          relationalOperation: {
                            _type: 'column',
                            column: 'FIRM_ADDRESS_NAME',
                            table: {
                              _type: 'Table',
                              database: 'myDB',
                              schema: 'default',
                              table: 'PERSON_FIRM_DENORM',
                            },
                            tableAlias: 'PERSON_FIRM_DENORM',
                          },
                          source: 'meta_pure_tests_model_simple_Person',
                        },
                        {
                          _type: 'relationalPropertyMapping',
                          enumMappingId: 'GE',
                          property: {
                            class:
                              'meta::pure::tests::model::simple::GeographicEntity',
                            property: 'type',
                          },
                          relationalOperation: {
                            _type: 'column',
                            column: 'FIRM_ADDRESS_TYPE',
                            table: {
                              _type: 'Table',
                              database: 'myDB',
                              schema: 'default',
                              table: 'PERSON_FIRM_DENORM',
                            },
                            tableAlias: 'PERSON_FIRM_DENORM',
                          },
                          source: 'meta_pure_tests_model_simple_Person',
                        },
                      ],
                      root: false,
                    },
                  },
                  {
                    _type: 'relationalPropertyMapping',
                    property: {
                      class: 'meta::pure::tests::model::simple::Firm',
                      property: 'employees',
                    },
                    relationalOperation: {
                      _type: 'elemtWithJoins',
                      joins: [{ db: 'myDB', name: 'firmEmployees' }],
                    },
                    source: 'meta_pure_tests_model_simple_Person',
                  },
                ],
                root: false,
              },
            },
            {
              _type: 'embeddedPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::EntityWithAddress',
                property: 'address',
              },
              source: 'meta_pure_tests_model_simple_Person',
              classMapping: {
                _type: 'embedded',
                class: 'meta::pure::tests::model::simple::Address',
                id: 'meta_pure_tests_model_simple_Person_address',
                primaryKey: [],
                propertyMappings: [
                  {
                    _type: 'relationalPropertyMapping',
                    property: {
                      class: 'meta::pure::tests::model::simple::Address',
                      property: 'name',
                    },
                    relationalOperation: {
                      _type: 'column',
                      column: 'PERSON_ADDRESS_NAME',
                      table: {
                        _type: 'Table',
                        database: 'myDB',
                        schema: 'default',
                        table: 'PERSON_FIRM_DENORM',
                      },
                      tableAlias: 'PERSON_FIRM_DENORM',
                    },
                    source: 'meta_pure_tests_model_simple_Person',
                  },
                  {
                    _type: 'relationalPropertyMapping',
                    enumMappingId: 'GE',
                    property: {
                      class:
                        'meta::pure::tests::model::simple::GeographicEntity',
                      property: 'type',
                    },
                    relationalOperation: {
                      _type: 'column',
                      column: 'PERSON_ADDRESS_TYPE',
                      table: {
                        _type: 'Table',
                        database: 'myDB',
                        schema: 'default',
                        table: 'PERSON_FIRM_DENORM',
                      },
                      tableAlias: 'PERSON_FIRM_DENORM',
                    },
                    source: 'meta_pure_tests_model_simple_Person',
                  },
                ],
                root: false,
              },
            },
          ],
          root: false,
        },
      ],
      enumerationMappings: [
        {
          enumValueMappings: [
            {
              enumValue: 'CITY',
              sourceValues: [{ _type: 'integerSourceValue', value: 1 }],
            },
            {
              enumValue: 'REGION',
              sourceValues: [{ _type: 'integerSourceValue', value: 2 }],
            },
          ],
          enumeration: 'GeographicEntityType',
          id: 'GE',
        },
      ],
      name: 'testMappingEmbedded',
      package: 'meta::relational::tests::mapping::embedded::model::mapping',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: '__internal__::SectionIndex',
    content: {
      _type: 'sectionIndex',
      name: 'SectionIndex',
      package: '__internal__',
      sections: [
        { _type: 'importAware', imports: [], elements: [], parserName: 'Pure' },
        {
          _type: 'importAware',
          imports: [
            'meta::relational::tests::mapping::embedded::model::store',
            'meta::pure::tests::model::simple',
          ],
          elements: [
            'meta::relational::tests::mapping::embedded::model::mapping::testMappingEmbedded',
          ],
          parserName: 'Mapping',
        },
        {
          _type: 'default',
          elements: [
            'meta::relational::tests::mapping::embedded::model::store::myDB',
          ],
          parserName: 'Relational',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Person'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Address'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Firm'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::EntityWithAddress'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::EntityWithLocations'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::GeographicEntity'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: [],
          elements: ['meta::relational::tests::mapping::union::extend::Person'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::PersonExtension'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: [],
          elements: [
            'meta::relational::tests::mapping::union::extend::Address',
          ],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: [],
          elements: ['meta::relational::tests::mapping::union::extend::Firm'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::FirmExtension'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Organization'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Bridge'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::PersonNameParameter'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Location'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Division'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Department'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Team'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: [
            'meta::pure::tests::model::simple::PersonNameParameterNested',
          ],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::PlaceOfInterest'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::GeographicEntityType'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Employment'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::FirmCEO'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Membership'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::BridgeAsso1'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::AddressLocation'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::FirmOrganizations'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::BridgeAsso2'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::SubOrganization'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::PlacesOfInterest'],
          parserName: 'Pure',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];

export const TEST_DATA__otherwiseEmbeddedRelationalTestData = [
  {
    path: 'other::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'other',
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
          name: 'firm',
          type: 'Firm',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'other::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'other',
      properties: [
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
          name: 'otherInformation',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'mapping::db',
    content: {
      _type: 'relational',
      filters: [],
      joins: [
        {
          name: 'PersonFirmJoin',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'firmId',
                table: {
                  _type: 'Table',
                  database: 'mapping::db',
                  schema: 'default',
                  table: 'employeeFirmDenormTable',
                },
                tableAlias: 'employeeFirmDenormTable',
              },
              {
                _type: 'column',
                column: 'id',
                table: {
                  _type: 'Table',
                  database: 'mapping::db',
                  schema: 'default',
                  table: 'FirmInfoTable',
                },
                tableAlias: 'FirmInfoTable',
              },
            ],
          },
        },
      ],
      name: 'db',
      package: 'mapping',
      schemas: [
        {
          name: 'default',
          tables: [
            {
              columns: [
                {
                  name: 'id',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'name',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'firmId',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'legalName',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'address1',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'postcode',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 10,
                  },
                },
              ],
              name: 'employeeFirmDenormTable',
              primaryKey: ['id'],
            },
            {
              columns: [
                {
                  name: 'id',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'name',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'other',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'FirmInfoTable',
              primaryKey: ['id'],
            },
          ],
          views: [],
        },
      ],
      includedStores: [],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'mappingPackage::myMapping',
    content: {
      _type: 'mapping',
      includedMappings: [],
      classMappings: [
        {
          _type: 'relational',
          class: 'Firm',
          distinct: false,
          id: 'firm1',
          mainTable: {
            _type: 'Table',
            database: 'db',
            schema: 'default',
            table: 'FirmInfoTable',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'id',
              table: {
                _type: 'Table',
                database: 'db',
                schema: 'default',
                table: 'FirmInfoTable',
              },
              tableAlias: '',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'other::Firm',
                property: 'legalName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'name',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'FirmInfoTable',
                },
                tableAlias: 'FirmInfoTable',
              },
              source: 'firm1',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'other::Firm',
                property: 'otherInformation',
              },
              relationalOperation: {
                _type: 'column',
                column: 'other',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'FirmInfoTable',
                },
                tableAlias: 'FirmInfoTable',
              },
              source: 'firm1',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'Person',
          distinct: false,
          id: 'alias1',
          mainTable: {
            _type: 'Table',
            database: 'db',
            schema: 'default',
            table: 'employeeFirmDenormTable',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'id',
              table: {
                _type: 'Table',
                database: 'db',
                schema: 'default',
                table: 'employeeFirmDenormTable',
              },
              tableAlias: '',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'other::Person',
                property: 'name',
              },
              relationalOperation: {
                _type: 'column',
                column: 'name',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'employeeFirmDenormTable',
                },
                tableAlias: 'employeeFirmDenormTable',
              },
              source: 'alias1',
            },
            {
              _type: 'otherwiseEmbeddedPropertyMapping',
              property: {
                class: 'other::Person',
                property: 'firm',
              },
              source: 'alias1',
              classMapping: {
                _type: 'embedded',
                class: 'other::Firm',
                id: 'alias1_firm',
                primaryKey: [
                  {
                    _type: 'column',
                    column: 'legalName',
                    table: {
                      _type: 'Table',
                      database: 'db',
                      schema: 'default',
                      table: 'employeeFirmDenormTable',
                    },
                    tableAlias: 'employeeFirmDenormTable',
                  },
                ],
                propertyMappings: [
                  {
                    _type: 'relationalPropertyMapping',
                    property: {
                      class: 'other::Firm',
                      property: 'legalName',
                    },
                    relationalOperation: {
                      _type: 'column',
                      column: 'legalName',
                      table: {
                        _type: 'Table',
                        database: 'db',
                        schema: 'default',
                        table: 'employeeFirmDenormTable',
                      },
                      tableAlias: 'employeeFirmDenormTable',
                    },
                    source: 'alias1',
                  },
                ],
                root: false,
              },
              otherwisePropertyMapping: {
                _type: 'relationalPropertyMapping',
                property: {
                  class: 'other::Person',
                  property: 'firm',
                },
                relationalOperation: {
                  _type: 'elemtWithJoins',
                  joins: [
                    {
                      db: 'db',
                      name: 'PersonFirmJoin',
                    },
                  ],
                },
                source: 'alias1',
                target: 'firm1',
              },
            },
          ],
          root: false,
        },
      ],
      enumerationMappings: [],
      name: 'myMapping',
      package: 'mappingPackage',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: '__internal__::SectionIndex',
    content: {
      _type: 'sectionIndex',
      name: 'SectionIndex',
      package: '__internal__',
      sections: [
        {
          _type: 'importAware',
          imports: ['other'],
          elements: ['other::Person', 'other::Firm'],
          parserName: 'Pure',
        },
        {
          _type: 'default',
          elements: ['mapping::db'],
          parserName: 'Relational',
        },
        {
          _type: 'importAware',
          imports: ['other', 'mapping'],
          elements: ['mappingPackage::myMapping'],
          parserName: 'Mapping',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];

export const TEST_DATA__inlineEmbeddedRelationalTestData = [
  {
    path: 'other::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'other',
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
          name: 'address',
          type: 'Address',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'firm',
          type: 'Firm',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'other::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'other',
      properties: [
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
    path: 'other::Address',
    content: {
      _type: 'class',
      name: 'Address',
      package: 'other',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'line1',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'postcode',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'mapping::db',
    content: {
      _type: 'relational',
      filters: [],
      joins: [],
      name: 'db',
      package: 'mapping',
      schemas: [
        {
          name: 'default',
          tables: [
            {
              columns: [
                {
                  name: 'id',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'name',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'firmId',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'legalName',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'address1',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'postcode',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 10,
                  },
                },
              ],
              name: 'employeeFirmDenormTable',
              primaryKey: ['id'],
            },
          ],
          views: [],
        },
      ],
      includedStores: [],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'mappingPackage::myMapping',
    content: {
      _type: 'mapping',
      includedMappings: [],
      classMappings: [
        {
          _type: 'relational',
          class: 'Address',
          distinct: false,
          id: 'alias2',
          mainTable: {
            _type: 'Table',
            database: 'db',
            schema: 'default',
            table: 'employeeFirmDenormTable',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'id',
              table: {
                _type: 'Table',
                database: 'db',
                schema: 'default',
                table: 'employeeFirmDenormTable',
              },
              tableAlias: '',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'other::Address',
                property: 'line1',
              },
              relationalOperation: {
                _type: 'column',
                column: 'address1',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'employeeFirmDenormTable',
                },
                tableAlias: 'employeeFirmDenormTable',
              },
              source: 'alias2',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'other::Address',
                property: 'postcode',
              },
              relationalOperation: {
                _type: 'column',
                column: 'postcode',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'employeeFirmDenormTable',
                },
                tableAlias: 'employeeFirmDenormTable',
              },
              source: 'alias2',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'Person',
          distinct: false,
          id: 'alias1',
          mainTable: {
            _type: 'Table',
            database: 'db',
            schema: 'default',
            table: 'employeeFirmDenormTable',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'id',
              table: {
                _type: 'Table',
                database: 'db',
                schema: 'default',
                table: 'employeeFirmDenormTable',
              },
              tableAlias: '',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'other::Person',
                property: 'name',
              },
              relationalOperation: {
                _type: 'column',
                column: 'name',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'employeeFirmDenormTable',
                },
                tableAlias: 'employeeFirmDenormTable',
              },
              source: 'alias1',
            },
            {
              _type: 'embeddedPropertyMapping',
              property: {
                class: 'other::Person',
                property: 'firm',
              },
              source: 'alias1',
              classMapping: {
                _type: 'embedded',
                class: 'other::Firm',
                id: 'alias1_firm',
                primaryKey: [
                  {
                    _type: 'column',
                    column: 'legalName',
                    table: {
                      _type: 'Table',
                      database: 'db',
                      schema: 'default',
                      table: 'employeeFirmDenormTable',
                    },
                    tableAlias: 'employeeFirmDenormTable',
                  },
                ],
                propertyMappings: [
                  {
                    _type: 'relationalPropertyMapping',
                    property: {
                      class: 'other::Firm',
                      property: 'legalName',
                    },
                    relationalOperation: {
                      _type: 'column',
                      column: 'legalName',
                      table: {
                        _type: 'Table',
                        database: 'db',
                        schema: 'default',
                        table: 'employeeFirmDenormTable',
                      },
                      tableAlias: 'employeeFirmDenormTable',
                    },
                    source: 'alias1',
                  },
                ],
                root: false,
              },
            },
            {
              _type: 'inlineEmbeddedPropertyMapping',
              property: {
                class: 'other::Person',
                property: 'address',
              },
              source: 'alias1',
              setImplementationId: 'alias2',
            },
          ],
          root: false,
        },
      ],
      enumerationMappings: [],
      name: 'myMapping',
      package: 'mappingPackage',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: '__internal__::SectionIndex',
    content: {
      _type: 'sectionIndex',
      name: 'SectionIndex',
      package: '__internal__',
      sections: [
        {
          _type: 'importAware',
          imports: [],
          elements: [],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['other'],
          elements: ['other::Person', 'other::Firm', 'other::Address'],
          parserName: 'Pure',
        },
        {
          _type: 'default',
          elements: ['mapping::db'],
          parserName: 'Relational',
        },
        {
          _type: 'importAware',
          imports: ['other', 'mapping'],
          elements: ['mappingPackage::myMapping'],
          parserName: 'Mapping',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];
