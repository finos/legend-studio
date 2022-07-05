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
  clsx,
  ContextMenu,
  CustomSelectorInput,
  Dialog,
  MaskIcon,
  MenuContent,
  MenuContentItem,
  PlusIcon,
  PURE_ConnectionIcon,
  RefreshIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
} from '@finos/legend-art';
import type {
  IdentifiedConnection,
  ConnectionTestData,
} from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import { forwardRef, useState } from 'react';
import type { DSLData_LegendStudioPlugin_Extension } from '../../../../../index.js';
import type {
  ConnectionTestDataState,
  ServiceTestDataState,
} from '../../../../../stores/editor-state/element-editor-state/service/testable/ServiceTestDataState.js';
import type { EmbeddedDataTypeOption } from '../../../../../stores/editor-state/element-editor-state/data/DataEditorState.js';
import { EmbeddedDataEditor } from '../../data-editor/EmbeddedDataEditor.js';
import { EmbeddedDataType } from '../../../../../stores/editor-state/ExternalFormatState.js';
import { flowResult } from 'mobx';

export const ConnectionTestDataEditor = observer(
  (props: { connectionTestDataState: ConnectionTestDataState }) => {
    const { connectionTestDataState } = props;
    const isReadOnly =
      connectionTestDataState.testDataState.testSuiteState.testableState
        .serviceEditorState.isReadOnly;
    // test data
    const anonymizeGeneratedData =
      connectionTestDataState.anonymizeGeneratedData;
    const toggleAnonymizeGeneratedData = (): void => {
      connectionTestDataState.setAnonymizeGeneratedData(
        !anonymizeGeneratedData,
      );
    };
    const generateTestData = (): void => {
      flowResult(connectionTestDataState.generateTestData()).catch(
        connectionTestDataState.editorStore.applicationStore
          .alertUnhandledError,
      );
    };
    return (
      <div className="service-test-data-editor">
        <div className="service-test-suite-editor__header">
          <div className="service-test-suite-editor__header__title">
            <div className="service-test-suite-editor__header__title__label">
              embedded data
            </div>
          </div>
          <div className="panel__header__actions">
            <div
              className={clsx('panel__content__form__section__toggler', {
                'panel__content__form__section__toggler--disabled': isReadOnly,
              })}
              onClick={toggleAnonymizeGeneratedData}
            >
              <button
                className={clsx(
                  'btn--sm service-execution-editor__test-data__anonymize-btn',
                  {
                    'service-execution-editor__test-data__anonymize-btn--active':
                      anonymizeGeneratedData,
                  },
                )}
                disabled={isReadOnly}
                tabIndex={-1}
                title={`[${
                  anonymizeGeneratedData ? 'on' : 'off'
                }] Anonymize Test Data`}
              >
                <MaskIcon />
              </button>
            </div>
            <button
              className="panel__header__action service-execution-editor__test-data__generate-btn"
              onClick={generateTestData}
              title="Generate test data if possible"
              disabled={
                connectionTestDataState.generatingTestDataSate.isInProgress
              }
              tabIndex={-1}
            >
              <div className="service-execution-editor__test-data__generate-btn__label">
                <RefreshIcon className="service-execution-editor__test-data__generate-btn__label__icon" />
                <div className="service-execution-editor__test-data__generate-btn__label__title">
                  Generate
                </div>
              </div>
            </button>
          </div>
        </div>
        <EmbeddedDataEditor
          isReadOnly={isReadOnly}
          embeddedDataEditorState={connectionTestDataState.embeddedEditorState}
        />
      </div>
    );
  },
);

const ConnectionTestDataContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      connectionTestData: ConnectionTestData;
      deleteConnectionData: () => void;
    }
  >(function TestContainerContextMenu(props, ref) {
    const { deleteConnectionData } = props;
    const remove = (): void => deleteConnectionData();

    return (
      <MenuContent ref={ref}>
        <MenuContentItem onClick={remove}>Delete</MenuContentItem>
      </MenuContent>
    );
  }),
);

const ConnectionTestDataItem = observer(
  (props: {
    serviceTestDataState: ServiceTestDataState;
    connectionTestData: ConnectionTestData;
  }) => {
    const { connectionTestData, serviceTestDataState } = props;
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const isReadOnly =
      serviceTestDataState.testSuiteState.testableState.serviceEditorState
        .isReadOnly;
    const openConnectionTestData = (): void =>
      serviceTestDataState.openConnectionTestData(connectionTestData);
    const isActive =
      serviceTestDataState.selectedDataState?.connectionData ===
      connectionTestData;
    const deleteConnectionTestData = (): void =>
      serviceTestDataState.deleteConnectionTestData(connectionTestData);
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);
    return (
      <ContextMenu
        className={clsx(
          'testable-test-assertion-explorer__item',
          {
            'testable-test-assertion-explorer__item--selected-from-context-menu':
              !isActive && isSelectedFromContextMenu,
          },
          { 'testable-test-assertion-explorer__item--active': isActive },
        )}
        disabled={isReadOnly}
        content={
          <ConnectionTestDataContextMenu
            connectionTestData={connectionTestData}
            deleteConnectionData={deleteConnectionTestData}
          />
        }
        menuProps={{ elevation: 7 }}
        onOpen={onContextMenuOpen}
        onClose={onContextMenuClose}
      >
        <button
          className={clsx('testable-test-assertion-explorer__item__label')}
          onClick={openConnectionTestData}
          tabIndex={-1}
        >
          <div className="testable-test-assertion-explorer__item__label__icon testable-test-assertion-explorer__test-result-indicator__container">
            <PURE_ConnectionIcon />
          </div>
          <div className="testable-test-assertion-explorer__item__label__text">
            {connectionTestData.connectionId}
          </div>
        </button>
      </ContextMenu>
    );
  },
);

export const NewConnectionDataModal = observer(
  (props: { testDataState: ServiceTestDataState }) => {
    const { testDataState } = props;
    const isReadOnly =
      testDataState.testSuiteState.testableState.serviceEditorState.isReadOnly;
    const newConnectionState = testDataState.newConnectionDataState;
    const closeModal = (): void => newConnectionState.setModal(false);
    const connectionOptions = testDataState.allIdentifiedConnections.map(
      (e) => ({
        label: e.id,
        value: e,
      }),
    );
    const selectedConnection = newConnectionState.connection
      ? {
          label: newConnectionState.connection.id,
          value: newConnectionState.connection,
        }
      : undefined;
    const isDisabled =
      isReadOnly ||
      !testDataState.allIdentifiedConnections.length ||
      Boolean(
        testDataState.testData.connectionsTestData.find(
          (c) => c.connectionId === selectedConnection?.value.id,
        ),
      );
    const handleSubmit = (): void => {
      const connection = newConnectionState.connection;
      const data = newConnectionState.embeddedDataType;
      if (connection && data) {
        testDataState.createConnectionTestData();
        closeModal();
      }
    };
    const onConnectionSelectionChange = (val: {
      label: string;
      value?: IdentifiedConnection;
    }): void => {
      if (val.value === undefined) {
        newConnectionState.setConnection(undefined);
      } else if (val.value !== selectedConnection?.value) {
        newConnectionState.setConnection(val.value);
      }
    };
    // external format
    const selectedEmbeddedType = newConnectionState.embeddedDataType;
    const extraOptionTypes = testDataState.editorStore.pluginManager
      .getStudioPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSLData_LegendStudioPlugin_Extension
          ).getExtraEmbeddedDataTypeOptions?.() ?? [],
      );
    const embeddedOptions = [
      ...Object.values(EmbeddedDataType).map((typeOption) => ({
        label: typeOption,
        value: typeOption,
      })),
      ...extraOptionTypes,
    ];
    const onEmbeddedTypeChange = (val: EmbeddedDataTypeOption | null): void => {
      if (!val) {
        newConnectionState.setEmbeddedDataType(undefined);
      } else {
        newConnectionState.setEmbeddedDataType(val);
      }
    };

    return (
      <Dialog
        open={newConnectionState.showModal}
        onClose={closeModal}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <form
          onSubmit={handleSubmit}
          className="modal modal--dark search-modal"
        >
          <div className="modal__title">Create a new Connection Data</div>
          <div className="explorer__new-element-modal__driver">
            <CustomSelectorInput
              className="explorer__new-element-modal__driver__dropdown"
              options={connectionOptions}
              onChange={onConnectionSelectionChange}
              value={selectedConnection}
              isClearable={false}
              darkMode={true}
            />
          </div>

          <div className="explorer__new-element-modal__driver">
            <CustomSelectorInput
              className="explorer__new-element-modal__driver__dropdown"
              options={embeddedOptions}
              onChange={onEmbeddedTypeChange}
              value={selectedEmbeddedType}
              isClearable={false}
              darkMode={true}
            />
          </div>
          <div className="search-modal__actions">
            <button
              type="button"
              className="btn btn--dark"
              onClick={closeModal}
            >
              Cancel
            </button>
            <button className="btn btn--dark" disabled={isDisabled}>
              Create
            </button>
          </div>
        </form>
      </Dialog>
    );
  },
);

export const ServiceTestDataEditor = observer(
  (props: { testDataState: ServiceTestDataState }) => {
    const { testDataState } = props;
    const testData = testDataState.testData;
    const newConnectionDataState = testDataState.newConnectionDataState;
    const addConnectionTestData = (): void => {
      testDataState.newConnectionDataState.openModal();
    };
    return (
      <div className="service-test-data-editor panel">
        <div className="service-test-suite-editor__header">
          <div className="service-test-suite-editor__header__title">
            <div className="service-test-suite-editor__header__title__label service-test-suite-editor__header__title__label--data">
              data
            </div>
          </div>
        </div>
        <div className="service-test-data-editor__data">
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel minSize={100}>
              <div className="binding-editor__header">
                <div className="binding-editor__header__title">
                  <div className="binding-editor__header__title__label">
                    connections
                  </div>
                </div>
                <div className="panel__header__actions">
                  <button
                    className="panel__header__action"
                    tabIndex={-1}
                    onClick={addConnectionTestData}
                    title="Add Connection Test Data"
                  >
                    <PlusIcon />
                  </button>
                </div>
              </div>
              <div>
                {testData.connectionsTestData.map((connectionTestData) => (
                  <ConnectionTestDataItem
                    key={connectionTestData.connectionId}
                    serviceTestDataState={testDataState}
                    connectionTestData={connectionTestData}
                  />
                ))}
              </div>
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel minSize={600}>
              {testDataState.selectedDataState && (
                <ConnectionTestDataEditor
                  connectionTestDataState={testDataState.selectedDataState}
                />
              )}
              {newConnectionDataState.showModal && (
                <NewConnectionDataModal testDataState={testDataState} />
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    );
  },
);
