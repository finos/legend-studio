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

import { action } from 'mobx';
import {
  type DataQualityClassValidationsConfiguration,
  type DataQualityExecutionContext,
  DataSpaceDataQualityExecutionContext,
  MappingAndRuntimeDataQualityExecutionContext,
} from '../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';
import { DataQualityRootGraphFetchTree } from '../graph/metamodel/pure/packageableElements/data-quality/DataQualityGraphFetchTree.js';
import {
  type GraphFetchTree,
  type PackageableElementReference,
  type PackageableRuntime,
  type RawLambda,
  type ObserverContext,
  observe_PackageableRuntime,
  observe_RawLambda,
  PackageableElementExplicitReference,
} from '@finos/legend-graph';
import {
  observe_DataQualityRootGraphFetchTree,
  observe_DataSpaceDataQualityExecutionContext,
  observe_MappingAndRuntimeDataQualityExecutionContext,
} from './action/changeDetection/DSL_DataQuality_ObserverHelper.js';

export const dataQualityClassValidation_setDataQualityGraphFetchTree = action(
  (
    element: DataQualityClassValidationsConfiguration,
    val: DataQualityRootGraphFetchTree | undefined,
  ): void => {
    element.dataQualityRootGraphFetchTree = val
      ? observe_DataQualityRootGraphFetchTree(val)
      : val;
  },
);

export const dataQualityClassValidation_setDataQualityContext = action(
  (
    element: DataQualityClassValidationsConfiguration,
    val: DataQualityExecutionContext,
  ): void => {
    if (val instanceof DataSpaceDataQualityExecutionContext) {
      element.context = observe_DataSpaceDataQualityExecutionContext(val);
    }
    if (val instanceof MappingAndRuntimeDataQualityExecutionContext) {
      element.context =
        observe_MappingAndRuntimeDataQualityExecutionContext(val);
    }
  },
);

export const dataQualityClassValidation_setFilter = action(
  (
    element: DataQualityClassValidationsConfiguration,
    val: RawLambda | undefined,
  ): void => {
    element.filter = val ? observe_RawLambda(val) : val;
  },
);

export const dataQualityClassValidation_setContextDataQualityContext = action(
  (element: DataQualityClassValidationsConfiguration, val: string): void => {
    if (element.context instanceof DataSpaceDataQualityExecutionContext) {
      element.context.context = val;
      element.context = observe_DataSpaceDataQualityExecutionContext(
        element.context,
      );
    }
  },
);

export const dataQualityClassValidation_setRuntimeDataQualityContext = action(
  (
    element: DataQualityClassValidationsConfiguration,
    val: PackageableElementReference<PackageableRuntime>,
    observerContext: ObserverContext,
  ): void => {
    if (
      element.context instanceof MappingAndRuntimeDataQualityExecutionContext
    ) {
      element.context.runtime = PackageableElementExplicitReference.create(
        observe_PackageableRuntime(val.value, observerContext),
      );
    }
  },
);
export const graphFetchTree_removeAllSubTrees = action(
  (target: GraphFetchTree): void => {
    target.subTrees = [];
  },
);
export const dataQualityGraphFetchTree_removeConstraints = action(
  (target: GraphFetchTree): void => {
    if (target instanceof DataQualityRootGraphFetchTree) {
      target.constraints = [];
    }
  },
);
