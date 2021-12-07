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
import type { QueryBuilderState } from '../stores/QueryBuilderState';
import {
  BlankPanelContent,
  CustomSelectorInput,
  PencilIcon,
  TimesIcon,
  DollarIcon,
} from '@finos/legend-art';
import { FaPlus } from 'react-icons/fa';
import type { QueryBuilderParameterDragSource } from '../stores/QueryParametersState';
import {
  QUERY_BUILDER_PARAMETER_TREE_DND_TYPE,
  QueryParameterState,
} from '../stores/QueryParametersState';
import { Dialog } from '@material-ui/core';
import { useEffect, useState } from 'react';
import type { Type } from '@finos/legend-graph';
import { MULTIPLICITY_INFINITE, PRIMITIVE_TYPE } from '@finos/legend-graph';
import type { PackageableElementOption } from '@finos/legend-application';
import { buildElementOption } from '@finos/legend-application';
import { useDrag, useDragLayer } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { QueryBuilderValueSpecificationEditor } from './QueryBuilderValueSpecificationEditor';
import { flowResult } from 'mobx';

const ParameterValuesEditor = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    // main state
    const { queryBuilderState } = props;
    const parameterState = queryBuilderState.queryParametersState;
    const close = (): void => parameterState.setValuesEditorIsOpen(false);
    const execute = (): void => {
      close();
      flowResult(queryBuilderState.resultState.execute()).catch(
        queryBuilderState.applicationStore.alertIllegalUnhandledError,
      );
    };

    return (
      <Dialog
        open={Boolean(parameterState.valuesEditorIsOpen)}
        onClose={close}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <div className="modal modal--dark editor-modal query-builder__parameters__values__editor__modal">
          <div className="modal__header">
            <div className="modal__title">Execute Parameter Values</div>
          </div>
          <div className="modal__body query-builder__parameters__modal__body">
            {parameterState.parameters.map((paramState) => {
              const stringType =
                queryBuilderState.graphManagerState.graph.getPrimitiveType(
                  PRIMITIVE_TYPE.STRING,
                );
              const variableType = paramState.variableType ?? stringType;
              return (
                <div
                  key={paramState.uuid}
                  className="panel__content__form__section"
                >
                  <div className="query-builder__parameters__value__label">
                    <div>{paramState.parameter.name}</div>
                    <div className="query-builder__parameters__parameter__type__label">
                      {variableType.name}
                    </div>
                  </div>
                  {paramState.values && (
                    <QueryBuilderValueSpecificationEditor
                      valueSpecification={paramState.values}
                      graph={queryBuilderState.graphManagerState.graph}
                      expectedType={variableType}
                      className="query-builder__parameters__value__editor"
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="modal__footer">
            <button
              className="btn modal__footer__close-btn"
              title="execute"
              onClick={execute}
            >
              Execute
            </button>
            <button className="btn modal__footer__close-btn" onClick={close}>
              Close
            </button>
          </div>
        </div>
      </Dialog>
    );
  },
);

const VariableExpressionEditor = observer(
  (props: {
    queryBuilderState: QueryBuilderState;
    variableExpressionState: QueryParameterState;
  }) => {
    // main state
    const { queryBuilderState, variableExpressionState } = props;
    const queryParameterState = queryBuilderState.queryParametersState;
    const isCreating = !queryParameterState.parameters.includes(
      variableExpressionState,
    );
    const varState = variableExpressionState.parameter;
    const multiplity = varState.multiplicity;
    // variable
    const changeVariableName: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      varState.setName(event.target.value);
    };
    // type
    const stringType =
      queryBuilderState.graphManagerState.graph.getPrimitiveType(
        PRIMITIVE_TYPE.STRING,
      );
    const variableType = variableExpressionState.variableType ?? stringType;
    const selectedType = buildElementOption(variableType);
    const typeOptions: PackageableElementOption<Type>[] =
      queryBuilderState.graphManagerState.graph.primitiveTypes
        .map((p) => buildElementOption(p) as PackageableElementOption<Type>)
        .concat(queryBuilderState.enumerationOptions);
    const changeType = (val: PackageableElementOption<Type>): void => {
      if (variableType !== val.value) {
        variableExpressionState.changeVariableType(val.value);
      }
    };
    // multiplicity
    const changeLowerBound: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      variableExpressionState.changeMultiplicity(
        parseInt(event.target.value),
        multiplity.upperBound,
      );
    };
    const [upperBound, setUppBound] = useState<string>(
      multiplity.upperBound === undefined
        ? MULTIPLICITY_INFINITE
        : multiplity.upperBound.toString(),
    );
    const changeUpperBound: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      const value = event.target.value;
      if (
        value === MULTIPLICITY_INFINITE ||
        value === '' ||
        !isNaN(parseInt(value))
      ) {
        variableExpressionState.changeMultiplicity(
          multiplity.lowerBound,
          value === MULTIPLICITY_INFINITE || value === ''
            ? undefined
            : parseInt(value),
        );
        setUppBound(value);
      }
    };

    const close = (): void => {
      queryParameterState.setSelectedParameter(undefined);
    };
    const onAction = (): void => {
      if (isCreating) {
        queryParameterState.addParameter(variableExpressionState);
      }
      close();
    };
    return (
      <Dialog
        open={Boolean(variableExpressionState)}
        onClose={close}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <div className="modal modal--dark editor-modal query-builder__parameters__modal">
          <div className="modal__header">
            <div className="modal__title">
              {`${isCreating ? 'Create ' : 'Update '}`}Parameter
            </div>
          </div>
          <div className="modal__body query-builder__parameters__modal__body">
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Parameter Name
              </div>
              <div className="panel__content__form__section__header__prompt">
                Name of the parameter. Should be descriptive of its purpose.
              </div>
              <input
                className="panel__content__form__section__input panel__content__form__section__number-input"
                spellCheck={false}
                value={varState.name}
                onChange={changeVariableName}
              />
            </div>
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Type
              </div>
              <div className="panel__content__form__section__header__prompt">
                Data type of the parameter.
              </div>
              <CustomSelectorInput
                placeholder="Choose a type..."
                options={typeOptions}
                onChange={changeType}
                value={selectedType}
                darkMode={true}
              />
            </div>
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Multiplicity
              </div>
              <div className="panel__content__form__section__header__prompt">
                The multiplity determines how many values a parameter can have.
                Default is set to mandatory single vlue.
              </div>
              <input
                className="panel__content__form__section__input panel__content__form__section__number-input"
                type="number"
                spellCheck={false}
                value={multiplity.lowerBound}
                onChange={changeLowerBound}
              />
              ..
              <input
                className="panel__content__form__section__input panel__content__form__section__number-input"
                spellCheck={false}
                value={upperBound}
                onChange={changeUpperBound}
              />
            </div>
          </div>
          <div className="modal__footer">
            {isCreating && (
              <button
                className="btn modal__footer__close-btn"
                onClick={onAction}
              >
                Create
              </button>
            )}
            <button className="btn modal__footer__close-btn" onClick={close}>
              Close
            </button>
          </div>
        </div>
      </Dialog>
    );
  },
);

const QueryBuilderParameterDragLayer = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { itemType, item, isDragging, currentPosition } = useDragLayer(
      (monitor) => ({
        itemType:
          monitor.getItemType() as QUERY_BUILDER_PARAMETER_TREE_DND_TYPE,
        item: monitor.getItem() as QueryBuilderParameterDragSource | null,
        isDragging: monitor.isDragging(),
        initialOffset: monitor.getInitialSourceClientOffset(),
        currentPosition: monitor.getClientOffset(),
      }),
    );

    if (
      !isDragging ||
      !item ||
      !Object.values(QUERY_BUILDER_PARAMETER_TREE_DND_TYPE).includes(itemType)
    ) {
      return null;
    }
    return (
      <div className="query-builder__parameters__drag-preview-layer">
        <div
          className="query-builder__parameters__drag-preview"
          style={
            !currentPosition
              ? { display: 'none' }
              : {
                  transform: `translate(${currentPosition.x + 20}px, ${
                    currentPosition.y + 10
                  }px)`,
                }
          }
        >
          {item.variable.variableName}
        </div>
      </div>
    );
  },
);

export const VariableExpressionViewer = observer(
  (props: {
    queryBuilderState: QueryBuilderState;
    variableExpressionState: QueryParameterState;
  }) => {
    const { queryBuilderState, variableExpressionState } = props;
    const queryParameterState = queryBuilderState.queryParametersState;
    const variable = variableExpressionState.parameter;
    const name = variable.name;
    const variableType = variable.genericType?.value.rawType;
    const typeName = variableType?.name;
    const editVariable = (): void => {
      queryParameterState.setSelectedParameter(variableExpressionState);
    };
    const deleteVariable = (): void =>
      queryParameterState.removeParameter(variableExpressionState);
    const [, dragConnector, dragPreviewConnector] = useDrag(
      () => ({
        type: QUERY_BUILDER_PARAMETER_TREE_DND_TYPE.VARIABLE,
        item: { variable: variableExpressionState },
      }),
      [variableExpressionState],
    );
    // hide default HTML5 preview image
    useEffect(() => {
      dragPreviewConnector(getEmptyImage(), { captureDraggingState: true });
    }, [dragPreviewConnector]);
    return (
      <div className="query-builder__parameters__parameter" ref={dragConnector}>
        <QueryBuilderParameterDragLayer queryBuilderState={queryBuilderState} />
        <div className="query-builder__parameters__parameter__content">
          <div className="query-builder__parameters__parameter__icon">
            <div className="query-builder__parameters__parameter-icon">
              <DollarIcon />
            </div>
          </div>
          <div className="query-builder__parameters__parameter__label">
            {name}
            <div className="query-builder__parameters__parameter__type">
              <div className="query-builder__parameters__parameter__type__label">
                {typeName}
              </div>
            </div>
          </div>
        </div>
        <div className="query-builder__parameters__parameter__actions">
          <button
            className="query-builder__parameters__parameter__action"
            tabIndex={-1}
            onClick={editVariable}
            title="Edit Parameter"
          >
            <PencilIcon />
          </button>
          <button
            className="query-builder__parameters__parameter__action"
            onClick={deleteVariable}
            title="Remove"
          >
            <TimesIcon />
          </button>
        </div>
      </div>
    );
  },
);

export const QueryBuilderParameterPanel = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const queryParameterState = queryBuilderState.queryParametersState;
    const parametersDisabled = Boolean(
      queryBuilderState.mode.isParametersDisabled,
    );
    const addParameter = (): void => {
      if (!parametersDisabled) {
        const parmaterState =
          QueryParameterState.createDefault(queryParameterState);
        queryParameterState.setSelectedParameter(parmaterState);
        parmaterState.mockParameterValues();
      }
    };

    return (
      <div className="panel query-builder__parameters">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">parameters</div>
          </div>
          <div className="panel__header__actions">
            <button
              className="panel__header__action"
              tabIndex={-1}
              onClick={addParameter}
              disabled={parametersDisabled}
              title="Add Parameter"
            >
              <FaPlus />
            </button>
          </div>
        </div>
        <div className="panel__content query-builder__parameters__content">
          {!parametersDisabled &&
            queryParameterState.parameters.map((parameter) => (
              <VariableExpressionViewer
                key={parameter.uuid}
                queryBuilderState={queryBuilderState}
                variableExpressionState={parameter}
              />
            ))}
          {parametersDisabled && (
            <BlankPanelContent>
              Parameters not supported in this mode
            </BlankPanelContent>
          )}
        </div>
        {queryParameterState.selectedParameter && (
          <VariableExpressionEditor
            queryBuilderState={queryBuilderState}
            variableExpressionState={queryParameterState.selectedParameter}
          />
        )}
        {queryParameterState.valuesEditorIsOpen && (
          <ParameterValuesEditor queryBuilderState={queryBuilderState} />
        )}
      </div>
    );
  },
);
