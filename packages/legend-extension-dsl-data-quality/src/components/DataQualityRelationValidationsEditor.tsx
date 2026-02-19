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
import { observer } from 'mobx-react-lite';
import type { DataQualityRelationValidationConfigurationState } from './states/DataQualityRelationValidationConfigurationState.js';
import React from 'react';
import { DragPreviewLayer, PlusIcon, WizardHatIcon } from '@finos/legend-art';
import { stub_RawLambda } from '@finos/legend-graph';
import {
  dataQualityRelationValidation_addValidation,
  dataQualityRelationValidation_deleteValidation,
} from '../graph-manager/DSL_DataQuality_GraphModifierHelper.js';
import {
  type RelationValidationDragSource,
  DataQualityRelationValidationEditor,
  RELATION_VALIDATION_DND_TYPE,
} from './DataQualityRelationValidationEditor.js';
import { DataQualityRelationValidation } from '../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';
import { flowResult } from 'mobx';

export const DataQualityRelationValidationsEditor = observer(
  (props: {
    dataQualityRelationValidationConfigurationState: DataQualityRelationValidationConfigurationState;
  }) => {
    const { dataQualityRelationValidationConfigurationState } = props;
    const { validationElement, isReadOnly, suggestedValidationsState } =
      dataQualityRelationValidationConfigurationState;

    const addRelationValidation = async (): Promise<void> => {
      if (
        !dataQualityRelationValidationConfigurationState.relationTypeMetadata
          .columns.length
      ) {
        await flowResult(
          dataQualityRelationValidationConfigurationState.getRelationColumns(),
        );
      }
      const relationValidation = new DataQualityRelationValidation(
        '',
        stub_RawLambda(),
      );
      dataQualityRelationValidation_addValidation(
        validationElement,
        relationValidation,
      );
      dataQualityRelationValidationConfigurationState.addValidationState(
        relationValidation,
      );
    };

    const deleteRelationValidation =
      (validation: DataQualityRelationValidation): (() => void) =>
      (): void => {
        dataQualityRelationValidation_deleteValidation(
          validationElement,
          validation,
        );
        dataQualityRelationValidationConfigurationState.deleteValidationState(
          validation,
        );
      };

    return (
      <div className="relation-validation-config-editor__definition">
        <div className="relation-validation-config-editor__definition__item">
          <div className="relation-validation-config-editor__definition__item__header-right">
            <button
              className="relation-validation-config-editor__definition__item__header__suggest-btn btn--blue"
              disabled={isReadOnly}
              onClick={suggestedValidationsState.onClickSuggestValidations}
              tabIndex={-1}
              title={`${suggestedValidationsState.suggestionPanelState.isOpen ? 'Refresh Suggestions' : 'Suggest Validations'}`}
            >
              <WizardHatIcon />
              {`${suggestedValidationsState.suggestionPanelState.isOpen ? 'Refresh Suggestions' : 'Suggest Validations'}`}
            </button>
          </div>
          <div className="relation-validation-config-editor__definition__item__validations-header">
            <span className="relation-validation-config-editor__definition__item__validations-label">
              VALIDATIONS
            </span>
            <button
              className="relation-validation-config-editor__definition__item__header__add-btn btn--dark"
              disabled={isReadOnly}
              onClick={() => {
                addRelationValidation().catch(
                  dataQualityRelationValidationConfigurationState.editorStore
                    .applicationStore.alertUnhandledError,
                );
              }}
              tabIndex={-1}
              title="Add Relation Validation"
            >
              <PlusIcon />
            </button>
          </div>
          <div>
            <DragPreviewLayer
              labelGetter={(item: RelationValidationDragSource): string =>
                item.validation.name === '' ? '(unknown)' : item.validation.name
              }
              types={[RELATION_VALIDATION_DND_TYPE]}
            />
            {validationElement.validations.map((relationValidation) => (
              <DataQualityRelationValidationEditor
                key={relationValidation._UUID}
                validation={relationValidation}
                relationValidationConfigurationState={
                  dataQualityRelationValidationConfigurationState
                }
                deleteValidation={deleteRelationValidation(relationValidation)}
                isReadOnly={isReadOnly}
              />
            ))}
          </div>
        </div>
      </div>
    );
  },
);
