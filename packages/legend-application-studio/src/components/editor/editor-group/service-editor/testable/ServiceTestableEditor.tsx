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
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import type { ServiceTestSuite } from '@finos/legend-graph';
import { ServiceTestDataEditor } from './ServiceTestDataEditor.js';
import { ServiceTestsEditor } from './ServiceTestsEditor.js';
import { forwardRef, useEffect } from 'react';
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

    useEffect(() => {
      serviceTestableState.init();
    }, [serviceTestableState]);

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
        </div>
      </div>
    );
  },
);
