/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import type { EditorStore } from '../../EditorStore.js';
import { observable, action, flow, computed, makeObservable } from 'mobx';
import { ELEMENT_NATIVE_VIEW_MODE } from '../../EditorConfig.js';
import { EditorState } from '../../editor-state/EditorState.js';
import {
  type GeneratorFn,
  LogEvent,
  assertErrorThrown,
} from '@finos/legend-shared';
import {
  type CompilationError,
  type PackageableElement,
  GRAPH_MANAGER_EVENT,
  isElementReadOnly,
} from '@finos/legend-graph';
import { TAB_SIZE } from '@finos/legend-application';

const generateMultiLineCommentForError = (
  message: string,
  error: Error,
): string =>
  `/**\n * ${message}. Error: ${error.message.replace(/\n/gu, '\n * ')}\n */`;

export abstract class ElementEditorState extends EditorState {
  element: PackageableElement;
  editMode = ELEMENT_NATIVE_VIEW_MODE.FORM;
  generationViewMode?: string | undefined;
  textContent = '';
  isReadOnly = false;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore);

    makeObservable(this, {
      element: observable,
      editMode: observable,
      generationViewMode: observable,
      textContent: observable,
      isReadOnly: observable,
      label: computed,
      description: computed,
      setTextContent: action,
      setEditMode: action,
      setGenerationViewMode: action,
      generateElementProtocol: action,
      generateElementGrammar: flow,
    });

    this.element = element;
    this.isReadOnly = isElementReadOnly(element) || editorStore.isInViewerMode;
  }

  get label(): string {
    return this.element.name;
  }

  override get description(): string | undefined {
    return this.element.path;
  }

  match(tab: EditorState): boolean {
    return tab instanceof ElementEditorState && tab.element === this.element;
  }

  setTextContent(text: string): void {
    this.textContent = text;
  }

  setEditMode(mode: ELEMENT_NATIVE_VIEW_MODE): void {
    this.editMode = mode;
    // changing edit mode will clear any existing generation view mode
    // as edit mode always takes precedence
    this.setGenerationViewMode(undefined);
  }

  setGenerationViewMode(mode: string | undefined): void {
    this.generationViewMode = mode;
  }

  generateElementProtocol(): void {
    try {
      const elementEntity =
        this.editorStore.graphManagerState.graphManager.elementToEntity(
          this.element,
          {
            pruneSourceInformation: true,
          },
        );
      this.setTextContent(
        JSON.stringify(elementEntity.content, undefined, TAB_SIZE),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.setTextContent(
        generateMultiLineCommentForError(
          `Can't generate protocol JSON for element`,
          error,
        ),
      );
      this.editorStore.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
        error,
      );
    }
  }

  *generateElementGrammar(): GeneratorFn<void> {
    try {
      const grammar =
        (yield this.editorStore.graphManagerState.graphManager.entitiesToPureCode(
          [
            this.editorStore.graphManagerState.graphManager.elementToEntity(
              this.element,
            ),
          ],
        )) as string;
      this.setTextContent(grammar);
    } catch (error) {
      assertErrorThrown(error);
      this.setTextContent(
        generateMultiLineCommentForError(
          `Can't generate grammar text for element`,
          error,
        ),
      );
      this.editorStore.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
        error,
      );
    }
  }

  /**
   * Takes the compilation and based on its source information, attempts to reveal the error
   * in the editor. The return values indicates if the editor has revealed the error successfully or not.
   */
  revealCompilationError(compilationError: CompilationError): boolean {
    return false;
  }

  clearCompilationError(): void {
    return;
  }

  /**
   * Clone the element editor state to be replaced as processing graph
   *
   * FIXME: here we clone instead of reusing the old state to avoid memory leak
   * however, this is still not ideal, because this method can still be written
   * to refer to older state. Ideally, we should produce a source-information
   * like JSON object to indicate the current location of the editor tab instead
   *
   * @risk memory-leak
   */
  abstract reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState;
}
