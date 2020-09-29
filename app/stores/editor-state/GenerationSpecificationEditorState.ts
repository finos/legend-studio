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

import { ElementEditorState } from './element-editor-state/ElementEditorState';
import { guaranteeType, assertType } from 'Utilities/GeneralUtil';
import { computed, observable } from 'mobx';
import { EditorStore } from 'Stores/EditorStore';
import { CompilationError } from 'EXEC/ExecutionServerError';
import { GenerationSpecification } from 'MM/model/packageableElements/generationSpecification/GenerationSpecification';
import { PackageableElement } from 'MM/model/packageableElements/PackageableElement';

export class GenerationSpecificationEditorState extends ElementEditorState {
  @observable isGenerating = false;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);
    assertType(element, GenerationSpecification, 'Element inside generation specification state must be a generation specification');
  }

  @computed get generationSpec(): GenerationSpecification {
    return guaranteeType(this.element, GenerationSpecification);
  }

  revealCompilationError(compilationError: CompilationError): boolean {
    return false;
  }
  reprocess(newElement: PackageableElement, editorStore: EditorStore): ElementEditorState {
    return new GenerationSpecificationEditorState(editorStore, newElement);
  }

}
