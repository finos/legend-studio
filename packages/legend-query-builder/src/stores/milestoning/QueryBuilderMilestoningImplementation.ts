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

import type {
  ValueSpecification,
  SimpleFunctionExpression,
  AbstractPropertyExpression,
  MILESTONING_STEREOTYPE,
} from '@finos/legend-graph';
import type { QueryBuilderDerivedPropertyExpressionState } from '../QueryBuilderPropertyEditorState.js';
import type { QueryBuilderMilestoningState } from './QueryBuilderMilestoningState.js';

export abstract class QueryBuilderMilestoningImplementation {
  milestoningState: QueryBuilderMilestoningState;
  readonly stereotype: MILESTONING_STEREOTYPE;

  constructor(
    queryBuilderMilestoningState: QueryBuilderMilestoningState,
    stereotype: MILESTONING_STEREOTYPE,
  ) {
    this.milestoningState = queryBuilderMilestoningState;
    this.stereotype = stereotype;
  }

  /**
   * Gets the milestoning date associated with the given stereotype
   */
  abstract getMilestoningDate(index?: number): ValueSpecification | undefined;

  /**
   * Gets the tooltip text for given stereotype
   */
  abstract getMilestoningToolTipText(): string;

  /**
   * Initializes milestoning parameters when they are not defined.
   * We need to force initialize when we change class as we don't reset the whole milestoning state here.
   */
  abstract initializeMilestoningParameters(force?: boolean): void;

  /**
   * Checks whether the getAll function has the no of parameters as expected for a given stereotype and sets the corresponding milestoning dates.
   */
  abstract processGetAllParamaters(parameterValues: ValueSpecification[]): void;

  /**
   * Builds parameters for getAll() function with milestoned class
   */
  abstract buildGetAllParameters(
    getAllFunction: SimpleFunctionExpression,
  ): void;

  /**
   * Builds parameters for getAllVersionsInRange() function with milestoned class
   */
  abstract buildGetAllVersionsInRangeParameters(
    getAllVersionsInRangeFunction: SimpleFunctionExpression,
  ): void;

  /**
   * Builds parameters for getAll() function with milestoned class
   */
  abstract buildGetAllWithDefaultParameters(
    getAllFunction: SimpleFunctionExpression,
  ): void;

  /**
   * Generates milestoning date for a propertyexpression based on its source and target stereotype
   */
  abstract generateMilestoningDate(
    isDatePropagationSupported: boolean,
    hasDefaultMilestoningDate: boolean,
    prevPropertyExpression: AbstractPropertyExpression | undefined,
    temporalSource: MILESTONING_STEREOTYPE | undefined,
    idx?: number,
    derivedPropertyExpressionState?: QueryBuilderDerivedPropertyExpressionState,
  ): ValueSpecification;
}
