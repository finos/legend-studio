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
  GenericType,
  GenericTypeExplicitReference,
  getMilestoneTemporalStereotype,
  MILESTONING_STEREOTYPE,
  observe_ValueSpecification,
  VariableExpression,
  type ValueSpecification,
  Multiplicity,
  PrimitiveType,
  INTERNAL__PropagatedValue,
  MILESTONING_START_DATE_PARAMETER_NAME,
  MILESTONING_END_DATE_PARAMETER_NAME,
} from '@finos/legend-graph';
import {
  type Hashable,
  hashArray,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { action, computed, makeObservable, observable } from 'mobx';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from '../QueryBuilderStateHashUtils.js';
import type { QueryBuilderState } from '../QueryBuilderState.js';
import { isValueExpressionReferencedInValue } from '../QueryBuilderValueSpecificationHelper.js';
import { LambdaParameterState } from '../shared/LambdaParameterState.js';
import { QueryBuilderBitemporalMilestoningImplementation } from './QueryBuilderBitemporalMilestoningImplementation.js';
import { QueryBuilderBusinessTemporalMilestoningImplementation } from './QueryBuilderBusinessTemporalMilestoningImplementation.js';
import type { QueryBuilderMilestoningImplementation } from './QueryBuilderMilestoningImplementation.js';
import { QueryBuilderProcessingTemporalMilestoningImplementation } from './QueryBuilderProcessingTemporalMilestoningImplementation.js';
import { QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS } from '../../graph/QueryBuilderMetaModelConst.js';
import { QueryBuilderTDSState } from '../fetch-structure/tds/QueryBuilderTDSState.js';
import { QueryBuilderSimpleProjectionColumnState } from '../fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import { QueryBuilderAggregateColumnState } from '../fetch-structure/tds/aggregation/QueryBuilderAggregationState.js';
import {
  QueryBuilderFilterTreeConditionNodeData,
  QueryBuilderFilterTreeExistsNodeData,
} from '../filter/QueryBuilderFilterState.js';

export class QueryBuilderMilestoningState implements Hashable {
  readonly milestoningImplementations: QueryBuilderMilestoningImplementation[] =
    [];

  queryBuilderState: QueryBuilderState;

  showMilestoningEditor = false;
  // TODO: Change this when we modify how we deal with milestoning.
  // See https://github.com/finos/legend-studio/issues/1149
  businessDate?: ValueSpecification | undefined;
  processingDate?: ValueSpecification | undefined;

  startDate?: ValueSpecification | undefined;
  endDate?: ValueSpecification | undefined;

  constructor(queryBuilderState: QueryBuilderState) {
    makeObservable(this, {
      processingDate: observable,
      businessDate: observable,
      startDate: observable,
      endDate: observable,
      showMilestoningEditor: observable,
      isMilestonedQuery: computed,
      setProcessingDate: action,
      setBusinessDate: action,
      setStartDate: action,
      setEndDate: action,
      setShowMilestoningEditor: action,
      clearMilestoningDates: action,
      toggleAllVersions: action,
      initialiseAllVersionsInRangeParameters: action,
      clearAllVersionsInRangeParameters: action,
      clearGetAllParameters: action,
      allValidationIssues: computed,
      hashCode: computed,
    });

    this.queryBuilderState = queryBuilderState;
    this.milestoningImplementations.push(
      new QueryBuilderBusinessTemporalMilestoningImplementation(
        this,
        MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL,
      ),
    );
    this.milestoningImplementations.push(
      new QueryBuilderProcessingTemporalMilestoningImplementation(
        this,
        MILESTONING_STEREOTYPE.PROCESSING_TEMPORAL,
      ),
    );
    this.milestoningImplementations.push(
      new QueryBuilderBitemporalMilestoningImplementation(
        this,
        MILESTONING_STEREOTYPE.BITEMPORAL,
      ),
    );
  }

  get allValidationIssues(): string[] {
    const validationIssues: string[] = [];
    if (this.isInavlidAllVersionsInRange) {
      validationIssues.push(
        'Invalid getAllVersionsInRange format: expects both endDate and startDate',
      );
    }
    return validationIssues;
  }

  // Updates the current queryBuilderState when `allVersions` is selected.
  // When `allVersions` is selected date propagation cannot be done from root class
  // to immediate project/filter properties, so setting date propagation to false
  // to those properties
  updateQueryBuilderState(): void {
    if (this.isAllVersionsEnabled) {
      if (
        this.queryBuilderState.fetchStructureState.implementation instanceof
        QueryBuilderTDSState
      ) {
        this.queryBuilderState.fetchStructureState.implementation.tdsColumns.forEach(
          (column) => {
            if (column instanceof QueryBuilderSimpleProjectionColumnState) {
              column.propertyExpressionState.derivedPropertyExpressionStates[0]?.parameterValues.forEach(
                (p) => {
                  if (p instanceof INTERNAL__PropagatedValue) {
                    p.isPropagatedValue = false;
                  }
                },
              );
            } else if (
              column instanceof QueryBuilderAggregateColumnState &&
              column.projectionColumnState instanceof
                QueryBuilderSimpleProjectionColumnState
            ) {
              column.projectionColumnState.propertyExpressionState.derivedPropertyExpressionStates[0]?.parameterValues.forEach(
                (p) => {
                  if (p instanceof INTERNAL__PropagatedValue) {
                    p.isPropagatedValue = false;
                  }
                },
              );
            }
          },
        );
      }
      this.queryBuilderState.filterState.nodes.forEach((node) => {
        if (node instanceof QueryBuilderFilterTreeConditionNodeData) {
          node.condition.propertyExpressionState.derivedPropertyExpressionStates[0]?.parameterValues.forEach(
            (p) => {
              if (p instanceof INTERNAL__PropagatedValue) {
                p.isPropagatedValue = false;
              }
            },
          );
        } else if (node instanceof QueryBuilderFilterTreeExistsNodeData) {
          if (
            node.propertyExpressionState.derivedPropertyExpressionStates[0] &&
            this.queryBuilderState.class?._generatedMilestonedProperties.includes(
              node.propertyExpressionState.derivedPropertyExpressionStates[0]
                .derivedProperty,
            )
          ) {
            node.propertyExpressionState.derivedPropertyExpressionStates[0]?.parameterValues.forEach(
              (p) => {
                if (p instanceof INTERNAL__PropagatedValue) {
                  p.isPropagatedValue = false;
                }
              },
            );
          }
        }
      });
    }
  }

  get isMilestonedQuery(): boolean {
    return (
      Boolean(this.businessDate ?? this.processingDate) ||
      this.queryBuilderState.getAllFunction ===
        QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS ||
      this.queryBuilderState.getAllFunction ===
        QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS_IN_RANGE
    );
  }

  get isCurrentClassMilestoned(): boolean {
    const currentclass = this.queryBuilderState.class;
    if (currentclass !== undefined) {
      const stereotype = getMilestoneTemporalStereotype(
        currentclass,
        this.queryBuilderState.graphManagerState.graph,
      );
      return stereotype !== undefined;
    }
    return false;
  }

  get isCurrentClassSupportsVersionsInRange(): boolean {
    const currentclass = this.queryBuilderState.class;
    if (currentclass !== undefined) {
      const stereotype = getMilestoneTemporalStereotype(
        currentclass,
        this.queryBuilderState.graphManagerState.graph,
      );
      return (
        stereotype !== undefined &&
        stereotype !== MILESTONING_STEREOTYPE.BITEMPORAL
      );
    }
    return false;
  }

  get isAllVersionsEnabled(): boolean {
    return (
      this.queryBuilderState.getAllFunction ===
        QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS ||
      this.queryBuilderState.getAllFunction ===
        QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS_IN_RANGE
    );
  }

  get isAllVersionsInRangeEnabled(): boolean {
    return (
      this.queryBuilderState.getAllFunction ===
      QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS_IN_RANGE
    );
  }

  get isInavlidAllVersionsInRange(): boolean {
    if (
      (this.startDate && !this.endDate) ||
      (!this.startDate && this.endDate)
    ) {
      return true;
    }
    return false;
  }

  toggleAllVersionsInRange(val: boolean | undefined): void {
    if (val) {
      this.queryBuilderState.setGetAllFunction(
        QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS_IN_RANGE,
      );
      this.initialiseAllVersionsInRangeParameters();
    } else {
      this.queryBuilderState.setGetAllFunction(
        QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS,
      );
      this.clearAllVersionsInRangeParameters();
    }
  }

  toggleAllVersions(val: boolean | undefined): void {
    if (val) {
      this.queryBuilderState.setGetAllFunction(
        QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS,
      );
      this.clearGetAllParameters();
    } else {
      this.queryBuilderState.setGetAllFunction(
        QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL,
      );
      this.clearAllVersionsInRangeParameters();
      this.updateMilestoningConfiguration();
    }
    this.updateQueryBuilderState();
  }

  setStartDate(val: ValueSpecification | undefined): void {
    this.startDate = val
      ? observe_ValueSpecification(val, this.queryBuilderState.observerContext)
      : val;
  }

  setEndDate(val: ValueSpecification | undefined): void {
    this.endDate = val
      ? observe_ValueSpecification(val, this.queryBuilderState.observerContext)
      : val;
  }

  setShowMilestoningEditor(val: boolean): void {
    this.showMilestoningEditor = val;
  }

  getMilestoningImplementation(
    stereotype: MILESTONING_STEREOTYPE,
  ): QueryBuilderMilestoningImplementation {
    return guaranteeNonNullable(
      this.milestoningImplementations.find(
        (imp) => imp.stereotype === stereotype,
      ),
    );
  }

  private initializeQueryMilestoningParameters(
    stereotype: MILESTONING_STEREOTYPE,
  ): void {
    this.getMilestoningImplementation(
      stereotype,
    ).initializeMilestoningParameters(true);
  }

  setProcessingDate(val: ValueSpecification | undefined): void {
    this.processingDate = val
      ? observe_ValueSpecification(val, this.queryBuilderState.observerContext)
      : val;
  }

  setBusinessDate(val: ValueSpecification | undefined): void {
    this.businessDate = val
      ? observe_ValueSpecification(val, this.queryBuilderState.observerContext)
      : val;
  }

  initialiseAllVersionsInRangeParameters(): void {
    this.setStartDate(
      this.buildMilestoningParameter(MILESTONING_START_DATE_PARAMETER_NAME),
    );
    this.setEndDate(
      this.buildMilestoningParameter(MILESTONING_END_DATE_PARAMETER_NAME),
    );
  }

  clearGetAllParameters(): void {
    if (
      this.businessDate instanceof VariableExpression &&
      !this.queryBuilderState.isVariableUsedInQueryBody(this.businessDate)
    ) {
      const paramState =
        this.queryBuilderState.parametersState.parameterStates.find(
          (p) => p.parameter === this.businessDate,
        );
      this.queryBuilderState.parametersState.removeParameter(
        guaranteeNonNullable(paramState),
      );
      this.setBusinessDate(undefined);
    }
    if (
      this.processingDate instanceof VariableExpression &&
      !this.queryBuilderState.isVariableUsedInQueryBody(this.processingDate)
    ) {
      const paramState =
        this.queryBuilderState.parametersState.parameterStates.find(
          (p) => p.parameter === this.processingDate,
        );
      this.queryBuilderState.parametersState.removeParameter(
        guaranteeNonNullable(paramState),
      );
      this.setProcessingDate(undefined);
    }
  }

  clearAllVersionsInRangeParameters(): void {
    if (
      this.startDate instanceof VariableExpression &&
      !this.queryBuilderState.isVariableUsedInQueryBody(this.startDate)
    ) {
      const paramState =
        this.queryBuilderState.parametersState.parameterStates.find(
          (p) => p.parameter === this.startDate,
        );
      this.queryBuilderState.parametersState.removeParameter(
        guaranteeNonNullable(paramState),
      );
    }
    if (
      this.endDate instanceof VariableExpression &&
      !this.queryBuilderState.isVariableUsedInQueryBody(this.endDate)
    ) {
      const paramState =
        this.queryBuilderState.parametersState.parameterStates.find(
          (p) => p.parameter === this.endDate,
        );
      this.queryBuilderState.parametersState.removeParameter(
        guaranteeNonNullable(paramState),
      );
    }
    this.setStartDate(undefined);
    this.setEndDate(undefined);
  }

  clearMilestoningDates(): void {
    this.setBusinessDate(undefined);
    this.setProcessingDate(undefined);
  }

  updateMilestoningConfiguration(): void {
    const currentclass = this.queryBuilderState.class;
    if (currentclass !== undefined) {
      const stereotype = getMilestoneTemporalStereotype(
        currentclass,
        this.queryBuilderState.graphManagerState.graph,
      );
      this.setBusinessDate(undefined);
      this.setProcessingDate(undefined);
      if (stereotype) {
        this.initializeQueryMilestoningParameters(stereotype);
      }
    }
  }

  buildMilestoningParameter(parameterName: string): ValueSpecification {
    const milestoningParameter = new VariableExpression(
      parameterName,
      Multiplicity.ONE,
      GenericTypeExplicitReference.create(new GenericType(PrimitiveType.DATE)),
    );
    if (
      !this.queryBuilderState.parametersState.parameterStates.find(
        (p) => p.variableName === parameterName,
      ) &&
      !this.queryBuilderState.constantState.constants.find(
        (c) => c.variable.name === parameterName,
      )
    ) {
      const variableState = new LambdaParameterState(
        milestoningParameter,
        this.queryBuilderState.observerContext,
        this.queryBuilderState.graphManagerState.graph,
      );
      variableState.mockParameterValue();
      this.queryBuilderState.parametersState.addParameter(variableState);
    }
    return milestoningParameter;
  }

  isVariableUsed(variable: VariableExpression): boolean {
    const usedInBusiness = this.businessDate
      ? isValueExpressionReferencedInValue(variable, this.businessDate)
      : false;
    const usedInProcessingDate = this.processingDate
      ? isValueExpressionReferencedInValue(variable, this.processingDate)
      : false;
    return usedInBusiness || usedInProcessingDate;
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.MILESTONING_STATE,
      this.businessDate ?? '',
      this.processingDate ?? '',
    ]);
  }
}
