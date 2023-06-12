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
  BlankPanelPlaceholder,
  MenuContent,
  MenuContentItem,
  BlankPanelContent,
  PanelHeaderActionItem,
  PanelHeaderActions,
  Panel,
  PanelHeader,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import type { ServiceTestSuite } from '@finos/legend-graph';
import { ServiceTestDataEditor } from './ServiceTestDataEditor.js';
import { ServiceTestsEditor } from './ServiceTestsEditor.js';
import { forwardRef } from 'react';
import { testSuite_setId } from '../../../../../stores/graph-modifier/Testable_GraphModifierHelper.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import type {
  ServiceTestableState,
  ServiceTestSuiteState,
} from '../../../../../stores/editor/editor-state/element-editor-state/service/testable/ServiceTestableState.js';
import { useApplicationNavigationContext } from '@finos/legend-application';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../../__lib__/LegendStudioApplicationNavigationContext.js';
import { RenameModal } from '../../testable/TestableSharedComponents.js';

export const ServiceTestSuiteEditor = observer(
  (props: { serviceTestSuiteState: ServiceTestSuiteState }) => {
    const { serviceTestSuiteState } = props;
    const serviceRuntime =
      serviceTestSuiteState.testableState.serviceEditorState.executionState
        .serviceExecutionParameters?.runtime;

    return (
      <div className="service-test-suite-editor">
        {serviceRuntime ? (
          <ResizablePanelGroup orientation="horizontal">
            <ResizablePanel size={300} minSize={28}>
              {serviceTestSuiteState.testDataState && (
                <ServiceTestDataEditor
                  testDataState={serviceTestSuiteState.testDataState}
                />
              )}
              {!serviceTestSuiteState.testDataState && (
                <BlankPanelContent>No test data specified</BlankPanelContent>
              )}
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel minSize={56}>
              <ServiceTestsEditor suiteState={serviceTestSuiteState} />
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <ServiceTestsEditor suiteState={serviceTestSuiteState} />
        )}
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
      <MenuContent ref={ref}>
        <MenuContentItem onClick={rename}>Rename</MenuContentItem>
        <MenuContentItem onClick={deleteSuite}>Delete</MenuContentItem>
      </MenuContent>
    );
  }),
);

export const ServiceTestableEditor = observer(
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
      <Panel className="service-test-suite-editor">
        <PanelHeader>
          {service.tests.length ? (
            <PanelHeader className="service-test-suite-editor__header service-test-suite-editor__header--with-tabs">
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
            </PanelHeader>
          ) : (
            <div></div>
          )}
          <PanelHeaderActions>
            <PanelHeaderActionItem onClick={addSuite} title="Add Service Suite">
              <PlusIcon />
            </PanelHeaderActionItem>
          </PanelHeaderActions>
        </PanelHeader>
        <Panel className="service-test-suite-editor">
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
              tooltipText="Click to add test suite"
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
        </Panel>
      </Panel>
    );
  },
);
