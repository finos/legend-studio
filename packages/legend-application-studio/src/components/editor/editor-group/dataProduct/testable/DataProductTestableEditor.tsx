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
  PanelLoadingIndicator,
  PlusIcon,
} from '@finos/legend-art';
import type { DataProductTestSuite } from '@finos/legend-graph';
import type { DataProductEditorState } from '../../../../../stores/editor/editor-state/element-editor-state/dataProduct/DataProductEditorState.js';
import {
  type DataProductTestableState,
  type DataProductTestSuiteState,
} from '../../../../../stores/editor/editor-state/element-editor-state/dataProduct/testable/DataProductTestableState.js';
import { forwardRef, useRef, useState } from 'react';
import { validateTestableId } from '../../../../../stores/editor/utils/TestableUtils.js';
import { useEditorStore } from '../../../EditorStoreProvider.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { RenameModal } from '../../testable/TestableSharedComponents.js';
import { testSuite_setId } from '../../../../../stores/graph-modifier/Testable_GraphModifierHelper.js';
import { LakehouseTestSuiteEditor } from '../../testable/LakehouseTestableEditor.js';

// ─── Create Suite Modal ───────────────────────────────────────────────────────

interface ItemOption {
  value: string;
  label: string;
}

const CreateSuiteModal = observer(
  (props: { testableState: DataProductTestableState; onClose: () => void }) => {
    const { testableState, onClose } = props;
    const editorStore = useEditorStore();
    const applicationStore = editorStore.applicationStore;
    const inputRef = useRef<HTMLInputElement>(null);

    const [testName, setTestName] = useState<string | undefined>(undefined);
    const [selectedAccessPointId, setSelectedAccessPointId] = useState<
      string | undefined
    >(undefined);

    const existingIds = testableState.dataProduct.tests.map((s) => s.id);
    const generateSuiteName = (): string => {
      let idx = 1;
      while (existingIds.includes(`suite_${idx}`)) {
        idx++;
      }
      return `suite_${idx}`;
    };

    const testError = validateTestableId(testName, undefined);

    const accessPointOptions: ItemOption[] = testableState.ownAccessPoints.map(
      (ap) => ({
        value: ap.id,
        label: ap.id,
      }),
    );
    const selectedApOption =
      accessPointOptions.find((o) => o.value === selectedAccessPointId) ?? null;

    const isValid = testName && !testError && selectedAccessPointId;

    const create = (): void => {
      if (!testName || !selectedAccessPointId) {
        return;
      }
      flowResult(
        testableState.createSuite(
          generateSuiteName(),
          testName,
          selectedAccessPointId,
        ),
      )
        .then((err) => {
          if (err) {
            applicationStore.notificationService.notifyError(err);
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
                Access Point to Test
              </div>
              <div className="panel__content__form__section__header__prompt">
                Select the access point of the current DataProduct that the
                first test in this suite will verify
              </div>
              <CustomSelectorInput
                options={accessPointOptions}
                onChange={(opt: ItemOption | null): void =>
                  setSelectedAccessPointId(opt?.value)
                }
                value={selectedApOption}
                placeholder="Select access point..."
                isClearable={false}
                darkMode={true}
                disabled={accessPointOptions.length === 0}
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
  (props: { suiteState: DataProductTestSuiteState; onClose: () => void }) => {
    const { suiteState, onClose } = props;
    const editorStore = suiteState.editorStore;
    const applicationStore = editorStore.applicationStore;
    const inputRef = useRef<HTMLInputElement>(null);

    const existingIds = suiteState.suite.tests.map((t) => t.id);
    const [testName, setTestName] = useState<string | undefined>(undefined);
    const [selectedAccessPointId, setSelectedAccessPointId] = useState<
      string | undefined
    >(undefined);
    const testNameError = validateTestableId(testName, existingIds);

    const accessPointOptions: ItemOption[] =
      suiteState.testableState.ownAccessPoints.map((ap) => ({
        value: ap.id,
        label: ap.id,
      }));
    const selectedApOption =
      accessPointOptions.find((o) => o.value === selectedAccessPointId) ?? null;

    const isValid = testName && !testNameError && selectedAccessPointId;

    const create = (): void => {
      if (!testName || !selectedAccessPointId) {
        return;
      }
      flowResult(suiteState.addNewTest(testName, selectedAccessPointId))
        .then((err) => {
          if (err) {
            applicationStore.notificationService.notifyError(err);
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
                Access Point to Test
              </div>
              <div className="panel__content__form__section__header__prompt">
                Select which access point of the DataProduct this test will
                verify
              </div>
              <CustomSelectorInput
                options={accessPointOptions}
                onChange={(opt: ItemOption | null): void =>
                  setSelectedAccessPointId(opt?.value)
                }
                value={selectedApOption}
                placeholder="Select access point..."
                isClearable={false}
                darkMode={true}
                disabled={accessPointOptions.length === 0}
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
      testSuite: DataProductTestSuite;
      testableState: DataProductTestableState;
    }
  >(function SuiteHeaderTabContextMenu(props, ref) {
    const { testSuite, testableState } = props;
    const deleteSuite = (): void => {
      const suiteState = testableState.suiteStates.find(
        (s) => s.suite === testSuite,
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

export const DataProductTestableEditor = observer(
  (props: {
    dataProductEditorState: DataProductEditorState;
    isReadOnly: boolean;
  }) => {
    const { dataProductEditorState, isReadOnly } = props;
    const testableState = dataProductEditorState.testableState;
    const selectedSuiteState = testableState.selectedSuiteState;
    const dp = testableState.dataProduct;

    const addSuite = (): void => {
      testableState.setShowCreateSuiteModal(true);
    };

    const changeSuite = (suite: DataProductTestSuite): void => {
      testableState.changeSuite(suite);
    };

    const renameSuite = (val: string): void =>
      testSuite_setId(guaranteeNonNullable(testableState.suiteToRename), val);

    return (
      <Panel className="service-test-suite-editor">
        <PanelLoadingIndicator
          isLoading={testableState.runningAllTestsState.isInProgress}
        />

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
          {dp.tests.length ? (
            <PanelHeader className="service-test-suite-editor__header service-test-suite-editor__header--with-tabs">
              <div className="uml-element-editor__tabs">
                {dp.tests.map((suite) => (
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
          {!dp.tests.length && (
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
