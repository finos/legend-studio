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

export const TEST_DATA__lambda_Externalize_externalize_graphFetch = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'externalize',
      parameters: [
        {
          _type: 'func',
          function: 'graphFetch',
          parameters: [
            {
              _type: 'func',
              function: 'getAll',
              parameters: [
                {
                  _type: 'packageableElementPtr',
                  fullPath: 'model::TargetPerson',
                },
              ],
            },
            {
              _type: 'classInstance',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              type: 'rootGraphFetchTree',
              value: {
                subTrees: [
                  {
                    _type: 'propertyGraphFetchTree',
                    subTrees: [],
                    subTypeTrees: [],
                    property: 'const',
                    parameters: [],
                  },
                  {
                    _type: 'propertyGraphFetchTree',
                    subTrees: [],
                    subTypeTrees: [],
                    property: 'fullName',
                    parameters: [],
                  },
                ],
                subTypeTrees: [],
                _type: 'rootGraphFetchTree',
                class: 'model::TargetPerson',
              },
            },
          ],
        },
        {
          _type: 'packageableElementPtr',
          fullPath: 'model::SourceBinding',
        },
        {
          _type: 'classInstance',
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          type: 'rootGraphFetchTree',
          value: {
            subTrees: [
              {
                _type: 'propertyGraphFetchTree',
                subTrees: [],
                subTypeTrees: [],
                property: 'const',
                parameters: [],
              },
              {
                _type: 'propertyGraphFetchTree',
                subTrees: [],
                subTypeTrees: [],
                property: 'fullName',
                parameters: [],
              },
            ],
            subTypeTrees: [],
            _type: 'rootGraphFetchTree',
            class: 'model::TargetPerson',
          },
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__lambda_Externalize_externalize_graphFetch_with_different_trees =
  {
    _type: 'lambda',
    body: [
      {
        _type: 'func',
        function: 'externalize',
        parameters: [
          {
            _type: 'func',
            function: 'graphFetch',
            parameters: [
              {
                _type: 'func',
                function: 'getAll',
                parameters: [
                  {
                    _type: 'packageableElementPtr',
                    fullPath: 'model::TargetPerson',
                  },
                ],
              },
              {
                _type: 'classInstance',
                multiplicity: {
                  lowerBound: 1,
                  upperBound: 1,
                },
                type: 'rootGraphFetchTree',
                value: {
                  subTrees: [
                    {
                      _type: 'propertyGraphFetchTree',
                      subTrees: [],
                      subTypeTrees: [],
                      property: 'const',
                      parameters: [],
                    },
                    {
                      _type: 'propertyGraphFetchTree',
                      subTrees: [],
                      subTypeTrees: [],
                      property: 'fullName',
                      parameters: [],
                    },
                    {
                      _type: 'propertyGraphFetchTree',
                      subTrees: [],
                      subTypeTrees: [],
                      property: 'age',
                      parameters: [],
                    },
                  ],
                  subTypeTrees: [],
                  _type: 'rootGraphFetchTree',
                  class: 'model::TargetPerson',
                },
              },
            ],
          },
          {
            _type: 'packageableElementPtr',
            fullPath: 'model::SourceBinding',
          },
          {
            _type: 'classInstance',
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            type: 'rootGraphFetchTree',
            value: {
              subTrees: [
                {
                  _type: 'propertyGraphFetchTree',
                  subTrees: [],
                  subTypeTrees: [],
                  property: 'const',
                  parameters: [],
                },
                {
                  _type: 'propertyGraphFetchTree',
                  subTrees: [],
                  subTypeTrees: [],
                  property: 'age',
                  parameters: [],
                },
              ],
              subTypeTrees: [],
              _type: 'rootGraphFetchTree',
              class: 'model::TargetPerson',
            },
          },
        ],
      },
    ],
    parameters: [],
  };

export const TEST_DATA__lambda_Externalize_externalize_graphFetchChecked = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'externalize',
      parameters: [
        {
          _type: 'func',
          function: 'graphFetchChecked',
          parameters: [
            {
              _type: 'func',
              function: 'getAll',
              parameters: [
                {
                  _type: 'packageableElementPtr',
                  fullPath: 'model::TargetPerson',
                },
              ],
            },
            {
              _type: 'classInstance',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              type: 'rootGraphFetchTree',
              value: {
                subTrees: [
                  {
                    _type: 'propertyGraphFetchTree',
                    subTrees: [],
                    subTypeTrees: [],
                    property: 'const',
                    parameters: [],
                  },
                  {
                    _type: 'propertyGraphFetchTree',
                    subTrees: [],
                    subTypeTrees: [],
                    property: 'fullName',
                    parameters: [],
                  },
                ],
                subTypeTrees: [],
                _type: 'rootGraphFetchTree',
                class: 'model::TargetPerson',
              },
            },
          ],
        },
        {
          _type: 'packageableElementPtr',
          fullPath: 'model::SourceBinding',
        },
        {
          _type: 'classInstance',
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          type: 'rootGraphFetchTree',
          value: {
            subTrees: [
              {
                _type: 'propertyGraphFetchTree',
                subTrees: [],
                subTypeTrees: [],
                property: 'const',
                parameters: [],
              },
              {
                _type: 'propertyGraphFetchTree',
                subTrees: [],
                subTypeTrees: [],
                property: 'fullName',
                parameters: [],
              },
            ],
            subTypeTrees: [],
            _type: 'rootGraphFetchTree',
            class: 'model::TargetPerson',
          },
        },
      ],
    },
  ],
  parameters: [],
};
