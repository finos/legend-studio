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

import { expect, test } from '@jest/globals';
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import {
  PRIMITIVE_TYPE,
  V1_Lambda,
  V1_deserializeValueSpecification,
  V1_serializeValueSpecification,
} from '@finos/legend-graph';
import {
  TDSAggregation,
  TDSFilter,
  TDSFilterCondition,
  TDSGroupby,
  TDSRequest,
  TDSSort,
  TDS_AGGREGATION_FUNCTION,
  TDS_FILTER_GROUP,
  TDS_FILTER_OPERATION,
  TDS_SORT_ORDER,
} from '../grid/TDSRequest.js';
import { buildLambdaExpressions } from '../grid/TDSLambdaBuilder.js';

const TEST_DATA__InitialLambda = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'from',
      parameters: [
        {
          _type: 'func',
          function: 'filter',
          parameters: [
            {
              _type: 'classInstance',
              type: '>',
              value: {
                path: ['test::TestDatabase', 'TEST0'],
              },
            },
            {
              _type: 'lambda',
              body: [
                {
                  _type: 'func',
                  function: 'not',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'equal',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'c',
                            },
                          ],
                          property: 'FIRSTNAME',
                        },
                        {
                          _type: 'string',
                          value: 'Doe',
                        },
                      ],
                    },
                  ],
                },
              ],
              parameters: [
                {
                  _type: 'var',
                  name: 'c',
                },
              ],
            },
          ],
        },
        {
          _type: 'func',
          function: 'new',
          parameters: [
            {
              _type: 'packageableElementPtr',
              fullPath: 'meta::pure::mapping::Mapping',
            },
            {
              _type: 'string',
              value: '',
            },
            {
              _type: 'collection',
              multiplicity: {
                lowerBound: 0,
                upperBound: 0,
              },
              values: [],
            },
          ],
        },
        {
          _type: 'packageableElementPtr',
          fullPath: 'test::test',
        },
      ],
    },
  ],
  parameters: [],
};

const TEST_DATA__SortLambda = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'sort',
      parameters: [
        {
          _type: 'func',
          function: 'from',
          parameters: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'classInstance',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  type: '>',
                  value: {
                    path: ['test::TestDatabase', 'TEST0'],
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'not',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'c',
                                },
                              ],
                              property: 'FIRSTNAME',
                            },
                            {
                              _type: 'string',
                              value: 'Doe',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'c',
                    },
                  ],
                },
              ],
            },
            {
              _type: 'func',
              function: 'new',
              parameters: [
                {
                  _type: 'packageableElementPtr',
                  fullPath: 'meta::pure::mapping::Mapping',
                },
                {
                  _type: 'string',
                  value: '',
                },
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 0,
                    upperBound: 0,
                  },
                  values: [],
                },
              ],
            },
            {
              _type: 'packageableElementPtr',
              fullPath: 'test::test',
            },
          ],
        },
        {
          _type: 'collection',
          multiplicity: {
            lowerBound: 1,
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
                    name: 'FIRSTNAME',
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

const TEST_DATA__FilterLambda = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'filter',
      parameters: [
        {
          _type: 'func',
          function: 'from',
          parameters: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'classInstance',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  type: '>',
                  value: {
                    path: ['test::TestDatabase', 'TEST0'],
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'not',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'c',
                                },
                              ],
                              property: 'FIRSTNAME',
                            },
                            {
                              _type: 'string',
                              value: 'Doe',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'c',
                    },
                  ],
                },
              ],
            },
            {
              _type: 'func',
              function: 'new',
              parameters: [
                {
                  _type: 'packageableElementPtr',
                  fullPath: 'meta::pure::mapping::Mapping',
                },
                {
                  _type: 'string',
                  value: '',
                },
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 0,
                    upperBound: 0,
                  },
                  values: [],
                },
              ],
            },
            {
              _type: 'packageableElementPtr',
              fullPath: 'test::test',
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
                  class: 'String',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'x',
                    },
                  ],
                  property: 'LASTNAME',
                },
                {
                  _type: 'string',
                  value: 'Doe',
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

const TEST_DATA__GroupFilterLambda = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'filter',
      parameters: [
        {
          _type: 'func',
          function: 'from',
          parameters: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'classInstance',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  type: '>',
                  value: {
                    path: ['test::TestDatabase', 'TEST0'],
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'not',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'c',
                                },
                              ],
                              property: 'FIRSTNAME',
                            },
                            {
                              _type: 'string',
                              value: 'Doe',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'c',
                    },
                  ],
                },
              ],
            },
            {
              _type: 'func',
              function: 'new',
              parameters: [
                {
                  _type: 'packageableElementPtr',
                  fullPath: 'meta::pure::mapping::Mapping',
                },
                {
                  _type: 'string',
                  value: '',
                },
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 0,
                    upperBound: 0,
                  },
                  values: [],
                },
              ],
            },
            {
              _type: 'packageableElementPtr',
              fullPath: 'test::test',
            },
          ],
        },
        {
          _type: 'lambda',
          body: [
            {
              _type: 'func',
              function: 'and',
              parameters: [
                {
                  _type: 'func',
                  function: 'equal',
                  parameters: [
                    {
                      _type: 'property',
                      class: 'String',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                      property: 'LASTNAME',
                    },
                    {
                      _type: 'string',
                      value: 'Doe',
                    },
                  ],
                },
                {
                  _type: 'func',
                  function: 'equal',
                  parameters: [
                    {
                      _type: 'property',
                      class: 'String',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                      property: 'LASTNAME',
                    },
                    {
                      _type: 'string',
                      value: 'Smith',
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

export const TEST_DATA__GroupByLambda = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'groupBy',
      parameters: [
        {
          _type: 'func',
          function: 'from',
          parameters: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'classInstance',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  type: '>',
                  value: {
                    path: ['test::TestDatabase', 'TEST0'],
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'not',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'c',
                                },
                              ],
                              property: 'FIRSTNAME',
                            },
                            {
                              _type: 'string',
                              value: 'Doe',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'c',
                    },
                  ],
                },
              ],
            },
            {
              _type: 'func',
              function: 'new',
              parameters: [
                {
                  _type: 'packageableElementPtr',
                  fullPath: 'meta::pure::mapping::Mapping',
                },
                {
                  _type: 'string',
                  value: '',
                },
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 0,
                    upperBound: 0,
                  },
                  values: [],
                },
              ],
            },
            {
              _type: 'packageableElementPtr',
              fullPath: 'test::test',
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
                name: 'FIRSTNAME',
              },
            ],
          },
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
                      class: 'String',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                      property: 'FIRSTNAME',
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'x',
                    },
                  ],
                },
                function2: {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'count',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'agg',
                        },
                      ],
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'agg',
                    },
                  ],
                },
                name: 'count',
              },
            ],
          },
        },
      ],
    },
  ],
  parameters: [],
};

const TEST_DATA__ExpandRowGroupLambda = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'filter',
      parameters: [
        {
          _type: 'func',
          function: 'from',
          parameters: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'classInstance',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  type: '>',
                  value: {
                    path: ['test::TestDatabase', 'TEST0'],
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'not',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'c',
                                },
                              ],
                              property: 'FIRSTNAME',
                            },
                            {
                              _type: 'string',
                              value: 'Doe',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'c',
                    },
                  ],
                },
              ],
            },
            {
              _type: 'func',
              function: 'new',
              parameters: [
                {
                  _type: 'packageableElementPtr',
                  fullPath: 'meta::pure::mapping::Mapping',
                },
                {
                  _type: 'string',
                  value: '',
                },
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 0,
                    upperBound: 0,
                  },
                  values: [],
                },
              ],
            },
            {
              _type: 'packageableElementPtr',
              fullPath: 'test::test',
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
                  class: 'String',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'x',
                    },
                  ],
                  property: 'FIRSTNAME',
                },
                {
                  _type: 'string',
                  value: 'John',
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

const TEST_DATA__AggregationLambda = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'groupBy',
      parameters: [
        {
          _type: 'func',
          function: 'from',
          parameters: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'classInstance',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  type: '>',
                  value: {
                    path: ['test::TestDatabase', 'TEST0'],
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'not',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'c',
                                },
                              ],
                              property: 'FIRSTNAME',
                            },
                            {
                              _type: 'string',
                              value: 'Doe',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'c',
                    },
                  ],
                },
              ],
            },
            {
              _type: 'func',
              function: 'new',
              parameters: [
                {
                  _type: 'packageableElementPtr',
                  fullPath: 'meta::pure::mapping::Mapping',
                },
                {
                  _type: 'string',
                  value: '',
                },
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 0,
                    upperBound: 0,
                  },
                  values: [],
                },
              ],
            },
            {
              _type: 'packageableElementPtr',
              fullPath: 'test::test',
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
                name: 'FIRSTNAME',
              },
            ],
          },
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
                      class: 'String',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                      property: 'LASTNAME',
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'x',
                    },
                  ],
                },
                function2: {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'count',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'agg',
                        },
                      ],
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'agg',
                    },
                  ],
                },
                name: 'LASTNAME',
              },
            ],
          },
        },
      ],
    },
  ],
  parameters: [],
};

const TEST_DATA__SliceLambda = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'from',
      parameters: [
        {
          _type: 'func',
          function: 'slice',
          parameters: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'classInstance',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  type: '>',
                  value: {
                    path: ['test::TestDatabase', 'TEST0'],
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'not',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'c',
                                },
                              ],
                              property: 'FIRSTNAME',
                            },
                            {
                              _type: 'string',
                              value: 'Doe',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'c',
                    },
                  ],
                },
              ],
            },
            {
              _type: 'integer',
              value: 0,
            },
            {
              _type: 'integer',
              value: 100,
            },
          ],
        },
        {
          _type: 'func',
          function: 'new',
          parameters: [
            {
              _type: 'packageableElementPtr',
              fullPath: 'meta::pure::mapping::Mapping',
            },
            {
              _type: 'string',
              value: '',
            },
            {
              _type: 'collection',
              multiplicity: {
                lowerBound: 0,
                upperBound: 0,
              },
              values: [],
            },
          ],
        },
        {
          _type: 'packageableElementPtr',
          fullPath: 'test::test',
        },
      ],
    },
  ],
  parameters: [],
};

test(unitTest('TDS lambda having sort function'), () => {
  const lambda = guaranteeType(
    V1_deserializeValueSpecification(TEST_DATA__InitialLambda, []),
    V1_Lambda,
  );
  const request = new TDSRequest([], [], [], new TDSGroupby([], [], []));
  request.sort.push(new TDSSort('FIRSTNAME', TDS_SORT_ORDER.ASCENDING));

  const sortLambda = buildLambdaExpressions(
    guaranteeNonNullable(lambda.body[0]),
    request,
    false,
  );
  const sortLambdaJson = V1_serializeValueSpecification(sortLambda, []);
  expect(sortLambdaJson).toEqual(TEST_DATA__SortLambda);
});

test(unitTest('TDS lambda having filter function'), () => {
  const lambda = guaranteeType(
    V1_deserializeValueSpecification(TEST_DATA__InitialLambda, []),
    V1_Lambda,
  );
  const request = new TDSRequest([], [], [], new TDSGroupby([], [], []));

  // single filter
  request.filter.push(
    new TDSFilter(
      'LASTNAME',
      PRIMITIVE_TYPE.STRING,
      [new TDSFilterCondition(TDS_FILTER_OPERATION.EQUALS, 'Doe')],
      TDS_FILTER_GROUP.AND,
    ),
  );
  const filterLambda = buildLambdaExpressions(
    guaranteeNonNullable(lambda.body[0]),
    request,
    false,
  );
  const filterLambdaJson = V1_serializeValueSpecification(filterLambda, []);
  expect(filterLambdaJson).toEqual(TEST_DATA__FilterLambda);

  // group filter
  request.filter[0]?.conditions.push(
    new TDSFilterCondition(TDS_FILTER_OPERATION.EQUALS, 'Smith'),
  );
  const groupFilterLambda = buildLambdaExpressions(
    guaranteeNonNullable(lambda.body[0]),
    request,
    false,
  );
  const groupFilterLambdaJson = V1_serializeValueSpecification(
    groupFilterLambda,
    [],
  );
  expect(groupFilterLambdaJson).toEqual(TEST_DATA__GroupFilterLambda);
});

test(unitTest('TDS lambda having groupBy'), () => {
  const lambda = guaranteeType(
    V1_deserializeValueSpecification(TEST_DATA__InitialLambda, []),
    V1_Lambda,
  );
  const request = new TDSRequest([], [], [], new TDSGroupby([], [], []));

  // groupBy on FIRSTNAME
  request.groupBy.columns = ['FIRSTNAME'];
  const groupByLambda = buildLambdaExpressions(
    guaranteeNonNullable(lambda.body[0]),
    request,
    false,
  );
  const groupByLambdaJson = V1_serializeValueSpecification(groupByLambda, []);
  expect(groupByLambdaJson).toEqual(TEST_DATA__GroupByLambda);

  // expand row group on FIRSTNAME where it's value is John
  request.groupBy.groupKeys = ['John'];
  const expandLambda = buildLambdaExpressions(
    guaranteeNonNullable(lambda.body[0]),
    request,
    false,
  );
  const expandLambdaJson = V1_serializeValueSpecification(expandLambda, []);
  expect(expandLambdaJson).toEqual(TEST_DATA__ExpandRowGroupLambda);
});

test(unitTest('TDS lambda having groupBy with aggregations'), () => {
  const lambda = guaranteeType(
    V1_deserializeValueSpecification(TEST_DATA__InitialLambda, []),
    V1_Lambda,
  );
  const request = new TDSRequest([], [], [], new TDSGroupby([], [], []));

  // groupBy on FIRSTNAME and aggregation on LASTNAME
  request.groupBy.columns = ['FIRSTNAME'];
  request.groupBy.aggregations.push(
    new TDSAggregation(
      'LASTNAME',
      PRIMITIVE_TYPE.STRING,
      TDS_AGGREGATION_FUNCTION.COUNT,
    ),
  );
  const aggLambda = buildLambdaExpressions(
    guaranteeNonNullable(lambda.body[0]),
    request,
    false,
  );
  const aggLambdaJson = V1_serializeValueSpecification(aggLambda, []);
  expect(aggLambdaJson).toEqual(TEST_DATA__AggregationLambda);
});

test(unitTest('TDS lambda having slice function'), () => {
  const lambda = guaranteeType(
    V1_deserializeValueSpecification(TEST_DATA__InitialLambda, []),
    V1_Lambda,
  );
  const request = new TDSRequest(
    [],
    [],
    [],
    new TDSGroupby([], [], []),
    0,
    100,
  );

  const sliceLambda = buildLambdaExpressions(
    guaranteeNonNullable(lambda.body[0]),
    request,
    true,
  );
  const sliceLambdaJson = V1_serializeValueSpecification(sliceLambda, []);
  expect(sliceLambdaJson).toEqual(TEST_DATA__SliceLambda);
});
