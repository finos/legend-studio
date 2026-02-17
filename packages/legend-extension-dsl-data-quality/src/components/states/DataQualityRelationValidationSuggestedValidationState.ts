/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { PanelDisplayState } from '@finos/legend-art';
import type { DataQualityRelationValidationConfigurationState } from './DataQualityRelationValidationConfigurationState.js';
import { DataQualityRelationValidationState } from './DataQualityRelationValidationState.js';
import {
  ActionState,
  assertErrorThrown,
  hashArray,
  hashValue,
  type GeneratorFn,
} from '@finos/legend-shared';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import { getDataQualityPureGraphManagerExtension } from '../../graph-manager/protocol/pure/DSL_DataQuality_PureGraphManagerExtension.js';
import { buildExecutionParameterValues } from '@finos/legend-query-builder';
import {
  DataQualityRelationValidation,
  RelationValidationType,
} from '../../graph-manager/index.js';
import type { RawLambda } from '@finos/legend-graph';

export enum SuggestedValidationsFilter {
  ALL,
  NEW,
  MODIFICATIONS,
}

export enum SuggestionType {
  NEW = 'NEW',
  EDIT = 'EDIT',
  APPLIED = 'APPLIED',
}

export class SuggestedValidationsState {
  readonly parentState: DataQualityRelationValidationConfigurationState;
  readonly suggestionPanelState: PanelDisplayState;
  readonly fetchState = ActionState.create();

  suggestedValidations: DataQualityRelationValidationState[] = [];
  filter: SuggestedValidationsFilter = SuggestedValidationsFilter.ALL;

  constructor(parentState: DataQualityRelationValidationConfigurationState) {
    makeObservable(this, {
      suggestedValidations: observable,
      filter: observable,
      onClickSuggestValidations: action,
      onFilterChange: action,
      fetchValidationSuggestions: flow,
      existingValidationsByName: computed,
      filteredSuggestions: computed,
    });

    this.parentState = parentState;
    this.suggestionPanelState = new PanelDisplayState({
      initial: 0,
      default: 300,
      snap: 100,
    });
  }

  get existingValidationsByName(): Map<string, string> {
    return new Map(
      this.parentState.validationStates.map((s) => [
        s.relationValidation.name,
        hashValue(s.lambdaString),
      ]),
    );
  }

  get filteredSuggestions(): DataQualityRelationValidationState[] {
    return this.suggestedValidations.filter((s) => {
      const type = this.getSuggestionType(s);
      switch (this.filter) {
        case SuggestedValidationsFilter.NEW:
          return type === SuggestionType.NEW;
        case SuggestedValidationsFilter.MODIFICATIONS:
          return type === SuggestionType.EDIT;
        case SuggestedValidationsFilter.ALL:
        default:
          return type === SuggestionType.NEW || type === SuggestionType.EDIT;
      }
    });
  }

  get selectedSuggestions(): DataQualityRelationValidationState[] {
    return this.filteredSuggestions.filter((e) => e.isSelected);
  }

  getSuggestionType(
    suggestion: DataQualityRelationValidationState,
  ): SuggestionType {
    const name = suggestion.relationValidation.name;
    const existingHash = this.existingValidationsByName.get(name);

    // name does not exist already, treated as new rule
    // probably needs to change if exact assertion exist, because then the suggestion is unecessary?
    if (existingHash === undefined) {
      return SuggestionType.NEW;
    }

    return existingHash !== hashValue(suggestion.lambdaString)
      ? SuggestionType.EDIT
      : SuggestionType.APPLIED;
  }

  onClickSuggestValidations = () => {
    if (!this.suggestionPanelState.isOpen) {
      this.suggestionPanelState.toggle();
    }
    if (!this.fetchState.isInProgress) {
      this.fetchValidationSuggestions();
    }
  };

  onFilterChange = (newFilter: SuggestedValidationsFilter) => {
    this.filter = newFilter;
  };

  *fetchValidationSuggestions(): GeneratorFn<void> {
    this.fetchState.inProgress();

    try {
      // Parse the response into proper RawLambda objects
      const packagePath = this.parentState.validationElement.path;
      const model = this.parentState.editorStore.graphManagerState.graph;
      const extension = getDataQualityPureGraphManagerExtension(
        this.parentState.editorStore.graphManagerState.graphManager,
      );

      const options = {
        lambdaParameterValues: buildExecutionParameterValues(
          this.parentState.parametersState.parameterStates,
          this.parentState.editorStore.graphManagerState,
        ),
      };

      const promise = extension.fetchValidationSuggestions(
        model,
        packagePath,
        options,
      );

      const result = (yield promise) as DataQualityRelationValidation[];
      const suggestions: DataQualityRelationValidation[] = result.map(
        (suggestion) => {
          const lambda =
            this.parentState.editorStore.graphManagerState.graphManager.buildRawValueSpecification(
              suggestion.assertion,
              this.parentState.editorStore.graphManagerState.graph,
            ) as RawLambda;

          const validation = new DataQualityRelationValidation(
            suggestion.name,
            lambda,
          );
          if (suggestion.type) {
            validation.type = suggestion.type;
          }
          return validation;
        },
      );

      // Create validation states
      const suggestedValidations: DataQualityRelationValidationState[] =
        suggestions.map(
          (validation) =>
            new DataQualityRelationValidationState(
              validation,
              this.parentState.editorStore,
            ),
        );

      // Convert to grammar strings for display
      const lambdas = new Map<string, RawLambda>();
      suggestedValidations.forEach((validationState) => {
        lambdas.set(
          validationState.lambdaId,
          validationState.relationValidation.assertion,
        );
      });

      suggestedValidations.forEach((validationState) => {
        validationState.initializeWithColumns(
          this.parentState.relationTypeMetadata.columns,
        );
      });

      const isolatedLambdas =
        (yield this.parentState.editorStore.graphManagerState.graphManager.lambdasToPureCode(
          lambdas,
        )) as Map<string, string>;

      isolatedLambdas.forEach((grammarText, key) => {
        const validationState = suggestedValidations.find(
          (state) => state.lambdaId === key,
        );
        if (validationState) {
          validationState.setLambdaString(
            validationState.extractLambdaString(grammarText),
          );
        }
      });

      suggestedValidations.forEach((validationState) => {
        if (validationState.dataQualityValidationLambdaFormState) {
          const description =
            validationState.dataQualityValidationLambdaFormState.getDescription();
          validationState.relationValidation.description = description;
        }
      });

      this.suggestedValidations = suggestedValidations;

      this.fetchState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.fetchState.fail();
      this.parentState.editorStore.applicationStore.notificationService.notifyError(
        error,
      );
    }
  }
}
