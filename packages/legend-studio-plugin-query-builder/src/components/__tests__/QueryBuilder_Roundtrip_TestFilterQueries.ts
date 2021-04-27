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

export const lambda_simpleSingleConditionFilter = {
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
              _type: 'class',
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

export const lambda_notOperatorFilter = {
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
              _type: 'class',
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

export const lambda_setOperatorFilter = {
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
              _type: 'class',
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

export const lambda_groupConditionFilter = {
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
              _type: 'class',
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

export const lambda_groupConditionFilter_withMultipleClauseGroup = {
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
              _type: 'class',
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

export const lambda_enumerationOperatorFilter = {
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
              _type: 'class',
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

export const lambda_existsChainFilter = {
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
              _type: 'class',
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

export const lambda_existsChainFilterWithCustomVariableName = {
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
              _type: 'class',
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
