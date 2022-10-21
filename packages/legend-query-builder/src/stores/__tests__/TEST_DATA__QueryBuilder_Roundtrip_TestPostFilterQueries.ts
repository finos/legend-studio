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

export const TEST_DATA__lambda_simpleConditionPostFilter = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'filter',
      parameters: [
        {
          _type: 'func',
          function: 'project',
          parameters: [
            {
              _type: 'func',
              function: 'getAll',
              parameters: [
                {
                  _type: 'packageableElementPtr',
                  fullPath: 'model::postFilter::Person',
                },
              ],
            },
            {
              _type: 'collection',
              values: [
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                      property: 'myOptionalEnum',
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'x',
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
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                      property: 'myEnum',
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'x',
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
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                      property: 'age',
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'x',
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
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                      property: 'fullName',
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'x',
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
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                      property: 'myDateTime',
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'x',
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
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                      property: 'myDecimal',
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'x',
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
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                      property: 'myFloat',
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'x',
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
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                      property: 'myNumber',
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'x',
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
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                      property: 'myOptionalBoolean',
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'x',
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
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                      property: 'myStrictDate',
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'x',
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
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                      property: 'myStrictTime',
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'x',
                    },
                  ],
                },
              ],
              multiplicity: {
                lowerBound: 11,
                upperBound: 11,
              },
            },
            {
              _type: 'collection',
              values: [
                {
                  _type: 'string',
                  values: ['My Optional Enum'],
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                },
                {
                  _type: 'string',
                  values: ['My Enum'],
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                },
                {
                  _type: 'string',
                  values: ['Age'],
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                },
                {
                  _type: 'string',
                  values: ['Full Name'],
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                },
                {
                  _type: 'string',
                  values: ['My Date Time'],
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                },
                {
                  _type: 'string',
                  values: ['My Decimal'],
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                },
                {
                  _type: 'string',
                  values: ['My Float'],
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                },
                {
                  _type: 'string',
                  values: ['My Number'],
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                },
                {
                  _type: 'string',
                  values: ['My Optional Boolean'],
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                },
                {
                  _type: 'string',
                  values: ['My Strict Date'],
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                },
                {
                  _type: 'string',
                  values: ['My Strict Time'],
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                },
              ],
              multiplicity: {
                lowerBound: 11,
                upperBound: 11,
              },
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
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'row',
                    },
                    {
                      _type: 'string',
                      values: ['My Optional Enum'],
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                    },
                  ],
                  property: 'isNull',
                },
                {
                  _type: 'func',
                  function: 'and',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'not',
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
                                  name: 'row',
                                },
                                {
                                  _type: 'string',
                                  values: ['My Enum'],
                                  multiplicity: {
                                    lowerBound: 1,
                                    upperBound: 1,
                                  },
                                },
                              ],
                              property: 'getEnum',
                            },
                            {
                              _type: 'enumValue',
                              fullPath: 'model::postFilter::MyEnum',
                              value: 'Enum2',
                            },
                          ],
                        },
                      ],
                    },
                    {
                      _type: 'func',
                      function: 'and',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'not',
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
                                      name: 'row',
                                    },
                                    {
                                      _type: 'string',
                                      values: ['Age'],
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                    },
                                  ],
                                  property: 'getInteger',
                                },
                                {
                                  _type: 'integer',
                                  values: [0],
                                  multiplicity: {
                                    lowerBound: 1,
                                    upperBound: 1,
                                  },
                                },
                              ],
                            },
                          ],
                        },
                        {
                          _type: 'func',
                          function: 'and',
                          parameters: [
                            {
                              _type: 'func',
                              function: 'startsWith',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'row',
                                    },
                                    {
                                      _type: 'string',
                                      values: ['Full Name'],
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                    },
                                  ],
                                  property: 'getString',
                                },
                                {
                                  _type: 'string',
                                  values: ['test'],
                                  multiplicity: {
                                    lowerBound: 1,
                                    upperBound: 1,
                                  },
                                },
                              ],
                            },
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
                                          name: 'row',
                                        },
                                        {
                                          _type: 'string',
                                          values: ['My Date Time'],
                                          multiplicity: {
                                            lowerBound: 1,
                                            upperBound: 1,
                                          },
                                        },
                                      ],
                                      property: 'getDateTime',
                                    },
                                    {
                                      _type: 'dateTime',
                                      values: ['2022-03-03T12:08'],
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                    },
                                  ],
                                },
                                {
                                  _type: 'func',
                                  function: 'and',
                                  parameters: [
                                    {
                                      _type: 'func',
                                      function: 'greaterThan',
                                      parameters: [
                                        {
                                          _type: 'property',
                                          parameters: [
                                            {
                                              _type: 'var',
                                              name: 'row',
                                            },
                                            {
                                              _type: 'string',
                                              values: ['My Decimal'],
                                              multiplicity: {
                                                lowerBound: 1,
                                                upperBound: 1,
                                              },
                                            },
                                          ],
                                          property: 'getDecimal',
                                        },
                                        {
                                          _type: 'integer',
                                          values: [3],
                                          multiplicity: {
                                            lowerBound: 1,
                                            upperBound: 1,
                                          },
                                        },
                                      ],
                                    },
                                    {
                                      _type: 'func',
                                      function: 'and',
                                      parameters: [
                                        {
                                          _type: 'func',
                                          function: 'lessThan',
                                          parameters: [
                                            {
                                              _type: 'property',
                                              parameters: [
                                                {
                                                  _type: 'var',
                                                  name: 'row',
                                                },
                                                {
                                                  _type: 'string',
                                                  values: ['My Float'],
                                                  multiplicity: {
                                                    lowerBound: 1,
                                                    upperBound: 1,
                                                  },
                                                },
                                              ],
                                              property: 'getFloat',
                                            },
                                            {
                                              _type: 'float',
                                              values: [0.1],
                                              multiplicity: {
                                                lowerBound: 1,
                                                upperBound: 1,
                                              },
                                            },
                                          ],
                                        },
                                        {
                                          _type: 'func',
                                          function: 'and',
                                          parameters: [
                                            {
                                              _type: 'func',
                                              function: 'not',
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
                                                          name: 'row',
                                                        },
                                                        {
                                                          _type: 'string',
                                                          values: ['My Number'],
                                                          multiplicity: {
                                                            lowerBound: 1,
                                                            upperBound: 1,
                                                          },
                                                        },
                                                      ],
                                                      property: 'getNumber',
                                                    },
                                                    {
                                                      _type: 'integer',
                                                      values: [0],
                                                      multiplicity: {
                                                        lowerBound: 1,
                                                        upperBound: 1,
                                                      },
                                                    },
                                                  ],
                                                },
                                              ],
                                            },
                                            {
                                              _type: 'func',
                                              function: 'and',
                                              parameters: [
                                                {
                                                  _type: 'property',
                                                  parameters: [
                                                    {
                                                      _type: 'var',
                                                      name: 'row',
                                                    },
                                                    {
                                                      _type: 'string',
                                                      values: [
                                                        'My Optional Boolean',
                                                      ],
                                                      multiplicity: {
                                                        lowerBound: 1,
                                                        upperBound: 1,
                                                      },
                                                    },
                                                  ],
                                                  property: 'isNotNull',
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
                                                          name: 'row',
                                                        },
                                                        {
                                                          _type: 'string',
                                                          values: [
                                                            'My Strict Date',
                                                          ],
                                                          multiplicity: {
                                                            lowerBound: 1,
                                                            upperBound: 1,
                                                          },
                                                        },
                                                      ],
                                                      property: 'getStrictDate',
                                                    },
                                                    {
                                                      _type: 'strictDate',
                                                      values: ['2022-03-03'],
                                                      multiplicity: {
                                                        lowerBound: 1,
                                                        upperBound: 1,
                                                      },
                                                    },
                                                  ],
                                                },
                                              ],
                                            },
                                          ],
                                        },
                                      ],
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          parameters: [
            {
              _type: 'var',
              name: 'row',
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__lambda_aggregationPostFilter = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'filter',
      parameters: [
        {
          _type: 'func',
          function: 'groupBy',
          parameters: [
            {
              _type: 'func',
              function: 'getAll',
              parameters: [
                {
                  _type: 'packageableElementPtr',
                  fullPath: 'model::postFilter::Person',
                },
              ],
            },
            {
              _type: 'collection',
              values: [],
              multiplicity: {
                lowerBound: 0,
                upperBound: 0,
              },
            },
            {
              _type: 'collection',
              values: [
                {
                  _type: 'func',
                  function: 'agg',
                  parameters: [
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
                            },
                          ],
                          property: 'fullName',
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'uniqueValueOnly',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
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
                  ],
                },
              ],
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
            },
            {
              _type: 'collection',
              values: [
                {
                  _type: 'string',
                  values: ['Full Name'],
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                },
              ],
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
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
                      _type: 'var',
                      name: 'row',
                    },
                    {
                      _type: 'string',
                      values: ['Full Name'],
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                    },
                  ],
                  property: 'getString',
                },
                {
                  _type: 'string',
                  values: ['User1'],
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                },
              ],
            },
          ],
          parameters: [
            {
              _type: 'var',
              name: 'row',
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__lambda_derivationPostFilter = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'filter',
      parameters: [
        {
          _type: 'func',
          function: 'project',
          parameters: [
            {
              _type: 'func',
              function: 'getAll',
              parameters: [
                {
                  _type: 'packageableElementPtr',
                  fullPath: 'model::postFilter::Person',
                },
              ],
            },
            {
              _type: 'collection',
              values: [
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'plus',
                      parameters: [
                        {
                          _type: 'collection',
                          values: [
                            {
                              _type: 'string',
                              values: ['my full name is: '],
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'x',
                                },
                              ],
                              property: 'fullName',
                            },
                          ],
                          multiplicity: {
                            lowerBound: 2,
                            upperBound: 2,
                          },
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
              ],
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
            },
            {
              _type: 'collection',
              values: [
                {
                  _type: 'string',
                  values: ['greeting'],
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                },
              ],
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
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
                      _type: 'var',
                      name: 'row',
                    },
                    {
                      _type: 'string',
                      values: ['greeting'],
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                    },
                  ],
                  property: 'getString',
                },
                {
                  _type: 'string',
                  values: ['my full name is: Bob'],
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                },
              ],
            },
          ],
          parameters: [
            {
              _type: 'var',
              name: 'row',
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__lambda_postFilterWithResultSetModifier = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'take',
      parameters: [
        {
          _type: 'func',
          function: 'sort',
          parameters: [
            {
              _type: 'func',
              function: 'distinct',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'project',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'getAll',
                          parameters: [
                            {
                              _type: 'packageableElementPtr',
                              fullPath: 'model::postFilter::Person',
                            },
                          ],
                        },
                        {
                          _type: 'collection',
                          values: [
                            {
                              _type: 'lambda',
                              body: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'x',
                                    },
                                  ],
                                  property: 'fullName',
                                },
                              ],
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'x',
                                },
                              ],
                            },
                          ],
                          multiplicity: {
                            lowerBound: 1,
                            upperBound: 1,
                          },
                        },
                        {
                          _type: 'collection',
                          values: [
                            {
                              _type: 'string',
                              values: ['Full Name'],
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                            },
                          ],
                          multiplicity: {
                            lowerBound: 1,
                            upperBound: 1,
                          },
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
                                  _type: 'var',
                                  name: 'row',
                                },
                                {
                                  _type: 'string',
                                  values: ['Full Name'],
                                  multiplicity: {
                                    lowerBound: 1,
                                    upperBound: 1,
                                  },
                                },
                              ],
                              property: 'getString',
                            },
                            {
                              _type: 'string',
                              values: ['Bob'],
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                            },
                          ],
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'row',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              _type: 'collection',
              values: [
                {
                  _type: 'func',
                  function: 'asc',
                  parameters: [
                    {
                      _type: 'string',
                      values: ['Full Name'],
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                    },
                  ],
                },
              ],
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
            },
          ],
        },
        {
          _type: 'integer',
          values: [10],
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA_lambda__dateTimeCapabilityPostFilterWithToday = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'filter',
      parameters: [
        {
          _type: 'func',
          function: 'project',
          parameters: [
            {
              _type: 'func',
              function: 'getAll',
              parameters: [
                {
                  _type: 'packageableElementPtr',
                  fullPath: 'model::postFilter::Person',
                },
              ],
            },
            {
              _type: 'collection',
              values: [
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                      property: 'age',
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'x',
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
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                      property: 'fullName',
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'x',
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
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                      property: 'myDateTime',
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'x',
                    },
                  ],
                },
              ],
              multiplicity: {
                lowerBound: 3,
                upperBound: 3,
              },
            },
            {
              _type: 'collection',
              values: [
                {
                  _type: 'string',
                  values: ['Age'],
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                },
                {
                  _type: 'string',
                  values: ['Full Name'],
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                },
                {
                  _type: 'string',
                  values: ['My Date Time'],
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                },
              ],
              multiplicity: {
                lowerBound: 3,
                upperBound: 3,
              },
            },
          ],
        },
        {
          _type: 'lambda',
          body: [
            {
              _type: 'func',
              function: 'isOnDay',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'row',
                    },
                    {
                      _type: 'string',
                      values: ['My Date Time'],
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                    },
                  ],
                  property: 'getDateTime',
                },
                {
                  _type: 'func',
                  function: 'meta::pure::functions::date::today',
                  parameters: [],
                },
              ],
            },
          ],
          parameters: [
            {
              _type: 'var',
              name: 'row',
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};
