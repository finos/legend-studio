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
  type CubeContext,
  isSchemasError,
  needsDatabaseType,
  type Query,
  type Schema,
} from '@finos/legend-cube';
import { assertErrorThrown, type GeneratorFn } from '@finos/legend-shared';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type CubeResult,
  type CubeResultValue,
} from '../graph-manager/CubeEngine.js';
import type { CubeEditorState } from './CubeEditorState.js';

/** What the grid shows of a run: the rows within the limit, under the schema the run was made with */
export interface CubeExecutionResult {
  /** Counts the page's runs: the grid is built anew for each */
  readonly id: number;
  /** The query that ran: results are stale once the document holds another */
  readonly query: Query;
  /** The context it ran in: results are stale once the document holds another, e.g. another warehouse */
  readonly context: CubeContext | undefined;
  /** The warehouse a data product cube ran on, its own or the viewer's: results are stale once another is used */
  readonly warehouse: string | undefined;
  /** The capture node's schema when the run started; the grid's columns, by position */
  readonly schema: Schema;
  /** At most `rowLimit` rows */
  readonly rows: readonly (readonly CubeResultValue[])[];
  readonly rowLimit: number;
  /** The engine returned more than `rowLimit` rows */
  readonly limited: boolean;
  readonly sql: readonly string[];
  readonly durationMs: number;
}

/**
 * The first error found walking up from the capture node, named by its node.
 * A node that is invalid only because an input is gets passed over for that
 * input's own error.
 */
const findUpstreamError = (
  query: Query,
  validity: ReadonlyMap<string, readonly string[]>,
  captureId: string,
): string => {
  const visit = (nodeId: string): string | undefined => {
    const node = query.getNode(nodeId);
    if (!node) {
      return undefined;
    }
    for (const inputId of query.getInputIds(nodeId)) {
      const error = inputId === undefined ? undefined : visit(inputId);
      if (error) {
        return error;
      }
    }
    const error = (validity.get(nodeId) ?? []).find(
      (message) => !isSchemasError(message),
    );
    return error === undefined ? undefined : `${node.describe()}: ${error}`;
  };
  return (
    visit(captureId) ?? 'The node to run, or one of its inputs, has errors.'
  );
};

/**
 * Runs the query up to its capture node (PLAN §8.2, §9). Execution is
 * explicit; while a run is in flight Execute becomes Stop, and only the latest
 * run's answer is applied (Settled before M1.8).
 */
export class CubeExecutionState {
  readonly editorState: CubeEditorState;

  result: CubeExecutionResult | undefined;
  error: CubeEngineError | undefined;
  /** The abort controller of the run in flight, if any */
  private runController: AbortController | undefined;
  private runCount = 0;

  constructor(editorState: CubeEditorState) {
    makeObservable<CubeExecutionState, 'runController'>(this, {
      result: observable.ref,
      error: observable.ref,
      runController: observable.ref,
      isRunning: computed,
      isStale: computed,
      disabledReasons: computed,
      canExecute: computed,
      execute: flow,
      clearError: action,
      stop: action,
      reset: action,
    });
    this.editorState = editorState;
  }

  get isRunning(): boolean {
    return this.runController !== undefined;
  }

  /** The shown result no longer matches the query, the context or the row limit; it is kept until the next run */
  get isStale(): boolean {
    return (
      this.result !== undefined &&
      !this.isRunning &&
      (this.result.query !== this.editorState.document.query ||
        this.result.context !== this.editorState.document.context ||
        this.result.warehouse !==
          this.editorState.dataProductRuntime.effectiveWarehouse ||
        this.result.rowLimit !== this.editorState.rowLimit)
    );
  }

  /**
   * Why Execute is unavailable, if it is: it needs a source, a model and a
   * runtime, and a valid capture node whose inputs are all valid. Invalid
   * nodes elsewhere don't matter (PLAN §10.3).
   */
  get disabledReasons(): string[] {
    const { document, emitter, analysis } = this.editorState;
    const { query, context } = document;
    if (!query.nodes.length) {
      return ['Add a table first.'];
    }
    const reasons: string[] = [];
    if (!context) {
      reasons.push('The cube has no model.');
    } else if (!context.runtime) {
      reasons.push('The cube has no runtime.');
    }
    const captureId = query.selected;
    if (captureId === undefined) {
      reasons.push('Select the node to run.');
    } else if (
      !emitter.canEmit(captureId) ||
      // as the editor sees it: an Extend typed for another input waits
      (analysis.validity.get(captureId) ?? []).length > 0
    ) {
      reasons.push(findUpstreamError(query, analysis.validity, captureId));
    }
    return reasons;
  }

  get canExecute(): boolean {
    return !this.disabledReasons.length;
  }

  *execute(): GeneratorFn<void> {
    if (this.isRunning || !this.canExecute) {
      return;
    }
    const { document, emitter, analysis, rowLimit, host } = this.editorState;
    const { query, context } = document;
    const warehouse = this.editorState.dataProductRuntime.effectiveWarehouse;
    // checked by canExecute
    const captureId = query.selected as string;
    const model = context?.model;
    const runtime = context?.runtime;
    const schema = analysis.schemas.get(captureId);
    if (!model || !runtime || !schema) {
      return;
    }
    // the run starts before any wait, so Stop works and a second F9 is ignored
    const controller = new AbortController();
    this.runController = controller;
    this.error = undefined;
    this.editorState.clearHostIssues();
    try {
      // a Drop, Slice, Limit or Distinct is written for the database it runs on
      // (PLAN §11.4), which the model's outline gives: loaded once, waited
      // for only then; the query, model and runtime are the ones captured
      let databaseType: string | undefined;
      if (needsDatabaseType(query, captureId)) {
        yield flowResult(this.editorState.loadModelOutline(model));
        if (this.runController !== controller || controller.signal.aborted) {
          return;
        }
        databaseType = this.editorState.getRunDatabaseType(
          query,
          captureId,
          model,
          runtime,
        );
      }
      const lambda = emitter.emitExecutionLambda({
        rowLimit,
        runtime,
        databaseType,
      });
      const response = (yield host.engine.execute(model, lambda, {
        abortController: controller,
      })) as CubeResult;
      if (this.runController !== controller) {
        return;
      }
      // rows are read by position, so the engine's columns must be the query's
      if (response.columns.length !== schema.columns.length) {
        throw new CubeEngineError(
          CubeEngineErrorKind.EXECUTION,
          `The engine returned ${response.columns.length} columns, but the query has ${schema.columns.length}`,
          captureId,
        );
      }
      const misplaced = schema.columns.findIndex(
        (column, position) => response.columns[position] !== column.name,
      );
      if (misplaced !== -1) {
        throw new CubeEngineError(
          CubeEngineErrorKind.EXECUTION,
          `The engine returned the column "${response.columns[misplaced]}" at position ${misplaced + 1}, but the query has "${schema.columns[misplaced]?.name}" there`,
          captureId,
        );
      }
      const limited = response.rows.length > rowLimit;
      this.result = {
        id: ++this.runCount,
        query,
        context,
        warehouse,
        schema,
        rows: limited ? response.rows.slice(0, rowLimit) : response.rows,
        rowLimit,
        limited,
        sql: response.sql,
        durationMs: response.durationMs,
      };
    } catch (error) {
      // a stopped or replaced run shows nothing
      if (this.runController !== controller || controller.signal.aborted) {
        return;
      }
      assertErrorThrown(error);
      const engineError =
        error instanceof CubeEngineError
          ? error
          : new CubeEngineError(
              CubeEngineErrorKind.EXECUTION,
              error.message,
              captureId,
            );
      // the rows of an earlier run are never shown as this run's
      this.result = undefined;
      // an error belongs to the query and the context it came from: one
      // that changed while the run was in flight drops it, as an edit after
      // the run would
      if (
        this.editorState.document.query === query &&
        this.editorState.document.context === context
      ) {
        this.error = engineError;
        this.editorState.setHostIssue(
          engineError.nodeId ?? captureId,
          engineError,
        );
      }
    } finally {
      if (this.runController === controller) {
        this.runController = undefined;
      }
    }
  }

  /** Drops the last run's error: it described a query the cube no longer has */
  clearError(): void {
    this.error = undefined;
  }

  /** Cancels the run in flight; it shows no result and no error */
  stop(): void {
    this.runController?.abort();
    this.runController = undefined;
  }

  /** Stops any run and forgets the last one's rows and error, e.g. when another cube is opened */
  reset(): void {
    this.stop();
    this.result = undefined;
    this.error = undefined;
  }
}
