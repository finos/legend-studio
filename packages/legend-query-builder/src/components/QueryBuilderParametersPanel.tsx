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
import type { QueryBuilderState } from '../stores/QueryBuilderState.js';
import {
  Dialog,
  BlankPanelContent,
  CustomSelectorInput,
  PlusIcon,
  BlankPanelPlaceholder,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  InfoCircleIcon,
  ModalFooterButton,
  PanelFormValidatedTextField,
} from '@finos/legend-art';
import {
  type Type,
  VariableExpression,
  GenericTypeExplicitReference,
  GenericType,
  PrimitiveType,
  Multiplicity,
  getMultiplicityPrettyDescription,
  isValidIdentifier,
} from '@finos/legend-graph';
import { useApplicationStore } from '@finos/legend-application';
import { generateEnumerableNameFromToken } from '@finos/legend-shared';
import { DEFAULT_VARIABLE_NAME } from '../stores/QueryBuilderConfig.js';
import { variableExpression_setName } from '../stores/shared/ValueSpecificationModifierHelper.js';
import { LambdaParameterState } from '../stores/shared/LambdaParameterState.js';
import { LambdaParameterValuesEditor } from './shared/LambdaParameterValuesEditor.js';
import { VariableViewer } from './shared/QueryBuilderVariableSelector.js';
import { QUERY_BUILDER_TEST_ID } from '../__lib__/QueryBuilderTesting.js';
import { QUERY_BUILDER_DOCUMENTATION_KEY } from '../__lib__/QueryBuilderDocumentation.js';
import { useState } from 'react';
import {
  buildElementOption,
  getPackageableElementOptionFormatter,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';

type MultiplicityOption = { label: string; value: Multiplicity };

const buildMultiplicityOption = (
  multiplicity: Multiplicity,
): MultiplicityOption => ({
  label: getMultiplicityPrettyDescription(multiplicity),
  value: multiplicity,
});

const VariableExpressionEditor = observer(
  (props: {
    queryBuilderState: QueryBuilderState;
    lambdaParameterState: LambdaParameterState;
  }) => {
    // main state
    const { queryBuilderState, lambdaParameterState } = props;
    const applicationStore = useApplicationStore();
    const queryParametersState = queryBuilderState.parametersState;
    const allVariableNames = queryBuilderState.allVariableNames;
    const isCreating =
      !queryParametersState.parameterStates.includes(lambdaParameterState);
    const varState = lambdaParameterState.parameter;
    const multiplity = varState.multiplicity;

    // type
    const variableType =
      lambdaParameterState.variableType ?? PrimitiveType.STRING;
    const selectedType = buildElementOption(variableType);
    const selectedMultiplicity = buildMultiplicityOption(multiplity);
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
    const validParamMultiplicityList = [
      Multiplicity.ONE,
      Multiplicity.ZERO_ONE,
      Multiplicity.ZERO_MANY,
    ];
    const multilicityOptions: MultiplicityOption[] =
      validParamMultiplicityList.map(buildMultiplicityOption);
    const changeMultiplicity = (val: MultiplicityOption): void => {
      lambdaParameterState.changeMultiplicity(varState, val.value);
    };

    const parameterNameValue = varState.name;

    const [hasFailedValidation, setFailedValidation] = useState<boolean>(false);

    const getValidationMessage = (input: string): string | undefined => {
      const possibleMessage = !input
        ? `Parameter name can't be empty`
        : allVariableNames.filter((e) => e === input).length >
          (isCreating ? 0 : 1)
        ? 'Parameter name already exists'
        : (isCreating &&
            queryParametersState.parameterStates.find(
              (p) => p.parameter.name === input,
            )) ||
          (!isCreating &&
            queryParametersState.parameterStates.filter(
              (p) => p.parameter.name === input,
            ).length > 1)
        ? 'Parameter name already exists'
        : isValidIdentifier(input, true) === false
        ? 'Parameter name must be text with no spaces and not start with an uppercase letter or number'
        : undefined;

      setFailedValidation(possibleMessage !== undefined);

      return possibleMessage;
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
        <Modal
          darkMode={true}
          className="editor-modal query-builder__variables__modal"
        >
          <ModalHeader
            title={`${isCreating ? 'Create Parameter' : 'Update Parameter'}`}
          />
          <ModalBody className="query-builder__variables__modal__body">
            <PanelFormValidatedTextField
              name="Parameter Name"
              prompt="Name of the parameter. Should be descriptive of its purpose."
              value={parameterNameValue}
              validateInput={getValidationMessage}
              update={(value: string | undefined): void => {
                variableExpression_setName(varState, value ?? '');
              }}
              isReadOnly={false}
            />
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
                darkMode={
                  !applicationStore.layoutService
                    .TEMPORARY__isLightColorThemeEnabled
                }
                formatOptionLabel={getPackageableElementOptionFormatter({
                  darkMode:
                    !applicationStore.layoutService
                      .TEMPORARY__isLightColorThemeEnabled,
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
              <CustomSelectorInput
                placeholder="Choose a multiplicity..."
                options={multilicityOptions}
                onChange={changeMultiplicity}
                value={selectedMultiplicity}
                hasError={
                  !validParamMultiplicityList.includes(
                    selectedMultiplicity.value,
                  )
                }
                darkMode={
                  !applicationStore.layoutService
                    .TEMPORARY__isLightColorThemeEnabled
                }
              />
            </div>
          </ModalBody>
          <ModalFooter>
            {isCreating && (
              <ModalFooterButton
                text="Create"
                disabled={hasFailedValidation}
                onClick={onAction}
              />
            )}
            <ModalFooterButton onClick={close} text="Close" />
          </ModalFooter>
        </Modal>
      </Dialog>
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
    const seeDocumentation = (): void =>
      queryBuilderState.applicationStore.assistantService.openDocumentationEntry(
        QUERY_BUILDER_DOCUMENTATION_KEY.QUESTION_HOW_TO_ADD_PARAMETERS_TO_QUERY,
      );
    const addParameter = (): void => {
      if (!isReadOnly && !queryBuilderState.isParameterSupportDisabled) {
        const parmaterState = new LambdaParameterState(
          new VariableExpression(
            generateEnumerableNameFromToken(varNames, DEFAULT_VARIABLE_NAME),
            queryBuilderState.graphManagerState.graph.getMultiplicity(1, 1),
            GenericTypeExplicitReference.create(
              new GenericType(PrimitiveType.STRING),
            ),
          ),
          queryBuilderState.observerContext,
          queryBuilderState.graphManagerState.graph,
        );
        queryParameterState.setSelectedParameter(parmaterState);
        parmaterState.mockParameterValue();
      }
    };

    return (
      <div
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PARAMETERS}
        className="panel query-builder__variables"
      >
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">parameters</div>
            <div
              onClick={seeDocumentation}
              className="query-builder__variables__info"
              title={`Parameters are variables assigned to your query. They are dynamic in nature and can change for each execution.`}
            >
              <InfoCircleIcon />
            </div>
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
        <div className="panel__content query-builder__variables__content">
          {!queryBuilderState.isParameterSupportDisabled && (
            <>
              {Boolean(queryParameterState.parameterStates.length) &&
                queryParameterState.parameterStates.map((pState) => (
                  <VariableViewer
                    key={pState.uuid}
                    variable={pState.parameter}
                    isReadOnly={isReadOnly}
                    queryBuilderState={queryBuilderState}
                    actions={{
                      editVariable: () =>
                        queryParameterState.setSelectedParameter(pState),
                      deleteVariable: () =>
                        queryParameterState.removeParameter(pState),
                    }}
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
            graph={queryBuilderState.graphManagerState.graph}
            observerContext={queryBuilderState.observerContext}
            lambdaParametersState={queryParameterState}
          />
        )}
      </div>
    );
  },
);
