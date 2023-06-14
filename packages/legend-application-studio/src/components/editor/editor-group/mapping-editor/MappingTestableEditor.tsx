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
  ModelStore,
  Database,
  getMappingCompatibleClasses,
  getRootSetImplementation,
  RelationalInstanceSetImplementation,
  EmbeddedRelationalInstanceSetImplementation,
  isStubbed_RawLambda,
  stub_RawLambda,
} from '@finos/legend-graph';
import { forwardRef, useEffect, useRef, useState } from 'react';
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
  ModalHeader,
  PanelFormSection,
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
} from '../../../../stores/editor/editor-state/element-editor-state/mapping/testable/MappingTestableState.js';
import { useApplicationStore } from '@finos/legend-application';
import { flowResult } from 'mobx';
import {
  QueryBuilderTextEditorMode,
  type QueryBuilderState,
} from '@finos/legend-query-builder';
import { MappingExecutionQueryBuilderState } from '../../../../stores/editor/editor-state/element-editor-state/mapping/MappingExecutionQueryBuilderState.js';
import {
  CODE_EDITOR_LANGUAGE,
  CodeEditor,
} from '@finos/legend-lego/code-editor';
import { TESTABLE_TEST_TAB } from '../../../../stores/editor/editor-state/element-editor-state/testable/TestableEditorState.js';
import {
  atomicTest_setDoc,
  testAssertion_setId,
} from '../../../../stores/graph-modifier/Testable_GraphModifierHelper.js';
import {
  RenameModal,
  TestAssertionEditor,
  TestAssertionItem,
} from '../testable/TestableSharedComponents.js';
import { EmbeddedDataEditor } from '../data-editor/EmbeddedDataEditor.js';
import {
  TESTABLE_RESULT,
  getTestableResultFromTestResult,
} from '../../../../stores/editor/sidebar-state/testable/GlobalTestRunnerState.js';
import { getTestableResultIcon } from '../../side-bar/testable/GlobalTestRunner.js';
import { validateTestableId } from '../../../../stores/editor/utils/TestableUtils.js';
import { getMappingStores } from '../../../../stores/editor/editor-state/element-editor-state/mapping/MappingEditorState.js';
import type { DSL_Data_LegendStudioApplicationPlugin_Extension } from '../../../../stores/extensions/DSL_Data_LegendStudioApplicationPlugin_Extension.js';
import { EmbeddedDataType } from '../../../../stores/editor/editor-state/ExternalFormatState.js';
import type { EmbeddedDataTypeOption } from '../../../../stores/editor/editor-state/element-editor-state/data/DataEditorState.js';
import {
  buildElementOption,
  getPackageableElementOptionFormatter,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';

const SOURCE_CLASS_FORM_TITLE = 'Source Class To Add Data';
const SOURCE_CLASS_FORM_PROMPT = 'Source class to provide test data for';
const TARGET_CLASS_FORM_TITLE = 'Target Class To Test';
const TARGET_CLASS_FORM_PROMPT =
  'Mapped class for which you would like to build test query';
interface ClassSelectOption {
  label: string;
  value: Class;
}

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
    const [suiteType, setSuiteType] = useState(getDefaultSuite(selectedClass));
    const [suiteName, setSuiteName] = useState<string | undefined>(undefined);
    const [testName, setTestName] = useState<string | undefined>(undefined);

    const isValid = selectedClass && suiteName && testName;
    const changeClassOption = (val: ClassSelectOption | null): void => {
      if (val?.value) {
        setSelectedClass(val.value);
        setSuiteType(getDefaultSuite(val.value));
      } else {
        setSelectedClass(undefined);
        setSuiteType(getDefaultSuite(undefined));
      }
    };

    // model
    const close = (): void => creatorState.setShowModal(false);
    const create = (): void => {
      if (selectedClass && suiteName && testName) {
        flowResult(
          creatorState.createAndAddTestSuite(
            selectedClass,
            suiteType,
            suiteName,
            testName,
          ),
        ).catch(editorStore.applicationStore.alertUnhandledError);
      }
    };
    return (
      <Dialog
        open={creatorState.showModal}
        onClose={close}
        TransitionProps={{
          onEnter: handleEnter,
        }}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <Modal darkMode={true}>
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
              update={(value: string | undefined): void =>
                setSuiteName(value ?? '')
              }
              errorMessage={validateTestableId(suiteName, undefined)}
            />
            <PanelFormTextField
              name="Test Name"
              prompt="Unique Identifier for first test in suite"
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
                darkMode={true}
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
              title={'Create Test'}
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
    const mapping = mappingSuiteState.mappingTestableState.mapping;
    const editorStore =
      mappingSuiteState.mappingTestableState.mappingEditorState.editorStore;
    // Class mapping selector
    const compatibleClasses = getMappingCompatibleClasses(
      mapping,
      editorStore.graphManagerState.usableClasses,
    );
    const suite = mappingSuiteState.suite;
    const getDefaultTestName = (
      useClass: boolean,
      _class: Class | undefined,
    ): string => {
      if (useClass && _class) {
        return `${_class.name}_test`;
      }
      return 'test';
    };
    // class
    const [selectedClass, setSelectedClass] = useState<Class | undefined>(
      mappingSuiteState.getDefaultClass(),
    );
    const selectedClassOption = selectedClass
      ? {
          value: selectedClass,
          label: selectedClass.name,
        }
      : null;

    // id
    const [id, setId] = useState(
      generateEnumerableNameFromToken(
        suite.tests.map((e) => e.id),
        getDefaultTestName(
          mappingSuiteState instanceof MappingDataTestSuiteState,
          selectedClass,
        ),
      ),
    );

    const changeClassOption = (val: ClassSelectOption | null): void => {
      setSelectedClass(val?.value);
      setId(
        generateEnumerableNameFromToken(
          suite.tests.map((e) => e.id),
          getDefaultTestName(
            mappingSuiteState instanceof MappingDataTestSuiteState,
            selectedClass,
          ),
        ),
      );
    };

    const isValid = id && !id.includes(' ');

    const mappedClassSelectorRef = useRef<SelectComponent>(null);
    const mappedClassOptions = uniq(compatibleClasses)
      .map((e) => ({
        label: e.name,
        value: e,
      }))
      .sort(compareLabelFn);

    // model
    const close = (): void => mappingSuiteState.setShowModal(false);
    const create = (): void => {
      mappingSuiteState.addNewTest(id, selectedClass);
      close();
    };

    const modalTitle =
      mappingSuiteState instanceof MappingDataTestSuiteState
        ? TARGET_CLASS_FORM_TITLE
        : SOURCE_CLASS_FORM_TITLE;
    const modalPrompt =
      mappingSuiteState instanceof MappingDataTestSuiteState
        ? TARGET_CLASS_FORM_PROMPT
        : SOURCE_CLASS_FORM_PROMPT;
    return (
      <Dialog
        open={mappingSuiteState.showCreateModal}
        onClose={close}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <Modal darkMode={true} className="search-modal">
          <ModalTitle title="Create Test" />
          <ModalBody>
            <PanelFormTextField
              name="Name"
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
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                {modalTitle}
              </div>
              <div className="panel__content__form__section__header__prompt">
                {modalPrompt}
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

interface StoreSelectOption {
  label: string;
  value: Store;
}

const CreateStoreTestDataModal = observer(
  (props: { mappingTestableDataState: MappingTestableDataState }) => {
    const { mappingTestableDataState } = props;
    const editorStore = mappingTestableDataState.editorStore;
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
        <Modal darkMode={true} className="search-modal">
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
                value={selectedStoreOption}
                darkMode={true}
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
                  darkMode={true}
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
                    darkMode={true}
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
            <div className="mapping-test-editor__query-panel__query">
              <CodeEditor
                inputValue={queryState.lambdaString}
                isReadOnly={true}
                language={CODE_EDITOR_LANGUAGE.PURE}
                hideMinimap={true}
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
                  errorMessageFunc={(_val: string | undefined) =>
                    validateTestableId(_val, undefined)
                  }
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
              test data input
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
      mappingTestableDataState.setShowModal(true);
    };
    return (
      <div className="service-test-data-editor panel">
        {mappingTestableDataState.dataHolder.storeTestData.length ? (
          <>
            <PanelLoadingIndicator
              isLoading={Boolean(
                mappingTestableDataState.selectedDataState
                  ?.generatingTestDataSate.isInProgress,
              )}
            />
            {mappingTestableDataState.selectedDataState && (
              <StoreTestDataEditor
                storeTestDataState={mappingTestableDataState.selectedDataState}
                mappingTestableDataState={mappingTestableDataState}
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
            mappingTestableDataState={mappingTestableDataState}
          />
        )}
      </div>
    );
  },
);

const MappingTestEditor = observer(
  (props: { mappingTestState: MappingTestState }) => {
    const { mappingTestState } = props;
    const selectedTab = mappingTestState.selectedTab;
    const isReadOnly =
      mappingTestState.mappingTestableState.mappingEditorState.isReadOnly;
    const renderMappingSetupTestEditor = (): React.ReactNode => {
      const test = mappingTestState.test;
      return (
        <div className="panel mapping-testable-editorr">
          <div className="mapping-testable-editor__content">
            <ResizablePanelGroup orientation="horizontal">
              <ResizablePanel size={150}>
                <div className="service-test-data-editor panel">
                  <div className="service-test-editor__setup__configuration">
                    <PanelFormTextField
                      name="Test Documentation"
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
              <ResizablePanel>
                {mappingTestState instanceof MappingQueryTestState && (
                  <MappingTestableQueryEditor
                    testableQueryState={mappingTestState.queryState}
                    mappingTestableState={mappingTestState.mappingTestableState}
                    isReadOnly={isReadOnly}
                  />
                )}
                {mappingTestState instanceof MappingDataTestState && (
                  <MappingTestableStoreDataEditor
                    mappingTestableDataState={mappingTestState.dataState}
                  />
                )}
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      );
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

          {selectedTab === TESTABLE_TEST_TAB.ASSERTION && (
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
      suiteState.mappingTestableState.setRenameComponent(mappingTest);
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
    // const _testableResult = getTestableResultFromTestResult(
    //   serviceTestState.testResultState.result,
    // );
    // const testableResult = isRunning
    //   ? TESTABLE_RESULT.IN_PROGRESS
    //   : _testableResult;
    // const resultIcon = getTestableResultIcon(testableResult);
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);
    const add = (): void => {
      mappingTestableState.createSuiteState.setShowModal(true);
    };
    const _delete = (): void => {
      mappingTestableState.deleteTestSuite(suite);
    };
    const rename = (): void => {
      mappingTestableState.setRenameComponent(suite);
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
            {/* {resultIcon} */}
          </div>
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
      mappingTestableState.runAllSuites();
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
          {mappingTestableState.createSuiteState.showModal && (
            <CreateTestSuiteModal mappingTestableState={mappingTestableState} />
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
