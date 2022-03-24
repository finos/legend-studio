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

import { action, computed, makeAutoObservable, observable } from 'mobx';
import {
  getNullableFirstElement,
  guaranteeNonNullable,
  isNonNullable,
  uniq,
} from '@finos/legend-shared';
import type { QueryBuilderState } from './QueryBuilderState';
import {
  type Class,
  type Mapping,
  type PackageableRuntime,
  type Runtime,
  type ValueSpecification,
  getMilestoneTemporalStereotype,
  PackageableElementExplicitReference,
  RuntimePointer,
} from '@finos/legend-graph';
import { getMilestoningDate } from './QueryBuilderMilestoningHelper';

export class QueryBuilderSetupState {
  queryBuilderState: QueryBuilderState;
  _class?: Class | undefined;
  businessDate: ValueSpecification | undefined;
  processingDate: ValueSpecification | undefined;
  mapping?: Mapping | undefined;
  runtime?: Runtime | undefined;
  mappingIsReadOnly = false;
  runtimeIsReadOnly = false;
  showSetupPanel = true;

  constructor(queryBuilderState: QueryBuilderState) {
    makeAutoObservable(this, {
      queryBuilderState: false,
      processingDate: observable,
      businessDate: observable,
      ProcessingDate: computed,
      BusinessDate: computed,
      setQueryBuilderState: action,
      setClass: action,
      setMapping: action,
      setRuntime: action,
      setProcessingDate: action,
      setBusinessDate: action,
      setShowSetupPanel: action,
    });

    this.queryBuilderState = queryBuilderState;
  }

  get possibleMappings(): Mapping[] {
    const mappingsWithClassMapped = this.queryBuilderState.mappings.filter(
      (mapping) =>
        mapping.classMappings.some((cm) => cm.class.value === this._class),
    );
    const resolvedMappingIncludes = this.queryBuilderState.mappings.filter(
      (mapping) =>
        mapping.allIncludedMappings.some((e) =>
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

  get ProcessingDate(): ValueSpecification | undefined {
    return getMilestoningDate(
      guaranteeNonNullable(this.processingDate),
      this.queryBuilderState.graphManagerState.graph,
    );
  }

  get BusinessDate(): ValueSpecification | undefined {
    return getMilestoningDate(
      guaranteeNonNullable(this.businessDate),
      this.queryBuilderState.graphManagerState.graph,
    );
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
        this.queryBuilderState.buildClassMilestoningTemporalValue(stereotype);
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
    this.processingDate = val;
  }

  setBusinessDate(val: ValueSpecification | undefined): void {
    this.businessDate = val;
  }
}
