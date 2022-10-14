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
} from '@finos/legend-graph';
import { type Hashable, hashArray } from '@finos/legend-shared';
import { action, computed, makeObservable, observable } from 'mobx';
import { QUERY_BUILDER_HASH_STRUCTURE } from '../graphManager/QueryBuilderHashUtils.js';
import {
  QueryBuilderBitemporalMilestoningBuilderHelper,
  QueryBuilderBusinessTemporalMilestoningBuilderHelper,
  QueryBuilderProcessingTemporalMilestoningBuilderHelper,
} from './QueryBuilderMilestoningHelper.js';
import type { QueryBuilderState } from './QueryBuilderState.js';
import { LambdaParameterState } from './shared/LambdaParameterState.js';

export class QueryBuilderMilestoningState implements Hashable {
  readonly businessTemporalHelper =
    new QueryBuilderBusinessTemporalMilestoningBuilderHelper(this);
  readonly processingTemporalHelper =
    new QueryBuilderProcessingTemporalMilestoningBuilderHelper(this);
  readonly bitemporalHelper =
    new QueryBuilderBitemporalMilestoningBuilderHelper(this);

  queryBuilderState: QueryBuilderState;

  showMilestoningEditor = false;
  // TODO: Change this when we modify how we deal with milestoning.
  // See https://github.com/finos/legend-studio/issues/1149
  businessDate?: ValueSpecification | undefined;
  processingDate?: ValueSpecification | undefined;

  constructor(queryBuilderState: QueryBuilderState) {
    makeObservable(this, {
      processingDate: observable,
      businessDate: observable,
      showMilestoningEditor: observable,
      isMilestonedQuery: computed,
      setProcessingDate: action,
      setBusinessDate: action,
      setShowMilestoningEditor: action,
      hashCode: computed,
    });

    this.queryBuilderState = queryBuilderState;
  }

  get isMilestonedQuery(): boolean {
    return Boolean(this.businessDate ?? this.processingDate);
  }

  setShowMilestoningEditor(val: boolean): void {
    this.showMilestoningEditor = val;
  }

  private initializeQueryMilestoningParameters(stereotype: string): void {
    switch (stereotype) {
      case MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL: {
        this.businessTemporalHelper.initializeMilestoningParameters(true);
        break;
      }
      case MILESTONING_STEREOTYPE.PROCESSING_TEMPORAL: {
        this.processingTemporalHelper.initializeMilestoningParameters(true);
        break;
      }
      case MILESTONING_STEREOTYPE.BITEMPORAL: {
        this.processingTemporalHelper.initializeMilestoningParameters(true);
        break;
      }
      default:
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
        // Show the parameter panel because we populate paramaters state with milestoning parameters
        this.queryBuilderState.setShowParametersPanel(true);
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
      )
    ) {
      const variableState = new LambdaParameterState(
        milestoningParameter,
        this.queryBuilderState.observableContext,
        this.queryBuilderState.graphManagerState.graph,
      );
      variableState.mockParameterValue();
      this.queryBuilderState.parametersState.addParameter(variableState);
    }
    return milestoningParameter;
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_HASH_STRUCTURE.MILESTONING_STATE,
      this.businessDate ?? '',
      this.processingDate ?? '',
    ]);
  }
}
