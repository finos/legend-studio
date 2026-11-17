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

import { beforeAll, describe, expect, test } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  guaranteeNonNullable,
  guaranteeType,
  type PlainObject,
} from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '../../../../../__test-utils__/GraphManagerTestUtils.js';
import { TEST_DATA__INGEST_DEFINITION } from '../../../../../__tests__/roundtripTestData/TEST_DATA__IngestRoundtrip.js';
import {
  AccessorInstanceValue,
  IngestAccessorQualifier,
  IngestionAccessor,
} from '../../../../../../graph/metamodel/pure/packageableElements/relation/Accessor.js';
import { RawLambda } from '../../../../../../graph/metamodel/pure/rawValueSpecification/RawLambda.js';
import { PrimitiveInstanceValue } from '../../../../../../graph/metamodel/pure/valueSpecification/InstanceValue.js';
import { CORE_PURE_PATH } from '../../../../../../graph/MetaModelConst.js';
import { PrecisePrimitiveType } from '../../../../../../graph/metamodel/pure/packageableElements/domain/PrimitiveType.js';
import {
  V1_deserializeValueSpecification,
  V1_serializeValueSpecification,
} from '../../transformation/pureProtocol/serializationHelpers/V1_ValueSpecificationSerializer.js';
import { V1_ClassInstance } from '../../model/valueSpecification/raw/V1_ClassInstance.js';
import {
  V1_IngestAccessorQualifier,
  V1_IngestDefinitionAccessor,
} from '../../model/valueSpecification/raw/classInstance/relation/V1_RelationStoreAccessor.js';

const INGEST = 'model::PersonIngest';

const METADATA_COLUMNS = [
  'table_name',
  'batch_start_ts_utc',
  'batch_end_ts_utc',
  'batch_status',
  'table_batch_id',
  'ingest_request_id',
  'batch_source_info',
  'additional_metadata',
  'batch_statistics',
];

const graphManagerState = TEST__getTestGraphManagerState();

beforeAll(async () => {
  await TEST__buildGraphWithEntities(
    graphManagerState,
    TEST_DATA__INGEST_DEFINITION as Entity[],
  );
});

const plugins = (): ReturnType<
  typeof graphManagerState.pluginManager.getPureProtocolProcessorPlugins
> => graphManagerState.pluginManager.getPureProtocolProcessorPlugins();

const ingestAccessorJson = (value: PlainObject): PlainObject => ({
  _type: 'classInstance',
  type: 'I',
  value,
});

const deserializeAccessor = (value: PlainObject): V1_IngestDefinitionAccessor =>
  guaranteeType(
    guaranteeType(
      V1_deserializeValueSpecification(ingestAccessorJson(value), plugins()),
      V1_ClassInstance,
    ).value,
    V1_IngestDefinitionAccessor,
  );

// deserialize, then serialize back: what Studio sends to the engine
const protocolRoundtrip = (value: PlainObject): unknown =>
  V1_serializeValueSpecification(
    V1_deserializeValueSpecification(ingestAccessorJson(value), plugins()),
    plugins(),
  ).value;

const buildAccessor = (value: PlainObject): IngestionAccessor =>
  guaranteeType(
    guaranteeType(
      graphManagerState.graphManager.buildValueSpecification(
        ingestAccessorJson(value),
        graphManagerState.graph,
      ),
      AccessorInstanceValue,
    ).values[0],
    IngestionAccessor,
  );

// build the accessor, then serialize it back: what saving a query writes
const graphRoundtrip = (value: PlainObject): unknown =>
  graphManagerState.graphManager.serializeValueSpecification(
    graphManagerState.graphManager.buildValueSpecification(
      ingestAccessorJson(value),
      graphManagerState.graph,
    ),
  ).value;

const getColumnNames = (accessor: IngestionAccessor): string[] =>
  accessor.relationType.columns.map((column) => column.name);

describe(unitTest('Ingest accessor qualifier protocol'), () => {
  test('reads the metadata qualifier into both flags', () => {
    const accessor = deserializeAccessor({
      path: [INGEST, 'Person'],
      accessorQualifier: 'metadata',
    });
    expect(accessor.accessorQualifier).toBe(
      V1_IngestAccessorQualifier.METADATA,
    );
    expect(accessor.metadata).toBe(true);
  });

  test('reads JSON written before the qualifier existed as metadata', () => {
    const accessor = deserializeAccessor({
      path: [INGEST, 'Person'],
      metadata: true,
    });
    expect(accessor.accessorQualifier).toBe(
      V1_IngestAccessorQualifier.METADATA,
    );
    expect(accessor.metadata).toBe(true);
  });

  test('writes both flags for a metadata accessor, whichever was read', () => {
    const expected = {
      path: [INGEST, 'Person'],
      metadata: true,
      accessorQualifier: 'metadata',
    };
    expect(
      protocolRoundtrip({ path: [INGEST, 'Person'], metadata: true }),
    ).toEqual(expected);
    expect(
      protocolRoundtrip({
        path: [INGEST, 'Person'],
        accessorQualifier: 'metadata',
      }),
    ).toEqual(expected);
  });

  test('keeps a qualifier other than metadata', () => {
    expect(
      protocolRoundtrip({
        path: [INGEST, 'Person'],
        metadata: false,
        accessorQualifier: 'incoming',
      }),
    ).toEqual({
      path: [INGEST, 'Person'],
      metadata: false,
      accessorQualifier: 'incoming',
    });
  });

  test('writes an accessor with no qualifier as before', () => {
    expect(
      protocolRoundtrip({ path: [INGEST, 'Person'], metadata: false }),
    ).toEqual({ path: [INGEST, 'Person'], metadata: false });
    expect(protocolRoundtrip({ path: [INGEST, 'Person'] })).toEqual({
      path: [INGEST, 'Person'],
      metadata: false,
    });
  });
});

describe(unitTest('Ingest accessor qualifier in the graph'), () => {
  test('types a metadata accessor by the batch metadata columns', () => {
    const accessor = buildAccessor({
      path: [INGEST, 'Person'],
      metadata: true,
      accessorQualifier: 'metadata',
    });
    expect(accessor.qualifier).toBe(IngestAccessorQualifier.METADATA);
    expect(accessor.path).toEqual([INGEST, 'Person']);
    expect(getColumnNames(accessor)).toEqual(METADATA_COLUMNS);

    const columns = accessor.relationType.columns;
    const tableName = guaranteeNonNullable(columns[0]);
    expect(tableName.genericType.value.rawType).toBe(
      PrecisePrimitiveType.VARCHAR,
    );
    expect(
      guaranteeType(
        tableName.genericType.value.typeVariableValues?.[0],
        PrimitiveInstanceValue,
      ).values,
    ).toEqual([255]);
    expect(tableName.multiplicity.lowerBound).toBe(0);
    expect(tableName.multiplicity.upperBound).toBe(1);
    expect(guaranteeNonNullable(columns[1]).genericType.value.rawType).toBe(
      PrecisePrimitiveType.TIMESTAMP,
    );
    expect(guaranteeNonNullable(columns[4]).genericType.value.rawType).toBe(
      PrecisePrimitiveType.INT,
    );
    expect(
      guaranteeNonNullable(columns[8]).genericType.value.rawType.path,
    ).toBe(CORE_PURE_PATH.VARIANT);
  });

  test('types legacy metadata JSON by the batch metadata columns', () => {
    const accessor = buildAccessor({
      path: [INGEST, 'Person'],
      metadata: true,
    });
    expect(accessor.qualifier).toBe(IngestAccessorQualifier.METADATA);
    expect(getColumnNames(accessor)).toEqual(METADATA_COLUMNS);
  });

  test('types an accessor with no qualifier by the data set columns', () => {
    const accessor = buildAccessor({
      path: [INGEST, 'Person'],
      metadata: false,
    });
    expect(accessor.qualifier).toBeUndefined();
    expect(getColumnNames(accessor)).toEqual(['id', 'name']);
  });

  test('keeps the qualifier when a query is saved', () => {
    expect(
      graphRoundtrip({ path: [INGEST, 'Person'], metadata: true }),
    ).toEqual({
      path: [INGEST, 'Person'],
      metadata: true,
      accessorQualifier: 'metadata',
    });
    expect(
      graphRoundtrip({
        path: [INGEST, 'Person'],
        accessorQualifier: 'incoming',
      }),
    ).toEqual({
      path: [INGEST, 'Person'],
      metadata: false,
      accessorQualifier: 'incoming',
    });
    expect(
      graphRoundtrip({ path: [INGEST, 'Person'], metadata: false }),
    ).toEqual({ path: [INGEST, 'Person'], metadata: false });
  });

  test('tells a metadata accessor from a rows accessor of the same data set', () => {
    expect(
      buildAccessor({ path: [INGEST, 'Person'], metadata: true }).hashCode,
    ).not.toBe(
      buildAccessor({ path: [INGEST, 'Person'], metadata: false }).hashCode,
    );
  });

  test('types a metadata accessor collected from a lambda', async () => {
    const accessors =
      await graphManagerState.graphManager.collectAccessorsInRawLambda(
        new RawLambda(
          [],
          [
            ingestAccessorJson({
              path: [INGEST, 'Person'],
              metadata: true,
              accessorQualifier: 'metadata',
            }),
          ],
        ),
        graphManagerState.graph,
      );
    expect(accessors).toHaveLength(1);
    const accessor = guaranteeType(accessors[0], IngestionAccessor);
    expect(accessor.qualifier).toBe(IngestAccessorQualifier.METADATA);
    expect(getColumnNames(accessor)).toEqual(METADATA_COLUMNS);
  });
});
