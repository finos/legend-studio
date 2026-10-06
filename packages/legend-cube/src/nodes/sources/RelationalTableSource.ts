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

import type { Query } from '../../graph/Query.js';
import {
  type QueryNode,
  SourceNode,
  type SourceResolution,
  UNRESOLVED,
} from '../../graph/QueryNode.js';
import type { QueryRule } from '../../inference/SchemaInference.js';
import { ensureSchemas, validate } from '../../inference/ValidationUtils.js';
import {
  MESSAGE_DIFFERENT_DATABASES,
  MESSAGE_SOURCE_SCHEMA_UNRESOLVED,
} from '../../messages/CubeMessages.js';
import type { Schema } from '../../schema/Schema.js';

/** Where a table is: its Database element (by path), and its schema and name in that database */
export interface RelationalTableCoordinates {
  readonly database: string;
  readonly schema: string;
  readonly table: string;
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

/**
 * Names are stored as in the Database element, quotes included (e.g. `"a.b"`),
 * because the engine needs them; display drops one pair of surrounding quotes.
 */
const toDisplayName = (name: string): string =>
  name.length > 1 && name.startsWith('"') && name.endsWith('"')
    ? name.slice(1, -1)
    : name;

/** A table of a relational database, read through the model's Database element */
export class RelationalTableSource extends SourceNode {
  static readonly TYPE = 'relational';

  /** The path of the Database element */
  readonly database: string;
  /** The database schema the table is in */
  readonly schema: string;
  readonly table: string;
  readonly resolution: SourceResolution;

  constructor(
    id: string,
    coordinates: RelationalTableCoordinates,
    resolution: SourceResolution = UNRESOLVED,
  ) {
    super(id);
    if (
      !isNonEmptyString(coordinates.database) ||
      !isNonEmptyString(coordinates.schema) ||
      !isNonEmptyString(coordinates.table)
    ) {
      throw new Error(
        `A relational table source needs a database, a schema and a table`,
      );
    }
    this.database = coordinates.database;
    this.schema = coordinates.schema;
    this.table = coordinates.table;
    this.resolution = resolution;
  }

  /**
   * Builds an unresolved source from what the source picker returns, which
   * must be the table's coordinates.
   */
  static fromCoordinates(
    id: string,
    coordinates: unknown,
  ): RelationalTableSource {
    if (typeof coordinates !== 'object' || coordinates === null) {
      throw new Error(
        `A relational table source needs a database, a schema and a table`,
      );
    }
    const { database, schema, table } = coordinates as Record<string, unknown>;
    if (
      !isNonEmptyString(database) ||
      !isNonEmptyString(schema) ||
      !isNonEmptyString(table)
    ) {
      throw new Error(
        `A relational table source needs a database, a schema and a table`,
      );
    }
    return new RelationalTableSource(id, { database, schema, table });
  }

  get type(): string {
    return RelationalTableSource.TYPE;
  }

  /** A new source, with the same id and coordinates, and this resolution */
  withResolution(resolution: SourceResolution): RelationalTableSource {
    return new RelationalTableSource(this.id, this, resolution);
  }

  /**
   * Valid once resolved to a schema. A failed resolution reports the first
   * line of its error, as the engine gave it.
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

  /** The connection is left out on purpose: the database path is long */
  describe(): string {
    return this.resolution.kind === 'unresolved'
      ? '(unknown)'
      : `Table "${toDisplayName(this.table)}" from schema "${toDisplayName(this.schema)}"`;
  }
}

const isRelationalTableSource = (
  node: QueryNode,
): node is RelationalTableSource => node.type === RelationalTableSource.TYPE;

/**
 * A query reads from one Database element for now: every relational source
 * must address the same one as the first relational source of the query.
 */
export const relationalSourcesShareDatabase: QueryRule = (query: Query) => {
  const sources = query.nodes.filter(isRelationalTableSource);
  const [first, ...others] = sources;
  const errors = new Map<string, string[]>();
  if (first) {
    others
      .filter((source) => source.database !== first.database)
      .forEach((source) =>
        errors.set(source.id, [
          MESSAGE_DIFFERENT_DATABASES(source.database, first.database),
        ]),
      );
  }
  return errors;
};
