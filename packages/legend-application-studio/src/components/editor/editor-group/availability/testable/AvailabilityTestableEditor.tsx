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
import { forwardRef, useRef, useState } from 'react';
import {
  BlankPanelPlaceholder,
  clsx,
  ContextMenu,
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
  PanelContent,
  PanelFormTextField,
  PanelHeader,
  PanelHeaderActionItem,
  PanelHeaderActions,
  PlayIcon,
  PlusIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  RunAllIcon,
  RunErrorsIcon,
  TimesIcon,
} from '@finos/legend-art';
import {
  type AvailabilityBarrierTest,
  type AvailabilityTestSuite,
} from '@finos/legend-graph';
import {
  TESTABLE_RESULT,
  getTestableResultFromTestResult,
} from '../../../../../stores/editor/sidebar-state/testable/GlobalTestRunnerState.js';
import { getTestableResultIcon } from '../../../side-bar/testable/GlobalTestRunner.js';
import {
  AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT,
  type AvailabilityTestState,
  type AvailabilityTestSuiteState,
  type AvailabilityTestableState,
} from '../../../../../stores/editor/editor-state/element-editor-state/availability/testable/AvailabilityTestableState.js';
import {
  atomicTest_setId,
  testAssertion_setId,
  testSuite_setId,
} from '../../../../../stores/graph-modifier/Testable_GraphModifierHelper.js';
import { RenameModal } from '../../testable/TestableSharedComponents.js';
import { RelationElementsDataEditor } from '../../data-editor/RelationElementsDataEditor.js';
import { validateTestableId } from '../../../../../stores/editor/utils/TestableUtils.js';

// ─── Format helpers ─────────────────────────────────────────────────────────

const FORMAT_VALUES = Object.values(
  AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT,
) as AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT[];

const FormatSelector = observer(
  (props: {
    value: AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT;
    onChange: (v: AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT) => void;
    disabled?: boolean;
  }) => {
    const { value, onChange, disabled } = props;
    return (
      <div className="availability-test-editor__format-selector">
        {FORMAT_VALUES.map((format) => (
          <button
            key={format}
            type="button"
            className={clsx('availability-test-editor__format-btn', {
              'availability-test-editor__format-btn--active': value === format,
            })}
            onClick={(): void => onChange(format)}
            disabled={disabled}
            title={`Use ${format} watermark format`}
          >
            {format}
          </button>
        ))}
      </div>
    );
  },
);

// ─── Create Suite Modal ─────────────────────────────────────────────────────

const CreateSuiteModal = observer(
  (props: {
    testableState: AvailabilityTestableState;
    onClose: () => void;
  }) => {
    const { testableState, onClose } = props;
    const editorStore = testableState.editorState.editorStore;
    const applicationStore = editorStore.applicationStore;
    const inputRef = useRef<HTMLInputElement>(null);

    const existingSuiteIds = testableState.availability.tests.map(
      (suite) => suite.id,
    );
    const [suiteName, setSuiteName] = useState<string | undefined>(undefined);
    const [testName, setTestName] = useState<string | undefined>(undefined);
    const [format, setFormat] =
      useState<AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT>(
        AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT.DEFAULT,
      );

    const suiteError = validateTestableId(suiteName, existingSuiteIds);
    const testError = validateTestableId(testName, undefined);
    const isValid = Boolean(suiteName && !suiteError && testName && !testError);

    const create = (): void => {
      if (!suiteName || !testName) {
        return;
      }
      try {
        testableState.addSuite(format, suiteName, testName);
        onClose();
      } catch (err) {
        applicationStore.notificationService.notifyError(
          err instanceof Error ? err.message : String(err),
        );
      }
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
              name="Suite Name"
              prompt="Unique identifier for the test suite"
              placeholder="e.g. suite_1"
              value={suiteName}
              update={(v): void => setSuiteName(v ?? '')}
              errorMessage={suiteError}
            />
            <PanelFormTextField
              name="Test Name"
              prompt="Name for the first test in this suite"
              placeholder="e.g. test_1"
              value={testName}
              update={(v): void => setTestName(v ?? '')}
              errorMessage={testError}
            />
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Watermark Serialization Format
              </div>
              <div className="panel__content__form__section__header__prompt">
                This format is fixed for the life of the test.
              </div>
              <FormatSelector value={format} onChange={setFormat} />
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

// ─── Create Test Modal ──────────────────────────────────────────────────────

const CreateTestModal = observer(
  (props: { suiteState: AvailabilityTestSuiteState; onClose: () => void }) => {
    const { suiteState, onClose } = props;
    const applicationStore = suiteState.editorStore.applicationStore;
    const inputRef = useRef<HTMLInputElement>(null);

    const existingIds = suiteState.suite.tests.map((test) => test.id);
    const [testName, setTestName] = useState<string | undefined>(undefined);
    const [format, setFormat] =
      useState<AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT>(
        AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT.DEFAULT,
      );

    const testError = validateTestableId(testName, existingIds);
    const isValid = Boolean(testName && !testError);

    const create = (): void => {
      if (!testName) {
        return;
      }
      try {
        suiteState.addTest(format, testName);
        onClose();
      } catch (err) {
        applicationStore.notificationService.notifyError(
          err instanceof Error ? err.message : String(err),
        );
      }
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
              update={(v): void => setTestName(v ?? '')}
              errorMessage={testError}
            />
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Watermark Serialization Format
              </div>
              <div className="panel__content__form__section__header__prompt">
                This format is fixed for the life of the test.
              </div>
              <FormatSelector value={format} onChange={setFormat} />
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

// ─── Availability expected-JSON structured editor ───────────────────────────

const ReadOnlyField = (props: {
  label: string;
  value: string;
}): React.ReactElement => (
  <div className="availability-assertion-editor__field">
    <div className="availability-assertion-editor__field__label">
      {props.label}
    </div>
    <div className="availability-assertion-editor__field__value availability-assertion-editor__field__value--readonly">
      {props.value}
    </div>
  </div>
);

const asString = (val: unknown): string => {
  if (val === undefined || val === null) {
    return '';
  }
  if (typeof val === 'object') {
    return JSON.stringify(val);
  }
  return String(val);
};

const DefaultExpectedEditor = observer(
  (props: { testState: AvailabilityTestState }) => {
    const { testState } = props;
    const parsed = testState.parsedExpected;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return <div>Invalid expected JSON</div>;
    }
    const root = parsed as Record<string, unknown>;
    const evaluated =
      root.evaluatedWatermark && typeof root.evaluatedWatermark === 'object'
        ? (root.evaluatedWatermark as Record<string, unknown>)
        : {};
    const batches = Array.isArray(evaluated.watermarkBatches)
      ? (evaluated.watermarkBatches as unknown[])
      : [];
    const availabilityRef =
      root.availabilityDefinitionReference &&
      typeof root.availabilityDefinitionReference === 'object'
        ? (root.availabilityDefinitionReference as Record<string, unknown>)
        : {};
    const isReadOnly = testState.isReadOnly;

    return (
      <div className="availability-assertion-editor__content">
        <ReadOnlyField
          label="availabilityDefinitionUrn"
          value={asString(availabilityRef.availabilityDefinitionUrn)}
        />
        <ReadOnlyField
          label="evaluationResult"
          value={asString(root.evaluationResult)}
        />
        <ReadOnlyField label="eventId" value={asString(root.eventId)} />
        <ReadOnlyField label="watermarkId" value={asString(root.watermarkId)} />

        <div className="availability-assertion-editor__section">
          <div className="availability-assertion-editor__section__header">
            <div className="availability-assertion-editor__section__title">
              watermarkBatches
            </div>
            <button
              className="btn--icon btn--dark btn--sm"
              onClick={(): void => testState.addExpectedEntry()}
              disabled={isReadOnly}
              title="Add batch entry"
            >
              <PlusIcon />
            </button>
          </div>
          {batches.map((rawBatch, index) => {
            const batch =
              rawBatch && typeof rawBatch === 'object'
                ? (rawBatch as Record<string, unknown>)
                : {};
            const ref =
              batch.ingestDefinitionReference &&
              typeof batch.ingestDefinitionReference === 'object'
                ? (batch.ingestDefinitionReference as Record<string, unknown>)
                : {};
            return (
              <div
                key={`batch-${String(index)}`}
                className="availability-assertion-editor__entry"
              >
                <div className="availability-assertion-editor__entry__header">
                  <div className="availability-assertion-editor__entry__title">
                    watermarkBatches[{index}]
                  </div>
                  <button
                    className="btn--icon btn--caution btn--dark btn--sm"
                    onClick={(): void => testState.removeExpectedEntry(index)}
                    disabled={isReadOnly}
                    title="Remove batch entry"
                  >
                    <TimesIcon />
                  </button>
                </div>
                <ReadOnlyField
                  label="batchId"
                  value={asString(batch.batchId)}
                />
                <ReadOnlyField
                  label="ingestDefinitionPath"
                  value={asString(batch.ingestDefinitionPath)}
                />
                <ReadOnlyField
                  label="ingestDefinitionUrn"
                  value={asString(ref.ingestDefinitionUrn)}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);

const LiteExpectedEditor = observer(
  (props: { testState: AvailabilityTestState }) => {
    const { testState } = props;
    const parsed = testState.parsedExpected;
    const list = Array.isArray(parsed) ? (parsed as unknown[]) : [];
    const isReadOnly = testState.isReadOnly;

    return (
      <div className="availability-assertion-editor__content">
        <div className="availability-assertion-editor__section">
          <div className="availability-assertion-editor__section__header">
            <div className="availability-assertion-editor__section__title">
              LITE entries
            </div>
            <button
              className="btn--icon btn--dark btn--sm"
              onClick={(): void => testState.addExpectedEntry()}
              disabled={isReadOnly}
              title="Add entry"
            >
              <PlusIcon />
            </button>
          </div>
          {list.map((rawEntry, index) => {
            const entry =
              rawEntry && typeof rawEntry === 'object'
                ? (rawEntry as Record<string, unknown>)
                : {};
            return (
              <div
                key={`lite-${String(index)}`}
                className="availability-assertion-editor__entry"
              >
                <div className="availability-assertion-editor__entry__header">
                  <div className="availability-assertion-editor__entry__title">
                    entry[{index}]
                  </div>
                  <button
                    className="btn--icon btn--caution btn--dark btn--sm"
                    onClick={(): void => testState.removeExpectedEntry(index)}
                    disabled={isReadOnly}
                    title="Remove entry"
                  >
                    <TimesIcon />
                  </button>
                </div>
                <ReadOnlyField
                  label="ingestDefinitionPath"
                  value={asString(entry.ingestDefinitionPath)}
                />
                <ReadOnlyField
                  label="batchId"
                  value={asString(entry.batchId)}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);

const AlloyQueryExpectedEditor = observer(
  (props: { testState: AvailabilityTestState }) => {
    const { testState } = props;
    const parsed = testState.parsedExpected;
    const entries =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? Object.entries(parsed as Record<string, unknown>)
        : [];
    const isReadOnly = testState.isReadOnly;

    return (
      <div className="availability-assertion-editor__content">
        <div className="availability-assertion-editor__section">
          <div className="availability-assertion-editor__section__header">
            <div className="availability-assertion-editor__section__title">
              ALLOY_QUERY entries
            </div>
            <button
              className="btn--icon btn--dark btn--sm"
              onClick={(): void => testState.addExpectedEntry()}
              disabled={isReadOnly}
              title="Add entry"
            >
              <PlusIcon />
            </button>
          </div>
          {entries.map(([key, val], index) => {
            const obj =
              val && typeof val === 'object' && !Array.isArray(val)
                ? (val as Record<string, unknown>)
                : {};
            const batchId = typeof obj.batchId === 'number' ? obj.batchId : 0;
            return (
              <div
                key={`alloy-${String(index)}`}
                className="availability-assertion-editor__entry"
              >
                <div className="availability-assertion-editor__entry__header">
                  <div className="availability-assertion-editor__entry__title">
                    entry[{index}]
                  </div>
                  <button
                    className="btn--icon btn--caution btn--dark btn--sm"
                    onClick={(): void => testState.removeExpectedEntry(index)}
                    disabled={isReadOnly}
                    title="Remove entry"
                  >
                    <TimesIcon />
                  </button>
                </div>
                <div className="availability-assertion-editor__field">
                  <div className="availability-assertion-editor__field__label">
                    path
                  </div>
                  <input
                    className="availability-assertion-editor__field__input"
                    type="text"
                    value={key}
                    onChange={(e): void =>
                      testState.updateAlloyQueryPath(index, e.target.value)
                    }
                    disabled={isReadOnly}
                    placeholder="ingest definition path"
                  />
                </div>
                <div className="availability-assertion-editor__field">
                  <div className="availability-assertion-editor__field__label">
                    batchId
                  </div>
                  <input
                    className="availability-assertion-editor__field__input"
                    type="number"
                    value={batchId}
                    onChange={(e): void =>
                      testState.updateAlloyQueryBatchId(
                        index,
                        Number(e.target.value),
                      )
                    }
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);

const AvailabilityAssertionEditor = observer(
  (props: { testState: AvailabilityTestState }) => {
    const { testState } = props;
    return (
      <div className="availability-assertion-editor panel">
        <PanelHeader>
          <div className="availability-assertion-editor__title">
            <div className="availability-assertion-editor__title__label">
              Test
            </div>
            <div className="availability-assertion-editor__title__value">
              {testState.test.id}
            </div>
          </div>
          <div className="availability-assertion-editor__meta">
            <div className="availability-assertion-editor__meta__label">
              Format
            </div>
            <div className="availability-assertion-editor__meta__value">
              {testState.format}
            </div>
          </div>
        </PanelHeader>
        <PanelContent>
          <div className="availability-assertion-editor__body">
            <div className="availability-assertion-editor__body__section-title">
              Expected
            </div>
            {testState.format ===
              AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT.DEFAULT && (
              <DefaultExpectedEditor testState={testState} />
            )}
            {testState.format ===
              AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT.LITE && (
              <LiteExpectedEditor testState={testState} />
            )}
            {testState.format ===
              AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT.ALLOY_QUERY && (
              <AlloyQueryExpectedEditor testState={testState} />
            )}
          </div>
        </PanelContent>
      </div>
    );
  },
);

// ─── Test list item ─────────────────────────────────────────────────────────

const AvailabilityTestContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      suiteState: AvailabilityTestSuiteState;
      test: AvailabilityBarrierTest;
    }
  >(function AvailabilityTestContextMenu(props, ref) {
    const { suiteState, test } = props;
    return (
      <MenuContent ref={ref}>
        <MenuContentItem onClick={(): void => suiteState.setTestToRename(test)}>
          Rename
        </MenuContentItem>
        <MenuContentItem onClick={(): void => suiteState.deleteTest(test)}>
          Delete
        </MenuContentItem>
      </MenuContent>
    );
  }),
);

const AvailabilityTestItem = observer(
  (props: {
    suiteState: AvailabilityTestSuiteState;
    testState: AvailabilityTestState;
  }) => {
    const { suiteState, testState } = props;
    const isActive = suiteState.selectTestState === testState;
    const testResult = getTestableResultFromTestResult(
      testState.testResultState.result,
    );
    const icon = getTestableResultIcon(testResult);

    return (
      <ContextMenu
        className={clsx('testable-test-explorer__item', {
          'testable-test-explorer__item--active': isActive,
        })}
        content={
          <AvailabilityTestContextMenu
            suiteState={suiteState}
            test={testState.test}
          />
        }
      >
        <div
          className="testable-test-explorer__item__label"
          onClick={(): void => suiteState.changeTest(testState.test)}
          tabIndex={-1}
        >
          <div className="testable-test-explorer__item__label__icon">
            {icon}
          </div>
          <div className="testable-test-explorer__item__label__text">
            {testState.test.id}
          </div>
          <div className="testable-test-explorer__item__actions">
            <button
              className="testable-test-explorer__item__action"
              onClick={(event): void => {
                event.stopPropagation();
                flowResult(testState.runTest()).catch(
                  suiteState.editorStore.applicationStore.alertUnhandledError,
                );
              }}
              tabIndex={-1}
              title="Run Test"
            >
              <PlayIcon />
            </button>
          </div>
        </div>
      </ContextMenu>
    );
  },
);

// ─── Tests panel (right side) ───────────────────────────────────────────────

const AvailabilityTestsEditor = observer(
  (props: {
    suiteState: AvailabilityTestSuiteState;
    testableState: AvailabilityTestableState;
  }) => {
    const { suiteState, testableState } = props;
    const selectedTestState = suiteState.selectTestState;
    const isReadOnly = testableState.editorState.isReadOnly;

    return (
      <div className="panel service-test-editor">
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel minSize={100} size={220}>
            <div className="binding-editor__header">
              <div className="binding-editor__header__title">
                <div className="panel__header__title__content">Tests</div>
              </div>
              <div className="panel__header__actions">
                <button
                  className="panel__header__action"
                  tabIndex={-1}
                  onClick={(): void => {
                    flowResult(suiteState.runSuite()).catch(
                      suiteState.editorStore.applicationStore
                        .alertUnhandledError,
                    );
                  }}
                  disabled={suiteState.suite.tests.length === 0}
                  title="Run all tests in this suite"
                >
                  <RunAllIcon />
                </button>
                <button
                  className="panel__header__action"
                  tabIndex={-1}
                  onClick={(): void => {
                    flowResult(suiteState.runFailingTests()).catch(
                      suiteState.editorStore.applicationStore
                        .alertUnhandledError,
                    );
                  }}
                  disabled={suiteState.suite.tests.length === 0}
                  title="Run failing tests"
                >
                  <RunErrorsIcon />
                </button>
                {!isReadOnly && (
                  <button
                    className="panel__header__action"
                    tabIndex={-1}
                    onClick={(): void =>
                      testableState.setShowCreateTestModal(true)
                    }
                    title="Add test to this suite"
                  >
                    <PlusIcon />
                  </button>
                )}
              </div>
            </div>
            <div>
              {suiteState.testStates.map((testState) => (
                <AvailabilityTestItem
                  key={testState.test.id}
                  suiteState={suiteState}
                  testState={testState}
                />
              ))}
            </div>
          </ResizablePanel>
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
          </ResizablePanelSplitter>
          <ResizablePanel minSize={56}>
            {selectedTestState ? (
              <AvailabilityAssertionEditor testState={selectedTestState} />
            ) : (
              <BlankPanelPlaceholder
                text="Select a test"
                tooltipText="Select a test from the list above"
              />
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
);

// ─── Suite editor (horizontal split) ────────────────────────────────────────

const AvailabilitySuiteEditor = observer(
  (props: {
    suiteState: AvailabilityTestSuiteState;
    testableState: AvailabilityTestableState;
  }) => {
    const { suiteState, testableState } = props;
    const isReadOnly = testableState.editorState.isReadOnly;

    return (
      <div className="service-test-suite-editor">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel size={520} minSize={28}>
            <div className="panel service-test-data-editor">
              <div className="service-test-data-editor__data">
                <RelationElementsDataEditor
                  dataState={suiteState.testDataState}
                  isReadOnly={isReadOnly}
                  isSharedData={true}
                  hideColumnDefinitions={true}
                />
              </div>
            </div>
          </ResizablePanel>
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
          </ResizablePanelSplitter>
          <ResizablePanel minSize={56}>
            <AvailabilityTestsEditor
              suiteState={suiteState}
              testableState={testableState}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
);

// ─── Suite tab context menu ─────────────────────────────────────────────────

const AvailabilitySuiteContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      suite: AvailabilityTestSuite;
      testableState: AvailabilityTestableState;
    }
  >(function AvailabilitySuiteContextMenu(props, ref) {
    const { suite, testableState } = props;
    return (
      <MenuContent ref={ref}>
        <MenuContentItem
          onClick={(): void => testableState.setSuiteToRename(suite)}
        >
          Rename
        </MenuContentItem>
        <MenuContentItem onClick={(): void => testableState.deleteSuite(suite)}>
          Delete
        </MenuContentItem>
      </MenuContent>
    );
  }),
);

// ─── Top-level testable editor ──────────────────────────────────────────────

export const AvailabilityTestableEditor = observer(
  (props: { testableState: AvailabilityTestableState }) => {
    const { testableState } = props;
    const availability = testableState.availability;
    const selectedSuiteState = testableState.selectedSuiteState;
    const isReadOnly = testableState.editorState.isReadOnly;

    const renameSuite = (val: string): void => {
      if (testableState.suiteToRename) {
        testSuite_setId(testableState.suiteToRename, val);
      }
    };

    const renameTest = (val: string): void => {
      const testToRename = testableState.selectedSuiteState?.testToRename;
      if (testToRename) {
        atomicTest_setId(testToRename, val);
      }
    };

    const renameAssertion = (val: string): void => {
      const assertionToRename =
        testableState.selectedSuiteState?.selectTestState?.assertionToRename;
      if (assertionToRename) {
        testAssertion_setId(assertionToRename, val);
      }
    };

    return (
      <Panel className="service-test-suite-editor">
        <PanelHeader>
          {availability.tests.length ? (
            <PanelHeader className="service-test-suite-editor__header service-test-suite-editor__header--with-tabs">
              <div className="uml-element-editor__tabs">
                {availability.tests.map((suite) => {
                  const isActive = selectedSuiteState?.suite === suite;
                  const suiteResult = selectedSuiteState
                    ? isActive
                      ? selectedSuiteState.result
                      : TESTABLE_RESULT.DID_NOT_RUN
                    : TESTABLE_RESULT.DID_NOT_RUN;
                  return (
                    <div
                      key={suite.id}
                      onClick={(): void => testableState.changeSuite(suite)}
                      className={clsx('service-test-suite-editor__tab', {
                        'service-test-suite-editor__tab--active': isActive,
                      })}
                    >
                      <ContextMenu
                        className="mapping-editor__header__tab__content"
                        content={
                          <AvailabilitySuiteContextMenu
                            suite={suite}
                            testableState={testableState}
                          />
                        }
                      >
                        <div className="testable-test-explorer__item__result">
                          {getTestableResultIcon(suiteResult)}
                        </div>
                        {suite.id}
                      </ContextMenu>
                    </div>
                  );
                })}
              </div>
            </PanelHeader>
          ) : (
            <div></div>
          )}

          <PanelHeaderActions>
            {!isReadOnly && (
              <PanelHeaderActionItem
                onClick={(): void =>
                  testableState.setShowCreateSuiteModal(true)
                }
                title="Add Suite"
              >
                <PlusIcon />
              </PanelHeaderActionItem>
            )}
          </PanelHeaderActions>
        </PanelHeader>

        <Panel className="service-test-suite-editor">
          {selectedSuiteState ? (
            <AvailabilitySuiteEditor
              suiteState={selectedSuiteState}
              testableState={testableState}
            />
          ) : (
            <BlankPanelPlaceholder
              text="Add Test Suite"
              onClick={(): void => testableState.setShowCreateSuiteModal(true)}
              clickActionType="add"
              tooltipText="Click to add availability test suite"
            />
          )}

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

          {testableState.suiteToRename && (
            <RenameModal
              val={testableState.suiteToRename.id}
              isReadOnly={isReadOnly}
              showModal={true}
              closeModal={(): void => testableState.setSuiteToRename(undefined)}
              setValue={renameSuite}
            />
          )}

          {selectedSuiteState?.testToRename && (
            <RenameModal
              val={selectedSuiteState.testToRename.id}
              isReadOnly={isReadOnly}
              showModal={true}
              closeModal={(): void =>
                selectedSuiteState.setTestToRename(undefined)
              }
              setValue={renameTest}
            />
          )}

          {selectedSuiteState?.selectTestState?.assertionToRename && (
            <RenameModal
              val={selectedSuiteState.selectTestState.assertionToRename.id}
              isReadOnly={isReadOnly}
              showModal={true}
              closeModal={(): void =>
                selectedSuiteState.selectTestState?.setAssertionToRename(
                  undefined,
                )
              }
              setValue={renameAssertion}
            />
          )}
        </Panel>
      </Panel>
    );
  },
);
