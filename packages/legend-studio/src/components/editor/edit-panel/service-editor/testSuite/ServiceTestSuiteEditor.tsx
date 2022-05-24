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
  type TreeNodeContainerProps,
  ChevronDownIcon,
  ChevronRightIcon,
  ContextMenu,
  PlusIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  TreeView,
  clsx,
  PURE_ConnectionIcon,
  FlaskIcon,
  BeakerIcon,
  TestTubeIcon,
  PURE_DataIcon,
} from '@finos/legend-art';
import { isNonNullable } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import {
  type ServiceTestSuiteEditorState,
  ConnectionTestDataState,
  ServiceAtomicTestState,
} from '../../../../../stores/editor-state/element-editor-state/service/ServiceTestEditorState';
import {
  type ServiceTestableTreeNodeData,
  type ServiceTestSuitesState,
  type ServiceTestSuiteState,
  ServiceTestAssertionTreeNodeData,
  ConnectionTestDataTreeNodeData,
  ServiceTestSuiteTreeNodeData,
  ServiceTestTreeNodeData,
  TestDataTreeNodeData,
} from '../../../../../stores/editor-state/element-editor-state/service/ServiceTestSuitesState';
import { ConnectionTestDataEditor } from './ServiceTestDataEditor';
import { ServiceTestEditor } from './ServiceTestEditor';

const isExpandable = (node: ServiceTestableTreeNodeData): boolean => {
  if (
    node instanceof ServiceTestAssertionTreeNodeData ||
    node instanceof ConnectionTestDataTreeNodeData
  ) {
    return false;
  }
  return true;
};

const getNodeIcon = (node: ServiceTestableTreeNodeData): React.ReactNode => {
  if (node instanceof ServiceTestSuiteTreeNodeData) {
    return <BeakerIcon />;
  } else if (node instanceof ServiceTestTreeNodeData) {
    return <FlaskIcon />;
  } else if (node instanceof ConnectionTestDataTreeNodeData) {
    return <PURE_ConnectionIcon />;
  } else if (node instanceof TestDataTreeNodeData) {
    return <PURE_DataIcon />;
  } else if (node instanceof ServiceTestAssertionTreeNodeData) {
    return <TestTubeIcon />;
  }
  return null;
};

const ServiceTestableTreeNodeContainer: React.FC<
  TreeNodeContainerProps<
    ServiceTestableTreeNodeData,
    {
      testableState: ServiceTestSuiteState;
    }
  >
> = (props) => {
  const { node, level, stepPaddingInRem, onNodeSelect } = props;
  const { testableState } = props.innerProps;
  const expandIcon = !isExpandable(node) ? (
    <div />
  ) : node.isOpen ? (
    <ChevronDownIcon />
  ) : (
    <ChevronRightIcon />
  );
  const nodeIcon = getNodeIcon(node);
  const isNodeSelected =
    testableState.serviceTestableState.selectedNode === node;

  const selectNode: React.MouseEventHandler = (event) => onNodeSelect?.(node);

  return (
    <ContextMenu content={null} menuProps={{ elevation: 7 }}>
      <div
        className={clsx(
          'tree-view__node__container service-test-suite-editor__explorer-tree__node__container',
          {
            'service-test-suite-editor__explorer-tree__node__container--selected':
              isNodeSelected,
          },
        )}
        onClick={selectNode}
        style={{
          paddingLeft: `${level * (stepPaddingInRem ?? 1)}rem`,
          display: 'flex',
        }}
      >
        <div className="tree-view__node__icon service-test-suite-editor__explorer-tree__node__icon">
          <div className="service-test-suite-editor__explorer-tree__node__icon__expand">
            {expandIcon}
          </div>

          <div className="global-test-runner__explorer-tree__node__result__icon__type">
            {nodeIcon}
          </div>
        </div>
        <div className="service-test-suite-editor__item__link__content">
          <span className="service-test-suite-editor__item__link__content__id">
            {node.label}
          </span>
        </div>
      </div>
    </ContextMenu>
  );
};
export const ServiceSuiteExplorer = observer(
  (props: { serviceTestSuiteState: ServiceTestSuiteState }) => {
    const { serviceTestSuiteState } = props;
    const getChildNodes = (
      node: ServiceTestableTreeNodeData,
    ): ServiceTestableTreeNodeData[] => {
      if (node.childrenIds) {
        return node.childrenIds
          .map((id) => serviceTestSuiteState.treeData.nodes.get(id))
          .filter(isNonNullable);
      }
      return [];
    };
    const onNodeSelect = (node: ServiceTestableTreeNodeData): void => {
      serviceTestSuiteState.onTreeNodeSelect(
        node,
        serviceTestSuiteState.treeData,
      );
    };
    return (
      <div className="panel">
        <TreeView
          components={{
            TreeNodeContainer: ServiceTestableTreeNodeContainer,
          }}
          treeData={serviceTestSuiteState.treeData}
          onNodeSelect={onNodeSelect}
          getChildNodes={getChildNodes}
          innerProps={{
            testableState: serviceTestSuiteState,
          }}
        />
      </div>
    );
  },
);

export const ServiceSelectedTestSuiteEditor = observer(
  (props: { serviceTestEditorState: ServiceTestSuiteEditorState }) => {
    const { serviceTestEditorState } = props;
    const renderSelectedEditorState = (
      selectedState: ServiceTestSuiteEditorState,
    ): React.ReactNode => {
      if (selectedState instanceof ServiceAtomicTestState) {
        return <ServiceTestEditor serviceAtomicTestState={selectedState} />;
      } else if (selectedState instanceof ConnectionTestDataState) {
        return (
          <ConnectionTestDataEditor connectionTestDataState={selectedState} />
        );
      }
      return null;
    };

    const renderSelectedEditorStateIcon = (
      selectedState: ServiceTestSuiteEditorState,
    ): React.ReactNode => {
      if (selectedState instanceof ServiceAtomicTestState) {
        return <FlaskIcon />;
      } else if (selectedState instanceof ConnectionTestDataState) {
        return <PURE_ConnectionIcon />;
      }
      return null;
    };
    return (
      <div className="service-test-suite-editor__selected panel">
        <div className="panel__header">
          <div className="service-test-suite-editor__header__title">
            <div className="service-test-suite-editor__header__title__label">
              {serviceTestEditorState.label()}
            </div>
            <div className="modal__title__icon">
              {renderSelectedEditorStateIcon(serviceTestEditorState)}
            </div>
          </div>
        </div>
        <div className="service-test-suite-editor__selected__content">
          {renderSelectedEditorState(serviceTestEditorState)}
        </div>
      </div>
    );
  },
);

export const ServiceTestSuiteEditor = observer(
  (props: { serviceTestableState: ServiceTestSuitesState }) => {
    const { serviceTestableState } = props;
    const serviceEditor = serviceTestableState.serviceEditorState;
    const isReadOnly = serviceEditor.isReadOnly;
    const addTestSuite = (): void => serviceTestableState.addTestSuite();
    return (
      <div className="service-test-suite-editor panel">
        <div className="panel__header"></div>
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel minSize={280} maxSize={550}>
            <div className="service-test-suite-editor__header">
              <div className="service-test-suite-editor__header__title">
                <div
                  className="service-test-suite-editor__header__title__label
                service-test-suite-editor__header__title__label--suite"
                >
                  Suites
                </div>
              </div>
              <div className="panel__header__actions">
                <button
                  className="panel__header__action"
                  tabIndex={-1}
                  onClick={addTestSuite}
                  disabled={isReadOnly}
                  title="Add Test Suite"
                >
                  <PlusIcon />
                </button>
              </div>
            </div>
            <div className="service-test-suite-editor__explorer">
              {serviceTestableState.suitesStates.map((t) => (
                <ServiceSuiteExplorer
                  key={t.testSuite.id}
                  serviceTestSuiteState={t}
                />
              ))}
            </div>
          </ResizablePanel>
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
          </ResizablePanelSplitter>
          <ResizablePanel minSize={600}>
            {serviceTestableState.selectedState && (
              <ServiceSelectedTestSuiteEditor
                serviceTestEditorState={serviceTestableState.selectedState}
              />
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
);
