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
  isNonNullable,
  uniq,
  assertErrorThrown,
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
  runtime?: Runtime | undefined;
  mappingIsReadOnly = false;
  runtimeIsReadOnly = false;
  showSetupPanel = true;

  // TODO: Change this when we modify how we deal with milestoning.
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
      setRuntime: action,
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

  get possibleMappings(): Mapping[] {
    const mappingsWithClassMapped = this.queryBuilderState.mappings.filter(
      (mapping) =>
        mapping.classMappings.some((cm) => cm.class.value === this._class),
    );
    const resolvedMappingIncludes = this.queryBuilderState.mappings.filter(
      (mapping) =>
        getAllIncludedMappings(mapping).some((e) =>
          mappingsWithClassMapped.includes(e),
        ),
    );
    return this._class
      ? uniq([...mappingsWithClassMapped, ...resolvedMappingIncludes])
      : [];
  }

  get possibleRuntimes(): PackageableRuntime[] {
    return this._class && this.mapping
      ? this.queryBuilderState.runtimes
          .map((packageableRuntime) =>
            packageableRuntime.runtimeValue.mappings.some((mapping) =>
              this.possibleMappings.includes(mapping.value),
            )
              ? packageableRuntime
              : undefined,
          )
          .filter(isNonNullable)
      : [];
  }

  get isMappingCompatible(): boolean {
    if (this.mapping && this._class) {
      return this.possibleMappings.includes(this.mapping);
    }
    return false;
  }

  setQueryBuilderState(queryBuilderState: QueryBuilderState): void {
    this.queryBuilderState = queryBuilderState;
  }
  setRuntime(val: Runtime | undefined): void {
    if (!this.runtimeIsReadOnly) {
      this.runtime = val;
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
    if (isMappingEditable && !this.isMappingCompatible) {
      const possibleMapping = getNullableFirstElement(this.possibleMappings);
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
    const runtimeToPick = getNullableFirstElement(this.possibleRuntimes);
    if (runtimeToPick) {
      this.setRuntime(
        new RuntimePointer(
          PackageableElementExplicitReference.create(runtimeToPick),
        ),
      );
    } else {
      // TODO?: we should consider if we allow people to use custom runtime here
      this.setRuntime(undefined);
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
      try {
        this.mappingModelCoverageAnalysisResult = (yield flowResult(
          this.queryBuilderState.graphManagerState.graphManager.analyzeMappingModelCoverage(
            this.queryBuilderState.graphManagerState.graph,
            this.mapping,
          ),
        )) as MappingModelCoverageAnalysisResult;
        this.queryBuilderState.explorerState.refreshTreeData();
      } catch (error) {
        assertErrorThrown(error);
        this.queryBuilderState.applicationStore.notifyError(error.message);
      }
    }
  }
}
