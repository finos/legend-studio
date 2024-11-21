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

export const TEST_DATA__lambda_expected_typeahead_filter = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'take',
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
                          fullPath: 'domain::COVIDData',
                        },
                      ],
                    },
                    {
                      _type: 'collection',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: [
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [{ _type: 'var', name: 'x' }],
                                  property: 'demographics',
                                },
                              ],
                              property: 'state',
                            },
                          ],
                          parameters: [{ _type: 'var', name: 'x' }],
                        },
                      ],
                    },
                    {
                      _type: 'collection',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: [
                        {
                          _type: 'string',
                          value: 'demographics.state',
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'startsWith',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            { _type: 'var', name: 'row' },
                            {
                              _type: 'string',
                              value: 'demographics.state',
                            },
                          ],
                          property: 'getString',
                        },
                        {
                          _type: 'string',
                          value: 'NY',
                        },
                      ],
                    },
                  ],
                  parameters: [{ _type: 'var', name: 'row' }],
                },
              ],
            },
          ],
        },
        {
          _type: 'integer',
          value: 10,
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__lambda_expected_typeahead_filter_milestoning = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'take',
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
                          fullPath: 'my::Firm',
                        },
                      ],
                    },
                    {
                      _type: 'collection',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: [
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'x',
                                    },
                                    {
                                      _type: 'func',
                                      function:
                                        'meta::pure::functions::date::now',
                                      parameters: [],
                                    },
                                  ],
                                  property: 'employees',
                                },
                              ],
                              property: 'firstName',
                            },
                          ],
                          parameters: [{ _type: 'var', name: 'x' }],
                        },
                      ],
                    },
                    {
                      _type: 'collection',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: [
                        {
                          _type: 'string',
                          value: 'employees.firstName',
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'startsWith',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            { _type: 'var', name: 'row' },
                            {
                              _type: 'string',
                              value: 'employees.firstName',
                            },
                          ],
                          property: 'getString',
                        },
                        {
                          _type: 'string',
                          value: 'john',
                        },
                      ],
                    },
                  ],
                  parameters: [{ _type: 'var', name: 'row' }],
                },
              ],
            },
          ],
        },
        {
          _type: 'integer',
          value: 10,
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__lambda_expected_typeahead_postFilter_with_derivation = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'take',
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
                      multiplicity: { lowerBound: 1, upperBound: 1 },
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
                                  multiplicity: {
                                    lowerBound: 2,
                                    upperBound: 2,
                                  },
                                  values: [
                                    {
                                      _type: 'string',
                                      value: 'my full name is: ',
                                    },
                                    {
                                      _type: 'property',
                                      parameters: [{ _type: 'var', name: 'x' }],
                                      property: 'fullName',
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
                    {
                      _type: 'collection',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: [
                        {
                          _type: 'string',
                          value: 'greeting',
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'startsWith',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            { _type: 'var', name: 'row' },
                            {
                              _type: 'string',
                              value: 'greeting',
                            },
                          ],
                          property: 'getString',
                        },
                        {
                          _type: 'string',
                          value: 'my full name is: Bob',
                        },
                      ],
                    },
                  ],
                  parameters: [{ _type: 'var', name: 'row' }],
                },
              ],
            },
          ],
        },
        {
          _type: 'integer',
          value: 10,
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__lambda_expected_typeahead_postFilter_milestoning = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'take',
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
                          fullPath: 'my::Firm',
                        },
                      ],
                    },
                    {
                      _type: 'collection',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: [
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'x',
                                    },
                                    {
                                      _type: 'func',
                                      function:
                                        'meta::pure::functions::date::now',
                                      parameters: [],
                                    },
                                  ],
                                  property: 'employees',
                                },
                              ],
                              property: 'firstName',
                            },
                          ],
                          parameters: [{ _type: 'var', name: 'x' }],
                        },
                      ],
                    },
                    {
                      _type: 'collection',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: [
                        {
                          _type: 'string',
                          value: 'employees.firstName',
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'startsWith',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            { _type: 'var', name: 'row' },
                            {
                              _type: 'string',
                              value: 'employees.firstName',
                            },
                          ],
                          property: 'getString',
                        },
                        {
                          _type: 'string',
                          value: 'john',
                        },
                      ],
                    },
                  ],
                  parameters: [{ _type: 'var', name: 'row' }],
                },
              ],
            },
          ],
        },
        {
          _type: 'integer',
          value: 10,
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__lambda_expected_typeahead_postFilter = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'take',
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
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: [
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'property',
                              parameters: [{ _type: 'var', name: 'x' }],
                              property: 'fullName',
                            },
                          ],
                          parameters: [{ _type: 'var', name: 'x' }],
                        },
                      ],
                    },
                    {
                      _type: 'collection',
                      multiplicity: { lowerBound: 1, upperBound: 1 },
                      values: [
                        {
                          _type: 'string',
                          value: 'fullName',
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'startsWith',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            { _type: 'var', name: 'row' },
                            {
                              _type: 'string',
                              value: 'fullName',
                            },
                          ],
                          property: 'getString',
                        },
                        {
                          _type: 'string',
                          value: '',
                        },
                      ],
                    },
                  ],
                  parameters: [{ _type: 'var', name: 'row' }],
                },
              ],
            },
          ],
        },
        {
          _type: 'integer',
          value: 10,
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__lambda_typeahead_simple_postFilter_milestoning = {
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
                  fullPath: 'my::Firm',
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
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
                            },
                            {
                              _type: 'var',
                              name: 'businessDate',
                            },
                          ],
                          property: 'employees',
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
                  value: 'Employees/First Name',
                },
              ],
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
                      value: 'Employees/First Name',
                    },
                  ],
                  property: 'getString',
                },
                {
                  _type: 'string',
                  value: 'john',
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
  parameters: [
    {
      _type: 'var',
      genericType: {
        rawType: {
          _type: 'packageableType',
          fullPath: 'Date',
        },
        typeArguments: [],
        typeVariableValues: [],
      },
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      name: 'businessDate',
    },
  ],
};

export const TEST_DATA__lambda_typeahead_simple_postFilter = {
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
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
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
                      value: 'Full Name',
                    },
                  ],
                  property: 'getString',
                },
                {
                  _type: 'string',
                  value: '',
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
