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
  getBlockLinkingSteps,
  type ShownStepContainer,
} from '@finos/legend-cube';
import {
  action,
  computed,
  type IReactionDisposer,
  makeObservable,
  observable,
  reaction,
} from 'mobx';
import type { CubeEditorState } from './CubeEditorState.js';

/**
 * What Put Selection in a Container would make of the steps picked: a
 * container of them and the steps between them, or why it can't
 */
export type CubePickedStepsContainer =
  | {
      readonly kind: 'steps';
      /** The new container's steps, sorted by id */
      readonly steps: readonly string[];
      /** Those of them between two steps picked, not picked themselves */
      readonly between: readonly string[];
    }
  | { readonly kind: 'none' }
  /** The steps picked aren't all of one tree: no block links them */
  | { readonly kind: 'apart' }
  /** A step it would take is in a container already, picked or between two picked */
  | {
      readonly kind: 'contained';
      readonly stepId: string;
      readonly container: ShownStepContainer;
      readonly isPicked: boolean;
    };

/**
 * The steps picked on the canvas with the mouse (PLAN §11.29), as Alteryx
 * selects tools: Shift and a drag draws a box, which adds the steps wholly
 * inside it; Shift and a click picks a step, or unpicks it; Escape or a click
 * on the canvas picks none. A picked step's menu, or Ctrl/Cmd+G, puts them in
 * a container. "Picked", as the step "selected" is the output step (spec
 * §17.5). Only the page's, never the cube's: never saved, and no undo step.
 */
export class CubeCanvasSelectionState {
  readonly editorState: CubeEditorState;
  /** The ids picked; `stepIds` leaves out those the canvas doesn't draw */
  pickedIds: ReadonlySet<string> = new Set();
  /** The ids picked when the box began, which its steps are added to */
  private boxBase: ReadonlySet<string> | undefined = undefined;
  /** A step the query no longer has is unpicked, so a new one of its id isn't picked */
  private readonly pruning: IReactionDisposer;

  constructor(editorState: CubeEditorState) {
    makeObservable<CubeCanvasSelectionState, 'pickableIds'>(this, {
      pickedIds: observable.ref,
      pickableIds: computed,
      stepIds: computed,
      container: computed,
      toggle: action,
      clear: action,
      startBox: action,
      setBoxSteps: action,
      endBox: action,
      putInContainer: action,
    });
    this.editorState = editorState;
    this.pruning = reaction(
      () => this.editorState.document.query,
      (query) => {
        if ([...this.pickedIds].some((id) => !query.getNode(id))) {
          this.pickedIds = new Set(
            [...this.pickedIds].filter((id) => query.getNode(id)),
          );
        }
      },
    );
  }

  /** The steps the canvas draws, which can be picked: a folded container's aren't, and none while the cube is read-only */
  private get pickableIds(): string[] {
    const { editorState } = this;
    if (editorState.readOnly) {
      return [];
    }
    const folded = new Set(
      editorState.shownContainers
        .filter(({ container }) => container.folded)
        .flatMap(({ steps }) => steps),
    );
    return editorState.document.query.nodes
      .map((node) => node.id)
      .filter((id) => !folded.has(id));
  }

  /** The steps picked that the canvas draws, in the query's order */
  get stepIds(): string[] {
    return this.pickableIds.filter((id) => this.pickedIds.has(id));
  }

  isPicked(stepId: string): boolean {
    return this.stepIds.includes(stepId);
  }

  /** Picks a step the canvas draws, or unpicks it; never while the cube is read-only */
  toggle(stepId: string): void {
    if (!this.pickableIds.includes(stepId)) {
      return;
    }
    const next = new Set(this.pickedIds);
    if (this.isPicked(stepId)) {
      next.delete(stepId);
    } else {
      next.add(stepId);
    }
    this.pickedIds = next;
  }

  /** Picks none */
  clear(): void {
    this.boxBase = undefined;
    if (this.pickedIds.size) {
      this.pickedIds = new Set();
    }
  }

  /** The box begins: its steps go with the ones picked now */
  startBox(): void {
    this.boxBase = this.editorState.readOnly ? undefined : this.pickedIds;
  }

  /** The steps wholly inside the box, as it is now */
  setBoxSteps(stepIds: readonly string[]): void {
    if (this.boxBase !== undefined) {
      const { pickableIds } = this;
      this.pickedIds = new Set([
        ...this.boxBase,
        ...stepIds.filter((id) => pickableIds.includes(id)),
      ]);
    }
  }

  endBox(): void {
    this.boxBase = undefined;
  }

  /**
   * What Put Selection in a Container makes (PLAN §11.29): a container is one
   * block of linked steps, so it takes the steps picked and each step between
   * two of them, all in no container yet, as containers don't nest
   */
  get container(): CubePickedStepsContainer {
    const { editorState, stepIds } = this;
    if (!stepIds.length) {
      return { kind: 'none' };
    }
    const steps = getBlockLinkingSteps(editorState.document.query, stepIds);
    if (!steps) {
      return { kind: 'apart' };
    }
    // a step picked comes first, as the one to take out first
    for (const stepId of [...stepIds, ...steps]) {
      const container = editorState.getStepContainer(stepId);
      if (container) {
        return {
          kind: 'contained',
          stepId,
          container,
          isPicked: stepIds.includes(stepId),
        };
      }
    }
    return {
      kind: 'steps',
      steps,
      between: steps.filter((id) => !stepIds.includes(id)),
    };
  }

  /**
   * Puts the steps picked, and the steps between them, in a new container,
   * one undo step, and picks none. The caller finishes the node editor
   * first, as for any change to the cube.
   */
  putInContainer(): void {
    const { container } = this;
    if (container.kind === 'steps' && !this.editorState.readOnly) {
      this.editorState.addContainerOf(container.steps);
      this.clear();
    }
  }

  dispose(): void {
    this.pruning();
  }
}
