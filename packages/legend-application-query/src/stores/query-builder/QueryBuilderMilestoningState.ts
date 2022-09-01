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
  DEFAULT_BUSINESS_DATE_MILESTONING_PARAMETER_NAME,
  DEFAULT_PROCESSING_DATE_MILESTONING_PARAMETER_NAME,
  getMilestoneTemporalStereotype,
  MILESTONING_STEREOTYPE,
  observe_ValueSpecification,
  type ValueSpecification,
} from '@finos/legend-graph';
import { action, makeObservable, observable } from 'mobx';
import type { QueryBuilderState } from './QueryBuilderState.js';

export class QueryBuilderMilestoningState {
  queryBuilderState: QueryBuilderState;

  // TODO: Change this when we modify how we deal with milestoning.
  // See https://github.com/finos/legend-studio/issues/1149
  businessDate?: ValueSpecification | undefined;
  processingDate?: ValueSpecification | undefined;

  constructor(queryBuilderState: QueryBuilderState) {
    makeObservable(this, {
      processingDate: observable,
      businessDate: observable,
      setProcessingDate: action,
      setBusinessDate: action,
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
    const currentclass = this.queryBuilderState.setupState._class;
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
        this.queryBuilderState.setShowParameterPanel(true);
      }
    }
  }
}
