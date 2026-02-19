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

import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { CustomSelectorInput, XIcon } from '@finos/legend-art';
import type { DataQualityRelationValidationConfigurationState } from './states/DataQualityRelationValidationConfigurationState.js';
import { SuggestedValidationsFilter } from './states/DataQualityRelationValidationSuggestedValidationState.js';
import { DataQualityRelationValidationSuggestionItem } from './DataQualityReltionValidationSuggestionItem.js';

type FilterOption = { label: string; value: SuggestedValidationsFilter };

export const DataQualityRelationValidationSuggestionPanel = observer(
  (props: {
    configurationState: DataQualityRelationValidationConfigurationState;
  }) => {
    const { configurationState: state } = props;
    const { suggestedValidationsState: suggestionsState } = state;
    const { suggestionPanelState } = suggestionsState;
    const isLoading = suggestionsState.fetchState.isInProgress;
    const unappliedSuggestions = suggestionsState.filteredSuggestions;
    const selectedSuggestions = suggestionsState.selectedSuggestions;
    const suggestions = suggestionsState.suggestedValidations;

    const filterOptions: FilterOption[] = [
      { label: 'All', value: SuggestedValidationsFilter.ALL },
      { label: 'New', value: SuggestedValidationsFilter.NEW },
      {
        label: 'Modifications',
        value: SuggestedValidationsFilter.MODIFICATIONS,
      },
    ];

    const addAllSuggestedValidations = (): void => {
      runInAction(() => {
        unappliedSuggestions.forEach((validationState) => {
          validationState.setIsSelected(false);
          state.applyOrModifySuggestion(validationState);
        });
      });
    };

    const addSelectedValidations = (): void => {
      if (selectedSuggestions.length === 0) {
        return;
      }
      runInAction(() => {
        selectedSuggestions.forEach((validationState) => {
          validationState.setIsSelected(false);
          state.applyOrModifySuggestion(validationState);
        });
      });
    };
    return (
      <div className="rule-suggestion-panel">
        <div className="rule-suggestion-panel__header">
          <div className="rule-suggestion-panel__header__controls">
            <span className="rule-suggestion-panel__header__title">
              SUGGESTED VALIDATIONS
            </span>
            <CustomSelectorInput
              className="rule-suggestion-panel__header__filter"
              options={filterOptions}
              onChange={(option: FilterOption): void => {
                suggestionsState.onFilterChange(option.value);
              }}
              value={filterOptions.find(
                (option) => option.value === suggestionsState.filter,
              )}
              darkMode={true}
              placeholder="Filter..."
              disabled={isLoading}
            />
          </div>
          <div className="rule-suggestion-panel__header__actions">
            {selectedSuggestions.length > 0 && (
              <button
                className="rule-suggestion-panel__action-btn btn--dark"
                onClick={addSelectedValidations}
                disabled={isLoading}
                title="Add selected validations"
              >
                Add Selection
              </button>
            )}
            {!isLoading && unappliedSuggestions.length > 0 && (
              <button
                className="rule-suggestion-panel__action-btn btn--dark"
                onClick={addAllSuggestedValidations}
                title="Apply all suggested validations"
              >
                Apply All Suggested Validations
              </button>
            )}
            <div className="rule-suggestion-panel__close-btn">
              <XIcon onClick={() => suggestionPanelState.toggle()} />
            </div>
          </div>
        </div>
        {!isLoading && unappliedSuggestions.length > 0 && (
          <div className="rule-suggestion-panel__content">
            {unappliedSuggestions.map((validationState) => {
              return (
                <DataQualityRelationValidationSuggestionItem
                  key={validationState.lambdaId}
                  validationState={validationState}
                  configurationState={state}
                />
              );
            })}
          </div>
        )}
        {!isLoading && unappliedSuggestions.length === 0 && (
          <div className="panel__content__empty-text">
            {suggestions.length === 0
              ? 'No suggestions available'
              : 'All suggestions have been applied'}
          </div>
        )}
      </div>
    );
  },
);
