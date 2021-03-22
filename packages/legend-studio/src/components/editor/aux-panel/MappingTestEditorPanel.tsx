/**
 * Copyright Goldman Sachs
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

import { useState, useRef, useEffect, useCallback } from 'react';
import SplitPane from 'react-split-pane';
import { useEditorStore } from '../../../stores/EditorStore';
import type { RawGraphFetchTreeData } from '../../../stores/shared/RawGraphFetchTreeUtil';
import { getRawGraphFetchTreeData } from '../../../stores/shared/RawGraphFetchTreeUtil';
import {
  clsx,
  PanelLoadingIndicator,
  CustomSelectorInput,
  createFilter,
} from '@finos/legend-studio-components';
import type { SelectComponent } from '@finos/legend-studio-components';
import { FaEdit, FaWrench, FaPlay } from 'react-icons/fa';
import { observer } from 'mobx-react-lite';
import { MappingEditorState } from '../../../stores/editor-state/element-editor-state/mapping/MappingEditorState';
import { MdVerticalAlignBottom, MdRefresh } from 'react-icons/md';
import { useDrop } from 'react-dnd';
import type {
  MappingElementDragSource,
  MappingExecutionTargetDropTarget,
} from '../../../stores/shared/DnDUtil';
import { CORE_DND_TYPE } from '../../../stores/shared/DnDUtil';
import {
  MappingTestState,
  MappingTestGraphFetchTreeQueryState,
  MappingTestObjectInputDataState,
  MappingTestFlatDataInputDataState,
  MappingTestExpectedOutputAssertionState,
} from '../../../stores/editor-state/element-editor-state/mapping/MappingTestState';
import Dialog from '@material-ui/core/Dialog';
import { EDITOR_LANGUAGE } from '../../../stores/EditorConfig';
import {
  isNonNullable,
  assertType,
  guaranteeType,
  compareLabelFn,
  uniq,
  tryToFormatLosslessJSONString,
} from '@finos/legend-studio-shared';
import { RawGraphFetchTreeExplorer } from './RawGraphFetchTreeExplorer';
import { TextInputEditor } from '../../shared/TextInputEditor';
import { VscError } from 'react-icons/vsc';
import { getMappingElementSourceSelectOption } from '../../editor/aux-panel/MappingExecution';
import { useApplicationStore } from '../../../stores/ApplicationStore';
import type { PackageableElementSelectOption } from '../../../models/metamodels/pure/model/packageableElements/PackageableElement';
import { Class } from '../../../models/metamodels/pure/model/packageableElements/domain/Class';
import type {
  MappingElementSource,
  MappingElementSourceSelectOption,
} from '../../../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import {
  getMappingElementSource,
  getMappingElementTarget,
  getMappingElementSourceFilterText,
} from '../../../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import { createValidationError } from '../../../models/metamodels/pure/action/validator/ValidationResult';

const MappingTestGraphFetchQueryEditor = observer(
  (props: {
    mappingEditorState: MappingEditorState;
    testState: MappingTestState;
    queryState: MappingTestGraphFetchTreeQueryState;
  }) => {
    const { mappingEditorState, testState, queryState } = props;
    const editorStore = useEditorStore();
    const { target, graphFetchTree } = queryState;
    const validationResult =
      testState.test.validationResult ??
      // NOTE: This is temporary, when lambda is properly processed, the type of execution query can be checked without using the graph manager in this manner
      editorStore.graphState.graphManager.HACKY_isGetAllLambda(
        testState.test.query,
      )
        ? createValidationError(['Mapping test function must not be empty'])
        : undefined;
    const isValid = !validationResult;
    const isReadOnly = mappingEditorState.isReadOnly;
    const filterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: PackageableElementSelectOption<Class>): string =>
        option.value.path,
    });
    const targetOptions = uniq(
      testState.mappingEditorState.mapping
        .getAllMappingElements()
        .map((mappingElement) => getMappingElementTarget(mappingElement))
        .map((element) => element.selectOption)
        .sort(compareLabelFn),
    );
    // Target
    const targetSelectorRef = useRef<SelectComponent>(null);
    const [openTargetSelectorModal, setOpenTargetSelectorModal] = useState(
      false,
    );
    const showTargetSelectorModal = (): void =>
      setOpenTargetSelectorModal(true);
    const hideTargetSelectorModal = (): void =>
      setOpenTargetSelectorModal(false);
    const handleEnterTargetSelectorModal = (): void =>
      targetSelectorRef.current?.focus();
    const changeTarget = useCallback(
      (val: Class | undefined): void => {
        if (val) {
          queryState.setTarget(val);
          queryState.setGraphFetchTree(
            getRawGraphFetchTreeData(
              editorStore,
              val,
              mappingEditorState.mapping,
            ),
          );
          // update source if possible based on the selected target, if there is only one available source, use it
          const possibleSources = mappingEditorState.mapping
            .getAllMappingElements()
            .filter(
              (mappingElement) =>
                getMappingElementTarget(mappingElement) === val,
            )
            .map((mappingElement) => getMappingElementSource(mappingElement))
            .filter(isNonNullable);
          testState.setInputDataStateBasedOnSource(
            possibleSources.length ? possibleSources[0] : undefined,
            true,
          );
        } else {
          queryState.setTarget(undefined);
          queryState.setGraphFetchTree(undefined);
          testState.setInputDataStateBasedOnSource(undefined, false);
        }
        testState.updateTestQuery();
        hideTargetSelectorModal();
      },
      [editorStore, mappingEditorState.mapping, queryState, testState],
    );
    const changeTargetOption = (
      val: PackageableElementSelectOption<Class>,
    ): void => changeTarget(val.value);
    // Drag and Drop
    const handleDrop = useCallback(
      (item: MappingExecutionTargetDropTarget): void =>
        isReadOnly
          ? undefined
          : changeTarget(
              guaranteeType(getMappingElementTarget(item.data), Class),
            ),
      [changeTarget, isReadOnly],
    );
    const [{ isDragOver }, dropRef] = useDrop(
      () => ({
        accept: CORE_DND_TYPE.MAPPING_EXPLORER_CLASS_MAPPING,
        drop: (item: MappingElementDragSource): void => handleDrop(item),
        collect: (monitor): { isDragOver: boolean } => ({
          isDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDrop],
    );
    // Deep/Graph Fetch Tree
    const updateTreeData = (data: RawGraphFetchTreeData): void => {
      queryState.setGraphFetchTree(data);
      testState.updateTestQuery();
    };

    return (
      <div className="panel mapping-test-editor-panel__target-panel">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">target</div>
            <div className="panel__header__title__content">
              {target?.name ?? '(none)'}
            </div>
          </div>
          <div className="panel__header__actions">
            <button
              className="panel__header__action"
              disabled={isReadOnly}
              tabIndex={-1}
              onClick={showTargetSelectorModal}
              title={'Select Target...'}
            >
              <FaEdit />
            </button>
          </div>
        </div>
        <div
          ref={dropRef}
          className={clsx(
            'panel__content',
            { 'panel__content--dnd-over': isDragOver && !isReadOnly },
            { 'panel__content--has-validation-error': !isValid },
          )}
        >
          {!isValid && (
            <div
              className="panel__content__validation-error"
              title={validationResult?.messages.join('\n') ?? ''}
            >
              <VscError />
            </div>
          )}
          {graphFetchTree && (
            <div className="mapping-test-editor-panel__target-panel__query-container">
              <RawGraphFetchTreeExplorer
                treeData={graphFetchTree}
                updateTreeData={updateTreeData}
                isReadOnly={isReadOnly}
                parentMapping={mappingEditorState.mapping}
              />
            </div>
          )}
          {!graphFetchTree && (
            <div
              className="mapping-test-editor-panel__target"
              onClick={showTargetSelectorModal}
            >
              <div className="mapping-test-editor-panel__target__text">
                Choose a target...
              </div>
              <div className="mapping-test-editor-panel__target__action">
                <MdVerticalAlignBottom />
              </div>
            </div>
          )}
        </div>
        <Dialog
          open={openTargetSelectorModal}
          onClose={hideTargetSelectorModal}
          onEnter={handleEnterTargetSelectorModal}
          classes={{ container: 'search-modal__container' }}
          PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
        >
          <div className="modal search-modal">
            <div className="modal__title">Choose a target</div>
            <CustomSelectorInput
              ref={targetSelectorRef}
              options={targetOptions}
              onChange={changeTargetOption}
              value={target ? target.selectOption : null}
              placeholder={'Choose a class that has been mapped...'}
              filterOption={filterOption}
              isClearable={true}
            />
          </div>
        </Dialog>
      </div>
    );
  },
);

const MappingTestQueryEditor = observer(
  (props: {
    mappingEditorState: MappingEditorState;
    testState: MappingTestState;
  }) => {
    const { mappingEditorState, testState } = props;
    const queryState = testState.queryState;
    // TODO: we might need to let user choose the type of query they want to build, but by default, it can be graph fetch tree
    if (queryState instanceof MappingTestGraphFetchTreeQueryState) {
      return (
        <MappingTestGraphFetchQueryEditor
          mappingEditorState={mappingEditorState}
          testState={testState}
          queryState={queryState}
        />
      );
    }
    return null;
  },
);

export const MappingTestObjectInputDataBuilder = observer(
  (props: {
    mappingEditorState: MappingEditorState;
    testState: MappingTestState;
    queryState: MappingTestGraphFetchTreeQueryState;
    inputDataState: MappingTestObjectInputDataState;
  }) => {
    const { mappingEditorState, testState, queryState, inputDataState } = props;
    const isReadOnly = mappingEditorState.isReadOnly;
    const validationResult = inputDataState.inputData.validationResult;
    const isValid = !validationResult;
    const filterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: getMappingElementSourceFilterText,
    });
    const sourceOptions = queryState.target
      ? mappingEditorState.mapping
          .getAllMappingElements()
          .filter(
            (mappingElement) =>
              getMappingElementTarget(mappingElement) === queryState.target,
          )
          .map((mappingElement) => getMappingElementSource(mappingElement))
          .filter(isNonNullable)
          .map((source) => getMappingElementSourceSelectOption(source))
          .sort(compareLabelFn)
      : [];
    const sourceSelectorRef = useRef<SelectComponent>(null);
    const [openSourceSelectorModal, setOpenSourceSelectorModal] = useState(
      false,
    );
    const showSourceSelectorModal = (): void =>
      setOpenSourceSelectorModal(true);
    const hideSourceSelectorModal = (): void =>
      setOpenSourceSelectorModal(false);
    const handleEnterSourceSelectorModal = (): void =>
      sourceSelectorRef.current?.focus();
    const changeSource = (source: MappingElementSource | undefined): void => {
      testState.setInputDataStateBasedOnSource(source, true);
      testState.updateInputData();
      hideSourceSelectorModal();
    };
    const changeSourceOption = (val: MappingElementSourceSelectOption): void =>
      changeSource(val.value);
    // Input Data
    const updateInputData = (val: string): void => {
      inputDataState.setData(val);
      testState.updateInputData();
    };
    // TODO: input type

    return (
      <div className="panel mapping-test-editor-panel__source-panel">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">source</div>
            <div className="panel__header__title__content">
              {inputDataState.sourceClass?.name ?? '(none)'}
            </div>
          </div>
          <div className="panel__header__actions">
            <button
              className="panel__header__action"
              disabled={isReadOnly}
              tabIndex={-1}
              onClick={showSourceSelectorModal}
              title={'Select Source...'}
            >
              <FaEdit />
            </button>
          </div>
        </div>
        <div
          className={clsx(
            'panel__content mapping-test-editor-panel__text-editor',
            { 'panel__content--has-validation-error': !isValid },
          )}
        >
          {!isValid && (
            <div
              className="panel__content__validation-error"
              title={validationResult?.messages.join('\n') ?? ''}
            >
              <VscError />
            </div>
          )}
          <TextInputEditor
            inputValue={inputDataState.data}
            updateInput={updateInputData}
            isReadOnly={isReadOnly}
            language={EDITOR_LANGUAGE.JSON}
          />
        </div>
        <Dialog
          open={openSourceSelectorModal}
          onClose={hideSourceSelectorModal}
          onEnter={handleEnterSourceSelectorModal}
          classes={{ container: 'search-modal__container' }}
          PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
        >
          <div className="modal search-modal">
            <div className="modal__title">Choose a source</div>
            <CustomSelectorInput
              ref={sourceSelectorRef}
              options={sourceOptions}
              onChange={changeSourceOption}
              value={inputDataState.sourceClass?.selectOption ?? null}
              placeholder={'Choose a class...'}
              filterOption={filterOption}
              isClearable={true}
            />
          </div>
        </Dialog>
      </div>
    );
  },
);

export const MappingTestFlatDataInputDataBuilder = observer(
  (props: {
    mappingEditorState: MappingEditorState;
    testState: MappingTestState;
    queryState: MappingTestGraphFetchTreeQueryState;
    inputDataState: MappingTestFlatDataInputDataState;
  }) => {
    const { mappingEditorState, testState, queryState, inputDataState } = props;
    const isReadOnly = mappingEditorState.isReadOnly;
    const validationResult = inputDataState.inputData.validationResult;
    const isValid = !validationResult;
    // Source
    const filterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: getMappingElementSourceFilterText,
    });
    const sourceOptions = queryState.target
      ? mappingEditorState.mapping
          .getAllMappingElements()
          .filter(
            (mappingElement) =>
              getMappingElementTarget(mappingElement) === queryState.target,
          )
          .map((mappingElement) => getMappingElementSource(mappingElement))
          .filter(isNonNullable)
          .map((source) => getMappingElementSourceSelectOption(source))
          .sort(compareLabelFn)
      : [];
    const sourceSelectorRef = useRef<SelectComponent>(null);
    const [openSourceSelectorModal, setOpenSourceSelectorModal] = useState(
      false,
    );
    const showSourceSelectorModal = (): void =>
      setOpenSourceSelectorModal(true);
    const hideSourceSelectorModal = (): void =>
      setOpenSourceSelectorModal(false);
    const handleEnterSourceSelectorModal = (): void =>
      sourceSelectorRef.current?.focus();
    const changeSource = (source: MappingElementSource | undefined): void => {
      testState.setInputDataStateBasedOnSource(source, true);
      testState.updateInputData();
      hideSourceSelectorModal();
    };
    const changeSourceOption = (val: MappingElementSourceSelectOption): void =>
      changeSource(val.value);
    // Input Data
    const updateInputData = (val: string): void => {
      inputDataState.setData(val);
      testState.updateInputData();
    };

    return (
      <div className="panel mapping-test-editor-panel__source-panel">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">source</div>
            <div className="panel__header__title__content">
              {inputDataState.sourceFlatData?.name ?? '(none)'}
            </div>
          </div>
          <div className="panel__header__actions">
            <button
              className="panel__header__action"
              disabled={isReadOnly}
              tabIndex={-1}
              onClick={showSourceSelectorModal}
              title={'Select Source...'}
            >
              <FaEdit />
            </button>
          </div>
        </div>
        <div
          className={clsx(
            'panel__content mapping-test-editor-panel__text-editor',
            { 'panel__content--has-validation-error': !isValid },
          )}
        >
          {!isValid && (
            <div
              className="panel__content__validation-error"
              title={validationResult?.messages.join('\n') ?? ''}
            >
              <VscError />
            </div>
          )}
          <TextInputEditor
            language={EDITOR_LANGUAGE.TEXT}
            inputValue={inputDataState.data}
            updateInput={updateInputData}
            isReadOnly={isReadOnly}
          />
        </div>
        <Dialog
          open={openSourceSelectorModal}
          onClose={hideSourceSelectorModal}
          onEnter={handleEnterSourceSelectorModal}
          classes={{ container: 'search-modal__container' }}
          PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
        >
          <div className="modal search-modal">
            <div className="modal__title">Choose a source</div>
            <CustomSelectorInput
              ref={sourceSelectorRef}
              options={sourceOptions}
              onChange={changeSourceOption}
              value={inputDataState.sourceFlatData?.selectOption ?? null}
              placeholder={'Choose a flat-data section action...'}
              filterOption={filterOption}
              isClearable={true}
            />
          </div>
        </Dialog>
      </div>
    );
  },
);

export const MappingTestInputDataBuilder = observer(
  (props: {
    testState: MappingTestState;
    mappingEditorState: MappingEditorState;
  }) => {
    const { mappingEditorState, testState } = props;
    const queryState = testState.queryState;
    const inputDataState = testState.inputDataState;
    if (inputDataState instanceof MappingTestObjectInputDataState) {
      assertType(
        queryState,
        MappingTestGraphFetchTreeQueryState,
        'Model-to-model mapping test only support graph fetch tree query type',
      );
      return (
        <MappingTestObjectInputDataBuilder
          mappingEditorState={mappingEditorState}
          testState={testState}
          queryState={queryState}
          inputDataState={inputDataState}
        />
      );
    } else if (inputDataState instanceof MappingTestFlatDataInputDataState) {
      assertType(
        queryState,
        MappingTestGraphFetchTreeQueryState,
        'Flat-data mapping test only support graph fetch tree query type',
      );
      return (
        <MappingTestFlatDataInputDataBuilder
          mappingEditorState={mappingEditorState}
          testState={testState}
          queryState={queryState}
          inputDataState={inputDataState}
        />
      );
    }
    return null;
  },
);

export const MappingTestExpectedOutputAssertionBuilder = observer(
  (props: {
    testState: MappingTestState;
    mappingEditorState: MappingEditorState;
    assertionState: MappingTestExpectedOutputAssertionState;
  }) => {
    const { testState, mappingEditorState, assertionState } = props;
    const applicationStore = useApplicationStore();
    const isReadOnly = mappingEditorState.isReadOnly;
    const validationResult = testState.test.assert.validationResult;
    const isValid = !validationResult;
    // Expected Result
    const updateExpectedResult = (val: string): void => {
      assertionState.setExpectedResult(val);
      testState.updateAssertion();
    };
    const formatExpectedResultJSONString = (): void =>
      assertionState.setExpectedResult(
        tryToFormatLosslessJSONString(assertionState.expectedResult),
      );
    // Actions
    const regenerateExpectedResult = applicationStore.guaranteeSafeAction(() =>
      testState.regenerateExpectedResult(),
    );
    const runTest = applicationStore.guaranteeSafeAction(() =>
      testState.runTest(),
    );

    return (
      <div className="panel mapping-test-editor-panel__expected-result-panel">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">expected</div>
          </div>
          <div className="panel__header__actions">
            <button
              className="panel__header__action"
              disabled={testState.isExecutingTest || isReadOnly}
              onClick={runTest}
              tabIndex={-1}
              title={'Run Test'}
            >
              <FaPlay />
            </button>
            <button
              className="panel__header__action mapping-test-editor-panel__generate-result-btn"
              disabled={testState.isExecutingTest || isReadOnly}
              onClick={regenerateExpectedResult}
              tabIndex={-1}
              title={'Regenerate Result'}
            >
              <MdRefresh />
            </button>
            <button
              className="panel__header__action"
              disabled={isReadOnly}
              tabIndex={-1}
              onClick={formatExpectedResultJSONString}
              title={'Format JSON (Alt + Shift + F)'}
            >
              <FaWrench />
            </button>
          </div>
        </div>
        <div
          className={clsx(
            'panel__content mapping-test-editor-panel__text-editor',
            { 'panel__content--has-validation-error': !isValid },
          )}
        >
          {!isValid && (
            <div
              className="panel__content__validation-error"
              title={validationResult?.messages.join('\n') ?? ''}
            >
              <VscError />
            </div>
          )}
          <TextInputEditor
            inputValue={assertionState.expectedResult}
            updateInput={updateExpectedResult}
            isReadOnly={isReadOnly}
            language={EDITOR_LANGUAGE.JSON}
          />
        </div>
      </div>
    );
  },
);

export const MappingTestAssertionBuilder = observer(
  (props: {
    testState: MappingTestState;
    mappingEditorState: MappingEditorState;
  }) => {
    const { mappingEditorState, testState } = props;
    const assertionState = testState.assertionState;
    if (assertionState instanceof MappingTestExpectedOutputAssertionState) {
      return (
        <MappingTestExpectedOutputAssertionBuilder
          mappingEditorState={mappingEditorState}
          testState={testState}
          assertionState={assertionState}
        />
      );
    }
    return null;
  },
);

export const MappingExecutionBuilder = observer(
  (props: {
    testState: MappingTestState;
    mappingEditorState: MappingEditorState;
  }) => {
    const { testState, mappingEditorState } = props;
    const applicationStore = useApplicationStore();
    // In case we switch out to another tab to do editing on some class, we want to refresh the test state data so that we can detect problem in deep fetch tree
    useEffect(() => {
      testState
        .openTest(false)
        .catch(applicationStore.alertIllegalUnhandledError);
    }, [applicationStore, testState]);

    return (
      <div className="mapping-test-editor-panel">
        <PanelLoadingIndicator isLoading={testState.isExecutingTest} />
        <SplitPane
          split="vertical"
          defaultSize={500}
          minSize={500}
          maxSize={-250}
        >
          <SplitPane
            split="vertical"
            defaultSize={250}
            minSize={250}
            maxSize={-250}
          >
            {/* use UUID key to make sure these components refresh when we change the state */}
            <MappingTestQueryEditor
              key={testState.queryState.uuid}
              mappingEditorState={mappingEditorState}
              testState={testState}
            />
            <MappingTestInputDataBuilder
              key={testState.inputDataState.uuid}
              mappingEditorState={mappingEditorState}
              testState={testState}
            />
          </SplitPane>
          <MappingTestAssertionBuilder
            key={testState.assertionState.uuid}
            mappingEditorState={mappingEditorState}
            testState={testState}
          />
        </SplitPane>
      </div>
    );
  },
);

export const MappingTestEditorPanel = observer(() => {
  const editorStore = useEditorStore();
  const currentElementState = editorStore.currentEditorState;
  if (
    !currentElementState ||
    !(currentElementState instanceof MappingEditorState) ||
    !(currentElementState.currentTabState instanceof MappingTestState)
  ) {
    // TODO: we should hide this from the UI when we're not in Mapping state since execution only makes sense in the context of mapping
    return (
      <div className="mapping-test-editor-panel mapping-test-editor-panel--no-content">
        Select a test to see detail
      </div>
    );
  }
  // NOTE: using the key here is crucial as it helps resetting component state properly as we change the mapping test state
  return (
    <MappingExecutionBuilder
      key={currentElementState.currentTabState.uuid}
      testState={currentElementState.currentTabState}
      mappingEditorState={currentElementState}
    />
  );
});
