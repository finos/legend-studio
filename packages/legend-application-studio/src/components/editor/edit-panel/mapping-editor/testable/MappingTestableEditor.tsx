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
  type StoreTestData,
  type MappingTest,
  ModelStore,
  Database,
  getMappingCompatibleClasses,
  getRootSetImplementation,
  RelationalInstanceSetImplementation,
  EmbeddedRelationalInstanceSetImplementation,
  isStubbed_RawLambda,
  stub_RawLambda,
  type Store,
} from '@finos/legend-graph';
import React, { forwardRef, useEffect, useRef, useState } from 'react';
import {
  BlankPanelPlaceholder,
  CaretDownIcon,
  clsx,
  compareLabelFn,
  CustomSelectorInput,
  Dialog,
  DropdownMenu,
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
  TestTubeIcon,
  type SelectComponent,
  CheckCircleIcon,
  TimesCircleIcon,
  PanelLoadingIndicator,
  ContextMenu,
  PURE_ModelStoreIcon,
  PURE_UnknownElementTypeIcon,
  PURE_DatabaseIcon,
  RefreshIcon,
} from '@finos/legend-art';
import {
  assertErrorThrown,
  generateEnumerableNameFromToken,
  guaranteeNonNullable,
  prettyCONSTName,
  uniq,
} from '@finos/legend-shared';
import {
  type StoreTestDataState,
  type MappingTestableState,
  type MappingTestableQueryState,
  type MappingTestState,
  type MappingTestableDataState,
  type MappingTestSuiteState,
  MAPPING_TEST_SUITE_TYPE,
  MappingQueryTestSuiteState,
  MappingDataTestState,
  MappingDataTestSuiteState,
  MappingQueryTestState,
  NewStoreTestDataState,
} from '../../../../../stores/editor/editor-state/element-editor-state/mapping/testable/MappingTestableState.js';
import { useApplicationStore } from '@finos/legend-application';
import { flowResult } from 'mobx';
import {
  QueryBuilderTextEditorMode,
  type QueryBuilderState,
} from '@finos/legend-query-builder';
import { MappingExecutionQueryBuilderState } from '../../../../../stores/editor/editor-state/element-editor-state/mapping/MappingExecutionQueryBuilderState.js';
import {
  CODE_EDITOR_LANGUAGE,
  CodeEditor,
} from '@finos/legend-lego/code-editor';
import { TESTABLE_TEST_TAB } from '../../../../../stores/editor/editor-state/element-editor-state/testable/TestableEditorState.js';
import {
  atomicTest_setDoc,
  atomicTest_setId,
  testAssertion_setId,
  testSuite_setId,
} from '../../../../../stores/graph-modifier/Testable_GraphModifierHelper.js';
import {
  RenameModal,
  TestAssertionEditor,
  TestAssertionItem,
} from '../../../editor-group/testable/TestAssertionEditor.js';
import { EmbeddedDataEditor } from '../../../editor-group/data-editor/EmbeddedDataEditor.js';
import {
  TESTABLE_RESULT,
  getTestableResultFromTestResult,
} from '../../../../../stores/editor/sidebar-state/testable/GlobalTestRunnerState.js';
import { getTestableResultIcon } from '../../../side-bar/testable/GlobalTestRunner.js';
import { getMappingSourceStores } from '../../../../../stores/editor/editor-state/element-editor-state/mapping/MappingEditorState.js';
import type { PackageableElementOption } from '@finos/legend-lego/graph-editor';

interface ClassSelectOption {
  label: string;
  value: Class;
}

const CreateStoreTestDataModal = observer(
  (props: { newStoreTestDataState: NewStoreTestDataState }) => {
    const { newStoreTestDataState } = props;
    const mapping =
      newStoreTestDataState.mappingTestableDataState.mappingTestableState
        .mapping;
    const editorStore =
      newStoreTestDataState.mappingTestableDataState.mappingTestableState
        .editorStore;
    // Class mapping selector
    const compatibleStore = getMappingSourceStores(
      mapping,
      editorStore.pluginManager.getApplicationPlugins(),
    );
    const storeSelectorRef = useRef<SelectComponent>(null);
    const storeOptions = uniq(compatibleStore)
      .map((e) => ({
        label: e.name,
        value: e,
      }))
      .sort(compareLabelFn);
    const [selectedStore, setSelectedStore] = useState<Store | undefined>(
      compatibleStore[0],
    );
    const selectedStoreOption = selectedStore
      ? {
          label: selectedStore.name,
          value: selectedStore,
        }
      : undefined;

    const changeClassOption = (
      val: PackageableElementOption<Store> | null,
    ): void => {
      setSelectedStore(val?.value);
    };
    // model
    const close = (): void => newStoreTestDataState.setShowModal(false);
    const create = (): void => {
      if (selectedStore) {
        newStoreTestDataState.create(selectedStore);
      }
      close();
    };
    return (
      <Dialog
        open={newStoreTestDataState.showModal}
        onClose={close}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <Modal darkMode={true} className="search-modal">
          <ModalTitle title="Create Test Store Data" />
          <ModalBody>
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Store
              </div>
              <div className="panel__content__form__section__header__prompt"></div>
              <CustomSelectorInput
                ref={storeSelectorRef}
                options={storeOptions}
                onChange={changeClassOption}
                value={selectedStoreOption}
                darkMode={true}
                placeholder="Choose a store..."
                isClearable={true}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton onClick={create} text="Create" />
            <ModalFooterButton onClick={close} text="Close" />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

const CreateTestSuiteModal = observer(
  (props: { mappingTestableState: MappingTestableState }) => {
    const { mappingTestableState } = props;
    const mappingEditorState = mappingTestableState.mappingEditorState;
    const mapping = mappingEditorState.mapping;
    const creatorState = mappingTestableState.createSuiteState;
    const editorStore = mappingEditorState.editorStore;
    // quick funcs
    const getDefaultSuite = (
      val: Class | undefined,
    ): MAPPING_TEST_SUITE_TYPE => {
      if (val) {
        const rootSetImpl = getRootSetImplementation(mapping, val);
        if (
          rootSetImpl instanceof RelationalInstanceSetImplementation ||
          rootSetImpl instanceof EmbeddedRelationalInstanceSetImplementation ||
          rootSetImpl instanceof EmbeddedRelationalInstanceSetImplementation
        ) {
          return MAPPING_TEST_SUITE_TYPE.DATA;
        } else {
          return MAPPING_TEST_SUITE_TYPE.QUERY;
        }
      }
      return MAPPING_TEST_SUITE_TYPE.QUERY;
    };
    // Class mapping selector
    const compatibleClasses = getMappingCompatibleClasses(
      mapping,
      editorStore.graphManagerState.usableClasses,
    );
    const mappedClassSelectorRef = useRef<SelectComponent>(null);
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
    const [suiteName, setSuiteName] = useState(
      generateEnumerableNameFromToken(
        mapping.tests.map((e) => e.id),
        selectedClass ? `${selectedClass.name}_suite` : 'suite',
      ),
    );
    const [suiteType, setSuiteType] = useState(getDefaultSuite(selectedClass));
    const isValid = selectedClass && suiteName;
    const handleEnterClassMappingSelectorModal = (): void =>
      mappedClassSelectorRef.current?.focus();
    const changeClassOption = (val: ClassSelectOption | null): void => {
      if (val?.value) {
        setSelectedClass(val.value);
        setSuiteType(getDefaultSuite(val.value));
        setSuiteName(
          generateEnumerableNameFromToken(
            mapping.tests.map((e) => e.id),
            `${val.value.name}_suite`,
          ),
        );
      } else {
        setSelectedClass(undefined);
        setSuiteType(getDefaultSuite(undefined));
      }
    };
    // model
    const close = (): void => creatorState.setShowModal(false);
    const create = (): void => {
      if (selectedClass && suiteName) {
        flowResult(
          creatorState.createAndAddTestSuite(
            selectedClass,
            suiteType,
            suiteName,
          ),
        ).catch(editorStore.applicationStore.alertUnhandledError);
      }
    };
    return (
      <Dialog
        open={creatorState.showModal}
        onClose={close}
        TransitionProps={{
          onEnter: handleEnterClassMappingSelectorModal,
        }}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <Modal darkMode={true} className="search-modal">
          <ModalTitle title="Create Test Suite" />
          <PanelLoadingIndicator
            isLoading={creatorState.isCreatingSuiteState.isInProgress}
          />
          {creatorState.isCreatingSuiteState.message && (
            <div className="service-registration-editor__progress-msg">
              {`${creatorState.isCreatingSuiteState.message}...`}
            </div>
          )}
          <ModalBody>
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Target Class To Test
              </div>
              <div className="panel__content__form__section__header__prompt">
                Mapped class for which you would like to build test suite for
              </div>
              <CustomSelectorInput
                ref={mappedClassSelectorRef}
                options={mappedClassOptions}
                onChange={changeClassOption}
                value={selectedClassOption}
                darkMode={true}
                placeholder="Choose a class..."
                isClearable={true}
              />
            </div>
            <PanelFormTextField
              name="Test Suite Name"
              prompt=""
              value={suiteName}
              update={(value: string | undefined): void =>
                setSuiteName(value ?? '')
              }
              errorMessage={
                suiteName.includes(' ')
                  ? `Suite name can't contain spaces`
                  : !suiteName
                  ? `Suite name is required`
                  : undefined
              }
            />
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              disabled={!isValid}
              onClick={create}
              text="Create"
            />
            <ModalFooterButton onClick={close} text="Close" />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

const CreateTestModal = observer(
  (props: { mappingSuiteState: MappingTestSuiteState }) => {
    const { mappingSuiteState } = props;
    const suite = mappingSuiteState.suite;

    const [id, setId] = useState(
      generateEnumerableNameFromToken(
        suite.tests.map((e) => e.id),
        'test',
      ),
    );
    const isValid = id && !id.includes(' ');
    // model
    const close = (): void => mappingSuiteState.setShowModal(false);
    const create = (): void => mappingSuiteState.addTest(id);
    return (
      <Dialog
        open={mappingSuiteState.showCreateModal}
        onClose={close}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <Modal darkMode={true} className="search-modal">
          <ModalTitle title="Create Test Suite" />
          <ModalBody>
            <PanelFormTextField
              name="Test Suite Name"
              prompt=""
              value={id}
              update={(value: string | undefined): void => setId(value ?? '')}
              errorMessage={
                id.includes(' ')
                  ? `Suite name can't contain spaces`
                  : !id
                  ? `Suite name is required`
                  : undefined
              }
            />
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              disabled={!isValid}
              onClick={create}
              text="Create"
            />
            <ModalFooterButton onClick={close} text="Close" />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

const MappingTestableQueryEditor = observer(
  (props: {
    testableQueryState: MappingTestableQueryState;
    mappingTestableState: MappingTestableState;
    isReadOnly: boolean;
  }) => {
    const { testableQueryState, mappingTestableState, isReadOnly } = props;
    const mapping = mappingTestableState.mapping;
    const queryState = testableQueryState;
    const editorStore = mappingTestableState.mappingEditorState.editorStore;
    const applicationStore = useApplicationStore();

    // actions
    const editWithQueryBuilder = (openInTextMode = false): (() => void) =>
      applicationStore.guardUnhandledError(async () => {
        const embeddedQueryBuilderState = editorStore.embeddedQueryBuilderState;
        await flowResult(
          embeddedQueryBuilderState.setEmbeddedQueryBuilderConfiguration({
            setupQueryBuilderState: (): QueryBuilderState => {
              const queryBuilderState = new MappingExecutionQueryBuilderState(
                embeddedQueryBuilderState.editorStore.applicationStore,
                embeddedQueryBuilderState.editorStore.graphManagerState,
                mapping,
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
                        await flowResult(queryState.updateLamba(rawLambda));
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
            disableCompile: isStubbed_RawLambda(queryState.query),
          }),
        );
      });

    const clearQuery = applicationStore.guardUnhandledError(() =>
      flowResult(queryState.updateLamba(stub_RawLambda())),
    );

    return (
      <div className="panel mapping-test-editor__query-panel">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">query</div>
          </div>
          <div className="panel__header__actions">
            <div className="mapping-test-editor__action-btn">
              <button
                className="mapping-test-editor__action-btn__label"
                onClick={editWithQueryBuilder()}
                title="Edit Query"
                tabIndex={-1}
              >
                <PencilIcon className="mapping-test-editor__action-btn__label__icon" />
                <div className="mapping-test-editor__action-btn__label__title">
                  Edit Query
                </div>
              </button>
              <DropdownMenu
                className="mapping-test-editor__action-btn__dropdown-btn"
                content={
                  <MenuContent>
                    <MenuContentItem
                      className="mapping-test-editor__action-btn__option"
                      onClick={editWithQueryBuilder(true)}
                    >
                      Text Mode
                    </MenuContentItem>
                    <MenuContentItem
                      className="mapping-test-editor__action-btn__option"
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
              </DropdownMenu>
            </div>
          </div>
        </div>
        {!isStubbed_RawLambda(queryState.query) && (
          <PanelContent>
            <div
              className="mapping-test-editor__query-panel__query"
              title="Double click to edit in query builder"
              onDoubleClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                editWithQueryBuilder()();
              }}
            >
              <CodeEditor
                inputValue={queryState.lambdaString}
                isReadOnly={true}
                language={CODE_EDITOR_LANGUAGE.PURE}
                showMiniMap={false}
              />
            </div>
          </PanelContent>
        )}
      </div>
    );
  },
);

const MappingTestAssertionsEditor = observer(
  (props: { mappingDataTestState: MappingTestState }) => {
    const { mappingDataTestState } = props;
    const editorStore = mappingDataTestState.editorStore;
    const mappingEditorState =
      mappingDataTestState.mappingTestableState.mappingEditorState;
    const isReadOnly = mappingEditorState.isReadOnly;
    const addAssertion = (): void => mappingDataTestState.addAssertion();
    const runTest = (): void => {
      flowResult(mappingDataTestState.runTest()).catch(
        editorStore.applicationStore.alertUnhandledError,
      );
    };
    const renameAssertion = (val: string): void =>
      testAssertion_setId(
        guaranteeNonNullable(mappingDataTestState.assertionToRename),
        val,
      );
    return (
      <div className="panel service-test-editor">
        <div className="service-test-suite-editor__header">
          <div className="service-test-suite-editor__header__title">
            <div className="service-test-suite-editor__header__title__label service-test-suite-editor__header__title__label--assertions">
              assertions
            </div>
          </div>
        </div>
        <div className="service-test-editor__content">
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel minSize={100} size={200}>
              <div className="binding-editor__header">
                <div className="binding-editor__header__title">
                  <div className="testable-test-assertion-explorer__header__summary">
                    <div className="testable-test-assertion-explorer__header__summary__icon testable-test-assertion-explorer__header__summary__icon--assertion">
                      <TestTubeIcon />
                    </div>
                    <div>{mappingDataTestState.assertionCount}</div>
                  </div>
                  <div className="testable-test-assertion-explorer__header__summary">
                    <div className="testable-test-assertion-explorer__header__summary__icon testable-test-assertion-explorer__header__summary__icon--passed">
                      <CheckCircleIcon />
                    </div>
                    <div>{mappingDataTestState.assertionPassed}</div>
                  </div>
                  <div className="testable-test-assertion-explorer__header__summary">
                    <div className="testable-test-assertion-explorer__header__summary__icon testable-test-assertion-explorer__header__summary__icon--failed">
                      <TimesCircleIcon />
                    </div>
                    <div>{mappingDataTestState.assertionFailed}</div>
                  </div>
                </div>
                <div className="panel__header__actions">
                  <button
                    className="panel__header__action testable-test-explorer__play__all__icon"
                    tabIndex={-1}
                    onClick={runTest}
                    title="Run All Assertions"
                  >
                    <RunAllIcon />
                  </button>
                  <button
                    className="panel__header__action"
                    tabIndex={-1}
                    onClick={addAssertion}
                    title="Add Test Assertion"
                  >
                    <PlusIcon />
                  </button>
                </div>
              </div>
              <div>
                {mappingDataTestState.assertionEditorStates.map(
                  (assertionState) => (
                    <TestAssertionItem
                      key={assertionState.assertion.id}
                      testableTestState={mappingDataTestState}
                      testAssertionEditorState={assertionState}
                      isReadOnly={isReadOnly}
                    />
                  ),
                )}
              </div>
              {mappingDataTestState.assertionToRename && (
                <RenameModal
                  val={mappingDataTestState.assertionToRename.id}
                  isReadOnly={isReadOnly}
                  showModal={true}
                  closeModal={(): void =>
                    mappingDataTestState.setAssertionToRename(undefined)
                  }
                  setValue={renameAssertion}
                />
              )}
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel>
              {mappingDataTestState.selectedAsertionState && (
                <TestAssertionEditor
                  testAssertionState={
                    mappingDataTestState.selectedAsertionState
                  }
                />
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    );
  },
);

const StoreTestDataContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      storeTestData: StoreTestData;
      deleteStoreData: () => void;
    }
  >(function TestContainerContextMenu(props, ref) {
    const { deleteStoreData } = props;
    const remove = (): void => deleteStoreData();

    return (
      <MenuContent ref={ref}>
        <MenuContentItem onClick={remove}>Delete</MenuContentItem>
      </MenuContent>
    );
  }),
);

const StoreTestDataItem = observer(
  (props: {
    mappingTestableDataState: MappingTestableDataState;
    storeTestData: StoreTestData;
  }) => {
    const { storeTestData, mappingTestableDataState } = props;
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const store = storeTestData.store;
    const isReadOnly =
      mappingTestableDataState.mappingTestableState.mappingEditorState
        .isReadOnly;
    const openConnectionTestData = (): void =>
      mappingTestableDataState.openStoreTestData(storeTestData);
    const isActive =
      mappingTestableDataState.selectedDataState?.storeTestData ===
      storeTestData;
    const deleteStoreTestData = (): void =>
      mappingTestableDataState.deleteStoreTestData(storeTestData);
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);
    const icon =
      store.value instanceof ModelStore ? (
        <PURE_ModelStoreIcon />
      ) : store.value instanceof Database ? (
        <PURE_DatabaseIcon />
      ) : (
        <PURE_UnknownElementTypeIcon />
      );

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
          <StoreTestDataContextMenu
            storeTestData={storeTestData}
            deleteStoreData={deleteStoreTestData}
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
            {icon}
          </div>
          <div className="testable-test-assertion-explorer__item__label__text">
            {store.value.path}
          </div>
        </button>
      </ContextMenu>
    );
  },
);

const StoreTestDataEditor = observer(
  (props: {
    mappingTestableDataState: MappingTestableDataState;
    storeTestDataState: StoreTestDataState;
  }) => {
    const { mappingTestableDataState, storeTestDataState } = props;
    const isReadOnly =
      mappingTestableDataState.mappingTestableState.mappingEditorState
        .isReadOnly;
    return (
      <div className="service-test-data-editor">
        <div className="service-test-suite-editor__header">
          <div className="service-test-suite-editor__header__title">
            <div className="service-test-suite-editor__header__title__label">
              data
            </div>
          </div>
        </div>
        <EmbeddedDataEditor
          isReadOnly={isReadOnly}
          embeddedDataEditorState={storeTestDataState.embeddedEditorState}
        />
      </div>
    );
  },
);

const MappingTestableStoreDataEditor = observer(
  (props: { mappingTestableDataState: MappingTestableDataState }) => {
    const { mappingTestableDataState } = props;
    const addStoreTestData = (): void => {
      mappingTestableDataState.newStoreTestDataState.openModal();
    };
    return (
      <div className="service-test-data-editor panel">
        <div className="service-test-suite-editor__header">
          <div className="service-test-suite-editor__header__title">
            <div className="service-test-suite-editor__header__title__label">
              Data
            </div>
          </div>
        </div>
        <div className="service-test-data-editor__data">
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel minSize={100}>
              <div className="binding-editor__header">
                <div className="binding-editor__header__title">
                  <div className="binding-editor__header__title__label">
                    stores
                  </div>
                </div>
                <div className="panel__header__actions">
                  <button
                    className="panel__header__action"
                    tabIndex={-1}
                    onClick={addStoreTestData}
                    title="Add Store Test Data"
                  >
                    <PlusIcon />
                  </button>
                </div>
              </div>
              <div>
                {mappingTestableDataState.dataHolder.storeTestData.map(
                  (storeTestData) => (
                    <StoreTestDataItem
                      key={storeTestData.store.value.name}
                      storeTestData={storeTestData}
                      mappingTestableDataState={mappingTestableDataState}
                    />
                  ),
                )}
              </div>
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel minSize={600}>
              {mappingTestableDataState.selectedDataState && (
                <StoreTestDataEditor
                  storeTestDataState={
                    mappingTestableDataState.selectedDataState
                  }
                  mappingTestableDataState={mappingTestableDataState}
                />
              )}
              {!mappingTestableDataState.dataHolder.storeTestData.length && (
                <BlankPanelPlaceholder
                  text="Add Store Test Data"
                  onClick={addStoreTestData}
                  clickActionType="add"
                  tooltipText="Click to add store test data"
                />
              )}
              {mappingTestableDataState.newStoreTestDataState.showModal && (
                <CreateStoreTestDataModal
                  newStoreTestDataState={
                    mappingTestableDataState.newStoreTestDataState
                  }
                />
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    );
  },
);

const MappingDataTestSetupEditor = observer(
  (props: { mappingDataTestState: MappingDataTestState }) => {
    const { mappingDataTestState } = props;
    const test = mappingDataTestState.test;
    return (
      <div className="panel service-test-editor">
        <div className="panel__header">
          <div className="service-test-suite-editor__header__title">
            <div className="service-test-suite-editor__header__title__label">
              setup
            </div>
          </div>
        </div>
        <div className="service-test-editor__content">
          <ResizablePanelGroup orientation="horizontal">
            <ResizablePanel size={150} minSize={28}>
              <div className="service-test-data-editor panel">
                <div className="service-test-suite-editor__header">
                  <div className="service-test-suite-editor__header__title">
                    <div className="service-test-suite-editor__header__title__label">
                      configuration
                    </div>
                  </div>
                </div>
                <div className="service-test-editor__setup__configuration">
                  <PanelFormTextField
                    name="Documentation"
                    prompt="Test Documentation"
                    value={test.doc}
                    update={(value: string | undefined): void =>
                      atomicTest_setDoc(test, value ?? undefined)
                    }
                  />
                </div>
              </div>
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel minSize={56}>
              <MappingTestableStoreDataEditor
                mappingTestableDataState={mappingDataTestState.dataState}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    );
  },
);

const MappingQueryTestSetupEditor = observer(
  (props: { mappingQueryTestState: MappingQueryTestState }) => {
    const { mappingQueryTestState } = props;
    const test = mappingQueryTestState.test;
    const mappingTestableState = mappingQueryTestState.mappingTestableState;
    const queryState = mappingQueryTestState.queryState;
    const isReadOnly =
      mappingQueryTestState.mappingTestableState.mappingEditorState.isReadOnly;
    return (
      <div className="panel service-test-editor">
        <div className="panel__header">
          <div className="service-test-suite-editor__header__title">
            <div className="service-test-suite-editor__header__title__label">
              setup
            </div>
          </div>
        </div>
        <div className="service-test-editor__content">
          <ResizablePanelGroup orientation="horizontal">
            <ResizablePanel size={150} minSize={28}>
              <div className="service-test-data-editor panel">
                <div className="service-test-suite-editor__header">
                  <div className="service-test-suite-editor__header__title">
                    <div className="service-test-suite-editor__header__title__label">
                      configuration
                    </div>
                  </div>
                </div>
                <div className="service-test-editor__setup__configuration">
                  <PanelFormTextField
                    name="Documentation"
                    prompt="Test Documentation"
                    value={test.doc}
                    update={(value: string | undefined): void =>
                      atomicTest_setDoc(test, value)
                    }
                  />
                </div>
              </div>
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel minSize={56}>
              <MappingTestableQueryEditor
                testableQueryState={queryState}
                mappingTestableState={mappingTestableState}
                isReadOnly={isReadOnly}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    );
  },
);

const MappingTestEditor = observer(
  (props: { mappingTestState: MappingTestState }) => {
    const { mappingTestState } = props;
    const selectedTab = mappingTestState.selectedTab;

    const renderMappingSetupTestEditor = (): React.ReactNode => {
      if (mappingTestState instanceof MappingDataTestState) {
        return (
          <MappingDataTestSetupEditor mappingDataTestState={mappingTestState} />
        );
      } else if (mappingTestState instanceof MappingQueryTestState) {
        return (
          <MappingQueryTestSetupEditor
            mappingQueryTestState={mappingTestState}
          />
        );
      }
      return null;
    };
    return (
      <div className="service-test-editor panel">
        <div className="panel__header">
          <div className="panel__header service-test-editor__header--with-tabs">
            <div className="uml-element-editor__tabs">
              {Object.values(TESTABLE_TEST_TAB).map((tab) => (
                <div
                  key={tab}
                  onClick={(): void => mappingTestState.setSelectedTab(tab)}
                  className={clsx('service-test-editor__tab', {
                    'service-test-editor__tab--active':
                      tab === mappingTestState.selectedTab,
                  })}
                >
                  {prettyCONSTName(tab)}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="service-test-editor">
          {selectedTab === TESTABLE_TEST_TAB.SETUP &&
            renderMappingSetupTestEditor()}

          {selectedTab === TESTABLE_TEST_TAB.ASSERTIONS && (
            <MappingTestAssertionsEditor
              mappingDataTestState={mappingTestState}
            />
          )}
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
      suiteState.setRenameTest(mappingTest);
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
        </button>
      </ContextMenu>
    );
  },
);

const MappingTestSuiteEditor = observer(
  (props: { mappingTestSuiteState: MappingTestSuiteState }) => {
    const { mappingTestSuiteState } = props;
    const editorStore = mappingTestSuiteState.mappingTestableState.editorStore;
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
    const renderMappingTestSuiteDriver = (): React.ReactNode => {
      if (mappingTestSuiteState instanceof MappingDataTestSuiteState) {
        return (
          <MappingTestableStoreDataEditor
            mappingTestableDataState={mappingTestSuiteState.dataState}
          />
        );
      } else if (mappingTestSuiteState instanceof MappingQueryTestSuiteState) {
        return (
          <MappingTestableQueryEditor
            key={mappingTestSuiteState.queryState.uuid}
            testableQueryState={mappingTestSuiteState.queryState}
            mappingTestableState={mappingTestSuiteState.mappingTestableState}
            isReadOnly={isReadOnly}
          />
        );
      }
      return null;
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

    const renameTest = (test: MappingTest | undefined, val: string): void => {
      if (test) {
        atomicTest_setId(test, val);
      }
    };
    return (
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel size={300} minSize={28}>
          {renderMappingTestSuiteDriver()}
        </ResizablePanel>
        <ResizablePanelSplitter>
          <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
        </ResizablePanelSplitter>
        <ResizablePanel minSize={56}>
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel size={300} minSize={28}>
              <div className="binding-editor__header">
                <div className="binding-editor__header__title">
                  <div className="panel__header__title__content">Tests</div>
                </div>
                <div className="panel__header__actions">
                  <button
                    className="panel__header__action testable-test-explorer__play__all__icon"
                    tabIndex={-1}
                    onClick={runTests}
                    title="Run Suite Tests"
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
                    title="Add Mapping Suite"
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
                {mappingTestSuiteState.renameTest && (
                  <RenameModal
                    val={mappingTestSuiteState.renameTest.id}
                    isReadOnly={isReadOnly}
                    showModal={true}
                    closeModal={(): void =>
                      mappingTestSuiteState.setRenameTest(undefined)
                    }
                    setValue={(val: string): void =>
                      renameTest(mappingTestSuiteState.renameTest, val)
                    }
                  />
                )}
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
    const isActive = mappingTestableState.selectedTestSuite?.suite === suite;
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);
    const add = (): void => {
      mappingTestableState.createSuiteState.setShowModal(true);
    };
    const _delete = (): void => {
      mappingTestableState.deleteTestSuite(suite);
    };
    const rename = (): void => {
      mappingTestableState.setSuiteToRename(suite);
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
          <div className="testable-test-explorer__item__label__text">
            {suite.id}
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
    const addSuite = (): void =>
      mappingTestableState.createSuiteState.setShowModal(true);
    const runSuites = (): void => {
      mappingTestableState.runTestable();
    };
    const runFailingTests = (): void => {
      mappingTestableState.runFailingSuites();
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
    const renameSuite = (
      val: string,
      suite: MappingTestSuite | undefined,
    ): void => {
      if (suite) {
        testSuite_setId(suite, val);
      }
    };
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
                    disabled={mappingEditorState.isReadOnly}
                    onClick={addSuite}
                    text="Add a Test Suite"
                    clickActionType="add"
                    tooltipText="Click to add a new mapping test suite"
                  />
                )}
              </PanelContent>
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel minSize={56}>
              <div className="panel service-test-editor">
                <div className="service-test-suite-editor__header">
                  <div className="service-test-suite-editor__header__title">
                    <div className="service-test-suite-editor__header__title__label service-test-suite-editor__header__title__label--tests-suites">
                      suite
                    </div>
                  </div>
                </div>
                <div className="service-test-editor__content">
                  {renderSuiteState()}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
          {mappingTestableState.createSuiteState.showModal && (
            <CreateTestSuiteModal mappingTestableState={mappingTestableState} />
          )}
          {mappingTestableState.suiteToRename && (
            <RenameModal
              val={mappingTestableState.suiteToRename.id}
              isReadOnly={isReadOnly}
              showModal={true}
              closeModal={(): void =>
                mappingTestableState.setSuiteToRename(undefined)
              }
              setValue={(val: string): void =>
                renameSuite(val, mappingTestableState.suiteToRename)
              }
            />
          )}
        </div>
      </div>
    );
  },
);
