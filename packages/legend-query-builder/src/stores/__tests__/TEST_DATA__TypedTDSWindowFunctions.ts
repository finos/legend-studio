/**
 * Copyright (c) 2026-present, Goldman Sachs
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

export const TEST_DATA_typedTDSRank = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'extend',
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
              _type: 'classInstance',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              type: 'colSpecArray',
              value: {
                colSpecs: [
                  {
                    function1: {
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
                          property: 'firstName',
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'p',
                        },
                      ],
                    },
                    name: 'First Name',
                  },
                  {
                    function1: {
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
                          property: 'lastName',
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'p',
                        },
                      ],
                    },
                    name: 'Last Name',
                  },
                  {
                    function1: {
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
                          property: 'age',
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'p',
                        },
                      ],
                    },
                    name: 'Age',
                  },
                ],
              },
            },
          ],
        },
        {
          _type: 'func',
          function: 'over',
          parameters: [
            {
              _type: 'classInstance',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              type: 'colSpecArray',
              value: {
                colSpecs: [
                  {
                    name: 'First Name',
                  },
                ],
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
                  _type: 'func',
                  function: 'ascending',
                  parameters: [
                    {
                      _type: 'classInstance',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      type: 'colSpec',
                      value: {
                        name: 'Age',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          _type: 'classInstance',
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          type: 'colSpecArray',
          value: {
            colSpecs: [
              {
                function1: {
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
                        {
                          _type: 'var',
                          name: 'w',
                        },
                        {
                          _type: 'var',
                          name: 'r',
                        },
                      ],
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'x',
                    },
                    {
                      _type: 'var',
                      name: 'w',
                    },
                    {
                      _type: 'var',
                      name: 'r',
                    },
                  ],
                },
                name: 'rank',
              },
            ],
          },
        },
      ],
    },
  ],
  parameters: [],
};
