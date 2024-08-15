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
<<<<<<< HEAD
=======
  DataSpaceDiagram,
>>>>>>> elements finished
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
  observe_DataSpaceSupportInfo,
} from '@finos/legend-extension-dsl-data-space/graph';
import { guaranteeType } from '@finos/legend-shared';
import {
  addDataSpaceDiagram,
  removeDataSpaceDiagram,
  set_dataSpaceElements,
  setElementExclude,
} from './studio/DSL_DataSpace_GraphModifierHelper.js';
import { Diagram } from '@finos/legend-extension-dsl-diagram/graph';

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
  selectedSupportInfoType: SUPPORT_INFO_TYPE;
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
<<<<<<< HEAD
  selectedDiagram?: DataSpaceDiagram;
<<<<<<< HEAD
>>>>>>> executionContext is finished
=======
=======
  selectedDiagram?: DataSpaceDiagram | null = null;
>>>>>>> elements finished
  elements: DataSpaceElementPointer[] = [];
  selectedElementPointer?: DataSpaceElementPointer;
  executables: DataSpaceExecutable[] = [];
  // elementOptions: any;
  // selectedExecutable?: DataSpaceExecutable;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      dataSpace: computed,
      // elementOptions: computed,
      selectedSupportInfoType: observable,
      selectedTab: observable,
      selectedExecutionContext: observable,
<<<<<<< HEAD
<<<<<<< HEAD
      newExecutionContextName: observable,
      selectedMapping: observable,
      selectedRuntime: observable,
=======
      selectedDiagram: observable,
=======
      // selectedDiagram: observable,
>>>>>>> elements finished
      elements: observable,
      executables: observable,
      selectedElementPointer: observable,
      // selectedExecutable: observable,
      setDiagrams: action,
<<<<<<< HEAD
      selectDiagram: action,
>>>>>>> executionContext is finished
=======
      setSelectedDiagram: action,
      addDiagram: action,
      removeDiagram: action,
>>>>>>> elements finished
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
      setSelectedElementPointer: action,
      setExecutables: action,
      reprocess: action,
    });

    if (!this.dataSpace.supportInfo) {
      this.dataSpace.supportInfo = new DataSpaceSupportEmail();
      observe_DataSpaceSupportInfo(this.dataSpace.supportInfo);
    }
    this.selectedSupportInfoType = SUPPORT_INFO_TYPE.EMAIL;

    // this.selectedSupportInfoType =
    //   this.dataSpace.supportInfo instanceof DataSpaceSupportEmail
    //     ? SUPPORT_INFO_TYPE.EMAIL
    //     : SUPPORT_INFO_TYPE.COMBINED_INFO;

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
    const defaultMapping = this.editorStore.graphManagerState.usableMappings[0];
    const defaultRuntime = this.editorStore.graphManagerState.usableRuntimes[0];

    if (!defaultMapping || !defaultRuntime) {
      console.error('Default Mapping and Runtime are required.');
      return;
    }
    const newContext = new DataSpaceExecutionContext();
    newContext.name = `ExecutionContext ${this.dataSpace.executionContexts.length + 1}`;
    newContext.title = `Title for ${newContext.name}`;
    newContext.description = `Description for ${newContext.name}`;
    newContext.mapping =
      PackageableElementExplicitReference.create(defaultMapping);
    newContext.defaultRuntime =
      PackageableElementExplicitReference.create(defaultRuntime);
    observe_DataSpaceExecutionContext(newContext);
<<<<<<< HEAD

    // Add the new context to the dataSpace and select it
>>>>>>> executionContext is finished
=======
>>>>>>> elements finished
    this.dataSpace.executionContexts.push(newContext);
    this.setSelectedExecutionContext(newContext);
    this.setDefaultExecutionContext(newContext);
    this.setSelectedTab(DATASPACE_TAB.EXECUTION_CONTEXT);
  }

<<<<<<< HEAD
=======
  setDiagrams(diagrams: DataSpaceDiagram[]): void {
    this.diagrams = diagrams;
  }

  addDiagram(): void {
    const defaultDiagram =
      this.editorStore.graphManagerState.graph.allElements.find(
        (element) => element instanceof Diagram,
      ) as Diagram | undefined;

    if (!defaultDiagram) {
      console.error('Default Diagram is required.');
      return;
    }
    const newDiagram = new DataSpaceDiagram();

    const diagramCount = this.dataSpace.diagrams?.length ?? 0;
    newDiagram.title = `Diagram ${diagramCount + 1}`;
    newDiagram.description = `Description for ${newDiagram.title}`;
    newDiagram.diagram =
      PackageableElementExplicitReference.create(defaultDiagram);
    observe_DataSpaceDiagram(newDiagram);
    this.dataSpace.diagrams = this.dataSpace.diagrams ?? [];
    this.dataSpace.diagrams.push(newDiagram);
    this.setSelectedDiagram(null);
    this.setSelectedDiagram(newDiagram);
    this.setSelectedTab(DATASPACE_TAB.DIAGRAM);
  }

  setSelectedDiagram(diagram: DataSpaceDiagram | null): void {
    this.selectedDiagram = diagram;
  }

  removeDiagram(diagram: DataSpaceDiagram): void {
    removeDataSpaceDiagram(this.dataSpace, diagram);
    this.setDiagrams(this.dataSpace.diagrams ?? []);
    if (this.selectedDiagram === diagram) {
      this.setSelectedDiagram(null);
    }
  }

  setElements(elements: DataSpaceElementPointer[]): void {
    elements.forEach(observe_DataSpaceElementPointer);
    set_dataSpaceElements(this.dataSpace, elements);
    this.elements = this.dataSpace.elements ?? [];
  }

  setSelectedElementPointer(element: DataSpaceElementPointer): void {
    this.selectedElementPointer = element;
    observe_DataSpaceElementPointer(element);
  }

  updateElementExclude(
    element: DataSpaceElementPointer,
    exclude: boolean,
  ): void {
    setElementExclude(element, exclude);
  }

  selectElementPointer(element: DataSpaceElementPointer): void {
    this.selectedElementPointer = element;
  }

  updateSelectedElementPointer(
    newElementPointer: DataSpaceElementPointer,
  ): void {
    this.selectedElementPointer = newElementPointer;
  }

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
