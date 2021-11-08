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

import { useEffect } from 'react';
import {
  NotificationSnackbar,
  useApplicationStore,
} from '@finos/legend-application';
import { AppHeader, AppHeaderMenu } from '@finos/legend-studio';
import { observer } from 'mobx-react-lite';
import { useParams } from 'react-router-dom';
import type { EnterpriseModelExplorerPathParams } from '../../stores/studio/EnterpriseModelExplorerStore';
import {
  EnterpriseModelExplorerStoreProvider,
  useEnterpriseModelExplorerStore,
} from './EnterpriseModelExplorerStoreProvider';
import { flowResult } from 'mobx';
import type { ResizablePanelHandlerProps } from '@finos/legend-art';
import {
  CompressIcon,
  PanelLoadingIndicator,
  WindowMaximizeIcon,
  clsx,
  getControlledResizablePanelProps,
  ListIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
} from '@finos/legend-art';
import { TaxonomyTree } from './TaxonomyTree';
import { TaxonomyViewer } from './TaxonomyViewer';

const EnterpriseModelExplorerStatusBar = observer(() => {
  const enterpriseModelExplorerStore = useEnterpriseModelExplorerStore();
  const toggleExpandMode = (): void =>
    enterpriseModelExplorerStore.setExpandedMode(
      !enterpriseModelExplorerStore.isInExpandedMode,
    );
  return (
    <div className="editor__status-bar ">
      <div className="editor__status-bar__left"></div>
      <div className="editor__status-bar__right">
        <button
          className={clsx(
            'editor__status-bar__action editor__status-bar__action__toggler',
            {
              'editor__status-bar__action__toggler--active':
                enterpriseModelExplorerStore.isInExpandedMode,
            },
          )}
          onClick={toggleExpandMode}
          tabIndex={-1}
          title={'Maximize/Minimize'}
        >
          <WindowMaximizeIcon />
        </button>
      </div>
    </div>
  );
});

const EnterpriseModelExplorerActivityBar = observer(() => (
  <div className="activity-bar">
    <div className="activity-bar__items">
      <button
        className={clsx('activity-bar__item', 'activity-bar__item--active')}
        tabIndex={-1}
        title="Explorer"
      >
        <ListIcon />
      </button>
    </div>
  </div>
));

const EnterpriseModelExplorerSideBar = observer(() => {
  const enterpriseModelExplorerStore = useEnterpriseModelExplorerStore();
  const collapseTree = (): void => {
    if (enterpriseModelExplorerStore.treeData) {
      enterpriseModelExplorerStore.treeData.nodes.forEach((node) => {
        node.isOpen = false;
      });
      enterpriseModelExplorerStore.setTreeData({
        ...enterpriseModelExplorerStore.treeData,
      });
    }
  };
  return (
    <div className="side-bar">
      <div className="side-bar__view">
        <div className="panel">
          <div className="panel__header side-bar__header">
            <div className="panel__header__title">
              <div className="panel__header__title__content side-bar__header__title__content">
                EXPLORER
              </div>
            </div>
          </div>
          <div className="panel__content side-bar__content">
            <div className="panel">
              <div className="panel__header enterprise-model-explorer__side-bar__header">
                <div className="panel__header__title">
                  <div className="panel__header__title__content">
                    Enterprise Taxonomy
                  </div>
                </div>
                <div className="panel__header__actions">
                  <button
                    className="panel__header__action enterprise-model-explorer__side-bar__header__action"
                    onClick={collapseTree}
                    tabIndex={-1}
                    title="Collapse All"
                  >
                    <CompressIcon />
                  </button>
                </div>
              </div>
              <PanelLoadingIndicator
                isLoading={enterpriseModelExplorerStore.initState.isInProgress}
              />
              <div className="panel__content enterprise-model-explorer__taxonomy-tree-container">
                {enterpriseModelExplorerStore.treeData && (
                  <TaxonomyTree
                    treeData={enterpriseModelExplorerStore.treeData}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export const EnterpriseModelExplorerInner = observer(() => {
  const params = useParams<EnterpriseModelExplorerPathParams>();
  const applicationStore = useApplicationStore();
  const enterpriseModelExplorerStore = useEnterpriseModelExplorerStore();

  const resizeSideBar = (handleProps: ResizablePanelHandlerProps): void =>
    enterpriseModelExplorerStore.sideBarDisplayState.setSize(
      (handleProps.domElement as HTMLDivElement).getBoundingClientRect().width,
    );

  useEffect(() => {
    enterpriseModelExplorerStore.internalizeDataSpacePath(params);
  }, [enterpriseModelExplorerStore, params]);

  // NOTE: since we internalize the data space path in the route, we should not re-initialize the graph
  // on the second call when we remove path from the route
  useEffect(() => {
    flowResult(enterpriseModelExplorerStore.initialize(params)).catch(
      applicationStore.alertIllegalUnhandledError,
    );
  }, [applicationStore, enterpriseModelExplorerStore, params]);

  return (
    <div className="app__page">
      <AppHeader>
        <AppHeaderMenu />
      </AppHeader>
      <div className="app__content">
        <div className="editor">
          <div className="editor__body">
            <EnterpriseModelExplorerActivityBar />
            <NotificationSnackbar />
            <div className="editor__content-container">
              <div
                className={clsx('editor__content', {
                  'editor__content--expanded':
                    enterpriseModelExplorerStore.isInExpandedMode,
                })}
              >
                <ResizablePanelGroup orientation="vertical">
                  <ResizablePanel
                    {...getControlledResizablePanelProps(
                      enterpriseModelExplorerStore.sideBarDisplayState.size ===
                        0,
                      {
                        onStopResize: resizeSideBar,
                      },
                    )}
                    direction={1}
                    size={enterpriseModelExplorerStore.sideBarDisplayState.size}
                  >
                    <EnterpriseModelExplorerSideBar />
                  </ResizablePanel>
                  <ResizablePanelSplitter />
                  <ResizablePanel minSize={300}>
                    {enterpriseModelExplorerStore.currentTaxonomyViewerState ? (
                      <TaxonomyViewer
                        taxonomyViewerState={
                          enterpriseModelExplorerStore.currentTaxonomyViewerState
                        }
                      />
                    ) : (
                      <div />
                    )}
                  </ResizablePanel>
                </ResizablePanelGroup>
              </div>
            </div>
          </div>
          <EnterpriseModelExplorerStatusBar />
        </div>
      </div>
    </div>
  );
});

export const EnterpriseModelExplorer: React.FC = () => (
  <EnterpriseModelExplorerStoreProvider>
    <EnterpriseModelExplorerInner />
  </EnterpriseModelExplorerStoreProvider>
);
