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
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  CheckCircleIcon,
  CopyIcon,
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  ModalTitle,
  PanelContent,
  PanelHeader,
  PanelHeaderActions,
  RocketIcon,
} from '@finos/legend-art';
import {
  generateUrlToDeployOnOpen,
  IngestDefinitionEditorState,
} from '../../../../stores/editor/editor-state/element-editor-state/ingest/IngestDefinitionEditorState.js';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import React, { useEffect } from 'react';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { flowResult } from 'mobx';
import { useAuth } from 'react-oidc-context';
import {
  type IngestDefinitionDeploymentResponse,
  IngestDefinitionValidationResponse,
} from '../../../../stores/ingestion/IngestionDeploymentResponse.js';

const IngestValidationError = observer(
  (props: {
    state: IngestDefinitionEditorState;
    validateResponse: IngestDefinitionValidationResponse;
  }) => {
    const { state, validateResponse } = props;
    const applicationStore = state.editorStore.applicationStore;
    const closeModal = (): void =>
      state.setValidateAndDeployResponse(undefined);
    return (
      <Dialog
        open={true}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
        onClose={closeModal}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className="editor-modal"
        >
          <ModalHeader>
            <ModalTitle title={'Validation Error'} />
          </ModalHeader>
          <ModalBody>
            <PanelContent>
              <CodeEditor
                inputValue={JSON.stringify(validateResponse, null, 2)}
                isReadOnly={true}
                language={CODE_EDITOR_LANGUAGE.JSON}
              />
            </PanelContent>
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

// TODO: show full report i.e write envs etc
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const IngestDeploymentResponseModal = observer(
  (props: {
    state: IngestDefinitionEditorState;
    deploymentResponse: IngestDefinitionDeploymentResponse;
  }) => {
    const { state, deploymentResponse } = props;
    const applicationStore = state.editorStore.applicationStore;
    const closeModal = (): void =>
      state.setValidateAndDeployResponse(undefined);
    const copyURN = (text: string): void => {
      state.editorStore.applicationStore.clipboardService
        .copyTextToClipboard(text)
        .then(() =>
          state.editorStore.applicationStore.notificationService.notifySuccess(
            'Ingest URN copied to clipboard',
            undefined,
            2500,
          ),
        )
        .catch(state.editorStore.applicationStore.alertUnhandledError);
    };
    return (
      <Dialog
        open={true}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
        onClose={closeModal}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className="editor-modal"
        >
          <ModalHeader>
            <ModalTitle
              icon={<CheckCircleIcon />}
              title="Deployment URN"
            ></ModalTitle>
          </ModalHeader>
          <ModalBody>
            <PanelContent>
              <div>
                <div>Ingestion URN</div>
                <div>{deploymentResponse.ingestDefinitionUrn}</div>

                <div className="data-space__viewer__quickstart__tds__query-text__actions">
                  <button
                    className="data-space__viewer__quickstart__tds__query-text__action"
                    tabIndex={-1}
                    title="Copy"
                    onClick={() => {
                      copyURN(deploymentResponse.ingestDefinitionUrn);
                    }}
                  >
                    <CopyIcon />
                  </button>
                  <button
                    className="data-space__viewer__quickstart__tds__query-text__action"
                    tabIndex={-1}
                  ></button>
                </div>
              </div>
            </PanelContent>
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

export const IngestDefinitionEditor = observer(() => {
  const editorStore = useEditorStore();
  const ingestDefinitionEditorState =
    editorStore.tabManagerState.getCurrentEditorState(
      IngestDefinitionEditorState,
    );
  const ingestDef = ingestDefinitionEditorState.ingest;
  const auth = useAuth();

  const deployIngest = (): void => {
    // Trigger OAuth flow if not authenticated
    if (!auth.isAuthenticated) {
      // remove this redirect if we move to do oauth at the beginning of opening studio
      auth
        .signinRedirect({
          state: generateUrlToDeployOnOpen(ingestDefinitionEditorState),
        })
        .catch(editorStore.applicationStore.alertUnhandledError);
      return;
    }
    // Use the token for deployment
    const token = auth.user?.access_token;
    if (token) {
      flowResult(ingestDefinitionEditorState.deploy(token)).catch(
        editorStore.applicationStore.alertUnhandledError,
      );
    } else {
      editorStore.applicationStore.notificationService.notifyError(
        'Authentication failed. No token available.',
      );
    }
  };

  const renderDeploymentResponse = (): React.ReactNode => {
    const response = ingestDefinitionEditorState.deploymentResponse;
    if (response instanceof IngestDefinitionValidationResponse) {
      return (
        <IngestValidationError
          state={ingestDefinitionEditorState}
          validateResponse={response}
        />
      );
    }

    return null;
  };

  const isValid = ingestDefinitionEditorState.validForDeployment;
  useEffect(() => {
    ingestDefinitionEditorState.generateElementGrammar();
  }, [ingestDefinitionEditorState]);

  useEffect(() => {
    if (ingestDefinitionEditorState.deployOnOpen) {
      flowResult(ingestDefinitionEditorState.init_with_deploy(auth)).catch(
        editorStore.applicationStore.alertUnhandledError,
      );
    }
  }, [
    auth,
    editorStore.applicationStore.alertUnhandledError,
    ingestDefinitionEditorState,
  ]);

  return (
    <div className="data-product-editor">
      <PanelHeader
        title="Ingest"
        titleContent={ingestDef.name}
        darkMode={true}
        isReadOnly={true}
      ></PanelHeader>
      <PanelContent>
        <PanelHeader title="deployment" darkMode={true}>
          <PanelHeaderActions>
            <div className="btn__dropdown-combo btn__dropdown-combo--primary">
              <button
                className="btn__dropdown-combo__label"
                onClick={deployIngest}
                title={ingestDefinitionEditorState.validationMessage}
                tabIndex={-1}
                disabled={!isValid}
              >
                <RocketIcon className="btn__dropdown-combo__label__icon" />
                <div className="btn__dropdown-combo__label__title">Deploy</div>
              </button>
            </div>
          </PanelHeaderActions>
        </PanelHeader>
        <PanelContent>
          <CodeEditor
            inputValue={ingestDefinitionEditorState.textContent}
            isReadOnly={true}
            language={CODE_EDITOR_LANGUAGE.PURE}
          />
        </PanelContent>
        {renderDeploymentResponse()}
      </PanelContent>
    </div>
  );
});
