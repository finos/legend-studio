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
  DataQualityClassValidationsConfiguration,
  DataSpaceDataQualityExecutionContext,
  MappingAndRuntimeDataQualityExecutionContext,
} from '../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';
import { action, computed, makeObservable, observable } from 'mobx';
import {
  filterByType,
  getNullableFirstEntry,
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

export enum ELEMENT_CREATION_BASIS {
  MAPPING_RUNTIME_BASED = 'Mapping/Runtime',
  DATASPACE_BASED = 'DataSpace',
}

export class DataQuality_ClassElementDriver extends NewElementDriver<DataQualityClassValidationsConfiguration> {
  dqElementCreationBasis: ELEMENT_CREATION_BASIS;
  dataSpaceSelected: PackageableElementOption<DataSpace> | undefined;
  mappingSelected: PackageableElementOption<Mapping> | undefined;
  runtimeSelected: RuntimeOption | undefined;

  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      dataSpaceSelected: observable,
      mappingSelected: observable,
      runtimeSelected: observable,
      dqElementCreationBasis: observable,
      setDataSpaceSelected: action,
      setMappingSelected: action,
      setRuntimeSelected: action,
      setDqElementCreationBasis: action,
      runtimeOptions: computed,
    });
    this.dqElementCreationBasis = ELEMENT_CREATION_BASIS.DATASPACE_BASED;
    this.dataSpaceSelected = getNullableFirstEntry(this.dataSpaceOptions);
    this.mappingSelected = getNullableFirstEntry(this.mappingOptions);
    this.runtimeSelected = getNullableFirstEntry(this.runtimeOptions);
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

  setDqElementCreationBasis(
    dqElementCreationBasis: ELEMENT_CREATION_BASIS,
  ): void {
    this.dqElementCreationBasis = dqElementCreationBasis;
  }

  get isValid(): boolean {
    if (
      this.dqElementCreationBasis === ELEMENT_CREATION_BASIS.DATASPACE_BASED
    ) {
      return Boolean(this.dataSpaceSelected);
    }
    return Boolean(this.mappingSelected && this.runtimeSelected);
  }

  createElement(name: string): DataQualityClassValidationsConfiguration {
    let usableClasses: Class[] = [];
    const dataQualityConstraintsConfiguration =
      new DataQualityClassValidationsConfiguration(name);
    if (
      this.dqElementCreationBasis === ELEMENT_CREATION_BASIS.DATASPACE_BASED
    ) {
      const dataSpaceToSet = PackageableElementExplicitReference.create(
        this.dataSpaceSelected!.value,
      );
      const dataSpaceExecutionContext =
        new DataSpaceDataQualityExecutionContext();
      dataSpaceExecutionContext.context =
        dataSpaceToSet.value.defaultExecutionContext.name;
      dataSpaceExecutionContext.dataSpace = dataSpaceToSet;
      dataQualityConstraintsConfiguration.context = dataSpaceExecutionContext;
      dataQualityConstraintsConfiguration.dataQualityRootGraphFetchTree =
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
        dataQualityConstraintsConfiguration.context =
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
    dataQualityConstraintsConfiguration.dataQualityRootGraphFetchTree =
      buildDefaultDataQualityRootGraphFetchTree(usableClasses[0]!);
    return dataQualityConstraintsConfiguration;
  }
}
