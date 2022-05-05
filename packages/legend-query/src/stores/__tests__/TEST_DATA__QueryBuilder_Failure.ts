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

export const TEST_DATA__errorInGraphLambda = {
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

export const TEST_DATA__malformedFilterExpression = {
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
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA_malformedFilterExpressionWithSubtype = {
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
              function: 'equal',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'subTypes',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                        {
                          _type: 'hackedClass',
                          fullPath:
                            'model::pure::tests::model::simple::PersonExtension',
                        },
                      ],
                    },
                  ],
                  property: 'birthdate',
                },
                {
                  _type: 'strictDate',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  values: ['2022-01-26'],
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

export const TEST_DATA__unsupportedFunction = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'testUnsupported',
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

export const TEST_DATA__unsupportedFunctionWithFullPath = {
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

export const TEST_DATA__misplacedTakeFunction = {
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

export const TEST_DATA__malformedTodayFunction = {
  _type: 'lambda',
  body: [
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
                  fullPath: 'model::postFilter::Person',
                },
              ],
            },
            {
              _type: 'lambda',
              body: [
                {
                  _type: 'func',
                  function: 'isOnDay',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                      property: 'myDateTime',
                    },
                    {
                      _type: 'func',
                      function: 'meta::pure::functions::date::todayyy',
                      parameters: [],
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
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
        },
        {
          _type: 'collection',
          values: [
            {
              _type: 'string',
              values: ['Age'],
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
            },
          ],
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
