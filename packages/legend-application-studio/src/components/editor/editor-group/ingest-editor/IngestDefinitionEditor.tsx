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
  Dialog,
  Modal,
  ModalBody,
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
import { useEffect } from 'react';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { flowResult } from 'mobx';
import { useAuth } from 'react-oidc-context';

const IngestDepoymentModal = observer(
  (props: { state: IngestDefinitionEditorState }) => {
    const { state } = props;
    const applicationStore = state.editorStore.applicationStore;

    return (
      <Dialog
        open={state.deploymentState.isInProgress}
        classes={{ container: 'search-modal__container' }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className="database-builder"
        >
          <ModalHeader>
            <ModalTitle title="Deploy Ingestion" />
          </ModalHeader>
          <ModalBody>
            <div>{state.deploymentState.message}</div>
          </ModalBody>
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
        {ingestDefinitionEditorState.deploymentState.isInProgress && (
          <IngestDepoymentModal state={ingestDefinitionEditorState} />
        )}
      </PanelContent>
    </div>
  );
});
