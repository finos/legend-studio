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
  assertTrue,
  uniq,
  guaranteeNonNullable,
  filterByType,
} from '@finos/legend-shared';
import {
  ModelAccessPointGroup,
  type NativeModelAccess,
  type DataProduct,
  type DataProductElement,
  type ElementScope,
  type NativeModelExecutionContext,
} from '../../graph/metamodel/pure/dataProduct/DataProduct.js';
import type { Mapping } from '../../graph/metamodel/pure/packageableElements/mapping/Mapping.js';
import type { GraphManagerState } from '../GraphManagerState.js';
import type { MappingModelCoverageAnalysisResult } from '../action/analytics/MappingModelCoverageAnalysis.js';
import { getMappingCompatibleClasses } from '../../graph/helpers/DSL_Mapping_Helper.js';
import type { Class } from '../../graph/metamodel/pure/packageableElements/domain/Class.js';
import { elementBelongsToPackage } from '../../graph/helpers/DomainHelper.js';
import { Package } from '../../graph/metamodel/pure/packageableElements/domain/Package.js';

export const isDataProductNative = (dataProduct: DataProduct): boolean => {
  return dataProduct.nativeModelAccess !== undefined;
};

export const isDataProductModeled = (dataProduct: DataProduct): boolean => {
  const groups = dataProduct.accessPointGroups;
  if (groups.length === 1) {
    const group = groups[0];
    if (group instanceof ModelAccessPointGroup) {
      return true;
    }
  }
  return false;
};

export const getModelGroupFromNativeDataProduct = (
  dataProduct: DataProduct,
): NativeModelAccess => {
  assertTrue(isDataProductNative(dataProduct), 'Data product is not native');
  return guaranteeNonNullable(
    dataProduct.nativeModelAccess,
    'Native access point group is expected',
  );
};

const matchesDataElement = (
  _class: Class,
  element: DataProductElement,
): boolean => {
  if (_class === element) {
    return true;
  }
  if (element instanceof Package) {
    return elementBelongsToPackage(_class, element);
  }
  return false;
};

export const resolveUsableDataProductClasses = (
  elements: ElementScope[] | undefined,
  mapping: Mapping,
  graphManagerState: GraphManagerState,
  mappingModelCoverageAnalysisResult?: MappingModelCoverageAnalysisResult,
): Class[] => {
  let compatibleClasses = getMappingCompatibleClasses(
    mapping,
    graphManagerState.usableClasses,
  );
  if (
    // This check is to make sure that we have `info` field present in `MappedEntity` which
    // contains information about the mapped class path
    mappingModelCoverageAnalysisResult?.mappedEntities.some(
      (m) => m.info !== undefined,
    )
  ) {
    const uniqueCompatibleClasses = uniq(
      mappingModelCoverageAnalysisResult.mappedEntities
        // is root entity filters out mapped classes
        .filter((e) => e.info?.isRootEntity)
        .map((e) => e.info?.classPath),
    );
    compatibleClasses = graphManagerState.graph.classes.filter((c) =>
      uniqueCompatibleClasses.includes(c.path),
    );
  }
  if (elements?.length) {
    return compatibleClasses.filter((_class) => {
      const _classElements = elements
        .filter((e) => matchesDataElement(_class, e.element.value))
        // we sort because we respect the closest definition to the element.
        .sort(
          (a, b) => b.element.value.path.length - a.element.value.path.length,
        );
      if (!_classElements.length) {
        return false;
      }
      return !_classElements[0]?.exclude;
    });
  }
  return compatibleClasses;
};

export const resolveDataProductExecutionState = (
  dataProduct: DataProduct,
): NativeModelExecutionContext | ModelAccessPointGroup => {
  if (isDataProductNative(dataProduct)) {
    return getModelGroupFromNativeDataProduct(dataProduct)
      .defaultExecutionContext;
  } else {
    const modelAccessGroup = dataProduct.accessPointGroups.filter(
      filterByType(ModelAccessPointGroup),
    )[0];
    return guaranteeNonNullable(
      modelAccessGroup,
      'No native model access group or model access group on data product',
    );
  }
};
