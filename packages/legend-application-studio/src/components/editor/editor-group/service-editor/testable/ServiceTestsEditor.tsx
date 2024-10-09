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
  ContextMenu,
  PlusIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  MenuContent,
  MenuContentItem,
  clsx,
  FlaskIcon,
  RunAllIcon,
  RunErrorsIcon,
  CheckCircleIcon,
  TimesCircleIcon,
  TestTubeIcon,
  CustomSelectorInput,
  Dialog,
  RefreshIcon,
  TimesIcon,
  FilledWindowMaximizeIcon,
  PlayIcon,
} from '@finos/legend-art';
import {
  type ValueSpecification,
  PrimitiveInstanceValue,
  PrimitiveType,
  PureMultiExecution,
  resolveServiceQueryRawLambda,
} from '@finos/legend-graph';
import {
  BasicValueSpecificationEditor,
  instanceValue_setValue,
} from '@finos/legend-query-builder';
import {
  filterByType,
  guaranteeNonNullable,
  prettyCONSTName,
} from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { forwardRef, useEffect, useState } from 'react';
import type { ServiceTestSuiteState } from '../../../../../stores/editor/editor-state/element-editor-state/service/testable/ServiceTestableState.js';
import {
  type KeyOption,
  type ServiceTestSetupState,
  type ServiceTestState,
  ServiceValueSpecificationTestParameterState,
} from '../../../../../stores/editor/editor-state/element-editor-state/service/testable/ServiceTestEditorState.js';
import { TESTABLE_TEST_TAB } from '../../../../../stores/editor/editor-state/element-editor-state/testable/TestableEditorState.js';
import {
  atomicTest_setId,
  testAssertion_setId,
} from '../../../../../stores/graph-modifier/Testable_GraphModifierHelper.js';
import {
  getTestableResultFromTestResult,
  TESTABLE_RESULT,
} from '../../../../../stores/editor/sidebar-state/testable/GlobalTestRunnerState.js';
import { getTestableResultIcon } from '../../../side-bar/testable/GlobalTestRunner.js';
import {
  ExternalFormatParameterEditorModal,
  RenameModal,
  TestAssertionEditor,
  TestAssertionItem,
} from '../../testable/TestableSharedComponents.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../../__lib__/LegendStudioTesting.js';
import {
  getContentTypeWithParamFromQuery,
  type TestParamContentType,
} from '../../../../../stores/editor/utils/TestableUtils.js';

export const NewParameterModal = observer(
  (props: { setupState: ServiceTestSetupState; isReadOnly: boolean }) => {
    const { setupState, isReadOnly } = props;
    const applicationStore = setupState.editorStore.applicationStore;
    const currentOption = {
      value: setupState.newParameterValueName,
      label: setupState.newParameterValueName,
    };
    const options = setupState.newParamOptions;
    const closeModal = (): void => setupState.setShowNewParameterModal(false);
    const onChange = (val: { label: string; value: string } | null): void => {
      if (val === null) {
        setupState.setNewParameterValueName('');
      } else if (val.value !== setupState.newParameterValueName) {
        setupState.setNewParameterValueName(val.value);
      }
    };
    return (
      <Dialog
        open={setupState.showNewParameterModal}
        onClose={closeModal}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setupState.addParameterValue();
          }}
          className="modal modal--dark search-modal"
        >
          <div className="modal__title">New Test Parameter Value </div>
          <CustomSelectorInput
            className="panel__content__form__section__dropdown"
            options={options}
            onChange={onChange}
            value={currentOption}
            escapeClearsValue={true}
            darkMode={
              !applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
            disabled={isReadOnly}
          />
          <div className="search-modal__actions">
            <button className="btn btn--dark" disabled={isReadOnly}>
              Add
            </button>
          </div>
        </form>
      </Dialog>
    );
  },
);

const ServiceTestParameterEditor = observer(
  (props: {
    isReadOnly: boolean;
    paramState: ServiceValueSpecificationTestParameterState;
    serviceTestState: ServiceTestState;
    contentTypeParamPair: TestParamContentType | undefined;
  }) => {
    const { serviceTestState, paramState, isReadOnly, contentTypeParamPair } =
      props;
    const [showPopUp, setShowPopUp] = useState(false);
    const setupState = serviceTestState.setupState;
    const paramIsRequired =
      paramState.varExpression.multiplicity.lowerBound > 0;
    const type = contentTypeParamPair
      ? contentTypeParamPair.contentType
      : (paramState.varExpression.genericType?.value.rawType.name ?? 'unknown');
    const paramValue =
      paramState.varExpression.genericType?.value.rawType === PrimitiveType.BYTE
        ? atob(
            (paramState.valueSpec as PrimitiveInstanceValue)
              .values[0] as string,
          )
        : ((paramState.valueSpec as PrimitiveInstanceValue)
            .values[0] as string);

    const openInPopUp = (): void => setShowPopUp(!showPopUp);
    const closePopUp = (): void => setShowPopUp(false);
    const updateParamValue = (val: string): void => {
      if (paramState.valueSpec instanceof PrimitiveInstanceValue) {
        instanceValue_setValue(
          paramState.valueSpec,
          paramState.varExpression.genericType?.value.rawType ===
            PrimitiveType.BYTE
            ? btoa(val)
            : val,
          0,
          setupState.editorStore.changeDetectionState.observerContext,
        );
        paramState.updateValueSpecification(paramState.valueSpec);
      }
    };

    return (
      <div
        key={paramState.parameterValue.name}
        className="panel__content__form__section"
      >
        <div className="panel__content__form__section__header__label">
          {paramState.parameterValue.name}
          <button
            className={clsx('type-tree__node__type__label', {})}
            tabIndex={-1}
            title={type}
          >
            {type}
          </button>
        </div>
        <>
          {contentTypeParamPair ? (
            <div className="service-test-editor__setup__parameter__code-editor">
              <textarea
                className="panel__content__form__section__textarea value-spec-editor__input"
                spellCheck={false}
                value={paramValue}
                placeholder={
                  ((paramState.valueSpec as PrimitiveInstanceValue)
                    .values[0] as string) === ''
                    ? '(empty)'
                    : undefined
                }
                onChange={(event) => {
                  updateParamValue(event.target.value);
                }}
              />
              {showPopUp && (
                <ExternalFormatParameterEditorModal
                  valueSpec={paramState.valueSpec}
                  varExpression={paramState.varExpression}
                  isReadOnly={isReadOnly}
                  onClose={closePopUp}
                  updateParamValue={updateParamValue}
                  contentTypeParamPair={contentTypeParamPair}
                />
              )}
              <div className="service-test-editor__setup__parameter__value__actions">
                <button
                  className={clsx(
                    'service-test-editor__setup__parameter__code-editor__expand-btn',
                  )}
                  onClick={openInPopUp}
                  tabIndex={-1}
                  title="Open in a popup..."
                >
                  <FilledWindowMaximizeIcon />
                </button>
                <button
                  className={clsx(
                    'btn--icon btn--dark btn--sm service-test-editor__setup__parameter__code-editor__expand-btn',
                  )}
                  disabled={isReadOnly || paramIsRequired}
                  onClick={(): void =>
                    setupState.removeParamValueState(paramState)
                  }
                  tabIndex={-1}
                  title={
                    paramIsRequired ? 'Parameter Required' : 'Remove Parameter'
                  }
                >
                  <TimesIcon />
                </button>
              </div>
            </div>
          ) : (
            <div className="service-test-editor__setup__parameter__value">
              <BasicValueSpecificationEditor
                valueSpecification={paramState.valueSpec}
                setValueSpecification={(val: ValueSpecification): void => {
                  paramState.updateValueSpecification(val);
                }}
                graph={setupState.editorStore.graphManagerState.graph}
                observerContext={
                  setupState.editorStore.changeDetectionState.observerContext
                }
                typeCheckOption={{
                  expectedType:
                    paramState.varExpression.genericType?.value.rawType ??
                    PrimitiveType.STRING,
                }}
                className="query-builder__parameters__value__editor"
                resetValue={(): void => {
                  paramState.resetValueSpec();
                }}
              />
              <div className="service-test-editor__setup__parameter__value__actions">
                <button
                  className="btn--icon btn--dark btn--sm"
                  disabled={isReadOnly || paramIsRequired}
                  onClick={(): void =>
                    setupState.removeParamValueState(paramState)
                  }
                  tabIndex={-1}
                  title={
                    paramIsRequired ? 'Parameter Required' : 'Remove Parameter'
                  }
                >
                  <TimesIcon />
                </button>
              </div>
            </div>
          )}
        </>
      </div>
    );
  },
);

const ServiceTestSetupEditor = observer(
  (props: { serviceTestState: ServiceTestState }) => {
    const { serviceTestState } = props;
    const setupState = serviceTestState.setupState;
    const applicationStore = setupState.editorStore.applicationStore;
    const test = serviceTestState.test;
    const format = test.serializationFormat;
    const selectedSerializationFormat = setupState.getSelectedFormatOption();
    const options = setupState.options;
    const keyOptions = setupState.keyOptions;
    const selectedKeys = setupState.getSelectedKeyOptions();
    const isReadOnly =
      serviceTestState.suiteState.testableState.serviceEditorState.isReadOnly;
    const onSerializationFormatChange = (
      val: { label: string; value: string } | null,
    ): void => {
      if (val === null) {
        setupState.changeSerializationFormat(undefined);
      } else if (val.value !== format) {
        setupState.changeSerializationFormat(val.value);
      }
    };
    const onKeyOptionChange = (val: KeyOption[]): void => {
      setupState.addServiceTestAssertKeys(val.map((op) => op.value));
    };
    const addParameter = (): void => {
      setupState.setShowNewParameterModal(true);
    };
    const generateParameterValues = (): void => {
      setupState.generateTestParameterValues();
    };

    useEffect(() => {
      setupState.syncWithQuery();
    }, [setupState]);

    return (
      <div
        data-testid={LEGEND_STUDIO_TEST_ID.SERVICE_TEST_EDITOR__SETUP}
        className="panel service-test-editor"
      >
        <div className="panel__header">
          <div className="service-test-suite-editor__header__title">
            <div className="service-test-suite-editor__header__title__label">
              setup
            </div>
          </div>
        </div>
        <div className="service-test-editor__content">
          <ResizablePanelGroup orientation="horizontal">
            <ResizablePanel size={230} minSize={28}>
              <div className="service-test-data-editor panel">
                <div className="service-test-suite-editor__header">
                  <div className="service-test-suite-editor__header__title">
                    <div className="service-test-suite-editor__header__title__label">
                      configuration
                    </div>
                  </div>
                </div>
                <div className="service-test-editor__setup__configuration">
                  <div className="panel__content__form__section">
                    <div className="panel__content__form__section__header__label">
                      Serialization Format
                    </div>
                    <div className="panel__content__form__section__header__prompt">
                      Format to serialize execution result
                    </div>
                    <CustomSelectorInput
                      className="panel__content__form__section__dropdown"
                      options={options}
                      onChange={onSerializationFormatChange}
                      value={selectedSerializationFormat}
                      isClearable={true}
                      escapeClearsValue={true}
                      darkMode={
                        !applicationStore.layoutService
                          .TEMPORARY__isLightColorThemeEnabled
                      }
                      disabled={isReadOnly}
                    />
                  </div>
                  {setupState.testState.testable.execution instanceof
                    PureMultiExecution && (
                    <div className="panel__content__form__section">
                      <div className="panel__content__form__section__header__label">
                        Keys
                      </div>
                      <div className="panel__content__form__section__header__prompt">
                        Specify keys for each test to run assertions against
                        selected env keys
                      </div>
                      <CustomSelectorInput
                        className="panel__content__form__section__dropdown"
                        options={keyOptions}
                        onChange={onKeyOptionChange}
                        value={selectedKeys}
                        isClearable={true}
                        escapeClearsValue={true}
                        darkMode={
                          !applicationStore.layoutService
                            .TEMPORARY__isLightColorThemeEnabled
                        }
                        isMulti={true}
                        disabled={isReadOnly}
                        placeholder="Choose keys..."
                      />
                    </div>
                  )}
                </div>
              </div>
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel minSize={56}>
              <div
                data-testid={
                  LEGEND_STUDIO_TEST_ID.SERVICE_TEST_EDITOR__SETUP__PARAMETERS
                }
                className="service-test-data-editor panel"
              >
                <div className="service-test-suite-editor__header">
                  <div className="service-test-suite-editor__header__title">
                    <div className="service-test-suite-editor__header__title__label">
                      parameters
                    </div>
                  </div>
                  <div className="panel__header__actions">
                    <button
                      className="panel__header__action service-execution-editor__test-data__generate-btn"
                      onClick={generateParameterValues}
                      title="Generate test parameter values"
                      tabIndex={-1}
                    >
                      <div className="service-execution-editor__test-data__generate-btn__label">
                        <RefreshIcon className="service-execution-editor__test-data__generate-btn__label__icon" />
                        <div className="service-execution-editor__test-data__generate-btn__label__title">
                          Generate
                        </div>
                      </div>
                    </button>
                    <button
                      className="panel__header__action"
                      tabIndex={-1}
                      disabled={!setupState.newParamOptions.length}
                      onClick={addParameter}
                      title="Add Parameter Value"
                    >
                      <PlusIcon />
                    </button>
                  </div>
                </div>
                <div className="service-test-editor__setup__parameters">
                  {setupState.parameterValueStates
                    .filter(
                      filterByType(ServiceValueSpecificationTestParameterState),
                    )
                    .map((paramState) => (
                      <ServiceTestParameterEditor
                        key={paramState.uuid}
                        isReadOnly={isReadOnly}
                        paramState={paramState}
                        serviceTestState={serviceTestState}
                        contentTypeParamPair={getContentTypeWithParamFromQuery(
                          resolveServiceQueryRawLambda(
                            serviceTestState.service,
                          ),
                          serviceTestState.editorStore,
                        ).find(
                          (pair) =>
                            pair.param === paramState.parameterValue.name,
                        )}
                      />
                    ))}
                </div>
                {setupState.showNewParameterModal && (
                  <NewParameterModal
                    setupState={setupState}
                    isReadOnly={false}
                  />
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    );
  },
);

const TestAssertionsEditor = observer(
  (props: { serviceTestState: ServiceTestState }) => {
    const { serviceTestState } = props;
    const isReadOnly =
      serviceTestState.suiteState.testableState.serviceEditorState.isReadOnly;
    const editorStore = serviceTestState.editorStore;
    const selectedAsertionState = serviceTestState.selectedAsertionState;
    const hideExplorer =
      serviceTestState.test.assertions.length === 1 &&
      serviceTestState.selectedAsertionState?.assertion.id ===
        serviceTestState.test.assertions[0]?.id;
    const addAssertion = (): void => serviceTestState.addAssertion();
    const renameAssertion = (val: string): void =>
      testAssertion_setId(
        guaranteeNonNullable(serviceTestState.assertionToRename),
        val,
      );
    const runTest = (): void => {
      flowResult(serviceTestState.runTest()).catch(
        editorStore.applicationStore.alertUnhandledError,
      );
    };
    return (
      <div className="panel service-test-editor">
        {hideExplorer && selectedAsertionState ? (
          <TestAssertionEditor testAssertionState={selectedAsertionState} />
        ) : (
          <div className="service-test-editor__content">
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel minSize={100} size={200}>
                <div className="binding-editor__header">
                  <div className="binding-editor__header__title">
                    <div className="testable-test-assertion-explorer__header__summary">
                      <div className="testable-test-assertion-explorer__header__summary__icon testable-test-assertion-explorer__header__summary__icon--assertion">
                        <TestTubeIcon />
                      </div>
                      <div>{serviceTestState.assertionCount}</div>
                    </div>
                    <div className="testable-test-assertion-explorer__header__summary">
                      <div className="testable-test-assertion-explorer__header__summary__icon testable-test-assertion-explorer__header__summary__icon--passed">
                        <CheckCircleIcon />
                      </div>
                      <div>{serviceTestState.assertionPassed}</div>
                    </div>
                    <div className="testable-test-assertion-explorer__header__summary">
                      <div className="testable-test-assertion-explorer__header__summary__icon testable-test-assertion-explorer__header__summary__icon--failed">
                        <TimesCircleIcon />
                      </div>
                      <div>{serviceTestState.assertionFailed}</div>
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
                  {serviceTestState.assertionEditorStates.map(
                    (assertionState) => (
                      <TestAssertionItem
                        key={assertionState.assertion.id}
                        testableTestState={serviceTestState}
                        testAssertionEditorState={assertionState}
                        isReadOnly={
                          serviceTestState.suiteState.testableState
                            .serviceEditorState.isReadOnly
                        }
                      />
                    ),
                  )}
                </div>
                {serviceTestState.assertionToRename && (
                  <RenameModal
                    val={serviceTestState.assertionToRename.id}
                    isReadOnly={isReadOnly}
                    showModal={true}
                    closeModal={(): void =>
                      serviceTestState.setAssertionToRename(undefined)
                    }
                    setValue={renameAssertion}
                  />
                )}
              </ResizablePanel>
              <ResizablePanelSplitter>
                <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
              </ResizablePanelSplitter>
              <ResizablePanel>
                {selectedAsertionState && (
                  <TestAssertionEditor
                    testAssertionState={selectedAsertionState}
                  />
                )}
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        )}
      </div>
    );
  },
);

const ServiceTestEditor = observer(
  (props: { serviceTestState: ServiceTestState }) => {
    const { serviceTestState } = props;
    const selectedTab = serviceTestState.selectedTab;
    return (
      <div className="service-test-editor panel">
        <div className="panel__header">
          <div className="panel__header service-test-editor__header--with-tabs">
            <div className="uml-element-editor__tabs">
              {Object.values(TESTABLE_TEST_TAB).map((tab) => (
                <div
                  key={tab}
                  onClick={(): void => serviceTestState.setSelectedTab(tab)}
                  className={clsx('service-test-editor__tab', {
                    'service-test-editor__tab--active':
                      tab === serviceTestState.selectedTab,
                  })}
                >
                  {prettyCONSTName(tab)}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="service-test-editor">
          {selectedTab === TESTABLE_TEST_TAB.SETUP && (
            <ServiceTestSetupEditor serviceTestState={serviceTestState} />
          )}

          {selectedTab === TESTABLE_TEST_TAB.ASSERTION && (
            <TestAssertionsEditor serviceTestState={serviceTestState} />
          )}
        </div>
      </div>
    );
  },
);

const ServiceTestDataContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      suiteState: ServiceTestSuiteState;
      serviceTestState: ServiceTestState;
    }
  >(function TestContainerContextMenu(props, ref) {
    const { suiteState, serviceTestState } = props;
    const addTest = (): void => {
      suiteState.addServiceTest();
    };
    const remove = (): void => suiteState.deleteTest(serviceTestState);
    const rename = (): void =>
      suiteState.setTestToRename(serviceTestState.test);
    const runTest =
      serviceTestState.editorStore.applicationStore.guardUnhandledError(() =>
        flowResult(serviceTestState.runTest()),
      );
    return (
      <MenuContent ref={ref}>
        <MenuContentItem
          disabled={
            suiteState.runningTestState.isInProgress ||
            serviceTestState.runningTestAction.isInProgress
          }
          onClick={runTest}
        >
          Run test
        </MenuContentItem>
        <MenuContentItem onClick={rename}>Rename</MenuContentItem>
        <MenuContentItem onClick={remove}>Delete</MenuContentItem>
        <MenuContentItem onClick={addTest}>Add test</MenuContentItem>
      </MenuContent>
    );
  }),
);

const ServiceTestItem = observer(
  (props: {
    suiteState: ServiceTestSuiteState;
    serviceTestState: ServiceTestState;
  }) => {
    const { serviceTestState, suiteState } = props;
    const serviceTest = serviceTestState.test;
    const isRunning = serviceTestState.runningTestAction.isInProgress;
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const isReadOnly = suiteState.testableState.serviceEditorState.isReadOnly;
    const openTest = (): void =>
      suiteState.setSelectedTestState(serviceTestState);
    const isActive = suiteState.selectedTestState?.test === serviceTest;
    const _testableResult = getTestableResultFromTestResult(
      serviceTestState.testResultState.result,
    );
    const testableResult = isRunning
      ? TESTABLE_RESULT.IN_PROGRESS
      : _testableResult;
    const resultIcon = getTestableResultIcon(testableResult);
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);
    const runTest =
      serviceTestState.editorStore.applicationStore.guardUnhandledError(() =>
        flowResult(serviceTestState.runTest()),
      );
    return (
      <ContextMenu
        disabled={isReadOnly}
        content={
          <ServiceTestDataContextMenu
            suiteState={suiteState}
            serviceTestState={serviceTestState}
          />
        }
        menuProps={{ elevation: 7 }}
        onOpen={onContextMenuOpen}
        onClose={onContextMenuClose}
      >
        <div
          className={clsx(
            'testable-test-explorer__item',
            {
              'testable-test-explorer__item--selected-from-context-menu':
                !isActive && isSelectedFromContextMenu,
            },
            { 'testable-test-explorer__item--active': isActive },
          )}
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
              {serviceTest.id}
            </div>
          </button>
          <div className="mapping-test-explorer__item__actions">
            <button
              className="mapping-test-explorer__item__action mapping-test-explorer__run-test-btn"
              onClick={runTest}
              disabled={
                suiteState.runningTestState.isInProgress ||
                serviceTestState.runningTestAction.isInProgress
              }
              tabIndex={-1}
              title={`Run ${serviceTest.id}`}
            >
              {<PlayIcon />}
            </button>
          </div>
        </div>
      </ContextMenu>
    );
  },
);

export const ServiceTestsEditor = observer(
  (props: { suiteState: ServiceTestSuiteState }) => {
    const { suiteState } = props;
    const editorStore = suiteState.editorStore;
    const isReadOnly = suiteState.testableState.serviceEditorState.isReadOnly;
    const addTest = (): void => suiteState.addServiceTest();
    const runSuite = (): void => {
      flowResult(suiteState.runSuite()).catch(
        editorStore.applicationStore.alertUnhandledError,
      );
    };
    const runFailingTests = (): void => {
      flowResult(suiteState.runFailingTests()).catch(
        editorStore.applicationStore.alertUnhandledError,
      );
    };
    const renameTest = (val: string): void =>
      atomicTest_setId(guaranteeNonNullable(suiteState.testToRename), val);
    return (
      <div
        data-testid={LEGEND_STUDIO_TEST_ID.SERVICE_TEST_EDITOR}
        className="panel service-test-editor"
      >
        <div className="service-test-suite-editor__header">
          <div className="service-test-suite-editor__header__title">
            <div className="service-test-suite-editor__header__title__label service-test-suite-editor__header__title__label--tests">
              tests
            </div>
          </div>
        </div>
        <div className="service-test-editor__content">
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel minSize={100} size={300}>
              <div className="binding-editor__header">
                <div className="binding-editor__header__title">
                  <div className="testable-test-assertion-explorer__header__summary">
                    <div className="testable-test-assertion-explorer__header__summary__icon testable-test-assertion-explorer__header__summary__icon--test">
                      <FlaskIcon />
                    </div>
                    <div>{suiteState.testCount}</div>
                  </div>
                  <div className="testable-test-assertion-explorer__header__summary">
                    <div className="testable-test-assertion-explorer__header__summary__icon testable-test-assertion-explorer__header__summary__icon--passed">
                      <CheckCircleIcon />
                    </div>
                    <div>{suiteState.testPassed}</div>
                  </div>
                  <div className="testable-test-assertion-explorer__header__summary">
                    <div className="testable-test-assertion-explorer__header__summary__icon testable-test-assertion-explorer__header__summary__icon--failed">
                      <TimesCircleIcon />
                    </div>
                    <div>{suiteState.testFailed}</div>
                  </div>
                </div>
                <div className="panel__header__actions">
                  <button
                    className="panel__header__action testable-test-explorer__play__all__icon"
                    tabIndex={-1}
                    onClick={runSuite}
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
                    title="Add Service Test"
                  >
                    <PlusIcon />
                  </button>
                </div>
              </div>
              <div>
                {suiteState.testStates.map((testState) => (
                  <ServiceTestItem
                    key={testState.test.id}
                    suiteState={suiteState}
                    serviceTestState={testState}
                  />
                ))}
              </div>
              {suiteState.testToRename && (
                <RenameModal
                  val={suiteState.testToRename.id}
                  isReadOnly={isReadOnly}
                  showModal={true}
                  closeModal={(): void => suiteState.setTestToRename(undefined)}
                  setValue={renameTest}
                />
              )}
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel>
              {suiteState.selectedTestState && (
                <ServiceTestEditor
                  serviceTestState={suiteState.selectedTestState}
                />
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    );
  },
);
