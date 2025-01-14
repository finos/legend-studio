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

import type { GenericLegendApplicationStore } from '@finos/legend-application';
import {
  type Mapping,
  type Runtime,
  type GraphManagerState,
  getMappingCompatibleRuntimes,
  RuntimePointer,
  PackageableElementExplicitReference,
  getMappingCompatibleClasses,
} from '@finos/legend-graph';
import { renderMappingQueryBuilderSetupPanelContent } from '../../components/workflows/MappingQueryBuilder.js';
import { QueryBuilderState } from '../QueryBuilderState.js';
import type { QueryBuilderConfig } from '../../graph-manager/QueryBuilderConfig.js';
import type {
  QueryBuilderActionConfig,
  QueryBuilderWorkflowState,
} from '../query-workflow/QueryBuilderWorkFlowState.js';

export class MappingQueryBuilderState extends QueryBuilderState {
  readonly onMappingChange?: ((val: Mapping) => void) | undefined;
  readonly onRuntimeChange?: ((val: Runtime) => void) | undefined;

  override TEMPORARY__setupPanelContentRenderer = (): React.ReactNode =>
    renderMappingQueryBuilderSetupPanelContent(this);

  constructor(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
    workflowState: QueryBuilderWorkflowState,
    actionConfig: QueryBuilderActionConfig,
    onMappingChange?: ((val: Mapping) => void) | undefined,
    onRuntimeChange?: ((val: Runtime) => void) | undefined,
    config?: QueryBuilderConfig | undefined,
    sourceInfo?: object | undefined,
  ) {
    super(
      applicationStore,
      graphManagerState,
      workflowState,

      config,
      sourceInfo,
    );

    this.onMappingChange = onMappingChange;
    this.onRuntimeChange = onRuntimeChange;
    this.workflowState.updateActionConfig(actionConfig);
  }

  /**
   * Propagation after changing the mapping:
   * - If no runtime is chosen, try to choose a compatible runtime
   * - If the chosen runtime is compatible with the new chosen mapping, do nothing, otherwise, try to choose a compatible runtime
   * - If no class is chosen, try to choose a compatible class
   * - If the chosen class is compatible with the new chosen mapping, do nothing, otherwise, try to choose a compatible class
   */
  propagateMappingChange(mapping: Mapping): void {
    // try to select the first compatible runtime,
    // if none found, just unset the current runtime value
    const compatibleRuntimes = getMappingCompatibleRuntimes(
      mapping,
      this.graphManagerState.usableRuntimes,
    );
    const possibleNewRuntime = compatibleRuntimes[0];
    if (possibleNewRuntime) {
      this.changeRuntime(
        new RuntimePointer(
          PackageableElementExplicitReference.create(possibleNewRuntime),
        ),
      );
    }

    const compatibleClasses = getMappingCompatibleClasses(
      mapping,
      this.graphManagerState.usableClasses,
    );
    // if there is no chosen class or the chosen one is not compatible
    // with the mapping then pick a compatible class if possible
    if (!this.class || !compatibleClasses.includes(this.class)) {
      const possibleNewClass = compatibleClasses[0];
      if (possibleNewClass) {
        this.changeClass(possibleNewClass);
      }
    }
  }
}
