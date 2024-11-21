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

export const TEST_DATA__lambda_input_filterWithExists = {
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
                  parameters: [
                    {
                      _type: 'var',
                      name: 'x',
                    },
                  ],
                  property: 'employees',
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
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x_1',
                            },
                          ],
                          property: 'fullName',
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'equal',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'c',
                                },
                                {
                                  _type: 'string',
                                  value: '',
                                },
                              ],
                            },
                          ],
                          parameters: [{ _type: 'var', name: 'c' }],
                        },
                      ],
                    },
                  ],
                  parameters: [{ _type: 'var', name: 'x_1' }],
                },
              ],
            },
          ],
          parameters: [{ _type: 'var', name: 'x' }],
        },
      ],
    },
  ],
  parameters: [],
};

export const lambda_output_filterWithExists = {
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
                          value: '',
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

export const TEST_DATA__lambda_filterWithSingleExists = {
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
                  fullPath: 'model::Firm',
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
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                      ],
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
                                  _type: 'var',
                                  name: 'x_1',
                                },
                              ],
                              property: 'firstName',
                            },
                            {
                              _type: 'string',
                              value: 'John',
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
        {
          _type: 'collection',
          multiplicity: {
            lowerBound: 3,
            upperBound: 3,
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
                      ],
                      property: 'employees',
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
                  property: 'legalName',
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
            lowerBound: 3,
            upperBound: 3,
          },
          values: [
            {
              _type: 'string',
              value: 'Employees/First Name',
            },
            {
              _type: 'string',
              value: 'Employees/Last Name',
            },
            {
              _type: 'string',
              value: 'Legal Name',
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
          fullPath: 'StrictDate',
        },
        typeArguments: [],
        typeVariableValues: [],
      },
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      name: 'var_1',
    },
  ],
};

export const TEST_DATA__lambda_filterWithNestedExists = {
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
                  fullPath: 'model::Firm',
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
                      function: 'exists',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
                            },
                          ],
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
                                  function: 'exists',
                                  parameters: [
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'x_1',
                                        },
                                      ],
                                      property: 'hobbies',
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
                                                  name: 'x_2',
                                                },
                                              ],
                                              property: 'id',
                                            },
                                            {
                                              _type: 'integer',
                                              value: 0,
                                            },
                                          ],
                                        },
                                      ],
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'x_2',
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
                                      function: 'equal',
                                      parameters: [
                                        {
                                          _type: 'property',
                                          parameters: [
                                            {
                                              _type: 'var',
                                              name: 'x_1',
                                            },
                                          ],
                                          property: 'firstName',
                                        },
                                        {
                                          _type: 'string',
                                          value: 'John',
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
                                              name: 'x_1',
                                            },
                                          ],
                                          property: 'lastName',
                                        },
                                        {
                                          _type: 'string',
                                          value: 'Doe',
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
                              name: 'x_1',
                            },
                          ],
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
                              name: 'x',
                            },
                          ],
                          property: 'legalName',
                        },
                        {
                          _type: 'string',
                          value: 'Firm',
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
          multiplicity: {
            lowerBound: 3,
            upperBound: 3,
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
                      ],
                      property: 'employees',
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
                  property: 'legalName',
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
            lowerBound: 3,
            upperBound: 3,
          },
          values: [
            {
              _type: 'string',
              value: 'Employees/First Name',
            },
            {
              _type: 'string',
              value: 'Employees/Last Name',
            },
            {
              _type: 'string',
              value: 'Legal Name',
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
          fullPath: 'StrictDate',
        },
        typeArguments: [],
        typeVariableValues: [],
      },
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      name: 'var_1',
    },
  ],
};

export const TEST_DATA__lambda_filterWithMultipleGroupConditionsInExists = {
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
                  fullPath: 'model::Firm',
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
                      function: 'exists',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
                            },
                          ],
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
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'x_1',
                                        },
                                      ],
                                      property: 'firstName',
                                    },
                                    {
                                      _type: 'string',
                                      value: 'John',
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
                                          name: 'x_1',
                                        },
                                      ],
                                      property: 'lastName',
                                    },
                                    {
                                      _type: 'string',
                                      value: 'Doe',
                                    },
                                  ],
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
                          property: 'legalName',
                        },
                        {
                          _type: 'string',
                          value: 'Firm',
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
          multiplicity: {
            lowerBound: 3,
            upperBound: 3,
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
                      ],
                      property: 'employees',
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
                  property: 'legalName',
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
            lowerBound: 3,
            upperBound: 3,
          },
          values: [
            {
              _type: 'string',
              value: 'Employees/First Name',
            },
            {
              _type: 'string',
              value: 'Employees/Last Name',
            },
            {
              _type: 'string',
              value: 'Legal Name',
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
          fullPath: 'StrictDate',
        },
        typeArguments: [],
        typeVariableValues: [],
      },
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      name: 'var_1',
    },
  ],
};

export const TEST_DATA__lambda_filterWithTwoExistsInSingleGroupCondition = {
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
                  fullPath: 'model::Firm',
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
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
                            },
                          ],
                          property: 'legalName',
                        },
                        {
                          _type: 'string',
                          value: 'Firm',
                        },
                      ],
                    },
                    {
                      _type: 'func',
                      function: 'and',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'exists',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'x',
                                },
                              ],
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
                                          parameters: [
                                            {
                                              _type: 'var',
                                              name: 'x_1',
                                            },
                                          ],
                                          property: 'firstName',
                                        },
                                        {
                                          _type: 'string',
                                          value: 'John',
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
                                              name: 'x_1',
                                            },
                                          ],
                                          property: 'lastName',
                                        },
                                        {
                                          _type: 'string',
                                          value: 'Doe',
                                        },
                                      ],
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
                        {
                          _type: 'func',
                          function: 'exists',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'x',
                                },
                              ],
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
                                          parameters: [
                                            {
                                              _type: 'var',
                                              name: 'x_1',
                                            },
                                          ],
                                          property: 'firstName',
                                        },
                                        {
                                          _type: 'string',
                                          value: 'John',
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
                                              name: 'x_1',
                                            },
                                          ],
                                          property: 'lastName',
                                        },
                                        {
                                          _type: 'string',
                                          value: 'Doe',
                                        },
                                      ],
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
          multiplicity: {
            lowerBound: 3,
            upperBound: 3,
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
                      ],
                      property: 'employees',
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
                  property: 'legalName',
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
            lowerBound: 3,
            upperBound: 3,
          },
          values: [
            {
              _type: 'string',
              value: 'Employees/First Name',
            },
            {
              _type: 'string',
              value: 'Employees/Last Name',
            },
            {
              _type: 'string',
              value: 'Legal Name',
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
          fullPath: 'StrictDate',
        },
        typeArguments: [],
        typeVariableValues: [],
      },
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      name: 'var_1',
    },
  ],
};
