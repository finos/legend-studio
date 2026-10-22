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
import { unitTest } from '@finos/legend-shared/test';
import { guaranteeNonNullable } from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import {
  MILESTONE_INGEST_COLUMNS,
  PRECISE_PRIMITIVE_TYPE,
  PRECISE_PRIMITIVE_TYPE_PATHS,
} from '../../graph/MetaModelConst.js';
import { extractElementNameFromPath } from '../../graph/MetaModelUtils.js';
import { PrecisePrimitiveType } from '../../graph/metamodel/pure/packageableElements/domain/PrimitiveType.js';
import { IngestDefinition } from '../../graph/metamodel/pure/packageableElements/ingest/IngestDefinition.js';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '../__test-utils__/GraphManagerTestUtils.js';

// The precise primitive types the engine defines, see
// https://github.com/finos/legend-pure/blob/master/legend-pure-core/legend-pure-m3-precisePrimitives/src/main/resources/platform_precise_primitives/precisePrimitives.pure
const ENGINE_PRECISE_PRIMITIVE_TYPES: [string, PrecisePrimitiveType][] = [
  ['meta::pure::precisePrimitives::TinyInt', PrecisePrimitiveType.TINY_INT],
  ['meta::pure::precisePrimitives::UTinyInt', PrecisePrimitiveType.U_TINY_INT],
  ['meta::pure::precisePrimitives::SmallInt', PrecisePrimitiveType.SMALL_INT],
  [
    'meta::pure::precisePrimitives::USmallInt',
    PrecisePrimitiveType.U_SMALL_INT,
  ],
  ['meta::pure::precisePrimitives::Int', PrecisePrimitiveType.INT],
  ['meta::pure::precisePrimitives::UInt', PrecisePrimitiveType.U_INT],
  ['meta::pure::precisePrimitives::BigInt', PrecisePrimitiveType.BIG_INT],
  ['meta::pure::precisePrimitives::UBigInt', PrecisePrimitiveType.U_BIG_INT],
  ['meta::pure::precisePrimitives::Varchar', PrecisePrimitiveType.VARCHAR],
  ['meta::pure::precisePrimitives::Timestamp', PrecisePrimitiveType.TIMESTAMP],
  ['meta::pure::precisePrimitives::Float4', PrecisePrimitiveType.FLOAT],
  ['meta::pure::precisePrimitives::Double', PrecisePrimitiveType.DOUBLE],
  ['meta::pure::precisePrimitives::Numeric', PrecisePrimitiveType.NUMERIC],
];
const ENGINE_PRECISE_PRIMITIVE_TYPE_PATHS = ENGINE_PRECISE_PRIMITIVE_TYPES.map(
  ([path]) => path,
);

// Paths which are not precise primitive types in the engine: the engine
// defines no `Date`, `Time` or `Decimal` in `meta::pure::precisePrimitives`
// ("Can't find type"), and reads the relational path as a class
const NON_PRECISE_PRIMITIVE_TYPE_PATHS = [
  'meta::pure::precisePrimitives::Date',
  'meta::pure::precisePrimitives::Decimal',
  'meta::pure::precisePrimitives::Time',
  'meta::relational::metamodel::datatype::Timestamp',
];

const graphManagerState = TEST__getTestGraphManagerState();

beforeAll(async () => {
  await TEST__buildGraphWithEntities(graphManagerState, []);
});

describe(unitTest('Precise primitive type paths'), () => {
  test('lists exactly the precise primitive types the engine defines', () => {
    expect(PRECISE_PRIMITIVE_TYPE_PATHS).toHaveLength(13);
    expect([...PRECISE_PRIMITIVE_TYPE_PATHS].sort()).toEqual(
      [...ENGINE_PRECISE_PRIMITIVE_TYPE_PATHS].sort(),
    );
  });

  test('lists the precise primitive types of the graph', () => {
    expect(
      PRECISE_PRIMITIVE_TYPE_PATHS.map((path) =>
        extractElementNameFromPath(path),
      ).sort(),
    ).toEqual(
      graphManagerState.coreModel.precisePrimitiveTypes
        .map((type) => type.name)
        .sort(),
    );
  });

  test('TIMESTAMP is the path of the precise primitive type Timestamp', () => {
    expect(PRECISE_PRIMITIVE_TYPE.TIMESTAMP).toBe(
      'meta::pure::precisePrimitives::Timestamp',
    );
  });
});

describe(unitTest('Precise primitive type resolution'), () => {
  test.each(ENGINE_PRECISE_PRIMITIVE_TYPES)(
    '%s resolves to the precise primitive type',
    (path, type) => {
      expect(graphManagerState.graph.getType(path)).toBe(type);
      expect(
        graphManagerState.graph.getType(extractElementNameFromPath(path)),
      ).toBe(type);
    },
  );

  test.each(NON_PRECISE_PRIMITIVE_TYPE_PATHS)(`%s does not resolve`, (path) => {
    expect(() => graphManagerState.graph.getType(path)).toThrow(
      `Can't find type '${path}'`,
    );
  });

  const buildClassWithPropertyOfType = async (
    typePath: string,
  ): Promise<void> => {
    const entities: Entity[] = [
      {
        path: 'test::A',
        classifierPath: 'meta::pure::metamodel::type::Class',
        content: {
          _type: 'class',
          name: 'A',
          package: 'test',
          properties: [
            {
              name: 'value',
              genericType: {
                rawType: { _type: 'packageableType', fullPath: typePath },
              },
              multiplicity: { lowerBound: 1, upperBound: 1 },
            },
          ],
        },
      },
    ];
    await TEST__buildGraphWithEntities(
      TEST__getTestGraphManagerState(),
      entities,
    );
  };

  test.each(ENGINE_PRECISE_PRIMITIVE_TYPE_PATHS)(
    'a property can be typed %s',
    async (path) => {
      await expect(buildClassWithPropertyOfType(path)).resolves.toBeUndefined();
    },
  );

  test.each(NON_PRECISE_PRIMITIVE_TYPE_PATHS)(
    `a property can't be typed %s`,
    async (path) => {
      await expect(buildClassWithPropertyOfType(path)).rejects.toThrow(
        `Can't find type '${path}'`,
      );
    },
  );
});

describe(unitTest('Milestoned ingest accessor columns'), () => {
  test('business temporal milestoning columns are typed Timestamp', async () => {
    const ingest = new IngestDefinition('MyIngest');
    ingest.content = {
      writeMode: { _type: 'batch_milestoned_business_temporal' },
      datasets: [
        {
          name: 'MyDataset',
          primaryKey: [],
          source: {
            _type: 'ingestSource',
            schema: {
              _type: 'schema',
              columns: [
                {
                  name: 'id',
                  genericType: {
                    rawType: { _type: 'packageableType', fullPath: 'Integer' },
                  },
                  multiplicity: { lowerBound: 1, upperBound: 1 },
                },
              ],
            },
          },
        },
      ],
    };

    const accessor = guaranteeNonNullable(
      await graphManagerState.graphManager.createAccessorFromPackageableElement(
        ingest,
        graphManagerState.graph,
      ),
    );

    const getColumnType = (name: string) =>
      guaranteeNonNullable(
        accessor.relationType.columns.find((column) => column.name === name),
        `Can't find column '${name}'`,
      ).genericType.value.rawType;
    expect(getColumnType(MILESTONE_INGEST_COLUMNS.INGEST_LAKE_FROM)).toBe(
      PrecisePrimitiveType.TIMESTAMP,
    );
    expect(getColumnType(MILESTONE_INGEST_COLUMNS.INGEST_LAKE_THRU)).toBe(
      PrecisePrimitiveType.TIMESTAMP,
    );
  });
});
