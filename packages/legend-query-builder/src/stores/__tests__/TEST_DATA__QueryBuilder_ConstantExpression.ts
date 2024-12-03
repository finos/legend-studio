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

export const TEST_DATA__lambda_ContantExpression_Simple = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'letFunction',
      parameters: [
        {
          _type: 'string',
          value: 'age',
        },
        {
          _type: 'integer',
          value: 20,
        },
      ],
    },
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
                  fullPath: 'model::Person',
                },
              ],
            },
            {
              _type: 'lambda',
              body: [
                {
                  _type: 'func',
                  function: 'greaterThan',
                  parameters: [
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
                    {
                      _type: 'integer',
                      value: 20,
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
            lowerBound: 2,
            upperBound: 2,
          },
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
  ],
  parameters: [],
};

export const TEST_DATA__lambda_ContantExpression_SimpleUsedAsVariable = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'letFunction',
      parameters: [
        {
          _type: 'string',
          value: 'age',
        },
        {
          _type: 'integer',
          value: 20,
        },
      ],
    },
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
                  fullPath: 'model::Person',
                },
              ],
            },
            {
              _type: 'lambda',
              body: [
                {
                  _type: 'func',
                  function: 'greaterThan',
                  parameters: [
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
                    {
                      _type: 'var',
                      name: 'age',
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
            lowerBound: 2,
            upperBound: 2,
          },
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
  ],
  parameters: [],
};

export const TEST_DATA__lambda_ContantExpression_MultiConstantAndCalculatedVariables =
  {
    _type: 'lambda',
    body: [
      {
        _type: 'func',
        function: 'letFunction',
        parameters: [
          {
            _type: 'string',
            value: 'a',
          },
          {
            _type: 'string',
            value: 'valueForConstantA',
          },
        ],
      },
      {
        _type: 'func',
        function: 'letFunction',
        parameters: [
          {
            _type: 'string',
            value: 'b',
          },
          {
            _type: 'string',
            value: 'valueForConstantB',
          },
        ],
      },
      {
        _type: 'func',
        function: 'letFunction',
        parameters: [
          {
            _type: 'string',
            value: 'c',
          },
          {
            _type: 'integer',
            value: 1,
          },
        ],
      },
      {
        _type: 'func',
        function: 'letFunction',
        parameters: [
          {
            _type: 'string',
            value: 'd',
          },
          {
            _type: 'func',
            function: 'if',
            parameters: [
              {
                _type: 'func',
                function: 'equal',
                parameters: [
                  {
                    _type: 'integer',
                    value: 2,
                  },
                  {
                    _type: 'integer',
                    value: 2,
                  },
                ],
              },
              {
                _type: 'lambda',
                body: [
                  {
                    _type: 'integer',
                    value: 1,
                  },
                ],
                parameters: [],
              },
              {
                _type: 'lambda',
                body: [
                  {
                    _type: 'integer',
                    value: 2,
                  },
                ],
                parameters: [],
              },
            ],
          },
        ],
      },
      {
        _type: 'func',
        function: 'letFunction',
        parameters: [
          {
            _type: 'string',
            value: 'e',
          },
          {
            _type: 'func',
            function: 'toString',
            parameters: [
              {
                _type: 'integer',
                value: 2,
              },
            ],
          },
        ],
      },
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
                    fullPath: 'model::Person',
                  },
                ],
              },
              {
                _type: 'lambda',
                body: [
                  {
                    _type: 'func',
                    function: 'greaterThan',
                    parameters: [
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
                      {
                        _type: 'integer',
                        value: 20,
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
              lowerBound: 2,
              upperBound: 2,
            },
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
    ],
    parameters: [
      {
        _type: 'var',
        name: 'param1',
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'String',
          },
        },
      },
    ],
  };
