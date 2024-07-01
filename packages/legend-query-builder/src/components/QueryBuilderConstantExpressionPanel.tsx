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
  buildElementOption,
  getPackageableElementOptionFormatter,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';
import {
  BlankPanelPlaceholder,
  clsx,
  CustomSelectorInput,
  Dialog,
  InfoCircleIcon,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  PanelFormSection,
  PanelFormValidatedTextField,
  PlusIcon,
} from '@finos/legend-art';
import {
  type Type,
  type ValueSpecification,
  PrimitiveType,
  VariableExpression,
  Multiplicity,
  isValidIdentifier,
  InstanceValue,
} from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import type { QueryBuilderState } from '../stores/QueryBuilderState.js';
import {
  type QueryBuilderConstantExpressionState,
  QueryBuilderSimpleConstantExpressionState,
  QueryBuilderCalculatedConstantExpressionState,
  cloneQueryBuilderConstantLambdaEditorState,
} from '../stores/QueryBuilderConstantsState.js';
import {
  buildDefaultInstanceValue,
  cloneValueSpecification,
} from '../stores/shared/ValueSpecificationEditorHelper.js';
import { BasicValueSpecificationEditor } from './shared/BasicValueSpecificationEditor.js';
import { QUERY_BUILDER_TEST_ID } from '../__lib__/QueryBuilderTesting.js';
import { QUERY_BUILDER_DOCUMENTATION_KEY } from '../__lib__/QueryBuilderDocumentation.js';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { variableExpression_setName } from '../stores/shared/ValueSpecificationModifierHelper.js';
import { LambdaEditor } from './shared/LambdaEditor.js';
import { VariableViewer } from './shared/QueryBuilderVariableSelector.js';
import { flowResult } from 'mobx';
import { isValidInstanceValue } from '../stores/QueryBuilderValueSpecificationHelper.js';

const getConstantNameValidationMessage = (
  constantInput: string,
  allVariableNames: string[],
  currentConstantName: string,
): string | undefined =>
  !constantInput
    ? `Constant name can't be empty`
    : isValidIdentifier(constantInput) === false
      ? 'Constant name must be text with no spaces and not start with an uppercase letter or number'
      : allVariableNames.filter((e) => e === constantInput).length > 0 &&
          constantInput !== currentConstantName
        ? 'Constant name already exists'
        : undefined;

// NOTE: We currently only allow constant variables for primitive types of multiplicity ONE.
// This is why we don't show multiplicity in the editor.
const QueryBuilderSimpleConstantExpressionEditor = observer(
  (props: { constantState: QueryBuilderSimpleConstantExpressionState }) => {
    // Read current state
    const { constantState } = props;
    const varExpression = constantState.variable;
    const queryBuilderState = constantState.queryBuilderState;
    const applicationStore = queryBuilderState.applicationStore;
    const variableState = queryBuilderState.constantState;
    const allVariableNames = queryBuilderState.allVariableNames;
    const isCreating = !variableState.constants.includes(constantState);

    // Name
    const stateName = varExpression.name;
    const [selectedName, setSelectedName] = useState(stateName);
    const [isNameValid, setIsNameValid] = useState<boolean>(true);
    const [hasEditedName, setHasEditedName] = useState<boolean>(false);
    const handleNameInputRef = useCallback(
      (ref: HTMLInputElement | null): void => {
        ref?.focus();
      },
      [],
    );

    // Value
    const stateValue = constantState.value;
    const [selectedValue, setSelectedValue] = useState(
      cloneValueSpecification(stateValue, queryBuilderState.observerContext),
    );
    const [shouldFocusOnValue, setShouldFocusOnValue] =
      useState<boolean>(!isCreating);
    const handleValueInputRef = useCallback(
      (ref: HTMLInputElement | null): void => {
        if (shouldFocusOnValue) {
          ref?.focus();
          setShouldFocusOnValue(false);
        }
      },
      [shouldFocusOnValue],
    );

    // Type
    const stateType =
      constantState.value.genericType?.value.rawType ?? PrimitiveType.STRING;
    const [selectedType, setSelectedType] = useState(
      buildElementOption(stateType),
    );
    const changeType = (val: PackageableElementOption<Type>): void => {
      if (val.value !== selectedType.value) {
        setSelectedType(val);
        const newValSpec = buildDefaultInstanceValue(
          queryBuilderState.graphManagerState.graph,
          val.value,
          queryBuilderState.observerContext,
          queryBuilderState.INTERNAL__enableInitializingDefaultSimpleExpressionValue,
        );
        setSelectedValue(newValSpec);
      }
      setShouldFocusOnValue(true);
    };
    // Disabling binary, strict time, latest date, and byte as we
    // don't support these constant types
    const supportedPrimitiveTypes: PrimitiveType[] = [
      PrimitiveType.STRING,
      PrimitiveType.BOOLEAN,
      PrimitiveType.NUMBER,
      PrimitiveType.INTEGER,
      PrimitiveType.FLOAT,
      PrimitiveType.DECIMAL,
      PrimitiveType.DATE,
      PrimitiveType.STRICTDATE,
      PrimitiveType.DATETIME,
    ];
    const typeOptions: PackageableElementOption<Type>[] =
      queryBuilderState.graphManagerState.graph.primitiveTypes
        .filter((type) => supportedPrimitiveTypes.includes(type))
        .map(buildElementOption)
        .concat(
          queryBuilderState.graphManagerState.graph.enumerations.map(
            buildElementOption,
          ),
        );

    // Modal lifecycle actions
    const handleCancel = (): void => {
      variableState.setSelectedConstant(undefined);
    };

    const handleApply = (): void => {
      variableExpression_setName(varExpression, selectedName);
      constantState.changeValSpecType(selectedType.value);
      constantState.setValueSpec(selectedValue);
      if (isCreating) {
        variableState.addConstant(constantState);
      }
      handleCancel();
    };

    const resetConstantValue = (): void => {
      const valSpec = buildDefaultInstanceValue(
        queryBuilderState.graphManagerState.graph,
        selectedType.value,
        queryBuilderState.observerContext,
        queryBuilderState.INTERNAL__enableInitializingDefaultSimpleExpressionValue,
      );
      setSelectedValue(valSpec);
    };

    return (
      <Dialog
        open={Boolean(constantState)}
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
            title={`${isCreating ? 'Create Constant' : 'Update Constant'}`}
          />
          <ModalBody className="query-builder__variables__modal__body">
            <PanelFormValidatedTextField
              name="Constant Name"
              prompt="Name of constant. Should be descriptive of its purpose."
              update={(value: string | undefined): void => {
                setSelectedName(value ?? '');
                setHasEditedName(true);
              }}
              onBlur={() => setHasEditedName(true)}
              validate={(constantInput: string) =>
                !hasEditedName
                  ? undefined
                  : getConstantNameValidationMessage(
                      constantInput,
                      allVariableNames,
                      stateName,
                    )
              }
              onValidate={(issue: string | undefined) =>
                setIsNameValid(!issue && selectedName.length > 0)
              }
              value={selectedName}
              isReadOnly={false}
              ref={handleNameInputRef}
            />
            <PanelFormSection>
              <div className="panel__content__form__section__header__label">
                Type
              </div>
              <div className="panel__content__form__section__header__prompt">
                Data type of the constant.
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
            </PanelFormSection>
            <PanelFormSection>
              <div className="panel__content__form__section__header__label">
                Value
              </div>
              <div className="query-builder__variable-editor">
                <BasicValueSpecificationEditor
                  valueSpecification={selectedValue}
                  setValueSpecification={(val: ValueSpecification): void => {
                    setSelectedValue(
                      cloneValueSpecification(
                        val,
                        queryBuilderState.observerContext,
                      ),
                    );
                  }}
                  graph={queryBuilderState.graphManagerState.graph}
                  observerContext={queryBuilderState.observerContext}
                  typeCheckOption={{
                    expectedType: selectedType.value,
                    match: selectedType.value === PrimitiveType.DATETIME,
                  }}
                  resetValue={resetConstantValue}
                  ref={handleValueInputRef}
                />
              </div>
            </PanelFormSection>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              text={isCreating ? 'Create' : 'Apply'}
              disabled={
                !isNameValid ||
                (selectedValue instanceof InstanceValue &&
                  !isValidInstanceValue(selectedValue))
              }
              onClick={handleApply}
            />
            <ModalFooterButton
              text="Cancel"
              onClick={handleCancel}
              type="secondary"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

const QuerryBuilderCalculatedConstantExpressionEditor = observer(
  (props: { constantState: QueryBuilderCalculatedConstantExpressionState }) => {
    // Read current state
    const { constantState } = props;
    const queryBuilderState = constantState.queryBuilderState;
    const lambdaState = constantState.lambdaState;
    const applicationStore = queryBuilderState.applicationStore;
    const allVariableNames = queryBuilderState.allVariableNames;
    const stateName = constantState.variable.name;

    // Set up temporary state for modal lifecycle
    const [name, setName] = useState(stateName);
    const [isNameValid, setIsNameValid] = useState<boolean>(true);
    const lambdaStateCopy = useMemo(
      () => cloneQueryBuilderConstantLambdaEditorState(lambdaState),
      [lambdaState],
    );

    // Modal lifecycle actions
    const handleCancel = (): void => {
      queryBuilderState.constantState.setSelectedConstant(undefined);
    };

    const handleApply = (): void => {
      variableExpression_setName(constantState.variable, name);
      constantState.lambdaState = lambdaStateCopy;
      handleCancel();
    };

    useEffect(() => {
      flowResult(
        lambdaStateCopy.convertLambdaObjectToGrammarString({
          pretty: true,
        }),
      ).catch(applicationStore.alertUnhandledError);
    }, [applicationStore, lambdaStateCopy]);

    return (
      <Dialog
        open={true}
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
          className={clsx('editor-modal query-builder__constants__modal', {
            'query-builder__constants__modal--has-error': Boolean(
              lambdaStateCopy.parserError,
            ),
          })}
        >
          <ModalHeader>
            <div className="modal__title">Update Calculated Constants</div>
            {lambdaStateCopy.parserError && (
              <div className="modal__title__error-badge">
                Failed to parse query
              </div>
            )}
          </ModalHeader>
          <ModalBody>
            <div
              className={clsx('query-builder__constants__modal__content', {
                backdrop__element: Boolean(lambdaStateCopy.parserError),
              })}
            >
              <div className="query-builder__constants__modal__name">
                <PanelFormValidatedTextField
                  value={name}
                  isReadOnly={false}
                  className="query-builder__constants__modal__name__input input--dark"
                  placeholder="Constant Name"
                  update={(value: string | undefined): void => {
                    setName(value ?? '');
                  }}
                  validate={(constantInput: string) =>
                    getConstantNameValidationMessage(
                      constantInput,
                      allVariableNames,
                      stateName,
                    )
                  }
                  onValidate={(issue: string | undefined) =>
                    setIsNameValid(!issue)
                  }
                />
              </div>
              <LambdaEditor
                className="query-builder__constants__lambda-editor"
                disabled={
                  lambdaStateCopy.convertingLambdaToStringState.isInProgress
                }
                lambdaEditorState={lambdaStateCopy}
                forceBackdrop={false}
                autoFocus={true}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              className="btn btn--dark"
              onClick={handleApply}
              disabled={Boolean(lambdaStateCopy.parserError) || !isNameValid}
            >
              Apply
            </ModalFooterButton>
            <ModalFooterButton
              className="btn btn--dark"
              onClick={handleCancel}
              type="secondary"
            >
              Cancel
            </ModalFooterButton>
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

export const QueryBuilderConstantExpressionPanel = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const constantState = queryBuilderState.constantState;
    const graph = queryBuilderState.graphManagerState.graph;
    const isReadOnly = !queryBuilderState.isQuerySupported;
    const seeDocumentation = (): void =>
      queryBuilderState.applicationStore.assistantService.openDocumentationEntry(
        QUERY_BUILDER_DOCUMENTATION_KEY.QUESTION_HOW_TO_ADD_CONSTANTS_TO_QUERY,
      );
    const addConstant = (): void => {
      if (!isReadOnly) {
        const defaultVal = buildDefaultInstanceValue(
          graph,
          PrimitiveType.STRING,
          queryBuilderState.observerContext,
          queryBuilderState.INTERNAL__enableInitializingDefaultSimpleExpressionValue,
        );
        const variableEx = new VariableExpression('', Multiplicity.ONE);
        variableEx.genericType = defaultVal.genericType;
        const constState = new QueryBuilderSimpleConstantExpressionState(
          queryBuilderState,
          variableEx,
          defaultVal,
        );
        constantState.setSelectedConstant(constState);
      }
    };

    const renderConstantModal = (
      val: QueryBuilderConstantExpressionState,
    ): React.ReactNode => {
      if (val instanceof QueryBuilderSimpleConstantExpressionState) {
        return (
          <QueryBuilderSimpleConstantExpressionEditor constantState={val} />
        );
      } else if (val instanceof QueryBuilderCalculatedConstantExpressionState) {
        return (
          <QuerryBuilderCalculatedConstantExpressionEditor
            constantState={val}
          />
        );
      }
      return null;
    };

    const getExtraContextMenu = (
      val: QueryBuilderConstantExpressionState,
    ):
      | {
          key: string;
          label: string;
          handler: () => void;
        }[]
      | undefined => {
      if (val instanceof QueryBuilderSimpleConstantExpressionState) {
        return [
          {
            key: 'convert-to-derivation',
            label: 'Convert To Derivation',
            handler: () =>
              constantState.queryBuilderState.constantState.convertToCalculated(
                val,
              ),
          },
        ];
      }
      return undefined;
    };

    return (
      <div
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_CONSTANTS}
        className="panel query-builder__variables"
      >
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">constants</div>
            <div
              onClick={seeDocumentation}
              className="query-builder__variables__info"
              title={`Constants are static values set to a variable name that can be leveraged within your query. They remain the same for ALL executions`}
            >
              <InfoCircleIcon />
            </div>
          </div>
          {!isReadOnly && (
            <div className="panel__header__actions">
              <button
                className="panel__header__action"
                tabIndex={-1}
                onClick={addConstant}
                title="Add Constant"
              >
                <PlusIcon />
              </button>
            </div>
          )}
        </div>
        <div className="panel__content query-builder__variables__content">
          <>
            {Boolean(queryBuilderState.constantState.constants) &&
              queryBuilderState.constantState.constants.map((constState) => (
                <VariableViewer
                  key={constState.uuid}
                  queryBuilderState={queryBuilderState}
                  variable={constState.variable}
                  value={{
                    val:
                      constState instanceof
                      QueryBuilderSimpleConstantExpressionState
                        ? constState.value
                        : undefined,
                  }}
                  actions={{
                    editVariable: () =>
                      constantState.setSelectedConstant(constState),
                    deleteVariable: () =>
                      constantState.removeConstant(constState),
                  }}
                  extraContextMenuActions={getExtraContextMenu(constState)}
                  isReadOnly={isReadOnly}
                />
              ))}
            {!constantState.constants.length && (
              <BlankPanelPlaceholder
                text="Add a Constant"
                disabled={isReadOnly}
                onClick={addConstant}
                clickActionType="add"
                previewText="No constants"
                tooltipText="Click to add a new constant"
              />
            )}
          </>
        </div>
        {constantState.selectedConstant &&
          renderConstantModal(constantState.selectedConstant)}
      </div>
    );
  },
);
