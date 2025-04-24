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

import { useCallback, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import {
  type SelectOption,
  CustomSelectorInput,
  FilledWindowMaximizeIcon,
  PanelDnDEntry,
  PanelEntryDragHandle,
  RocketIcon,
  TimesIcon,
  useDragPreviewLayer,
  clsx,
} from '@finos/legend-art';
import { flowResult } from 'mobx';
import { PrimitiveType } from '@finos/legend-graph';
import {
  ApplicationNavigationContextData,
  useApplicationStore,
} from '@finos/legend-application';
import { InlineLambdaEditor } from '@finos/legend-query-builder';
import {
  type DataQualityRelationValidationConfigurationState,
  DATA_QUALITY_RELATION_VALIDATION_EDITOR_TAB,
} from './states/DataQualityRelationValidationConfigurationState.js';
import type { DataQualityRelationValidation } from '../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';
import {
  dataQualityRelationValidation_setDescription,
  dataQualityRelationValidation_setName,
  dataQualityRelationValidation_swapValidations,
} from '../graph-manager/DSL_DataQuality_GraphModifierHelper.js';
import { DataQualityValidationDetailPanel } from './DataQualityValidationDetailPanel.js';
import { useDrag, useDrop } from 'react-dnd';
import { DSL_DATA_QUALITY_LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../__lib__/studio/DSL_DataQuality_LegendStudioApplicationNavigationContext.js';

export type RelationValidationDragSource = {
  validation: DataQualityRelationValidation;
};
export const RELATION_VALIDATION_DND_TYPE = 'RELATION_VALIDATION';

export const DataQualityRelationValidationEditor = observer(
  (props: {
    relationValidationConfigurationState: DataQualityRelationValidationConfigurationState;
    validation: DataQualityRelationValidation;
    deleteValidation: () => void;
    isReadOnly: boolean;
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    const handleRef = useRef<HTMLDivElement>(null);

    const {
      validation,
      deleteValidation,
      relationValidationConfigurationState,
      isReadOnly,
    } = props;
    const applicationStore = useApplicationStore();
    const hasParserError =
      relationValidationConfigurationState.validationStates.some((state) =>
        Boolean(state.parserError),
      );
    const validationState =
      relationValidationConfigurationState.getValidationState(validation);

    const changeName: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      dataQualityRelationValidation_setName(validation, event.target.value);

    const changeDescription: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) =>
      dataQualityRelationValidation_setDescription(
        validation,
        event.target.value,
      );

    const handleHover = useCallback(
      (item: RelationValidationDragSource): void => {
        const draggingProperty = item.validation;
        const hoveredProperty = validation;
        dataQualityRelationValidation_swapValidations(
          relationValidationConfigurationState.validationElement,
          draggingProperty,
          hoveredProperty,
        );
      },
      [relationValidationConfigurationState.validationElement, validation],
    );

    const [{ isBeingDraggedValidation }, dropConnector] = useDrop<
      RelationValidationDragSource,
      void,
      { isBeingDraggedValidation: DataQualityRelationValidation | undefined }
    >(
      () => ({
        accept: [RELATION_VALIDATION_DND_TYPE],
        hover: (item) => handleHover(item),
        collect: (
          monitor,
        ): {
          isBeingDraggedValidation: DataQualityRelationValidation | undefined;
        } => ({
          isBeingDraggedValidation:
            monitor.getItem<RelationValidationDragSource | null>()?.validation,
        }),
      }),
      [handleHover],
    );
    const isBeingDragged = validation === isBeingDraggedValidation;

    const [, dragConnector, dragPreviewConnector] =
      useDrag<RelationValidationDragSource>(
        () => ({
          type: RELATION_VALIDATION_DND_TYPE,
          item: () => ({
            validation: validation,
          }),
        }),
        [validation],
      );
    dragConnector(handleRef);
    dropConnector(ref);
    useDragPreviewLayer(dragPreviewConnector);

    // Actions
    const onLambdaEditorFocus = (isAssertion: boolean): void =>
      applicationStore.navigationContextService.push(
        ApplicationNavigationContextData.createTransient(
          DSL_DATA_QUALITY_LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.VALIDATION_ASSERTION_EDITOR,
        ),
      );

    const remove = applicationStore.guardUnhandledError(async () => {
      await flowResult(
        validationState.convertLambdaObjectToGrammarString({ pretty: false }),
      );
      deleteValidation();
    });

    const runQuery = (): void => {
      relationValidationConfigurationState.setSelectedTab(
        DATA_QUALITY_RELATION_VALIDATION_EDITOR_TAB.TRIAL_RUN,
      );
      if (
        !relationValidationConfigurationState.resultState.isRunningValidation
      ) {
        relationValidationConfigurationState.resetResultState();
        relationValidationConfigurationState.resultState.setValidationToRun(
          validation,
        );
        relationValidationConfigurationState.resultState.handleRunValidation();
      }
    };

    const onValidationTypeChange = (val: SelectOption): void => {
      validationState.onValidationTypeChange(val);
    };

    const selectedValidationType = {
      label: validation.type,
      value: validation.type,
    };

    const openValidationDialog = () => {
      validationState.setIsValidationDialogOpen(true);
    };

    return (
      <PanelDnDEntry
        ref={ref}
        placeholder={<div className="uml-element-editor__dnd__placeholder" />}
        className="relation-validation__container"
        showPlaceholder={isBeingDragged}
      >
        <div
          className={clsx('relation-validation', {
            backdrop__element: validationState.parserError,
          })}
        >
          <div className="relation-validation__content">
            <PanelEntryDragHandle
              dragSourceConnector={handleRef}
              isDragging={isBeingDragged}
            />
            <input
              className="relation-validation__content__name"
              spellCheck={false}
              disabled={isReadOnly}
              value={validation.name}
              onChange={changeName}
              placeholder="Validation name"
            />
            <CustomSelectorInput
              options={
                relationValidationConfigurationState.relationValidationOptions
              }
              onChange={onValidationTypeChange}
              value={selectedValidationType}
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
              placeholder={'Type of validation to be added'}
            />
            {!isReadOnly && (
              <button
                className="uml-element-editor__remove-btn"
                onClick={remove}
                tabIndex={-1}
                title="Remove"
              >
                <TimesIcon />
              </button>
            )}
            <button
              className="uml-element-editor__remove-btn"
              onClick={runQuery}
              tabIndex={-1}
              title="Run Validation"
              disabled={hasParserError}
            >
              <RocketIcon />
            </button>
            <button
              className="uml-element-editor__remove-btn"
              onClick={openValidationDialog}
              tabIndex={-1}
              title="Open Validation Details dialog"
            >
              <FilledWindowMaximizeIcon />
            </button>
          </div>
          <div className="data-quality-uml-element-editor__lambda">
            <div className="data-quality-uml-element-editor__lambda__label">
              Assertion
            </div>
            <div className="data-quality-uml-element-editor__lambda__value">
              <InlineLambdaEditor
                disabled={
                  relationValidationConfigurationState.isConvertingValidationLambdaObjects ||
                  isReadOnly
                }
                lambdaEditorState={validationState}
                forceBackdrop={hasParserError}
                expectedType={PrimitiveType.BOOLEAN}
                onEditorFocus={() => onLambdaEditorFocus(true)}
                disablePopUp={true}
                className="relation-validation__lambda"
              />
            </div>
          </div>
        </div>
        {validationState.isValidationDialogOpen && (
          <DataQualityValidationDetailPanel
            dataQualityRelationValidationState={
              relationValidationConfigurationState
            }
            isReadOnly={isReadOnly}
            relationValidationState={validationState}
            changeName={changeName}
            changeDescription={changeDescription}
            onLambdaEditorFocus={onLambdaEditorFocus}
            forceBackdrop={hasParserError}
            onValidationTypeChange={onValidationTypeChange}
            selectedValidationType={selectedValidationType}
          />
        )}
      </PanelDnDEntry>
    );
  },
);
