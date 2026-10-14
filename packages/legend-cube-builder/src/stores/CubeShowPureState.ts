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

import { needsDatabaseType } from '@finos/legend-cube';
import type { GeneratorFn } from '@finos/legend-shared';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../graph-manager/CubeEngine.js';
import type { CubeEditorState } from './CubeEditorState.js';
import type { CubeRunStat } from './CubeRunStatsState.js';

/**
 * Show Pure: the Pure text of what Execute would run, the capture node's
 * execution lambda, as the engine renders it. It leaves out the row limit
 * Execute adds (`limit(rowLimit + 1)`, how the grid knows there are more
 * rows), as Legend Query's own Show Pure does: only a Take or Drop the user
 * added shows (user, 2026-10-10). For display only: the text is never parsed
 * back (PLAN §8.7). It also shows a run's lambda from the Runs panel as it
 * ran, its row limit included, for debugging (PLAN §11.16).
 */
export class CubeShowPureState {
  readonly editorState: CubeEditorState;

  isOpen = false;
  /** The run shown, by its label; `undefined` for the cube's query */
  run: string | undefined;
  text: string | undefined;
  /** Why the engine couldn't render the query; shown in the dialog */
  error: CubeEngineError | undefined;
  isRendering = false;
  /** Counts renders, so one that finishes after the dialog closed is dropped */
  private request = 0;

  constructor(editorState: CubeEditorState) {
    makeObservable(this, {
      isOpen: observable,
      run: observable,
      text: observable,
      error: observable.ref,
      isRendering: observable,
      open: flow,
      openRun: flow,
      close: action,
    });
    this.editorState = editorState;
  }

  /**
   * Opens the dialog and renders the query, written for the database it runs
   * on, as Execute writes it; does nothing when Execute can't run
   */
  *open(): GeneratorFn<void> {
    const { execution, document, emitter, host } = this.editorState;
    const { query, context } = document;
    const runtime = context?.runtime;
    const model = context?.model;
    // checked by canExecute
    const captureId = query.selected as string;
    if (!execution.canExecute || runtime === undefined || model === undefined) {
      return;
    }
    const request = this.start(undefined);
    yield* this.render(request, async () => {
      let databaseType: string | undefined;
      if (needsDatabaseType(query, captureId)) {
        await flowResult(this.editorState.loadModelOutline(model));
        // closed, or opened again, while the outline loaded
        if (request !== this.request) {
          return undefined;
        }
        databaseType = this.editorState.getRunDatabaseType(
          query,
          captureId,
          model,
          runtime,
        );
      }
      return host.engine.renderPure(
        emitter.emitExecutionLambda({ runtime, databaseType }),
      );
    });
  }

  /**
   * Opens the dialog on a run of the Runs panel and renders the lambda it
   * sent, as it ran (PLAN §11.16); does nothing for a run that failed before
   * one was written
   */
  *openRun(run: CubeRunStat): GeneratorFn<void> {
    const { lambda } = run;
    if (lambda === undefined) {
      return;
    }
    const request = this.start(run.label);
    yield* this.render(request, () =>
      this.editorState.host.engine.renderPure(lambda),
    );
  }

  private start(run: string | undefined): number {
    const request = ++this.request;
    this.isOpen = true;
    this.run = run;
    this.text = undefined;
    this.error = undefined;
    this.isRendering = true;
    return request;
  }

  /** Renders the text, unless the dialog was closed or opened again meanwhile */
  private *render(
    request: number,
    rendering: () => Promise<string | undefined>,
  ): GeneratorFn<void> {
    try {
      const text = (yield rendering()) as string | undefined;
      if (request === this.request && text !== undefined) {
        this.text = text;
      }
    } catch (error) {
      if (request === this.request) {
        this.error =
          error instanceof CubeEngineError
            ? error
            : new CubeEngineError(
                CubeEngineErrorKind.COMPILE,
                error instanceof Error ? error.message : String(error),
              );
      }
    } finally {
      if (request === this.request) {
        this.isRendering = false;
      }
    }
  }

  close(): void {
    this.request++;
    this.isOpen = false;
    this.isRendering = false;
    this.run = undefined;
    this.text = undefined;
    this.error = undefined;
  }
}
