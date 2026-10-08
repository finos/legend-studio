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

/**
 * Show Pure: the Pure text of what Execute would run, the capture node's
 * execution lambda with the row limit, as the engine renders it. For display
 * only: the text is never parsed back (PLAN §8.7).
 */
export class CubeShowPureState {
  readonly editorState: CubeEditorState;

  isOpen = false;
  text: string | undefined;
  /** Why the engine couldn't render the query; shown in the dialog */
  error: CubeEngineError | undefined;
  isRendering = false;
  /** Counts renders, so one that finishes after the dialog closed is dropped */
  private request = 0;

  constructor(editorState: CubeEditorState) {
    makeObservable(this, {
      isOpen: observable,
      text: observable,
      error: observable.ref,
      isRendering: observable,
      open: flow,
      close: action,
    });
    this.editorState = editorState;
  }

  /**
   * Opens the dialog and renders the query, written for the database it runs
   * on, as Execute writes it; does nothing when Execute can't run
   */
  *open(): GeneratorFn<void> {
    const { execution, document, emitter, rowLimit, host } = this.editorState;
    const { query, context } = document;
    const runtime = context?.runtime;
    const model = context?.model;
    // checked by canExecute
    const captureId = query.selected as string;
    if (!execution.canExecute || runtime === undefined || model === undefined) {
      return;
    }
    const request = ++this.request;
    this.isOpen = true;
    this.text = undefined;
    this.error = undefined;
    this.isRendering = true;
    try {
      let databaseType: string | undefined;
      if (needsDatabaseType(query, captureId)) {
        yield flowResult(this.editorState.loadModelOutline(model));
        // closed, or opened again, while the outline loaded
        if (request !== this.request) {
          return;
        }
        databaseType = this.editorState.getRunDatabaseType(
          query,
          captureId,
          model,
          runtime,
        );
      }
      const text = (yield host.engine.renderPure(
        emitter.emitExecutionLambda({ rowLimit, runtime, databaseType }),
      )) as string;
      if (request === this.request) {
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
    this.text = undefined;
    this.error = undefined;
  }
}
