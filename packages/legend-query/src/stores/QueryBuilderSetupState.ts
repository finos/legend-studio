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

import { action, computed, makeAutoObservable } from 'mobx';
import {
  addUniqueEntry,
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
  classMilestoningTemporalValues: ValueSpecification[] = [];
  mapping?: Mapping | undefined;
  runtime?: Runtime | undefined;
  mappingIsReadOnly = false;
  runtimeIsReadOnly = false;
  showSetupPanel = true;

  constructor(queryBuilderState: QueryBuilderState) {
    makeAutoObservable(this, {
      queryBuilderState: false,
      processingDate: computed,
      businessDate: computed,
      addClassMilestoningTemporalValues: action,
      setQueryBuilderState: action,
      setClass: action,
      setMapping: action,
      setRuntime: action,
      setClassMilestoningTemporalValues: action,
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

  get processingDate(): ValueSpecification | undefined {
    return this.getMilestoningDate(
      guaranteeNonNullable(this.classMilestoningTemporalValues[0]),
    );
  }

  get businessDate(): ValueSpecification | undefined {
    if (this.classMilestoningTemporalValues.length === 1) {
      return this.getMilestoningDate(
        guaranteeNonNullable(this.classMilestoningTemporalValues[0]),
      );
    } else {
      return this.getMilestoningDate(
        guaranteeNonNullable(this.classMilestoningTemporalValues[1]),
      );
    }
  }

  // get milestoning(): ValueSpecification | undefined {
  //   //create new valuespecification instead of fetching the existing value to disconnect mobx states
  //   let value;
  //   if (
  //     this.classMilestoningTemporalValues[0] instanceof PrimitiveInstanceValue
  //   ) {
  //     value = this.classMilestoningTemporalValues[0].values[0];
  //   }
  //   if (
  //     this.classMilestoningTemporalValues[0]?.genericType?.value.rawType ===
  //     this.queryBuilderState.graphManagerState.graph.getPrimitiveType(
  //       PRIMITIVE_TYPE.LATESTDATE,
  //     )
  //   ) {
  //     const x = new PrimitiveInstanceValue(
  //       GenericTypeExplicitReference.create(
  //         new GenericType(
  //           this.queryBuilderState.graphManagerState.graph.getPrimitiveType(
  //             PRIMITIVE_TYPE.LATESTDATE,
  //           ),
  //         ),
  //       ),
  //       this.queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
  //         TYPICAL_MULTIPLICITY_TYPE.ONE,
  //       ),
  //     );
  //     return x;
  //   } else if (
  //     this.classMilestoningTemporalValues[0]?.genericType?.value.rawType ===
  //     this.queryBuilderState.graphManagerState.graph.getPrimitiveType(
  //       PRIMITIVE_TYPE.STRICTDATE,
  //     )
  //   ) {
  //     const x = new PrimitiveInstanceValue(
  //       GenericTypeExplicitReference.create(
  //         new GenericType(
  //           this.queryBuilderState.graphManagerState.graph.getPrimitiveType(
  //             PRIMITIVE_TYPE.STRICTDATE,
  //           ),
  //         ),
  //       ),
  //       this.queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
  //         TYPICAL_MULTIPLICITY_TYPE.ONE,
  //       ),
  //     );
  //     x.addValue(value);
  //     return x;
  //   }
  //   return undefined;
  // }

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

  addClassMilestoningTemporalValues(val: ValueSpecification): void {
    addUniqueEntry(this.classMilestoningTemporalValues, val);
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
      this.setClassMilestoningTemporalValues([]);
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

  setClassMilestoningTemporalValues(val: ValueSpecification[]): void {
    this.classMilestoningTemporalValues = val;
  }
}
