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
  ERR_TYPING,
  MESSAGE_DATA_SPACE_SOURCE_UNSET,
  MESSAGE_DIFFERENT_DATA_SPACES,
  MESSAGE_SOURCE_SCHEMA_UNRESOLVED,
} from '../../messages/CubeMessages.js';
import type { Schema } from '../../schema/Schema.js';
import type { JsonObject } from '../../utils/Json.js';
import type { SnapshotColumnRest } from './RelationalTableSource.js';

/**
 * What a data space source reads (PLAN §11.25): a class of a data space, as
 * the host's query builder queried it. Cube never reads either lambda: the
 * host's editor writes both, and the emitter passes `relation` through. A
 * source added from the source dialog has neither until its editor applies
 * one: it is unset.
 */
export interface DataSpaceCoordinates {
  /** The data space's path, e.g. `trading::TradesDataSpace` */
  readonly dataSpace: string;
  /** The key of the data space's execution context the query runs in */
  readonly executionContext: string;
  /** The path of the class the query starts from, e.g. `trading::Trade` */
  readonly entity?: string | undefined;
  /** The query builder's lambda, as protocol JSON: what the editor opens */
  readonly query?: JsonObject | undefined;
  /**
   * The same query as a Relation, as protocol JSON: a lambda with no
   * parameters and one expression, which is what Cube runs
   */
  readonly relation?: JsonObject | undefined;
}

/** The coordinates of a set source: its query too, as its editor applies it */
export interface DataSpaceQueryCoordinates extends DataSpaceCoordinates {
  readonly entity: string;
  readonly query: JsonObject;
  readonly relation: JsonObject;
}

const NO_COLUMN_REST: ReadonlyMap<string, SnapshotColumnRest> = new Map();

const COORDINATES_REQUIRED = `A data space source needs a data space and an execution context`;

const QUERY_PARTS = `A data space source has an entity, a query and its relation together, or none of them`;

const RELATION_SHAPE = `A data space source's relation must be a lambda with no parameters and one expression`;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Whether a relation has the shape Cube runs: a lambda with no parameters and one expression */
export const isDataSpaceRelation = (relation: JsonObject): boolean => {
  const { _type, body, parameters } = relation;
  return (
    _type === 'lambda' &&
    Array.isArray(body) &&
    body.length === 1 &&
    isJsonObject(body[0]) &&
    (parameters === undefined ||
      (Array.isArray(parameters) && parameters.length === 0))
  );
};

/** The relation's one expression, or an error when it doesn't have the shape Cube runs */
const readRelationExpression = (relation: JsonObject): JsonObject => {
  if (!isDataSpaceRelation(relation)) {
    throw new Error(RELATION_SHAPE);
  }
  return (relation.body as JsonObject[])[0] as JsonObject;
};

/** The coordinates in a value, or an error when one is missing or not the right shape */
const readCoordinates = (value: unknown): DataSpaceCoordinates => {
  if (!isJsonObject(value)) {
    throw new Error(COORDINATES_REQUIRED);
  }
  const { dataSpace, executionContext, entity, query, relation } = value;
  if (!isNonEmptyString(dataSpace) || !isNonEmptyString(executionContext)) {
    throw new Error(COORDINATES_REQUIRED);
  }
  if (entity === undefined && query === undefined && relation === undefined) {
    return { dataSpace, executionContext };
  }
  if (
    !isNonEmptyString(entity) ||
    !isJsonObject(query) ||
    !isJsonObject(relation)
  ) {
    throw new Error(QUERY_PARTS);
  }
  readRelationExpression(relation);
  return { dataSpace, executionContext, entity, query, relation };
};

/** The last segment of a path */
const nameOf = (path: string): string => {
  const index = path.lastIndexOf('::');
  return index < 0 ? path : path.slice(index + 2);
};

/**
 * A class of a data space, queried in the host's query builder (PLAN
 * §11.25): its columns and the rows its filter keeps. Its model is the data
 * space's project, its mapping and runtime its execution context's, all
 * three the cube's. Its columns are the engine's typing of its relation.
 */
export class DataSpaceSource extends SourceNode {
  static readonly TYPE = 'dataSpace';

  readonly dataSpace: string;
  readonly executionContext: string;
  /** None while the source is unset */
  readonly entity: string | undefined;
  readonly query: JsonObject | undefined;
  readonly relation: JsonObject | undefined;
  readonly resolution: SourceResolution;
  /**
   * Unknown keys of the saved schema snapshot's columns, by column name. They
   * stay with the columns of that name when the source is resolved again.
   */
  readonly columnRest: ReadonlyMap<string, SnapshotColumnRest>;

  constructor(
    id: string,
    coordinates: DataSpaceCoordinates,
    resolution: SourceResolution = UNRESOLVED,
    rest?: JsonObject,
    columnRest: ReadonlyMap<string, SnapshotColumnRest> = NO_COLUMN_REST,
  ) {
    super(id, rest);
    const read = readCoordinates(coordinates);
    this.dataSpace = read.dataSpace;
    this.executionContext = read.executionContext;
    this.entity = read.entity;
    this.query = read.query;
    this.relation = read.relation;
    this.resolution = resolution;
    this.columnRest = columnRest;
  }

  /**
   * Builds an unresolved source from what the host's editor returns, which
   * must be the coordinates; other keys are left out.
   */
  static fromCoordinates(id: string, coordinates: unknown): DataSpaceSource {
    return new DataSpaceSource(id, readCoordinates(coordinates));
  }

  get type(): string {
    return DataSpaceSource.TYPE;
  }

  /** The data space's name: the last segment of its path */
  get dataSpaceName(): string {
    return nameOf(this.dataSpace);
  }

  /** The entity's name: the last segment of its path; none while unset */
  get entityName(): string | undefined {
    return this.entity === undefined ? undefined : nameOf(this.entity);
  }

  /** The relation's one expression, which the emitter writes; the source must be set */
  get relationExpression(): JsonObject {
    if (this.relation === undefined) {
      throw new Error(
        `Data space source "${this.id}" has no query yet: its editor writes one`,
      );
    }
    return readRelationExpression(this.relation);
  }

  /** No query has been applied from its editor yet */
  override isUnset(): boolean {
    return this.relation === undefined;
  }

  /** A new source, with the same id and coordinates, and this resolution */
  withResolution(resolution: SourceResolution): DataSpaceSource {
    return new DataSpaceSource(
      this.id,
      this,
      resolution,
      this.rest,
      this.columnRest,
    );
  }

  /**
   * A new source, with the same id, and these coordinates: what the editor
   * applied. It is unresolved, since its columns may have changed.
   */
  withCoordinates(coordinates: DataSpaceCoordinates): DataSpaceSource {
    return new DataSpaceSource(
      this.id,
      coordinates,
      UNRESOLVED,
      this.rest,
      this.columnRest,
    );
  }

  /**
   * Valid once set and resolved to a schema. Set but not resolved, it waits
   * for the engine, which the editor asks as it lands (`ERR_TYPING`, pending
   * rather than a problem); a failed resolution reports the first line of
   * its error.
   */
  validate(inputSchemas: readonly Schema[], errors?: string[]): boolean {
    ensureSchemas(inputSchemas, this.ports);
    if (this.isUnset()) {
      return validate(false, MESSAGE_DATA_SPACE_SOURCE_UNSET, errors);
    }
    if (this.resolution.kind === 'failed') {
      const [firstLine] = this.resolution.message.split('\n');
      return validate(
        false,
        firstLine?.trim() ? firstLine.trim() : MESSAGE_SOURCE_SCHEMA_UNRESOLVED,
        errors,
      );
    }
    return validate(this.resolution.kind === 'resolved', ERR_TYPING, errors);
  }

  schematize(inputSchemas: readonly Schema[]): Schema | undefined {
    ensureSchemas(inputSchemas, this.ports);
    return this.resolution.kind === 'resolved'
      ? this.resolution.schema
      : undefined;
  }

  /**
   * The entity and the data space, by name; the data space alone while
   * unset. Both are known before the engine types the source.
   */
  describe(): string {
    const { entityName } = this;
    return entityName === undefined
      ? `Data space "${this.dataSpaceName}"`
      : `Entity "${entityName}" from data space "${this.dataSpaceName}"`;
  }
}

const isDataSpaceSource = (node: QueryNode): node is DataSpaceSource =>
  node.type === DataSpaceSource.TYPE;

/**
 * A query's data space sources read one data space, in one execution
 * context (PLAN §11.25): the first fixes them, and each other one is
 * invalid, with a message naming both. The cube's model fixes the version.
 */
export const dataSpaceSourcesShareContext: QueryRule = (query: Query) => {
  const [first, ...others] = query.nodes.filter(isDataSpaceSource);
  const errors = new Map<string, string[]>();
  if (first) {
    others
      .filter(
        (source) =>
          source.dataSpace !== first.dataSpace ||
          source.executionContext !== first.executionContext,
      )
      .forEach((source) =>
        errors.set(source.id, [
          MESSAGE_DIFFERENT_DATA_SPACES(
            `${source.dataSpace} (${source.executionContext})`,
            `${first.dataSpace} (${first.executionContext})`,
          ),
        ]),
      );
  }
  return errors;
};
