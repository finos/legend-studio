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

import { computed, observable, makeObservable, override } from 'mobx';
import { UMLEditorState, UML_EDITOR_TAB } from './UMLEditorState';
import { guaranteeType } from '@finos/legend-studio-shared';
import { CORE_LOG_EVENT } from '../../../utils/Logger';
import { SOURCR_ID_LABEL } from '../../../models/MetaModelConst';
import { ClassState } from './ClassState';
import type { EditorStore } from '../../EditorStore';
import type { CompilationError } from '../../../models/metamodels/pure/action/EngineError';
import { getElementCoordinates } from '../../../models/metamodels/pure/action/EngineError';
import { Class } from '../../../models/metamodels/pure/model/packageableElements/domain/Class';
import type { PackageableElement } from '../../../models/metamodels/pure/model/packageableElements/PackageableElement';

export class ClassEditorState extends UMLEditorState {
  classState: ClassState;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      classState: observable,
      class: computed,
      reprocess: override,
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

  revealCompilationError(compilationError: CompilationError): boolean {
    try {
      if (compilationError.sourceInformation) {
        const errorElementCoordinates = getElementCoordinates(
          compilationError.sourceInformation,
        );
        if (errorElementCoordinates) {
          const sourceId = compilationError.sourceInformation.sourceId;
          const classTab = errorElementCoordinates.coordinates[0];
          if (classTab === SOURCR_ID_LABEL.CONSTRAINT) {
            this.setSelectedTab(UML_EDITOR_TAB.CONSTRAINTS);
            const constraintState = this.classState.constraintStates.find(
              (state) => state.constraint.lambdaId === sourceId,
            );
            if (constraintState) {
              constraintState.setCompilationError(compilationError);
              return true;
            }
          } else if (classTab === SOURCR_ID_LABEL.DERIVED_PROPERTY) {
            this.setSelectedTab(UML_EDITOR_TAB.DERIVED_PROPERTIES);
            const derivedPropertyState =
              this.classState.derivedPropertyStates.find(
                (state) => state.derivedProperty.lambdaId === sourceId,
              );
            if (derivedPropertyState) {
              derivedPropertyState.setCompilationError(compilationError);
              return true;
            }
          }
        }
      }
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.warn(
        CORE_LOG_EVENT.COMPILATION_PROBLEM,
        `Can't locate error`,
        error,
      );
    }
    return false;
  }

  reprocess(newElement: Class, editorStore: EditorStore): ClassEditorState {
    const classEditorState = new ClassEditorState(editorStore, newElement);
    classEditorState.selectedTab = this.selectedTab;
    return classEditorState;
  }
}
