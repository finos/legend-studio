/**
 * Copyright (c) 2025-present, Goldman Sachs
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
import { type SUPPORTED_TYPES } from './constants/DataQualityConstants.js';
import type { DataQualityRelationValidationState } from './states/DataQualityRelationValidationState.js';
import {
  FunctionParameterHandler,
  FunctionSelectionHandler,
} from './DataQualityRelationLambdaGUIDataTypeHandlers.js';

export const DataQualityRelationLambdaGUIValidationEditor = observer(
  (props: {
    validationState: DataQualityRelationValidationState;
    disabled: boolean;
  }) => {
    const { validationState, disabled } = props;
    const { relationValidationGUIState, columnOptions } = validationState;
    const {
      assertion,
      filterHelpers,
      handleAssertChange,
      handleFiltersChange,
      handleRuleChange,
      handleFilterColumnChange,
    } = relationValidationGUIState;

    return (
      <div className="data-quality-validation-gui-editor">
        <div className="data-quality-validation-gui-editor__functions-list">
          {filterHelpers.map((funcState, index) => {
            const { columns, otherParams } = funcState.parameters;
            return (
              <div
                key={funcState.name}
                className="data-quality-validation-gui-editor__function"
              >
                <div className="data-quality-validation-gui-editor__function__parameter">
                  <FunctionParameterHandler
                    parameter={columns}
                    onChange={(value, type: string) => {
                      handleFilterColumnChange(
                        funcState.id as string,
                        value as {
                          value: string | number | string[];
                          type: string;
                        },
                        type as SUPPORTED_TYPES,
                      );
                    }}
                    options={columnOptions}
                    disabled={disabled}
                  />
                </div>
                <div className="data-quality-validation-gui-editor__function__selector">
                  <FunctionSelectionHandler
                    value={funcState.name}
                    options={validationState.getFunctionOptions(
                      funcState.getType(),
                    )}
                    onChange={(name: string) => {
                      handleRuleChange(name, funcState.id as string);
                    }}
                    disabled={disabled}
                  />
                </div>

                {otherParams.map(
                  (
                    param: {
                      type: string;
                    },
                    idx: number,
                  ) => (
                    <div
                      className="data-quality-validation-gui-editor__function__parameter"
                      // eslint-disable-next-line react/no-array-index-key
                      key={idx}
                    >
                      <FunctionParameterHandler
                        parameter={param}
                        onChange={(value: unknown, type: string) => {
                          handleFiltersChange(
                            funcState.id as string,
                            value as string | number | boolean | string[],
                            type as SUPPORTED_TYPES,
                            idx,
                          );
                        }}
                        options={columnOptions}
                        disabled={disabled}
                      />
                    </div>
                  ),
                )}
              </div>
            );
          })}
        </div>
        <div className="data-quality-validation-gui-editor__function data-quality-validation-gui-editor__function--assert-helper">
          <FunctionParameterHandler
            parameter={assertion.parameters.columns}
            onChange={(value: unknown, type: string) => {
              handleAssertChange(
                value as string | string[],
                type as SUPPORTED_TYPES,
              );
            }}
            options={columnOptions}
            placeholder="Columns to persist"
            disabled={disabled}
          />
        </div>
      </div>
    );
  },
);
