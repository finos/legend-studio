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
import { FileGenerationState } from '../../editor-state/FileGenerationState';
import { action, flowResult, makeAutoObservable } from 'mobx';
import { ElementEditorState } from './ElementEditorState';
import { type GeneratorFn, AssertionError, uuid } from '@finos/legend-shared';
import {
  FileGenerationSpecification,
  PackageableElementExplicitReference,
} from '@finos/legend-graph';
import { package_addElement } from '../../graphModifier/DomainGraphModifierHelper';
import {
  createObservableFileGeneration,
  fileGeneration_setType,
} from '../../graphModifier/DSLGeneration_GraphModifierHelper';

export class ElementFileGenerationState {
  uuid = uuid();
  editorStore: EditorStore;
  fileGenerationType: string;
  fileGenerationState: FileGenerationState;
  showNewFileGenerationModal = false;

  constructor(editorStore: EditorStore, fileGenerationType: string) {
    makeAutoObservable(this, {
      uuid: false,
      editorStore: false,
      setShowNewFileGenerationModal: action,
      promoteToFileGeneration: action,
    });

    this.editorStore = editorStore;
    this.fileGenerationType = fileGenerationType;
    const fileGeneration = createObservableFileGeneration();
    fileGeneration_setType(fileGeneration, fileGenerationType);
    this.fileGenerationState = new FileGenerationState(
      editorStore,
      fileGeneration,
    );
  }

  setShowNewFileGenerationModal(show: boolean): void {
    this.showNewFileGenerationModal = show;
  }

  promoteToFileGeneration(packagePath: string, name: string): void {
    const fileGenerationPackage =
      this.editorStore.graphManagerState.graph.getOrCreatePackage(packagePath);
    const fileGeneration = this.fileGenerationState.fileGeneration;
    fileGeneration.name = name;
    package_addElement(
      fileGenerationPackage,
      fileGeneration,
      this.editorStore.changeDetectionState.observerContext,
    );
    this.editorStore.graphManagerState.graph.addElement(fileGeneration);
    this.editorStore.openElement(fileGeneration);
    // reset file generation state so since the current file generation is promoted to a packageable element in the graph
    // otherwise if we keep this reference, editing this element generation state will also modify the packageable element
    const newFileGeneration = new FileGenerationSpecification('');
    fileGeneration_setType(newFileGeneration, this.fileGenerationType);
    this.fileGenerationState = new FileGenerationState(
      this.editorStore,
      newFileGeneration,
    );
  }

  *regenerate(): GeneratorFn<void> {
    const currentState = this.editorStore.currentEditorState;
    if (currentState instanceof ElementEditorState) {
      this.fileGenerationState.fileGeneration.scopeElements = [
        PackageableElementExplicitReference.create(currentState.element),
      ]; // always set the scope to the current element
      yield flowResult(this.fileGenerationState.generate());
    } else {
      throw new AssertionError(
        'Generation state must have at least an element editor opened',
      );
    }
  }
}
