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
import type { DataQualityRelationValidationState } from './states/DataQualityRelationValidationState.js';
import { RenderColumns } from './DataQualityRelationLambdaGUIDataTypeHandlers.js';
import {
  ColSpec,
  ColSpecArray,
  ColSpecArrayInstance,
  Multiplicity,
} from '@finos/legend-graph';
import { useApplicationStore } from '@finos/legend-application';
import {
  DataQualityValidationCustomHelperFunction,
  DataQualityValidationFilterFunction,
} from './utils/DataQualityValidationFunction.js';
import { DataQualityValidationFilterEditor } from './DataQualityValidationFilterEditor.js';
import { DataQualityValidationHelperFunctionEditor } from './DataQualityValidationHelperFunctionEditor.js';

export const DataQualityRelationLambdaGUIValidationEditor = observer(
  (props: {
    validationState: DataQualityRelationValidationState;
    disabled: boolean;
  }) => {
    const { validationState, disabled } = props;
    const { dataQualityValidationLambdaFormState, columnOptions } =
      validationState;
    const appStore = useApplicationStore();
    const darkMode =
      !appStore.layoutService.TEMPORARY__isLightColorThemeEnabled;

    if (!dataQualityValidationLambdaFormState) {
      return null;
    }

    const { assertion, otherFunction } = dataQualityValidationLambdaFormState;

    return (
      <div className="data-quality-validation-gui-editor">
        <div className="data-quality-validation-gui-editor__functions-list">
          {otherFunction instanceof DataQualityValidationFilterFunction && (
            <DataQualityValidationFilterEditor
              key={otherFunction.name}
              validationFunction={otherFunction}
              disabled={disabled}
              validationState={validationState}
            />
          )}

          {otherFunction instanceof
            DataQualityValidationCustomHelperFunction && (
            <DataQualityValidationHelperFunctionEditor
              key={otherFunction.name}
              validationFunction={otherFunction}
              disabled={disabled}
              validationState={validationState}
            />
          )}
        </div>
        <div className="data-quality-validation-gui-editor__function data-quality-validation-gui-editor__function--assert-helper">
          <div className="data-quality-uml-element-editor__lambda__label data-quality-validation-gui-editor__function--assert-helper--description">
            Columns to persist
          </div>
          <RenderColumns
            columns={assertion.parameters.columns}
            onChange={(values: string[]) => {
              const colSpecArray = new ColSpecArray();
              colSpecArray.colSpecs = values.map((value) => {
                const colSpecValue = new ColSpec();
                colSpecValue.name = value;
                return colSpecValue;
              });

              const colSpecArrayInstance = new ColSpecArrayInstance(
                Multiplicity.ZERO_MANY,
              );
              colSpecArrayInstance.values = [colSpecArray];

              assertion.parameters.columns = colSpecArrayInstance;
              validationState.debouncedHandleValidationFormChange();
            }}
            options={columnOptions}
            placeholder="Select Columns"
            disabled={disabled}
            darkMode={darkMode}
          />
        </div>
      </div>
    );
  },
);
