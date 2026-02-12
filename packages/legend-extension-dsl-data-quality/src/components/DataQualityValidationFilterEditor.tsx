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
import {
  PropertyExplicitReference,
  type AbstractProperty,
  type CollectionInstanceValue,
  type PrimitiveInstanceValue,
} from '@finos/legend-graph';
import {
  DataQualityValidationFilterCondition,
  DataQualityValidationLogicalGroupFunction,
  type DataQualityValidationFilterFunction,
} from './utils/DataQualityValidationFunction.js';
import { DataQualityValidationFunctionRenderer } from './DataQualityValidationFunctionRenderer.js';
import { DataQualityValidationFunctionsUtils } from './utils/DataQualityValidationFunctionsUtils.js';
import { propertyExpression_setFunc } from '@finos/legend-query-builder';
import {
  ControlledDropdownMenu,
  MenuContent,
  MenuContentItem,
  PlusIcon,
  TrashIcon,
} from '@finos/legend-art';
import {
  dataQualityValidationFilterFunction_addLogicalOperation,
  dataQualityValidationFilterFunction_deleteCondition,
  dataQualityValidationFilterFunction_transformConditionToLogicalGroup,
  dataQualityValidationLogicalGroupFunction_changeGroupFunction,
} from './utils/DataQualityValidationFunctionModifier.js';
import { DataQualityValidationFunctionFactory } from './utils/DataQualityValidationFunctionFactory.js';
import { DATA_QUALITY_VALIDATION_LOGICAL_FUNCTIONS } from './constants/DataQualityConstants.js';
import type { Option } from './DataQualityCustomSelector.js';

const DataQualityValidationFilterConditionEditor = observer(
  (props: {
    condition: DataQualityValidationFilterCondition;
    validationState: DataQualityRelationValidationState;
    disabled: boolean;
    showAddButton: boolean;
    showDeleteButton: boolean;
    handleFunctionChange: (name: string, id: string) => void;
    handleColumnChange: (value: string) => void;
    handleFunctionParamChange: (
      param: PrimitiveInstanceValue | CollectionInstanceValue,
      index: number,
    ) => void;
    onAdd?: (operator: DATA_QUALITY_VALIDATION_LOGICAL_FUNCTIONS) => void;
    onDelete?: () => void;
    getFunctionOptions: (type: string) => Option[];
  }) => {
    const {
      condition,
      validationState,
      disabled,
      showAddButton,
      showDeleteButton,
      handleFunctionChange,
      onAdd,
      onDelete,
      getFunctionOptions,
      handleColumnChange,
      handleFunctionParamChange,
    } = props;
    const { columnOptions } = validationState;
    const observerContext =
      validationState.editorStore.changeDetectionState.observerContext;
    const graph = validationState.editorStore.graphManagerState.graph;
    const column = condition.parameters.property;
    const columnOption = columnOptions.find(
      ({ value }) => value === column.func.value.name,
    );
    return (
      <div className="data-quality-validation-gui-editor__filter-validation">
        <DataQualityValidationFunctionRenderer
          id={condition.id}
          columnOptions={columnOptions}
          graph={graph}
          observerContext={observerContext}
          readOnly={disabled}
          functionName={condition.name}
          functionParameters={condition.parameters.otherParams}
          functionOptions={getFunctionOptions(columnOption?.type ?? '')}
          handleColChange={(value: string) => {
            propertyExpression_setFunc(
              column,
              PropertyExplicitReference.create({
                name: value,
              } as AbstractProperty),
            );
            handleColumnChange(value);
          }}
          selectedColumn={columnOption}
          handleFunctionChange={handleFunctionChange}
          handleFunctionParametersChange={(
            param: PrimitiveInstanceValue | CollectionInstanceValue,
            index: number,
          ) => {
            condition.parameters.otherParams[index] = param;
            handleFunctionParamChange(param, index);
          }}
        />
        {showAddButton && (
          <ControlledDropdownMenu
            className="data-quality-validation-gui-editor__filter-validation__add-condition"
            title="Add Condition"
            content={
              <MenuContent>
                <MenuContentItem
                  onClick={() =>
                    onAdd?.(DATA_QUALITY_VALIDATION_LOGICAL_FUNCTIONS.AND)
                  }
                >
                  And
                </MenuContentItem>
                <MenuContentItem
                  onClick={() => {
                    onAdd?.(DATA_QUALITY_VALIDATION_LOGICAL_FUNCTIONS.OR);
                  }}
                >
                  Or
                </MenuContentItem>
              </MenuContent>
            }
          >
            <PlusIcon size={10} color="white" />
          </ControlledDropdownMenu>
        )}
        {showDeleteButton && (
          <button
            className="data-quality-validation-gui-editor__filter-validation__add-condition"
            title="Add Condition"
            onClick={onDelete}
          >
            <TrashIcon size={10} color="white" />
          </button>
        )}
      </div>
    );
  },
);

const RenderConditionTree = observer(
  (props: {
    condition:
      | DataQualityValidationFilterCondition
      | DataQualityValidationLogicalGroupFunction;
    validationState: DataQualityRelationValidationState;
    disabled: boolean;
    validationFunction: DataQualityValidationFilterFunction;
  }) => {
    const { condition, validationState, disabled, validationFunction } = props;

    const observerContext =
      validationState.editorStore.changeDetectionState.observerContext;
    const graph = validationState.editorStore.graphManagerState.graph;
    const functionFactory = new DataQualityValidationFunctionFactory(
      graph,
      observerContext,
    );

    if (condition instanceof DataQualityValidationLogicalGroupFunction) {
      return (
        <div className="data-quality-validation-gui-editor__logical-group">
          <div className="data-quality-validation-gui-editor__logical-group__branch">
            <RenderConditionTree
              condition={condition.parameters.left}
              validationState={validationState}
              disabled={disabled}
              validationFunction={validationFunction}
            />
          </div>

          <button
            className="data-quality-validation-gui-editor__logical-group__operator"
            title="Switch operator"
            onClick={() => {
              condition.changeName();
              validationState.debouncedHandleValidationFormChange();
            }}
          >
            {condition.name.toUpperCase()}
          </button>

          <div className="data-quality-validation-gui-editor__logical-group__branch">
            <RenderConditionTree
              condition={condition.parameters.right}
              validationState={validationState}
              disabled={disabled}
              validationFunction={validationFunction}
            />
          </div>
        </div>
      );
    }

    const handleFunctionChange = (name: string, id: string) => {
      const findAndChange = (
        node:
          | DataQualityValidationFilterCondition
          | DataQualityValidationLogicalGroupFunction,
        parent?: DataQualityValidationLogicalGroupFunction,
        isLeftChild?: boolean,
      ): boolean => {
        if (node.id === id) {
          if (parent) {
            dataQualityValidationLogicalGroupFunction_changeGroupFunction(
              parent,
              name,
              isLeftChild ? 'left' : 'right',
              functionFactory,
              observerContext,
            );
            return true;
          }
          // If no parent, this is the root - handle separately
          return false;
        }

        if (node instanceof DataQualityValidationLogicalGroupFunction) {
          return (
            findAndChange(node.parameters.left, node, true) ||
            findAndChange(node.parameters.right, node, false)
          );
        }

        return false;
      };

      findAndChange(validationFunction.parameters.lambda.body);
      validationState.debouncedHandleValidationFormChange();
    };

    if (condition instanceof DataQualityValidationFilterCondition) {
      return (
        <DataQualityValidationFilterConditionEditor
          condition={condition}
          validationState={validationState}
          disabled={disabled}
          showAddButton={true}
          showDeleteButton={true}
          getFunctionOptions={(type: string) =>
            DataQualityValidationFunctionsUtils.getFilterFunctionOptionsByColType(
              type,
            )
          }
          handleFunctionChange={handleFunctionChange}
          onDelete={() => {
            dataQualityValidationFilterFunction_deleteCondition(
              validationFunction,
              condition,
            );
            validationState.debouncedHandleValidationFormChange();
          }}
          onAdd={(newOperator) => {
            dataQualityValidationFilterFunction_transformConditionToLogicalGroup(
              validationFunction,
              condition,
              newOperator,
              functionFactory,
              observerContext,
            );
            validationState.debouncedHandleValidationFormChange();
          }}
          handleColumnChange={() => {
            validationState.debouncedHandleValidationFormChange();
          }}
          handleFunctionParamChange={() => {
            validationState.debouncedHandleValidationFormChange();
          }}
        />
      );
    }

    return null;
  },
);

export const DataQualityValidationFilterEditor = observer(
  (props: {
    validationState: DataQualityRelationValidationState;
    disabled: boolean;
    validationFunction: DataQualityValidationFilterFunction;
  }) => {
    const { validationState, validationFunction, disabled } = props;
    const { dataQualityValidationLambdaFormState } = validationState;
    const observerContext =
      validationState.editorStore.changeDetectionState.observerContext;
    const graph = validationState.editorStore.graphManagerState.graph;
    const functionFactory = new DataQualityValidationFunctionFactory(
      graph,
      observerContext,
    );

    if (!dataQualityValidationLambdaFormState) {
      return null;
    }

    const { handleValidationBodyChange } = dataQualityValidationLambdaFormState;
    const { body } = validationFunction.parameters.lambda;

    if (body instanceof DataQualityValidationFilterCondition) {
      return (
        <DataQualityValidationFilterConditionEditor
          condition={body}
          validationState={validationState}
          disabled={disabled}
          showAddButton={!!body.name}
          showDeleteButton={false}
          getFunctionOptions={(type: string) =>
            DataQualityValidationFunctionsUtils.getFunctionOptionsByColType(
              type,
            )
          }
          handleFunctionChange={(name) => {
            handleValidationBodyChange(name);
            validationState.debouncedHandleValidationFormChange();
          }}
          onAdd={(operator) => {
            dataQualityValidationFilterFunction_addLogicalOperation(
              validationFunction,
              body,
              operator,
              functionFactory,
              observerContext,
            );
          }}
          handleColumnChange={() => {
            validationState.debouncedHandleValidationFormChange();
          }}
          handleFunctionParamChange={() => {
            validationState.debouncedHandleValidationFormChange();
          }}
        />
      );
    }

    return (
      <div className="data-quality-validation-gui-editor__filter-validation">
        <div className="data-quality-validation-gui-editor__filter-validation__body">
          <RenderConditionTree
            condition={body}
            validationState={validationState}
            disabled={disabled}
            validationFunction={validationFunction}
          />
        </div>
      </div>
    );
  },
);
