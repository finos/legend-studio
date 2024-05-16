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

export const TEST_DATA__simpleProjection = {
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
              fullPath: 'my::Firm',
            },
            {
              _type: 'var',
              name: 'businessDate',
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
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                        {
                          _type: 'strictDate',
                          value: '2023-05-19',
                        },
                      ],
                      property: 'derivedProp',
                    },
                  ],
                  property: 'id',
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
                    {
                      _type: 'enumValue',
                      fullPath: 'my::IncType',
                      value: 'Corp',
                    },
                  ],
                  property: 'enumDerivedProperty',
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
              value: 'Derived Prop/Id',
            },
            {
              _type: 'string',
              value: 'Enum Derived Property',
            },
          ],
        },
      ],
    },
  ],
  parameters: [
    {
      _type: 'var',
      class: 'Date',
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      name: 'businessDate',
    },
    {
      _type: 'var',
      class: 'String',
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      name: 'var_1',
    },
    {
      _type: 'var',
      class: 'StrictDate',
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      name: 'strictDateParam',
    },
  ],
};
