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

export const simpleDerivationProjection = {
  _type: 'lambda',
  body: [
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
              fullPath: 'test::Person',
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
                  function: 'toLower',
                  parameters: [
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
                  function: 'toUpper',
                  parameters: [
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
          multiplicity: {
            lowerBound: 2,
            upperBound: 2,
          },
          values: [
            {
              _type: 'string',
              value: 'Last Name (lowercase)',
            },
            {
              _type: 'string',
              value: 'Last Name (UPPERCASE)',
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const groupByWithDerivationProjection = {
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
              fullPath: 'test::Person',
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
                  _type: 'string',

                  value: '',
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
              _type: 'func',
              function: 'agg',
              parameters: [
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'string',

                      value: '',
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
                      function: 'count',
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
            lowerBound: 2,
            upperBound: 2,
          },
          values: [
            {
              _type: 'string',
              value: '(derivation_1)',
            },
            {
              _type: 'string',
              value: '(derivation_2)',
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const groupByWithDerivationAndAggregation = {
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
              fullPath: 'test::Person',
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
                          _type: 'func',
                          function: 'toUpper',
                          parameters: [
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
                        },
                        {
                          _type: 'string',

                          value: '',
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
            lowerBound: 1,
            upperBound: 1,
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
                                  name: 'x',
                                },
                              ],
                              property: 'lastName',
                            },
                            {
                              _type: 'string',

                              value: 'asd',
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
                      _type: 'func',
                      function: 'count',
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
              _type: 'func',
              function: 'agg',
              parameters: [
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
                                  name: 'x',
                                },
                              ],
                              property: 'lastName',
                            },
                            {
                              _type: 'string',

                              value: 'asd',
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
                      _type: 'func',
                      function: 'count',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'distinct',
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
            lowerBound: 4,
            upperBound: 4,
          },
          values: [
            {
              _type: 'string',
              value: 'Last Name',
            },
            {
              _type: 'string',
              value: 'Last Name (UPPER)',
            },
            {
              _type: 'string',
              value: 'Last Name (count)',
            },
            {
              _type: 'string',
              value: 'LName (distinct count)',
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};
