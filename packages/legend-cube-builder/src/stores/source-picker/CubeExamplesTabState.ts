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
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
  when,
} from 'mobx';
import { CUBE_EXAMPLES, type CubeExample } from '../CubeExamples.js';
import type { CubeEditorState } from '../CubeEditorState.js';
import {
  type CubeSourcePickerTab,
  CubeSourcePickerTabKey,
} from './CubeSourcePickerTab.js';

/**
 * The Examples tab (PLAN §6.9): the example cubes, by dataset. Open replaces
 * the cube with the one picked, as Import does (one undo step), and runs it
 * once its tables are typed. It adds no source, so it is enabled whatever
 * the cube reads.
 */
export class CubeExamplesTabState implements CubeSourcePickerTab {
  readonly key = CubeSourcePickerTabKey.EXAMPLES;
  readonly label = 'Examples';
  readonly isAvailable = true;
  readonly isBusy = false;
  readonly editorState: CubeEditorState;
  readonly examples: readonly CubeExample[] = CUBE_EXAMPLES;

  selectedId: string | undefined = undefined;

  constructor(editorState: CubeEditorState) {
    makeObservable(this, {
      selectedId: observable,
      selected: computed,
      canConfirm: computed,
      select: action,
      confirm: flow,
    });
    this.editorState = editorState;
  }

  /** The datasets, in order, each with its examples */
  get datasets(): readonly (readonly [string, readonly CubeExample[]])[] {
    const datasets = new Map<string, CubeExample[]>();
    this.examples.forEach((example) => {
      datasets.set(example.dataset, [
        ...(datasets.get(example.dataset) ?? []),
        example,
      ]);
    });
    return [...datasets];
  }

  get selected(): CubeExample | undefined {
    return this.examples.find((example) => example.id === this.selectedId);
  }

  get canConfirm(): boolean {
    return this.selected !== undefined;
  }

  ownsContext(): boolean {
    return false;
  }

  open(): void {
    // nothing to load
  }

  close(): void {
    // nothing is waited for
  }

  select(id: string): void {
    this.selectedId = id;
  }

  /** Opens the example in place of the cube, then runs it */
  *confirm(): GeneratorFn<boolean> {
    const example = this.selected;
    if (!example) {
      return false;
    }
    const document = example.createDocument();
    this.editorState.importDocument(document, false);
    yield when(() => !this.editorState.isResolvingSources);
    const { execution } = this.editorState;
    // not if the user has moved on, e.g. undone the opening: typing the
    // tables replaces the document but keeps its context, which is this
    // opening's own
    if (
      this.editorState.document.context === document.context &&
      execution.canExecute &&
      !execution.isRunning
    ) {
      yield flowResult(execution.execute());
    }
    return true;
  }
}
