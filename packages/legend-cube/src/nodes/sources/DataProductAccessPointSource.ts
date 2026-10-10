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
import { MESSAGE_SOURCE_SCHEMA_UNRESOLVED } from '../../messages/CubeMessages.js';
import type { Schema } from '../../schema/Schema.js';
import type { JsonObject } from '../../utils/Json.js';
import type { SnapshotColumnRest } from './RelationalTableSource.js';

/**
 * Which access point a source reads (PLAN §6.8): the data product's element
 * and the access point, with the ids the catalog and its links need. The
 * project, its version and the warehouse are the cube's, not the source's.
 */
export interface DataProductAccessPointCoordinates {
  /** The path of the DataProduct element */
  readonly dataProduct: string;
  /** The id of the access point group the access point is in */
  readonly accessPointGroup: string;
  /** The id of the access point */
  readonly accessPoint: string;
  /** The data product's id, as the catalog and its links know it */
  readonly dataProductId: string;
  /** The deployment the access point was picked from, as text */
  readonly deploymentId: string;
}

const NO_COLUMN_REST: ReadonlyMap<string, SnapshotColumnRest> = new Map();

const COORDINATE_KEYS = [
  'dataProduct',
  'accessPointGroup',
  'accessPoint',
  'dataProductId',
  'deploymentId',
] as const;

const COORDINATES_REQUIRED = `A data product access point source needs a data product, an access point group, an access point, a data product id and a deployment id`;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

/** The coordinates in a value, or an error when one is missing or not text */
const readCoordinates = (value: unknown): DataProductAccessPointCoordinates => {
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
    dataProduct: fields.dataProduct as string,
    accessPointGroup: fields.accessPointGroup as string,
    accessPoint: fields.accessPoint as string,
    dataProductId: fields.dataProductId as string,
    deploymentId: fields.deploymentId as string,
  };
};

/** One access point of a deployed data product, read through `#P{dataProduct.accessPoint}#` */
export class DataProductAccessPointSource extends SourceNode {
  static readonly TYPE = 'dataProductAccessPoint';

  readonly dataProduct: string;
  readonly accessPointGroup: string;
  readonly accessPoint: string;
  readonly dataProductId: string;
  readonly deploymentId: string;
  readonly resolution: SourceResolution;
  /**
   * Unknown keys of the saved schema snapshot's columns, by column name. They
   * stay with the columns of that name when the source is resolved again.
   */
  readonly columnRest: ReadonlyMap<string, SnapshotColumnRest>;

  constructor(
    id: string,
    coordinates: DataProductAccessPointCoordinates,
    resolution: SourceResolution = UNRESOLVED,
    rest?: JsonObject,
    columnRest: ReadonlyMap<string, SnapshotColumnRest> = NO_COLUMN_REST,
  ) {
    super(id, rest);
    const read = readCoordinates(coordinates);
    this.dataProduct = read.dataProduct;
    this.accessPointGroup = read.accessPointGroup;
    this.accessPoint = read.accessPoint;
    this.dataProductId = read.dataProductId;
    this.deploymentId = read.deploymentId;
    this.resolution = resolution;
    this.columnRest = columnRest;
  }

  /**
   * Builds an unresolved source from what the source picker returns, which
   * must be the access point's coordinates; other keys are left out.
   */
  static fromCoordinates(
    id: string,
    coordinates: unknown,
  ): DataProductAccessPointSource {
    return new DataProductAccessPointSource(id, readCoordinates(coordinates));
  }

  get type(): string {
    return DataProductAccessPointSource.TYPE;
  }

  /** The data product's element name: the last segment of its path */
  get dataProductName(): string {
    const index = this.dataProduct.lastIndexOf('::');
    return index < 0 ? this.dataProduct : this.dataProduct.slice(index + 2);
  }

  /** A new source, with the same id and coordinates, and this resolution */
  withResolution(resolution: SourceResolution): DataProductAccessPointSource {
    return new DataProductAccessPointSource(
      this.id,
      this,
      resolution,
      this.rest,
      this.columnRest,
    );
  }

  /**
   * Valid once resolved to a schema. A failed resolution reports the first
   * line of its error. An access point that is gone fails to resolve, and one
   * with parameters is never added, so neither needs its own check.
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

  /** Never the project, its version, the environment or the warehouse */
  describe(): string {
    return this.resolution.kind === 'unresolved'
      ? '(unknown)'
      : `Access point "${this.accessPoint}" from data product "${this.dataProductName}"`;
  }
}
