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

export const errorInGraphLambda = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'getAll',
      parameters: [
        {
          _type: 'packageableElementPtr',
          fullPath: 'model::pure::tests::model::simple::NotFound',
        },
      ],
    },
  ],
  parameters: [],
};

export const unsupportedGetAllWithOneConditionFilter = {
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
              fullPath: 'model::pure::tests::model::simple::Person',
            },
          ],
        },
        {
          _type: 'lambda',
          body: [
            {
              _type: 'func',
              function: 'testUnSupported',
              parameters: [
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
                {
                  _type: 'string',
                  values: ['testFirstName'],
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
              name: 'x',
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const unsupportedFunction = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'testUnSupported',
      parameters: [
        {
          _type: 'class',
          fullPath: 'model::pure::tests::model::simple::GeographicEntityType',
        },
      ],
    },
  ],
  parameters: [],
};

export const unsupportedFunctionWithFullPath = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'something::getAll',
      parameters: [
        {
          _type: 'packageableElementPtr',
          fullPath: 'model::pure::tests::model::simple::Person',
        },
      ],
    },
  ],
  parameters: [],
};

export const misplacedTakeFunction = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'take',
      parameters: [
        {
          _type: 'func',
          function: 'getAll',
          parameters: [
            {
              _type: 'packageableElementPtr',
              fullPath: 'model::pure::tests::model::simple::Person',
            },
          ],
        },
        {
          _type: 'integer',
          values: [500],
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
        },
      ],
    },
  ],
  parameters: [],
};
