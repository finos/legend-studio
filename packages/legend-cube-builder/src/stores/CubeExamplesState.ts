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

import { CubeDocument } from '@finos/legend-cube';
import type { GeneratorFn } from '@finos/legend-shared';
import {
  action,
  flow,
  flowResult,
  makeObservable,
  observable,
  when,
} from 'mobx';
import {
  CUBE_EXAMPLE_DATASETS,
  CUBE_EXAMPLES,
  type CubeExample,
  type CubeExampleDataset,
} from './CubeExamples.js';
import type { CubeEditorState } from './CubeEditorState.js';
import { CubeSourcePickerTabKey } from './source-picker/CubeSourcePickerTab.js';

/**
 * The Examples dialog (PLAN §6.9): the sample datasets, each with its example
 * cubes. An example opens in place of the cube, as Import does (one undo
 * step), and runs once its tables are typed. A dataset starts a new cube on
 * its model, in the source dialog's Model tab. Either works whatever the
 * cube is, read-only included, since it replaces it.
 */
export class CubeExamplesState {
  readonly editorState: CubeEditorState;
  readonly datasets: readonly CubeExampleDataset[] = CUBE_EXAMPLE_DATASETS;
  readonly examples: readonly CubeExample[] = CUBE_EXAMPLES;

  isOpen = false;

  constructor(editorState: CubeEditorState) {
    makeObservable(this, {
      isOpen: observable,
      open: action,
      close: action,
      startOnDataset: action,
      openExample: flow,
    });
    this.editorState = editorState;
  }

  /** A dataset's examples, in order */
  examplesOf(dataset: CubeExampleDataset): readonly CubeExample[] {
    return this.examples.filter((example) => example.dataset === dataset.id);
  }

  open(): void {
    this.isOpen = true;
  }

  close(): void {
    this.isOpen = false;
  }

  /**
   * Starts a new cube on the dataset's model, in place of the cube (one undo
   * step), and opens the source dialog's Model tab on it to add a first table
   */
  startOnDataset(dataset: CubeExampleDataset): void {
    this.close();
    this.editorState.importDocument(
      new CubeDocument({
        context: { model: dataset.model, runtime: dataset.runtime },
      }),
      false,
    );
    this.editorState.sourcePicker.open(CubeSourcePickerTabKey.MODEL);
  }

  /** Opens the example in place of the cube, then runs it */
  *openExample(example: CubeExample): GeneratorFn<void> {
    this.close();
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
  }
}
