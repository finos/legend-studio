/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { EditorStore } from 'Stores/EditorStore';
import { Log, LOG_EVENT } from 'Utilities/Logger';
import { observable, action, flow, computed } from 'mobx';
import { ELEMENT_NATIVE_VIEW_MODE, TAB_SIZE } from 'Stores/EditorConfig';
import { GrammarToJsonInput } from 'EXEC/grammar/GrammarToJsonInput';
import { deserialize } from 'serializr';
import { EditorState } from 'Stores/editor-state/EditorState';
import { executionClient } from 'API/ExecutionClient';
import { CompilationError } from 'EXEC/ExecutionServerError';
import { PackageableElement } from 'MM/model/packageableElements/PackageableElement';
import { elementProtocolToEntity, PackageableElementObject } from 'MM/AbstractPureGraphManager';

const generateMultiLineCommentForError = (message: string, error: Error): string => `/**\n * ${message}. Error: ${error.message.replace(/\n/ug, '\n * ')}\n */`;

export abstract class ElementEditorState extends EditorState {
  @observable element: PackageableElement;
  @observable editMode = ELEMENT_NATIVE_VIEW_MODE.FORM;
  @observable generationViewMode?: string;
  @observable textContent = '';
  @observable isReadOnly = false;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore);
    this.element = element;
    this.isReadOnly = element.isReadOnly || editorStore.isInViewerMode;
  }

  @computed get headerName(): string { return this.element.name }

  @action setTextContent(text: string): void { this.textContent = text }
  @action setEditMode(mode: ELEMENT_NATIVE_VIEW_MODE): void {
    this.editMode = mode;
    // changing edit mode will clear any existing generation view mode
    // as edit mode always takes precedence
    this.setGenerationViewMode(undefined);
  }
  @action setGenerationViewMode(mode: string | undefined): void { this.generationViewMode = mode }

  @action generateElementProtocol(): void {
    try {
      const elementProtocol = this.editorStore.graphState.graphManager.getPackageableElementProtocol<object>(this.element);
      this.setTextContent(JSON.stringify(this.editorStore.graphState.graphManager.pruneSourceInformation(elementProtocol), null, TAB_SIZE));
    } catch (error) {
      this.setTextContent(generateMultiLineCommentForError(`Can't generate protocol JSON for element`, error));
      Log.error(LOG_EVENT.PARSING_PROBLEM, error);
    }
  }

  generateElementGrammar = flow(function* (this: ElementEditorState) {
    try {
      const elementProtocol = this.editorStore.graphState.graphManager.getPackageableElementProtocol<PackageableElementObject>(this.element);
      const elementEntity = elementProtocolToEntity(this.editorStore.graphState.graphManager, elementProtocol);
      const currentPureModelContextData = this.editorStore.graphState.graphManager.buildModelDataFromEntities([elementEntity]);
      const grammar = deserialize(GrammarToJsonInput, yield executionClient.transformJSONToGrammar({ modelDataContext: currentPureModelContextData }));
      this.setTextContent(grammar.code ?? '');
    } catch (error) {
      this.setTextContent(generateMultiLineCommentForError(`Can't generate grammar text for element`, error));
      Log.error(LOG_EVENT.PARSING_PROBLEM, error);
    }
  });

  abstract revealCompilationError(compilationError: CompilationError): boolean;
  abstract reprocess(newElement: PackageableElement, editorStore: EditorStore): ElementEditorState
}
