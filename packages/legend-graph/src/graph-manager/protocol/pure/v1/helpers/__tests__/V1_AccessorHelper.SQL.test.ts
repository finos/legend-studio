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

import { beforeAll, describe, expect, test } from '@jest/globals';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import { RawLambda } from '../../../../../../graph/metamodel/pure/rawValueSpecification/RawLambda.js';
import { V1_resolveAccessorsFromRawLambda } from '../V1_AccessorHelper.js';
import {
  V1_DataProductAccessor,
  V1_IngestDefinitionAccessor,
} from '../../model/valueSpecification/raw/classInstance/relation/V1_RelationStoreAccessor.js';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '../../../../../__test-utils__/GraphManagerTestUtils.js';

const graphManagerState = TEST__getTestGraphManagerState();

beforeAll(async () => {
  await TEST__buildGraphWithEntities(graphManagerState, []);
});

describe(
  unitTest('resolveAccessorsFromRawLambda - SQL accessor support'),
  () => {
    test('extracts ingest accessor from SQL i(...) call', () => {
      const rawLambda = new RawLambda(
        [],
        [
          {
            _type: 'classInstance',
            type: 'SQL',
            value: {
              sql: "select id from i('my::pack::MyIngest.MyDataSet')",
            },
          },
        ],
      );

      const accessors = guaranteeNonNullable(
        V1_resolveAccessorsFromRawLambda(
          rawLambda,
          graphManagerState.graphManager,
          graphManagerState.pluginManager.getPureProtocolProcessorPlugins(),
        ),
      );

      expect(accessors).toHaveLength(1);
      const accessor = guaranteeNonNullable(accessors[0]);
      expect(accessor).toBeInstanceOf(V1_IngestDefinitionAccessor);
      expect(accessor.path).toEqual(['my::pack::MyIngest', 'MyDataSet']);
    });

    test('extracts ingest accessor with unquoted SQL i(...) syntax', () => {
      const rawLambda = new RawLambda(
        [],
        [
          {
            _type: 'classInstance',
            type: 'SQL',
            value: {
              sql: 'select id from i(my::pack::MyIngest . MyDataSet)',
            },
          },
        ],
      );

      const accessors = guaranteeNonNullable(
        V1_resolveAccessorsFromRawLambda(
          rawLambda,
          graphManagerState.graphManager,
          graphManagerState.pluginManager.getPureProtocolProcessorPlugins(),
        ),
      );

      expect(accessors).toHaveLength(1);
      expect(guaranteeNonNullable(accessors[0]).path).toEqual([
        'my::pack::MyIngest',
        'MyDataSet',
      ]);
    });

    test('deduplicates repeated SQL ingest accessor references', () => {
      const rawLambda = new RawLambda(
        [],
        [
          {
            _type: 'classInstance',
            type: 'SQL',
            value: {
              sql: "select id from i('my::pack::MyIngest.MyDataSet') union all select id from i('my::pack::MyIngest.MyDataSet')",
            },
          },
        ],
      );

      const accessors = guaranteeNonNullable(
        V1_resolveAccessorsFromRawLambda(
          rawLambda,
          graphManagerState.graphManager,
          graphManagerState.pluginManager.getPureProtocolProcessorPlugins(),
        ),
      );

      expect(accessors).toHaveLength(1);
      expect(guaranteeNonNullable(accessors[0]).path).toEqual([
        'my::pack::MyIngest',
        'MyDataSet',
      ]);
    });

    test('extracts data product accessor from SQL p(...) call', () => {
      const rawLambda = new RawLambda(
        [],
        [
          {
            _type: 'classInstance',
            type: 'SQL',
            value: {
              sql: "select id from p('my::dp::Product.apId')",
            },
          },
        ],
      );

      const accessors = guaranteeNonNullable(
        V1_resolveAccessorsFromRawLambda(
          rawLambda,
          graphManagerState.graphManager,
          graphManagerState.pluginManager.getPureProtocolProcessorPlugins(),
        ),
      );

      expect(accessors).toHaveLength(1);
      const accessor = guaranteeNonNullable(accessors[0]);
      expect(accessor).toBeInstanceOf(V1_DataProductAccessor);
      expect(accessor.path).toEqual(['my::dp::Product', 'apId']);
    });

    test('extracts data product accessor with unquoted SQL p(...) syntax', () => {
      const rawLambda = new RawLambda(
        [],
        [
          {
            _type: 'classInstance',
            type: 'SQL',
            value: {
              sql: 'select id from p(my::dp::Product . apId)',
            },
          },
        ],
      );

      const accessors = guaranteeNonNullable(
        V1_resolveAccessorsFromRawLambda(
          rawLambda,
          graphManagerState.graphManager,
          graphManagerState.pluginManager.getPureProtocolProcessorPlugins(),
        ),
      );

      expect(accessors).toHaveLength(1);
      const accessor = guaranteeNonNullable(accessors[0]);
      expect(accessor).toBeInstanceOf(V1_DataProductAccessor);
      expect(accessor.path).toEqual(['my::dp::Product', 'apId']);
    });

    test('deduplicates repeated SQL data product accessor references', () => {
      const rawLambda = new RawLambda(
        [],
        [
          {
            _type: 'classInstance',
            type: 'SQL',
            value: {
              sql: "select id from p('my::dp::Product.apId') union all select id from p('my::dp::Product.apId')",
            },
          },
        ],
      );

      const accessors = guaranteeNonNullable(
        V1_resolveAccessorsFromRawLambda(
          rawLambda,
          graphManagerState.graphManager,
          graphManagerState.pluginManager.getPureProtocolProcessorPlugins(),
        ),
      );

      expect(accessors).toHaveLength(1);
      const accessor = guaranteeNonNullable(accessors[0]);
      expect(accessor).toBeInstanceOf(V1_DataProductAccessor);
      expect(accessor.path).toEqual(['my::dp::Product', 'apId']);
    });

    test('extracts ingest and data product accessors from same SQL', () => {
      const rawLambda = new RawLambda(
        [],
        [
          {
            _type: 'classInstance',
            type: 'SQL',
            value: {
              sql: "select a.id from i('my::pack::MyIngest.MyDataSet') a join p('my::dp::Product.apId') b on a.id = b.id",
            },
          },
        ],
      );

      const accessors = guaranteeNonNullable(
        V1_resolveAccessorsFromRawLambda(
          rawLambda,
          graphManagerState.graphManager,
          graphManagerState.pluginManager.getPureProtocolProcessorPlugins(),
        ),
      );

      expect(accessors).toHaveLength(2);
      expect(accessors).toContainEqual(
        expect.objectContaining({
          path: ['my::pack::MyIngest', 'MyDataSet'],
        }),
      );
      expect(accessors).toContainEqual(
        expect.objectContaining({
          path: ['my::dp::Product', 'apId'],
        }),
      );
    });
  },
);
