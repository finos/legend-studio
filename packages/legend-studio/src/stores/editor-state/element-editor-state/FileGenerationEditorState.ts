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

import { computed, action, observable, makeObservable } from 'mobx';
import { ElementEditorState } from './ElementEditorState';
import { assertType, guaranteeType } from '@finos/legend-studio-shared';
import type { EditorStore } from '../../EditorStore';
import { FileGenerationState } from '../../editor-state/FileGenerationState';
import type { CompilationError } from '../../../models/metamodels/pure/action/EngineError';
import type { PackageableElement } from '../../../models/metamodels/pure/model/packageableElements/PackageableElement';
import { FileGenerationSpecification } from '../../../models/metamodels/pure/model/packageableElements/fileGeneration/FileGenerationSpecification';

export class FileGenerationEditorState extends ElementEditorState {
  isGenerating = false;
  fileGenerationState: FileGenerationState;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      isGenerating: observable,
      fileGenerationState: observable,
      fileGeneration: computed,
      reprocess: action,
    });

    this.fileGenerationState = new FileGenerationState(
      editorStore,
      this.fileGeneration,
    );
    this.fileGenerationState
      .generate()
      .catch(this.editorStore.applicationStore.alertIllegalUnhandledError);
    assertType(
      element,
      FileGenerationSpecification,
      'Element inside file generation editor state should be a file generation',
    );
  }

  get fileGeneration(): FileGenerationSpecification {
    return guaranteeType(
      this.element,
      FileGenerationSpecification,
      'Element file generation editor state must be a file generation',
    );
  }

  revealCompilationError(compilationError: CompilationError): boolean {
    return false;
  }

  reprocess(
    newElement: FileGenerationSpecification,
    editorStore: EditorStore,
  ): FileGenerationEditorState {
    return new FileGenerationEditorState(editorStore, newElement);
  }
}
