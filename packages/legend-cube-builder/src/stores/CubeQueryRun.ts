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
  type ModelContext,
  needsDatabaseType,
  type Query,
  QueryEmitter,
  type Schema,
} from '@finos/legend-cube';
import { flowResult } from 'mobx';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type CubeResultValue,
} from '../graph-manager/CubeEngine.js';
import type { CubeEditorState } from './CubeEditorState.js';

/** A query to run up to its selected node, with what it runs in */
export interface CubeQueryRunRequest {
  /** The query, its selected node the one to run */
  readonly query: Query;
  readonly model: ModelContext;
  readonly runtime: string;
  /** The schema Cube infers for the node: the engine's columns must be these */
  readonly schema: Schema;
  /** The most rows to keep: one more is fetched to tell whether there are more */
  readonly rowLimit: number;
  readonly abortController: AbortController;
}

export interface CubeQueryRunResult {
  /** At most `rowLimit` rows, by the schema's column positions */
  readonly rows: readonly (readonly CubeResultValue[])[];
  /** The engine returned more than `rowLimit` rows */
  readonly limited: boolean;
  readonly sql: readonly string[];
  readonly durationMs: number;
}

/** Thrown when a run is aborted while it waits for the model's outline */
export class CubeQueryRunAborted extends Error {
  constructor() {
    super('The run was stopped');
    this.name = 'CubeQueryRunAborted';
  }
}

/**
 * Runs a query up to its selected node (PLAN §8.2, §9), as Execute and the
 * grid's fetches do (PLAN §11.10): a Drop, Slice, Limit or Distinct is written
 * for the database it runs on (PLAN §11.4), which the model's outline gives,
 * loaded once and waited for only then; the row limit is the emitter's
 * `limit(rowLimit + 1)`. The engine's columns are checked against the schema,
 * since rows are read by position. Rejects with a `CubeEngineError`, or a
 * `CubeQueryRunAborted` when aborted before the engine is called.
 */
export const runCubeQuery = async (
  editorState: CubeEditorState,
  request: CubeQueryRunRequest,
): Promise<CubeQueryRunResult> => {
  const { query, model, runtime, schema, rowLimit, abortController } = request;
  const nodeId = query.selected;
  if (nodeId === undefined) {
    throw new Error('A query to run has a selected node');
  }
  let databaseType: string | undefined;
  if (needsDatabaseType(query, nodeId)) {
    await flowResult(editorState.loadModelOutline(model));
    if (abortController.signal.aborted) {
      throw new CubeQueryRunAborted();
    }
    databaseType = editorState.getRunDatabaseType(
      query,
      nodeId,
      model,
      runtime,
    );
  }
  const lambda = new QueryEmitter(
    query,
    editorState.registry,
  ).emitExecutionLambda({ rowLimit, runtime, databaseType });
  const response = await editorState.host.engine.execute(model, lambda, {
    abortController,
  });
  // rows are read by position, so the engine's columns must be the query's
  if (response.columns.length !== schema.columns.length) {
    throw new CubeEngineError(
      CubeEngineErrorKind.EXECUTION,
      `The engine returned ${response.columns.length} columns, but the query has ${schema.columns.length}`,
      nodeId,
    );
  }
  const misplaced = schema.columns.findIndex(
    (column, position) => response.columns[position] !== column.name,
  );
  if (misplaced !== -1) {
    throw new CubeEngineError(
      CubeEngineErrorKind.EXECUTION,
      `The engine returned the column "${response.columns[misplaced]}" at position ${misplaced + 1}, but the query has "${schema.columns[misplaced]?.name}" there`,
      nodeId,
    );
  }
  const limited = response.rows.length > rowLimit;
  return {
    rows: limited ? response.rows.slice(0, rowLimit) : response.rows,
    limited,
    sql: response.sql,
    durationMs: response.durationMs,
  };
};
