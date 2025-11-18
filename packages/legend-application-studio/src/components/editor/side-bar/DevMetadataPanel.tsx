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
import { useEditorStore } from '../EditorStoreProvider.js';
import { useEffect } from 'react';
import {
  PanelFormSection,
  PanelFormValidatedTextField,
  PanelHeader,
  PanelContent,
  Panel,
  clsx,
  Dialog,
  CheckCircleIcon,
  ModalBody,
  ModalFooterButton,
  ModalFooter,
  ModalHeader,
  Modal,
  ModalTitle,
} from '@finos/legend-art';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import { DevMetadataResult } from '@finos/legend-graph';

const DevMetadataResultModal = observer(
  (props: {
    closeModal: () => void;
    deploymentResponse: DevMetadataResult;
  }) => {
    const { closeModal, deploymentResponse } = props;
    return (
      <Dialog
        open={true}
        classes={{
          root: 'ingestion-modal__root-container',
          container: 'ingestion-modal__container',
          paper: 'ingestion-modal__content',
        }}
      >
        <Modal darkMode={true} className="ingestion-modal">
          <ModalHeader>
            <ModalTitle
              icon={<CheckCircleIcon className="ingestion-modal--success" />}
              title="Push Response"
            ></ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div className="ingestion-modal__write">
              <div className="ingestion-modal__write--value">
                <CodeEditor
                  inputValue={JSON.stringify(
                    DevMetadataResult.serialization.toJson(deploymentResponse),
                    null,
                    2,
                  )}
                  isReadOnly={true}
                  language={CODE_EDITOR_LANGUAGE.JSON}
                  extraEditorOptions={{
                    wordWrap: 'on',
                  }}
                  hideActionBar={true}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              onClick={closeModal}
              text="Close"
              type="secondary"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

export const DevMetadataPanel = observer(() => {
  const editorStore = useEditorStore();
  const devMetadataState = editorStore.devMetadataState;

  useEffect(() => {
    devMetadataState.init();
  }, [devMetadataState]);

  const handlePush = (): void => {
    devMetadataState.push();
  };

  const handleDidChange = (value: string | undefined): void => {
    devMetadataState.setDid(value ?? '');
  };

  const isPushDisabled = !devMetadataState.did.trim();

  return (
    <Panel>
      <PanelHeader className="side-bar__header">
        <div className="panel__header__title">
          <div className="panel__header__title__label side-bar__header__title__content">
            Push to Dev
          </div>
        </div>
      </PanelHeader>
      <PanelContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!isPushDisabled) {
              handlePush();
            }
          }}
        >
          <PanelFormSection>
            <div className="panel__content__form__section__header__label">
              DID
            </div>
            <PanelFormValidatedTextField
              value={devMetadataState.did}
              update={handleDidChange}
              placeholder="Enter DID..."
            />
          </PanelFormSection>
          <PanelFormSection>
            <button
              type="submit"
              className={clsx('btn btn--primary register-service__push-btn', {
                'btn--disabled': isPushDisabled,
              })}
              disabled={isPushDisabled}
              title={
                isPushDisabled
                  ? 'Please fill in both DID and Project Name'
                  : 'Push to Dev'
              }
            >
              <div className="btn__content">
                <div className="btn__content__label">Push</div>
              </div>
            </button>
          </PanelFormSection>
        </form>
      </PanelContent>
      {devMetadataState.result && (
        <DevMetadataResultModal
          closeModal={() => (devMetadataState.result = undefined)}
          deploymentResponse={devMetadataState.result}
        />
      )}
    </Panel>
  );
});
