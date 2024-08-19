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
  Dialog,
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  PanelLoadingIndicator,
  PanelContent,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalTitle,
  ModalHeaderActions,
  TimesIcon,
  ModalFooterButton,
  BlankPanelContent,
  PanelHeader,
  Panel,
  InputWithInlineValidation,
  clsx,
} from '@finos/legend-art';
import { useEffect } from 'react';
import { isBoolean, noop, type PlainObject } from '@finos/legend-shared';
import {
  useApplicationStore,
  useConditionedApplicationNavigationContext,
} from '@finos/legend-application';
import { flowResult } from 'mobx';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../__lib__/LegendStudioApplicationNavigationContext.js';
import {
  CODE_EDITOR_LANGUAGE,
  CodeEditor,
} from '@finos/legend-lego/code-editor';
import type { DatabaseBuilderWizardState } from '../../../../stores/editor/editor-state/element-editor-state/connection/DatabaseBuilderWizardState.js';
import { DatabaseSchemaExplorer } from './DatabaseSchemaExplorer.js';
import {
  DataGrid,
  type DataGridCellRendererParams,
  type DataGridColumnDefinition,
} from '@finos/legend-lego/data-grid';
import type { TDSExecutionResult } from '@finos/legend-graph';

type IQueryRendererParamsWithGridType = DataGridCellRendererParams & {
  tdsExecutionResult: TDSExecutionResult;
};

const QueryResultCellRenderer = observer(
  (params: IQueryRendererParamsWithGridType) => {
    const cellValue = params.value as string | null | number | undefined;
    return (
      <div className={clsx('query-builder__result__values__table__cell')}>
        <span>{cellValue}</span>
      </div>
    );
  },
);

const QueryBuilderGridResult = observer(
  (props: { executionResult: TDSExecutionResult }) => {
    const { executionResult } = props;
    const applicationStore = useApplicationStore();
    const darkMode =
      !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;

    const rowData = executionResult.result.rows.map((_row, rowIdx) => {
      const row: PlainObject = {};
      const cols = executionResult.result.columns;
      _row.values.forEach((value, colIdx) => {
        row[cols[colIdx] as string] = isBoolean(value) ? String(value) : value;
      });
      row.rowNumber = rowIdx;
      return row;
    });

    return (
      <div className="query-builder__result__values__table">
        <div
          className={clsx('query-builder__result__tds-grid', {
            'ag-theme-balham': !darkMode,
            'ag-theme-balham-dark': darkMode,
          })}
        >
          <DataGrid
            rowData={rowData}
            gridOptions={{
              suppressScrollOnNewData: true,
              getRowId: (data) => `${data.data.rowNumber}`,
            }}
            // NOTE: when column definition changed, we need to force refresh the cell to make sure the cell renderer is updated
            // See https://stackoverflow.com/questions/56341073/how-to-refresh-an-ag-grid-when-a-change-occurs-inside-a-custom-cell-renderer-com
            onRowDataUpdated={(params) => {
              params.api.refreshCells({ force: true });
            }}
            suppressFieldDotNotation={true}
            columnDefs={executionResult.result.columns.map(
              (colName) =>
                ({
                  minWidth: 50,
                  sortable: true,
                  resizable: true,
                  field: colName,
                  flex: 1,
                  cellRenderer: QueryResultCellRenderer,
                  cellRendererParams: {
                    tdsExecutionResult: executionResult,
                  },
                }) as DataGridColumnDefinition,
            )}
          />
        </div>
      </div>
    );
  },
);

export const DatabaseBuilderModalContent = observer(
  (props: { databaseBuilderState: DatabaseBuilderWizardState }) => {
    const { databaseBuilderState } = props;
    const applicationStore = useApplicationStore();
    const schemaExplorerState = databaseBuilderState.schemaExplorerState;
    const isCreatingNewDatabase = schemaExplorerState.isCreatingNewDatabase;
    const elementAlreadyExistsMessage =
      isCreatingNewDatabase &&
      databaseBuilderState.editorStore.graphManagerState.graph.allElements
        .map((s) => s.path)
        .includes(schemaExplorerState.targetDatabasePath)
        ? 'Element with same path already exists'
        : undefined;

    const isExecutingAction =
      schemaExplorerState.isGeneratingDatabase ||
      schemaExplorerState.isUpdatingDatabase ||
      schemaExplorerState.previewDataState.isInProgress;

    const onTargetPathChange: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      schemaExplorerState.setTargetDatabasePath(event.target.value);
    };

    useEffect(() => {
      flowResult(schemaExplorerState.fetchDatabaseMetadata()).catch(
        applicationStore.alertUnhandledError,
      );
    }, [applicationStore, schemaExplorerState]);

    useConditionedApplicationNavigationContext(
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.DATABASE_BUILDER,
      databaseBuilderState.showModal,
    );

    return (
      <ModalBody className="database-builder__content">
        <PanelLoadingIndicator isLoading={isExecutingAction} />
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel size={450}>
            <ResizablePanelGroup>
              <ResizablePanel>
                <div className="database-builder__config">
                  <PanelHeader title="schema explorer" />
                  <PanelContent className="database-builder__config__content">
                    {schemaExplorerState.treeData && (
                      <DatabaseSchemaExplorer
                        treeData={schemaExplorerState.treeData}
                        isReadOnly={false}
                        schemaExplorerState={
                          databaseBuilderState.schemaExplorerState
                        }
                      />
                    )}
                  </PanelContent>
                </div>
              </ResizablePanel>
              <ResizablePanelSplitter>
                <ResizablePanelSplitterLine
                  color={'var(--color-dark-grey-250)'}
                />
              </ResizablePanelSplitter>
              <ResizablePanel>
                <div className="database-builder__config">
                  <PanelHeader title="preview" />
                  <PanelContent className="database-builder__config__content">
                    {databaseBuilderState.schemaExplorerState.previewer && (
                      <QueryBuilderGridResult
                        executionResult={
                          databaseBuilderState.schemaExplorerState.previewer
                        }
                      />
                    )}
                  </PanelContent>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
          <ResizablePanelSplitter />
          <ResizablePanel>
            <Panel className="database-builder__model">
              <PanelHeader title="database model" />
              <PanelContent>
                <div className="database-builder__modeler">
                  <div className="panel__content__form__section database-builder__modeler__path">
                    <div className="panel__content__form__section__header__label">
                      Target Database Path
                    </div>
                    <InputWithInlineValidation
                      className="panel__content__form__section__input"
                      spellCheck={false}
                      onChange={onTargetPathChange}
                      disabled={
                        schemaExplorerState.makeTargetDatabasePathEditable
                          ? false
                          : !isCreatingNewDatabase
                      }
                      value={
                        schemaExplorerState.makeTargetDatabasePathEditable ||
                        isCreatingNewDatabase
                          ? schemaExplorerState.targetDatabasePath
                          : schemaExplorerState.database.path
                      }
                      error={elementAlreadyExistsMessage}
                      showEditableIcon={true}
                    />
                  </div>
                  <div className="database-builder__modeler__preview">
                    <div className="database-builder__modeler__preview__header">
                      readonly
                    </div>
                    {databaseBuilderState.databaseGrammarCode && (
                      <CodeEditor
                        language={CODE_EDITOR_LANGUAGE.PURE}
                        inputValue={databaseBuilderState.databaseGrammarCode}
                        isReadOnly={true}
                      />
                    )}
                    {!databaseBuilderState.databaseGrammarCode && (
                      <BlankPanelContent>No database preview</BlankPanelContent>
                    )}
                  </div>
                </div>
              </PanelContent>
            </Panel>
          </ResizablePanel>
        </ResizablePanelGroup>
      </ModalBody>
    );
  },
);

export const DatabaseBuilderWizard = observer(
  (props: {
    databaseBuilderState: DatabaseBuilderWizardState;
    isReadOnly: boolean;
  }) => {
    const { databaseBuilderState, isReadOnly } = props;
    const schemaExplorerState = databaseBuilderState.schemaExplorerState;
    const isCreatingNewDatabase = schemaExplorerState.isCreatingNewDatabase;
    const elementAlreadyExistsMessage =
      isCreatingNewDatabase &&
      databaseBuilderState.editorStore.graphManagerState.graph.allElements
        .map((s) => s.path)
        .includes(schemaExplorerState.targetDatabasePath)
        ? 'Element with same path already exists'
        : undefined;

    const applicationStore = useApplicationStore();
    const preview = applicationStore.guardUnhandledError(() =>
      flowResult(databaseBuilderState.previewDatabaseModel()),
    );
    const updateDatabase = applicationStore.guardUnhandledError(() =>
      flowResult(databaseBuilderState.updateDatabase()),
    );
    const closeModal = (): void => {
      databaseBuilderState.setShowModal(false);
      databaseBuilderState.editorStore.explorerTreeState.setDatabaseBuilderState(
        undefined,
      );
    };
    const isExecutingAction =
      schemaExplorerState.isGeneratingDatabase ||
      schemaExplorerState.isUpdatingDatabase ||
      schemaExplorerState.previewDataState.isInProgress;

    return (
      <Dialog
        open={databaseBuilderState.showModal}
        onClose={noop} // disallow closing dialog by using Esc key or clicking on the backdrop
        classes={{ container: 'search-modal__container' }}
        PaperProps={{
          classes: {
            root: 'search-modal__inner-container database-builder__container',
          },
        }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className="database-builder"
        >
          <ModalHeader>
            <ModalTitle title="Database Builder" />
            <ModalHeaderActions>
              <button
                className="modal__header__action"
                tabIndex={-1}
                onClick={closeModal}
              >
                <TimesIcon />
              </button>
            </ModalHeaderActions>
          </ModalHeader>
          <DatabaseBuilderModalContent
            databaseBuilderState={databaseBuilderState}
          />
          <ModalFooter>
            <ModalFooterButton
              className="database-builder__action--btn"
              disabled={isReadOnly || isExecutingAction}
              onClick={preview}
              title="Preview database model..."
            >
              Preview
            </ModalFooterButton>
            <ModalFooterButton
              className="database-builder__action--btn"
              disabled={
                isReadOnly ||
                isExecutingAction ||
                Boolean(elementAlreadyExistsMessage)
              }
              onClick={updateDatabase}
            >
              Update Database
            </ModalFooterButton>
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
