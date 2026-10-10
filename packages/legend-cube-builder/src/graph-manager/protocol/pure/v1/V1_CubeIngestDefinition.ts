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

import {
  type CubeType,
  OpaqueType,
  PRIMITIVE_TYPE_PATH,
  PrimitiveType,
  resolveCubeType,
  Schema,
  SchemaColumn,
} from '@finos/legend-cube';
import {
  V1_CInteger,
  type V1_IngestDataset,
  type V1_IngestDatasetSchema,
  type V1_IngestDatasetSource,
  V1_PackageableType,
  type V1_RelationTypeColumn,
  V1_WriteModeType,
  type V1_WriteMode,
  V1_deserializeIngestDefinitionContent,
} from '@finos/legend-graph';
import type { PlainObject } from '@finos/legend-shared';
import { CubeIngestDataSet } from '../../../CubeIngestCatalog.js';

// A deployed ingest definition's data sets, typed from what the definition
// declares, with no engine call: each data set's columns, with their type
// parameters, then the columns its write mode adds, as legend-graph types
// them (#5598). A data set Cube can't read is listed with the reason, and
// can't be picked

/** A data set whose rows come from a query over other data sets */
const MATERIALIZED_VIEW_SOURCE = 'FunctionSource';

/** Why a data set can't be picked */
export const V1_CUBE_INGEST_DATA_SET_REASON = {
  MATERIALIZED_VIEW:
    'It is a materialized view, which Cube does not support yet',
  NO_COLUMNS: 'It declares no columns',
  BAD_MULTIPLICITY: (column: string): string =>
    `Column "${column}" holds more than one value, which Cube can't show`,
  UNKNOWN_TYPE: (column: string, type: string): string =>
    `Column "${column}" has a type Cube doesn't know: ${type}`,
} as const;

/** The columns a batch-milestoned data set adds after its own, by write mode */
const milestoningColumns = (
  writeMode: V1_WriteMode | undefined,
): SchemaColumn[] => {
  const type = writeMode?._type;
  if (
    type !== V1_WriteModeType.BATCH_MILESTONED &&
    type !== V1_WriteModeType.BATCH_MILESTONED_BUSINESS_TEMPORAL
  ) {
    return [];
  }
  const integer = PrimitiveType.get(PRIMITIVE_TYPE_PATH.INTEGER);
  const columns = [
    new SchemaColumn('LAKE_IN_ID', integer, false),
    new SchemaColumn('LAKE_OUT_ID', integer, false),
    new SchemaColumn(
      'LAKE_DIGEST',
      PrimitiveType.get(PRIMITIVE_TYPE_PATH.STRING),
      false,
    ),
  ];
  if (type === V1_WriteModeType.BATCH_MILESTONED_BUSINESS_TEMPORAL) {
    const timestamp = PrimitiveType.get(PRIMITIVE_TYPE_PATH.TIMESTAMP);
    columns.push(
      new SchemaColumn('LAKE_FROM', timestamp, false),
      new SchemaColumn('LAKE_THRU', timestamp, false),
    );
  }
  return columns;
};

/**
 * A declared column's type, by its full path or, for a primitive whose path
 * has a package (e.g. `meta::pure::metamodel::type::Integer`), its name;
 * parameters kept. Any other type, such as an enumeration, gives the reason
 * the data set can't be picked.
 */
const readColumnType = (
  column: V1_RelationTypeColumn,
): { type: CubeType } | { reason: string } => {
  const { rawType, typeVariableValues } = column.genericType;
  if (!(rawType instanceof V1_PackageableType)) {
    return {
      reason: V1_CUBE_INGEST_DATA_SET_REASON.UNKNOWN_TYPE(
        column.name,
        'not a named type',
      ),
    };
  }
  const params: number[] = [];
  for (const value of typeVariableValues) {
    if (!(value instanceof V1_CInteger)) {
      return {
        reason: V1_CUBE_INGEST_DATA_SET_REASON.UNKNOWN_TYPE(
          column.name,
          rawType.fullPath,
        ),
      };
    }
    params.push(value.value);
  }
  const name = rawType.fullPath.slice(rawType.fullPath.lastIndexOf(':') + 1);
  const type = [rawType.fullPath, name]
    .map((path) => resolveCubeType(path, params))
    .find((candidate) => !(candidate instanceof OpaqueType));
  return type
    ? { type }
    : {
        reason: V1_CUBE_INGEST_DATA_SET_REASON.UNKNOWN_TYPE(
          column.name,
          params.length
            ? `${rawType.fullPath}(${params.join(', ')})`
            : rawType.fullPath,
        ),
      };
};

/** A data set's schema, or why it can't be picked */
const readSchema = (
  dataset: V1_IngestDataset,
  definitionWriteMode: V1_WriteMode | undefined,
): { schema: Schema } | { reason: string } => {
  // the protocol types both as always there, but saved content may lack them
  const source = dataset.source as V1_IngestDatasetSource | undefined;
  if (source?._type === MATERIALIZED_VIEW_SOURCE) {
    return { reason: V1_CUBE_INGEST_DATA_SET_REASON.MATERIALIZED_VIEW };
  }
  const schema: V1_IngestDatasetSchema | undefined = source?.schema;
  const declared = schema?.columns ?? [];
  if (!declared.length) {
    return { reason: V1_CUBE_INGEST_DATA_SET_REASON.NO_COLUMNS };
  }
  const columns: SchemaColumn[] = [];
  for (const column of declared) {
    if (column.multiplicity.upperBound !== 1) {
      return {
        reason: V1_CUBE_INGEST_DATA_SET_REASON.BAD_MULTIPLICITY(column.name),
      };
    }
    const read = readColumnType(column);
    if ('reason' in read) {
      return read;
    }
    columns.push(
      new SchemaColumn(
        column.name,
        read.type,
        column.multiplicity.lowerBound === 0,
      ),
    );
  }
  try {
    return {
      schema: new Schema([
        ...columns,
        ...milestoningColumns(dataset.writeMode ?? definitionWriteMode),
      ]),
    };
  } catch (error) {
    return { reason: error instanceof Error ? error.message : String(error) };
  }
};

/**
 * The data sets of an ingest definition's content (its protocol JSON), in
 * order. Throws when the content can't be read at all.
 */
export const V1_readCubeIngestDataSets = (
  content: PlainObject,
): CubeIngestDataSet[] => {
  const definition = V1_deserializeIngestDefinitionContent(content);
  return (definition.datasets ?? []).map((dataset) => {
    const read = readSchema(dataset, definition.writeMode);
    return new CubeIngestDataSet({
      name: dataset.name,
      primaryKey: dataset.primaryKey,
      ...('schema' in read
        ? { schema: read.schema }
        : { disabledReason: read.reason }),
    });
  });
};
