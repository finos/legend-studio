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
  type Service,
  getMappingCompatibleClasses,
  PureMultiExecution,
  PureSingleExecution,
} from '@finos/legend-graph';
import {
  getNullableFirstElement,
  IllegalStateError,
} from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';
import { renderServiceQueryBuilderSetupPanelContent } from '../../components/workflows/ServiceQueryBuilder.js';
import { QueryBuilderState } from '../QueryBuilderState.js';

export type ServiceExecutionContext = {
  key: string;
  mapping: Mapping;
  runtimeValue: Runtime;
};

export class ServiceQueryBuilderState extends QueryBuilderState {
  readonly service: Service;
  readonly executionContexts: ServiceExecutionContext[] = [];
  readonly onExecutionContextChange?:
    | ((val: ServiceExecutionContext) => void)
    | undefined;

  override TEMPORARY__setupPanelContentRenderer = (): React.ReactNode =>
    renderServiceQueryBuilderSetupPanelContent(this);

  selectedExecutionContext?: ServiceExecutionContext | undefined;

  constructor(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
    service: Service,
    executionContextKey?: string | undefined,
    onExecutionContextChange?:
      | ((val: ServiceExecutionContext) => void)
      | undefined,
  ) {
    super(applicationStore, graphManagerState);

    makeObservable(this, {
      selectedExecutionContext: observable,
      setSelectedExecutionContext: action,
    });

    this.service = service;
    this.onExecutionContextChange = onExecutionContextChange;

    if (service.execution instanceof PureSingleExecution) {
      this.mapping = service.execution.mapping.value;
      this.runtimeValue = service.execution.runtime;
    } else if (service.execution instanceof PureMultiExecution) {
      this.executionContexts = service.execution.executionParameters.map(
        (ep) => ({
          key: ep.key,
          mapping: ep.mapping.value,
          runtimeValue: ep.runtime,
        }),
      );

      const matchingExecutionContext = this.executionContexts.find(
        (ec) => ec.key === executionContextKey,
      );
      if (!matchingExecutionContext) {
        throw new IllegalStateError(
          `Can't initialize state: multi-execution service's execution context with key '${executionContextKey}' not found`,
        );
      }
      this.setSelectedExecutionContext(matchingExecutionContext);
      this.mapping = matchingExecutionContext.mapping;
      this.runtimeValue = matchingExecutionContext.runtimeValue;
    }
  }

  setSelectedExecutionContext(val: ServiceExecutionContext): void {
    this.selectedExecutionContext = val;
  }

  override get sideBarClassName(): string | undefined {
    return this.executionContexts.length
      ? 'query-builder__setup__service--with-mutiple-execution'
      : 'query-builder__setup__service';
  }

  override get isMappingReadOnly(): boolean {
    return true;
  }

  override get isRuntimeReadOnly(): boolean {
    return true;
  }

  /**
   * Propagation after changing the execution context:
   * - The mapping will be updated to the mapping of the execution context
   * - The runtime will be updated to the default runtime of the execution context
   * - If no class is selected, try to select a compatible class
   * - If the chosen class is compatible with the new selected mapping, do nothing, otherwise, try to select a compatible class
   */
  propagateExecutionContextChange(
    executionContext: ServiceExecutionContext,
  ): void {
    const mapping = executionContext.mapping;
    this.changeMapping(mapping);
    this.changeRuntime(executionContext.runtimeValue);

    const compatibleClasses = getMappingCompatibleClasses(
      mapping,
      this.graphManagerState.usableClasses,
    );
    // if there is no chosen class or the chosen one is not compatible
    // with the mapping then pick a compatible class if possible
    if (!this.class || !compatibleClasses.includes(this.class)) {
      const possibleNewClass = getNullableFirstElement(compatibleClasses);
      if (possibleNewClass) {
        this.changeClass(possibleNewClass);
      }
    }
  }
}
