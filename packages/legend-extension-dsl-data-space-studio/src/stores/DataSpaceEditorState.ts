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
  Association,
  Class,
  Enumeration,
  Package,
  PackageableElementExplicitReference,
  type PackageableElementReference,
  type PackageableElement,
} from '@finos/legend-graph';
import {
  DataSpace,
  DataSpaceExecutionContext,
  DataSpaceSupportEmail,
  observe_DataSpaceExecutionContext,
<<<<<<< HEAD
=======
  observe_DataSpaceDiagram,
  type DataSpaceElementPointer,
  observe_DataSpaceElementPointer,
  type DataSpaceExecutable,
  observe_DataSpaceExecutable,
  DataSpacePackageableElementExecutable,
  type DataSpaceElement,
  DataSpaceSupportCombinedInfo,
} from '@finos/legend-extension-dsl-data-space/graph';
import { guaranteeType } from '@finos/legend-shared';

export enum SUPPORT_INFO_TYPE {
  EMAIL = 'Email',
  COMBINED_INFO = 'CombinedInfo',
}

export enum DATASPACE_TAB {
  GENERAL = 'GENERAL',
  EXECUTION_CONTEXT = 'EXECUTION_CONTEXT',
<<<<<<< HEAD
=======
  DIAGRAM = 'DIAGRAM',
  ELEMENTS = 'ELEMENTS',
  EXECUTABLES = 'EXECUTABLES',
>>>>>>> elements and executable finished
}
export class DataSpaceEditorState extends ElementEditorState {
  // removeExecutable(executable: DataSpacePackageableElementExecutable) {
  //   throw new Error('Method not implemented.');
  // }
  selectedSupportInfoType?: SUPPORT_INFO_TYPE;
  selectedTab: DATASPACE_TAB = DATASPACE_TAB.GENERAL;
<<<<<<< HEAD
  selectedExecutionContext?: DataSpaceExecutionContext;
  newExecutionContextName = '';
  selectedMapping: PackageableElementReference<Mapping> | null = null;
  selectedRuntime: PackageableElementReference<PackageableRuntime> | null =
    null;
=======
  selectedExecutionContext?: DataSpaceExecutionContext | null = null;
  diagrams: DataSpaceDiagram[] = [];
  selectedDiagram?: DataSpaceDiagram;
<<<<<<< HEAD
>>>>>>> executionContext is finished
=======
  elements: DataSpaceElementPointer[] = [];
  selectedElementPointer?: DataSpaceElementPointer;
  executables: DataSpaceExecutable[] = [];
  // selectedExecutable?: DataSpaceExecutable;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      dataSpace: computed,
      elementOptions: computed,
      selectedSupportInfoType: observable,
      selectedTab: observable,
      selectedExecutionContext: observable,
<<<<<<< HEAD
      newExecutionContextName: observable,
      selectedMapping: observable,
      selectedRuntime: observable,
=======
      selectedDiagram: observable,
      elements: observable,
      executables: observable,
      selectedElementPointer: observable,
      // selectedExecutable: observable,
      setDiagrams: action,
      selectDiagram: action,
>>>>>>> executionContext is finished
      setSelectedSupportInfoType: action,
      setSelectedTab: action,
      setSelectedExecutionContext: action,
      setDefaultExecutionContext: action,
<<<<<<< HEAD
<<<<<<< HEAD
      setNewExecutionContextName: action,
      setSelectedMapping: action,
      setSelectedRuntime: action,
      addExecutionContext: action,
=======
>>>>>>> executionContext is finished
=======
      setElements: action,
      selectElementPointer: action,
      setExecutables: action,
      // selectExecutable: action,
      // addExecutable: action,
      // removeExecutable: action,
      reprocess: action,
    });

    if (!this.dataSpace.supportInfo) {
      this.dataSpace.supportInfo = new DataSpaceSupportCombinedInfo();
    }

    this.selectedSupportInfoType =
      this.dataSpace.supportInfo instanceof DataSpaceSupportEmail
        ? SUPPORT_INFO_TYPE.EMAIL
        : SUPPORT_INFO_TYPE.COMBINED_INFO;

    this.diagrams = this.dataSpace.diagrams ?? [];
    this.elements = this.dataSpace.elements ?? [];
    this.executables = this.dataSpace.executables ?? [];
  }

  get dataSpace(): DataSpace {
    return guaranteeType(
      this.element,
      DataSpace,
      'Element inside text element editor state must be a DataSpace',
    );
  }

  // get elementOptions(): {
  //   label: string;
  //   value: PackageableElementReference<DataSpaceElement>;
  // }[] {
  //   return this.editorStore.graphManagerState.graph.allOwnElements
  //     .filter(
  //       (elements) =>
  //         elements instanceof Package ||
  //         elements instanceof Class ||
  //         elements instanceof Enumeration ||
  //         elements instanceof Association,
  //     )
  //     .map((elements) => ({
  //       label: elements.path,
  //       value: PackageableElementExplicitReference.create(
  //         elements as DataSpaceElement,
  //       ),
  //     }));
  // }

  get elementOptions(): {
    label: string;
    value: PackageableElementReference<DataSpaceElement>;
  }[] {
    return this.editorStore.graphManagerState.graph.allOwnElements
      .filter((el) => el instanceof Class || el instanceof Association)
      .map((el) => ({
        label: el.path,
        value: PackageableElementExplicitReference.create(
          el as DataSpaceElement,
        ),
      }));
  }

  // Actions to modify state
  setSelectedSupportInfoType(type: SUPPORT_INFO_TYPE): void {
    this.selectedSupportInfoType = type;
  }

  setSelectedTab(tab: DATASPACE_TAB): void {
    this.selectedTab = tab;
  }

  setSelectedExecutionContext(context: DataSpaceExecutionContext): void {
    console.log(context);
    this.selectedExecutionContext = context;
  }

  setDefaultExecutionContext(context: DataSpaceExecutionContext): void {
    this.dataSpace.defaultExecutionContext = context;
  }

<<<<<<< HEAD
  setNewExecutionContextName(name: string): void {
    this.newExecutionContextName = name;
  }

  setSelectedMapping(
    mapping: PackageableElementReference<Mapping> | null,
  ): void {
    this.selectedMapping = mapping;
  }

  setSelectedRuntime(
    runtime: PackageableElementReference<PackageableRuntime> | null,
  ): void {
    this.selectedRuntime = runtime;
  }

  addExecutionContext(
    name: string,
    mapping: PackageableElementReference<Mapping>,
    defaultRuntime: PackageableElementReference<PackageableRuntime>,
  ): void {
    const newContext = new DataSpaceExecutionContext();
    newContext.name = name;
    newContext.description = `Description for ${name}`;
    newContext.mapping = mapping;
    newContext.defaultRuntime = defaultRuntime;
=======
  addExecutionContext(): void {
    // Check if a default mapping and runtime are available
    const defaultMapping = this.editorStore.graphManagerState.usableMappings[0];
    const defaultRuntime = this.editorStore.graphManagerState.usableRuntimes[0];

    if (!defaultMapping || !defaultRuntime) {
      console.error('Default Mapping and Runtime are required.');
      return;
    }

    // Create a new execution context with default values
    const newContext = new DataSpaceExecutionContext();
    newContext.name = `ExecutionContext ${this.dataSpace.executionContexts.length + 1}`;
    newContext.title = `Title for ${newContext.name}`;
    newContext.description = `Description for ${newContext.name}`;
    newContext.mapping =
      PackageableElementExplicitReference.create(defaultMapping);
    newContext.defaultRuntime =
      PackageableElementExplicitReference.create(defaultRuntime);

    observe_DataSpaceExecutionContext(newContext);

    // Add the new context to the dataSpace and select it
>>>>>>> executionContext is finished
    this.dataSpace.executionContexts.push(newContext);
    this.setSelectedExecutionContext(newContext);
    this.setDefaultExecutionContext(newContext);
    this.setSelectedTab(DATASPACE_TAB.EXECUTION_CONTEXT);
  }

<<<<<<< HEAD
=======
  setDiagrams(diagrams: DataSpaceDiagram[]): void {
    this.diagrams = diagrams;
    this.diagrams.forEach(observe_DataSpaceDiagram);
  }

  selectDiagram(diagram: DataSpaceDiagram): void {
    this.selectedDiagram = diagram;
  }

  setElements(elements: DataSpaceElementPointer[]): void {
    this.elements = elements;
    // this.elements.forEach(observe_DataSpaceElementPointer);
  }

  selectElementPointer(elementPointer: DataSpaceElementPointer): void {
    this.selectedElementPointer = elementPointer;
  }

  // setExcludeForElementPointer(
  //   elementPointer: DataSpaceElementPointer,
  //   exclude: boolean,
  // ): void {
  //   elementPointer.exclude = exclude;
  // }

  // setExcludeForElement(
  //   elementPointer: DataSpaceElementPointer,
  //   exclude: boolean,
  // ): void {
  //   const index = this.elements.findIndex((el) => el === elementPointer);
  //   if (index !== -1) {
  //     this.elements[index].exclude = exclude;
  //   }
  // }

  // removeElement(elementPointer: DataSpaceElementPointer): void {
  //   const index = this.elements.findIndex((el) => el === elementPointer);
  //   if (index !== -1) {
  //     this.elements.splice(index, 1);
  //   }
  // }

  setExecutables(executables: DataSpaceExecutable[]): void {
    this.executables = executables;
    this.dataSpace.executables = executables;
  }

  // selectExecutable(executable: DataSpaceExecutable): void {
  //   this.selectedExecutable = executable;
  // }

  // addExecutable(): void {
  //   const newExecutable = new DataSpacePackageableElementExecutable();
  //   newExecutable.title = `Executable ${this.executables.length + 1}`;
  //   newExecutable.description = `Description ${newExecutable.title}`;

  //   // Add the new executable to the DataSpace and observe it
  //   // this.executables.push(newExecutable);
  //   // this.dataSpace.executables = this.executables;
  //   // this.selectExecutable(newExecutable);
  //   newExecutable.executable = PackageableElementExplicitReference.create(
  //     this.editorStore.graphManagerState.graph.ownServices[0],
  //   );
  //   this.executables.push(newExecutable);
  //   this.selectedExecutable = newExecutable;
  // }

  // Reprocess the state when the underlying element is replaced
>>>>>>> elements and executable finished
  override reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    const newState = new DataSpaceEditorState(editorStore, newElement);
    return newState;
  }
}
