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
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  clsx,
  PlusIcon,
  ContextMenu,
  Dialog,
  BlankPanelPlaceholder,
  Panel,
  LockIcon,
  ModalTitle,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import {
  PureSingleExecution,
  type ServiceExecution,
  type ServiceTestSuite,
} from '@finos/legend-graph';
import { ServiceTestDataEditor } from './ServiceTestDataEditor.js';
import { ServiceTestsEditor } from './ServiceTestsEditor.js';
import { forwardRef, useState } from 'react';
import { testSuite_setId } from '../../../../../stores/shared/modifier/Testable_GraphModifierHelper.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import type {
  ServiceTestableState,
  ServiceTestSuiteState,
} from '../../../../../stores/editor-state/element-editor-state/service/testable/ServiceTestableState.js';
import { useApplicationNavigationContext } from '@finos/legend-application';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../../stores/LegendStudioApplicationNavigationContext.js';
import { UnsupportedEditorPanel } from '../../UnsupportedElementEditor.js';

export const ServiceTestSuiteEditor = observer(
  (props: { serviceTestSuiteState: ServiceTestSuiteState }) => {
    const { serviceTestSuiteState } = props;
    return (
      <div className="service-test-suite-editor">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel size={300} minSize={28}>
            <ServiceTestDataEditor
              testDataState={serviceTestSuiteState.testDataState}
            />
          </ResizablePanel>
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
          </ResizablePanelSplitter>
          <ResizablePanel minSize={56}>
            <ServiceTestsEditor suiteState={serviceTestSuiteState} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
);

const ServiceSuiteHeaderTabContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      testSuite: ServiceTestSuite;
      testableState: ServiceTestableState;
    }
  >(function MappingEditorHeaderTabContextMenu(props, ref) {
    const { testSuite, testableState } = props;
    const deleteSuite = (): void => testableState.deleteSuite(testSuite);
    const rename = (): void => testableState.setSuiteToRename(testSuite);

    return (
      <div ref={ref} className="mapping-editor__header__tab__context-menu">
        <button
          className="mapping-editor__header__tab__context-menu__item"
          onClick={rename}
        >
          Rename
        </button>
        <button
          className="mapping-editor__header__tab__context-menu__item"
          onClick={deleteSuite}
        >
          Delete
        </button>
      </div>
    );
  }),
);

export const RenameModal = observer(
  (props: {
    val: string;
    isReadOnly: boolean;
    setValue: (val: string) => void;
    showModal: boolean;
    closeModal: () => void;
  }) => {
    const { val, isReadOnly, showModal, closeModal, setValue } = props;
    const [inputValue, setInputValue] = useState(val);
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      setInputValue(event.target.value);
    };
    return (
      <Dialog
        open={showModal}
        onClose={closeModal}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setValue(inputValue);
            closeModal();
          }}
          className="modal modal--dark search-modal"
        >
          <ModalTitle title="Rename" />
          <div>
            <input
              className="panel__content__form__section__input"
              spellCheck={false}
              disabled={isReadOnly}
              value={inputValue}
              onChange={changeValue}
            />
          </div>
          <div className="search-modal__actions">
            <button className="btn btn--dark" disabled={isReadOnly}>
              Rename
            </button>
          </div>
        </form>
      </Dialog>
    );
  },
);

const ServiceTestableEditor = observer(
  (props: { serviceTestableState: ServiceTestableState }) => {
    const { serviceTestableState } = props;
    const serviceEditorState = serviceTestableState.serviceEditorState;
    const service = serviceEditorState.service;
    const selectedSuite = serviceTestableState.selectedSuiteState?.suite;
    const changeSuite = (suite: ServiceTestSuite): void => {
      serviceTestableState.changeSuite(suite);
    };
    const addSuite = (): void => serviceTestableState.addTestSuite();
    const isReadOnly = serviceEditorState.isReadOnly;
    const renameSuite = (val: string): void =>
      testSuite_setId(
        guaranteeNonNullable(serviceTestableState.suiteToRename),
        val,
      );

    useApplicationNavigationContext(
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.SERVICE_EDITOR_TEST,
    );

    return (
      <div className="service-test-suite-editor panel">
        <div className="panel__header">
          {service.tests.length ? (
            <div className="panel__header service-test-suite-editor__header service-test-suite-editor__header--with-tabs">
              <div className="uml-element-editor__tabs">
                {service.tests.map((suite) => (
                  <div
                    key={suite.id}
                    onClick={(): void => changeSuite(suite)}
                    className={clsx('service-test-suite-editor__tab', {
                      'service-test-suite-editor__tab--active':
                        suite === selectedSuite,
                    })}
                  >
                    <ContextMenu
                      className="mapping-editor__header__tab__content"
                      content={
                        <ServiceSuiteHeaderTabContextMenu
                          testableState={serviceTestableState}
                          testSuite={suite}
                        />
                      }
                    >
                      {suite.id}
                    </ContextMenu>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div></div>
          )}
          <div className="panel__header__actions">
            <button
              className="panel__header__action"
              tabIndex={-1}
              onClick={addSuite}
              title="Add Service Suite"
            >
              <PlusIcon />
            </button>
          </div>
        </div>
        <div className="service-test-suite-editor panel">
          {serviceTestableState.selectedSuiteState && (
            <ServiceTestSuiteEditor
              serviceTestSuiteState={serviceTestableState.selectedSuiteState}
            />
          )}
          {!service.tests.length && (
            <BlankPanelPlaceholder
              text="Add Test Suite"
              onClick={addSuite}
              clickActionType="add"
              tooltipText="Click to add test"
            />
          )}
          {serviceTestableState.suiteToRename && (
            <RenameModal
              val={serviceTestableState.suiteToRename.id}
              isReadOnly={isReadOnly}
              showModal={true}
              closeModal={(): void =>
                serviceTestableState.setSuiteToRename(undefined)
              }
              setValue={renameSuite}
            />
          )}
        </div>
      </div>
    );
  },
);

const ServiceTestableUnsupportedEditor = observer(
  (props: { serviceTestableState: ServiceTestableState }) => {
    const { serviceTestableState } = props;
    const serviceEditorState = serviceTestableState.serviceEditorState;
    const isReadOnly = serviceEditorState.isReadOnly;
    return (
      <div className="unsupported-element-editor">
        <Panel>
          <div className="panel__header">
            <div className="panel__header__title">
              {isReadOnly && (
                <div className="uml-element-editor__header__lock">
                  <LockIcon />
                </div>
              )}
              <div className="panel__header__title__label">Service Tests</div>
            </div>
          </div>
          <div className="panel__content unsupported-element-editor__content">
            <UnsupportedEditorPanel
              text="Service Test Editor does not support services with no mapping and runtime. Please edit in text mode."
              isReadOnly={isReadOnly}
            />
          </div>
        </Panel>
      </div>
    );
  },
);

export const ServiceTestableWrapperEditor = observer(
  (props: {
    serviceTestableState: ServiceTestableState;
    serviceExecution: ServiceExecution;
  }) => {
    if (
      props.serviceExecution instanceof PureSingleExecution &&
      props.serviceExecution.runtime
    ) {
      return (
        <ServiceTestableEditor
          serviceTestableState={props.serviceTestableState}
        />
      );
    } else {
      return (
        <ServiceTestableUnsupportedEditor
          serviceTestableState={props.serviceTestableState}
        />
      );
    }
  },
);
