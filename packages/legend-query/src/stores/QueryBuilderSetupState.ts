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

import { action, flow, flowResult, makeAutoObservable, observable } from 'mobx';
import {
  type GeneratorFn,
  getNullableFirstElement,
  uniq,
  assertErrorThrown,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import type { QueryBuilderState } from './QueryBuilderState.js';
import {
  type Class,
  type Mapping,
  type PackageableRuntime,
  type Runtime,
  type ValueSpecification,
  type MappingModelCoverageAnalysisResult,
  getMilestoneTemporalStereotype,
  PackageableElementExplicitReference,
  RuntimePointer,
  DEFAULT_BUSINESS_DATE_MILESTONING_PARAMETER_NAME,
  DEFAULT_PROCESSING_DATE_MILESTONING_PARAMETER_NAME,
  MILESTONING_STEREOTYPE,
  observe_ValueSpecification,
  getAllIncludedMappings,
} from '@finos/legend-graph';

export class QueryBuilderSetupState {
  queryBuilderState: QueryBuilderState;
  _class?: Class | undefined;
  mapping?: Mapping | undefined;
  mappingModelCoverageAnalysisResult?: MappingModelCoverageAnalysisResult;
  runtimeValue?: Runtime | undefined;
  mappingIsReadOnly = false;
  runtimeIsReadOnly = false;
  showSetupPanel = true;

  // TODO: Change this when we modify how we deal with milestoning.
  // See https://github.com/finos/legend-studio/issues/1149
  businessDate?: ValueSpecification | undefined;
  processingDate?: ValueSpecification | undefined;

  constructor(queryBuilderState: QueryBuilderState) {
    makeAutoObservable(this, {
      queryBuilderState: false,
      processingDate: observable,
      businessDate: observable,
      mappingModelCoverageAnalysisResult: observable,
      setQueryBuilderState: action,
      setClass: action,
      setMapping: action,
      setRuntimeValue: action,
      setProcessingDate: action,
      setBusinessDate: action,
      setShowSetupPanel: action,
      analyzeMappingModelCoverage: flow,
    });

    this.queryBuilderState = queryBuilderState;
  }

  private initializeQueryMilestoningParameters(stereotype: string): void {
    switch (stereotype) {
      case MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL: {
        this.setBusinessDate(
          this.queryBuilderState.buildMilestoningParameter(
            DEFAULT_BUSINESS_DATE_MILESTONING_PARAMETER_NAME,
          ),
        );
        break;
      }
      case MILESTONING_STEREOTYPE.PROCESSING_TEMPORAL: {
        this.setProcessingDate(
          this.queryBuilderState.buildMilestoningParameter(
            DEFAULT_PROCESSING_DATE_MILESTONING_PARAMETER_NAME,
          ),
        );
        break;
      }
      case MILESTONING_STEREOTYPE.BITEMPORAL: {
        this.setProcessingDate(
          this.queryBuilderState.buildMilestoningParameter(
            DEFAULT_PROCESSING_DATE_MILESTONING_PARAMETER_NAME,
          ),
        );
        this.setBusinessDate(
          this.queryBuilderState.buildMilestoningParameter(
            DEFAULT_BUSINESS_DATE_MILESTONING_PARAMETER_NAME,
          ),
        );
        break;
      }
      default:
    }
  }

  get classes(): Class[] {
    return this.queryBuilderState.graphManagerState.graph.ownClasses
      .concat(
        this.queryBuilderState.graphManagerState.filterSystemElementOptions(
          this.queryBuilderState.graphManagerState.graph.systemModel.ownClasses,
        ),
      )
      .concat(
        this.queryBuilderState.graphManagerState.graph.dependencyManager
          .classes,
      );
  }

  get mappings(): Mapping[] {
    return this.queryBuilderState.graphManagerState.graph.mappings;
  }

  get runtimes(): PackageableRuntime[] {
    return this.queryBuilderState.graphManagerState.graph.runtimes;
  }

  private get compatibleMappings(): Mapping[] {
    const mappingsWithClassMapped = this.mappings.filter((mapping) =>
      mapping.classMappings.some((cm) => cm.class.value === this._class),
    );
    const resolvedMappingIncludes = this.mappings.filter((mapping) =>
      getAllIncludedMappings(mapping).some((e) =>
        mappingsWithClassMapped.includes(e),
      ),
    );
    return this._class
      ? uniq([...mappingsWithClassMapped, ...resolvedMappingIncludes])
      : [];
  }

  get compatibleRuntimes(): PackageableRuntime[] {
    const mapping = this.mapping;
    // If the runtime claims to cover some mappings which include the specified mapping,
    // then we deem the runtime to be compatible with the such mapping
    return mapping
      ? this.runtimes.filter((runtime) =>
          runtime.runtimeValue.mappings
            .map((mappingReference) => [
              mappingReference.value,
              ...getAllIncludedMappings(mappingReference.value),
            ])
            .flat()
            .includes(mapping),
        )
      : [];
  }

  setQueryBuilderState(queryBuilderState: QueryBuilderState): void {
    this.queryBuilderState = queryBuilderState;
  }
  setRuntimeValue(val: Runtime | undefined): void {
    if (!this.runtimeIsReadOnly) {
      this.runtimeValue = val;
    }
  }
  setShowSetupPanel(val: boolean): void {
    this.showSetupPanel = val;
  }
  setMappingIsReadOnly(val: boolean): void {
    this.mappingIsReadOnly = val;
  }
  setRuntimeIsReadOnly(val: boolean): void {
    this.runtimeIsReadOnly = val;
  }

  setClass(val: Class | undefined, isRebuildingState?: boolean): void {
    this._class = val;
    const isMappingEditable = !isRebuildingState && !this.mappingIsReadOnly;
    if (isMappingEditable) {
      // try to select the first compatible mapping
      const possibleMapping = getNullableFirstElement(this.compatibleMappings);
      if (possibleMapping) {
        this.setMapping(possibleMapping);
      }
    }
    if (val !== undefined) {
      const stereotype = getMilestoneTemporalStereotype(
        val,
        this.queryBuilderState.graphManagerState.graph,
      );
      this.setBusinessDate(undefined);
      this.setProcessingDate(undefined);
      if (stereotype) {
        this.initializeQueryMilestoningParameters(stereotype);
      }
    }
  }

  setMapping(val: Mapping | undefined): void {
    this.mapping = val;
    const runtimeToPick = getNullableFirstElement(this.compatibleRuntimes);
    if (runtimeToPick) {
      this.setRuntimeValue(
        new RuntimePointer(
          PackageableElementExplicitReference.create(runtimeToPick),
        ),
      );
    } else {
      // TODO?: we should consider if we allow users to use custom runtime here
      this.setRuntimeValue(undefined);
    }
  }

  setProcessingDate(val: ValueSpecification | undefined): void {
    this.processingDate = val
      ? observe_ValueSpecification(
          val,
          this.queryBuilderState.observableContext,
        )
      : val;
  }

  setBusinessDate(val: ValueSpecification | undefined): void {
    this.businessDate = val
      ? observe_ValueSpecification(
          val,
          this.queryBuilderState.observableContext,
        )
      : val;
  }

  *analyzeMappingModelCoverage(): GeneratorFn<void> {
    if (this.mapping) {
      this.queryBuilderState.explorerState.mappingModelCoverageAnalysisState.inProgress();
      this.queryBuilderState.explorerState.mappingModelCoverageAnalysisState.setMessage(
        'Analyzing Mapping...',
      );
      try {
        this.mappingModelCoverageAnalysisResult = (yield flowResult(
          this.queryBuilderState.graphManagerState.graphManager.analyzeMappingModelCoverage(
            this.mapping,
            this.queryBuilderState.graphManagerState.graph,
          ),
        )) as MappingModelCoverageAnalysisResult;
        this.queryBuilderState.explorerState.refreshTreeData();
      } catch (error) {
        assertErrorThrown(error);
        this.queryBuilderState.applicationStore.notifyError(error.message);
      }
      this.queryBuilderState.explorerState.mappingModelCoverageAnalysisState.pass();
    }
  }
}
