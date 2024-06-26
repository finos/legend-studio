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
  ModalFooterButton,
  PanelFormValidatedTextField,
  QuestionCircleIcon,
  PanelFormSection,
} from '@finos/legend-art';
import {
  type Type,
  type ValueSpecification,
  VariableExpression,
  GenericTypeExplicitReference,
  GenericType,
  PrimitiveType,
  Multiplicity,
  getMultiplicityPrettyDescription,
  isValidIdentifier,
} from '@finos/legend-graph';
import { useApplicationStore } from '@finos/legend-application';
import { variableExpression_setName } from '../stores/shared/ValueSpecificationModifierHelper.js';
import { LambdaParameterState } from '../stores/shared/LambdaParameterState.js';
import { LambdaParameterValuesEditor } from './shared/LambdaParameterValuesEditor.js';
import { VariableViewer } from './shared/QueryBuilderVariableSelector.js';
import { QUERY_BUILDER_TEST_ID } from '../__lib__/QueryBuilderTesting.js';
import { QUERY_BUILDER_DOCUMENTATION_KEY } from '../__lib__/QueryBuilderDocumentation.js';
import { useCallback, useState } from 'react';
import {
  buildElementOption,
  getPackageableElementOptionFormatter,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';
import { deepClone } from '@finos/legend-shared';
import { BasicValueSpecificationEditor } from './shared/BasicValueSpecificationEditor.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../graph/QueryBuilderMetaModelConst.js';
import { createSupportedFunctionExpression } from '../stores/shared/ValueSpecificationEditorHelper.js';

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

    // type
    const stateType = lambdaParameterState.variableType ?? PrimitiveType.STRING;
    const [selectedType, setSelectedType] = useState(
      buildElementOption(stateType),
    );
    const typeOptions: PackageableElementOption<Type>[] =
      queryBuilderState.graphManagerState.graph.primitiveTypes
        .map(buildElementOption)
        .concat(
          queryBuilderState.graphManagerState.graph.enumerations.map(
            buildElementOption,
          ),
        );
    const changeType = (val: PackageableElementOption<Type>): void => {
      setSelectedType(val);
    };

    // multiplicity
    const stateMultiplicity = varState.multiplicity;
    const [selectedMultiplicity, setSelectedMultiplicity] = useState(
      buildMultiplicityOption(stateMultiplicity),
    );
    const validParamMultiplicityList = [
      Multiplicity.ONE,
      Multiplicity.ZERO_ONE,
      Multiplicity.ZERO_MANY,
    ];
    const multilicityOptions: MultiplicityOption[] =
      validParamMultiplicityList.map(buildMultiplicityOption);
    const changeMultiplicity = (val: MultiplicityOption): void => {
      setSelectedMultiplicity(val);
    };

    // name
    const stateName = varState.name;
    const [selectedName, setSelectedName] = useState(stateName);
    const [isNameValid, setIsNameValid] = useState<boolean>(true);
    const [hasEditedName, setHasEditedName] = useState<boolean>(false);
    const nameInputRef = useCallback((ref: HTMLInputElement | null): void => {
      ref?.focus();
    }, []);
    const [defaultMilestoningValue, setDefaultMilestoningValue] = useState(
      deepClone(lambdaParameterState.value),
    );
    const isMilestoningParameter =
      queryBuilderState.milestoningState.isMilestoningParameter(
        lambdaParameterState.parameter,
      );

    const getValidationMessage = (input: string): string | undefined =>
      !hasEditedName
        ? undefined
        : !input
          ? `Parameter name can't be empty`
          : allVariableNames.filter((e) => e === input).length > 0 &&
              input !== stateName
            ? 'Parameter name already exists'
            : isValidIdentifier(input, true) === false
              ? 'Parameter name must be text with no spaces and not start with an uppercase letter or number'
              : undefined;

    // modal lifecycle actions
    const handleCancel = (): void => {
      queryParametersState.setSelectedParameter(undefined);
    };

    const handleApply = (): void => {
      lambdaParameterState.changeVariableType(selectedType.value);
      lambdaParameterState.changeMultiplicity(
        varState,
        selectedMultiplicity.value,
      );
      variableExpression_setName(varState, selectedName);
      if (isCreating) {
        queryParametersState.addParameter(lambdaParameterState);
      }
      if (isMilestoningParameter) {
        queryBuilderState.milestoningState.updateMilestoningParameterValue(
          lambdaParameterState.parameter,
          defaultMilestoningValue,
        );
      }

      handleCancel();
    };

    return (
      <Dialog
        open={Boolean(lambdaParameterState)}
        onClose={handleCancel}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className="editor-modal query-builder__variables__modal"
        >
          <ModalHeader
            title={`${isCreating ? 'Create Parameter' : 'Update Parameter'}`}
          />
          <ModalBody className="query-builder__variables__modal__body">
            <PanelFormValidatedTextField
              name="Parameter Name"
              prompt="Name of the parameter. Should be descriptive of its purpose."
              value={selectedName}
              update={(value: string | undefined): void => {
                setSelectedName(value ?? '');
                setHasEditedName(true);
              }}
              validate={getValidationMessage}
              onValidate={(issue: string | undefined) =>
                setIsNameValid(!issue && selectedName.length > 0)
              }
              isReadOnly={false}
              ref={nameInputRef}
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
            {isMilestoningParameter && defaultMilestoningValue && (
              <PanelFormSection>
                <div className="panel__content__form__section__header__label">
                  Value
                </div>
                <div className="panel__content__form__section__header__prompt">
                  Choose a default value for this milestoning parameter
                </div>
                <div className="query-builder__variable-editor">
                  <BasicValueSpecificationEditor
                    valueSpecification={defaultMilestoningValue}
                    setValueSpecification={(val: ValueSpecification): void => {
                      setDefaultMilestoningValue(deepClone(val));
                    }}
                    graph={queryBuilderState.graphManagerState.graph}
                    observerContext={queryBuilderState.observerContext}
                    typeCheckOption={{
                      expectedType: selectedType.value,
                      match: selectedType.value === PrimitiveType.DATETIME,
                    }}
                    resetValue={() => {
                      const now = createSupportedFunctionExpression(
                        QUERY_BUILDER_SUPPORTED_FUNCTIONS.NOW,
                        PrimitiveType.DATETIME,
                      );
                      setDefaultMilestoningValue(now);
                      queryBuilderState.milestoningState.updateMilestoningParameterValue(
                        lambdaParameterState.parameter,
                        now,
                      );
                    }}
                  />
                </div>
              </PanelFormSection>
            )}
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              text={isCreating ? 'Create' : 'Update'}
              disabled={!isNameValid}
              onClick={handleApply}
            />
            <ModalFooterButton
              onClick={handleCancel}
              text="Cancel"
              type="secondary"
            />
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
    const seeDocumentation = (): void =>
      queryBuilderState.applicationStore.assistantService.openDocumentationEntry(
        QUERY_BUILDER_DOCUMENTATION_KEY.QUESTION_HOW_TO_ADD_PARAMETERS_TO_QUERY,
      );
    const addParameter = (): void => {
      if (!isReadOnly && !queryBuilderState.isParameterSupportDisabled) {
        const parmaterState = new LambdaParameterState(
          new VariableExpression(
            '',
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
              <QuestionCircleIcon />
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
