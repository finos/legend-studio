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
  BlankPanelPlaceholder,
  CaretDownIcon,
  clsx,
  ContextMenu,
  CustomSelectorInput,
  Dialog,
  ControlledDropdownMenu,
  InfoCircleIcon,
  MaskIcon,
  MenuContent,
  MenuContentItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  PanelLoadingIndicator,
  PlusIcon,
  PURE_ConnectionIcon,
  RefreshIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  TimesIcon,
} from '@finos/legend-art';
import {
  type IdentifiedConnection,
  type ConnectionTestData,
  type DataElement,
  type ValueSpecification,
  getAllIdentifiedServiceConnections,
  DataElementReference,
  PackageableElementExplicitReference,
  Column,
} from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import { forwardRef, useState } from 'react';
import {
  createMockPrimitiveValueSpecificationFromRelationalDataType,
  type ConnectionTestDataState,
  type RowIdentifierState,
  type ServiceTestDataState,
  type TableRowIdentifierState,
} from '../../../../../stores/editor/editor-state/element-editor-state/service/testable/ServiceTestDataState.js';
import type { EmbeddedDataTypeOption } from '../../../../../stores/editor/editor-state/element-editor-state/data/DataEditorState.js';
import { EmbeddedDataEditor } from '../../data-editor/EmbeddedDataEditor.js';
import { EmbeddedDataType } from '../../../../../stores/editor/editor-state/ExternalFormatState.js';
import { flowResult } from 'mobx';
import {
  ActionAlertActionType,
  ActionAlertType,
  useApplicationStore,
} from '@finos/legend-application';
import { buildElementOption } from '@finos/legend-lego/graph-editor';
import {
  filterByType,
  getNullableFirstEntry,
  guaranteeNonNullable,
  prettyCONSTName,
} from '@finos/legend-shared';
import type { DSL_Data_LegendStudioApplicationPlugin_Extension } from '../../../../../stores/extensions/DSL_Data_LegendStudioApplicationPlugin_Extension.js';
import { useEditorStore } from '../../../EditorStoreProvider.js';
import {
  BasicValueSpecificationEditor,
  LambdaParameterValuesEditor,
} from '@finos/legend-query-builder';
import { LEGEND_STUDIO_DOCUMENTATION_KEY } from '../../../../../__lib__/LegendStudioDocumentation.js';
import type { TableOption } from '../../data-editor/RelationalCSVDataEditor.js';
import { getPrimitiveTypeFromRelationalType } from '../../../../../stores/editor/utils/MockDataUtils.js';

export interface ColumnOption {
  value: Column;
  label: string;
}

export const RowIdentifierEditor = observer(
  (props: {
    tableRowIdentifierState: TableRowIdentifierState;
    rowIdentifierState: RowIdentifierState;
  }) => {
    const { tableRowIdentifierState, rowIdentifierState } = props;
    const applicationStore = useApplicationStore();
    const columnOptions = tableRowIdentifierState.table.columns
      .filter(filterByType(Column))
      .map((_c) => ({
        label: _c.name,
        value: _c,
      }));
    const changeColumn = (val: ColumnOption): void => {
      if (rowIdentifierState.column.name !== val.value.name) {
        const valueSpec =
          createMockPrimitiveValueSpecificationFromRelationalDataType(
            guaranteeNonNullable(rowIdentifierState.column.type),
            tableRowIdentifierState.connectionTestDataState.editorStore
              .graphManagerState.graph,
            tableRowIdentifierState.connectionTestDataState.editorStore
              .changeDetectionState.observerContext,
          );
        if (valueSpec) {
          rowIdentifierState.updateRowIdentifierValue(valueSpec);
          rowIdentifierState.updateRowIdentifierColumn(val.value);
        }
      }
    };

    const resetNode = (): void => {
      const valueSpec =
        createMockPrimitiveValueSpecificationFromRelationalDataType(
          guaranteeNonNullable(rowIdentifierState.column.type),
          tableRowIdentifierState.connectionTestDataState.editorStore
            .graphManagerState.graph,
          tableRowIdentifierState.connectionTestDataState.editorStore
            .changeDetectionState.observerContext,
        );
      if (valueSpec) {
        rowIdentifierState.updateRowIdentifierValue(valueSpec);
      }
    };

    return (
      <div className="panel__content__form__section__list">
        <div className="panel__content__form__section__list__new-item">
          <CustomSelectorInput
            className="service-editor__owner__selector"
            placeholder="Choose a column..."
            options={columnOptions}
            onChange={changeColumn}
            value={{
              label: rowIdentifierState.column.name,

              value: rowIdentifierState.column,
            }}
            darkMode={
              !applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
          />
          <BasicValueSpecificationEditor
            valueSpecification={rowIdentifierState.value}
            setValueSpecification={(val: ValueSpecification): void => {
              rowIdentifierState.updateRowIdentifierValue(val);
            }}
            graph={
              tableRowIdentifierState.connectionTestDataState.editorStore
                .graphManagerState.graph
            }
            observerContext={
              tableRowIdentifierState.connectionTestDataState.editorStore
                .changeDetectionState.observerContext
            }
            typeCheckOption={{
              expectedType: guaranteeNonNullable(
                getPrimitiveTypeFromRelationalType(
                  guaranteeNonNullable(rowIdentifierState.column.type),
                ),
              ),
            }}
            resetValue={resetNode}
          />
          <button
            className="btn--icon btn--dark btn--sm"
            onClick={(): void =>
              tableRowIdentifierState.removeRowIdentifierState(
                rowIdentifierState,
              )
            }
            tabIndex={-1}
            title={'Remove Row'}
          >
            <TimesIcon />
          </button>
        </div>
      </div>
    );
  },
);

export const TableRowIdentifierEditor = observer(
  (props: {
    connectionTestDataState: ConnectionTestDataState;
    tableRowIdentifierState: TableRowIdentifierState;
  }) => {
    const { connectionTestDataState, tableRowIdentifierState } = props;
    const applicationStore = useApplicationStore();
    const tables = connectionTestDataState.getAvailableTables();
    const tableOptions = tables.map((_t) => ({
      label: `${_t.schema.name}.${_t.name}`,
      value: _t,
    }));

    const changeTable = (val: TableOption): void => {
      if (tableRowIdentifierState.table !== val.value) {
        tableRowIdentifierState.updateTable(val.value);
        tableRowIdentifierState.setNewRowIdentifierState([]);
      }
    };
    const addNewRow = (): void => {
      tableRowIdentifierState.addNewRowIdentifierState(
        guaranteeNonNullable(
          tableRowIdentifierState.table.columns.filter(filterByType(Column))[0],
        ),
      );
    };
    return (
      <ModalBody className="lambda-parameter-values__modal__body">
        <div className="panel__content__form__section">
          <div className="panel__content__form__section__header__label">
            Table
          </div>
          <div className="panel__content__form__section__header__prompt">
            create seed data below based on root tables
          </div>
          <CustomSelectorInput
            placeholder="Choose a root table..."
            options={tableOptions}
            onChange={changeTable}
            value={{
              label: `${tableRowIdentifierState.table.schema.name}.${tableRowIdentifierState.table.name}`,

              value: tableRowIdentifierState.table,
            }}
            darkMode={
              !applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
          />
        </div>
        <div className="panel__content__form__section">
          <div className="panel__content__form__section__header__label">
            Seed Data
          </div>
          <div className="panel__content__form__section__header__prompt">
            create value for primary key column
          </div>
          {tableRowIdentifierState.rowIdentifierStates.map(
            (rowIdentifierState) => (
              <RowIdentifierEditor
                key={rowIdentifierState._UUID}
                tableRowIdentifierState={tableRowIdentifierState}
                rowIdentifierState={rowIdentifierState}
              />
            ),
          )}
          <div className="panel__content__form__section__list__new-item__add">
            <button
              className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
              onClick={addNewRow}
              tabIndex={-1}
              title="Add Seed Data for column"
            >
              Add Row
            </button>
          </div>
        </div>
      </ModalBody>
    );
  },
);

export const SeedDataInputModal = observer(
  (props: { connectionTestDataState: ConnectionTestDataState }) => {
    const { connectionTestDataState } = props;
    const applicationStore = useApplicationStore();
    const useSeedDataInputModal = connectionTestDataState.useSeedDataInputModal;
    const closeModal = (): void =>
      connectionTestDataState.setUseSeedDataInputModal(false);
    const generateWithSeedData = (): void => {
      closeModal();
      flowResult(connectionTestDataState.generateTestDataWithSeedData()).catch(
        applicationStore.alertUnhandledError,
      );
    };
    const addNewTable = (): void => {
      const tables = connectionTestDataState.getAvailableTables();
      if (tables[0]) {
        connectionTestDataState.addNewTableIdentifierState(tables[0]);
      }
    };

    return (
      <Dialog
        open={useSeedDataInputModal}
        onClose={closeModal}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className="editor-modal lambda-parameter-values__modal"
        >
          <ModalHeader title="Create Seed Data Input (BETA)" />
          <ModalBody className="lambda-parameter-values__modal__body">
            {connectionTestDataState.tableRowIdentifierStates.map(
              (tableRowIdentifierState) => (
                <TableRowIdentifierEditor
                  key={tableRowIdentifierState._UUID}
                  connectionTestDataState={connectionTestDataState}
                  tableRowIdentifierState={tableRowIdentifierState}
                />
              ),
            )}
            <button
              className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
              onClick={addNewTable}
              tabIndex={-1}
              title="Add Seed Data for table"
            >
              Add a Different Table
            </button>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              onClick={closeModal}
              text="Close"
              type="secondary"
            />
            <ModalFooterButton onClick={generateWithSeedData} text="Generate" />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

export const UseDataElementModal = observer(
  (props: { connectionTestDataState: ConnectionTestDataState }) => {
    const { connectionTestDataState } = props;
    const editorStore = connectionTestDataState.editorStore;
    const applicationStore = editorStore.applicationStore;
    const useSharedModal = connectionTestDataState.useSharedModal;
    const closeModal = (): void =>
      connectionTestDataState.setUseSharedModal(false);
    const dataElements =
      connectionTestDataState.editorStore.graphManagerState.graph.dataElements;
    const [dataElement, setDataElement] = useState(dataElements[0]);
    const dataElementOptions =
      editorStore.graphManagerState.usableDataElements.map(buildElementOption);
    const selectedDataElement = dataElement
      ? buildElementOption(dataElement)
      : null;
    const onDataElementChange = (val: {
      label: string;
      value?: DataElement;
    }): void => {
      if (val.value !== selectedDataElement?.value && val.value) {
        setDataElement(val.value);
      }
    };
    const change = (): void => {
      if (dataElement) {
        const value = new DataElementReference();
        value.dataElement =
          PackageableElementExplicitReference.create(dataElement);
        connectionTestDataState.changeEmbeddedData(value);
      }
      closeModal();
    };
    const isReadOnly =
      connectionTestDataState.testDataState.testSuiteState.testableState
        .serviceEditorState.isReadOnly;
    return (
      <Dialog
        open={useSharedModal}
        onClose={closeModal}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className="service-test-data-modal"
        >
          <ModalBody>
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Data Element
              </div>
              <div className="explorer__new-element-modal__driver">
                <CustomSelectorInput
                  className="panel__content__form__section__dropdown data-element-reference-editor__value__dropdown"
                  disabled={false}
                  options={dataElementOptions}
                  onChange={onDataElementChange}
                  value={selectedDataElement}
                  darkMode={
                    !applicationStore.layoutService
                      .TEMPORARY__isLightColorThemeEnabled
                  }
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              className="database-builder__action--btn"
              disabled={isReadOnly}
              onClick={change}
              title="Change to use Shared Data"
            >
              Change
            </ModalFooterButton>
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

export const ConnectionTestDataEditor = observer(
  (props: { connectionTestDataState: ConnectionTestDataState }) => {
    const { connectionTestDataState } = props;
    const applicationStore = useApplicationStore();
    const USER_ATTESTATION_MESSAGE =
      'Data generated has not been anonmyized. I attest that I am aware of the sensitive data leakage risk when using real data in tests.';
    const isReadOnly =
      connectionTestDataState.testDataState.testSuiteState.testableState
        .serviceEditorState.isReadOnly;
    const dataElements =
      connectionTestDataState.editorStore.graphManagerState.graph.dataElements;
    const openShared = (): void => {
      if (dataElements.length) {
        connectionTestDataState.setUseSharedModal(true);
      }
    };
    // test data
    const anonymizeGeneratedData =
      connectionTestDataState.anonymizeGeneratedData;
    const toggleAnonymizeGeneratedData = (): void => {
      connectionTestDataState.setAnonymizeGeneratedData(
        !anonymizeGeneratedData,
      );
    };
    const confirmGenerateUnAnonmyizedData = (): void => {
      applicationStore.alertService.setActionAlertInfo({
        message: USER_ATTESTATION_MESSAGE,
        type: ActionAlertType.CAUTION,
        actions: [
          {
            label: 'Accept',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler: applicationStore.guardUnhandledError(() =>
              flowResult(connectionTestDataState.generateTestData()),
            ),
          },
          {
            label: 'Decline',
            type: ActionAlertActionType.PROCEED,
            default: true,
          },
        ],
      });
    };

    const generateTestData = (): void => {
      if (!anonymizeGeneratedData) {
        confirmGenerateUnAnonmyizedData();
      } else {
        flowResult(connectionTestDataState.generateTestData()).catch(
          applicationStore.alertUnhandledError,
        );
      }
    };

    const generateTestDataWithSeedData = (): void => {
      connectionTestDataState.setUseSeedDataInputModal(true);
      connectionTestDataState.setNewTableIdentifierState([]);
      const table = getNullableFirstEntry(
        connectionTestDataState.getAvailableTables(),
      );
      if (table) {
        connectionTestDataState.addNewTableIdentifierState(table);
      }
    };

    const generateQuerySchemas = (): void => {
      flowResult(connectionTestDataState.generateQuerySchemas()).catch(
        applicationStore.alertUnhandledError,
      );
    };

    return (
      <div className="service-test-data-editor">
        <div className="service-test-suite-editor__header">
          <div className="service-test-suite-editor__header__title">
            <div className="service-test-suite-editor__header__title__label">
              data
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
            <div className="btn__dropdown-combo btn__dropdown-combo--primary">
              <button
                className="btn__dropdown-combo__label"
                onClick={generateTestData}
                title="Generate test data if possible"
                disabled={
                  connectionTestDataState.generatingTestDataState.isInProgress
                }
                tabIndex={-1}
              >
                <RefreshIcon className="btn__dropdown-combo__label__icon" />
                <div className="btn__dropdown-combo__label__title">
                  Generate
                </div>
              </button>
              <ControlledDropdownMenu
                className="btn__dropdown-combo__dropdown-btn"
                content={
                  <MenuContent>
                    <MenuContentItem
                      className="btn__dropdown-combo__option"
                      onClick={generateQuerySchemas}
                      disabled={
                        connectionTestDataState.generateSchemaQueryState
                          .isInProgress
                      }
                    >
                      Generate Query Schemas
                    </MenuContentItem>
                    <MenuContentItem
                      className="btn__dropdown-combo__option"
                      onClick={generateTestDataWithSeedData}
                      disabled={
                        connectionTestDataState
                          .generatingTestDataWithSeedDataState.isInProgress
                      }
                    >
                      Generate with Seed Data (Beta)
                    </MenuContentItem>
                  </MenuContent>
                }
                menuProps={{
                  anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                  transformOrigin: { vertical: 'top', horizontal: 'right' },
                }}
              >
                <CaretDownIcon />
              </ControlledDropdownMenu>
            </div>
            <button
              className="panel__header__action service-execution-editor__test-data__generate-btn"
              onClick={openShared}
              title="Use Shared Data via Defined Data Element"
              disabled={
                connectionTestDataState.generatingTestDataState.isInProgress ||
                !dataElements.length
              }
              tabIndex={-1}
            >
              <div className="service-execution-editor__test-data__generate-btn__label">
                <div className="service-execution-editor__test-data__generate-btn__label__title">
                  Shared Data
                </div>
              </div>
            </button>
          </div>
        </div>
        <EmbeddedDataEditor
          isReadOnly={isReadOnly}
          embeddedDataEditorState={connectionTestDataState.embeddedEditorState}
        />
        {connectionTestDataState.parametersState.parameterValuesEditorState
          .showModal && (
          <LambdaParameterValuesEditor
            graph={connectionTestDataState.editorStore.graphManagerState.graph}
            observerContext={
              connectionTestDataState.editorStore.changeDetectionState
                .observerContext
            }
            lambdaParametersState={connectionTestDataState.parametersState}
          />
        )}
        {connectionTestDataState.useSharedModal && (
          <UseDataElementModal
            connectionTestDataState={connectionTestDataState}
          />
        )}
        {connectionTestDataState.useSeedDataInputModal && (
          <SeedDataInputModal
            connectionTestDataState={connectionTestDataState}
          />
        )}
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
    const editorStore = useEditorStore();
    const applicationStore = editorStore.applicationStore;
    const dataElementOptions =
      editorStore.graphManagerState.usableDataElements.map(buildElementOption);
    const newConnectionState = testDataState.newConnectionDataState;
    const dataElement = newConnectionState.dataElement;
    const selectedDataElement = dataElement
      ? buildElementOption(dataElement)
      : null;
    const onDataElementChange = (val: {
      label: string;
      value?: DataElement;
    }): void => {
      if (val.value !== selectedDataElement?.value && val.value) {
        newConnectionState.setDataElement(val.value);
      }
    };
    const isReadOnly =
      testDataState.testSuiteState.testableState.serviceEditorState.isReadOnly;
    const service =
      testDataState.testSuiteState.testableState.serviceEditorState.service;
    const closeModal = (): void => newConnectionState.setModal(false);
    const allIdentifiedConnections =
      getAllIdentifiedServiceConnections(service);
    const connectionOptions = allIdentifiedConnections.map((e) => ({
      label: e.id,
      value: e,
    }));
    const selectedConnection = newConnectionState.connection
      ? {
          label: newConnectionState.connection.id,
          value: newConnectionState.connection,
        }
      : undefined;
    const isDisabled =
      isReadOnly ||
      !allIdentifiedConnections.length ||
      Boolean(
        testDataState.testData.connectionsTestData.find(
          (c) => c.connectionId === selectedConnection?.value.id,
        ),
      );
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
    const selectedEmbeddedType = newConnectionState.embeddedDataType
      ? {
          label: prettyCONSTName(newConnectionState.embeddedDataType.value),
          value: newConnectionState.embeddedDataType.value,
        }
      : undefined;
    const extraOptionTypes = editorStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSL_Data_LegendStudioApplicationPlugin_Extension
          ).getExtraEmbeddedDataTypeOptions?.() ?? [],
      );
    const embeddedOptions = [
      ...Object.values(EmbeddedDataType).map((typeOption) => ({
        label: prettyCONSTName(typeOption),
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
          onSubmit={(event) => {
            event.preventDefault();
            const connection = newConnectionState.connection;
            const data = newConnectionState.embeddedDataType;
            if (connection && data) {
              testDataState.createConnectionTestData();
              closeModal();
            }
          }}
          className="modal service-test-data-modal modal--dark"
        >
          <ModalHeader title="Create A Connection Test Data" />
          <ModalBody>
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Connection ID
              </div>
              <div className="panel__content__form__section__header__prompt">
                Connection in runtime to povide test data for
              </div>
              <div className="explorer__new-element-modal__driver">
                <CustomSelectorInput
                  className="explorer__new-element-modal__driver__dropdown"
                  options={connectionOptions}
                  onChange={onConnectionSelectionChange}
                  value={selectedConnection}
                  isClearable={false}
                  darkMode={
                    !applicationStore.layoutService
                      .TEMPORARY__isLightColorThemeEnabled
                  }
                />
              </div>
            </div>
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Data Type
              </div>
              <div className="panel__content__form__section__header__prompt">
                Test data type that will be loaded to your test connection
              </div>
              <div className="explorer__new-element-modal__driver">
                <CustomSelectorInput
                  className="explorer__new-element-modal__driver__dropdown"
                  options={embeddedOptions}
                  onChange={onEmbeddedTypeChange}
                  value={selectedEmbeddedType}
                  isClearable={false}
                  darkMode={
                    !applicationStore.layoutService
                      .TEMPORARY__isLightColorThemeEnabled
                  }
                />
              </div>
            </div>
            {selectedEmbeddedType?.value === EmbeddedDataType.DATA_ELEMENT && (
              <div className="panel__content__form__section">
                <div className="panel__content__form__section__header__label">
                  Data Element
                </div>
                <div className="explorer__new-element-modal__driver">
                  <CustomSelectorInput
                    className="panel__content__form__section__dropdown data-element-reference-editor__value__dropdown"
                    disabled={isReadOnly}
                    options={dataElementOptions}
                    onChange={onDataElementChange}
                    value={selectedDataElement}
                    darkMode={
                      !applicationStore.layoutService
                        .TEMPORARY__isLightColorThemeEnabled
                    }
                  />
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              onClick={closeModal}
              text="Cancel"
              type="secondary"
              preventFormSubmit={true} // prevent this toggler being activated on form submission
            />
            <ModalFooterButton text="Create" disabled={isDisabled} />
          </ModalFooter>
        </form>
      </Dialog>
    );
  },
);

export const ServiceTestDataEditor = observer(
  (props: { testDataState: ServiceTestDataState }) => {
    const { testDataState } = props;
    const applicationStore = useApplicationStore();
    const testData = testDataState.testData;
    const newConnectionDataState = testDataState.newConnectionDataState;
    const identifedConnections = getAllIdentifiedServiceConnections(
      testDataState.testSuiteState.testableState.service,
    );
    const selectedDataState = testDataState.selectedDataState;
    const hideExplorer =
      identifedConnections.length === 1 &&
      testData.connectionsTestData.length === 1 &&
      testData.connectionsTestData[0]?.connectionId ===
        identifedConnections[0]?.id;
    const addConnectionTestData = (): void => {
      testDataState.newConnectionDataState.openModal();
    };
    const seeDocumentation = (): void =>
      applicationStore.assistantService.openDocumentationEntry(
        LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_HOW_TO_WRITE_SERVICE_CONNECTION_TEST_DATA,
      );
    return (
      <div className="service-test-data-editor panel">
        <div className="service-test-suite-editor__header">
          <div className="service-test-suite-editor__header__title">
            <div className="service-test-suite-editor__header__title__label service-test-suite-editor__header__title__label--data">
              Test DATA
            </div>
          </div>
        </div>
        <div className="service-test-data-editor__data">
          {!testData.connectionsTestData.length && (
            <BlankPanelPlaceholder
              text="Add Connection Test Data"
              onClick={addConnectionTestData}
              clickActionType="add"
              tooltipText="Click to add connection test data"
            />
          )}
          <PanelLoadingIndicator
            isLoading={
              Boolean(
                testDataState.selectedDataState?.generatingTestDataState
                  .isInProgress,
              ) ||
              Boolean(
                testDataState.selectedDataState?.generateSchemaQueryState
                  .isInProgress,
              ) ||
              Boolean(
                testDataState.selectedDataState
                  ?.generatingTestDataWithSeedDataState.isInProgress,
              )
            }
          />
          {hideExplorer && selectedDataState ? (
            <>
              <ConnectionTestDataEditor
                connectionTestDataState={selectedDataState}
              />
            </>
          ) : (
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel minSize={100}>
                <div className="binding-editor__header">
                  <div className="binding-editor__header__title">
                    <div className="binding-editor__header__title__label">
                      connections
                      <button
                        className="binding-editor__header__title__label__hint"
                        tabIndex={-1}
                        onClick={seeDocumentation}
                        title="click to see more details on connection test data"
                      >
                        <InfoCircleIcon />
                      </button>
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
          )}
        </div>
      </div>
    );
  },
);
