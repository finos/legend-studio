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
 * Which deployed service a source reads (PLAN §6.4): its URL pattern, which
 * the engine's SQL reads a service by, and its name, for people
 */
export interface ServiceCoordinates {
  /** The service's URL pattern, e.g. `/trades/byDesk` */
  readonly pattern: string;
  /** The service's name, as the engine's service registry gives it */
  readonly service: string;
}

const NO_COLUMN_REST: ReadonlyMap<string, SnapshotColumnRest> = new Map();

const COORDINATES_REQUIRED = `A service source needs a pattern and a service`;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

/** The coordinates in a value, or an error when one is missing or not text */
const readCoordinates = (value: unknown): ServiceCoordinates => {
  if (typeof value !== 'object' || value === null) {
    throw new Error(COORDINATES_REQUIRED);
  }
  const { pattern, service } = value as Record<string, unknown>;
  if (!isNonEmptyString(pattern) || !isNonEmptyString(service)) {
    throw new Error(COORDINATES_REQUIRED);
  }
  return { pattern, service };
};

/**
 * A deployed service, in progress (PLAN §6.4): a cube can pick one, but how
 * it is read and typed is still to come, so the host leaves it unresolved
 * or failed and it never runs
 */
export class ServiceSource extends SourceNode {
  static readonly TYPE = 'service';

  readonly pattern: string;
  readonly service: string;
  readonly resolution: SourceResolution;
  /**
   * Unknown keys of the saved schema snapshot's columns, by column name. They
   * stay with the columns of that name when the source is resolved again.
   */
  readonly columnRest: ReadonlyMap<string, SnapshotColumnRest>;

  constructor(
    id: string,
    coordinates: ServiceCoordinates,
    resolution: SourceResolution = UNRESOLVED,
    rest?: JsonObject,
    columnRest: ReadonlyMap<string, SnapshotColumnRest> = NO_COLUMN_REST,
  ) {
    super(id, rest);
    const read = readCoordinates(coordinates);
    this.pattern = read.pattern;
    this.service = read.service;
    this.resolution = resolution;
    this.columnRest = columnRest;
  }

  /**
   * Builds an unresolved source from what the source picker returns, which
   * must be the service's coordinates; other keys are left out.
   */
  static fromCoordinates(id: string, coordinates: unknown): ServiceSource {
    return new ServiceSource(id, readCoordinates(coordinates));
  }

  get type(): string {
    return ServiceSource.TYPE;
  }

  /** The service's element name: the last segment of its name when it is a path */
  get serviceName(): string {
    const index = this.service.lastIndexOf('::');
    return index < 0 ? this.service : this.service.slice(index + 2);
  }

  /** A new source, with the same id and coordinates, and this resolution */
  withResolution(resolution: SourceResolution): ServiceSource {
    return new ServiceSource(
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

  /** The service by name and pattern, as the registry lists it */
  describe(): string {
    return this.resolution.kind === 'unresolved'
      ? '(unknown)'
      : `Service "${this.serviceName}" at ${this.pattern}`;
  }
}
