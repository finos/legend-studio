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

export const TEST_DATA_lambda_watermark_Constant = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'forWatermark',
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
          _type: 'string',
          value: 'watermarkValue',
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA_lambda_watermark_Parameter = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'forWatermark',
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
          _type: 'var',
          name: 'parameterTwo',
        },
      ],
    },
  ],
  parameters: [
    {
      _type: 'var',
      genericType: {
        rawType: {
          _type: 'packageableType',
          fullPath: 'String',
        },
      },
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      name: 'parameterOne',
    },
    {
      _type: 'var',
      genericType: {
        rawType: {
          _type: 'packageableType',
          fullPath: 'String',
        },
      },
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      name: 'parameterTwo',
    },
  ],
};

export const TEST_DATA_lambda_watermark_filter_Constant = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'filter',
      parameters: [
        {
          _type: 'func',
          function: 'forWatermark',
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
              _type: 'string',
              value: 'test',
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
                  value: 'Test',
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

export const TEST_DATA_lambda_watermark_olapGroupBy = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'olapGroupBy',
      parameters: [
        {
          _type: 'func',
          function: 'project',
          parameters: [
            {
              _type: 'func',
              function: 'forWatermark',
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
                  _type: 'string',
                  value: 'test',
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
                      property: 'firstName',
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
                  value: 'First Name',
                },
              ],
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
          _type: 'func',
          function: 'func',
          parameters: [
            {
              _type: 'string',
              value: 'First Name',
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
        {
          _type: 'string',
          value: 'sum First Name',
        },
      ],
    },
  ],
  parameters: [],
};
