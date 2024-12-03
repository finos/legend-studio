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

import { test, expect, describe } from '@jest/globals';
import { type PlainObject } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import { TEST__GraphManagerPluginManager } from '../../../../../../__test-utils__/GraphManagerTestUtils.js';
import {
  V1_deserializeValueSpecification,
  V1_serializeValueSpecification,
} from '../serializationHelpers/V1_ValueSpecificationSerializer.js';

const pluginManager = new TEST__GraphManagerPluginManager();
pluginManager.install();

type TestCase = [string, PlainObject, PlainObject];

const cases: TestCase[] = [
  [
    'Legacy format of CString',
    {
      _type: 'string',
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      values: ['hallo'],
    },
    {
      _type: 'string',
      value: 'hallo',
    },
  ],
  [
    'Legacy format of CBoolean',
    {
      _type: 'boolean',
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      values: [true],
    },
    {
      _type: 'boolean',
      value: true,
    },
  ],
  [
    'Legacy format of CDecimal',
    {
      _type: 'decimal',
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      values: [123.1],
    },
    {
      _type: 'decimal',
      value: 123.1,
    },
  ],
  [
    'Legacy format of CFloat',
    {
      _type: 'float',
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      values: [123.1],
    },
    {
      _type: 'float',
      value: 123.1,
    },
  ],
  [
    'Legacy format of CInteger',
    {
      _type: 'integer',
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      values: [1],
    },
    {
      _type: 'integer',
      value: 1,
    },
  ],
  [
    'Legacy format of CDateTime',
    {
      _type: 'dateTime',
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      values: ['2022-01-26'],
    },
    {
      _type: 'dateTime',
      value: '2022-01-26',
    },
  ],
  [
    'Legacy format of CStrictDate',
    {
      _type: 'strictDate',
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      values: ['2022-01-26'],
    },
    {
      _type: 'strictDate',
      value: '2022-01-26',
    },
  ],
  [
    'Legacy format of CStrictTime',
    {
      _type: 'strictTime',
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      values: ['22:00:00'],
    },
    {
      _type: 'strictTime',
      value: '22:00:00',
    },
  ],
  [
    'Legacy format of CLatestDate',
    {
      _type: 'latestDate',
    },
    {
      _type: 'latestDate',
    },
  ],
  [
    'Legacy format of CLatestDate',
    {
      _type: 'latestDate',
    },
    {
      _type: 'latestDate',
    },
  ],
  [
    'Legacy format of graph fetch tree',
    {
      _type: 'rootGraphFetchTree',
      class: 'demo::other::NPerson',
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
      _type: 'classInstance',
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      type: 'rootGraphFetchTree',
      value: {
        _type: 'rootGraphFetchTree',
        class: 'demo::other::NPerson',
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
  [
    'Auto conversion for primitive instance value without value to collection',
    {
      _type: 'string',
      values: [],
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
  [
    'Hacked-class used in @cast expression',
    {
      _type: 'hackedClass',
      fullPath: 'Integer',
    },
    {
      _type: 'genericTypeInstance',
      genericType: {
        rawType: {
          _type: 'packageableType',
          fullPath: 'Integer',
        },
      },
    },
  ],
];

describe(
  unitTest('Value specification backward-compatible serialization'),
  () => {
    test.each(cases)(
      '%s',
      async (
        testName: TestCase[0],
        before: TestCase[2],
        after: TestCase[2],
      ) => {
        const json = V1_serializeValueSpecification(
          V1_deserializeValueSpecification(
            before,
            pluginManager.getPureProtocolProcessorPlugins(),
          ),
          pluginManager.getPureProtocolProcessorPlugins(),
        );
        expect(json).toEqual(after);
        // do an additional roundtrip
        expect(after).toEqual(
          V1_serializeValueSpecification(
            V1_deserializeValueSpecification(
              after,
              pluginManager.getPureProtocolProcessorPlugins(),
            ),
            pluginManager.getPureProtocolProcessorPlugins(),
          ),
        );
      },
    );
  },
);
