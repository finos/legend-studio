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
  EyeIcon,
  ModalHeaderActions,
  CustomSelectorInput,
} from '@finos/legend-art';
import {
  generateUrlToDeployOnOpen,
  IngestDefinitionEditorState,
} from '../../../../stores/editor/editor-state/element-editor-state/ingest/IngestDefinitionEditorState.js';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import React, { useEffect, useState } from 'react';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { flowResult } from 'mobx';
import { useAuth } from 'react-oidc-context';
import {
  IngestDefinitionDeploymentResponse,
  IngestDefinitionValidationResponse,
} from '@finos/legend-server-lakehouse';
import { useApplicationNavigationContext } from '@finos/legend-application';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../__lib__/LegendStudioApplicationNavigationContext.js';
import {
  LINEAGE_VIEW_MODE,
  LineageViewerContent,
} from '@finos/legend-query-builder';
import type { MatViewDataSet } from '@finos/legend-graph';

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

const IngestDeploymentResponseModal = observer(
  (props: {
    closeModal: () => void;
    deploymentResponse: IngestDefinitionDeploymentResponse;
    copyHandler: (text: string, successMessage: string) => void;
  }) => {
    const { closeModal, deploymentResponse, copyHandler } = props;
    const copyURN = (text: string): void => {
      copyHandler(text, 'Ingest URN copied to clipboard');
    };
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
              title="Deployment Response"
            ></ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div className="ingestion-modal__urn">
              <div className="ingestion-modal__urn__info">
                <div className="panel__content__form__section__header__label">
                  Deployment URN
                </div>
                <div className="ingestion-modal__urn__value">
                  {deploymentResponse.ingestDefinitionUrn}
                </div>
              </div>
              <div className="ingestion-modal__urn__copy">
                <button
                  className="ingestion-modal__urn__copy--btn"
                  tabIndex={-1}
                  title="Copy"
                  onClick={() => {
                    copyURN(deploymentResponse.ingestDefinitionUrn);
                  }}
                >
                  <CopyIcon />
                </button>
              </div>
            </div>
            <div className="ingestion-modal__write">
              <div className="ingestion-modal__write__label">
                Write Location
              </div>
              <div className="ingestion-modal__write--value">
                {deploymentResponse.write_location ? (
                  <CodeEditor
                    inputValue={JSON.stringify(
                      deploymentResponse.write_location,
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
                ) : (
                  <div className="ingestion-modal__write--no-value">
                    No write location provided
                  </div>
                )}
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

export const IngestLineageModal = observer(
  (props: { ingestDefinitionEditorState: IngestDefinitionEditorState }) => {
    const { ingestDefinitionEditorState } = props;

    const matviewFunctions =
      ingestDefinitionEditorState.ingest.TEMPORARY_MATVIEW_FUNCTION_DATA_SETS;
    const matviewNames =
      ingestDefinitionEditorState.ingest.TEMPORARY_MATVIEW_FUNCTION_DATA_SETS?.map(
        (dataset) => dataset.name,
      ) ?? [];
    const [selectedMatview, setSelectedMatview] = useState<
      MatViewDataSet | undefined
    >(undefined);

    useEffect(() => {
      if (!selectedMatview && matviewFunctions && matviewFunctions.length > 0) {
        setSelectedMatview(matviewFunctions[0]);
      }
    }, [matviewFunctions, selectedMatview]);

    useEffect(() => {
      ingestDefinitionEditorState.lineageState.setSelectedTab(
        LINEAGE_VIEW_MODE.DATABASE_LINEAGE,
      );
    }, [ingestDefinitionEditorState.lineageState]);

    if (!matviewFunctions || matviewFunctions.length === 0) {
      return null;
    }

    const isDarkMode =
      !ingestDefinitionEditorState.lineageState.applicationStore.layoutService
        .TEMPORARY__isLightColorThemeEnabled;

    const closeLineageViewer = (): void => {
      ingestDefinitionEditorState.lineageState.setLineageData(undefined);
      ingestDefinitionEditorState.lineageState.setSelectedTab(
        LINEAGE_VIEW_MODE.DATABASE_LINEAGE,
      );
      ingestDefinitionEditorState.lineageState.clearPropertySelections();
    };

    type DatasetOption = {
      label: string;
      value: MatViewDataSet;
    };

    const datasetOptions: DatasetOption[] = matviewNames
      .map((name, index) => {
        const dataset = matviewFunctions[index];
        if (dataset) {
          return {
            label: name,
            value: dataset,
          };
        }
        return null;
      })
      .filter((option): option is DatasetOption => option !== null);

    const handleDatasetChange = (option: DatasetOption | null): void => {
      if (option?.value) {
        setSelectedMatview(option.value);
        flowResult(
          ingestDefinitionEditorState.generateLineage(option.value),
        ).catch(
          ingestDefinitionEditorState.editorStore.applicationStore
            .alertUnhandledError,
        );
      }
    };

    return (
      <>
        <Dialog
          open={Boolean(ingestDefinitionEditorState.lineageState.lineageData)}
          onClose={closeLineageViewer}
        >
          <Modal className="editor-modal" darkMode={isDarkMode}>
            <ModalHeader>
              <ModalTitle title="LineageViewer" />
              <ModalHeaderActions>
                <CustomSelectorInput
                  options={datasetOptions}
                  onChange={handleDatasetChange}
                  value={
                    selectedMatview
                      ? {
                          label: selectedMatview.name,
                          value: selectedMatview,
                        }
                      : null
                  }
                  darkMode={isDarkMode}
                />
              </ModalHeaderActions>
            </ModalHeader>
            <ModalBody>
              <div className="lineage-viewer" style={{ height: '100%' }}>
                <LineageViewerContent
                  lineageState={ingestDefinitionEditorState.lineageState}
                />
              </div>
            </ModalBody>
            <ModalFooter className="editor-modal__footer">
              <ModalFooterButton
                onClick={closeLineageViewer}
                text="Close"
                type="secondary"
              />
            </ModalFooter>
          </Modal>
        </Dialog>
      </>
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
    } else if (response instanceof IngestDefinitionDeploymentResponse) {
      const copyHanlder = (text: string, successMessage: string): void => {
        ingestDefinitionEditorState.editorStore.applicationStore.clipboardService
          .copyTextToClipboard(text)
          .then(() =>
            ingestDefinitionEditorState.editorStore.applicationStore.notificationService.notifySuccess(
              successMessage,
              undefined,
              2500,
            ),
          )
          .catch(
            ingestDefinitionEditorState.editorStore.applicationStore
              .alertUnhandledError,
          );
      };
      return (
        <IngestDeploymentResponseModal
          closeModal={() =>
            ingestDefinitionEditorState.setValidateAndDeployResponse(undefined)
          }
          deploymentResponse={response}
          copyHandler={copyHanlder}
        />
      );
    }
    return null;
  };

  const isValid = ingestDefinitionEditorState.validForDeployment;
  const isValidForLineage = ingestDefinitionEditorState.validForLineageViewer;
  useEffect(() => {
    ingestDefinitionEditorState.generateElementGrammar();
  }, [ingestDefinitionEditorState]);

  useApplicationNavigationContext(
    LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.INGEST_DEFINITION_EDITOR,
  );

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

  const viewLineage = () => {
    const firstMatViewQuery =
      ingestDefinitionEditorState.ingest
        .TEMPORARY_MATVIEW_FUNCTION_DATA_SETS?.[0];
    if (firstMatViewQuery) {
      flowResult(
        ingestDefinitionEditorState.generateLineage(firstMatViewQuery),
      ).catch(editorStore.applicationStore.alertUnhandledError);
    } else {
      editorStore.applicationStore.notificationService.notifyError(
        'No MatView datasets available for lineage generation',
      );
    }
  };

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
            <div className="panel__header__actions">
              <div className="btn__dropdown-combo btn__dropdown-combo--primary">
                <button
                  className="btn__dropdown-combo__label"
                  onClick={viewLineage}
                  tabIndex={-1}
                  disabled={!isValidForLineage}
                >
                  <EyeIcon className="btn__dropdown-combo__label__icon" />
                  <div className="btn__dropdown-combo__label__title">
                    Lineage
                  </div>
                </button>
              </div>
              <div className="btn__dropdown-combo btn__dropdown-combo--primary">
                <button
                  className="btn__dropdown-combo__label"
                  onClick={deployIngest}
                  title={ingestDefinitionEditorState.validationMessage}
                  tabIndex={-1}
                  disabled={!isValid}
                >
                  <RocketIcon className="btn__dropdown-combo__label__icon" />
                  <div className="btn__dropdown-combo__label__title">
                    Deploy
                  </div>
                </button>
              </div>
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
        <IngestLineageModal
          ingestDefinitionEditorState={ingestDefinitionEditorState}
        />
        {renderDeploymentResponse()}
      </PanelContent>
    </div>
  );
});
