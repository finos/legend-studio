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
import { deserialize } from 'serializr';
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import { RawLambda } from '../../../../../../graph/metamodel/pure/rawValueSpecification/RawLambda.js';
import {
  V1_buildRelationTypeFromV1RelationType,
  V1_buildResolvedRelationTypeFromV1RelationType,
  V1_resolveAccessorsFromRawLambda,
} from '../V1_AccessorHelper.js';
import { CORE_PURE_PATH } from '../../../../../../graph/MetaModelConst.js';
import { PrecisePrimitiveType } from '../../../../../../graph/metamodel/pure/packageableElements/domain/PrimitiveType.js';
import { PrimitiveInstanceValue } from '../../../../../../graph/metamodel/pure/valueSpecification/InstanceValue.js';
import { V1_relationTypeModelSchema } from '../../transformation/pureProtocol/serializationHelpers/V1_TypeSerializationHelper.js';
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

describe(unitTest('V1_buildRelationTypeFromV1RelationType'), () => {
  test('column tagged values carry the multi-line flag', () => {
    const v1RelationType = deserialize(V1_relationTypeModelSchema, {
      _type: 'relationType',
      columns: [
        {
          name: 'id',
          genericType: {
            rawType: { _type: 'packageableType', fullPath: 'Integer' },
            typeArguments: [],
            typeVariableValues: [],
          },
          multiplicity: { lowerBound: 1, upperBound: 1 },
          taggedValues: [
            {
              tag: { profile: 'meta::pure::profiles::doc', value: 'doc' },
              value: {
                _type: 'string',
                multiLine: true,
                value: 'line one\nline two',
              },
            },
            {
              tag: { profile: 'meta::pure::profiles::doc', value: 'todo' },
              value: 'single line',
            },
          ],
        },
      ],
    });

    const relationType = V1_buildRelationTypeFromV1RelationType(
      v1RelationType,
      graphManagerState.graph,
    );

    const taggedValues = guaranteeNonNullable(
      relationType.columns[0],
    ).taggedValues;
    expect(
      taggedValues.map((taggedValue) => ({
        tag: taggedValue.tag.value.value,
        value: taggedValue.value,
        multiLine: taggedValue.multiLine,
      })),
    ).toEqual([
      { tag: 'doc', value: 'line one\nline two', multiLine: true },
      { tag: 'todo', value: 'single line', multiLine: false },
    ]);
  });
});

describe(unitTest('V1_buildResolvedRelationTypeFromV1RelationType'), () => {
  // `my::Color` isn't in the graph, as when its project isn't loaded
  const buildV1RelationTypeWithUnknownColumnType = () =>
    deserialize(V1_relationTypeModelSchema, {
      _type: 'relationType',
      columns: [
        {
          name: 'NAME',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'meta::pure::precisePrimitives::Varchar',
            },
            typeArguments: [],
            typeVariableValues: [{ _type: 'integer', value: 9 }],
          },
          multiplicity: { lowerBound: 1, upperBound: 1 },
        },
        {
          name: 'COLOR',
          genericType: {
            rawType: { _type: 'packageableType', fullPath: 'my::Color' },
            typeArguments: [],
            typeVariableValues: [],
          },
          multiplicity: { lowerBound: 0, upperBound: 1 },
          taggedValues: [
            {
              tag: { profile: 'meta::pure::profiles::doc', value: 'doc' },
              value: 'paint colour',
            },
          ],
        },
      ],
    });

  test('types a column whose type is not in the graph as Any and reports it', () => {
    const { relationType, unresolvedColumns } =
      V1_buildResolvedRelationTypeFromV1RelationType(
        buildV1RelationTypeWithUnknownColumnType(),
        graphManagerState.graph,
      );

    expect(relationType.columns.map((column) => column.name)).toEqual([
      'NAME',
      'COLOR',
    ]);
    const nameType = guaranteeNonNullable(relationType.columns[0]).genericType
      .value;
    expect(nameType.rawType).toBe(PrecisePrimitiveType.VARCHAR);
    expect(
      guaranteeType(nameType.typeVariableValues?.[0], PrimitiveInstanceValue)
        .values,
    ).toEqual([9]);

    const color = guaranteeNonNullable(relationType.columns[1]);
    expect(color.genericType.value.rawType.path).toBe(CORE_PURE_PATH.ANY);
    expect(color.multiplicity.lowerBound).toBe(0);
    expect(color.multiplicity.upperBound).toBe(1);
    expect(color.taggedValues.map((taggedValue) => taggedValue.value)).toEqual([
      'paint colour',
    ]);
    expect(unresolvedColumns).toEqual([
      { name: 'COLOR', typePath: 'my::Color' },
    ]);
  });

  test('V1_buildRelationTypeFromV1RelationType still throws on such a column', () => {
    expect(() =>
      V1_buildRelationTypeFromV1RelationType(
        buildV1RelationTypeWithUnknownColumnType(),
        graphManagerState.graph,
      ),
    ).toThrow('my::Color');
  });
});
