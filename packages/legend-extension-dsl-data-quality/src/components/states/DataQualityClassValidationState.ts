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

import { action, flow, makeObservable, observable } from 'mobx';
import {
  type Class,
  type Mapping,
  type PackageableElement,
  type Runtime,
  getMappingCompatibleClasses,
  PackageableElementExplicitReference,
  RuntimePointer,
} from '@finos/legend-graph';
import type {
  EditorStore,
  ElementEditorState,
} from '@finos/legend-application-studio';
import {
  DataQualityClassValidationsConfiguration,
  DataSpaceDataQualityExecutionContext,
  MappingAndRuntimeDataQualityExecutionContext,
} from '../../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';
import { DataQualityState } from './DataQualityState.js';
import {
  ResolvedDataSpaceEntityWithOrigin,
  type DataSpaceExecutionContext,
  DataSpace,
  hasMappingBasedDefaultExecutionContext,
  resolveUsableDataSpaceClasses,
} from '@finos/legend-extension-dsl-data-space/graph';
import { CLASS_ELEMENT_CREATION_BASIS } from '../DSL_DataQuality_ElementDriver.js';
import {
  type GeneratorFn,
  assertType,
  filterByType,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-shared';
import {
  dataQualityClassValidation_setContextDataQualityContext,
  dataQualityClassValidation_setDataQualityContext,
  dataQualityClassValidation_setDataQualityGraphFetchTree,
  dataQualityClassValidation_setFilter,
  dataQualityClassValidation_setRuntimeDataQualityContext,
} from '../../graph-manager/DSL_DataQuality_GraphModifierHelper.js';
import { DataQualityGraphFetchTreeState } from './DataQualityGraphFetchTreeState.js';
import { DataQualityResultState } from './DataQualityResultState.js';

export class DataQualityClassValidationState extends DataQualityState {
  dataSpace?: DataSpace | undefined;
  dataSpaces: ResolvedDataSpaceEntityWithOrigin[] = [];
  validationElementCreationBasis: CLASS_ELEMENT_CREATION_BASIS =
    CLASS_ELEMENT_CREATION_BASIS.MAPPING_RUNTIME_BASED;

  constructor(
    editorStore: EditorStore,
    element: DataQualityClassValidationsConfiguration,
  ) {
    super(editorStore, element);
    makeObservable(this, {
      dataSpaces: observable,
      dataSpace: observable,
      onDataSpaceChange: action,
      initializeState: action,
      updateElementOnMappingChange: action,
      updateElementOnRuntimeChange: action,
      updateElementOnExecutionContextChange: action,
      updateElementOnDataSpaceChange: action,
      loadDataSpaces: flow,
    });
    this.initializeState();
  }

  reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    const element = guaranteeType(
      newElement,
      DataQualityClassValidationsConfiguration,
      'Element inside data quality class validation editor state must be a class validation element',
    );

    return new DataQualityClassValidationState(editorStore, element);
  }

  override get constraintsConfigurationElement(): DataQualityClassValidationsConfiguration {
    return guaranteeType(
      this.element,
      DataQualityClassValidationsConfiguration,
      'Element inside data quality class validation state must be a data quality class validation configuration element',
    );
  }

  initializeState() {
    let classOptions: Class[] = [];
    if (
      this.constraintsConfigurationElement.context instanceof
      MappingAndRuntimeDataQualityExecutionContext
    ) {
      this.validationElementCreationBasis =
        CLASS_ELEMENT_CREATION_BASIS.MAPPING_RUNTIME_BASED;
      this.dataQualityQueryBuilderState.executionContextState.setMapping(
        this.constraintsConfigurationElement.context.mapping.value,
      );
      this.dataQualityQueryBuilderState.executionContextState.setRuntimeValue(
        new RuntimePointer(
          this.constraintsConfigurationElement.context.runtime,
        ),
      );
      classOptions = getMappingCompatibleClasses(
        guaranteeNonNullable(
          this.dataQualityQueryBuilderState.executionContextState.mapping,
        ),
        this.graphManagerState.usableClasses,
      );
    } else if (
      this.constraintsConfigurationElement.context instanceof
      DataSpaceDataQualityExecutionContext
    ) {
      this.validationElementCreationBasis =
        CLASS_ELEMENT_CREATION_BASIS.DATASPACE_BASED;
      this.dataSpace =
        this.constraintsConfigurationElement.context.dataSpace.value;
      const defaultExecutionContext = guaranteeNonNullable(
        this.dataSpace.defaultExecutionContext,
        `Data product '${this.dataSpace.path}' does not have a default execution context`,
      );
      this.executionContext = defaultExecutionContext;
      this.dataQualityQueryBuilderState.executionContextState.setMapping(
        guaranteeNonNullable(
          defaultExecutionContext.mapping,
          `Default execution context '${defaultExecutionContext.name}' does not have a mapping`,
        ).value,
      );
      this.dataQualityQueryBuilderState.executionContextState.setRuntimeValue(
        new RuntimePointer(
          guaranteeNonNullable(
            defaultExecutionContext.defaultRuntime,
            `Default execution context '${defaultExecutionContext.name}' does not have a default runtime`,
          ),
        ),
      );
      classOptions = resolveUsableDataSpaceClasses(
        this.dataSpace,
        guaranteeNonNullable(
          this.dataQualityQueryBuilderState.executionContextState.mapping,
        ),
        this.graphManagerState,
      );
    }
    this.initializeGraphFetchTreeState(
      this.constraintsConfigurationElement.dataQualityRootGraphFetchTree,
    );
    this.initializeFilterState(this.constraintsConfigurationElement.filter);

    if (this.constraintsConfigurationElement.dataQualityRootGraphFetchTree) {
      this.dataQualityQueryBuilderState.setSourceElement(
        this.constraintsConfigurationElement.dataQualityRootGraphFetchTree.class
          .value,
      );
    } else {
      this.dataQualityQueryBuilderState.setSourceElement(classOptions[0]);
      this.dataQualityGraphFetchTreeState = new DataQualityGraphFetchTreeState(
        this,
      );
      dataQualityClassValidation_setDataQualityGraphFetchTree(
        this.constraintsConfigurationElement,
        this.dataQualityGraphFetchTreeState.treeData
          ? this.dataQualityGraphFetchTreeState.treeData.tree
          : undefined,
      );
    }
  }

  changeMapping(val: Mapping, options?: { keepQueryContent?: boolean }): void {
    //reset result
    this.dataQualityQueryBuilderState.executionContextState.setMapping(val);
    this.dataQualityQueryBuilderState.executionContextState.setRuntimeValue(
      undefined,
    );
    this.dataQualityQueryBuilderState.explorerState.setTreeData(undefined);
    this.dataQualityQueryBuilderState.setSourceElement(undefined);
    this.dataQualityGraphFetchTreeState = new DataQualityGraphFetchTreeState(
      this,
    );
    this.structuralValidationsGraphFetchTreeState =
      new DataQualityGraphFetchTreeState(this);
    this.resultState = new DataQualityResultState(this);
  }

  changeRuntime(val: Runtime) {
    this.dataQualityQueryBuilderState.changeRuntime(val);
    this.resultState = new DataQualityResultState(this);
  }

  updateElementOnMappingChange() {
    const mappingAndRuntimeExecutionContext =
      new MappingAndRuntimeDataQualityExecutionContext();
    mappingAndRuntimeExecutionContext.mapping =
      PackageableElementExplicitReference.create(
        guaranteeNonNullable(
          this.dataQualityQueryBuilderState.executionContextState.mapping,
        ),
      );
    guaranteeNonNullable(
      this.dataQualityQueryBuilderState.executionContextState.runtimeValue,
    );
    mappingAndRuntimeExecutionContext.runtime = (
      this.dataQualityQueryBuilderState.executionContextState
        .runtimeValue as RuntimePointer
    ).packageableRuntime;
    dataQualityClassValidation_setDataQualityContext(
      this.constraintsConfigurationElement,
      mappingAndRuntimeExecutionContext,
    );
    dataQualityClassValidation_setDataQualityGraphFetchTree(
      this.constraintsConfigurationElement,
      undefined,
    );
    dataQualityClassValidation_setFilter(
      this.constraintsConfigurationElement,
      undefined,
    );
  }

  updateElementOnRuntimeChange(runtime: Runtime) {
    assertType(runtime, RuntimePointer);
    dataQualityClassValidation_setRuntimeDataQualityContext(
      this.constraintsConfigurationElement,
      runtime.packageableRuntime,
      this.editorStore.changeDetectionState.observerContext,
    );
  }

  updateElementOnExecutionContextChange(context: string) {
    dataQualityClassValidation_setContextDataQualityContext(
      this.constraintsConfigurationElement,
      context,
    );
  }

  propagateExecutionContextChange(
    executionContext: DataSpaceExecutionContext,
  ): void {
    const mapping = guaranteeNonNullable(
      executionContext.mapping,
      `Execution context '${executionContext.name}' does not have a mapping`,
    ).value;
    this.changeMapping(mapping);
    this.dataQualityQueryBuilderState.changeRuntime(
      new RuntimePointer(
        guaranteeNonNullable(
          executionContext.defaultRuntime,
          `Execution context '${executionContext.name}' does not have a default runtime`,
        ),
      ),
    );
    const compatibleClasses = resolveUsableDataSpaceClasses(
      guaranteeNonNullable(this.dataSpace),
      mapping,
      this.graphManagerState,
    );
    // if there is no chosen class or the chosen one is not compatible
    // with the mapping then pick a compatible class if possible
    if (
      !this.dataQualityQueryBuilderState.sourceClass ||
      !compatibleClasses.includes(this.dataQualityQueryBuilderState.sourceClass)
    ) {
      const possibleNewClass = compatibleClasses[0];
      if (possibleNewClass) {
        this.changeSourceElement(possibleNewClass);
      }
    }
  }

  onDataSpaceChange(dataSpaceInfo: ResolvedDataSpaceEntityWithOrigin) {
    this.dataSpace = guaranteeType(
      this.graphManagerState.graph.getElement(dataSpaceInfo.path),
      DataSpace,
    );
    const defaultExecutionContext = guaranteeNonNullable(
      this.dataSpace.defaultExecutionContext,
      `Data product '${this.dataSpace.path}' does not have a default execution context`,
    );
    this.setExecutionContext(defaultExecutionContext);
    this.propagateExecutionContextChange(defaultExecutionContext);
  }

  updateElementOnDataSpaceChange() {
    const dataSpaceExecutionContext =
      new DataSpaceDataQualityExecutionContext();
    dataSpaceExecutionContext.context = this.executionContext.name;
    dataSpaceExecutionContext.dataSpace =
      PackageableElementExplicitReference.create(
        guaranteeNonNullable(this.dataSpace),
      );
    dataQualityClassValidation_setDataQualityContext(
      this.constraintsConfigurationElement,
      dataSpaceExecutionContext,
    );
    this.updateElementOnClassChange();
  }

  *loadDataSpaces(): GeneratorFn<void> {
    this.dataSpaces = this.graphManagerState.graph.allOwnElements
      .filter(filterByType(DataSpace))
      .filter(hasMappingBasedDefaultExecutionContext)
      .map(
        (e) =>
          new ResolvedDataSpaceEntityWithOrigin(
            undefined,
            e.title,
            e.name,
            e.path,
            guaranteeNonNullable(e.defaultExecutionContext).name,
          ),
      );
  }
}
