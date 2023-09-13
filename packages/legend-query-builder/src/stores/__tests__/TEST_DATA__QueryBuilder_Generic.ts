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

import { DEFAULT_LIMIT } from '../QueryBuilderResultState.js';

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
              fullPath: 'model::pure::tests::model::simple::Person',
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
                  property: 'firstName',
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
            {
              _type: 'lambda',
              body: [
                {
                  _type: 'property',
                  property: 'lastName',
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
          multiplicity: {
            lowerBound: 2,
            upperBound: 2,
          },
        },
        {
          _type: 'collection',
          values: [
            {
              _type: 'string',
              value: 'Edited First Name',
            },
            {
              _type: 'string',
              value: 'Last Name',
            },
          ],
          multiplicity: {
            lowerBound: 2,
            upperBound: 2,
          },
        },
      ],
    },
  ],
  parameters: [
    {
      _type: 'var',
      class: 'String',
      multiplicity: { lowerBound: 0, upperBound: 1 },
      name: 'var_1',
    },
  ],
};

export const TEST_DATA__simpleProjectionWithPreviewLimit = {
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
              function: 'getAll',
              parameters: [
                {
                  _type: 'packageableElementPtr',
                  fullPath: 'model::pure::tests::model::simple::Person',
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
                      property: 'firstName',
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
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'property',
                      property: 'lastName',
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
              multiplicity: {
                lowerBound: 2,
                upperBound: 2,
              },
            },
            {
              _type: 'collection',
              values: [
                {
                  _type: 'string',
                  value: 'Edited First Name',
                },
                {
                  _type: 'string',
                  value: 'Last Name',
                },
              ],
              multiplicity: {
                lowerBound: 2,
                upperBound: 2,
              },
            },
          ],
        },
        {
          _type: 'integer',
          value: DEFAULT_LIMIT,
        },
      ],
    },
  ],
  parameters: [
    {
      _type: 'var',
      class: 'String',
      multiplicity: { lowerBound: 0, upperBound: 1 },
      name: 'var_1',
    },
  ],
};

export const TEST_DATA__simpleProjectionWithOutPreviewLimit = {
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
              fullPath: 'model::pure::tests::model::simple::Person',
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
                  property: 'firstName',
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
            {
              _type: 'lambda',
              body: [
                {
                  _type: 'property',
                  property: 'lastName',
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
          multiplicity: {
            lowerBound: 2,
            upperBound: 2,
          },
        },
        {
          _type: 'collection',
          values: [
            {
              _type: 'string',
              value: 'Edited First Name',
            },
            {
              _type: 'string',
              value: 'Last Name',
            },
          ],
          multiplicity: {
            lowerBound: 2,
            upperBound: 2,
          },
        },
      ],
    },
  ],
  parameters: [
    {
      _type: 'var',
      class: 'String',
      multiplicity: { lowerBound: 0, upperBound: 1 },
      name: 'var_1',
    },
  ],
};

export const TEST_DATA_projectionWithWindowFunction = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'olapGroupBy',
      parameters: [
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
                  function: 'getAll',
                  parameters: [
                    {
                      _type: 'packageableElementPtr',
                      fullPath: 'model::pure::tests::model::simple::Person',
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
                  value: 'Age',
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
              value: 'sum Age',
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
              value: 'sum Age',
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
          value: 'sum sum Age',
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA_projectionWithInvalidWindowFunction = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'olapGroupBy',
      parameters: [
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
                  function: 'getAll',
                  parameters: [
                    {
                      _type: 'packageableElementPtr',
                      fullPath: 'model::pure::tests::model::simple::Person',
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
                  value: 'Age',
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
              value: 'sum Age',
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
          _type: 'string',
          value: 'sum sum Age',
        },
        {
          _type: 'func',
          function: 'func',
          parameters: [
            {
              _type: 'string',
              value: 'sum Age',
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
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__simpleProjectionWithSubtype = {
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
              fullPath: 'model::pure::tests::model::simple::Person',
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
                      _type: 'func',
                      function: 'subType',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                        {
                          _type: 'genericTypeInstance',
                          fullPath: 'model::pure::tests::model::simple::Person',
                        },
                      ],
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
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
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
              _type: 'string',
              value: 'First Name',
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA_simpleProjectionWithCustomDate = {
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
                  fullPath: 'model::pure::tests::model::simple::Account',
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
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                      property: 'createDate',
                    },
                    {
                      _type: 'func',
                      function: 'meta::pure::functions::date::adjust',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'previousDayOfWeek',
                          parameters: [
                            {
                              _type: 'enumValue',
                              fullPath:
                                'meta::pure::functions::date::DayOfWeek',
                              value: 'Friday',
                            },
                          ],
                        },
                        {
                          _type: 'func',
                          function: 'meta::pure::functions::math::minus',
                          parameters: [
                            {
                              _type: 'integer',
                              value: 2,
                            },
                          ],
                        },
                        {
                          _type: 'enumValue',
                          fullPath: 'meta::pure::functions::date::DurationUnit',
                          value: 'DAYS',
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
                  property: 'name',
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
              value: 'Name',
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__simpleFromFunction = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'from',
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
                  fullPath: 'model::pure::tests::model::simple::Person',
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
                lowerBound: 2,
                upperBound: 2,
              },
              values: [
                {
                  _type: 'string',
                  value: 'Age',
                },
                {
                  _type: 'string',
                  value: 'First Name',
                },
              ],
            },
          ],
        },
        {
          _type: 'packageableElementPtr',
          fullPath: 'model::relational::tests::simpleRelationalMapping',
        },
        {
          _type: 'packageableElementPtr',
          fullPath: 'model::MyRuntime',
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__projectionWithChainedProperty = {
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
              fullPath: 'model::pure::tests::model::simple::Person',
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
                  property: 'legalName',
                  parameters: [
                    {
                      _type: 'property',
                      property: 'firm',
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
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
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
              _type: 'string',
              value: 'Firm/Legal Name',
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__projectWithDerivedProperty = {
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
              fullPath: 'model::pure::tests::model::simple::Person',
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
                  property: 'nameWithTitle',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'x',
                    },
                    {
                      _type: 'string',
                      value: 'Mr.',
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
            lowerBound: 1,
            upperBound: 1,
          },
          values: [
            {
              _type: 'string',
              value: 'Full Name With Title',
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__projectionWithResultSetModifiers = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'take',
      parameters: [
        {
          _type: 'func',
          function: 'sort',
          parameters: [
            {
              _type: 'func',
              function: 'distinct',
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
                          fullPath: 'model::pure::tests::model::simple::Person',
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
                              property: 'firstName',
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
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'property',
                              property: 'lastName',
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
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'property',
                              property: 'legalName',
                              parameters: [
                                {
                                  _type: 'property',
                                  property: 'firm',
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
                      multiplicity: {
                        lowerBound: 3,
                        upperBound: 3,
                      },
                    },
                    {
                      _type: 'collection',
                      values: [
                        {
                          _type: 'string',
                          value: 'Edited First Name',
                        },
                        {
                          _type: 'string',
                          value: 'Last Name',
                        },
                        {
                          _type: 'string',
                          value: 'Firm/Legal Name',
                        },
                      ],
                      multiplicity: {
                        lowerBound: 3,
                        upperBound: 3,
                      },
                    },
                  ],
                },
              ],
            },
            {
              _type: 'collection',
              values: [
                {
                  _type: 'func',
                  function: 'asc',
                  parameters: [
                    {
                      _type: 'string',
                      value: 'Edited First Name',
                    },
                  ],
                },
                {
                  _type: 'func',
                  function: 'desc',
                  parameters: [
                    {
                      _type: 'string',
                      value: 'Firm/Legal Name',
                    },
                  ],
                },
              ],
              multiplicity: {
                lowerBound: 2,
                upperBound: 2,
              },
            },
          ],
        },
        {
          _type: 'integer',
          value: 500,
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__getAllWithOneConditionFilter = {
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
                  value: 'testFirstName',
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

export const TEST_DATA__getAllWithOneIntegerConditionFilter = {
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
                      _type: 'var',
                      name: 'x',
                    },
                  ],
                  property: 'age',
                },
                {
                  _type: 'integer',
                  value: 0,
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

export const TEST_DATA__getAllWithOneIntegerIsInConditionFilter = {
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
              function: 'in',
              parameters: [
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
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  values: [
                    {
                      _type: 'integer',
                      value: 1,
                    },
                    {
                      _type: 'integer',
                      value: 2,
                    },
                    {
                      _type: 'integer',
                      value: 3,
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

export const TEST_DATA_getAllWithOneFloatConditionFilter = {
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
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                      property: 'firm',
                    },
                  ],
                  property: 'averageEmployeesAge',
                },
                {
                  _type: 'float',
                  value: 0,
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

export const TEST_DATA__filterQueryWithSubtypeWithoutExists = {
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
                      function: 'subType',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                        {
                          _type: 'genericTypeInstance',
                          fullPath:
                            'model::pure::tests::model::simple::PersonExtension',
                        },
                      ],
                    },
                  ],
                  property: 'birthdate',
                },
                {
                  _type: 'dateTime',
                  value: '2022-01-26',
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

export const TEST_DATA__filterQueryWithSubtypeWithExists = {
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
              function: 'exists',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'subType',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
                            },
                          ],
                          property: 'firm',
                        },
                        {
                          _type: 'genericTypeInstance',
                          fullPath:
                            'model::pure::tests::model::simple::FirmExtension',
                        },
                      ],
                    },
                  ],
                  property: 'employeesExt',
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
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'x_1',
                                },
                              ],
                              property: 'address',
                            },
                          ],
                          property: 'comments',
                        },
                        {
                          _type: 'string',
                          value: '',
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

export const TEST_DATA__filterQueryWithSubtypeWithExistsChain = {
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
              function: 'exists',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'subType',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
                            },
                          ],
                          property: 'firm',
                        },
                        {
                          _type: 'genericTypeInstance',
                          fullPath:
                            'model::pure::tests::model::simple::FirmExtension',
                        },
                      ],
                    },
                  ],
                  property: 'employeesExt',
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
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'x_1',
                                },
                              ],
                              property: 'manager',
                            },
                          ],
                          property: 'locations',
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
                                      _type: 'var',
                                      name: 'x_2',
                                    },
                                  ],
                                  property: 'place',
                                },
                                {
                                  _type: 'string',
                                  value: '',
                                },
                              ],
                            },
                          ],
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x_2',
                            },
                          ],
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

export const TEST_DATA__getAllWithGroupedFilter = {
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
              function: 'or',
              parameters: [
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
                      value: 'firstNameTest',
                    },
                  ],
                },
                {
                  _type: 'func',
                  function: 'equal',
                  parameters: [
                    {
                      _type: 'property',
                      property: 'lastName',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                    },
                    {
                      _type: 'string',
                      value: 'lastNameTest',
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

export const TEST_DATA__fullComplexProjectionQuery = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'take',
      parameters: [
        {
          _type: 'func',
          function: 'sort',
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
                          fullPath: 'model::pure::tests::model::simple::Person',
                        },
                      ],
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'or',
                          parameters: [
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
                                  value: 'testFirstName',
                                },
                              ],
                            },
                            {
                              _type: 'func',
                              function: 'equal',
                              parameters: [
                                {
                                  _type: 'property',
                                  property: 'lastName',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'x',
                                    },
                                  ],
                                },
                                {
                                  _type: 'string',
                                  value: 'testLastName',
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
                {
                  _type: 'collection',
                  values: [
                    {
                      _type: 'lambda',
                      body: [
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
                          property: 'lastName',
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
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          property: 'nameWithTitle',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
                            },
                            {
                              _type: 'string',
                              value: 'Mr.',
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
                    lowerBound: 3,
                    upperBound: 3,
                  },
                },
                {
                  _type: 'collection',
                  values: [
                    {
                      _type: 'string',
                      value: 'First Name',
                    },
                    {
                      _type: 'string',
                      value: 'Last Name',
                    },
                    {
                      _type: 'string',
                      value: 'Name With Title',
                    },
                  ],
                  multiplicity: {
                    lowerBound: 3,
                    upperBound: 3,
                  },
                },
              ],
            },
            {
              _type: 'collection',
              values: [
                {
                  _type: 'func',
                  function: 'asc',
                  parameters: [
                    {
                      _type: 'string',
                      value: 'First Name',
                    },
                  ],
                },
                {
                  _type: 'func',
                  function: 'desc',
                  parameters: [
                    {
                      _type: 'string',
                      value: 'Last Name',
                    },
                  ],
                },
                {
                  _type: 'func',
                  function: 'asc',
                  parameters: [
                    {
                      _type: 'string',
                      value: 'Name With Title',
                    },
                  ],
                },
              ],
              multiplicity: {
                lowerBound: 3,
                upperBound: 3,
              },
            },
          ],
        },
        {
          _type: 'integer',
          value: 5,
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__simpleGraphFetch = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'serialize',
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
                  fullPath: 'model::target::NPerson',
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
                _type: 'rootGraphFetchTree',
                class: 'model::target::NPerson',
                subTrees: [
                  {
                    _type: 'propertyGraphFetchTree',
                    parameters: [],
                    property: 'fullName',
                    subTrees: [],
                    subTypeTrees: [],
                  },
                ],
                subTypeTrees: [],
              },
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
            _type: 'rootGraphFetchTree',
            class: 'model::target::NPerson',
            subTrees: [
              {
                _type: 'propertyGraphFetchTree',
                parameters: [],
                property: 'fullName',
                subTrees: [],
                subTypeTrees: [],
              },
            ],
            subTypeTrees: [],
          },
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__complexGraphFetch = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'serialize',
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
                  fullPath: 'model::target::NFirm',
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
                _type: 'rootGraphFetchTree',
                class: 'model::target::NFirm',
                subTrees: [
                  {
                    _type: 'propertyGraphFetchTree',
                    parameters: [],
                    property: 'nEmployees',
                    subTrees: [
                      {
                        _type: 'propertyGraphFetchTree',
                        parameters: [],
                        property: 'fullName',
                        subTrees: [],
                        subTypeTrees: [],
                      },
                    ],
                    subTypeTrees: [],
                  },
                  {
                    _type: 'propertyGraphFetchTree',
                    parameters: [],
                    property: 'incType',
                    subTrees: [],
                    subTypeTrees: [],
                  },
                  {
                    _type: 'propertyGraphFetchTree',
                    parameters: [],
                    property: 'name',
                    subTrees: [],
                    subTypeTrees: [],
                  },
                ],
                subTypeTrees: [],
              },
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
            _type: 'rootGraphFetchTree',
            class: 'model::target::NFirm',
            subTrees: [
              {
                _type: 'propertyGraphFetchTree',
                parameters: [],
                property: 'nEmployees',
                subTrees: [
                  {
                    _type: 'propertyGraphFetchTree',
                    parameters: [],
                    property: 'fullName',
                    subTrees: [],
                    subTypeTrees: [],
                  },
                ],
                subTypeTrees: [],
              },
              {
                _type: 'propertyGraphFetchTree',
                parameters: [],
                property: 'incType',
                subTrees: [],
                subTypeTrees: [],
              },
              {
                _type: 'propertyGraphFetchTree',
                parameters: [],
                property: 'name',
                subTrees: [],
                subTypeTrees: [],
              },
            ],
            subTypeTrees: [],
          },
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__graphFetchWithDerivedProperty = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'serialize',
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
                  fullPath: 'model::target::NFirm',
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
                _type: 'rootGraphFetchTree',
                class: 'model::target::NFirm',
                subTrees: [
                  {
                    _type: 'propertyGraphFetchTree',
                    parameters: [],
                    property: 'firstEmployee',
                    subTrees: [
                      {
                        _type: 'propertyGraphFetchTree',
                        parameters: [],
                        property: 'age',
                        subTrees: [],
                        subTypeTrees: [],
                      },
                      {
                        _type: 'propertyGraphFetchTree',
                        parameters: [],
                        property: 'fullName',
                        subTrees: [],
                        subTypeTrees: [],
                      },
                    ],
                    subTypeTrees: [],
                  },
                ],
                subTypeTrees: [],
              },
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
            _type: 'rootGraphFetchTree',
            class: 'model::target::NFirm',
            subTrees: [
              {
                _type: 'propertyGraphFetchTree',
                parameters: [],
                property: 'firstEmployee',
                subTrees: [
                  {
                    _type: 'propertyGraphFetchTree',
                    parameters: [],
                    property: 'age',
                    subTrees: [],
                    subTypeTrees: [],
                  },
                  {
                    _type: 'propertyGraphFetchTree',
                    parameters: [],
                    property: 'fullName',
                    subTrees: [],
                    subTypeTrees: [],
                  },
                ],
                subTypeTrees: [],
              },
            ],
            subTypeTrees: [],
          },
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__graphFetchWithDerivedPropertyAndParameter = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'serialize',
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
                  fullPath: 'model::target::NFirm',
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
                _type: 'rootGraphFetchTree',
                class: 'model::target::NFirm',
                subTrees: [
                  {
                    _type: 'propertyGraphFetchTree',
                    parameters: [
                      {
                        _type: 'string',
                        value: 'My name is',
                      },
                      {
                        _type: 'string',
                        value: '.',
                      },
                    ],
                    property: 'myName',
                    subTrees: [],
                    subTypeTrees: [],
                  },
                ],
                subTypeTrees: [],
              },
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
            _type: 'rootGraphFetchTree',
            class: 'model::target::NFirm',
            subTrees: [
              {
                _type: 'propertyGraphFetchTree',
                parameters: [
                  {
                    _type: 'string',
                    value: 'My name is',
                  },
                  {
                    _type: 'string',
                    value: '.',
                  },
                ],
                property: 'myName',
                subTrees: [],
                subTypeTrees: [],
              },
            ],
            subTypeTrees: [],
          },
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__graphFetchWithSubtype = {
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
                  fullPath: 'model::target::NFirm',
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
                _type: 'rootGraphFetchTree',
                class: 'model::target::NFirm',
                subTrees: [
                  {
                    _type: 'propertyGraphFetchTree',
                    parameters: [],
                    property: 'nEmployees',
                    subTrees: [
                      {
                        _type: 'propertyGraphFetchTree',
                        parameters: [],
                        property: 'fullAddress',
                        subTrees: [],
                        subTypeTrees: [],
                      },
                    ],
                    subTypeTrees: [],
                    subType: 'model::target::NDeveloper',
                  },
                ],
                subTypeTrees: [],
              },
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
            _type: 'rootGraphFetchTree',
            class: 'model::target::NFirm',
            subTrees: [
              {
                _type: 'propertyGraphFetchTree',
                parameters: [],
                property: 'nEmployees',
                subTrees: [
                  {
                    _type: 'propertyGraphFetchTree',
                    parameters: [],
                    property: 'fullAddress',
                    subTrees: [],
                    subTypeTrees: [],
                  },
                ],
                subTypeTrees: [],
                subType: 'model::target::NDeveloper',
              },
            ],
            subTypeTrees: [],
          },
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__simpleProjectionWithSubtypeFromSubtypeModel = {
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
              fullPath: 'model::LegalEntity',
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
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'subType',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
                            },
                            {
                              _type: 'genericTypeInstance',
                              fullPath: 'model::Firm',
                            },
                          ],
                        },
                      ],
                      property: 'employees',
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
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
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
              _type: 'string',
              value: 'First Name',
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__simpeDateParameters = (
  paramType: string,
): { parameters?: object; body?: object; _type: string } => ({
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
              function: 'getAll',
              parameters: [
                {
                  _type: 'packageableElementPtr',
                  fullPath: 'model::pure::tests::model::simple::Person',
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
        {
          _type: 'integer',
          value: 1000,
        },
      ],
    },
  ],
  parameters: [
    {
      _type: 'var',
      class: paramType,
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      name: 'var_1',
    },
  ],
});

export const TEST_DATA__simpleProjectionWithConstantsAndParameters = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'letFunction',
      parameters: [
        {
          _type: 'string',
          value: 'c1',
        },
        {
          _type: 'string',
          value: 'value1',
        },
      ],
    },
    {
      _type: 'func',
      function: 'letFunction',
      parameters: [
        {
          _type: 'string',
          value: 'complex',
        },
        {
          _type: 'func',
          function: 'if',
          parameters: [
            {
              _type: 'boolean',
              value: true,
            },
            {
              _type: 'lambda',
              body: [
                {
                  _type: 'integer',
                  value: 1,
                },
              ],
              parameters: [],
            },
            {
              _type: 'lambda',
              body: [
                {
                  _type: 'integer',
                  value: 2,
                },
              ],
              parameters: [],
            },
          ],
        },
      ],
    },
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
              fullPath: 'model::pure::tests::model::simple::Person',
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
              value: 'Edited First Name',
            },
            {
              _type: 'string',
              value: 'Last Name',
            },
          ],
        },
      ],
    },
  ],
  parameters: [
    {
      _type: 'var',
      class: 'String',
      multiplicity: {
        lowerBound: 0,
        upperBound: 1,
      },
      name: 'var_1',
    },
  ],
};

export const TEST_DATA__simpeDateParametersForUnsupportedQuery = {
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
              fullPath: 'model::pure::tests::model::simple::Person',
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
              function: 'col',
              parameters: [
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
                {
                  _type: 'string',
                  value: 'Age',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  parameters: [
    {
      _type: 'var',
      class: 'StrictDate',
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      name: 'var_1',
    },
  ],
};

export const TEST_DATA__simpeFilterWithMilestonedExists = {
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
              fullPath: 'model::Firm',
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
                    {
                      _type: 'var',
                      name: 'businessDate',
                    },
                  ],
                  property: 'address',
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
                              _type: 'var',
                              name: 'x_1',
                            },
                          ],
                          property: 'pincode',
                        },
                        {
                          _type: 'decimal',
                          value: 0,
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
  ],
};

export const TEST_DATA__simpleFilterWithDateTimeWithSeconds = {
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
              fullPath: 'model::pure::tests::model::simple::Order',
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
                      _type: 'var',
                      name: 'x',
                    },
                  ],
                  property: 'settlementDateTime',
                },
                {
                  _type: 'dateTime',
                  value: '2023-09-09T13:31:00',
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

export const TEST_DATA__simplePostFilterWithDateTimeWithSeconds = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'filter',
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
                  fullPath: 'model::pure::tests::model::simple::Order',
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
                      property: 'settlementDateTime',
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
                  value: 'Settlement Date Time',
                },
              ],
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
                      _type: 'var',
                      name: 'row',
                    },
                    {
                      _type: 'string',
                      value: 'Settlement Date Time',
                    },
                  ],
                  property: 'getDateTime',
                },
                {
                  _type: 'dateTime',
                  value: '2023-09-09T16:06:10',
                },
              ],
            },
          ],
          parameters: [
            {
              _type: 'var',
              name: 'row',
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};
