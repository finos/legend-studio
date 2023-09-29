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

export const TEST_DATA__simpleProjectionWithAggregation = {
  _type: 'lambda',
  body: [
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
              fullPath: 'test::Employee',
            },
          ],
        },
        {
          _type: 'collection',
          multiplicity: {
            lowerBound: 0,
            upperBound: 0,
          },
          values: [],
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
                      property: 'fteFactor',
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
              value: 'ytd',
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__simpleProjectionWithCalendarAggregation = {
  _type: 'lambda',
  body: [
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
              fullPath: 'test::Employee',
            },
          ],
        },
        {
          _type: 'collection',
          multiplicity: {
            lowerBound: 0,
            upperBound: 0,
          },
          values: [],
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
              function: 'agg',
              parameters: [
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'ytd',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
                            },
                          ],
                          property: 'hireDate',
                        },
                        {
                          _type: 'string',
                          value: 'NY',
                        },
                        {
                          _type: 'strictDate',
                          value: '2022-11-16',
                        },
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
                            },
                          ],
                          property: 'fteFactor',
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
              value: 'ytd',
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__simpleProjectionWithCalendarAggregationWithDateFunction =
  {
    _type: 'lambda',
    body: [
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
                fullPath: 'test::Employee',
              },
            ],
          },
          {
            _type: 'collection',
            multiplicity: {
              lowerBound: 0,
              upperBound: 0,
            },
            values: [],
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
                function: 'agg',
                parameters: [
                  {
                    _type: 'lambda',
                    body: [
                      {
                        _type: 'func',
                        function: 'ytd',
                        parameters: [
                          {
                            _type: 'property',
                            parameters: [
                              {
                                _type: 'var',
                                name: 'x',
                              },
                            ],
                            property: 'hireDate',
                          },
                          {
                            _type: 'string',
                            value: 'NY',
                          },
                          {
                            _type: 'func',
                            function: 'meta::pure::functions::date::today',
                            parameters: [],
                          },
                          {
                            _type: 'property',
                            parameters: [
                              {
                                _type: 'var',
                                name: 'x',
                              },
                            ],
                            property: 'fteFactor',
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
                value: 'ytd',
              },
            ],
          },
        ],
      },
    ],
    parameters: [],
  };

export const TEST_DATA__simpleDerivationWithCalendarAggregation = {
  _type: 'lambda',
  body: [
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
              fullPath: 'test::Employee',
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
                      name: 'p',
                    },
                  ],
                  property: 'hireDate',
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
        {
          _type: 'collection',
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          values: [
            {
              _type: 'func',
              function: 'agg',
              parameters: [
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'cme',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'p',
                            },
                          ],
                          property: 'hireDate',
                        },
                        {
                          _type: 'string',
                          value: 'LDN',
                        },
                        {
                          _type: 'strictDate',
                          value: '2022-11-16',
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
                                    lowerBound: 2,
                                    upperBound: 2,
                                  },
                                  values: [
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'p',
                                        },
                                      ],
                                      property: 'fteFactor',
                                    },
                                    {
                                      _type: 'integer',
                                      value: 1,
                                    },
                                  ],
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
                  parameters: [
                    {
                      _type: 'var',
                      name: 'p',
                    },
                  ],
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
              value: 'includedDate',
            },
            {
              _type: 'string',
              value: 'ytd',
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__simpleProjectionWithCalendarAggregationWithNestedDateColumn =
  {
    _type: 'lambda',
    body: [
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
                fullPath: 'test::Employee',
              },
            ],
          },
          {
            _type: 'collection',
            multiplicity: {
              lowerBound: 0,
              upperBound: 0,
            },
            values: [],
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
                function: 'agg',
                parameters: [
                  {
                    _type: 'lambda',
                    body: [
                      {
                        _type: 'func',
                        function: 'ytd',
                        parameters: [
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
                                property: 'firm',
                              },
                            ],
                            property: 'openingDate',
                          },
                          {
                            _type: 'string',
                            value: 'NY',
                          },
                          {
                            _type: 'strictDate',
                            value: '2022-11-16',
                          },
                          {
                            _type: 'property',
                            parameters: [
                              {
                                _type: 'var',
                                name: 'x',
                              },
                            ],
                            property: 'fteFactor',
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
                value: 'ytd',
              },
            ],
          },
        ],
      },
    ],
    parameters: [],
  };

export const TEST_DATA__ModelCoverageAnalysisResult_Calendar = {
  mappedEntities: [
    {
      path: 'test::Employee',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'endDate',
        },
        {
          _type: 'entity',
          entityPath: 'test::Firm',
          name: 'firm',
        },
        {
          _type: 'MappedProperty',
          name: 'firmName',
        },
        {
          _type: 'MappedProperty',
          name: 'fteFactor',
        },
        {
          _type: 'MappedProperty',
          name: 'hireDate',
        },
        {
          _type: 'MappedProperty',
          name: 'hireType',
        },
        {
          _type: 'MappedProperty',
          name: 'id',
        },
      ],
    },
    {
      path: 'test::Firm',
      properties: [
        {
          _type: 'MappedProperty',
          name: 'id',
        },
        {
          _type: 'MappedProperty',
          name: 'openingDate',
        },
      ],
    },
  ],
};
