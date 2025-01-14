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

import {
  type EditorStore,
  NewElementDriver,
} from '@finos/legend-application-studio';
import {
  type DataQualityValidationConfiguration,
  DataQualityClassValidationsConfiguration,
  DataQualityServiceValidationConfiguration,
  DataQualityRelationValidationConfiguration,
  DataSpaceDataQualityExecutionContext,
  MappingAndRuntimeDataQualityExecutionContext,
  DataQualityRelationQueryLambda,
} from '../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';
import { action, computed, makeObservable, observable } from 'mobx';
import {
  filterByType,
  guaranteeNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import {
  type Mapping,
  type PackageableRuntime,
  type Class,
  getMappingCompatibleRuntimes,
  PackageableElementExplicitReference,
  getMappingCompatibleClasses,
} from '@finos/legend-graph';
import {
  type PackageableElementOption,
  buildElementOption,
} from '@finos/legend-lego/graph-editor';
import {
  DataSpace,
  resolveUsableDataSpaceClasses,
} from '@finos/legend-extension-dsl-data-space/graph';
import { buildDefaultDataQualityRootGraphFetchTree } from './utils/DataQualityGraphFetchTreeUtil.js';

export type RuntimeOption = {
  label: string;
  value: PackageableRuntime | undefined;
};

export enum CLASS_ELEMENT_CREATION_BASIS {
  MAPPING_RUNTIME_BASED = 'Mapping/Runtime',
  DATASPACE_BASED = 'DataSpace',
}

export enum DQ_VALIDATION_ELEMENT_TYPE {
  CLASS_VALIDATION = 'ClassValidation',
  SERVICE_VALIDATION = 'ServiceValidation',
  RELATION_VALIDATION = 'RelationValidation',
}

export class DataQuality_ElementDriver extends NewElementDriver<DataQualityValidationConfiguration> {
  dqValidationElementType: DQ_VALIDATION_ELEMENT_TYPE;
  dqClassElementCreationBasis: CLASS_ELEMENT_CREATION_BASIS;
  dataSpaceSelected: PackageableElementOption<DataSpace> | undefined;
  mappingSelected: PackageableElementOption<Mapping> | undefined;
  runtimeSelected: RuntimeOption | undefined;

  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      dataSpaceSelected: observable,
      mappingSelected: observable,
      runtimeSelected: observable,
      dqValidationElementType: observable,
      dqClassElementCreationBasis: observable,
      setDataSpaceSelected: action,
      setMappingSelected: action,
      setRuntimeSelected: action,
      setDqClassElementCreationBasis: action,
      setDqValidationElementType: action,
      runtimeOptions: computed,
    });
    this.dqValidationElementType = DQ_VALIDATION_ELEMENT_TYPE.CLASS_VALIDATION;
    this.dqClassElementCreationBasis =
      CLASS_ELEMENT_CREATION_BASIS.DATASPACE_BASED;
    this.dataSpaceSelected = this.dataSpaceOptions[0];
    this.mappingSelected = this.mappingOptions[0];
    this.runtimeSelected = this.runtimeOptions[0];
  }

  get dataSpaceOptions(): PackageableElementOption<DataSpace>[] {
    return this.editorStore.graphManagerState.graph.allOwnElements
      .filter(filterByType(DataSpace))
      .map(buildElementOption);
  }

  get mappingOptions(): PackageableElementOption<Mapping>[] {
    return this.editorStore.graphManagerState.usableMappings.map(
      buildElementOption,
    );
  }

  get compatibleMappingRuntimes(): PackageableRuntime[] {
    return this.mappingSelected?.value
      ? getMappingCompatibleRuntimes(
          this.mappingSelected.value,
          this.editorStore.graphManagerState.usableRuntimes,
        )
      : [];
  }

  get runtimeOptions(): RuntimeOption[] {
    return this.compatibleMappingRuntimes.map((runtime) =>
      buildElementOption(runtime),
    );
  }

  setDataSpaceSelected(
    dataSpace: PackageableElementOption<DataSpace> | undefined,
  ): void {
    this.dataSpaceSelected = dataSpace;
  }

  setMappingSelected(
    mappingSelected: PackageableElementOption<Mapping> | undefined,
  ): void {
    this.mappingSelected = mappingSelected;
  }

  setRuntimeSelected(runtimeSelected: RuntimeOption | undefined): void {
    this.runtimeSelected = runtimeSelected;
  }

  setDqClassElementCreationBasis(
    dqClassElementCreationBasis: CLASS_ELEMENT_CREATION_BASIS,
  ): void {
    this.dqClassElementCreationBasis = dqClassElementCreationBasis;
  }

  setDqValidationElementType(
    dqValidationElementType: DQ_VALIDATION_ELEMENT_TYPE,
  ): void {
    this.dqValidationElementType = dqValidationElementType;
  }

  get isValid(): boolean {
    if (
      this.dqValidationElementType ===
        DQ_VALIDATION_ELEMENT_TYPE.RELATION_VALIDATION ||
      this.dqValidationElementType ===
        DQ_VALIDATION_ELEMENT_TYPE.SERVICE_VALIDATION
    ) {
      return true;
    }
    if (
      this.dqClassElementCreationBasis ===
      CLASS_ELEMENT_CREATION_BASIS.DATASPACE_BASED
    ) {
      return Boolean(this.dataSpaceSelected);
    }
    return Boolean(this.mappingSelected && this.runtimeSelected);
  }

  createRelationValidationElement(
    name: string,
  ): DataQualityValidationConfiguration {
    const relationValidationConfiguration =
      new DataQualityRelationValidationConfiguration(name);
    relationValidationConfiguration.query =
      new DataQualityRelationQueryLambda();
    relationValidationConfiguration.query.body =
      this.editorStore.graphManagerState.graphManager.createDefaultBasicRawLambda().body;
    this.editorStore.graphManagerState.graphManager.createDefaultBasicRawLambda();
    return relationValidationConfiguration;
  }

  createServiceValidationElement(
    name: string,
  ): DataQualityValidationConfiguration {
    return new DataQualityServiceValidationConfiguration(name);
  }

  createClassValidationElement(
    name: string,
  ): DataQualityValidationConfiguration {
    let usableClasses: Class[] = [];
    const dataQualityClassConstraintsConfiguration =
      new DataQualityClassValidationsConfiguration(name);
    if (
      this.dqClassElementCreationBasis ===
      CLASS_ELEMENT_CREATION_BASIS.DATASPACE_BASED
    ) {
      const dataSpaceToSet = PackageableElementExplicitReference.create(
        this.dataSpaceSelected!.value,
      );
      const dataSpaceExecutionContext =
        new DataSpaceDataQualityExecutionContext();
      dataSpaceExecutionContext.context =
        dataSpaceToSet.value.defaultExecutionContext.name;
      dataSpaceExecutionContext.dataSpace = dataSpaceToSet;
      dataQualityClassConstraintsConfiguration.context =
        dataSpaceExecutionContext;
      dataQualityClassConstraintsConfiguration.dataQualityRootGraphFetchTree =
        undefined;
      usableClasses = resolveUsableDataSpaceClasses(
        dataSpaceToSet.value,
        dataSpaceToSet.value.defaultExecutionContext.mapping.value,
        this.editorStore.graphManagerState,
      );
    } else {
      if (this.mappingSelected && this.runtimeSelected) {
        const mappingOption = guaranteeNonNullable(this.mappingSelected);
        const _mapping = mappingOption.value;
        const mapping = PackageableElementExplicitReference.create(_mapping);
        const runtimeOption = guaranteeNonNullable(this.runtimeSelected.value);
        const runtimeValue =
          PackageableElementExplicitReference.create(runtimeOption);
        const mappingAndRuntimeExecutionContext =
          new MappingAndRuntimeDataQualityExecutionContext();
        mappingAndRuntimeExecutionContext.mapping = mapping;
        mappingAndRuntimeExecutionContext.runtime = runtimeValue;
        dataQualityClassConstraintsConfiguration.context =
          mappingAndRuntimeExecutionContext;
        usableClasses = getMappingCompatibleClasses(
          mapping.value,
          this.editorStore.graphManagerState.usableClasses,
        );
      }
    }
    if (usableClasses.length === 0) {
      throw new UnsupportedOperationError(
        'Must have at least one usable class with given mapping',
      );
    }
    dataQualityClassConstraintsConfiguration.dataQualityRootGraphFetchTree =
      buildDefaultDataQualityRootGraphFetchTree(usableClasses[0]!);
    return dataQualityClassConstraintsConfiguration;
  }

  createElement(name: string): DataQualityValidationConfiguration {
    switch (this.dqValidationElementType) {
      case DQ_VALIDATION_ELEMENT_TYPE.RELATION_VALIDATION:
        return this.createRelationValidationElement(name);
      case DQ_VALIDATION_ELEMENT_TYPE.SERVICE_VALIDATION:
        return this.createServiceValidationElement(name);
      case DQ_VALIDATION_ELEMENT_TYPE.CLASS_VALIDATION:
        return this.createClassValidationElement(name);

      default:
        throw new UnsupportedOperationError(
          `Can't create data quality validation configuration of type '${this.dqValidationElementType}'`,
        );
    }
  }
}
