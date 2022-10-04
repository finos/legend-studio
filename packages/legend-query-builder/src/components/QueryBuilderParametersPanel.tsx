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

import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import type { QueryBuilderState } from '../stores/QueryBuilderState.js';
import {
  Dialog,
  BlankPanelContent,
  CustomSelectorInput,
  PencilIcon,
  TimesIcon,
  DollarIcon,
  PlusIcon,
  InputWithInlineValidation,
  DragPreviewLayer,
  useDragPreviewLayer,
  BlankPanelPlaceholder,
} from '@finos/legend-art';
import {
  type QueryBuilderParameterDragSource,
  QUERY_BUILDER_PARAMETER_DND_TYPE,
} from '../stores/QueryBuilderParametersState.js';
import {
  type Type,
  MULTIPLICITY_INFINITE,
  PRIMITIVE_TYPE,
  VariableExpression,
  GenericTypeExplicitReference,
  GenericType,
} from '@finos/legend-graph';
import {
  type PackageableElementOption,
  buildElementOption,
  variableExpression_setName,
  LambdaParameterState,
  LambdaParameterValuesEditor,
  getPackageableElementOptionFormatter,
  useApplicationStore,
} from '@finos/legend-application';
import { useDrag } from 'react-dnd';
import { generateEnumerableNameFromToken } from '@finos/legend-shared';
import { DEFAULT_VARIABLE_NAME } from '../stores/QueryBuilderConfig.js';

const VariableExpressionEditor = observer(
  (props: {
    queryBuilderState: QueryBuilderState;
    lambdaParameterState: LambdaParameterState;
  }) => {
    // main state
    const { queryBuilderState, lambdaParameterState } = props;
    const applicationStore = useApplicationStore();
    const queryParametersState = queryBuilderState.parametersState;
    const isCreating =
      !queryParametersState.parameterStates.includes(lambdaParameterState);
    const varState = lambdaParameterState.parameter;
    const multiplity = varState.multiplicity;
    const validationMessage = !varState.name
      ? `Parameter name can't be empty`
      : (isCreating &&
          queryParametersState.parameterStates.find(
            (p) => p.parameter.name === varState.name,
          )) ||
        (!isCreating &&
          queryParametersState.parameterStates.filter(
            (p) => p.parameter.name === varState.name,
          ).length > 1)
      ? 'Parameter name already exists'
      : undefined;

    // variable
    const changeVariableName: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      variableExpression_setName(varState, event.target.value);
    };

    // type
    const stringType =
      queryBuilderState.graphManagerState.graph.getPrimitiveType(
        PRIMITIVE_TYPE.STRING,
      );
    const variableType = lambdaParameterState.variableType ?? stringType;
    const selectedType = buildElementOption(variableType);
    const typeOptions: PackageableElementOption<Type>[] =
      queryBuilderState.graphManagerState.graph.primitiveTypes
        .map(buildElementOption)
        .concat(
          queryBuilderState.graphManagerState.graph.enumerations.map(
            buildElementOption,
          ),
        );
    const changeType = (val: PackageableElementOption<Type>): void => {
      if (variableType !== val.value) {
        lambdaParameterState.changeVariableType(val.value);
      }
    };

    // multiplicity
    const changeLowerBound: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      lambdaParameterState.changeMultiplicity(
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
        !isNaN(parseInt(value, 10))
      ) {
        lambdaParameterState.changeMultiplicity(
          multiplity.lowerBound,
          value === MULTIPLICITY_INFINITE || value === ''
            ? undefined
            : parseInt(value, 10),
        );
        setUppBound(value);
      }
    };

    const close = (): void => {
      queryParametersState.setSelectedParameter(undefined);
    };
    const onAction = (): void => {
      if (isCreating) {
        queryParametersState.addParameter(lambdaParameterState);
      }
      close();
    };

    return (
      <Dialog
        open={Boolean(lambdaParameterState)}
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
              <div className="query-builder__parameters__parameter__name">
                <InputWithInlineValidation
                  className="query-builder__parameters__parameter__name__input input-group__input"
                  spellCheck={false}
                  value={varState.name}
                  onChange={changeVariableName}
                  placeholder="Parameter name"
                  validationErrorMessage={validationMessage}
                />
              </div>
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
                darkMode={!applicationStore.TEMPORARY__isLightThemeEnabled}
                formatOptionLabel={getPackageableElementOptionFormatter({
                  darkMode: !applicationStore.TEMPORARY__isLightThemeEnabled,
                })}
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
                className="btn modal__footer__close-btn btn--dark"
                onClick={onAction}
                disabled={Boolean(validationMessage)}
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

export const VariableExpressionViewer = observer(
  (props: {
    queryBuilderState: QueryBuilderState;
    isReadOnly: boolean;
    hideActions?: boolean;
    variableExpressionState: LambdaParameterState;
  }) => {
    const {
      queryBuilderState,
      isReadOnly,
      hideActions,
      variableExpressionState,
    } = props;
    const queryParameterState = queryBuilderState.parametersState;
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
        type: QUERY_BUILDER_PARAMETER_DND_TYPE,
        item: { variable: variableExpressionState },
      }),
      [variableExpressionState],
    );
    useDragPreviewLayer(dragPreviewConnector);

    return (
      <div className="query-builder__parameters__parameter" ref={dragConnector}>
        <DragPreviewLayer
          labelGetter={(item: QueryBuilderParameterDragSource): string =>
            item.variable.variableName === ''
              ? '(unknown)'
              : item.variable.variableName
          }
          types={[QUERY_BUILDER_PARAMETER_DND_TYPE]}
        />
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
        {!hideActions && (
          <div className="query-builder__parameters__parameter__actions">
            <button
              className="query-builder__parameters__parameter__action"
              tabIndex={-1}
              disabled={isReadOnly}
              onClick={editVariable}
              title="Edit"
            >
              <PencilIcon />
            </button>
            <button
              className="query-builder__parameters__parameter__action"
              tabIndex={-1}
              onClick={deleteVariable}
              disabled={isReadOnly}
              title="Remove"
            >
              <TimesIcon />
            </button>
          </div>
        )}
      </div>
    );
  },
);

export const QueryBuilderParametersPanel = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const isReadOnly = !queryBuilderState.isQuerySupported;
    const queryParameterState = queryBuilderState.parametersState;
    const varNames = queryBuilderState.parametersState.parameterStates.map(
      (parameter) => parameter.variableName,
    );
    const addParameter = (): void => {
      if (!isReadOnly && !queryBuilderState.isParameterSupportDisabled) {
        const parmaterState = new LambdaParameterState(
          new VariableExpression(
            generateEnumerableNameFromToken(varNames, DEFAULT_VARIABLE_NAME),
            queryBuilderState.graphManagerState.graph.getMultiplicity(1, 1),
            GenericTypeExplicitReference.create(
              new GenericType(
                queryParameterState.queryBuilderState.graphManagerState.graph.getPrimitiveType(
                  PRIMITIVE_TYPE.STRING,
                ),
              ),
            ),
          ),
          queryBuilderState.observableContext,
          queryBuilderState.graphManagerState.graph,
        );
        queryParameterState.setSelectedParameter(parmaterState);
        parmaterState.mockParameterValue();
      }
    };

    return (
      <div className="panel query-builder__parameters">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">parameters</div>
          </div>
          {!isReadOnly && !queryBuilderState.isParameterSupportDisabled && (
            <div className="panel__header__actions">
              <button
                className="panel__header__action"
                tabIndex={-1}
                onClick={addParameter}
                title="Add Parameter"
              >
                <PlusIcon />
              </button>
            </div>
          )}
        </div>
        <div className="panel__content query-builder__parameters__content">
          {!queryBuilderState.isParameterSupportDisabled && (
            <>
              {Boolean(queryParameterState.parameterStates.length) &&
                queryParameterState.parameterStates.map((parameter) => (
                  <VariableExpressionViewer
                    key={parameter.uuid}
                    queryBuilderState={queryBuilderState}
                    isReadOnly={isReadOnly}
                    variableExpressionState={parameter}
                  />
                ))}
              {!queryParameterState.parameterStates.length && (
                <BlankPanelPlaceholder
                  text="Add a parameter"
                  disabled={isReadOnly}
                  onClick={addParameter}
                  clickActionType="add"
                  previewText="No parameter"
                  tooltipText="Click to add a new parameter"
                />
              )}
            </>
          )}
          {queryBuilderState.isParameterSupportDisabled && (
            <BlankPanelContent>Parameters are not supported</BlankPanelContent>
          )}
        </div>
        {queryParameterState.selectedParameter && (
          <VariableExpressionEditor
            queryBuilderState={queryBuilderState}
            lambdaParameterState={queryParameterState.selectedParameter}
          />
        )}
        {queryParameterState.parameterValuesEditorState.showModal && (
          <LambdaParameterValuesEditor
            graph={
              queryParameterState.queryBuilderState.graphManagerState.graph
            }
            lambdaParametersState={queryParameterState}
          />
        )}
      </div>
    );
  },
);
