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
  DollarIcon,
  DragPreviewLayer,
  InfoCircleIcon,
  PanelFormListItems,
  PencilIcon,
  TimesIcon,
  useDragPreviewLayer,
} from '@finos/legend-art';
import {
  SimpleFunctionExpression,
  SUPPORTED_FUNCTIONS,
  type ValueSpecification,
  type VariableExpression,
} from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import { useDrag } from 'react-dnd';
import type { QueryBuilderDerivedPropertyExpressionState } from '../../stores/QueryBuilderPropertyEditorState.js';
import type { QueryBuilderState } from '../../stores/QueryBuilderState.js';
import { getValueSpecificationStringValue } from '../../stores/shared/ValueSpecificationEditorHelper.js';
import {
  type QueryBuilderVariableDragSource,
  QUERY_BUILDER_VARIABLE_DND_TYPE,
  VariableInfoTooltip,
} from './BasicValueSpecificationEditor.js';
import { buildCustomDateOption } from './CustomDatePicker.js';

export const VariableViewer = observer(
  (props: {
    variable: VariableExpression;
    queryBuilderState: QueryBuilderState;
    isReadOnly: boolean;
    constantValue?: ValueSpecification | undefined;
    actions?: {
      editVariable: () => void;
      deleteVariable: () => void;
    };
  }) => {
    const { variable, constantValue, actions, isReadOnly, queryBuilderState } =
      props;

    const getNameOfValue = (value: ValueSpecification): string | undefined => {
      if (
        value instanceof SimpleFunctionExpression &&
        value.functionName === SUPPORTED_FUNCTIONS.ADJUST
      ) {
        return buildCustomDateOption(value).generateDisplayLabel();
      }
      return getValueSpecificationStringValue(value);
    };

    const valueString = constantValue
      ? getNameOfValue(constantValue)
      : undefined;
    const name = variable.name;
    const variableType = variable.genericType?.value.rawType;
    const typeName = variableType?.name;
    const isVariableUsed = queryBuilderState.isVariableUsed(variable);
    const deleteDisabled = isReadOnly || isVariableUsed;
    const deleteTitle = isVariableUsed ? 'Used in query' : 'Remove';
    const editVariable = (): void => {
      actions?.editVariable();
    };
    const deleteVariable = (): void => {
      actions?.deleteVariable();
    };
    const [, dragConnector, dragPreviewConnector] = useDrag(
      () => ({
        type: QUERY_BUILDER_VARIABLE_DND_TYPE,
        item: { variable: variable },
      }),
      [variable],
    );
    useDragPreviewLayer(dragPreviewConnector);

    return (
      <div className="query-builder__variables__variable" ref={dragConnector}>
        <DragPreviewLayer
          labelGetter={(item: QueryBuilderVariableDragSource): string =>
            item.variable.name === '' ? '(unknown)' : item.variable.name
          }
          types={[QUERY_BUILDER_VARIABLE_DND_TYPE]}
        />
        <div
          onClick={editVariable}
          className="query-builder__variables__variable__content"
        >
          <div className="query-builder__variables__variable__icon">
            <div className="query-builder__variables__variable-icon">
              {constantValue ? (
                <div className="icon query-builder__variables__variable-icon">
                  C
                </div>
              ) : (
                <DollarIcon />
              )}
            </div>
          </div>
          <div className="query-builder__variables__variable__label">
            {name}
            {valueString ? (
              <div className="query-builder__constants__value">
                {valueString}
              </div>
            ) : (
              <div className="query-builder__variables__variable__type">
                <div className="query-builder__variables__variable__type__label">
                  {typeName}
                </div>
              </div>
            )}
          </div>
        </div>
        {actions && (
          <div className="query-builder__variables__variable__actions">
            <button
              className="query-builder__variables__variable__action"
              tabIndex={-1}
              disabled={isReadOnly}
              onClick={editVariable}
              title="Edit"
            >
              <PencilIcon />
            </button>
            <button
              className="query-builder__variables__variable__action"
              tabIndex={-1}
              onClick={deleteVariable}
              disabled={deleteDisabled}
              title={deleteTitle}
            >
              <TimesIcon />
            </button>
            <VariableInfoTooltip variable={variable}>
              <div className="query-builder__variables__variable__action value-spec-editor__variable__info">
                <InfoCircleIcon />
              </div>
            </VariableInfoTooltip>
          </div>
        )}
      </div>
    );
  },
);

export const VariableSelector = observer(
  (props: {
    queryBuilderState: QueryBuilderState;
    filterBy?: (variableExpression: VariableExpression) => boolean;
    derivedProperties?:
      | QueryBuilderDerivedPropertyExpressionState[]
      | undefined;
  }) => {
    const { queryBuilderState, filterBy, derivedProperties } = props;
    const isReadOnly = !queryBuilderState.isQuerySupported;
    const filteredParameterStates =
      queryBuilderState.parametersState.parameterStates.filter((p) => {
        if (derivedProperties && p.variableType) {
          const allowedTypes = derivedProperties.map(
            (dp) => dp.derivedProperty.genericType.value.rawType,
          );
          if (!allowedTypes.includes(p.variableType)) {
            return false;
          }
        }
        return filterBy ? filterBy(p.parameter) : true;
      });
    const filteredConstantState =
      queryBuilderState.constantState.constants.filter((c) =>
        filterBy ? filterBy(c.variable) : true,
      );

    return (
      <>
        <PanelFormListItems title="Available parameters">
          {filteredParameterStates.length === 0 && (
            <> No available parameters </>
          )}
          {filteredParameterStates.map((pState) => (
            <VariableViewer
              key={pState.uuid}
              variable={pState.parameter}
              isReadOnly={isReadOnly}
              queryBuilderState={queryBuilderState}
            />
          ))}
        </PanelFormListItems>
        {Boolean(filteredConstantState.length) && (
          <PanelFormListItems title="Available constants">
            {filteredConstantState.map((constantState) => (
              <VariableViewer
                key={constantState.uuid}
                variable={constantState.variable}
                constantValue={constantState.value}
                queryBuilderState={queryBuilderState}
                isReadOnly={isReadOnly}
              />
            ))}
          </PanelFormListItems>
        )}
      </>
    );
  },
);
