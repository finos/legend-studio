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

export const TEST_DATA__graphFetchWithSerializationConfig = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'serialize',
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
                  fullPath: 'model::Person',
                },
              ],
            },
            {
              _type: 'classInstance',
              type: 'rootGraphFetchTree',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              value: {
                subTrees: [
                  {
                    _type: 'propertyGraphFetchTree',
                    subTrees: [],
                    subTypeTrees: [],
                    property: 'age',
                    parameters: [],
                  },
                  {
                    _type: 'propertyGraphFetchTree',
                    subTrees: [],
                    subTypeTrees: [],
                    property: 'firstName',
                    parameters: [],
                  },
                  {
                    _type: 'propertyGraphFetchTree',
                    subTrees: [],
                    subTypeTrees: [],
                    property: 'lastName',
                    parameters: [],
                  },
                  {
                    _type: 'propertyGraphFetchTree',
                    subTrees: [],
                    subTypeTrees: [],
                    property: 'nickName',
                    parameters: [],
                  },
                  {
                    _type: 'propertyGraphFetchTree',
                    subTrees: [],
                    subTypeTrees: [],
                    property: 'status',
                    parameters: [],
                  },
                ],
                subTypeTrees: [],
                _type: 'rootGraphFetchTree',
                class: 'model::Person',
              },
            },
          ],
        },
        {
          _type: 'classInstance',
          type: 'rootGraphFetchTree',
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          value: {
            subTrees: [
              {
                _type: 'propertyGraphFetchTree',
                subTrees: [],
                subTypeTrees: [],
                property: 'age',
                parameters: [],
              },
              {
                _type: 'propertyGraphFetchTree',
                subTrees: [],
                subTypeTrees: [],
                property: 'firstName',
                parameters: [],
              },
              {
                _type: 'propertyGraphFetchTree',
                subTrees: [],
                subTypeTrees: [],
                property: 'lastName',
                parameters: [],
              },
              {
                _type: 'propertyGraphFetchTree',
                subTrees: [],
                subTypeTrees: [],
                property: 'nickName',
                parameters: [],
              },
              {
                _type: 'propertyGraphFetchTree',
                subTrees: [],
                subTypeTrees: [],
                property: 'status',
                parameters: [],
              },
            ],
            subTypeTrees: [],
            _type: 'rootGraphFetchTree',
            class: 'model::Person',
          },
        },
        {
          _type: 'func',
          function: 'new',
          parameters: [
            {
              _type: 'packageableElementPtr',
              fullPath:
                'meta::pure::graphFetch::execution::AlloySerializationConfig',
            },
            {
              _type: 'string',
              value: '',
            },
            {
              _type: 'collection',
              multiplicity: {
                lowerBound: 8,
                upperBound: 8,
              },
              values: [
                {
                  _type: 'keyExpression',
                  add: false,
                  expression: {
                    _type: 'string',
                    value: 'CustomizeType',
                  },
                  key: {
                    _type: 'string',
                    value: 'typeKeyName',
                  },
                },
                {
                  _type: 'keyExpression',
                  add: false,
                  expression: {
                    _type: 'boolean',
                    value: false,
                  },
                  key: {
                    _type: 'string',
                    value: 'includeType',
                  },
                },
                {
                  _type: 'keyExpression',
                  add: false,
                  expression: {
                    _type: 'boolean',
                    value: false,
                  },
                  key: {
                    _type: 'string',
                    value: 'includeEnumType',
                  },
                },
                {
                  _type: 'keyExpression',
                  add: false,
                  expression: {
                    _type: 'string',
                    value: 'yyyy-mmdd',
                  },
                  key: {
                    _type: 'string',
                    value: 'dateTimeFormat',
                  },
                },
                {
                  _type: 'keyExpression',
                  add: false,
                  expression: {
                    _type: 'boolean',
                    value: true,
                  },
                  key: {
                    _type: 'string',
                    value: 'removePropertiesWithNullValues',
                  },
                },
                {
                  _type: 'keyExpression',
                  add: false,
                  expression: {
                    _type: 'boolean',
                    value: true,
                  },
                  key: {
                    _type: 'string',
                    value: 'removePropertiesWithEmptySets',
                  },
                },
                {
                  _type: 'keyExpression',
                  add: false,
                  expression: {
                    _type: 'boolean',
                    value: true,
                  },
                  key: {
                    _type: 'string',
                    value: 'fullyQualifiedTypePath',
                  },
                },
                {
                  _type: 'keyExpression',
                  add: false,
                  expression: {
                    _type: 'boolean',
                    value: true,
                  },
                  key: {
                    _type: 'string',
                    value: 'includeObjectReference',
                  },
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

export const TEST_DATA__graphFetchWithSerializationConfigWithNullableConfigProperties =
  {
    _type: 'lambda',
    body: [
      {
        _type: 'func',
        function: 'serialize',
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
                    fullPath: 'model::Person',
                  },
                ],
              },
              {
                _type: 'classInstance',
                type: 'rootGraphFetchTree',
                multiplicity: {
                  lowerBound: 1,
                  upperBound: 1,
                },
                value: {
                  subTrees: [
                    {
                      _type: 'propertyGraphFetchTree',
                      subTrees: [],
                      subTypeTrees: [],
                      property: 'age',
                      parameters: [],
                    },
                    {
                      _type: 'propertyGraphFetchTree',
                      subTrees: [],
                      subTypeTrees: [],
                      property: 'firstName',
                      parameters: [],
                    },
                    {
                      _type: 'propertyGraphFetchTree',
                      subTrees: [],
                      subTypeTrees: [],
                      property: 'lastName',
                      parameters: [],
                    },
                    {
                      _type: 'propertyGraphFetchTree',
                      subTrees: [],
                      subTypeTrees: [],
                      property: 'nickName',
                      parameters: [],
                    },
                    {
                      _type: 'propertyGraphFetchTree',
                      subTrees: [],
                      subTypeTrees: [],
                      property: 'status',
                      parameters: [],
                    },
                  ],
                  subTypeTrees: [],
                  _type: 'rootGraphFetchTree',
                  class: 'model::Person',
                },
              },
            ],
          },
          {
            _type: 'classInstance',
            type: 'rootGraphFetchTree',
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            value: {
              subTrees: [
                {
                  _type: 'propertyGraphFetchTree',
                  subTrees: [],
                  subTypeTrees: [],
                  property: 'age',
                  parameters: [],
                },
                {
                  _type: 'propertyGraphFetchTree',
                  subTrees: [],
                  subTypeTrees: [],
                  property: 'firstName',
                  parameters: [],
                },
                {
                  _type: 'propertyGraphFetchTree',
                  subTrees: [],
                  subTypeTrees: [],
                  property: 'lastName',
                  parameters: [],
                },
                {
                  _type: 'propertyGraphFetchTree',
                  subTrees: [],
                  subTypeTrees: [],
                  property: 'nickName',
                  parameters: [],
                },
                {
                  _type: 'propertyGraphFetchTree',
                  subTrees: [],
                  subTypeTrees: [],
                  property: 'status',
                  parameters: [],
                },
              ],
              subTypeTrees: [],
              _type: 'rootGraphFetchTree',
              class: 'model::Person',
            },
          },
          {
            _type: 'func',
            function: 'new',
            parameters: [
              {
                _type: 'packageableElementPtr',
                fullPath:
                  'meta::pure::graphFetch::execution::AlloySerializationConfig',
              },
              {
                _type: 'string',
                value: '',
              },
              {
                _type: 'collection',
                multiplicity: {
                  lowerBound: 1,
                  upperBound: 1,
                },
                values: [
                  {
                    _type: 'keyExpression',
                    add: false,
                    expression: {
                      _type: 'string',
                      value: 'CustomizeType',
                    },
                    key: {
                      _type: 'string',
                      value: 'typeKeyName',
                    },
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
