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
  IngestDatasetQualifier,
  OpaqueType,
  PRIMITIVE_TYPE_PATH,
  PrimitiveType,
  resolveCubeType,
  Schema,
  SchemaColumn,
} from '@finos/legend-cube';
import {
  MILESTONE_INGEST_COLUMNS,
  V1_CInteger,
  type V1_IngestDataset,
  type V1_IngestDatasetSchema,
  type V1_IngestDatasetSource,
  V1_PackageableType,
  type V1_RelationTypeColumn,
  V1_WriteModeType,
  type V1_WriteMode,
  V1_deserializeIngestDefinitionContent,
  V1_getIngestMetadataRelationType,
  V1_IngestPreprocessorType,
} from '@finos/legend-graph';
import { isPlainObject, type PlainObject } from '@finos/legend-shared';
import { CubeIngestDataSet } from '../../../CubeIngestCatalog.js';

// A deployed ingest definition's data sets, typed from what the definition
// declares, with no engine call: each data set's columns, with their type
// parameters, then the columns its write mode adds, typed as legend-graph
// types them (#5598) and in the order the engine returns them. A data set
// Cube can't read is listed with the reason, and can't be picked

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

/**
 * The columns a batch-milestoned data set adds after its own, by write mode,
 * in the order the engine returns them, since a run's rows are read by
 * position: the digest, then the batches the row came in and went out with,
 * then, business temporal, the dates it holds from and through. That is the
 * order Legend's persistence components add them to a table in (digest,
 * batch in and out, validity from and thru), and the engine gives
 * LAKE_DIGEST right after a data set's own columns. legend-graph lists them
 * LAKE_IN_ID first, which Legend Query doesn't mind: it reads them by name.
 */
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
    new SchemaColumn(
      MILESTONE_INGEST_COLUMNS.INGEST_LAKE_DIGEST,
      PrimitiveType.get(PRIMITIVE_TYPE_PATH.STRING),
      false,
    ),
    new SchemaColumn(
      MILESTONE_INGEST_COLUMNS.INGEST_LAKE_IN_ID,
      integer,
      false,
    ),
    new SchemaColumn(
      MILESTONE_INGEST_COLUMNS.INGEST_LAKE_OUT_ID,
      integer,
      false,
    ),
  ];
  if (type === V1_WriteModeType.BATCH_MILESTONED_BUSINESS_TEMPORAL) {
    const timestamp = PrimitiveType.get(PRIMITIVE_TYPE_PATH.TIMESTAMP);
    columns.push(
      new SchemaColumn(
        MILESTONE_INGEST_COLUMNS.INGEST_LAKE_FROM,
        timestamp,
        false,
      ),
      new SchemaColumn(
        MILESTONE_INGEST_COLUMNS.INGEST_LAKE_THRU,
        timestamp,
        false,
      ),
    );
  }
  return columns;
};

/** The columns the engine adds to a data set's append log, as it names them */
const APPEND_LOG_COLUMNS = {
  BATCH_ID: 'LAKE_BATCH_ID',
  APPEND_TIME: 'LAKE_APPEND_TIME',
  IN_Z: 'LAKE_IN_Z',
  OUT_Z: 'LAKE_OUT_Z',
} as const;

/** Whether a data set, as its content declares it, has a preprocessor of that type */
const hasPreprocessor = (
  declared: unknown,
  type: V1_IngestPreprocessorType,
): boolean => {
  const preprocessors = isPlainObject(declared)
    ? declared.preprocessors
    : undefined;
  return (
    Array.isArray(preprocessors) &&
    preprocessors.some((each) => isPlainObject(each) && each._type === type)
  );
};

/**
 * The columns a data set's append log adds after its own, as the engine adds
 * them to `#I{…|incoming}#` whatever the write mode: the digest, when the
 * write mode keeps one, then the batch each row came in with and when it was
 * appended, then, for a data set that keeps them, the times it is in the lake
 * from and until. A batch-milestoned data set keeps no digest when it
 * overwrites on snapshot. Typed as the milestoning columns are.
 */
const appendLogColumns = (
  writeMode: V1_WriteMode | undefined,
  declared: unknown,
): SchemaColumn[] => {
  const type = writeMode?._type;
  const keepsDigest =
    type === V1_WriteModeType.BATCH_MILESTONED_BUSINESS_TEMPORAL ||
    (type === V1_WriteModeType.BATCH_MILESTONED &&
      !hasPreprocessor(
        declared,
        V1_IngestPreprocessorType.OVERWRITE_ON_SNAPSHOT,
      ));
  const timestamp = PrimitiveType.get(PRIMITIVE_TYPE_PATH.TIMESTAMP);
  return [
    ...(keepsDigest
      ? [
          new SchemaColumn(
            MILESTONE_INGEST_COLUMNS.INGEST_LAKE_DIGEST,
            PrimitiveType.get(PRIMITIVE_TYPE_PATH.STRING),
            false,
          ),
        ]
      : []),
    new SchemaColumn(
      APPEND_LOG_COLUMNS.BATCH_ID,
      PrimitiveType.get(PRIMITIVE_TYPE_PATH.INTEGER),
      false,
    ),
    new SchemaColumn(APPEND_LOG_COLUMNS.APPEND_TIME, timestamp, false),
    ...(hasPreprocessor(
      declared,
      V1_IngestPreprocessorType.INCLUDE_INZ_OUTZ_TIMESTAMP,
    )
      ? [
          new SchemaColumn(APPEND_LOG_COLUMNS.IN_Z, timestamp, false),
          new SchemaColumn(APPEND_LOG_COLUMNS.OUT_Z, timestamp, false),
        ]
      : []),
  ];
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

/** A relation type's columns, each holding one value at most, or why one can't be read */
const readColumns = (
  declared: readonly V1_RelationTypeColumn[],
): { columns: SchemaColumn[] } | { reason: string } => {
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
  return { columns };
};

/**
 * A data set's schema, and its columns as `#I{…|incoming}#` reads them, or why
 * it can't be picked. Those are none for a data set with a column of its own
 * named as one the append log adds; it can still be picked for its rows.
 */
const readSchema = (
  dataset: V1_IngestDataset,
  definitionWriteMode: V1_WriteMode | undefined,
  declared: unknown,
):
  | { schema: Schema; incomingSchema: Schema | undefined }
  | { reason: string } => {
  // the protocol types both as always there, but saved content may lack them
  const source = dataset.source as V1_IngestDatasetSource | undefined;
  if (source?._type === MATERIALIZED_VIEW_SOURCE) {
    return { reason: V1_CUBE_INGEST_DATA_SET_REASON.MATERIALIZED_VIEW };
  }
  const schema: V1_IngestDatasetSchema | undefined = source?.schema;
  const columns = schema?.columns ?? [];
  if (!columns.length) {
    return { reason: V1_CUBE_INGEST_DATA_SET_REASON.NO_COLUMNS };
  }
  const read = readColumns(columns);
  if ('reason' in read) {
    return read;
  }
  const writeMode = dataset.writeMode ?? definitionWriteMode;
  let rows: Schema;
  try {
    rows = new Schema([...read.columns, ...milestoningColumns(writeMode)]);
  } catch (error) {
    return { reason: error instanceof Error ? error.message : String(error) };
  }
  let incoming: Schema | undefined;
  try {
    incoming = new Schema([
      ...read.columns,
      ...appendLogColumns(writeMode, declared),
    ]);
  } catch {
    incoming = undefined;
  }
  return { schema: rows, incomingSchema: incoming };
};

let metadataSchema: Schema | undefined;

/**
 * The columns of a data set's batch metadata, `#I{definition.dataSet|metadata}#`:
 * the same for every data set, as legend-graph types them, so read once
 */
export const V1_getCubeIngestMetadataSchema = (): Schema => {
  if (!metadataSchema) {
    const read = readColumns(V1_getIngestMetadataRelationType().columns);
    if ('reason' in read) {
      // the columns are legend-graph's, so a test catches this first
      throw new Error(`Cube can't read the batch metadata: ${read.reason}`);
    }
    metadataSchema = new Schema(read.columns);
  }
  return metadataSchema;
};

/**
 * The columns a source reads of an ingest data set, as the engine types the
 * accessor with its qualifier: its batch metadata's, whatever the data set,
 * else the data set's, by what the qualifier says; `undefined` when the data
 * set can't be read
 */
export const V1_getCubeIngestSourceSchema = (
  dataSet: CubeIngestDataSet | undefined,
  qualifier: IngestDatasetQualifier | undefined,
): Schema | undefined =>
  qualifier === IngestDatasetQualifier.METADATA
    ? V1_getCubeIngestMetadataSchema()
    : dataSet?.isPickable
      ? dataSet.getSchemaRead(qualifier)
      : undefined;

/**
 * The data sets of an ingest definition's content (its protocol JSON), in
 * order. Throws when the content can't be read at all.
 */
export const V1_readCubeIngestDataSets = (
  content: PlainObject,
): CubeIngestDataSet[] => {
  const definition = V1_deserializeIngestDefinitionContent(content);
  // what the protocol model leaves out, e.g. a data set's preprocessors
  const declared: unknown[] = Array.isArray(content.datasets)
    ? content.datasets
    : [];
  return (definition.datasets ?? []).map((dataset) => {
    const read = readSchema(
      dataset,
      definition.writeMode,
      declared.find(
        (each) => isPlainObject(each) && each.name === dataset.name,
      ),
    );
    return new CubeIngestDataSet({
      name: dataset.name,
      primaryKey: dataset.primaryKey,
      ...('schema' in read
        ? { schema: read.schema, incomingSchema: read.incomingSchema }
        : { disabledReason: read.reason }),
    });
  });
};
