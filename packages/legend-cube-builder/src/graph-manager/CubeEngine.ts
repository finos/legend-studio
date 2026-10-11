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

import type { IR, JsonObject, ModelContext, Schema } from '@finos/legend-cube';

// The engine port (PLAN §8.7): what Cube asks of an engine, in Cube's own
// terms. Only its Legend implementation, under `protocol/pure/v1/`, knows the
// protocol; nothing here names a V1_* type

/** A query node's id */
export type NodeId = string;

/** A table's Database element path, schema name and table name, names as stored (quotes included) */
export type AccessorPath = readonly [
  database: string,
  schema: string,
  table: string,
];

/** Why a table can't be picked as it is, read from its definition (PLAN §6.2.6) */
export enum CubeTableFlag {
  /** a binary column: the engine can't type the table */
  UNAVAILABLE = 'unavailable',
  /** a CHAR(n) column: typed with a length of 1 */
  LENGTH_UNKNOWN = 'lengthUnknown',
  /** an OTHER or ARRAY column: typed as a bare String */
  TYPE_UNKNOWN = 'typeUnknown',
}

export interface CubeOutlineTable {
  /** As stored, quotes included */
  readonly name: string;
  /** Views are typed as text of length 0, so the picker hides them in v1 */
  readonly isView: boolean;
  readonly columnCount: number;
  readonly flags: readonly CubeTableFlag[];
  /**
   * The columns typed as a bare String because Cube can't read their type
   * (OTHER or ARRAY), unquoted as in the table's schema
   */
  readonly untypedColumns: readonly string[];
}

export interface CubeOutlineSchema {
  readonly name: string;
  readonly tables: readonly CubeOutlineTable[];
}

export interface CubeOutlineDatabase {
  readonly path: string;
  readonly schemas: readonly CubeOutlineSchema[];
}

/** A relational connection of a runtime, for the operations some databases take another way (PLAN §11.4) */
export interface CubeOutlineConnection {
  /** The store it is keyed by */
  readonly storePath: string;
  /** The engine's name for its database type, e.g. `H2` or `SqlServer` */
  readonly databaseType: string;
}

export interface CubeOutlineRuntime {
  readonly path: string;
  /** The stores its connections are keyed by, exactly; includes are not followed (PLAN §6.2.5) */
  readonly storePaths: readonly string[];
  /**
   * Its relational connections that name a database type, a list rather
   * than a record keyed by a store path from the model; optional, as an
   * outline from before M2 has none
   */
  readonly connections?: readonly CubeOutlineConnection[];
}

/** What a model offers the source picker: its databases and runtimes, as plain data */
export interface CubeModelOutline {
  readonly databases: readonly CubeOutlineDatabase[];
  readonly runtimes: readonly CubeOutlineRuntime[];
}

export enum CubeEngineErrorKind {
  /** the model or a lambda doesn't compile, or a table can't be typed */
  COMPILE = 'compile',
  /** the query failed while running, or its result can't be read */
  EXECUTION = 'execution',
  /** the cube's model is of a kind this version can't run */
  UNSUPPORTED_MODEL = 'unsupportedModel',
  /** the engine couldn't be reached, or answered with no readable error */
  NETWORK = 'network',
}

/**
 * Where in a text the engine places a problem: the source id the text was
 * parsed under, and its 1-based first and last lines and columns, the last
 * column included (an Extend column's expression, PLAN §11.7)
 */
export interface CubeSourceLocation {
  readonly sourceId: string;
  readonly startLine: number;
  readonly startColumn: number;
  readonly endLine: number;
  readonly endColumn: number;
}

/**
 * An expression's text as the engine's JSON (PLAN §11.7), its number
 * literals as their digit strings: as a column stores it, with no source
 * information, and as the engine located it in the text, so a later error
 * can point into the text
 */
export interface CubeParsedExpression {
  readonly lambda: JsonObject;
  readonly located: JsonObject;
}

/**
 * An engine failure, placed on the node it concerns: the node a stamp in the
 * error points to, else the source being typed or the node being run.
 */
export class CubeEngineError extends Error {
  readonly kind: CubeEngineErrorKind;
  readonly nodeId: NodeId | undefined;
  /** The part of the node the error points to (an `EmitRole`), when it is located */
  readonly role: string | undefined;
  /** The first line of the engine's message, shown on the node */
  readonly firstLine: string;
  /** The engine's whole message, without its Java trace, shown in the panel */
  readonly detail: string;
  /** Where in a text the error is, when the text was parsed with its locations */
  readonly location: CubeSourceLocation | undefined;

  constructor(
    kind: CubeEngineErrorKind,
    detail: string,
    nodeId?: NodeId,
    role?: string,
    location?: CubeSourceLocation,
  ) {
    const firstLine = detail.split('\n', 1)[0]?.trim() ?? '';
    super(firstLine);
    this.name = 'CubeEngineError';
    this.kind = kind;
    this.detail = detail;
    this.firstLine = firstLine;
    this.nodeId = nodeId;
    this.role = role;
    this.location = location;
  }
}

/** A value of a result cell: Integer and Decimal values as their exact text, Float values as numbers (PLAN §8.7) */
export type CubeResultValue = string | number | boolean | null;

export interface CubeResult {
  /** Column names, in order; rows match them by position */
  readonly columns: readonly string[];
  /** As many rows as the engine sent, up to the row limit + 1 */
  readonly rows: readonly (readonly CubeResultValue[])[];
  /** The SQL statements the engine ran */
  readonly sql: readonly string[];
  readonly durationMs: number;
}

export interface CubeEngine {
  /** The databases and runtimes of a model, parsed once */
  loadModel(model: ModelContext): Promise<CubeModelOutline>;
  /** The schema of each table, in one engine call: one entry per key, failures included */
  resolveSchemas(
    model: ModelContext,
    accessors: ReadonlyMap<NodeId, AccessorPath>,
  ): Promise<Map<NodeId, Schema | CubeEngineError>>;
  /** The schema of each lambda, in one engine call: one entry per key, failures included */
  typeLambdas(
    model: ModelContext,
    lambdas: ReadonlyMap<NodeId, IR>,
  ): Promise<Map<NodeId, Schema | CubeEngineError>>;
  /** Runs an execution lambda; rejects with a `CubeEngineError` */
  execute(
    model: ModelContext,
    lambda: IR,
    options?: { abortController?: AbortController | undefined },
  ): Promise<CubeResult>;
  /** The Pure text of a lambda, for display only: never parsed back */
  renderPure(lambda: IR): Promise<string>;
  /**
   * An Extend column's expression as the engine's JSON (PLAN §11.7), located
   * under the source id; rejects with a `CubeEngineError` placed in the text
   */
  parseExpression(
    code: string,
    sourceId: string,
  ): Promise<CubeParsedExpression>;
  /**
   * Plans an execution lambda for its runtime's database, as a run would,
   * without running it: some expressions type, then fail when planned (PLAN
   * §11.7). Rejects with a `CubeEngineError`
   */
  planLambda(model: ModelContext, lambda: IR): Promise<void>;
}
