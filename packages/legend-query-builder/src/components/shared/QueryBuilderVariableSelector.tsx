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
  CalculatorIcon,
  ContextMenu,
  DollarIcon,
  DragPreviewLayer,
  InfoCircleIcon,
  MenuContent,
  MenuContentItem,
  PanelFormListItems,
  PencilIcon,
  TimesIcon,
  clsx,
  useDragPreviewLayer,
} from '@finos/legend-art';
import {
  type VariableExpression,
  type ValueSpecification,
  SimpleFunctionExpression,
} from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import { useDrag } from 'react-dnd';
import type { QueryBuilderState } from '../../stores/QueryBuilderState.js';
import { getValueSpecificationStringValue } from '../../stores/shared/ValueSpecificationEditorHelper.js';
import {
  type QueryBuilderVariableDragSource,
  QUERY_BUILDER_VARIABLE_DND_TYPE,
  VariableInfoTooltip,
} from './BasicValueSpecificationEditor.js';
import { buildDatePickerOption } from './CustomDatePickerHelper.js';
import { QueryBuilderSimpleConstantExpressionState } from '../../stores/QueryBuilderConstantsState.js';
import { forwardRef, useRef, useState } from 'react';

const CALCULATED = '(calculated)';

export const getNameOfValueSpecification = (
  value: ValueSpecification,
  queryBuilderState: QueryBuilderState,
): string | undefined => {
  if (value instanceof SimpleFunctionExpression) {
    const possibleDateLabel = buildDatePickerOption(
      value,
      queryBuilderState.applicationStore,
    ).label;
    if (possibleDateLabel) {
      return possibleDateLabel;
    }
  }
  return getValueSpecificationStringValue(
    value,
    queryBuilderState.applicationStore,
  );
};

const QueryBuilderVariableContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      variable: VariableExpression;
      variableInUse: boolean;
      actions?:
        | {
            editVariable: () => void;
            deleteVariable: () => void;
          }
        | undefined;
      extraContextMenuActions?:
        | {
            key: string;
            label: string;
            handler: () => void;
          }[]
        | undefined;
    }
  >(function QueryBuilderVariableContextMenu(props, ref) {
    const { actions, extraContextMenuActions, variableInUse } = props;
    return (
      <MenuContent ref={ref}>
        {extraContextMenuActions?.map((action) => (
          <MenuContentItem onClick={action.handler} key={action.key}>
            {action.label}
          </MenuContentItem>
        ))}
        {actions?.editVariable && (
          <MenuContentItem onClick={actions.editVariable}>Edit</MenuContentItem>
        )}
        {actions?.deleteVariable && (
          <MenuContentItem
            disabled={variableInUse}
            onClick={actions.deleteVariable}
          >
            Remove
          </MenuContentItem>
        )}
      </MenuContent>
    );
  }),
);
export const VariableViewer = observer(
  (props: {
    variable: VariableExpression;
    queryBuilderState: QueryBuilderState;
    isReadOnly: boolean;
    value?: {
      val: ValueSpecification | undefined;
    };
    actions?: {
      editVariable: () => void;
      deleteVariable: () => void;
    };
    extraContextMenuActions?:
      | {
          key: string;
          label: string;
          handler: () => void;
        }[]
      | undefined;
    option?: {
      hideMilestoningParameterValueString?: boolean;
    };
  }) => {
    const {
      variable,
      value,
      actions,
      isReadOnly,
      queryBuilderState,
      extraContextMenuActions,
      option,
    } = props;
    const isVariableUsed = queryBuilderState.isVariableUsed(variable);
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);
    const isConstant = Boolean(value);
    const constantValueString = value?.val
      ? getNameOfValueSpecification(value.val, queryBuilderState)
      : undefined;
    const name = variable.name;
    const variableTypeName =
      variable.genericType?.value.rawType.name ??
      (isConstant ? CALCULATED : undefined);
    const isMilestoningParameter =
      queryBuilderState.milestoningState.isMilestoningParameter(variable);
    const milestoningParameterValue =
      queryBuilderState.milestoningState.getMilestoningParameterValue(variable);
    const milestoningParameterValueString = isMilestoningParameter
      ? milestoningParameterValue
        ? getNameOfValueSpecification(
            milestoningParameterValue,
            queryBuilderState,
          )
        : undefined
      : undefined;
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
    const ref = useRef<HTMLDivElement>(null);
    dragConnector(ref);
    useDragPreviewLayer(dragPreviewConnector);

    return (
      <div className="query-builder__variables__variable" ref={ref}>
        <ContextMenu
          content={
            <QueryBuilderVariableContextMenu
              variable={variable}
              variableInUse={isVariableUsed}
              actions={actions}
              extraContextMenuActions={extraContextMenuActions}
            />
          }
          disabled={isReadOnly || !actions}
          className={clsx('query-builder__variables__variable__context-menu', {
            'query-builder__variables__variable--selected-from-context-menu':
              isSelectedFromContextMenu,
          })}
          menuProps={{ elevation: 7 }}
          onOpen={onContextMenuOpen}
          onClose={onContextMenuClose}
        >
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
                {isConstant ? (
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
              {isConstant ? (
                <div
                  className={clsx('query-builder__constants__value', {
                    'query-builder__constants__value--icon':
                      !constantValueString,
                  })}
                >
                  {constantValueString}
                  {!constantValueString && (
                    <CalculatorIcon title="Calculated Constant" />
                  )}
                </div>
              ) : (
                <div className="query-builder__variables__variable__type">
                  <div className="query-builder__variables__variable__type__label">
                    {variableTypeName ?? 'unknown'}
                  </div>
                  {isMilestoningParameter && (
                    <>
                      <div className="query-builder__variables__variable__type__label query-builder__variables__variable__type__label--milestoning">
                        milestoning
                      </div>
                      {!option?.hideMilestoningParameterValueString && (
                        <div className="query-builder__constants__value">
                          {milestoningParameterValueString}
                        </div>
                      )}
                    </>
                  )}
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
        </ContextMenu>
      </div>
    );
  },
);

export const VariableSelector = observer(
  (props: {
    queryBuilderState: QueryBuilderState;
    filterBy?: (variableExpression: VariableExpression) => boolean;
  }) => {
    const { queryBuilderState, filterBy } = props;
    const filteredParameterStates =
      queryBuilderState.parametersState.parameterStates.filter((p) =>
        filterBy ? filterBy(p.parameter) : true,
      );
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
              isReadOnly={true}
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
                value={{
                  val:
                    constantState instanceof
                    QueryBuilderSimpleConstantExpressionState
                      ? constantState.value
                      : undefined,
                }}
                queryBuilderState={queryBuilderState}
                isReadOnly={true}
              />
            ))}
          </PanelFormListItems>
        )}
      </>
    );
  },
);
