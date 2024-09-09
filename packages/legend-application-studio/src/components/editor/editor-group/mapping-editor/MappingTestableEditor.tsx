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
  type Class,
  type MappingTestSuite,
  type Store,
  type DataElement,
  type EmbeddedData,
  ModelStore,
  Database,
  getMappingCompatibleClasses,
  isStubbed_RawLambda,
  stub_RawLambda,
  MappingTest,
  PackageableElementExplicitReference,
  DataElementReference,
  RelationalCSVData,
  ModelStoreData,
  ExternalFormatData,
  ModelEmbeddedData,
} from '@finos/legend-graph';
import { forwardRef, useEffect, useRef, useState } from 'react';
import {
  BlankPanelPlaceholder,
  CaretDownIcon,
  clsx,
  compareLabelFn,
  CustomSelectorInput,
  Dialog,
  ControlledDropdownMenu,
  MenuContent,
  MenuContentItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalTitle,
  PanelContent,
  PanelFormTextField,
  PencilIcon,
  PlusIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  RunAllIcon,
  RunErrorsIcon,
  type SelectComponent,
  PanelLoadingIndicator,
  ContextMenu,
  ModalHeader,
  PanelFormSection,
  PlayIcon,
} from '@finos/legend-art';
import {
  assertErrorThrown,
  filterByType,
  prettyCONSTName,
  returnUndefOnError,
  uniq,
} from '@finos/legend-shared';
import type {
  StoreTestDataState,
  MappingTestableState,
  MappingTestState,
  MappingTestSuiteState,
  CreateSuiteState,
} from '../../../../stores/editor/editor-state/element-editor-state/mapping/testable/MappingTestableState.js';
import {
  useApplicationNavigationContext,
  useApplicationStore,
} from '@finos/legend-application';
import { flowResult } from 'mobx';
import {
  ExecutionPlanViewer,
  QueryBuilderTextEditorMode,
  type QueryBuilderState,
} from '@finos/legend-query-builder';
import { MappingExecutionQueryBuilderState } from '../../../../stores/editor/editor-state/element-editor-state/mapping/MappingExecutionQueryBuilderState.js';
import {
  CODE_EDITOR_LANGUAGE,
  CodeEditor,
} from '@finos/legend-lego/code-editor';
import { atomicTest_setDoc } from '../../../../stores/graph-modifier/Testable_GraphModifierHelper.js';
import {
  RenameModal,
  SharedDataElementModal,
  TestAssertionEditor,
} from '../testable/TestableSharedComponents.js';
import { EmbeddedDataEditor } from '../data-editor/EmbeddedDataEditor.js';
import {
  TESTABLE_RESULT,
  getTestableResultFromTestResult,
  getTestableResultFromTestResults,
} from '../../../../stores/editor/sidebar-state/testable/GlobalTestRunnerState.js';
import { getTestableResultIcon } from '../../side-bar/testable/GlobalTestRunner.js';
import {
  EmbeddedDataCreatorFromEmbeddedData,
  validateTestableId,
} from '../../../../stores/editor/utils/TestableUtils.js';
import { getMappingStores } from '../../../../stores/editor/editor-state/element-editor-state/mapping/MappingEditorState.js';
import type { DSL_Data_LegendStudioApplicationPlugin_Extension } from '../../../../stores/extensions/DSL_Data_LegendStudioApplicationPlugin_Extension.js';
import { EmbeddedDataType } from '../../../../stores/editor/editor-state/ExternalFormatState.js';
import type { EmbeddedDataTypeOption } from '../../../../stores/editor/editor-state/element-editor-state/data/DataEditorState.js';
import {
  buildElementOption,
  getPackageableElementOptionFormatter,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../__lib__/LegendStudioApplicationNavigationContext.js';
import {
  TestExecutionPlanDebugState,
  TestUnknownDebugState,
  type TestableDebugTestResultState,
} from '../../../../stores/editor/editor-state/element-editor-state/testable/TestableEditorState.js';

interface ClassSelectOption {
  label: string;
  value: Class;
}

const CreateTestSuiteModal = observer(
  (props: { creatorState: CreateSuiteState }) => {
    const { creatorState } = props;
    const mappingTestableState = creatorState.mappingTestableState;
    const mappingEditorState = mappingTestableState.mappingEditorState;
    const mapping = mappingEditorState.mapping;
    const editorStore = mappingEditorState.editorStore;
    const applicationStore = editorStore.applicationStore;
    // Class mapping selector
    const compatibleClasses = getMappingCompatibleClasses(
      mapping,
      editorStore.graphManagerState.usableClasses,
    );
    const inputRef = useRef<HTMLInputElement>(null);
    const handleEnter = (): void => inputRef.current?.focus();
    const mappedClassOptions = uniq(compatibleClasses)
      .map((e) => ({
        label: e.name,
        value: e,
      }))
      .sort(compareLabelFn);
    const [selectedClass, setSelectedClass] = useState<Class | undefined>(
      compatibleClasses[0],
    );
    const selectedClassOption = selectedClass
      ? {
          value: selectedClass,
          label: selectedClass.name,
        }
      : null;
    // init states
    const [suiteName, setSuiteName] = useState<string | undefined>(undefined);
    const [testName, setTestName] = useState<string | undefined>(undefined);
    const isValid = selectedClass && suiteName && testName;
    const changeClassOption = (val: ClassSelectOption | null): void => {
      if (val?.value) {
        setSelectedClass(val.value);
      } else {
        setSelectedClass(undefined);
      }
    };
    // model
    const close = (): void => mappingTestableState.closeCreateModal();
    const create = (): void => {
      if (selectedClass && suiteName && testName) {
        flowResult(
          creatorState.createAndAddTestSuite(
            selectedClass,
            suiteName,
            testName,
          ),
        ).catch(editorStore.applicationStore.alertUnhandledError);
      }
    };

    return (
      <Dialog
        open={true}
        onClose={close}
        TransitionProps={{
          onEnter: handleEnter,
        }}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        >
          <ModalHeader>
            <ModalTitle title="Create Mapping Test Suite" />
          </ModalHeader>
          <ModalBody>
            <PanelLoadingIndicator
              className="panel-loading-indicator--in__modal"
              isLoading={creatorState.isCreatingSuiteState.isInProgress}
            />
            {creatorState.isCreatingSuiteState.message && (
              <PanelFormSection>
                <div className="service-registration-editor__progress-msg">
                  {`${creatorState.isCreatingSuiteState.message}...`}
                </div>
              </PanelFormSection>
            )}
            <PanelFormTextField
              ref={inputRef}
              name="Test Suite Name"
              prompt="Unique Identifier for Test suite i.e Person_suite"
              value={suiteName}
              placeholder="Suite Name"
              update={(value: string | undefined): void =>
                setSuiteName(value ?? '')
              }
              errorMessage={validateTestableId(suiteName, undefined)}
            />
            <PanelFormTextField
              name="Test Name"
              prompt="Unique Identifier for first test in suite"
              placeholder="Test Name"
              value={testName}
              update={(value: string | undefined): void =>
                setTestName(value ?? '')
              }
              errorMessage={validateTestableId(testName, undefined)}
            />
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Class Mapping
              </div>
              <div className="panel__content__form__section__header__prompt">
                Mapped Class for which you would like to build test suite for
              </div>
              <CustomSelectorInput
                options={mappedClassOptions}
                onChange={changeClassOption}
                value={selectedClassOption}
                formatOptionLabel={getPackageableElementOptionFormatter({})}
                darkMode={
                  !applicationStore.layoutService
                    .TEMPORARY__isLightColorThemeEnabled
                }
                placeholder="Choose a class..."
                isClearable={true}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              disabled={
                !isValid || creatorState.isCreatingSuiteState.isInProgress
              }
              title={
                !isValid
                  ? 'Suite Name and Test Name Required'
                  : 'Create Test Suite'
              }
              onClick={create}
              text="Create"
            />
            <ModalFooterButton onClick={close} text="Close" type="secondary" />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

const CreateTestModal = observer(
  (props: { mappingSuiteState: MappingTestSuiteState }) => {
    const { mappingSuiteState } = props;
    const mapping = mappingSuiteState.mappingTestableState.mapping;
    const suite = mappingSuiteState.suite;
    const testData = suite.tests.filter(filterByType(MappingTest))[0]
      ?.storeTestData[0];
    const editorStore = mappingSuiteState.editorStore;
    const applicationStore = editorStore.applicationStore;
    // test name
    const [id, setId] = useState<string | undefined>(undefined);
    const isValid = id && !id.includes(' ');
    const errorMessage = validateTestableId(
      id,
      suite.tests.map((t) => t.id),
    );
    const mappedClassSelectorRef = useRef<SelectComponent>(null);

    // const firstTest = mapp
    // Class mapping selector
    const compatibleClasses = getMappingCompatibleClasses(
      mapping,
      editorStore.graphManagerState.usableClasses,
    );
    const mappedClassOptions = uniq(compatibleClasses)
      .map((e) => ({
        label: e.name,
        value: e,
      }))
      .sort(compareLabelFn);

    // class if required
    const [selectedClass, setSelectedClass] = useState<Class | undefined>(
      compatibleClasses[0],
    );
    const changeClassOption = (val: ClassSelectOption | null): void => {
      setSelectedClass(val?.value);
    };
    const selectedClassOption = selectedClass
      ? {
          value: selectedClass,
          label: selectedClass.name,
        }
      : null;
    // model
    const close = (): void => mappingSuiteState.setShowModal(false);
    const create = (): void => {
      if (id) {
        mappingSuiteState.addNewTest(id, selectedClass);
        close();
      }
    };

    return (
      <Dialog
        open={mappingSuiteState.showCreateModal}
        onClose={close}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        >
          <ModalHeader>
            <ModalTitle title="Create Mapping Test" />
          </ModalHeader>
          <ModalBody>
            <PanelFormTextField
              name="Name"
              prompt=""
              value={id}
              update={(value: string | undefined): void => setId(value ?? '')}
              errorMessage={errorMessage}
            />
            {!testData && (
              <div className="panel__content__form__section">
                <div className="panel__content__form__section__header__label">
                  Class Mapping
                </div>
                <div className="panel__content__form__section__header__prompt">
                  Mapped Class for which you would like to build test suite for
                </div>
                <CustomSelectorInput
                  ref={mappedClassSelectorRef}
                  options={mappedClassOptions}
                  onChange={changeClassOption}
                  value={selectedClassOption}
                  darkMode={
                    !applicationStore.layoutService
                      .TEMPORARY__isLightColorThemeEnabled
                  }
                  placeholder="Choose a class..."
                  isClearable={true}
                />
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              disabled={!isValid}
              onClick={create}
              text="Create"
            />
            <ModalFooterButton onClick={close} text="Close" type="secondary" />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

interface StoreSelectOption {
  label: string;
  value: Store;
}

const CreateStoreTestDataModal = observer(
  (props: { mappingTestState: MappingTestState }) => {
    const { mappingTestState } = props;
    const mappingTestableDataState = mappingTestState.dataState;
    const editorStore = mappingTestableDataState.editorStore;
    const applicationStore = editorStore.applicationStore;
    const mapping = mappingTestableDataState.mappingTestableState.mapping;
    const isReadOnly =
      mappingTestableDataState.mappingTestableState.mappingEditorState
        .isReadOnly;
    // options
    const dataElementOptions =
      editorStore.graphManagerState.usableDataElements.map(buildElementOption);
    const extraOptionTypes = editorStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSL_Data_LegendStudioApplicationPlugin_Extension
          ).getExtraEmbeddedDataTypeOptions?.() ?? [],
      );
    const embeddedOptions = [
      ...Object.values(EmbeddedDataType)
        .filter(
          (e) =>
            e !== EmbeddedDataType.DATA_ELEMENT || dataElementOptions.length,
        )
        .map((typeOption) => ({
          label: prettyCONSTName(typeOption),
          value: typeOption,
        })),
      ...extraOptionTypes,
    ];
    const getDefaultTypeFromStore = (
      _store: Store | undefined,
    ): string | undefined => {
      if (_store instanceof ModelStore) {
        return EmbeddedDataType.EXTERNAL_FORMAT_DATA;
      } else if (_store instanceof Database) {
        return EmbeddedDataType.RELATIONAL_CSV;
      }
      return undefined;
    };
    const compatibleStores = Array.from(
      getMappingStores(
        mapping,
        editorStore.pluginManager.getApplicationPlugins(),
      ),
    );
    // set states
    const [selectedStore, setSelectedStore] = useState<Store | undefined>(
      compatibleStores[0],
    );

    const [embeddedDataType, setEmbeddedDataType] = useState<
      string | undefined
    >(getDefaultTypeFromStore(selectedStore) ?? embeddedOptions[0]?.value);
    // data reference
    const [dataElement, setDataElement] = useState<DataElement | undefined>(
      dataElementOptions[0]?.value,
    );
    const selectedDataElement = dataElement
      ? buildElementOption(dataElement)
      : null;
    const onDataElementChange = (
      val: PackageableElementOption<DataElement> | null,
    ): void => {
      setDataElement(val?.value);
    };
    // data type
    const onEmbeddedTypeChange = (val: EmbeddedDataTypeOption | null): void => {
      setEmbeddedDataType(val?.value);
    };
    const embeddedDataTypeOption = embeddedDataType
      ? {
          value: embeddedDataType,
          label: prettyCONSTName(embeddedDataType),
        }
      : undefined;
    // store
    const mappedStoreRef = useRef<SelectComponent>(null);
    const selectedStoreOptions = compatibleStores
      .map((e) => ({
        label: e.name,
        value: e,
      }))
      .sort(compareLabelFn);

    const selectedStoreOption = selectedStore
      ? {
          value: selectedStore,
          label: selectedStore.name,
        }
      : null;
    const changeStoreOption = (val: StoreSelectOption | null): void => {
      setSelectedStore(val?.value);
      const store = val?.value;
      if (store instanceof ModelStore) {
        setEmbeddedDataType(EmbeddedDataType.EXTERNAL_FORMAT_DATA);
      } else if (store instanceof Database) {
        setEmbeddedDataType(EmbeddedDataType.RELATIONAL_CSV);
      }
    };
    // validation
    const isValid =
      (Boolean(selectedStore) && Boolean(embeddedDataType)) ||
      (embeddedDataType === EmbeddedDataType.DATA_ELEMENT && dataElement);
    const close = (): void => mappingTestableDataState.setShowModal(false);
    const create = (): void => {
      if (selectedStore && embeddedDataType) {
        mappingTestableDataState.addStoreTestData(
          selectedStore,
          embeddedDataType,
          dataElement,
        );
        close();
      }
    };
    return (
      <Dialog
        open={mappingTestableDataState.showNewModal}
        onClose={close}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className="search-modal"
        >
          <ModalTitle title="Create Store Test Data" />
          <ModalBody>
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Store to add test data
              </div>
              <CustomSelectorInput
                ref={mappedStoreRef}
                options={selectedStoreOptions}
                onChange={changeStoreOption}
                formatOptionLabel={getPackageableElementOptionFormatter({})}
                value={selectedStoreOption}
                darkMode={
                  !applicationStore.layoutService
                    .TEMPORARY__isLightColorThemeEnabled
                }
                placeholder="Choose a store..."
                isClearable={true}
              />
            </div>
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Data Type
              </div>
              <div className="panel__content__form__section__header__prompt">
                Test data type that will be used to mock store (defaulted based
                on store)
              </div>
              <div className="explorer__new-element-modal__driver">
                <CustomSelectorInput
                  className="explorer__new-element-modal__driver__dropdown"
                  options={embeddedOptions}
                  onChange={onEmbeddedTypeChange}
                  value={embeddedDataTypeOption}
                  isClearable={false}
                  darkMode={
                    !applicationStore.layoutService
                      .TEMPORARY__isLightColorThemeEnabled
                  }
                />
              </div>
            </div>
            {embeddedDataType === EmbeddedDataType.DATA_ELEMENT && (
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
              disabled={!isValid}
              onClick={create}
              text="Create"
            />
            <ModalFooterButton onClick={close} text="Close" type="secondary" />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

const MappingTestSuiteQueryEditor = observer(
  (props: {
    testSuiteState: MappingTestSuiteState;
    mappingTestableState: MappingTestableState;
    isReadOnly: boolean;
  }) => {
    const { testSuiteState, mappingTestableState, isReadOnly } = props;
    const testableQueryState = testSuiteState.queryState;
    const mapping = mappingTestableState.mapping;
    const editorStore = mappingTestableState.mappingEditorState.editorStore;
    const applicationStore = useApplicationStore();

    // actions
    const editWithQueryBuilder = (openInTextMode = false): (() => void) =>
      applicationStore.guardUnhandledError(async () => {
        const embeddedQueryBuilderState = editorStore.embeddedQueryBuilderState;
        await flowResult(
          embeddedQueryBuilderState.setEmbeddedQueryBuilderConfiguration({
            setupQueryBuilderState: async (): Promise<QueryBuilderState> => {
              const queryBuilderState = new MappingExecutionQueryBuilderState(
                embeddedQueryBuilderState.editorStore.applicationStore,
                embeddedQueryBuilderState.editorStore.graphManagerState,
                mapping,
                editorStore.applicationStore.config.options.queryBuilderConfig,
                editorStore.editorMode.getSourceInfo(),
              );
              queryBuilderState.initializeWithQuery(testableQueryState.query);
              if (openInTextMode) {
                queryBuilderState.textEditorState.openModal(
                  QueryBuilderTextEditorMode.TEXT,
                );
              }
              return queryBuilderState;
            },
            actionConfigs: [
              {
                key: 'save-query-btn',
                renderer: (
                  queryBuilderState: QueryBuilderState,
                ): React.ReactNode => {
                  const save = applicationStore.guardUnhandledError(
                    async (): Promise<void> => {
                      try {
                        const rawLambda = queryBuilderState.buildQuery();
                        await flowResult(
                          testableQueryState.updateLamba(rawLambda),
                        );
                        applicationStore.notificationService.notifySuccess(
                          `Mapping testable query is updated`,
                        );
                        embeddedQueryBuilderState.setEmbeddedQueryBuilderConfiguration(
                          undefined,
                        );
                      } catch (error) {
                        assertErrorThrown(error);
                        applicationStore.notificationService.notifyError(
                          `Can't save query: ${error.message}`,
                        );
                      }
                    },
                  );
                  return (
                    <button
                      className="query-builder__dialog__header__custom-action"
                      tabIndex={-1}
                      disabled={isReadOnly}
                      onClick={save}
                    >
                      Save Query
                    </button>
                  );
                },
              },
            ],
            disableCompile: isStubbed_RawLambda(testableQueryState.query),
          }),
        );
      });

    const clearQuery = applicationStore.guardUnhandledError(() =>
      flowResult(testableQueryState.updateLamba(stub_RawLambda())),
    );

    // debug
    const disableDebug = !testSuiteState.selectTestState;
    const debugQuery = (): void => {
      flowResult(testSuiteState.debug()).catch(
        testSuiteState.editorStore.applicationStore.alertUnhandledError,
      );
    };
    const debugState = testSuiteState.selectTestState?.debugTestResultState;
    const renderDebug = (
      val: TestableDebugTestResultState,
    ): React.ReactNode => {
      const closeDebug = (): void =>
        testSuiteState.selectTestState?.setDebugState(undefined);
      if (val instanceof TestExecutionPlanDebugState) {
        return (
          <ExecutionPlanViewer executionPlanState={val.executionPlanState} />
        );
      }
      if (val instanceof TestUnknownDebugState) {
        return (
          <Dialog
            open={Boolean(debugState)}
            onClose={closeDebug}
            classes={{
              root: 'editor-modal__root-container',
              container: 'editor-modal__container',
              paper: 'editor-modal__content',
            }}
          >
            <Modal
              className={clsx('editor-modal query-builder-text-mode__modal')}
            >
              <ModalHeader>
                <div className="modal__title">{`Debug`}</div>
              </ModalHeader>
              <ModalBody>
                <div
                  className={clsx('query-builder-text-mode__modal__content')}
                >
                  <CodeEditor
                    language={CODE_EDITOR_LANGUAGE.JSON}
                    inputValue={JSON.stringify(val.testDebug.value)}
                    isReadOnly={true}
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <ModalFooterButton onClick={closeDebug} type="primary">
                  Close
                </ModalFooterButton>
              </ModalFooter>
            </Modal>
          </Dialog>
        );
      }
      return null;
    };
    return (
      <div className="panel mapping-test-editor__query-panel">
        <PanelLoadingIndicator
          isLoading={Boolean(
            testSuiteState.selectTestState?.debuggingTestAction.isInProgress,
          )}
        />
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">query</div>
          </div>
          <div className="panel__header__actions">
            <div className="btn__dropdown-combo">
              <button
                className="btn__dropdown-combo__label"
                onClick={editWithQueryBuilder()}
                title="Edit Query"
                tabIndex={-1}
              >
                <PencilIcon className="btn__dropdown-combo__label__icon" />
                <div className="btn__dropdown-combo__label__title">
                  Edit Query
                </div>
              </button>
              <ControlledDropdownMenu
                className="btn__dropdown-combo__dropdown-btn"
                content={
                  <MenuContent>
                    <MenuContentItem
                      className="btn__dropdown-combo__option"
                      onClick={editWithQueryBuilder(true)}
                    >
                      Text Mode
                    </MenuContentItem>
                    <MenuContentItem
                      className="btn__dropdown-combo__option"
                      onClick={clearQuery}
                    >
                      Clear Query
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
            <div className="btn__dropdown-combo btn__dropdown-combo--primary">
              <button
                className="btn__dropdown-combo__label"
                onClick={debugQuery}
                title="Debug Test With Exec Plan"
                disabled={disableDebug}
                tabIndex={-1}
              >
                <PlayIcon className="btn__dropdown-combo__label__icon" />
                <div className="btn__dropdown-combo__label__title">Debug</div>
              </button>
            </div>
          </div>
        </div>
        {!isStubbed_RawLambda(testableQueryState.query) && (
          <PanelContent>
            <div className="mapping-test-editor__query-panel__query">
              <CodeEditor
                inputValue={testableQueryState.lambdaString}
                isReadOnly={true}
                language={CODE_EDITOR_LANGUAGE.PURE}
                hideMinimap={true}
              />
            </div>
          </PanelContent>
        )}
        {debugState && renderDebug(debugState)}
      </div>
    );
  },
);

const StoreTestDataEditor = observer(
  (props: {
    mappingTestState: MappingTestState;
    storeTestDataState: StoreTestDataState;
  }) => {
    const { mappingTestState, storeTestDataState } = props;
    const isReadOnly =
      mappingTestState.mappingTestableState.mappingEditorState.isReadOnly;
    const dataElements =
      storeTestDataState.editorStore.graphManagerState.graph.dataElements;
    const currentData = storeTestDataState.storeTestData.data;
    const isUsingReference = currentData instanceof DataElementReference;
    const open = (): void => storeTestDataState.setDataElementModal(true);
    const close = (): void => storeTestDataState.setDataElementModal(false);
    const changeToUseMyOwn = (): void => {
      if (isUsingReference) {
        const newBare = returnUndefOnError(() =>
          currentData.accept_EmbeddedDataVisitor(
            new EmbeddedDataCreatorFromEmbeddedData(
              mappingTestState.editorStore,
            ),
          ),
        );
        if (newBare) {
          storeTestDataState.changeEmbeddedData(newBare);
        }
      }
    };

    const sharedDataHandler = (val: DataElement): void => {
      const dataRef = new DataElementReference();
      dataRef.dataElement = PackageableElementExplicitReference.create(val);
      const dataElementValue = val.data;
      let embeddedData: EmbeddedData = dataRef;
      if (
        currentData instanceof ModelStoreData &&
        dataElementValue instanceof ExternalFormatData
      ) {
        const modelStoreVal = currentData.modelData?.[0];
        if (modelStoreVal instanceof ModelEmbeddedData) {
          const newModelEmbeddedData = new ModelEmbeddedData();
          newModelEmbeddedData.model =
            PackageableElementExplicitReference.create(
              modelStoreVal.model.value,
            );

          newModelEmbeddedData.data = dataRef;
          const modelStoreData = new ModelStoreData();
          modelStoreData.modelData = [newModelEmbeddedData];
          embeddedData = modelStoreData;
        }
      }
      storeTestDataState.changeEmbeddedData(embeddedData);
    };
    const filter = (val: DataElement): boolean => {
      const dataElementData = val.data;
      if (currentData instanceof RelationalCSVData) {
        if (dataElementData instanceof RelationalCSVData) {
          return true;
        }
        return false;
      } else if (currentData instanceof ModelStoreData) {
        if (
          dataElementData instanceof ExternalFormatData ||
          dataElementData instanceof ModelStoreData
        ) {
          return true;
        }
        return false;
      }
      // TODO add extensions
      return true;
    };
    return (
      <div className="service-test-data-editor">
        <div className="service-test-suite-editor__header">
          <div className="service-test-suite-editor__header__title">
            <div className="service-test-suite-editor__header__title__label">
              input data
            </div>
          </div>
          <div className="panel__header__actions">
            {isUsingReference ? (
              <button
                className="panel__header__action service-execution-editor__test-data__generate-btn"
                onClick={changeToUseMyOwn}
                disabled={!isUsingReference}
                title="Use own data"
                tabIndex={-1}
              >
                <div className="service-execution-editor__test-data__generate-btn__label">
                  <div className="service-execution-editor__test-data__generate-btn__label__title">
                    Own Data
                  </div>
                </div>
              </button>
            ) : (
              <button
                className="panel__header__action service-execution-editor__test-data__generate-btn"
                onClick={open}
                title="Use Shared Data via Defined Data Element"
                disabled={!dataElements.length}
                tabIndex={-1}
              >
                <div className="service-execution-editor__test-data__generate-btn__label">
                  <div className="service-execution-editor__test-data__generate-btn__label__title">
                    Shared Data
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>

        {storeTestDataState.dataElementModal && (
          <SharedDataElementModal
            isReadOnly={false}
            editorStore={storeTestDataState.editorStore}
            close={close}
            filterBy={filter}
            handler={sharedDataHandler}
          />
        )}
        <EmbeddedDataEditor
          isReadOnly={isReadOnly}
          embeddedDataEditorState={storeTestDataState.embeddedEditorState}
        />
      </div>
    );
  },
);

const MappingTestEditor = observer(
  (props: { mappingTestState: MappingTestState }) => {
    const { mappingTestState } = props;
    const mappingTest = mappingTestState.test;
    const mappingTestableDataState = mappingTestState.dataState;
    const addStoreTestData = (): void => {
      mappingTestableDataState.setShowModal(true);
    };

    return (
      <div className="service-test-editor panel">
        <div className="panel mapping-testable-editor">
          <div className="mapping-testable-editor__content">
            <ResizablePanelGroup orientation="horizontal">
              <ResizablePanel size={120}>
                <div className="service-test-data-editor panel">
                  <div className="service-test-editor__setup__configuration">
                    <div className="panel__content__form__section">
                      <div className="panel__content__form__section__header__label">
                        Test Documentation
                      </div>
                      <textarea
                        className="panel__content__form__section__textarea mapping-testable-editor__doc__textarea"
                        spellCheck={false}
                        value={mappingTest.doc ?? ''}
                        onChange={(event) => {
                          atomicTest_setDoc(
                            mappingTest,
                            event.target.value ? event.target.value : undefined,
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>
              </ResizablePanel>
              <ResizablePanelSplitter>
                <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
              </ResizablePanelSplitter>
              <ResizablePanel>
                <ResizablePanelGroup orientation="vertical">
                  <ResizablePanel>
                    <div className="service-test-data-editor panel">
                      {mappingTestableDataState.dataHolder.storeTestData
                        .length ? (
                        <>
                          {mappingTestableDataState.selectedDataState && (
                            <StoreTestDataEditor
                              storeTestDataState={
                                mappingTestableDataState.selectedDataState
                              }
                              mappingTestState={mappingTestState}
                            />
                          )}
                        </>
                      ) : (
                        <BlankPanelPlaceholder
                          text="Add Store Test Data"
                          onClick={addStoreTestData}
                          clickActionType="add"
                          tooltipText="Click to add store test data"
                        />
                      )}
                      {mappingTestableDataState.showNewModal && (
                        <CreateStoreTestDataModal
                          mappingTestState={mappingTestState}
                        />
                      )}
                    </div>
                  </ResizablePanel>
                  <ResizablePanelSplitter>
                    <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
                  </ResizablePanelSplitter>
                  <ResizablePanel>
                    {mappingTestState.selectedAsertionState && (
                      <TestAssertionEditor
                        testAssertionState={
                          mappingTestState.selectedAsertionState
                        }
                      />
                    )}
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      </div>
    );
  },
);

const MappingTestableContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      addName?: string;
      _delete?: () => void;
      rename?: () => void;
      add?: () => void;
    }
  >(function TestContainerContextMenu(props, ref) {
    const { addName, add, rename, _delete } = props;
    const addTest = (): void => {
      add?.();
    };
    const remove = (): void => _delete?.();
    const handleRename = (): void => rename?.();
    return (
      <MenuContent ref={ref}>
        {rename && (
          <MenuContentItem onClick={handleRename}>Rename</MenuContentItem>
        )}
        {_delete && <MenuContentItem onClick={remove}>Delete</MenuContentItem>}
        {addName && rename && (
          <MenuContentItem
            onClick={addTest}
          >{`Add ${addName}`}</MenuContentItem>
        )}
      </MenuContent>
    );
  }),
);

const MappingTestItem = observer(
  (props: {
    suiteState: MappingTestSuiteState;
    mappingTestState: MappingTestState;
  }) => {
    const { mappingTestState, suiteState } = props;
    const mappingTest = mappingTestState.test;
    const isRunning = mappingTestState.runningTestAction.isInProgress;
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const isReadOnly =
      suiteState.mappingTestableState.mappingEditorState.isReadOnly;
    const openTest = (): void => suiteState.changeTest(mappingTest);
    const isActive = suiteState.selectTestState?.test === mappingTest;
    const _testableResult = getTestableResultFromTestResult(
      mappingTestState.testResultState.result,
    );
    const testableResult = isRunning
      ? TESTABLE_RESULT.IN_PROGRESS
      : _testableResult;
    const resultIcon = getTestableResultIcon(testableResult);
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);
    const add = (): void => {
      suiteState.setShowModal(true);
    };
    const _delete = (): void => {
      suiteState.deleteTest(mappingTest);
    };

    const rename = (): void => {
      suiteState.mappingTestableState.setRenameComponent(mappingTest);
    };
    const runTest = (): void => {
      flowResult(mappingTestState.runTest()).catch(
        mappingTestState.editorStore.applicationStore.alertUnhandledError,
      );
    };
    return (
      <ContextMenu
        className={clsx(
          'testable-test-explorer__item',
          {
            'testable-test-explorer__item--selected-from-context-menu':
              !isActive && isSelectedFromContextMenu,
          },
          { 'testable-test-explorer__item--active': isActive },
        )}
        disabled={isReadOnly}
        content={
          <MappingTestableContextMenu
            addName="Test"
            add={add}
            _delete={_delete}
            rename={rename}
          />
        }
        menuProps={{ elevation: 7 }}
        onOpen={onContextMenuOpen}
        onClose={onContextMenuClose}
      >
        <button
          className={clsx('testable-test-explorer__item__label')}
          onClick={openTest}
          tabIndex={-1}
        >
          <div className="testable-test-explorer__item__label__icon">
            {resultIcon}
          </div>
          <div className="testable-test-explorer__item__label__text">
            {mappingTest.id}
          </div>
          <div className="mapping-test-explorer__item__actions">
            <button
              className="mapping-test-explorer__item__action mapping-test-explorer__run-test-btn"
              onClick={runTest}
              disabled={mappingTestState.runningTestAction.isInProgress}
              tabIndex={-1}
              title={`Run ${mappingTestState.test.id}`}
            >
              {<PlayIcon />}
            </button>
          </div>
        </button>
      </ContextMenu>
    );
  },
);

const MappingTestSuiteEditor = observer(
  (props: { mappingTestSuiteState: MappingTestSuiteState }) => {
    const { mappingTestSuiteState } = props;
    const editorStore = mappingTestSuiteState.editorStore;
    const selectedTestState = mappingTestSuiteState.selectTestState;
    const isReadOnly =
      mappingTestSuiteState.mappingTestableState.mappingEditorState.isReadOnly;
    const addTest = (): void => mappingTestSuiteState.setShowModal(true);
    const runTests = (): void => {
      flowResult(mappingTestSuiteState.runSuite()).catch(
        editorStore.applicationStore.alertUnhandledError,
      );
    };
    const runFailingTests = (): void => {
      flowResult(mappingTestSuiteState.runFailingTests()).catch(
        editorStore.applicationStore.alertUnhandledError,
      );
    };
    const renderMappingTestEditor = (): React.ReactNode => {
      if (selectedTestState) {
        return <MappingTestEditor mappingTestState={selectedTestState} />;
      } else if (!mappingTestSuiteState.suite.tests.length) {
        return (
          <BlankPanelPlaceholder
            text="Add Mapping Test"
            onClick={addTest}
            clickActionType="add"
            tooltipText="Click to add mapping test"
          />
        );
      }
      return null;
    };
    return (
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel size={300} minSize={28}>
          <MappingTestSuiteQueryEditor
            key={mappingTestSuiteState.queryState.uuid}
            testSuiteState={mappingTestSuiteState}
            mappingTestableState={mappingTestSuiteState.mappingTestableState}
            isReadOnly={isReadOnly}
          />
        </ResizablePanel>
        <ResizablePanelSplitter>
          <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
        </ResizablePanelSplitter>
        <ResizablePanel minSize={56}>
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel size={200} minSize={28}>
              <div className="binding-editor__header">
                <div className="binding-editor__header__title">
                  <div className="panel__header__title__content">Tests</div>
                </div>
                <div className="panel__header__actions">
                  <button
                    className="panel__header__action testable-test-explorer__play__all__icon"
                    tabIndex={-1}
                    onClick={runTests}
                    title="Run All Tests"
                  >
                    <RunAllIcon />
                  </button>
                  <button
                    className="panel__header__action testable-test-explorer__play__all__icon"
                    tabIndex={-1}
                    onClick={runFailingTests}
                    title="Run All Failing Tests"
                  >
                    <RunErrorsIcon />
                  </button>
                  <button
                    className="panel__header__action"
                    tabIndex={-1}
                    onClick={addTest}
                    title="Add Mapping Test"
                  >
                    <PlusIcon />
                  </button>
                </div>
              </div>
              <PanelContent>
                {mappingTestSuiteState.testStates.map((test) => (
                  <MappingTestItem
                    key={test.uuid}
                    mappingTestState={test}
                    suiteState={mappingTestSuiteState}
                  />
                ))}
                {mappingTestSuiteState.showCreateModal && (
                  <CreateTestModal mappingSuiteState={mappingTestSuiteState} />
                )}
              </PanelContent>
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel minSize={28}>
              {renderMappingTestEditor()}
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  },
);

const MappingTestSuiteItem = observer(
  (props: {
    suite: MappingTestSuite;
    mappingTestableState: MappingTestableState;
  }) => {
    const { suite, mappingTestableState } = props;
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const isReadOnly = mappingTestableState.mappingEditorState.isReadOnly;
    const openSuite = (): void => mappingTestableState.changeSuite(suite);
    const results = mappingTestableState.testableResults?.filter(
      (t) => t.parentSuite?.id === suite.id,
    );
    const isRunning =
      mappingTestableState.isRunningTestableSuitesState.isInProgress ||
      (mappingTestableState.isRunningFailingSuitesState.isInProgress &&
        mappingTestableState.failingSuites.includes(suite)) ||
      mappingTestableState.runningSuite === suite;
    const isActive = mappingTestableState.selectedTestSuite?.suite === suite;
    const _testableResult = getTestableResultFromTestResults(results);
    const testableResult = isRunning
      ? TESTABLE_RESULT.IN_PROGRESS
      : _testableResult;
    const resultIcon = getTestableResultIcon(testableResult);
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);
    const add = (): void => {
      mappingTestableState.openCreateModal();
    };
    const _delete = (): void => {
      mappingTestableState.deleteTestSuite(suite);
    };
    const rename = (): void => {
      mappingTestableState.setRenameComponent(suite);
    };
    const runSuite = (): void => {
      flowResult(mappingTestableState.runSuite(suite)).catch(
        mappingTestableState.editorStore.applicationStore.alertUnhandledError,
      );
    };
    return (
      <ContextMenu
        className={clsx(
          'testable-test-explorer__item',
          {
            'testable-test-explorer__item--selected-from-context-menu':
              !isActive && isSelectedFromContextMenu,
          },
          { 'testable-test-explorer__item--active': isActive },
        )}
        disabled={isReadOnly}
        content={
          <MappingTestableContextMenu
            addName="Suite"
            add={add}
            _delete={_delete}
            rename={rename}
          />
        }
        menuProps={{ elevation: 7 }}
        onOpen={onContextMenuOpen}
        onClose={onContextMenuClose}
      >
        <button
          className={clsx('testable-test-explorer__item__label')}
          onClick={openSuite}
          tabIndex={-1}
        >
          <div className="testable-test-explorer__item__label__icon">
            {resultIcon}
          </div>
          <div className="testable-test-explorer__item__label__text">
            {suite.id}
          </div>
          <div className="mapping-test-explorer__item__actions">
            <button
              className="mapping-test-explorer__item__action mapping-test-explorer__run-test-btn"
              onClick={runSuite}
              disabled={isRunning}
              tabIndex={-1}
              title={`Run ${suite.id}`}
            >
              {<PlayIcon />}
            </button>
          </div>
        </button>
      </ContextMenu>
    );
  },
);

export const MappingTestableEditor = observer(
  (props: { mappingTestableState: MappingTestableState }) => {
    const { mappingTestableState } = props;
    const mappingEditorState = mappingTestableState.mappingEditorState;
    useEffect(() => {
      mappingTestableState.init();
    }, [mappingTestableState]);
    const isReadOnly = mappingEditorState.isReadOnly;
    const suites = mappingTestableState.mapping.tests;
    const selectedSuiteState = mappingTestableState.selectedTestSuite;
    const addSuite = (): void => mappingTestableState.openCreateModal();
    const runSuites = (): void => {
      mappingTestableState.runTestable();
    };
    const runFailingTests = (): void => {
      mappingTestableState.runAllFailingSuites();
    };
    const renderSuiteState = (): React.ReactNode => {
      if (selectedSuiteState) {
        return (
          <MappingTestSuiteEditor mappingTestSuiteState={selectedSuiteState} />
        );
      } else if (!suites.length) {
        return (
          <BlankPanelPlaceholder
            text="Add Test Suite"
            onClick={addSuite}
            clickActionType="add"
            tooltipText="Click to add test suite"
          />
        );
      }
      return null;
    };
    const renameTestingComponent = (val: string): void => {
      mappingTestableState.renameTestableComponent(val);
    };

    useApplicationNavigationContext(
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.MAPPING_EDITOR_TEST,
    );
    return (
      <div className="service-test-suite-editor panel">
        <div className="service-test-suite-editor">
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel size={200} minSize={28}>
              <div className="binding-editor__header">
                <div className="binding-editor__header__title">
                  <div className="panel__header__title__content">
                    Test Suites
                  </div>
                </div>
                <div className="panel__header__actions">
                  <button
                    className="panel__header__action testable-test-explorer__play__all__icon"
                    tabIndex={-1}
                    onClick={runSuites}
                    title="Run All Suites"
                  >
                    <RunAllIcon />
                  </button>
                  <button
                    className="panel__header__action testable-test-explorer__play__all__icon"
                    tabIndex={-1}
                    onClick={runFailingTests}
                    title="Run All Failing Tests"
                  >
                    <RunErrorsIcon />
                  </button>
                  <button
                    className="panel__header__action"
                    tabIndex={-1}
                    onClick={addSuite}
                    title="Add Mapping Suite"
                  >
                    <PlusIcon />
                  </button>
                </div>
              </div>
              <PanelContent>
                {suites.map((suite) => (
                  <MappingTestSuiteItem
                    key={suite.id}
                    mappingTestableState={mappingTestableState}
                    suite={suite}
                  />
                ))}
                {!suites.length && (
                  <BlankPanelPlaceholder
                    text="Add Test Suite"
                    onClick={addSuite}
                    clickActionType="add"
                    tooltipText="Click to add test suite"
                  />
                )}
              </PanelContent>
              {!suites.length && (
                <BlankPanelPlaceholder
                  disabled={mappingEditorState.isReadOnly}
                  onClick={addSuite}
                  text="Add a Test Suite"
                  clickActionType="add"
                  tooltipText="Click to add a new mapping test suite"
                />
              )}
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel minSize={56}>
              <div className="panel mapping-testable-editorr">
                <div className="mapping-testable-editor__content">
                  {renderSuiteState()}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
          {mappingTestableState.createSuiteState && (
            <CreateTestSuiteModal
              creatorState={mappingTestableState.createSuiteState}
            />
          )}
          {mappingTestableState.testableComponentToRename && (
            <RenameModal
              val={mappingTestableState.testableComponentToRename.id}
              isReadOnly={isReadOnly}
              showModal={true}
              closeModal={(): void =>
                mappingTestableState.setRenameComponent(undefined)
              }
              setValue={(val: string): void => renameTestingComponent(val)}
              errorMessageFunc={(_val: string | undefined) =>
                validateTestableId(_val, undefined)
              }
            />
          )}
        </div>
      </div>
    );
  },
);
