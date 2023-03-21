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

import { computed, observable, makeObservable, override, action } from 'mobx';
import { UMLEditorState, UML_EDITOR_TAB } from './UMLEditorState.js';
import {
  LogEvent,
  guaranteeType,
  assertErrorThrown,
} from '@finos/legend-shared';
import {
  ClassState,
  CONSTRAINT_SOURCE_ID_LABEL,
  DERIVED_PROPERTY_SOURCE_ID_LABEL,
} from './ClassState.js';
import type { EditorStore } from '../../EditorStore.js';
import {
  type CompilationError,
  type PackageableElement,
  type AbstractProperty,
  GRAPH_MANAGER_EVENT,
  extractSourceInformationCoordinates,
  Class,
} from '@finos/legend-graph';

export class ClassEditorState extends UMLEditorState {
  classState: ClassState;
  selectedProperty: AbstractProperty | undefined;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      classState: observable,
      selectedProperty: observable,
      class: computed,
      reprocess: override,
      setSelectedProperty: action,
    });

    this.classState = new ClassState(editorStore, this.class);
  }

  get class(): Class {
    return guaranteeType(
      this.element,
      Class,
      'Element inside class editor state must be a class',
    );
  }

  setSelectedProperty(val: AbstractProperty | undefined): void {
    this.selectedProperty = val;
  }

  override revealCompilationError(compilationError: CompilationError): boolean {
    try {
      if (compilationError.sourceInformation) {
        const elementCoordinates = extractSourceInformationCoordinates(
          compilationError.sourceInformation,
        );
        if (elementCoordinates) {
          const sourceId = compilationError.sourceInformation.sourceId;
          const classTab = elementCoordinates[1];
          if (classTab === CONSTRAINT_SOURCE_ID_LABEL) {
            this.setSelectedTab(UML_EDITOR_TAB.CONSTRAINTS);
            const constraintState = this.classState.constraintStates.find(
              (state) => state.lambdaId === sourceId,
            );
            if (constraintState) {
              constraintState.setCompilationError(compilationError);
              return true;
            }
          } else if (classTab === DERIVED_PROPERTY_SOURCE_ID_LABEL) {
            this.setSelectedTab(UML_EDITOR_TAB.DERIVED_PROPERTIES);
            const derivedPropertyState =
              this.classState.derivedPropertyStates.find(
                (state) => state.lambdaId === sourceId,
              );
            if (derivedPropertyState) {
              derivedPropertyState.setCompilationError(compilationError);
              return true;
            }
          }
        }
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.warn(
        LogEvent.create(GRAPH_MANAGER_EVENT.COMPILATION_FAILURE),
        `Can't locate error`,
        error,
      );
    }
    return false;
  }

  override clearCompilationError(): void {
    this.classState.constraintStates.forEach((constraintState) =>
      constraintState.setCompilationError(undefined),
    );
    this.classState.derivedPropertyStates.forEach((dpState) =>
      dpState.setCompilationError(undefined),
    );
  }

  override reprocess(
    newElement: Class,
    editorStore: EditorStore,
  ): ClassEditorState {
    const classEditorState = new ClassEditorState(editorStore, newElement);
    classEditorState.selectedTab = this.selectedTab;
    return classEditorState;
  }
}
