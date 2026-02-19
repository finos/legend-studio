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
import { Badge, Checkbox, clsx, PlusIcon, Switch } from '@finos/legend-art';
import { PrimitiveType } from '@finos/legend-graph';
import { InlineLambdaEditor } from '@finos/legend-query-builder';
import type { DataQualityRelationValidationState } from './states/DataQualityRelationValidationState.js';
import type { DataQualityRelationValidationConfigurationState } from './states/DataQualityRelationValidationConfigurationState.js';
import { DataQualityRelationLambdaGUIValidationEditor } from './DataQualityRelationLambdaGUIValidationEditor.js';
import { SuggestionType } from './states/DataQualityRelationValidationSuggestedValidationState.js';

export const DataQualityRelationValidationSuggestionItem = observer(
  (props: {
    validationState: DataQualityRelationValidationState;
    configurationState: DataQualityRelationValidationConfigurationState;
  }) => {
    const { validationState, configurationState } = props;
    const validation = validationState.relationValidation;
    const suggestionType =
      configurationState.suggestedValidationsState.getSuggestionType(
        validationState,
      );
    return (
      <div className="relation-validation__container">
        <div
          className={clsx('relation-validation', {
            backdrop__element: validationState.parserError,
          })}
        >
          <div className="relation-validation__content">
            {suggestionType === SuggestionType.EDIT && (
              <Badge
                className="rule-suggestion-panel__badge rule-suggestion-panel__badge--modification"
                title={'MODIFICATION'}
              />
            )}
            {suggestionType === SuggestionType.NEW && (
              <Badge
                className="rule-suggestion-panel__badge rule-suggestion-panel__badge--new"
                title={'NEW'}
              />
            )}
            <input
              className="relation-validation__content__name"
              spellCheck={false}
              disabled={true}
              value={validation.name}
              placeholder="Validation name"
            />

            {validationState.canEditInGUI && (
              <div className="data-quality-uml-element-editor__editor-switch-container">
                <Switch
                  checked={validationState.isTextEditor}
                  size="small"
                  id={`suggestion-switch-${validation._UUID}`}
                  onChange={() => validationState.toggleEditorMode()}
                  disabled={false}
                />
                <label
                  className="data-quality-uml-element-editor__lambda__label"
                  htmlFor={`suggestion-switch-${validation._UUID}`}
                >
                  {'</> Code'}
                </label>
              </div>
            )}

            <button
              className="uml-element-editor__remove-btn btn--success"
              onClick={() =>
                configurationState.applyOrModifySuggestion(validationState)
              }
              tabIndex={-1}
              title="Add this validation"
            >
              <PlusIcon />
            </button>
            <Checkbox
              checked={validationState.isSelected}
              className="ml-2 p-0"
              size="large"
              onChange={(_, checked) => {
                validationState.setIsSelected(checked);
              }}
            />
          </div>

          <div className="data-quality-uml-element-editor__lambda">
            <div className="data-quality-uml-element-editor__lambda__label">
              Assertion
            </div>
            <div className="data-quality-uml-element-editor__lambda__value">
              {validationState.isTextEditor && (
                <InlineLambdaEditor
                  disabled={true}
                  lambdaEditorState={validationState}
                  forceBackdrop={false}
                  expectedType={PrimitiveType.BOOLEAN}
                  disablePopUp={true}
                  className="relation-validation__lambda"
                />
              )}

              {validationState.isGUIEditor && (
                <DataQualityRelationLambdaGUIValidationEditor
                  disabled={true}
                  validationState={validationState}
                />
              )}
            </div>
          </div>

          <div className="relation-validation-editor__content">
            <div className="data-quality-uml-element-editor__lambda__label">
              Description
            </div>
            <input
              className="relation-validation-editor__content__name"
              spellCheck={false}
              disabled={true}
              value={validation.description ?? ''}
              placeholder="Enter the description"
            />
          </div>
        </div>
      </div>
    );
  },
);
