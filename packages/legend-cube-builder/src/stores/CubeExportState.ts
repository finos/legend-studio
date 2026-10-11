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
  checkDrilldown,
  type ColumnDirection,
  deriveDrilldownLevel,
  needsDatabaseType,
  QueryEmitter,
} from '@finos/legend-cube';
import {
  assertErrorThrown,
  ContentType,
  downloadFileUsingDataURI,
  type GeneratorFn,
} from '@finos/legend-shared';
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
} from '../graph-manager/CubeEngine.js';
import type { CubeEditorState } from './CubeEditorState.js';
import type { CubeExecutionResult } from './CubeExecutionState.js';

export const CUBE_EXPORT_CONTEXT_CHANGED =
  "The cube's model, runtime or warehouse changed since this run: execute again to export it.";

/** A file name for a cube's export, from its name, e.g. `Largest_buys.csv` */
export const getCubeExportFileName = (
  name: string | undefined,
  extension: 'csv' | 'xlsx',
): string => {
  const base = name?.trim().replace(/[^\w.-]+/gu, '_') ?? '';
  return `${base.length ? base : 'cube'}.${extension}`;
};

/**
 * The results' export (spec §12.5, PLAN §11.10): CSV of the whole query,
 * run on the engine with no row limit, sorted as the grid is, saved by the
 * browser. Only the run on screen is exported, in the context it ran in. A
 * failure is kept for the grid region; Stop aborts the export.
 */
export class CubeExportState {
  readonly editorState: CubeEditorState;
  error: CubeEngineError | undefined;
  private controller: AbortController | undefined;

  constructor(editorState: CubeEditorState) {
    makeObservable<CubeExportState, 'controller'>(this, {
      error: observable.ref,
      controller: observable.ref,
      isExporting: computed,
      exportCsv: flow,
      stop: action,
      clearError: action,
    });
    this.editorState = editorState;
  }

  get isExporting(): boolean {
    return this.controller !== undefined;
  }

  /** The run's whole query as CSV, sorted as the grid is (by the run's column names) */
  *exportCsv(
    result: CubeExecutionResult,
    sorts: readonly ColumnDirection[] = [],
  ): GeneratorFn<void> {
    const { editorState } = this;
    const model = result.context?.model;
    const runtime = result.context?.runtime;
    const captureId = result.query.selected;
    if (this.isExporting || !model || !runtime || captureId === undefined) {
      return;
    }
    this.error = undefined;
    // the warehouse is read from the page when the query runs
    if (
      result.context !== editorState.document.context ||
      result.warehouse !== editorState.dataProductRuntime.effectiveWarehouse
    ) {
      this.error = new CubeEngineError(
        CubeEngineErrorKind.EXECUTION,
        CUBE_EXPORT_CONTEXT_CHANGED,
        captureId,
      );
      return;
    }
    const controller = new AbortController();
    this.controller = controller;
    const startedAt = Date.now();
    try {
      // the run's rows, sorted as the grid is: no drill-down level
      const { query } = deriveDrilldownLevel({
        query: result.query,
        captureId,
        schema: result.schema,
        drilldown: checkDrilldown(
          { columns: [], aggregations: [] },
          result.schema,
        ),
        keys: [],
        sorts,
      });
      const runId = query.selected as string;
      let databaseType: string | undefined;
      if (needsDatabaseType(query, runId)) {
        yield flowResult(editorState.loadModelOutline(model));
        databaseType = editorState.getRunDatabaseType(
          query,
          runId,
          model,
          runtime,
        );
      }
      if (controller.signal.aborted) {
        return;
      }
      const csv = (yield editorState.host.engine.exportCsv(
        model,
        new QueryEmitter(query, editorState.registry).emitExecutionLambda({
          runtime,
          databaseType,
        }),
        { abortController: controller },
      )) as string;
      if (controller.signal.aborted) {
        return;
      }
      downloadFileUsingDataURI(
        getCubeExportFileName(editorState.document.name, 'csv'),
        csv,
        ContentType.TEXT_CSV,
      );
      editorState.runStats.record('Export CSV', {
        durationMs: Date.now() - startedAt,
        sql: [],
      });
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      assertErrorThrown(error);
      this.error =
        error instanceof CubeEngineError
          ? error
          : new CubeEngineError(
              CubeEngineErrorKind.EXECUTION,
              error.message,
              captureId,
            );
    } finally {
      if (this.controller === controller) {
        this.controller = undefined;
      }
    }
  }

  stop(): void {
    this.controller?.abort();
    this.controller = undefined;
  }

  clearError(): void {
    this.error = undefined;
  }
}
