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
  EmptyCircleIcon,
  clsx,
} from '@finos/legend-art';
import type { TestAssertion } from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import { forwardRef } from 'react';
import type { ServiceAtomicTestState } from '../../../../../stores/editor-state/element-editor-state/service/ServiceTestEditorState';
import type { TestAssertionState } from '../../../../../stores/editor-state/element-editor-state/service/TestAssertionState';
import { TestAssertionEditor } from './TestAssertionEditor';

const TestAssertionContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      testAssertion?: TestAssertion;
      createTestContainer: () => void;
      deleteTestContainer?: () => void;
    }
  >(function TestContainerContextMenu(props, ref) {
    const { testAssertion, deleteTestContainer, createTestContainer } = props;
    const remove = (): void => deleteTestContainer?.();

    return (
      <MenuContent ref={ref}>
        {testAssertion && (
          <MenuContentItem onClick={remove}>Delete</MenuContentItem>
        )}
        {!testAssertion && (
          <MenuContentItem onClick={createTestContainer}>
            Create a new assert
          </MenuContentItem>
        )}
      </MenuContent>
    );
  }),
);

const TestAssertionItem = observer(
  (props: {
    assertionState: TestAssertionState;
    serviceAtomicTestState: ServiceAtomicTestState;
    isReadOnly: boolean;
  }) => {
    const { assertionState, isReadOnly, serviceAtomicTestState } = props;
    // const openTestContainer = (): void =>
    //   testState.openTestContainer(testContainer);
    const isActive =
      serviceAtomicTestState.selectedAsertionState === assertionState;
    const testAssertion = assertionState.assertion;
    const testStatusIcon: React.ReactNode = (
      <div
        title="Test did not run"
        className="testable-test-assertion-explorer__test-result-indicator testable-test-assertion-explorer__test-result-indicator--none"
      >
        <EmptyCircleIcon />
      </div>
    );

    const createTestAssertion = (): void =>
      serviceAtomicTestState.addAssertion();
    const deleteTestAssertion = (): void =>
      serviceAtomicTestState.deleteAssertion(assertionState);

    const openTestAssertion = (): void =>
      serviceAtomicTestState.setAssertionState(assertionState);
    return (
      <ContextMenu
        className={clsx(
          'testable-test-assertion-explorer__item',
          {
            'testable-test-assertion-explorer__item--selected-from-context-menu':
              !isActive,
          },
          { 'testable-test-assertion-explorer__item--active': isActive },
        )}
        disabled={isReadOnly}
        content={
          <TestAssertionContextMenu
            testAssertion={testAssertion}
            createTestContainer={createTestAssertion}
            deleteTestContainer={deleteTestAssertion}
          />
        }
        menuProps={{ elevation: 7 }}
        // onOpen={onContextMenuOpen}
        // onClose={onContextMenuClose}
      >
        <button
          className={clsx('testable-test-assertion-explorer__item__label')}
          onClick={openTestAssertion}
          tabIndex={-1}
        >
          <div className="testable-test-assertion-explorer__item__label__icon testable-test-assertion-explorer__test-result-indicator__container">
            {testStatusIcon}
          </div>
          <div className="testable-test-assertion-explorer__item__label__text">
            {assertionState.assertion.id}
          </div>
        </button>
      </ContextMenu>
    );
  },
);
export const ServiceTestEditor = observer(
  (props: { serviceAtomicTestState: ServiceAtomicTestState }) => {
    const { serviceAtomicTestState } = props;
    const serviceEditorState =
      serviceAtomicTestState.testSuiteState.serviceTestableState
        .serviceEditorState;
    const isReadOnly = serviceEditorState.isReadOnly;
    const onSelectTest = (test: TestAssertionState): void =>
      serviceAtomicTestState.setAssertionState(test);
    const selectedAssertionState = serviceAtomicTestState.selectedAsertionState;
    const deleteAssertion = (testAssertion: TestAssertion): void => {
      // TODO
    };
    const addAssertion = (): void => {
      // TODO
    };
    const addParameter = (): void => {
      // TODO
    };
    return (
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel size={150} minSize={50}>
          <div className="panel__header">
            <div className="service-test-suite-editor__header__title">
              <div className="service-test-suite-editor__header__title__label">
                Parameters
              </div>
            </div>
            <div className="panel__header__actions">
              <button
                className="panel__header__action"
                tabIndex={-1}
                onClick={addParameter}
                title="Add Parameter"
              >
                <PlusIcon />
              </button>
            </div>
          </div>
          <div></div>
        </ResizablePanel>
        <ResizablePanelSplitter>
          <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
        </ResizablePanelSplitter>
        <ResizablePanel>
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel minSize={100}>
              <div className="binding-editor__header">
                <div className="binding-editor__header__title">
                  <div className="binding-editor__header__title__label">
                    Assertions
                  </div>
                </div>
                <div className="panel__header__actions">
                  <button
                    className="panel__header__action"
                    tabIndex={-1}
                    onClick={addAssertion}
                    title="Add Assertion"
                  >
                    <PlusIcon />
                  </button>
                </div>
              </div>
              <div>
                {serviceAtomicTestState.assertionStates.map((assertion) => (
                  <TestAssertionItem
                    key={assertion.assertion.id}
                    assertionState={assertion}
                    serviceAtomicTestState={serviceAtomicTestState}
                    isReadOnly={isReadOnly}
                  />
                ))}
              </div>
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel>
              {serviceAtomicTestState.selectedAsertionState && (
                <TestAssertionEditor
                  testAssertionState={
                    serviceAtomicTestState.selectedAsertionState
                  }
                />
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  },
);
