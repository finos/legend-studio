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
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  ModalTitle,
  PanelContent,
  PanelHeader,
  PanelHeaderActions,
  EyeIcon,
  ModalHeaderActions,
  CustomSelectorInput,
  FlaskIcon,
  clsx,
} from '@finos/legend-art';
import {
  INGEST_DEFINITION_TAB,
  IngestDefinitionEditorState,
} from '../../../../stores/editor/editor-state/element-editor-state/ingest/IngestDefinitionEditorState.js';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import React, { useEffect, useState } from 'react';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { flowResult } from 'mobx';

import { useApplicationNavigationContext } from '@finos/legend-application';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../__lib__/LegendStudioApplicationNavigationContext.js';
import {
  LINEAGE_VIEW_MODE,
  LineageViewerContent,
} from '@finos/legend-query-builder';
import type { MatViewDataSet } from '@finos/legend-graph';
import { IngestTestableEditor } from './testable/IngestTestableEditor.js';

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
  const isValidForLineage = ingestDefinitionEditorState.validForLineageViewer;
  const selectedTab = ingestDefinitionEditorState.selectedTab;

  const sidebarTabs = [
    {
      label: INGEST_DEFINITION_TAB.DEFINITION,
      icon: <EyeIcon />,
    },
    {
      label: INGEST_DEFINITION_TAB.TESTING,
      icon: <FlaskIcon />,
    },
  ];

  useEffect(() => {
    ingestDefinitionEditorState.generateElementGrammar();
  }, [ingestDefinitionEditorState]);

  useApplicationNavigationContext(
    LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.INGEST_DEFINITION_EDITOR,
  );

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
      <div className="panel">
        <PanelHeader
          title="Ingest"
          titleContent={ingestDef.name}
          darkMode={true}
          isReadOnly={true}
        />
        <div className="panel data-product-editor__content-panel">
          <div
            className="data-space__viewer__activity-bar"
            style={{ position: 'static', maxHeight: '100%' }}
          >
            <div className="data-space__viewer__activity-bar__items">
              {sidebarTabs.map((activity) => (
                <button
                  key={activity.label}
                  className={clsx('data-space__viewer__activity-bar__item', {
                    'data-space__viewer__activity-bar__item--active':
                      selectedTab === activity.label,
                  })}
                  onClick={() =>
                    ingestDefinitionEditorState.setSelectedTab(activity.label)
                  }
                  tabIndex={-1}
                  title={activity.label}
                  style={{
                    flexDirection: 'column',
                    fontSize: '10px',
                    margin: '0.5rem 0rem',
                  }}
                >
                  {activity.icon}
                  {activity.label}
                </button>
              ))}
            </div>
          </div>
          <div className="panel" style={{ flex: 1 }}>
            {selectedTab === INGEST_DEFINITION_TAB.DEFINITION && (
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
              </PanelContent>
            )}
            {selectedTab === INGEST_DEFINITION_TAB.TESTING && (
              <IngestTestableEditor
                testableState={ingestDefinitionEditorState.ingestTestableState}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
