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

export const TEST_DATA__lambda_simpleSingleConditionFilter = {
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
              fullPath: 'domain::COVIDData',
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
                  property: 'state',
                  parameters: [
                    {
                      _type: 'property',
                      property: 'demographics',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'string',
                  values: ['NY'],
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
              name: 'x',
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__lambda_notOperatorFilter = {
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
              fullPath: 'domain::COVIDData',
            },
          ],
        },
        {
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
                      _type: 'property',
                      property: 'state',
                      parameters: [
                        {
                          _type: 'property',
                          property: 'demographics',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
                            },
                          ],
                        },
                      ],
                    },
                    {
                      _type: 'string',
                      values: ['NY'],
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
  parameters: [],
};

export const TEST_DATA__lambda_setOperatorFilter = {
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
              fullPath: 'domain::COVIDData',
            },
          ],
        },
        {
          _type: 'lambda',
          body: [
            {
              _type: 'func',
              function: 'not',
              parameters: [
                {
                  _type: 'func',
                  function: 'in',
                  parameters: [
                    {
                      _type: 'property',
                      property: 'state',
                      parameters: [
                        {
                          _type: 'property',
                          property: 'demographics',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
                            },
                          ],
                        },
                      ],
                    },
                    {
                      _type: 'collection',
                      values: [
                        {
                          _type: 'string',
                          values: ['NY'],
                          multiplicity: {
                            lowerBound: 1,
                            upperBound: 1,
                          },
                        },
                        {
                          _type: 'string',
                          values: ['NJ'],
                          multiplicity: {
                            lowerBound: 1,
                            upperBound: 1,
                          },
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
  parameters: [],
};

export const TEST_DATA__lambda_groupConditionFilter = {
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
              fullPath: 'domain::COVIDData',
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
                  function: 'or',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'equal',
                      parameters: [
                        {
                          _type: 'property',
                          property: 'cases',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
                            },
                          ],
                        },
                        {
                          _type: 'float',
                          values: [99],
                          multiplicity: {
                            lowerBound: 1,
                            upperBound: 1,
                          },
                        },
                      ],
                    },
                    {
                      _type: 'func',
                      function: 'equal',
                      parameters: [
                        {
                          _type: 'property',
                          property: 'fips',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
                            },
                          ],
                        },
                        {
                          _type: 'string',
                          values: ['def'],
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
                  function: 'or',
                  parameters: [
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
                              property: 'cases',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'x',
                                },
                              ],
                            },
                            {
                              _type: 'float',
                              values: [0],
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                            },
                          ],
                        },
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'property',
                              property: 'fips',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'x',
                                },
                              ],
                            },
                            {
                              _type: 'string',
                              values: ['abc'],
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
                      function: 'not',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'in',
                          parameters: [
                            {
                              _type: 'property',
                              property: 'state',
                              parameters: [
                                {
                                  _type: 'property',
                                  property: 'demographics',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'x',
                                    },
                                  ],
                                },
                              ],
                            },
                            {
                              _type: 'collection',
                              values: [
                                {
                                  _type: 'string',
                                  values: ['NY'],
                                  multiplicity: {
                                    lowerBound: 1,
                                    upperBound: 1,
                                  },
                                },
                                {
                                  _type: 'string',
                                  values: ['NJ'],
                                  multiplicity: {
                                    lowerBound: 1,
                                    upperBound: 1,
                                  },
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
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__lambda_groupConditionFilter_withMultipleClauseGroup = {
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
              fullPath: 'domain::COVIDData',
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
                    {
                      _type: 'property',
                      property: 'cases',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                    },
                    {
                      _type: 'float',
                      values: [99],
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
                          property: 'fips',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
                            },
                          ],
                        },
                        {
                          _type: 'string',
                          values: ['def'],
                          multiplicity: {
                            lowerBound: 1,
                            upperBound: 1,
                          },
                        },
                      ],
                    },
                    {
                      _type: 'func',
                      function: 'not',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'in',
                          parameters: [
                            {
                              _type: 'property',
                              property: 'state',
                              parameters: [
                                {
                                  _type: 'property',
                                  property: 'demographics',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'x',
                                    },
                                  ],
                                },
                              ],
                            },
                            {
                              _type: 'collection',
                              values: [
                                {
                                  _type: 'string',
                                  values: ['NY'],
                                  multiplicity: {
                                    lowerBound: 1,
                                    upperBound: 1,
                                  },
                                },
                                {
                                  _type: 'string',
                                  values: ['NJ'],
                                  multiplicity: {
                                    lowerBound: 1,
                                    upperBound: 1,
                                  },
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
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__lambda_enumerationOperatorFilter = {
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
              fullPath: 'model::target::_Firm',
            },
          ],
        },
        {
          _type: 'lambda',
          body: [
            {
              _type: 'func',
              function: 'not',
              parameters: [
                {
                  _type: 'func',
                  function: 'in',
                  parameters: [
                    {
                      _type: 'property',
                      property: 'type',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                    },
                    {
                      _type: 'collection',
                      values: [
                        {
                          _type: 'enumValue',
                          fullPath: 'model::target::IncType',
                          value: 'LLC',
                        },
                        {
                          _type: 'enumValue',
                          fullPath: 'model::target::IncType',
                          value: 'QB',
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
  parameters: [],
};

export const TEST_DATA__lambda_existsChainFilter = {
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
              fullPath: 'model::target::_Firm',
            },
          ],
        },
        {
          _type: 'lambda',
          body: [
            {
              _type: 'func',
              function: 'exists',
              parameters: [
                {
                  _type: 'property',
                  property: 'employees',
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
                      function: 'equal',
                      parameters: [
                        {
                          _type: 'property',
                          property: 'fullName',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x_1',
                            },
                          ],
                        },
                        {
                          _type: 'string',
                          values: ['abc'],
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
                      name: 'x_1',
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
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__lambda_existsChainFilterWithCustomVariableName = {
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
              fullPath: 'model::target::_Firm',
            },
          ],
        },
        {
          _type: 'lambda',
          body: [
            {
              _type: 'func',
              function: 'exists',
              parameters: [
                {
                  _type: 'property',
                  property: 'employees',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'c',
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
                          property: 'fullName',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'f',
                            },
                          ],
                        },
                        {
                          _type: 'string',
                          values: ['abc'],
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
                      name: 'f',
                    },
                  ],
                },
              ],
            },
          ],
          parameters: [
            {
              _type: 'var',
              name: 'c',
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__lambda_simpleSingleConditionFilterWithParameter = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'project',
      parameters: [
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
                  fullPath: 'domain::COVIDData',
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
                          name: 'x',
                        },
                      ],
                      property: 'caseType',
                    },
                    {
                      _type: 'var',
                      name: 'case',
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
                  property: 'caseType',
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
                  property: 'cases',
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
            lowerBound: 2,
            upperBound: 2,
          },
        },
        {
          _type: 'collection',
          values: [
            {
              _type: 'string',
              values: ['Case Type'],
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
            },
            {
              _type: 'string',
              values: ['Cases'],
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
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
      class: 'String',
      name: 'case',
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
    },
  ],
};

export const TEST_DATA_lambda_dateTimeCapabilityFilterWithYesterday = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'project',
      parameters: [
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
                  fullPath: 'model::postFilter::Person',
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
                          name: 'x',
                        },
                      ],
                      property: 'myDateTime',
                    },
                    {
                      _type: 'func',
                      function: 'meta::pure::functions::date::adjust',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'meta::pure::functions::date::today',
                          parameters: [],
                        },
                        {
                          _type: 'func',
                          function: 'meta::pure::functions::math::minus',
                          parameters: [
                            {
                              _type: 'integer',
                              values: [1],
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                            },
                          ],
                        },
                        {
                          _type: 'enumValue',
                          fullPath: 'meta::pure::functions::date::DurationUnit',
                          value: 'DAYS',
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
              values: ['Age'],
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
  ],
  parameters: [],
};
