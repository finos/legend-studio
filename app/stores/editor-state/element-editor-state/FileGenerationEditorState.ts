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

import { computed, action, observable } from 'mobx';
import { ElementEditorState } from './ElementEditorState';
import { assertType, guaranteeType } from 'Utilities/GeneralUtil';
import { EditorStore } from 'Stores/EditorStore';
import { FileGenerationState } from 'Stores/editor-state/FileGenerationState';
import { CompilationError } from 'EXEC/ExecutionServerError';
import { PackageableElement } from 'MM/model/packageableElements/PackageableElement';
import { FileGeneration } from 'MM/model/packageableElements/fileGeneration/FileGeneration';

export class FileGenerationEditorState extends ElementEditorState {
  @observable isGenerating = false;
  @observable fileGenerationState: FileGenerationState;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);
    this.fileGenerationState = new FileGenerationState(editorStore, this.fileGeneration);
    this.fileGenerationState.generate().catch(this.editorStore.applicationStore.alertIllegalUnhandledError);
    assertType(element, FileGeneration, 'Element inside file generation editor state should be a file generation');
  }

  @computed get fileGeneration(): FileGeneration { return guaranteeType(this.element, FileGeneration, 'Element file generation editor state must be a file generation') }

  revealCompilationError(compilationError: CompilationError): boolean { return false }

  @action reprocess(newElement: FileGeneration, editorStore: EditorStore): FileGenerationEditorState {
    return new FileGenerationEditorState(editorStore, newElement);
  }
}
