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
import {
  type UMLEditorElementDropTarget,
  type ElementDragSource,
  CORE_DND_TYPE,
  useEditorStore,
} from '@finos/legend-application-studio';
import {
  DATA_QUALITY_RELATION_VALIDATION_EDITOR_TAB,
  DataQualityRelationValidationConfigurationState,
} from './states/DataQualityRelationValidationConfigurationState.js';
import React, { useCallback, useEffect } from 'react';
import {
  clsx,
  DragPreviewLayer,
  Panel,
  PanelContent,
  PanelLoadingIndicator,
  PlusIcon,
} from '@finos/legend-art';
import { prettyCONSTName } from '@finos/legend-shared';
import { LambdaEditor } from '@finos/legend-query-builder';
import {
  type RawVariableExpression,
  PrimitiveType,
  stub_RawLambda,
  stub_RawVariableExpression,
  Type,
} from '@finos/legend-graph';
import {
  useApplicationNavigationContext,
  useApplicationStore,
} from '@finos/legend-application';
import {
  dataQualityRelationValidation_addParameter,
  dataQualityRelationValidation_addValidation,
  dataQualityRelationValidation_deleteParameter,
  dataQualityRelationValidation_deleteValidation,
} from '../graph-manager/DSL_DataQuality_GraphModifierHelper.js';
import { flowResult } from 'mobx';
import {
  type RelationValidationDragSource,
  DataQualityRelationValidationEditor,
  RELATION_VALIDATION_DND_TYPE,
} from './DataQualityRelationValidationEditor.js';
import { DataQualityRelationValidation } from '../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';
import { DataQualityRelationTrialRuns } from './DataQualityRelationTrialRuns.js';
import {
  type FunctionParameterDragSource,
  DataQualityValidationParametersEditor,
  FUNCTION_PARAMETER_DND_TYPE,
} from './DataQualityValidationParametersEditor.js';
import { useDrop } from 'react-dnd';

const RelationDefinitionEditor = observer(
  (props: {
    dataQualityRelationValidationState: DataQualityRelationValidationConfigurationState;
  }) => {
    const { dataQualityRelationValidationState } = props;
    const { relationFunctionDefinitionEditorState, resultState } =
      dataQualityRelationValidationState;
    const validationElement =
      dataQualityRelationValidationState.validationElement;

    const isReadOnly = dataQualityRelationValidationState.isReadOnly;

    const addRelationValidation = (): void => {
      const relationValidation = new DataQualityRelationValidation(
        '',
        stub_RawLambda(),
      );
      dataQualityRelationValidation_addValidation(
        validationElement,
        relationValidation,
      );
      dataQualityRelationValidationState.addValidationState(relationValidation);
    };

    const deleteRelationValidation =
      (validation: DataQualityRelationValidation): (() => void) =>
      (): void => {
        dataQualityRelationValidation_deleteValidation(
          validationElement,
          validation,
        );
        dataQualityRelationValidationState.deleteValidationState(validation);
      };

    const addParameter = (): void => {
      dataQualityRelationValidation_addParameter(
        validationElement.query.parameters,
        stub_RawVariableExpression(PrimitiveType.STRING),
      );
    };

    const deleteParameter =
      (val: RawVariableExpression): (() => void) =>
      (): void => {
        dataQualityRelationValidation_deleteParameter(
          validationElement.query.parameters,
          val,
        );
      };

    const handleDropParameter = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        if (!isReadOnly && item.data.packageableElement instanceof Type) {
          dataQualityRelationValidation_addParameter(
            validationElement.query.parameters,
            stub_RawVariableExpression(item.data.packageableElement),
          );
        }
      },
      [validationElement, isReadOnly],
    );
    const [{ isParameterDragOver }, dropParameterRef] = useDrop<
      ElementDragSource,
      void,
      { isParameterDragOver: boolean }
    >(
      () => ({
        accept: [
          CORE_DND_TYPE.PROJECT_EXPLORER_CLASS,
          CORE_DND_TYPE.PROJECT_EXPLORER_ENUMERATION,
        ],
        drop: (item) => handleDropParameter(item),
        collect: (monitor) => ({
          isParameterDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDropParameter],
    );

    return (
      <>
        <PanelLoadingIndicator
          isLoading={
            resultState.isGeneratingPlan ||
            dataQualityRelationValidationState.isRunningFunc
          }
        />
        <div className="relation-validation-config-editor__definition">
          <div className="relation-validation-config-editor__definition__item">
            <div className="relation-validation-config-editor__definition__item__header">
              <div className="relation-validation-config-editor__definition__item__header__title">
                PARAMETERS
              </div>
              <button
                className="relation-validation-config-editor__definition__item__header__add-btn btn--dark"
                disabled={isReadOnly}
                onClick={addParameter}
                tabIndex={-1}
                title="Add Parameter"
              >
                <PlusIcon />
              </button>
            </div>
            <DragPreviewLayer
              labelGetter={(item: FunctionParameterDragSource): string =>
                item.parameter.name === '' ? '(unknown)' : item.parameter.name
              }
              types={[FUNCTION_PARAMETER_DND_TYPE]}
            />
            <div
              ref={dropParameterRef}
              className={clsx(
                'relation-validation-config-editor__definition__item__content',
                {
                  'panel__content__lists--dnd-over':
                    isParameterDragOver && !isReadOnly,
                },
              )}
            >
              {validationElement.query.parameters.map((param) => (
                <DataQualityValidationParametersEditor
                  key={param._UUID}
                  parameter={param}
                  _validationConfig={validationElement}
                  deleteParameter={deleteParameter(param)}
                  isReadOnly={isReadOnly}
                />
              ))}
              {validationElement.query.parameters.length === 0 && (
                <div className="relation-validation-config-editor__definition__item__content--empty">
                  No parameters
                </div>
              )}
            </div>
          </div>
          <div className="relation-validation-config-editor__definition__item">
            <div className="relation-validation-config-editor__definition__item__header">
              <div className="relation-validation-config-editor__definition__item__header__title">
                LAMBDA
              </div>
            </div>
            <div
              className={clsx(
                'relation-validation-config-editor__definition__item__content',
                {
                  backdrop__element: Boolean(
                    relationFunctionDefinitionEditorState.parserError,
                  ),
                },
              )}
            >
              <LambdaEditor
                className="relation-validation-config-editor__definition__lambda-editor lambda-editor--dark"
                disabled={
                  relationFunctionDefinitionEditorState.isConvertingFunctionBodyToString ||
                  false
                }
                lambdaEditorState={relationFunctionDefinitionEditorState}
                forceBackdrop={false}
                autoFocus={true}
              />
            </div>
          </div>
          <div className="relation-validation-config-editor__definition__item">
            <div className="relation-validation-config-editor__definition__item__header">
              <div className="relation-validation-config-editor__definition__item__header__title">
                VALIDATIONS
              </div>
              <button
                className="relation-validation-config-editor__definition__item__header__add-btn btn--dark"
                disabled={isReadOnly}
                onClick={addRelationValidation}
                tabIndex={-1}
                title="Add Relation Validation"
              >
                <PlusIcon />
              </button>
            </div>
            <div className="relation-config-validations">
              <DragPreviewLayer
                labelGetter={(item: RelationValidationDragSource): string =>
                  item.validation.name === ''
                    ? '(unknown)'
                    : item.validation.name
                }
                types={[RELATION_VALIDATION_DND_TYPE]}
              />
              {validationElement.validations.map((relationValidation) => (
                <DataQualityRelationValidationEditor
                  key={relationValidation._UUID}
                  validation={relationValidation}
                  relationValidationConfigurationState={
                    dataQualityRelationValidationState
                  }
                  deleteValidation={deleteRelationValidation(
                    relationValidation,
                  )}
                  isReadOnly={isReadOnly}
                />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  },
);

export const DataQualityRelationValidationConfigurationEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const dataQualityRelationValidationConfigurationState =
    editorStore.tabManagerState.getCurrentEditorState(
      DataQualityRelationValidationConfigurationState,
    );
  const dataQualityRelationValidationElement =
    dataQualityRelationValidationConfigurationState.validationElement;
  const selectedTab =
    dataQualityRelationValidationConfigurationState.selectedTab;

  const changeTab =
    (tab: DATA_QUALITY_RELATION_VALIDATION_EDITOR_TAB): (() => void) =>
    (): void =>
      dataQualityRelationValidationConfigurationState.setSelectedTab(tab);

  useEffect(() => {
    flowResult(
      dataQualityRelationValidationConfigurationState.relationFunctionDefinitionEditorState.convertLambdaObjectToGrammarString(
        {
          pretty: true,
          firstLoad: true,
        },
      ),
    ).catch(applicationStore.alertUnhandledError);
    flowResult(
      dataQualityRelationValidationConfigurationState.convertValidationLambdaObjects(),
    ).catch(applicationStore.alertUnhandledError);
  }, [applicationStore, dataQualityRelationValidationConfigurationState]);

  useApplicationNavigationContext('studio.editor.dq-relation-editor');

  return (
    <div className="relation-validation-config-editor uml-editor uml-editor--dark">
      <Panel>
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">
              dataQualityRelationValidation
            </div>
            <div className="panel__header__title__content">
              {dataQualityRelationValidationElement.name}
            </div>
          </div>
        </div>
        <div className="panel__header relation-validation-config-editor__tabs__header">
          <div className="relation-validation-config-editor__tabs">
            {Object.values(DATA_QUALITY_RELATION_VALIDATION_EDITOR_TAB).map(
              (tab) => (
                <div
                  key={tab}
                  onClick={changeTab(tab)}
                  className={clsx('relation-validation-config-editor__tab', {
                    'relation-validation-config-editor__tab--active':
                      tab === selectedTab,
                  })}
                >
                  {prettyCONSTName(tab)}
                </div>
              ),
            )}
          </div>
        </div>
        <PanelContent>
          {selectedTab ===
            DATA_QUALITY_RELATION_VALIDATION_EDITOR_TAB.DEFINITION && (
            <RelationDefinitionEditor
              dataQualityRelationValidationState={
                dataQualityRelationValidationConfigurationState
              }
            />
          )}
          {selectedTab ===
            DATA_QUALITY_RELATION_VALIDATION_EDITOR_TAB.TRIAL_RUN && (
            <DataQualityRelationTrialRuns
              dataQualityRelationValidationConfigurationState={
                dataQualityRelationValidationConfigurationState
              }
            />
          )}
        </PanelContent>
      </Panel>
    </div>
  );
});
