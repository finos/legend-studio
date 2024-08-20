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

export const TEST_DATA_QueryExecution_ExecutionInput = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'take',
      parameters: [
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
                      function: 'equal',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [{ _type: 'var', name: 'x' }],
                          property: 'age',
                        },
                        { _type: 'var', name: 'var' },
                      ],
                    },
                  ],
                  parameters: [{ _type: 'var', name: 'x' }],
                },
              ],
            },
            {
              _type: 'collection',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              values: [
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'property',
                      parameters: [{ _type: 'var', name: 'x' }],
                      property: 'age',
                    },
                  ],
                  parameters: [{ _type: 'var', name: 'x' }],
                },
              ],
            },
            {
              _type: 'collection',
              multiplicity: { lowerBound: 1, upperBound: 1 },
              values: [{ _type: 'string', value: 'Age' }],
            },
          ],
        },
        { _type: 'integer', value: 1000 },
      ],
    },
  ],
  parameters: [
    {
      _type: 'var',
      class: 'Integer',
      multiplicity: { lowerBound: 1, upperBound: 1 },
      name: 'var',
    },
  ],
};

export const TEST_DATA_QueryExecution_PreviewData_ExecutionInput = {
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
              fullPath: 'model::Person',
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
                      name: 'x',
                    },
                  ],
                  property: 'age',
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
              _type: 'string',
              value: 'Age',
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA_QueryExecution_MappingAnalysisResult = {
  mappedEntities: [
    {
      path: 'model::Firm',
      properties: [
        { _type: 'entity', entityPath: 'model::Person', name: 'employees' },
        { _type: 'enum', enumPath: 'model::IncType', name: 'incType' },
        { _type: 'MappedProperty', name: 'isApple' },
        { _type: 'MappedProperty', name: 'legalName' },
        { _type: 'MappedProperty', name: 'employeeSizes' },
      ],
    },
    {
      path: 'model::Person',
      properties: [
        { _type: 'MappedProperty', name: 'age' },
        { _type: 'MappedProperty', name: 'firstName' },
        { _type: 'MappedProperty', name: 'lastName' },
        { _type: 'MappedProperty', name: 'fullName' },
      ],
    },
  ],
};
