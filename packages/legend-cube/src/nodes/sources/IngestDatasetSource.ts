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
  SourceNode,
  type SourceResolution,
  UNRESOLVED,
} from '../../graph/QueryNode.js';
import { ensureSchemas, validate } from '../../inference/ValidationUtils.js';
import { IngestDatasetQualifier } from '../../ir/CubeIR.js';
import { MESSAGE_SOURCE_SCHEMA_UNRESOLVED } from '../../messages/CubeMessages.js';
import type { Schema } from '../../schema/Schema.js';
import type { JsonObject } from '../../utils/Json.js';
import type { SnapshotColumnRest } from './RelationalTableSource.js';

/**
 * Which data set a source reads: a data set of a deployed ingest definition,
 * as Data Cube picks one (the definition's URN, then a data set), and what
 * of it, its rows unless a qualifier says otherwise. The class (production or
 * production parallel), the producer deployment and the warehouse are the
 * cube's, not the source's.
 */
export interface IngestDatasetCoordinates {
  /** The deployed definition's URN, as the ingest server lists it */
  readonly ingestDefinitionUrn: string;
  /** The path of the IngestDefinition element */
  readonly ingestDefinition: string;
  /** The data set's name */
  readonly dataSet: string;
  /** What it reads of the data set other than its rows, e.g. its batch metadata; none for its rows */
  readonly qualifier?: IngestDatasetQualifier | undefined;
}

const NO_COLUMN_REST: ReadonlyMap<string, SnapshotColumnRest> = new Map();

const COORDINATE_KEYS = [
  'ingestDefinitionUrn',
  'ingestDefinition',
  'dataSet',
] as const;

const COORDINATES_REQUIRED = `An ingest data set source needs an ingest definition URN, an ingest definition and a data set`;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

/** A qualifier Cube reads, or none for the data set's rows */
const readIngestDatasetQualifier = (
  value: unknown,
): IngestDatasetQualifier | undefined => {
  if (value === undefined) {
    return undefined;
  }
  const qualifier = Object.values(IngestDatasetQualifier).find(
    (each) => each === value,
  );
  if (qualifier === undefined) {
    throw new Error(
      `An ingest data set source reads its rows or one of ${Object.values(
        IngestDatasetQualifier,
      ).join(', ')}, not ${JSON.stringify(value)}`,
    );
  }
  return qualifier;
};

/** The coordinates in a value, or an error when one is missing or not text */
const readCoordinates = (value: unknown): IngestDatasetCoordinates => {
  if (typeof value !== 'object' || value === null) {
    throw new Error(COORDINATES_REQUIRED);
  }
  const fields = value as Record<string, unknown>;
  COORDINATE_KEYS.forEach((key) => {
    if (!isNonEmptyString(fields[key])) {
      throw new Error(COORDINATES_REQUIRED);
    }
  });
  return {
    ingestDefinitionUrn: fields.ingestDefinitionUrn as string,
    ingestDefinition: fields.ingestDefinition as string,
    dataSet: fields.dataSet as string,
    qualifier: readIngestDatasetQualifier(fields.qualifier),
  };
};

/**
 * One data set of a deployed ingest definition: its rows, read through
 * `#I{ingestDefinition.dataSet}#`, or its batch metadata, through
 * `#I{ingestDefinition.dataSet|metadata}#`
 */
export class IngestDatasetSource extends SourceNode {
  static readonly TYPE = 'ingestDataset';

  readonly ingestDefinitionUrn: string;
  readonly ingestDefinition: string;
  readonly dataSet: string;
  /** What it reads of the data set other than its rows; none for its rows */
  readonly qualifier: IngestDatasetQualifier | undefined;
  readonly resolution: SourceResolution;
  /**
   * Unknown keys of the saved schema snapshot's columns, by column name. They
   * stay with the columns of that name when the source is resolved again.
   */
  readonly columnRest: ReadonlyMap<string, SnapshotColumnRest>;

  constructor(
    id: string,
    coordinates: IngestDatasetCoordinates,
    resolution: SourceResolution = UNRESOLVED,
    rest?: JsonObject,
    columnRest: ReadonlyMap<string, SnapshotColumnRest> = NO_COLUMN_REST,
  ) {
    super(id, rest);
    const read = readCoordinates(coordinates);
    this.ingestDefinitionUrn = read.ingestDefinitionUrn;
    this.ingestDefinition = read.ingestDefinition;
    this.dataSet = read.dataSet;
    this.qualifier = read.qualifier;
    this.resolution = resolution;
    this.columnRest = columnRest;
  }

  /**
   * Builds an unresolved source from what the source picker returns, which
   * must be the data set's coordinates; other keys are left out.
   */
  static fromCoordinates(
    id: string,
    coordinates: unknown,
  ): IngestDatasetSource {
    return new IngestDatasetSource(id, readCoordinates(coordinates));
  }

  get type(): string {
    return IngestDatasetSource.TYPE;
  }

  /** The ingest definition's element name: the last segment of its path */
  get ingestDefinitionName(): string {
    const index = this.ingestDefinition.lastIndexOf('::');
    return index < 0
      ? this.ingestDefinition
      : this.ingestDefinition.slice(index + 2);
  }

  /** Whether it reads the data set's batch metadata, not its rows */
  get readsMetadata(): boolean {
    return this.qualifier === IngestDatasetQualifier.METADATA;
  }

  /** What it reads, in words, whether or not its columns are known */
  describeDataSet(): string {
    const dataSet = `"${this.dataSet}" from ingest definition "${this.ingestDefinitionName}"`;
    return this.readsMetadata
      ? `Batch metadata of data set ${dataSet}`
      : `Data set ${dataSet}`;
  }

  /** A new source, with the same id and coordinates, and this resolution */
  withResolution(resolution: SourceResolution): IngestDatasetSource {
    return new IngestDatasetSource(
      this.id,
      this,
      resolution,
      this.rest,
      this.columnRest,
    );
  }

  /**
   * Valid once resolved to a schema. A failed resolution reports the first
   * line of its error.
   */
  validate(inputSchemas: readonly Schema[], errors?: string[]): boolean {
    ensureSchemas(inputSchemas, this.ports);
    if (this.resolution.kind === 'failed') {
      const [firstLine] = this.resolution.message.split('\n');
      return validate(
        false,
        firstLine?.trim() ? firstLine.trim() : MESSAGE_SOURCE_SCHEMA_UNRESOLVED,
        errors,
      );
    }
    return validate(
      this.resolution.kind === 'resolved',
      MESSAGE_SOURCE_SCHEMA_UNRESOLVED,
      errors,
    );
  }

  schematize(inputSchemas: readonly Schema[]): Schema | undefined {
    ensureSchemas(inputSchemas, this.ports);
    return this.resolution.kind === 'resolved'
      ? this.resolution.schema
      : undefined;
  }

  /** Never the URN, the producer deployment, the environment or the warehouse */
  describe(): string {
    return this.resolution.kind === 'unresolved'
      ? '(unknown)'
      : this.describeDataSet();
  }
}
