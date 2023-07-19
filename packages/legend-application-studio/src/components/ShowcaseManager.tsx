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

import { useApplicationStore } from '@finos/legend-application';
import { observer } from 'mobx-react-lite';
import {
  BlankPanelContent,
  Panel,
  PanelLoadingIndicator,
  TreeView,
  type TreeNodeContainerProps,
  ChevronDownIcon,
  ChevronRightIcon,
  GenericTextFileIcon,
  FolderIcon,
  FolderOpenIcon,
  HomeIcon,
} from '@finos/legend-art';
import {
  SHOWCASE_MANAGER_VIEW,
  ShowcaseManagerState,
  type ShowcasesExplorerTreeNodeData,
} from '../stores/ShowcaseManagerState.js';
import { isNonNullable } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import type { Showcase } from '@finos/legend-server-showcase';
import {
  CODE_EDITOR_LANGUAGE,
  CodeEditor,
} from '@finos/legend-lego/code-editor';

const ShowcasesExplorerTreeNodeContainer = observer(
  (
    props: TreeNodeContainerProps<
      ShowcasesExplorerTreeNodeData,
      {
        showcaseManagerState: ShowcaseManagerState;
        toggleExpandNode: (node: ShowcasesExplorerTreeNodeData) => void;
      }
    >,
  ) => {
    const { node, level, innerProps } = props;
    const { toggleExpandNode, showcaseManagerState } = innerProps;
    const applicationStore = useApplicationStore();

    const expandIcon = !node.metadata ? (
      node.isOpen ? (
        <ChevronDownIcon />
      ) : (
        <ChevronRightIcon />
      )
    ) : (
      <div />
    );
    const nodeIcon = !node.metadata ? (
      node.isOpen ? (
        <FolderOpenIcon />
      ) : (
        <FolderIcon />
      )
    ) : (
      <GenericTextFileIcon />
    );
    const onNodeClick = (): void => {
      if (!node.metadata) {
        toggleExpandNode(node);
      } else {
        flowResult(showcaseManagerState.openShowcase(node.metadata)).catch(
          applicationStore.alertUnhandledError,
        );
      }
    };

    return (
      <div
        className="tree-view__node__container showcase-manager__explorer__node__container"
        style={{
          paddingLeft: `${(level - 1) * 1.4}rem`,
          display: 'flex',
        }}
        onClick={onNodeClick}
      >
        <div className="showcase-manager__explorer__node__expand-icon">
          {expandIcon}
        </div>
        <div className="showcase-manager__explorer__node__type-icon">
          {nodeIcon}
        </div>
        <div
          className="tree-view__node__label showcase-manager__explorer__node__label"
          title={
            node.metadata
              ? `${
                  node.metadata.description
                    ? `${node.metadata.description}\n\n`
                    : ''
                }Click to open showcase`
              : undefined
          }
        >
          {node.label}
        </div>
      </div>
    );
  },
);

const ShowcaseManagerExplorer = observer(
  (props: { showcaseManagerState: ShowcaseManagerState }) => {
    const { showcaseManagerState } = props;
    const treeData = showcaseManagerState.explorerTreeData;
    const getChildNodes = (
      node: ShowcasesExplorerTreeNodeData,
    ): ShowcasesExplorerTreeNodeData[] => {
      if (treeData) {
        return node.childrenIds
          .map((id) => treeData.nodes.get(id))
          .filter(isNonNullable)
          .sort((a, b) => a.label.localeCompare(b.label));
      }
      return [];
    };
    const toggleExpandNode = (node: ShowcasesExplorerTreeNodeData): void => {
      if (treeData) {
        node.isOpen = !node.isOpen;
        showcaseManagerState.setExplorerTreeData({ ...treeData });
      }
    };

    return (
      <div className="showcase-manager__view">
        <div className="showcase-manager__view__header">
          <div className="showcase-manager__view__breadcrumbs">
            <div className="showcase-manager__view__breadcrumb">
              <div className="showcase-manager__view__breadcrumb__icon">
                <HomeIcon />
              </div>
              <div className="showcase-manager__view__breadcrumb__text">
                Showcaces
              </div>
            </div>
            <div className="showcase-manager__view__breadcrumb__arrow">
              <ChevronRightIcon />
            </div>
            <div className="showcase-manager__view__breadcrumb">
              <div className="showcase-manager__view__breadcrumb__text">
                Explorer
              </div>
            </div>
          </div>
        </div>
        <div className="showcase-manager__view__content">
          {showcaseManagerState.explorerTreeData && (
            <TreeView
              components={{
                TreeNodeContainer: ShowcasesExplorerTreeNodeContainer,
              }}
              treeData={showcaseManagerState.explorerTreeData}
              getChildNodes={getChildNodes}
              innerProps={{
                toggleExpandNode,
                showcaseManagerState,
              }}
            />
          )}
        </div>
      </div>
    );
  },
);

const ShowcaseViewer = observer(
  (props: {
    showcaseManagerState: ShowcaseManagerState;
    showcase: Showcase;
  }) => {
    const { showcaseManagerState, showcase } = props;
    const prettyPath = showcase.path.replaceAll(/\s*\/\s*/g, ' / ');

    return (
      <div className="showcase-manager__view">
        <div className="showcase-manager__view__header">
          <div className="showcase-manager__view__breadcrumbs">
            <div
              className="showcase-manager__view__breadcrumb"
              onClick={() => {
                showcaseManagerState.closeShowcase();
                showcaseManagerState.setCurrentView(
                  SHOWCASE_MANAGER_VIEW.EXPLORER,
                );
              }}
            >
              <div className="showcase-manager__view__breadcrumb__icon">
                <HomeIcon />
              </div>
              <div className="showcase-manager__view__breadcrumb__text">
                Showcaces
              </div>
            </div>
            <div className="showcase-manager__view__breadcrumb__arrow">
              <ChevronRightIcon />
            </div>
            <div className="showcase-manager__view__breadcrumb">
              <div className="showcase-manager__view__breadcrumb__icon">
                <GenericTextFileIcon />
              </div>
              <div className="showcase-manager__view__breadcrumb__text">
                {showcase.title}
              </div>
            </div>
          </div>
        </div>
        <div className="showcase-manager__view__content showcase-manager__viewer__content">
          <div className="showcase-manager__viewer__title">
            {showcase.title}
          </div>
          <div className="showcase-manager__viewer__path">{prettyPath}</div>
          <div className="showcase-manager__viewer__code">
            <CodeEditor
              language={CODE_EDITOR_LANGUAGE.PURE}
              inputValue={showcase.code}
              isReadOnly={true}
            />
          </div>
        </div>
      </div>
    );
  },
);

const ShowcaseManagerContent = observer(
  (props: { showcaseManagerState: ShowcaseManagerState }) => {
    const { showcaseManagerState } = props;
    const currentShowcase = showcaseManagerState.currentShowcase;
    const currentView = showcaseManagerState.currentView;

    return (
      <div className="showcase-manager">
        {currentShowcase && (
          <ShowcaseViewer
            showcaseManagerState={showcaseManagerState}
            showcase={currentShowcase}
          />
        )}
        {!currentShowcase && (
          <>
            {currentView === SHOWCASE_MANAGER_VIEW.EXPLORER && (
              <ShowcaseManagerExplorer
                showcaseManagerState={showcaseManagerState}
              />
            )}
            {currentView === SHOWCASE_MANAGER_VIEW.SEARCH && <>TODO: Search</>}
          </>
        )}
      </div>
    );
  },
);

export const ShowcaseManager = observer(() => {
  const applicationStore = useApplicationStore();
  const showcaseManagerState =
    ShowcaseManagerState.retrieveNullableState(applicationStore);

  if (!showcaseManagerState) {
    return null;
  }

  return (
    <Panel>
      <PanelLoadingIndicator
        isLoading={showcaseManagerState.initState.isInProgress}
      />
      {showcaseManagerState.initState.isInProgress && (
        <BlankPanelContent>Initializing...</BlankPanelContent>
      )}
      {showcaseManagerState.initState.hasFailed && (
        <BlankPanelContent>Failed to initialize</BlankPanelContent>
      )}
      {showcaseManagerState.initState.hasSucceeded && (
        <ShowcaseManagerContent showcaseManagerState={showcaseManagerState} />
      )}
    </Panel>
  );
});
