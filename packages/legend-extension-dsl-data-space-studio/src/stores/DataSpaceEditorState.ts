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

import { action, computed, makeObservable, observable } from 'mobx';
import {
  type EditorStore,
  ElementEditorState,
} from '@finos/legend-application-studio';
import {
  type PackageableElement,
  Package,
  Class,
  Enumeration,
  Association,
  Service,
  ConcreteFunctionDefinition,
} from '@finos/legend-graph';
import { Diagram } from '@finos/legend-extension-dsl-diagram/graph';
import {
  DataSpace,
  DataSpacePackageableElementExecutable,
  type DataSpaceElement,
} from '@finos/legend-extension-dsl-data-space/graph';
import { guaranteeType } from '@finos/legend-shared';
import { DataSpaceExecutionContextState } from './DataSpaceExecutionContextState.js';

export class DataSpaceEditorState extends ElementEditorState {
  executionContextState: DataSpaceExecutionContextState;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      executionContextState: observable,
      dataSpace: computed,
      reprocess: action,
      isValidDataSpaceElement: action,
      getDataSpaceElementOptions: action,
      getDiagramOptions: action,
      getDataSpaceExecutableOptions: action,
    });

    this.executionContextState = new DataSpaceExecutionContextState(this);
  }

  isValidDataSpaceElement(
    element: PackageableElement,
  ): element is DataSpaceElement {
    return (
      element instanceof Package ||
      element instanceof Class ||
      element instanceof Enumeration ||
      element instanceof Association
    );
  }

  getDataSpaceElementOptions(): { label: string; value: DataSpaceElement }[] {
    const currentElements =
      this.dataSpace.elements?.map(
        (elementPointer) => elementPointer.element.value,
      ) ?? [];
    return this.editorStore.graphManagerState.graph.allOwnElements
      .filter((element) => this.isValidDataSpaceElement(element))
      .filter((element) => !currentElements.includes(element))
      .map((element) => ({
        label: element.path,
        value: element,
      }));
  }

  getDataSpaceExecutableOptions(): {
    label: string;
    value: PackageableElement;
  }[] {
    const currentExecutables =
      this.dataSpace.executables?.map((executablePointer) => {
        if (
          executablePointer instanceof DataSpacePackageableElementExecutable
        ) {
          return executablePointer.executable.value;
        }
        return undefined;
      }) ?? [];
    return this.editorStore.graphManagerState.graph.allOwnElements
      .filter(
        (element) =>
          element instanceof Service ||
          element instanceof ConcreteFunctionDefinition,
      )
      .filter((executable) => !currentExecutables.includes(executable))
      .map((executable) => ({
        label: executable.path,
        value: executable,
      }));
  }

  getDiagramOptions(): { label: string; value: Diagram }[] {
    const currentDiagrams =
      this.dataSpace.diagrams?.map(
        (diagramPointer) => diagramPointer.diagram.value,
      ) ?? [];
    return this.editorStore.graphManagerState.graph.allOwnElements
      .filter((element): element is Diagram => element instanceof Diagram)
      .filter((diagram) => !currentDiagrams.includes(diagram))
      .map((diagram) => ({
        label: diagram.path,
        value: diagram,
      }));
  }

  get dataSpace(): DataSpace {
    return guaranteeType(
      this.element,
      DataSpace,
      'Element inside DataSpace editor state must be a DataSpace element',
    );
  }

  override reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    const newState = new DataSpaceEditorState(editorStore, newElement);
    return newState;
  }
}
