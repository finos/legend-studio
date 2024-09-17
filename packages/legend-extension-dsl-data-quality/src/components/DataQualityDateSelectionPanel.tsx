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
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  PanelFormSection,
} from '@finos/legend-art';
import type { DataQualityState } from './states/DataQualityState.js';
import { observer } from 'mobx-react-lite';
import {
  MILESTONING_STEREOTYPE,
  BUSINESS_DATE_MILESTONING_PROPERTY_NAME,
  PROCESSING_DATE_MILESTONING_PROPERTY_NAME,
} from '@finos/legend-graph';

export const DataQualityDateSelectionPanel = observer(
  (props: { dataQualityState: DataQualityState }) => {
    const { dataQualityState } = props;
    const { applicationStore, showDateSelection } = dataQualityState;
    const currentClassMilestoningStrategy =
      dataQualityState.currentClassMilestoningStrategy;
    const showProcessingDate =
      currentClassMilestoningStrategy ===
        MILESTONING_STEREOTYPE.PROCESSING_TEMPORAL ||
      currentClassMilestoningStrategy === MILESTONING_STEREOTYPE.BITEMPORAL;
    const showBusinessDate =
      currentClassMilestoningStrategy ===
        MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL ||
      currentClassMilestoningStrategy === MILESTONING_STEREOTYPE.BITEMPORAL;

    const updateAbsoluteDateValue: React.ChangeEventHandler<
      HTMLInputElement
    > = (event) => {
      if (event.target.name === PROCESSING_DATE_MILESTONING_PROPERTY_NAME) {
        dataQualityState.setProcessingDate(event.target.value);
      }
      if (event.target.name === BUSINESS_DATE_MILESTONING_PROPERTY_NAME) {
        dataQualityState.setBusinessDate(event.target.value);
      }
    };

    const closePlanViewer = () => {
      dataQualityState.setShowDateSelection(false);
    };

    return (
      <Dialog
        open={showDateSelection}
        classes={{
          root: 'validation-date-selection-modal__root-container',
          container: 'validation-date-selection-modal__container',
          paper: 'validation-date-selection-modal__content',
        }}
      >
        <Modal
          className="validation-date-selection-modal"
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        >
          <ModalHeader title="Validation Options" />
          <ModalBody className="validation-date-selection-modal__body">
            {showProcessingDate && (
              <PanelFormSection>
                <div className="panel__content__form__section__header__label">
                  Processing Date
                </div>
                <div className="panel__content__form__section__header__prompt">
                  Choose a value for this milestoning parameter
                </div>
                <div className="validation-date-selection-modal__absolute-date">
                  <input
                    className="panel__content__form__section__input validation-date-selection-modal__absolute-date__input input--dark"
                    type="date"
                    spellCheck={false}
                    value={dataQualityState.processingDate}
                    name={PROCESSING_DATE_MILESTONING_PROPERTY_NAME}
                    onChange={updateAbsoluteDateValue}
                  />
                </div>
              </PanelFormSection>
            )}
            {showBusinessDate && (
              <PanelFormSection>
                <div className="panel__content__form__section__header__label">
                  Business Date
                </div>
                <div className="panel__content__form__section__header__prompt">
                  Choose a value for this milestoning parameter
                </div>
                <div className="validation-date-selection-modal__absolute-date">
                  <input
                    className="panel__content__form__section__input validation-date-selection-modal__absolute-date__input input--dark"
                    type="date"
                    spellCheck={false}
                    value={dataQualityState.businessDate}
                    name={BUSINESS_DATE_MILESTONING_PROPERTY_NAME}
                    onChange={updateAbsoluteDateValue}
                  />
                </div>
              </PanelFormSection>
            )}
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
