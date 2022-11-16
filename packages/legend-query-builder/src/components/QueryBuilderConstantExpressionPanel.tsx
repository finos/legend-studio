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
  type PackageableElementOption,
  buildElementOption,
  getPackageableElementOptionFormatter,
} from '@finos/legend-application';
import {
  BlankPanelPlaceholder,
  CustomSelectorInput,
  Dialog,
  InfoCircleIcon,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PanelFormSection,
  PanelFormTextField,
  PlusIcon,
} from '@finos/legend-art';
import {
  type Type,
  type ValueSpecification,
  PrimitiveType,
  VariableExpression,
  Multiplicity,
} from '@finos/legend-graph';
import { generateEnumerableNameFromToken } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { DEFAULT_CONSTANT_VARIABLE_NAME } from '../stores/QueryBuilderConfig.js';
import type { QueryBuilderState } from '../stores/QueryBuilderState.js';
import { QueryBuilderConstantExpressionState } from '../stores/QueryBuilderConstantsState.js';
import { buildDefaultInstanceValue } from '../stores/shared/ValueSpecificationEditorHelper.js';
import { variableExpression_setName } from '../stores/shared/ValueSpecificationModifierHelper.js';
import { BasicValueSpecificationEditor } from './shared/BasicValueSpecificationEditor.js';
import { VariableViewer } from './shared/QueryBuilderVariableSelector.js';

// Note: We currently only allow constant variables for primitive types of multiplicity ONE.
// This is why we don't show multiplicity in the editor.
const QueryBuilderConstantExpressionEditor = observer(
  (props: { constantState: QueryBuilderConstantExpressionState }) => {
    const { constantState } = props;
    const queryBuilderState = constantState.queryBuilderState;
    const applicationStore = queryBuilderState.applicationStore;
    const variableState = queryBuilderState.constantState;
    const varExpression = constantState.variable;
    const variableName = varExpression.name;
    const allVariableNames = queryBuilderState.allVariableNames;
    const isCreating = !variableState.constants.includes(constantState);
    const valueSpec = constantState.value;
    const variableType =
      constantState.value.genericType?.value.rawType ?? PrimitiveType.STRING;
    const selectedType = buildElementOption(variableType);
    const close = (): void => {
      variableState.setSelectedConstant(undefined);
    };
    const changeType = (val: PackageableElementOption<Type>): void => {
      if (variableType !== val.value) {
        constantState.changeValSpecType(val.value);
      }
    };
    const typeOptions: PackageableElementOption<Type>[] =
      queryBuilderState.graphManagerState.graph.primitiveTypes
        .map(buildElementOption)
        .concat(
          queryBuilderState.graphManagerState.graph.enumerations.map(
            buildElementOption,
          ),
        );
    const validationMessage = !variableName
      ? `Constant Name can't be empty`
      : allVariableNames.filter((e) => e === variableName).length >
        (isCreating ? 0 : 1)
      ? 'Constant Name Already Exists'
      : undefined;
    const onAction = (): void => {
      if (isCreating) {
        variableState.addConstant(constantState);
      }
      close();
    };
    const resetConstantValue = (): void => {
      const valSpec = buildDefaultInstanceValue(
        queryBuilderState.graphManagerState.graph,
        variableType,
      );
      constantState.setValueSpec(valSpec);
    };

    return (
      <Dialog
        open={Boolean(constantState)}
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
            title={`${isCreating ? 'Create Constant' : 'Update Constant'}`}
          />
          <ModalBody className="query-builder__variables__modal__body">
            <PanelFormTextField
              name="Constant Name"
              prompt="Name of constant. Should be descriptive of its purpose."
              update={(value: string | undefined): void =>
                variableExpression_setName(varExpression, value ?? '')
              }
              value={varExpression.name}
              errorMessage={validationMessage}
              isReadOnly={false}
            />
            <PanelFormSection>
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
            </PanelFormSection>
            <PanelFormSection>
              <div className="panel__content__form__section__header__label">
                Value
              </div>
              <div className="query-builder__variable-editor">
                <BasicValueSpecificationEditor
                  valueSpecification={valueSpec}
                  setValueSpecification={(val: ValueSpecification): void => {
                    constantState.setValueSpec(val);
                  }}
                  graph={queryBuilderState.graphManagerState.graph}
                  obseverContext={queryBuilderState.observableContext}
                  typeCheckOption={{
                    expectedType: variableType,
                    match: variableType === PrimitiveType.DATETIME,
                  }}
                  resetValue={resetConstantValue}
                />
              </div>
            </PanelFormSection>
          </ModalBody>
          <ModalFooter>
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
    const varNames = queryBuilderState.allVariableNames;
    const addConstant = (): void => {
      if (!isReadOnly) {
        const defaultVal = buildDefaultInstanceValue(
          graph,
          PrimitiveType.STRING,
        );
        const constantName = generateEnumerableNameFromToken(
          varNames,
          DEFAULT_CONSTANT_VARIABLE_NAME,
        );
        const variableEx = new VariableExpression(
          constantName,
          Multiplicity.ONE,
        );
        variableEx.genericType = defaultVal.genericType;
        const constState = new QueryBuilderConstantExpressionState(
          queryBuilderState,
          variableEx,
          defaultVal,
        );
        constantState.setSelectedConstant(constState);
      }
    };

    return (
      <div className="panel query-builder__variables">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">constants</div>
            <div
              className="service-editor__pattern__parameters__header__info"
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
                  constantValue={constState.value}
                  actions={{
                    editVariable: () =>
                      constantState.setSelectedConstant(constState),
                    deleteVariable: () =>
                      constantState.removeConstant(constState),
                  }}
                  isReadOnly={isReadOnly}
                />
              ))}
            {!constantState.constants.length && (
              <BlankPanelPlaceholder
                text="Add a Constants"
                disabled={isReadOnly}
                onClick={addConstant}
                clickActionType="add"
                previewText="No constants"
                tooltipText="Click to add a new constant"
              />
            )}
          </>
        </div>
        {constantState.selectedConstant && (
          <QueryBuilderConstantExpressionEditor
            constantState={constantState.selectedConstant}
          />
        )}
      </div>
    );
  },
);
