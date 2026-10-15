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

import { action, computed, flowResult, makeObservable, observable } from 'mobx';
import {
  CUBE_EDITOR_TOUR,
  CUBE_TOUR_EXAMPLE_ID,
  type CubeTourStep,
} from '../__lib__/LegendCubeTour.js';
import type { CubeEditorState } from './CubeEditorState.js';
import { isCubeSampleDataOffered } from './CubeHost.js';

/** Whether a step can be shown: its controls are on the page */
export type CubeTourStepShown = (step: CubeTourStep) => boolean;

/**
 * The editor's guided tour (PLAN §11.21): one step at a time, each pointing
 * at its controls; a step whose controls aren't on the page is skipped. It
 * starts on the cube as it is, the node editor's edits applied first; on an
 * empty cube, where examples are offered, it opens one to show (one undo
 * step). Nothing starts it but the user.
 */
export class CubeTourState {
  readonly editorState: CubeEditorState;
  readonly steps: readonly CubeTourStep[] = CUBE_EDITOR_TOUR;

  isOpen = false;
  /** The step shown, an index into `steps` */
  index = 0;
  /** Whether this tour opened its example */
  openedExample = false;

  constructor(editorState: CubeEditorState) {
    makeObservable(this, {
      isOpen: observable,
      index: observable,
      openedExample: observable,
      step: computed,
      start: action,
      move: action,
      close: action,
    });
    this.editorState = editorState;
  }

  get step(): CubeTourStep | undefined {
    return this.isOpen ? this.steps[this.index] : undefined;
  }

  /**
   * Starts the tour at its first step; not while the node editor keeps its
   * edits open, as other actions wait for it
   */
  start(): void {
    const { editorState } = this;
    if (this.isOpen || !editorState.nodeEditor.finish()) {
      return;
    }
    const example =
      editorState.document.query.isEmpty &&
      !editorState.readOnly &&
      isCubeSampleDataOffered(editorState.host)
        ? editorState.examples.examples.find(
            (candidate) => candidate.id === CUBE_TOUR_EXAMPLE_ID,
          )
        : undefined;
    this.openedExample = example !== undefined;
    this.index = 0;
    this.isOpen = true;
    if (example) {
      // the tour goes on while it opens and runs: its steps show as they can
      flowResult(editorState.examples.openExample(example)).catch(
        editorState.host.applicationStore.alertUnhandledError,
      );
    }
  }

  /**
   * The step `by` steps on (1) or back (-1), skipping those not shown; past
   * the last, the tour ends; before the first, it stays
   */
  move(by: 1 | -1, isShown: CubeTourStepShown): void {
    for (
      let index = this.index + by;
      index >= 0 && index < this.steps.length;
      index += by
    ) {
      const step = this.steps[index];
      if (step && isShown(step)) {
        this.index = index;
        return;
      }
    }
    if (by === 1) {
      this.close();
    }
  }

  close(): void {
    this.isOpen = false;
    this.index = 0;
  }
}
