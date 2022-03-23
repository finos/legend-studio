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
  PrimitiveInstanceValue,
  TYPICAL_MULTIPLICITY_TYPE,
  PRIMITIVE_TYPE,
  GenericType,
  GenericTypeExplicitReference,
  VariableExpression,
} from '@finos/legend-graph';

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
    return this.getMilestoningDate(guaranteeNonNullable(this.processingDate));
  }

  get BusinessDate(): ValueSpecification | undefined {
    return this.getMilestoningDate(guaranteeNonNullable(this.businessDate));
  }

  getMilestoningDate(
    milestoningParameter: ValueSpecification,
  ): ValueSpecification | undefined {
    const type = milestoningParameter.genericType?.value.rawType;
    const graph = this.queryBuilderState.graphManagerState.graph;
    const multiplicity = graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    );
    let value;
    if (milestoningParameter instanceof PrimitiveInstanceValue) {
      value = milestoningParameter.values[0];
    }
    if (
      type ===
      this.queryBuilderState.graphManagerState.graph.getPrimitiveType(
        PRIMITIVE_TYPE.LATESTDATE,
      )
    ) {
      const parameter = new PrimitiveInstanceValue(
        GenericTypeExplicitReference.create(
          new GenericType(
            this.queryBuilderState.graphManagerState.graph.getPrimitiveType(
              PRIMITIVE_TYPE.LATESTDATE,
            ),
          ),
        ),
        multiplicity,
      );
      return parameter;
    } else if (
      type ===
      this.queryBuilderState.graphManagerState.graph.getPrimitiveType(
        PRIMITIVE_TYPE.STRICTDATE,
      )
    ) {
      const parameter = new PrimitiveInstanceValue(
        GenericTypeExplicitReference.create(
          new GenericType(
            this.queryBuilderState.graphManagerState.graph.getPrimitiveType(
              PRIMITIVE_TYPE.STRICTDATE,
            ),
          ),
        ),
        multiplicity,
      );
      parameter.addValue(value);
      return parameter;
    } else if (
      type ===
      this.queryBuilderState.graphManagerState.graph.getPrimitiveType(
        PRIMITIVE_TYPE.DATETIME,
      )
    ) {
      const parameter = new PrimitiveInstanceValue(
        GenericTypeExplicitReference.create(
          new GenericType(
            this.queryBuilderState.graphManagerState.graph.getPrimitiveType(
              PRIMITIVE_TYPE.DATETIME,
            ),
          ),
        ),
        multiplicity,
      );
      parameter.addValue(value);
      return parameter;
    } else if (milestoningParameter instanceof VariableExpression) {
      const parameter = new VariableExpression(
        milestoningParameter.name,
        multiplicity,
      );
      return parameter;
    }
    return undefined;
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
