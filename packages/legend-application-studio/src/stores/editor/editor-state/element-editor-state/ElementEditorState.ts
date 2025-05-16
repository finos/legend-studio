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
  guaranteeNonNullable,
  guaranteeType,
  isType,
} from '@finos/legend-shared';
import {
  type CompilationError,
  type PackageableElement,
  GRAPH_MANAGER_EVENT,
  isElementReadOnly,
  INTERNAL__UnknownElement,
} from '@finos/legend-graph';
import { DEFAULT_TAB_SIZE } from '@finos/legend-application';
import type { ElementFileGenerationState } from './ElementFileGenerationState.js';
import type { ElementXTSchemaGenerationState } from './ElementExternalFormatGenerationState.js';
import type { EditorInitialConfiguration } from './ElementEditorInitialConfiguration.js';

const generateMultiLineCommentForError = (
  message: string,
  error: Error,
): string =>
  `/**\n * ${message}. Error: ${error.message.replace(/\n/gu, '\n * ')}\n */`;

export enum ELEMENT_GENERATION_MODE {
  FILE_GENERATION = 'FILE_GENERATION',
  EXTERNAL_FORMAT = 'EXTERNAL_FORMAT',
}
export abstract class ElementGenerationModeState {
  elementEditorState: ElementEditorState;
  editorStore: EditorStore;

  constructor(
    editorStore: EditorStore,
    elementEditorState: ElementEditorState,
  ) {
    this.elementEditorState = elementEditorState;
    this.editorStore = editorStore;
  }

  abstract get label(): string;
}

export class ExternalFormatElementGenerationViewModeState extends ElementGenerationModeState {
  generationState: ElementXTSchemaGenerationState;

  constructor(
    editorStore: EditorStore,
    elementEditorState: ElementEditorState,
    generationState: ElementXTSchemaGenerationState,
  ) {
    super(editorStore, elementEditorState);
    this.generationState = generationState;
  }
  get label(): string {
    return this.generationState.description.name;
  }
}

export class FileGenerationViewModeState extends ElementGenerationModeState {
  elementGenerationState: ElementFileGenerationState;

  constructor(
    editorStore: EditorStore,
    elementEditorState: ElementEditorState,
    elementGenerationState: ElementFileGenerationState,
  ) {
    super(editorStore, elementEditorState);
    this.elementGenerationState = elementGenerationState;
  }

  get label(): string {
    return this.editorStore.graphState.graphGenerationState.globalFileGenerationState.getFileGenerationConfiguration(
      this.elementGenerationState.fileGenerationType,
    ).label;
  }
}

export abstract class ElementEditorState extends EditorState {
  element: PackageableElement;
  editMode = ELEMENT_NATIVE_VIEW_MODE.FORM;
  generationModeState: ElementGenerationModeState | undefined;
  textContent = '';
  isReadOnly = false;

  constructor(
    editorStore: EditorStore,
    element: PackageableElement,
    config?: EditorInitialConfiguration | undefined,
  ) {
    super(editorStore);

    makeObservable(this, {
      element: observable,
      editMode: observable,
      textContent: observable,
      isReadOnly: observable,
      generationModeState: observable,
      label: computed,
      description: computed,
      elementPath: computed,
      setTextContent: action,
      setEditMode: action,
      changeGenerationModeState: action,
      generateElementProtocol: action,
      generateElementGrammar: flow,
    });

    this.element = element;
    this.isReadOnly =
      isElementReadOnly(element) || editorStore.disableGraphEditing;
  }

  get label(): string {
    return this.element.name;
  }

  get elementPath(): string {
    return this.element.path;
  }

  override get description(): string | undefined {
    return this.element.path;
  }

  override match(tab: EditorState): boolean {
    return tab instanceof ElementEditorState && tab.element === this.element;
  }

  setTextContent(text: string): void {
    this.textContent = text;
  }

  setEditMode(mode: ELEMENT_NATIVE_VIEW_MODE): void {
    this.editMode = mode;
    // changing edit mode will clear any existing generation view mode
    // as edit mode always takes precedence
    this.setGenerationModeState(undefined);
  }

  setGenerationModeState(state: ElementGenerationModeState | undefined): void {
    this.generationModeState = state;
  }

  changeGenerationModeState(mode: string, type: ELEMENT_GENERATION_MODE): void {
    if (type === ELEMENT_GENERATION_MODE.FILE_GENERATION) {
      const elementGenerationState =
        this.editorStore.elementGenerationStates.find(
          (state) => state.fileGenerationType === mode,
        );
      this.setGenerationModeState(
        new FileGenerationViewModeState(
          this.editorStore,
          this,
          guaranteeNonNullable(elementGenerationState),
        ),
      );
    } else {
      const xt =
        this.editorStore.graphState.graphGenerationState.externalFormatState.schemaGenerationStates.find(
          (e) => e.description.name === mode,
        );
      this.setGenerationModeState(
        new ExternalFormatElementGenerationViewModeState(
          this.editorStore,
          this,
          guaranteeNonNullable(xt),
        ),
      );
    }
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
        JSON.stringify(elementEntity.content, undefined, DEFAULT_TAB_SIZE),
      );
    } catch (error) {
      assertErrorThrown(error);
      const isUnknownEntity = isType(this.element, INTERNAL__UnknownElement);
      if (isUnknownEntity) {
        const unknownEntity = guaranteeType(
          this.element,
          INTERNAL__UnknownElement,
        );
        this.setTextContent(
          JSON.stringify(unknownEntity.content, undefined, DEFAULT_TAB_SIZE),
        );
      } else {
        this.setTextContent(
          generateMultiLineCommentForError(
            `Can't generate protocol JSON for element`,
            error,
          ),
        );
      }
      this.editorStore.applicationStore.logService.error(
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
          { pretty: true },
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
      this.editorStore.applicationStore.logService.error(
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

  override onOpen(): void {
    this.editorStore.explorerTreeState.openNode(this.element);
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
