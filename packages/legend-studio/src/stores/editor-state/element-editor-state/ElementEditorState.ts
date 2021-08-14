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

import type { EditorStore } from '../../EditorStore';
import { GRAPH_MANAGER_LOG_EVENT } from '../../../utils/GraphManagerLogEvent';
import { observable, action, flow, computed, makeObservable } from 'mobx';
import { ELEMENT_NATIVE_VIEW_MODE, TAB_SIZE } from '../../EditorConfig';
import { EditorState } from '../../editor-state/EditorState';
import type { GeneratorFn } from '@finos/legend-studio-shared';
import { assertErrorThrown } from '@finos/legend-studio-shared';
import type { CompilationError } from '../../../models/metamodels/pure/action/EngineError';
import type { PackageableElement } from '../../../models/metamodels/pure/model/packageableElements/PackageableElement';

const generateMultiLineCommentForError = (
  message: string,
  error: Error,
): string =>
  `/**\n * ${message}. Error: ${error.message.replace(/\n/gu, '\n * ')}\n */`;

export abstract class ElementEditorState extends EditorState {
  element: PackageableElement;
  editMode = ELEMENT_NATIVE_VIEW_MODE.FORM;
  generationViewMode?: string;
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
      headerName: computed,
      setTextContent: action,
      setEditMode: action,
      setGenerationViewMode: action,
      generateElementProtocol: action,
      generateElementGrammar: flow,
    });

    this.element = element;
    this.isReadOnly = element.isReadOnly || editorStore.isInViewerMode;
  }

  get headerName(): string {
    return this.element.name;
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
        this.editorStore.graphState.graphManager.elementToEntity(
          this.element,
          true,
        );
      this.setTextContent(
        JSON.stringify(elementEntity.content, undefined, TAB_SIZE),
      );
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.setTextContent(
        generateMultiLineCommentForError(
          `Can't generate protocol JSON for element`,
          error,
        ),
      );
      this.editorStore.applicationStore.logger.error(
        GRAPH_MANAGER_LOG_EVENT.PARSING_FAILURE,
        error,
      );
    }
  }

  *generateElementGrammar(): GeneratorFn<void> {
    try {
      const elementEntity =
        this.editorStore.graphState.graphManager.elementToEntity(
          this.element,
          false,
        );
      const grammar =
        (yield this.editorStore.graphState.graphManager.entitiesToPureCode([
          elementEntity,
        ])) as string;
      this.setTextContent(grammar);
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.setTextContent(
        generateMultiLineCommentForError(
          `Can't generate grammar text for element`,
          error,
        ),
      );
      this.editorStore.applicationStore.logger.error(
        GRAPH_MANAGER_LOG_EVENT.PARSING_FAILURE,
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

  get hasCompilationError(): boolean {
    return false;
  }

  clearCompilationError(): void {
    return;
  }

  abstract reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState;
}
