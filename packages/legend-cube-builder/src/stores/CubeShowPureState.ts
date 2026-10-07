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

import type { GeneratorFn } from '@finos/legend-shared';
import { action, flow, makeObservable, observable } from 'mobx';
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

  /** Opens the dialog and renders the query; does nothing when Execute can't run */
  *open(): GeneratorFn<void> {
    const { execution, document, emitter, rowLimit, host } = this.editorState;
    const runtime = document.context?.runtime;
    if (!execution.canExecute || runtime === undefined) {
      return;
    }
    const request = ++this.request;
    this.isOpen = true;
    this.text = undefined;
    this.error = undefined;
    this.isRendering = true;
    try {
      const text = (yield host.engine.renderPure(
        emitter.emitExecutionLambda({ rowLimit, runtime }),
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
