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

export const lambda_input_filterWithExists = {
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
                                  multiplicity: {
                                    lowerBound: 1,
                                    upperBound: 1,
                                  },
                                  values: [''],
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
                          values: [''],
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
