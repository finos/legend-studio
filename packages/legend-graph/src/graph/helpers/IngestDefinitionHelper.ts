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
  MILESTONE_INGEST_COLUMNS,
  PRECISE_PRIMITIVE_TYPE,
  PRIMITIVE_TYPE,
} from '../MetaModelConst.js';
import {
  IngestAppendOnlyWriteMode,
  IngestBatchMilestonedBusinessTemporalWriteMode,
  IngestBatchMilestonedWriteMode,
  type IngestDataset,
  type IngestDefinitionSpecification,
  type IngestWriteMode,
} from '../metamodel/pure/packageableElements/ingest/IngestDefinitionSpecification.js';

/** A column an ingest write mode adds to a data set, after the data set's own */
export interface IngestWriteModeColumn {
  readonly name: MILESTONE_INGEST_COLUMNS;
  /** Its type's path */
  readonly type: PRIMITIVE_TYPE | PRECISE_PRIMITIVE_TYPE;
}

/**
 * The columns a batch milestoned write mode adds, in the order the engine
 * returns them: the digest, then the batches a row came in and went out with
 */
export const BATCH_MILESTONED_INGEST_COLUMNS: readonly IngestWriteModeColumn[] =
  [
    {
      name: MILESTONE_INGEST_COLUMNS.INGEST_LAKE_DIGEST,
      type: PRIMITIVE_TYPE.STRING,
    },
    {
      name: MILESTONE_INGEST_COLUMNS.INGEST_LAKE_IN_ID,
      type: PRIMITIVE_TYPE.INTEGER,
    },
    {
      name: MILESTONE_INGEST_COLUMNS.INGEST_LAKE_OUT_ID,
      type: PRIMITIVE_TYPE.INTEGER,
    },
  ];

/**
 * The columns a batch milestoned business temporal write mode adds after
 * those of batch milestoned: the dates a row holds from and through
 */
export const BUSINESS_TEMPORAL_INGEST_COLUMNS: readonly IngestWriteModeColumn[] =
  [
    {
      name: MILESTONE_INGEST_COLUMNS.INGEST_LAKE_FROM,
      type: PRECISE_PRIMITIVE_TYPE.TIMESTAMP,
    },
    {
      name: MILESTONE_INGEST_COLUMNS.INGEST_LAKE_THRU,
      type: PRECISE_PRIMITIVE_TYPE.TIMESTAMP,
    },
  ];

/**
 * The columns the write mode adds to each data set it writes, after the data
 * set's own, in the order the engine returns them: none for append only or
 * no write mode; undefined for a write mode this doesn't know, which may add
 * some
 */
export const getIngestWriteModeColumns = (
  writeMode: IngestWriteMode | undefined,
): readonly IngestWriteModeColumn[] | undefined => {
  if (writeMode instanceof IngestBatchMilestonedBusinessTemporalWriteMode) {
    return [
      ...BATCH_MILESTONED_INGEST_COLUMNS,
      ...BUSINESS_TEMPORAL_INGEST_COLUMNS,
    ];
  } else if (writeMode instanceof IngestBatchMilestonedWriteMode) {
    return BATCH_MILESTONED_INGEST_COLUMNS;
  } else if (
    writeMode === undefined ||
    writeMode instanceof IngestAppendOnlyWriteMode
  ) {
    return [];
  }
  return undefined;
};

/** The write mode the data set is written with: its own, else its definition's */
export const getIngestDatasetWriteMode = (
  dataset: IngestDataset,
  specification: IngestDefinitionSpecification,
): IngestWriteMode | undefined => dataset.writeMode ?? specification.writeMode;

/**
 * An ingest data set, by its definition's path and its name, as a lambda
 * reads it: `#I{definition.dataSet}#`
 */
export class IngestDatasetReference {
  readonly ingestDefinitionPath: string;
  readonly datasetName: string;

  constructor(ingestDefinitionPath: string, datasetName: string) {
    this.ingestDefinitionPath = ingestDefinitionPath;
    this.datasetName = datasetName;
  }
}
