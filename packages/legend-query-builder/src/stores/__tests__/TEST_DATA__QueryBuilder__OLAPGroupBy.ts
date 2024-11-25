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

export const TEST_DATA__lambda_olapGroupBy_SimpleStringRankFunc = (
  rankFunc: string,
): { parameters?: object; body?: object; _type: string } => ({
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'olapGroupBy',
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
                  fullPath: 'model::Person',
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
                      property: 'firstName',
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
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'property',
                      property: 'lastName',
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
                  value: 'First Name',
                },
                {
                  _type: 'string',
                  value: 'Last Name',
                },
              ],
              multiplicity: {
                lowerBound: 2,
                upperBound: 2,
              },
            },
          ],
        },
        {
          _type: 'collection',
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          values: [
            {
              _type: 'string',
              value: 'First Name',
            },
          ],
        },
        {
          _type: 'func',
          function: 'asc',
          parameters: [
            {
              _type: 'string',
              value: 'Last Name',
            },
          ],
        },
        {
          _type: 'lambda',
          body: [
            {
              _type: 'func',
              function: rankFunc,
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
        {
          _type: 'string',
          value: 'testCol1',
        },
      ],
    },
  ],
  parameters: [],
});

export const TEST_DATA__lambda_olapGroupBy_StringRankNoSortBy = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'olapGroupBy',
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
                  fullPath: 'model::Person',
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
                      property: 'firstName',
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
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'property',
                      property: 'lastName',
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
                  value: 'First Name',
                },
                {
                  _type: 'string',
                  value: 'Last Name',
                },
              ],
              multiplicity: {
                lowerBound: 2,
                upperBound: 2,
              },
            },
          ],
        },
        {
          _type: 'collection',
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          values: [
            {
              _type: 'string',
              value: 'First Name',
            },
          ],
        },
        {
          _type: 'lambda',
          body: [
            {
              _type: 'func',
              function: 'rank',
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
        {
          _type: 'string',
          value: 'testCol1',
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__lambda_olapGroupBy_StackedGroupBy = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'olapGroupBy',
      parameters: [
        {
          _type: 'func',
          function: 'olapGroupBy',
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
                      fullPath: 'model::Person',
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
                          property: 'firstName',
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
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          property: 'lastName',
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
                      value: 'First Name',
                    },
                    {
                      _type: 'string',
                      value: 'Last Name',
                    },
                  ],
                  multiplicity: {
                    lowerBound: 2,
                    upperBound: 2,
                  },
                },
              ],
            },
            {
              _type: 'collection',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              values: [
                {
                  _type: 'string',
                  value: 'First Name',
                },
              ],
            },
            {
              _type: 'func',
              function: 'asc',
              parameters: [
                {
                  _type: 'string',
                  value: 'Last Name',
                },
              ],
            },
            {
              _type: 'lambda',
              body: [
                {
                  _type: 'func',
                  function: 'rank',
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
            {
              _type: 'string',
              value: 'testCol1',
            },
          ],
        },
        {
          _type: 'collection',
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          values: [
            {
              _type: 'string',
              value: 'Last Name',
            },
          ],
        },
        {
          _type: 'func',
          function: 'asc',
          parameters: [
            {
              _type: 'string',
              value: 'First Name',
            },
          ],
        },
        {
          _type: 'lambda',
          body: [
            {
              _type: 'func',
              function: 'rank',
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
        {
          _type: 'string',
          value: 'testCol2',
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__lambda_olapGroupBy_MultiStackedGroupBy = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'olapGroupBy',
      parameters: [
        {
          _type: 'func',
          function: 'olapGroupBy',
          parameters: [
            {
              _type: 'func',
              function: 'olapGroupBy',
              parameters: [
                {
                  _type: 'func',
                  function: 'olapGroupBy',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'olapGroupBy',
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
                                  fullPath: 'model::Firm',
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
                                      property: 'isApple',
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
                                {
                                  _type: 'lambda',
                                  body: [
                                    {
                                      _type: 'property',
                                      property: 'legalName',
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
                                {
                                  _type: 'lambda',
                                  body: [
                                    {
                                      _type: 'property',
                                      property: 'employeeSize',
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
                                {
                                  _type: 'lambda',
                                  body: [
                                    {
                                      _type: 'property',
                                      property: 'incType',
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
                                {
                                  _type: 'lambda',
                                  body: [
                                    {
                                      _type: 'property',
                                      property: 'age',
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
                                {
                                  _type: 'lambda',
                                  body: [
                                    {
                                      _type: 'property',
                                      property: 'firstName',
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
                                {
                                  _type: 'lambda',
                                  body: [
                                    {
                                      _type: 'property',
                                      property: 'lastName',
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
                                lowerBound: 7,
                                upperBound: 7,
                              },
                            },
                            {
                              _type: 'collection',
                              values: [
                                {
                                  _type: 'string',
                                  value: 'Is Apple',
                                },
                                {
                                  _type: 'string',
                                  value: 'Legal Name',
                                },
                                {
                                  _type: 'string',
                                  value: 'Employee Size',
                                },
                                {
                                  _type: 'string',
                                  value: 'Inc Type',
                                },
                                {
                                  _type: 'string',
                                  value: 'Age',
                                },
                                {
                                  _type: 'string',
                                  value: 'First Name',
                                },
                                {
                                  _type: 'string',
                                  value: 'Last Name',
                                },
                              ],
                              multiplicity: {
                                lowerBound: 7,
                                upperBound: 7,
                              },
                            },
                          ],
                        },
                        {
                          _type: 'collection',
                          values: [
                            {
                              _type: 'string',
                              value: 'Is Apple',
                            },
                            {
                              _type: 'string',
                              value: 'Legal Name',
                            },
                            {
                              _type: 'string',
                              value: 'Employee Size',
                            },
                            {
                              _type: 'string',
                              value: 'Inc Type',
                            },
                            {
                              _type: 'string',
                              value: 'Age',
                            },
                            {
                              _type: 'string',
                              value: 'First Name',
                            },
                            {
                              _type: 'string',
                              value: 'Last Name',
                            },
                          ],
                          multiplicity: {
                            lowerBound: 7,
                            upperBound: 7,
                          },
                        },
                        {
                          _type: 'func',
                          function: 'asc',
                          parameters: [
                            {
                              _type: 'string',
                              value: 'Age',
                            },
                          ],
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'rank',
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
                        {
                          _type: 'string',
                          value: 'olapGroupBy Col 1',
                        },
                      ],
                    },
                    {
                      _type: 'collection',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      values: [
                        {
                          _type: 'string',
                          value: 'Legal Name',
                        },
                      ],
                    },
                    {
                      _type: 'func',
                      function: 'asc',
                      parameters: [
                        {
                          _type: 'string',
                          value: 'Age',
                        },
                      ],
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'rank',
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
                    {
                      _type: 'string',
                      value: 'olapGroupBy Col 2',
                    },
                  ],
                },
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  values: [
                    {
                      _type: 'string',
                      value: 'Employee Size',
                    },
                  ],
                },
                {
                  _type: 'func',
                  function: 'asc',
                  parameters: [
                    {
                      _type: 'string',
                      value: 'Age',
                    },
                  ],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'rank',
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
                {
                  _type: 'string',
                  value: 'olapGroupBy Col 3',
                },
              ],
            },
            {
              _type: 'collection',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              values: [
                {
                  _type: 'string',
                  value: 'Inc Type',
                },
              ],
            },
            {
              _type: 'func',
              function: 'asc',
              parameters: [
                {
                  _type: 'string',
                  value: 'Age',
                },
              ],
            },
            {
              _type: 'lambda',
              body: [
                {
                  _type: 'func',
                  function: 'rank',
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
            {
              _type: 'string',
              value: 'olapGroupBy Col 4',
            },
          ],
        },
        {
          _type: 'collection',
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          values: [
            {
              _type: 'string',
              value: 'First Name',
            },
          ],
        },
        {
          _type: 'func',
          function: 'asc',
          parameters: [
            {
              _type: 'string',
              value: 'Age',
            },
          ],
        },
        {
          _type: 'lambda',
          body: [
            {
              _type: 'func',
              function: 'rank',
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
        {
          _type: 'string',
          value: 'olapGroupBy Col 5',
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__lambda_olapGroupBy_SimpleStringRankWithPostFilter = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'filter',
      parameters: [
        {
          _type: 'func',
          function: 'olapGroupBy',
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
                      fullPath: 'model::Person',
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
                          property: 'lastName',
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
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          property: 'firstName',
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
                      value: 'Last Name',
                    },
                    {
                      _type: 'string',
                      value: 'First Name',
                    },
                  ],
                  multiplicity: {
                    lowerBound: 2,
                    upperBound: 2,
                  },
                },
              ],
            },
            {
              _type: 'collection',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              values: [
                {
                  _type: 'string',
                  value: 'First Name',
                },
              ],
            },
            {
              _type: 'func',
              function: 'asc',
              parameters: [
                {
                  _type: 'string',
                  value: 'Last Name',
                },
              ],
            },
            {
              _type: 'lambda',
              body: [
                {
                  _type: 'func',
                  function: 'rank',
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
            {
              _type: 'string',
              value: 'testCol1',
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
                  property: 'getString',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'row',
                    },
                    {
                      _type: 'string',
                      value: 'First Name',
                    },
                  ],
                },
                {
                  _type: 'string',
                  value: 'test',
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

export const TEST_DATA__lambda_olapGroupBy_RankWithPostFilterOnOlapColumn = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'filter',
      parameters: [
        {
          _type: 'func',
          function: 'olapGroupBy',
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
                      fullPath: 'model::Person',
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
                          property: 'lastName',
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
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          property: 'firstName',
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
                      value: 'Last Name',
                    },
                    {
                      _type: 'string',
                      value: 'First Name',
                    },
                  ],
                  multiplicity: {
                    lowerBound: 2,
                    upperBound: 2,
                  },
                },
              ],
            },
            {
              _type: 'collection',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              values: [
                {
                  _type: 'string',
                  value: 'First Name',
                },
              ],
            },
            {
              _type: 'func',
              function: 'asc',
              parameters: [
                {
                  _type: 'string',
                  value: 'Last Name',
                },
              ],
            },
            {
              _type: 'lambda',
              body: [
                {
                  _type: 'func',
                  function: 'rank',
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
            {
              _type: 'string',
              value: 'testCol1',
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
                  property: 'getNumber',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'row',
                    },
                    {
                      _type: 'string',
                      value: 'testCol1',
                    },
                  ],
                },
                {
                  _type: 'integer',
                  value: 1,
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

export const TEST_DATA__lambda_olapGroupBy_SimpleOlapAggregationFunc = (
  aggFunc: string,
): { parameters?: object; body?: object; _type: string } => ({
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'olapGroupBy',
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
                  fullPath: 'model::Person',
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
                      property: 'firstName',
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
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'property',
                      property: 'lastName',
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
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'property',
                      property: 'age',
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
                  value: 'First Name',
                },
                {
                  _type: 'string',
                  value: 'Last Name',
                },
                {
                  _type: 'string',
                  value: 'Age',
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
          _type: 'collection',
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          values: [
            {
              _type: 'string',
              value: 'First Name',
            },
          ],
        },
        {
          _type: 'func',
          function: 'func',
          parameters: [
            {
              _type: 'string',
              value: 'Age',
            },
            {
              _type: 'lambda',
              body: [
                {
                  _type: 'func',
                  function: aggFunc,
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
        {
          _type: 'string',
          value: 'Age Sum',
        },
      ],
    },
  ],
  parameters: [],
});

export const TEST_DATA__lambda_olapGroupBy_Aggreation_Sum_SortBy = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'olapGroupBy',
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
                  fullPath: 'model::Person',
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
                      property: 'firstName',
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
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'property',
                      property: 'lastName',
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
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'property',
                      property: 'age',
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
                  value: 'First Name',
                },
                {
                  _type: 'string',
                  value: 'Last Name',
                },
                {
                  _type: 'string',
                  value: 'Age',
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
          _type: 'collection',
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          values: [
            {
              _type: 'string',
              value: 'First Name',
            },
          ],
        },
        {
          _type: 'func',
          function: 'asc',
          parameters: [
            {
              _type: 'string',
              value: 'Age',
            },
          ],
        },
        {
          _type: 'func',
          function: 'func',
          parameters: [
            {
              _type: 'string',
              value: 'Age',
            },
            {
              _type: 'lambda',
              body: [
                {
                  _type: 'func',
                  function: 'sum',
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
        {
          _type: 'string',
          value: 'Age Sum',
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__lambda_olapGroupBy_Stacked_Aggregation = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'olapGroupBy',
      parameters: [
        {
          _type: 'func',
          function: 'olapGroupBy',
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
                      fullPath: 'model::Person',
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
                          property: 'firstName',
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
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          property: 'lastName',
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
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          property: 'age',
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
                      value: 'First Name',
                    },
                    {
                      _type: 'string',
                      value: 'Last Name',
                    },
                    {
                      _type: 'string',
                      value: 'Age',
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
              _type: 'collection',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              values: [
                {
                  _type: 'string',
                  value: 'First Name',
                },
              ],
            },
            {
              _type: 'func',
              function: 'func',
              parameters: [
                {
                  _type: 'string',
                  value: 'Age',
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'sum',
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
            {
              _type: 'string',
              value: 'Age Sum',
            },
          ],
        },
        {
          _type: 'collection',
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          values: [
            {
              _type: 'string',
              value: 'First Name',
            },
          ],
        },
        {
          _type: 'func',
          function: 'func',
          parameters: [
            {
              _type: 'string',
              value: 'Age',
            },
            {
              _type: 'lambda',
              body: [
                {
                  _type: 'func',
                  function: 'sum',
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
        {
          _type: 'string',
          value: 'Age Sum 2',
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__lambda_olapGroupBy_Stacked_Aggregation_Rank = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'olapGroupBy',
      parameters: [
        {
          _type: 'func',
          function: 'olapGroupBy',
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
                      fullPath: 'model::Person',
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
                          property: 'firstName',
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
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          property: 'lastName',
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
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          property: 'age',
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
                      value: 'First Name',
                    },
                    {
                      _type: 'string',
                      value: 'Last Name',
                    },
                    {
                      _type: 'string',
                      value: 'Age',
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
              _type: 'collection',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              values: [
                {
                  _type: 'string',
                  value: 'First Name',
                },
              ],
            },
            {
              _type: 'func',
              function: 'func',
              parameters: [
                {
                  _type: 'string',
                  value: 'Age',
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'sum',
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
            {
              _type: 'string',
              value: 'Age Sum',
            },
          ],
        },
        {
          _type: 'collection',
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          values: [
            {
              _type: 'string',
              value: 'Age Sum',
            },
          ],
        },
        {
          _type: 'func',
          function: 'asc',
          parameters: [
            {
              _type: 'string',
              value: 'Age',
            },
          ],
        },
        {
          _type: 'lambda',
          body: [
            {
              _type: 'func',
              function: 'rank',
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
        {
          _type: 'string',
          value: 'Age Rank',
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__lambda_olapGroupBy_Stacked_Aggregation_Rank_VarName = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'olapGroupBy',
      parameters: [
        {
          _type: 'func',
          function: 'olapGroupBy',
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
                      fullPath: 'model::Person',
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
                          property: 'firstName',
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
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          property: 'lastName',
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
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          property: 'age',
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
                      value: 'First Name',
                    },
                    {
                      _type: 'string',
                      value: 'Last Name',
                    },
                    {
                      _type: 'string',
                      value: 'Age',
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
              _type: 'collection',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              values: [
                {
                  _type: 'string',
                  value: 'First Name',
                },
              ],
            },
            {
              _type: 'func',
              function: 'func',
              parameters: [
                {
                  _type: 'string',
                  value: 'Age',
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'sum',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'testing',
                        },
                      ],
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'testing',
                    },
                  ],
                },
              ],
            },
            {
              _type: 'string',
              value: 'Age Sum',
            },
          ],
        },
        {
          _type: 'collection',
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          values: [
            {
              _type: 'string',
              value: 'Age Sum',
            },
          ],
        },
        {
          _type: 'func',
          function: 'asc',
          parameters: [
            {
              _type: 'string',
              value: 'Age',
            },
          ],
        },
        {
          _type: 'lambda',
          body: [
            {
              _type: 'func',
              function: 'rank',
              parameters: [
                {
                  _type: 'var',
                  name: 'y',
                },
              ],
            },
          ],
          parameters: [
            {
              _type: 'var',
              name: 'y',
            },
          ],
        },
        {
          _type: 'string',
          value: 'Age Rank',
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__OlapGroupBy_entities = [
  {
    path: 'model::IncType',
    content: {
      _type: 'Enumeration',
      name: 'IncType',
      package: 'model',
      values: [
        {
          value: 'Corp',
        },
        {
          value: 'LLC',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
  },
  {
    path: 'model::Firm',
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
                    property: 'legalName',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'this',
                      },
                    ],
                  },
                  {
                    _type: 'string',
                    value: '_',
                  },
                ],
              },
            ],
            parameters: [],
          },
          name: 'validName',
        },
      ],
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
          name: 'incType',
          type: 'model::IncType',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'isApple',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Boolean',
            },
            typeArguments: [],
            typeVariableValues: [],
          },
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'count',
              parameters: [
                {
                  _type: 'property',
                  property: 'employees',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                    },
                  ],
                },
              ],
            },
          ],
          name: 'employeeSize',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'Number',
        },
      ],
      superTypes: ['model::LegalEntity'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
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
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'age',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
            typeArguments: [],
            typeVariableValues: [],
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
                  values: [
                    {
                      _type: 'property',
                      property: 'firstName',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                        },
                      ],
                    },
                    {
                      _type: 'string',
                      value: ' ',
                    },
                    {
                      _type: 'property',
                      property: 'lastName',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                        },
                      ],
                    },
                  ],
                  multiplicity: {
                    lowerBound: 3,
                    upperBound: 3,
                  },
                },
              ],
            },
          ],
          name: 'fullName',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'model::LegalEntity',
    content: {
      _type: 'class',
      name: 'LegalEntity',
      package: 'model',
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
    path: 'model::MyDatabase',
    content: {
      _type: 'relational',
      filters: [],
      includedStores: [],
      joins: [
        {
          name: 'FirmPerson',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'firm_id',
                table: {
                  _type: 'Table',
                  database: 'model::MyDatabase',
                  mainTableDb: 'model::MyDatabase',
                  schema: 'default',
                  table: 'PersonTable',
                },
                tableAlias: 'PersonTable',
              },
              {
                _type: 'column',
                column: 'id',
                table: {
                  _type: 'Table',
                  database: 'model::MyDatabase',
                  mainTableDb: 'model::MyDatabase',
                  schema: 'default',
                  table: 'FirmTable',
                },
                tableAlias: 'FirmTable',
              },
            ],
          },
        },
      ],
      name: 'MyDatabase',
      package: 'model',
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
                  name: 'Legal_name',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'Inc',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'FirmTable',
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
                  name: 'firm_id',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'firstName',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'lastName',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'age',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
              ],
              name: 'PersonTable',
              primaryKey: ['id'],
            },
          ],
          views: [],
        },
      ],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'model::RelationalMapping',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'relational',
          class: 'model::Firm',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'model::MyDatabase',
            mainTableDb: 'model::MyDatabase',
            schema: 'default',
            table: 'FirmTable',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'id',
              table: {
                _type: 'Table',
                database: 'model::MyDatabase',
                mainTableDb: 'model::MyDatabase',
                schema: 'default',
                table: 'FirmTable',
              },
              tableAlias: 'FirmTable',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'model::Firm',
                property: 'legalName',
              },
              relationalOperation: {
                _type: 'dynaFunc',
                funcName: 'concat',
                parameters: [
                  {
                    _type: 'column',
                    column: 'Legal_name',
                    table: {
                      _type: 'Table',
                      database: 'model::MyDatabase',
                      mainTableDb: 'model::MyDatabase',
                      schema: 'default',
                      table: 'FirmTable',
                    },
                    tableAlias: 'FirmTable',
                  },
                  {
                    _type: 'literal',
                    value: '_LTD',
                  },
                ],
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'model::Firm',
                property: 'employees',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'model::MyDatabase',
                    name: 'FirmPerson',
                  },
                ],
              },
              target: 'model_Person',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'model::Firm',
                property: 'isApple',
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
                        column: 'Legal_name',
                        table: {
                          _type: 'Table',
                          database: 'model::MyDatabase',
                          mainTableDb: 'model::MyDatabase',
                          schema: 'default',
                          table: 'FirmTable',
                        },
                        tableAlias: 'FirmTable',
                      },
                      {
                        _type: 'literal',
                        value: 'Apple',
                      },
                    ],
                  },
                  {
                    _type: 'literal',
                    value: 'true',
                  },
                  {
                    _type: 'literal',
                    value: 'false',
                  },
                ],
              },
            },
            {
              _type: 'relationalPropertyMapping',
              enumMappingId: 'model_IncType',
              property: {
                class: 'model::Firm',
                property: 'incType',
              },
              relationalOperation: {
                _type: 'column',
                column: 'Inc',
                table: {
                  _type: 'Table',
                  database: 'model::MyDatabase',
                  mainTableDb: 'model::MyDatabase',
                  schema: 'default',
                  table: 'FirmTable',
                },
                tableAlias: 'FirmTable',
              },
            },
          ],
          root: true,
        },
        {
          _type: 'relational',
          class: 'model::Person',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'model::MyDatabase',
            mainTableDb: 'model::MyDatabase',
            schema: 'default',
            table: 'PersonTable',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'id',
              table: {
                _type: 'Table',
                database: 'model::MyDatabase',
                mainTableDb: 'model::MyDatabase',
                schema: 'default',
                table: 'PersonTable',
              },
              tableAlias: 'PersonTable',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'model::Person',
                property: 'firstName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'firstName',
                table: {
                  _type: 'Table',
                  database: 'model::MyDatabase',
                  mainTableDb: 'model::MyDatabase',
                  schema: 'default',
                  table: 'PersonTable',
                },
                tableAlias: 'PersonTable',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'model::Person',
                property: 'lastName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'lastName',
                table: {
                  _type: 'Table',
                  database: 'model::MyDatabase',
                  mainTableDb: 'model::MyDatabase',
                  schema: 'default',
                  table: 'PersonTable',
                },
                tableAlias: 'PersonTable',
              },
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'model::Person',
                property: 'age',
              },
              relationalOperation: {
                _type: 'column',
                column: 'age',
                table: {
                  _type: 'Table',
                  database: 'model::MyDatabase',
                  mainTableDb: 'model::MyDatabase',
                  schema: 'default',
                  table: 'PersonTable',
                },
                tableAlias: 'PersonTable',
              },
            },
          ],
          root: true,
        },
      ],
      enumerationMappings: [
        {
          enumValueMappings: [
            {
              enumValue: 'Corp',
              sourceValues: [
                {
                  _type: 'stringSourceValue',
                  value: 'Corp',
                },
                {
                  _type: 'stringSourceValue',
                  value: 'CORP',
                },
              ],
            },
            {
              enumValue: 'LLC',
              sourceValues: [
                {
                  _type: 'stringSourceValue',
                  value: 'LLC',
                },
              ],
            },
          ],
          enumeration: 'model::IncType',
        },
      ],
      includedMappings: [],
      name: 'RelationalMapping',
      package: 'model',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'model::Runtime',
    content: {
      _type: 'runtime',
      name: 'Runtime',
      package: 'model',
      runtimeValue: {
        _type: 'engineRuntime',
        connections: [
          {
            store: {
              path: 'model::MyDatabase',
              type: 'STORE',
            },
            storeConnections: [
              {
                connection: {
                  _type: 'connectionPointer',
                  connection: 'model::MyConnection',
                },
                id: 'my_connection',
              },
            ],
          },
        ],
        mappings: [
          {
            path: 'model::RelationalMapping',
            type: 'MAPPING',
          },
        ],
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
  },
  {
    path: 'model::MyConnection',
    content: {
      _type: 'connection',
      connectionValue: {
        _type: 'RelationalDatabaseConnection',
        authenticationStrategy: {
          _type: 'h2Default',
        },
        databaseType: 'H2',
        datasourceSpecification: {
          _type: 'h2Local',
        },
        element: 'model::MyDatabase',
        type: 'H2',
      },
      name: 'MyConnection',
      package: 'model',
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
];

export const TEST_DATA__lambda_groupBy_postFilter_OlapGroupBy = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'filter',
      parameters: [
        {
          _type: 'func',
          function: 'olapGroupBy',
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
                              property: 'fullName',
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
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  values: [
                    {
                      _type: 'string',
                      value: 'Full Name',
                    },
                  ],
                },
              ],
            },
            {
              _type: 'collection',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              values: [
                {
                  _type: 'string',
                  value: 'Full Name',
                },
              ],
            },
            {
              _type: 'func',
              function: 'func',
              parameters: [
                {
                  _type: 'string',
                  value: 'Full Name',
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'sum',
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
            {
              _type: 'string',
              value: 'olap sum',
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
                      property: 'getString',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'row',
                        },
                        {
                          _type: 'string',
                          value: 'Full Name',
                        },
                      ],
                    },
                    {
                      _type: 'string',
                      value: 'User1',
                    },
                  ],
                },
                {
                  _type: 'func',
                  function: 'equal',
                  parameters: [
                    {
                      _type: 'property',
                      property: 'getNumber',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'row',
                        },
                        {
                          _type: 'string',
                          value: 'olap sum',
                        },
                      ],
                    },
                    {
                      _type: 'integer',
                      value: 0,
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

export const TEST_DATA__lambda_olapGroupBy_withTake = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'take',
      parameters: [
        {
          _type: 'func',
          function: 'olapGroupBy',
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
                      fullPath: 'model::Person',
                    },
                  ],
                },
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 2,
                    upperBound: 2,
                  },
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
                          property: 'firstName',
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
                          property: 'lastName',
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
                  multiplicity: {
                    lowerBound: 2,
                    upperBound: 2,
                  },
                  values: [
                    {
                      _type: 'string',
                      value: 'First Name',
                    },
                    {
                      _type: 'string',
                      value: 'Last Name',
                    },
                  ],
                },
              ],
            },
            {
              _type: 'collection',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              values: [
                {
                  _type: 'string',
                  value: 'First Name',
                },
              ],
            },
            {
              _type: 'func',
              function: 'asc',
              parameters: [
                {
                  _type: 'string',
                  value: 'Last Name',
                },
              ],
            },
            {
              _type: 'lambda',
              body: [
                {
                  _type: 'func',
                  function: 'rank',
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
            {
              _type: 'string',
              value: 'testCol1',
            },
          ],
        },
        {
          _type: 'integer',
          value: 50,
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__lambda_olapGroupBy_withDistinct = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'distinct',
      parameters: [
        {
          _type: 'func',
          function: 'olapGroupBy',
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
                      fullPath: 'model::Person',
                    },
                  ],
                },
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 2,
                    upperBound: 2,
                  },
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
                          property: 'firstName',
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
                          property: 'lastName',
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
                  multiplicity: {
                    lowerBound: 2,
                    upperBound: 2,
                  },
                  values: [
                    {
                      _type: 'string',
                      value: 'First Name',
                    },
                    {
                      _type: 'string',
                      value: 'Last Name',
                    },
                  ],
                },
              ],
            },
            {
              _type: 'collection',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              values: [
                {
                  _type: 'string',
                  value: 'First Name',
                },
              ],
            },
            {
              _type: 'func',
              function: 'asc',
              parameters: [
                {
                  _type: 'string',
                  value: 'Last Name',
                },
              ],
            },
            {
              _type: 'lambda',
              body: [
                {
                  _type: 'func',
                  function: 'rank',
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
            {
              _type: 'string',
              value: 'testCol1',
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};
export const TEST_DATA__lambda_olapGroupBy_withSort = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'sort',
      parameters: [
        {
          _type: 'func',
          function: 'olapGroupBy',
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
                      fullPath: 'model::Person',
                    },
                  ],
                },
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 2,
                    upperBound: 2,
                  },
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
                          property: 'firstName',
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
                          property: 'lastName',
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
                  multiplicity: {
                    lowerBound: 2,
                    upperBound: 2,
                  },
                  values: [
                    {
                      _type: 'string',
                      value: 'First Name',
                    },
                    {
                      _type: 'string',
                      value: 'Last Name',
                    },
                  ],
                },
              ],
            },
            {
              _type: 'collection',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              values: [
                {
                  _type: 'string',
                  value: 'First Name',
                },
              ],
            },
            {
              _type: 'func',
              function: 'asc',
              parameters: [
                {
                  _type: 'string',
                  value: 'Last Name',
                },
              ],
            },
            {
              _type: 'lambda',
              body: [
                {
                  _type: 'func',
                  function: 'rank',
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
            {
              _type: 'string',
              value: 'testCol1',
            },
          ],
        },
        {
          _type: 'collection',
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          values: [
            {
              _type: 'func',
              function: 'asc',
              parameters: [
                {
                  _type: 'string',
                  value: 'First Name',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__lambda_olapGroupBy_withSortOnOlapColumn = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'sort',
      parameters: [
        {
          _type: 'func',
          function: 'filter',
          parameters: [
            {
              _type: 'func',
              function: 'olapGroupBy',
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
                          fullPath: 'model::Person',
                        },
                      ],
                    },
                    {
                      _type: 'collection',
                      multiplicity: {
                        lowerBound: 2,
                        upperBound: 2,
                      },
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
                              property: 'firstName',
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
                              property: 'lastName',
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
                      multiplicity: {
                        lowerBound: 2,
                        upperBound: 2,
                      },
                      values: [
                        {
                          _type: 'string',
                          value: 'First Name',
                        },
                        {
                          _type: 'string',
                          value: 'Last Name',
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  values: [
                    {
                      _type: 'string',
                      value: 'First Name',
                    },
                  ],
                },
                {
                  _type: 'func',
                  function: 'asc',
                  parameters: [
                    {
                      _type: 'string',
                      value: 'Last Name',
                    },
                  ],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'rank',
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
                {
                  _type: 'string',
                  value: 'testCol1',
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
                          value: 'First Name',
                        },
                      ],
                      property: 'getString',
                    },
                    {
                      _type: 'string',
                      value: 'Test',
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
        {
          _type: 'collection',
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          values: [
            {
              _type: 'func',
              function: 'asc',
              parameters: [
                {
                  _type: 'string',
                  value: 'testCol1',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};
