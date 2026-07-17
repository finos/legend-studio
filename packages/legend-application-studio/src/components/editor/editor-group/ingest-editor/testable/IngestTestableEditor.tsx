/**
 * Copyright (c) 2026-present, Goldman Sachs
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
import { flowResult } from 'mobx';
import {
  BlankPanelPlaceholder,
  clsx,
  ContextMenu,
  CustomSelectorInput,
  Dialog,
  MenuContent,
  MenuContentItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  ModalTitle,
  Panel,
  PanelFormTextField,
  PanelHeader,
  PanelHeaderActionItem,
  PanelHeaderActions,
  PlusIcon,
} from '@finos/legend-art';
import type {
  IngestTestableState,
  IngestTestSuiteState,
} from '../../../../../stores/editor/editor-state/element-editor-state/ingest/IngestTestableState.js';
import { forwardRef, useRef, useState } from 'react';
import { useEditorStore } from '../../../EditorStoreProvider.js';
import { validateTestableId } from '../../../../../stores/editor/utils/TestableUtils.js';
import { RenameModal } from '../../testable/TestableSharedComponents.js';
import type { IngestTestSuite } from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { testSuite_setId } from '../../../../../stores/graph-modifier/Testable_GraphModifierHelper.js';
import { LakehouseTestSuiteEditor } from '../../testable/LakehouseTestableEditor.js';

// ─── Create Suite Modal ───────────────────────────────────────────────────────

interface ItemOption {
  value: string;
  label: string;
}

const CreateSuiteModal = observer(
  (props: { testableState: IngestTestableState; onClose: () => void }) => {
    const { testableState, onClose } = props;
    const editorStore = useEditorStore();
    const applicationStore = editorStore.applicationStore;
    const inputRef = useRef<HTMLInputElement>(null);

    const [testName, setTestName] = useState<string | undefined>(undefined);
    const [datasetName, setDatasetName] = useState<string | undefined>(
      testableState.datasetNames[0],
    );

    const existingIds = testableState.ingest.tests.map((suite) => suite.id);
    const generateSuiteName = (): string => {
      let idx = 1;
      while (existingIds.includes(`suite_${idx}`)) {
        idx++;
      }
      return `suite_${idx}`;
    };

    const testError = validateTestableId(testName, undefined);
    const datasetOptions: ItemOption[] = testableState.datasetNames.map(
      (name) => ({
        value: name,
        label: name,
      }),
    );

    const selectedDatasetOption =
      datasetOptions.find((option) => option.value === datasetName) ?? null;

    const isValid = testName && !testError && datasetName;

    const create = (): void => {
      if (!testName || !datasetName) {
        return;
      }
      flowResult(
        testableState.createSuite(generateSuiteName(), testName, datasetName),
      )
        .then((error) => {
          if (error) {
            applicationStore.notificationService.notifyError(error);
          } else {
            onClose();
          }
        })
        .catch(applicationStore.alertUnhandledError);
    };

    return (
      <Dialog
        open={true}
        onClose={onClose}
        classes={{ container: 'search-modal__container' }}
        slotProps={{
          transition: { onEnter: () => inputRef.current?.focus() },
          paper: { classes: { root: 'search-modal__inner-container' } },
        }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        >
          <ModalHeader>
            <ModalTitle title="Create Test Suite" />
          </ModalHeader>
          <ModalBody>
            <PanelFormTextField
              ref={inputRef}
              name="Test Name"
              prompt="Name for the first test in this suite"
              placeholder="e.g. test_1"
              value={testName}
              update={(value): void => setTestName(value ?? '')}
              errorMessage={testError}
            />
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                MatView Dataset
              </div>
              <div className="panel__content__form__section__header__prompt">
                Select the MatView dataset tested by this first test
              </div>
              <CustomSelectorInput
                options={datasetOptions}
                onChange={(option: ItemOption | null): void =>
                  setDatasetName(option?.value)
                }
                value={selectedDatasetOption}
                placeholder="Select dataset..."
                isClearable={false}
                darkMode={true}
                disabled={datasetOptions.length === 0}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              disabled={!isValid}
              title={!isValid ? 'Fill in all required fields' : 'Create Suite'}
              onClick={create}
              text="Create"
            />
            <ModalFooterButton
              onClick={onClose}
              text="Close"
              type="secondary"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

// ─── Create Test Modal ────────────────────────────────────────────────────────

const CreateTestModal = observer(
  (props: { suiteState: IngestTestSuiteState; onClose: () => void }) => {
    const { suiteState, onClose } = props;
    const editorStore = suiteState.editorStore;
    const applicationStore = editorStore.applicationStore;
    const inputRef = useRef<HTMLInputElement>(null);

    const existingIds = suiteState.suite.tests.map((test) => test.id);
    const [testName, setTestName] = useState<string | undefined>(undefined);
    const [datasetName, setDatasetName] = useState<string | undefined>(
      suiteState.testableState.datasetNames[0],
    );
    const testNameError = validateTestableId(testName, existingIds);

    const datasetOptions: ItemOption[] =
      suiteState.testableState.datasetNames.map((name) => ({
        value: name,
        label: name,
      }));
    const selectedDatasetOption =
      datasetOptions.find((option) => option.value === datasetName) ?? null;

    const isValid = testName && !testNameError && datasetName;

    const create = (): void => {
      if (!testName || !datasetName) {
        return;
      }
      flowResult(suiteState.addNewTest(testName, datasetName))
        .then((error) => {
          if (error) {
            applicationStore.notificationService.notifyError(error);
          } else {
            onClose();
          }
        })
        .catch(applicationStore.alertUnhandledError);
    };

    return (
      <Dialog
        open={true}
        onClose={onClose}
        classes={{ container: 'search-modal__container' }}
        slotProps={{
          transition: { onEnter: () => inputRef.current?.focus() },
          paper: { classes: { root: 'search-modal__inner-container' } },
        }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        >
          <ModalHeader>
            <ModalTitle title={`Add Test to "${suiteState.suite.id}"`} />
          </ModalHeader>
          <ModalBody>
            <PanelFormTextField
              ref={inputRef}
              name="Test Name"
              prompt="Unique identifier for the test"
              placeholder="e.g. test_1"
              value={testName}
              update={(value): void => setTestName(value ?? '')}
              errorMessage={testNameError}
            />
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                MatView Dataset
              </div>
              <div className="panel__content__form__section__header__prompt">
                Select which MatView dataset this test will verify
              </div>
              <CustomSelectorInput
                options={datasetOptions}
                onChange={(option: ItemOption | null): void =>
                  setDatasetName(option?.value)
                }
                value={selectedDatasetOption}
                placeholder="Select dataset..."
                isClearable={false}
                darkMode={true}
                disabled={datasetOptions.length === 0}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              disabled={!isValid}
              title={!isValid ? 'Fill in all required fields' : 'Create Test'}
              onClick={create}
              text="Create"
            />
            <ModalFooterButton
              onClick={onClose}
              text="Close"
              type="secondary"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

// ─── Suite Tab Context Menu ───────────────────────────────────────────────────

const SuiteHeaderTabContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      testSuite: IngestTestSuite;
      testableState: IngestTestableState;
    }
  >(function SuiteHeaderTabContextMenu(props, ref) {
    const { testSuite, testableState } = props;
    const deleteSuite = (): void => {
      const suiteState = testableState.suiteStates.find(
        (state) => state.suite === testSuite,
      );
      if (suiteState) {
        testableState.deleteSuite(suiteState);
      }
    };
    const rename = (): void => testableState.setSuiteToRename(testSuite);

    return (
      <MenuContent ref={ref}>
        <MenuContentItem onClick={rename}>Rename</MenuContentItem>
        <MenuContentItem onClick={deleteSuite}>Delete</MenuContentItem>
      </MenuContent>
    );
  }),
);

// ─── Main Testing Tab ─────────────────────────────────────────────────────────

export const IngestTestableEditor = observer(
  (props: { testableState: IngestTestableState }) => {
    const { testableState } = props;
    const selectedSuiteState = testableState.selectedSuiteState;
    const isReadOnly = testableState.ingestDefinitionEditorState.isReadOnly;
    const ingest = testableState.ingest;

    const addSuite = (): void => {
      testableState.setShowCreateSuiteModal(true);
    };

    const changeSuite = (suite: IngestTestSuite): void => {
      testableState.changeSuite(suite);
    };

    const renameSuite = (value: string): void =>
      testSuite_setId(guaranteeNonNullable(testableState.suiteToRename), value);

    return (
      <Panel className="service-test-suite-editor">
        {testableState.showCreateSuiteModal && (
          <CreateSuiteModal
            testableState={testableState}
            onClose={(): void => testableState.setShowCreateSuiteModal(false)}
          />
        )}

        {testableState.showCreateTestModal && selectedSuiteState && (
          <CreateTestModal
            suiteState={selectedSuiteState}
            onClose={(): void => testableState.setShowCreateTestModal(false)}
          />
        )}

        <PanelHeader>
          {ingest.tests.length ? (
            <PanelHeader className="service-test-suite-editor__header service-test-suite-editor__header--with-tabs">
              <div className="uml-element-editor__tabs">
                {ingest.tests.map((suite) => (
                  <div
                    key={suite.id}
                    onClick={(): void => changeSuite(suite)}
                    className={clsx('service-test-suite-editor__tab', {
                      'service-test-suite-editor__tab--active':
                        selectedSuiteState?.suite === suite,
                    })}
                  >
                    <ContextMenu
                      className="mapping-editor__header__tab__content"
                      content={
                        <SuiteHeaderTabContextMenu
                          testableState={testableState}
                          testSuite={suite}
                        />
                      }
                    >
                      {suite.id}
                    </ContextMenu>
                  </div>
                ))}
              </div>
            </PanelHeader>
          ) : (
            <div></div>
          )}
          <PanelHeaderActions>
            <PanelHeaderActionItem onClick={addSuite} title="Add Test Suite">
              <PlusIcon />
            </PanelHeaderActionItem>
          </PanelHeaderActions>
        </PanelHeader>
        <Panel className="service-test-suite-editor">
          {selectedSuiteState && (
            <LakehouseTestSuiteEditor
              suiteState={selectedSuiteState}
              testableState={testableState}
              isReadOnly={isReadOnly}
            />
          )}
          {!ingest.tests.length && (
            <BlankPanelPlaceholder
              text="Add Test Suite"
              onClick={addSuite}
              clickActionType="add"
              tooltipText="Click to add test suite"
            />
          )}
          {testableState.suiteToRename && (
            <RenameModal
              val={testableState.suiteToRename.id}
              isReadOnly={isReadOnly}
              showModal={true}
              closeModal={(): void => testableState.setSuiteToRename(undefined)}
              setValue={renameSuite}
            />
          )}
        </Panel>
      </Panel>
    );
  },
);
