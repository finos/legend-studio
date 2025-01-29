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
  type SelectOption,
  clsx,
  CustomSelectorInput,
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { PrimitiveType } from '@finos/legend-graph';
import type { DataQualityRelationValidationConfigurationState } from './states/DataQualityRelationValidationConfigurationState.js';
import type { DataQualityRelationValidationState } from './states/DataQualityRelationValidationState.js';
import { InlineLambdaEditor } from '@finos/legend-query-builder';
import type { RelationValidationType } from '../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';

export const DataQualityValidationDetailPanel = observer(
  (props: {
    dataQualityRelationValidationState: DataQualityRelationValidationConfigurationState;
    isReadOnly: boolean;
    relationValidationState: DataQualityRelationValidationState;
    changeName: React.ChangeEventHandler<HTMLInputElement>;
    changeDescription: React.ChangeEventHandler<HTMLInputElement>;
    onLambdaEditorFocus: (isAssertion: boolean) => void;
    onValidationTypeChange: (val: SelectOption) => void;
    selectedValidationType: {
      label: RelationValidationType;
      value: RelationValidationType;
    };
    forceBackdrop: boolean;
  }) => {
    const {
      dataQualityRelationValidationState,
      isReadOnly,
      relationValidationState,
      changeName,
      onLambdaEditorFocus,
      forceBackdrop,
      onValidationTypeChange,
      selectedValidationType,
      changeDescription,
    } = props;
    const {
      editorStore: { applicationStore },
    } = dataQualityRelationValidationState;
    const { relationValidation } = relationValidationState;
    const closePlanViewer = () => {
      relationValidationState.setIsValidationDialogOpen(false);
    };

    return (
      <Dialog
        open={true}
        classes={{
          root: 'relation-validation-dialog-modal__root-container',
          container: 'relation-validation-dialog-modal__container',
          paper: 'relation-validation-dialog-modal__content',
        }}
      >
        <Modal
          className="relation-validation-dialog-modal"
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        >
          <ModalHeader title="Validation Details" />
          <ModalBody className="relation-validation-dialog-modal__body">
            <div
              className={clsx('relation-validation-editor', {
                backdrop__element: relationValidationState.parserError,
              })}
            >
              <div className="relation-validation-editor__content">
                <div className="relation-validation-editor__label">Name</div>
                <input
                  className="relation-validation-editor__content__name"
                  spellCheck={false}
                  disabled={isReadOnly}
                  value={relationValidation.name}
                  onChange={changeName}
                  placeholder="Validation name"
                />
              </div>
              <div className="relation-validation-editor__content">
                <div className="relation-validation-editor__label">Type</div>
                <div className="relation-validation-editor__content__select">
                  <CustomSelectorInput
                    className="relation-validation-editor__select"
                    options={
                      dataQualityRelationValidationState.relationValidationOptions
                    }
                    onChange={onValidationTypeChange}
                    value={selectedValidationType}
                    darkMode={
                      !applicationStore.layoutService
                        .TEMPORARY__isLightColorThemeEnabled
                    }
                    placeholder={'Type of validation to be added'}
                  />
                </div>
              </div>
              <div className="relation-validation-editor__content">
                <div className="relation-validation-editor__label">
                  Validation Grammar
                </div>
                <div className="data-quality-uml-element-editor__validation">
                  <div className="data-quality-uml-element-editor__lambda__value">
                    <InlineLambdaEditor
                      disabled={
                        dataQualityRelationValidationState.isConvertingValidationLambdaObjects ||
                        isReadOnly
                      }
                      lambdaEditorState={relationValidationState}
                      forceBackdrop={forceBackdrop}
                      expectedType={PrimitiveType.BOOLEAN}
                      onEditorFocus={() => onLambdaEditorFocus(true)}
                      disablePopUp={true}
                      forceExpansion={true}
                      className="relation-validation__lambda"
                    />
                  </div>
                </div>
              </div>
              <div className="relation-validation-editor__content">
                <div className="relation-validation-editor__label">
                  Description
                </div>
                <input
                  className="relation-validation-editor__content__name"
                  spellCheck={false}
                  disabled={isReadOnly}
                  value={relationValidation.description}
                  onChange={changeDescription}
                  placeholder="Enter the description"
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              onClick={closePlanViewer}
              text="Close"
              type="secondary"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
