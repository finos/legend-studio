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

import { describe, test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { Class, RawLambda } from '@finos/legend-graph';
import type { Entity } from '@finos/legend-storage';
import { TEST__setUpQueryBuilderState } from '../__test-utils__/QueryBuilderStateTestUtils.js';

const TEST_DATA__WithFromEntities: Entity[] = [
  {
    path: 'model::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'model',
      properties: [
        {
          name: 'name',
          type: 'String',
          multiplicity: { lowerBound: 1, upperBound: 1 },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'model::TestMapping',
    content: {
      _type: 'mapping',
      classMappings: [],
      enumerationMappings: [],
      includedMappings: [],
      name: 'TestMapping',
      package: 'model',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'model::TestRuntime',
    content: {
      _type: 'runtime',
      name: 'TestRuntime',
      package: 'model',
      runtimeValue: {
        _type: 'engineRuntime',
        connectionStores: [],
        connections: [],
        mappings: [{ path: 'model::TestMapping', type: 'MAPPING' }],
      },
    },
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
  },
  {
    path: 'model::TestDataProduct',
    content: {
      _type: 'dataProduct',
      name: 'TestDataProduct',
      package: 'model',
      accessPointGroups: [
        {
          _type: 'accessPointGroup',
          id: 'group1',
          accessPoints: [
            {
              _type: 'lakehouseAccessPoint',
              id: 'ap1',
              title: 'AP 1',
              func: {
                _type: 'lambda',
                body: [{ _type: 'integer', value: 1 }],
                parameters: [],
              },
              reproducible: false,
              targetEnvironment: 'Snowflake',
            },
          ],
        },
      ],
    },
    classifierPath:
      'meta::external::catalog::dataProduct::specification::metamodel::DataProduct',
  },
];

const TEST_DATA__lambda_fromWithGetAll = {
  parameters: [],
  body: [
    {
      _type: 'func',
      function: 'from',
      parameters: [
        {
          _type: 'func',
          function: 'with',
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
              _type: 'packageableElementPtr',
              fullPath: 'model::TestDataProduct',
            },
          ],
        },
        {
          _type: 'packageableElementPtr',
          fullPath: 'model::TestRuntime',
        },
      ],
    },
  ],
};

describe(unitTest('QueryBuilderStateBuilder - with() handler'), () => {
  test(
    unitTest(
      "processes 'from(with(getAll(Class), DataProduct), Runtime)' by unwrapping with() and propagating the source class from the inner getAll()",
    ),
    async () => {
      const rawLambda = new RawLambda(
        TEST_DATA__lambda_fromWithGetAll.parameters,
        TEST_DATA__lambda_fromWithGetAll.body,
      );
      const queryBuilderState = await TEST__setUpQueryBuilderState(
        TEST_DATA__WithFromEntities,
        rawLambda,
      );

      expect(
        queryBuilderState.unsupportedQueryState.lambdaError,
      ).toBeUndefined();

      expect(queryBuilderState.sourceClass).toBeInstanceOf(Class);
      expect(queryBuilderState.sourceClass?.path).toBe('model::Person');
    },
  );
});
