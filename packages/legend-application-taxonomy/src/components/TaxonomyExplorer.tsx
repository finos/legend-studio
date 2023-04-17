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

import { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  type LegendTaxonomyPathParams,
  generateExploreTaxonomyTreeRoute,
  LEGEND_TAXONOMY_ROUTE_PATTERN_TOKEN,
} from '../application/LegendTaxonomyNavigation.js';
import { flowResult } from 'mobx';
import {
  type ResizablePanelHandlerProps,
  type SelectComponent,
  type SelectOption,
  SearchIcon,
  PlusIcon,
  TimesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DropdownMenu,
  MenuContent,
  MenuContentItem,
  CompressIcon,
  PanelLoadingIndicator,
  clsx,
  getCollapsiblePanelGroupProps,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  compareLabelFn,
  CustomSelectorInput,
  NonBlockingDialog,
  FileTrayIcon,
  MenuIcon,
  Panel,
  useResizeDetector,
  Modal,
  AssistantIcon,
} from '@finos/legend-art';
import { TaxonomyTree } from './TaxonomyTree.js';
import { TaxonomyNodeViewer } from './TaxonomyNodeViewer.js';
import type { TaxonomyTreeOption } from '../application/LegendTaxonomyApplicationConfig.js';
import {
  useTaxonomyExplorerStore,
  withTaxonomyExplorerStore,
} from './TaxonomyExplorerStoreProvider.js';
import type { TaxonomyNodeViewerState } from '../stores/TaxonomyNodeViewerState.js';
import { useLegendTaxonomyApplicationStore } from './LegendTaxonomyFrameworkProvider.js';
import { useCommands } from '@finos/legend-application';
import { useParams } from '@finos/legend-application/browser';

const TaxonomyExplorerActivityBar = observer(() => (
  <div className="taxonomy-explorer__activity-bar">
    <div className="taxonomy-explorer__activity-bar__menu">
      <button
        className="taxonomy-explorer__activity-bar__menu-item"
        tabIndex={-1}
        disabled={true}
        title="Menu"
      >
        <MenuIcon />
      </button>
    </div>
    <div className="taxonomy-explorer__activity-bar__items">
      <button
        className={clsx(
          'taxonomy-explorer__activity-bar__item',
          'taxonomy-explorer__activity-bar__item--active',
        )}
        tabIndex={-1}
        title="Explorer"
      >
        <FileTrayIcon />
      </button>
    </div>
  </div>
));

const TaxonomyExplorerSideBar = observer(() => {
  const explorerStore = useTaxonomyExplorerStore();
  const applicationStore = useLegendTaxonomyApplicationStore();
  const [openTaxonomyTreeDropdown, setOpenTaxonomyTreeDropdown] =
    useState(false);

  const showSearchModal = (): void =>
    explorerStore.searchTaxonomyNodeCommandState.open();
  const collapseTree = (): void => {
    if (explorerStore.treeData) {
      explorerStore.treeData.nodes.forEach((node) => {
        node.isOpen = false;
      });
      explorerStore.setTreeData({
        ...explorerStore.treeData,
      });
    }
  };
  const showTaxonomyTreeDropdown = (): void =>
    setOpenTaxonomyTreeDropdown(true);
  const hideTaxonomyTreeDropdown = (): void =>
    setOpenTaxonomyTreeDropdown(false);
  const selectTaxonomyTree =
    (option: TaxonomyTreeOption): (() => void) =>
    (): void => {
      explorerStore.taxonomyServerClient.setBaseUrl(option.url);
      applicationStore.navigationService.navigator.goToLocation(
        generateExploreTaxonomyTreeRoute(option.key),
      );
    };

  return (
    <div className="taxonomy-explorer__side-bar">
      <div className="taxonomy-explorer__side-bar__view">
        <Panel>
          <div className="panel__header taxonomy-explorer__side-bar__header">
            <div className="panel__header__title">
              <div className="panel__header__title__content taxonomy-explorer__side-bar__header__title__content">
                EXPLORER
              </div>
            </div>
            {applicationStore.config.taxonomyTreeOptions.length > 1 && (
              <DropdownMenu
                className="taxonomy-explorer__header__server-dropdown"
                title="Choose a taxonomy tree..."
                onOpen={showTaxonomyTreeDropdown}
                onClose={hideTaxonomyTreeDropdown}
                menuProps={{ elevation: 7 }}
                content={
                  <MenuContent className="taxonomy-explorer__header__server-dropdown__menu">
                    {applicationStore.config.taxonomyTreeOptions.map(
                      (option) => (
                        <MenuContentItem
                          key={option.key}
                          className={clsx(
                            'taxonomy-explorer__header__server-dropdown__menu__item',
                            {
                              'taxonomy-explorer__header__server-dropdown__menu__item--active':
                                option ===
                                applicationStore.config
                                  .currentTaxonomyTreeOption,
                            },
                          )}
                          onClick={selectTaxonomyTree(option)}
                        >
                          {option.label}
                        </MenuContentItem>
                      ),
                    )}
                  </MenuContent>
                }
              >
                <div className="taxonomy-explorer__header__server-dropdown__label">
                  <div className="taxonomy-explorer__header__server-dropdown__label__text">
                    {applicationStore.config.currentTaxonomyTreeOption.label}
                  </div>
                  <div className="taxonomy-explorer__header__server-dropdown__label__icon">
                    {openTaxonomyTreeDropdown ? (
                      <ChevronUpIcon />
                    ) : (
                      <ChevronDownIcon />
                    )}
                  </div>
                </div>
              </DropdownMenu>
            )}
          </div>
          <div className="panel__content taxonomy-explorer__side-bar__content">
            <Panel>
              <div className="panel__header taxonomy-explorer__explorer__header">
                <div className="panel__header__title">
                  <div className="panel__header__title__content">
                    {applicationStore.config.currentTaxonomyTreeOption.label}
                  </div>
                </div>
                <div className="panel__header__actions">
                  <button
                    className="panel__header__action taxonomy-explorer__explorer__header__action"
                    onClick={collapseTree}
                    tabIndex={-1}
                    title="Collapse all"
                  >
                    <CompressIcon />
                  </button>
                  <button
                    className="panel__header__action taxonomy-explorer__explorer__header__action"
                    disabled={!explorerStore.treeData}
                    tabIndex={-1}
                    onClick={showSearchModal}
                    title="Search taxnomy node... (Ctrl + P)"
                  >
                    <SearchIcon />
                  </button>
                </div>
              </div>
              <PanelLoadingIndicator
                isLoading={explorerStore.initState.isInProgress}
              />
              <div className="panel__content taxonomy-node-viewer__explorer-tree-container">
                {explorerStore.treeData && (
                  <TaxonomyTree treeData={explorerStore.treeData} />
                )}
              </div>
            </Panel>
          </div>
        </Panel>
      </div>
    </div>
  );
});

const TaxonomyExplorerSplashScreen: React.FC = () => {
  const commandListWidth = 300;
  const commandListHeight = 80;
  const [showCommandList, setShowCommandList] = useState(false);
  const { ref, width, height } = useResizeDetector<HTMLDivElement>();

  useEffect(() => {
    setShowCommandList(
      (width ?? 0) > commandListWidth && (height ?? 0) > commandListHeight,
    );
  }, [width, height]);

  return (
    <div ref={ref} className="taxonomy-explorer__panel__splash-screen">
      <div
        className={clsx('taxonomy-explorer__panel__splash-screen__content', {
          'taxonomy-explorer__panel__splash-screen__content--hidden':
            !showCommandList,
        })}
      >
        <div className="taxonomy-explorer__panel__splash-screen__content__item">
          <div className="taxonomy-explorer__panel__splash-screen__content__item__label">
            Open or Search for a Taxonomy
          </div>
          <div className="taxonomy-explorer__panel__splash-screen__content__item__hot-keys">
            <div className="hotkey__key">Ctrl</div>
            <div className="hotkey__plus">
              <PlusIcon />
            </div>
            <div className="hotkey__key">P</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TaxonomyExplorerMainPanel = observer(
  (props: { taxonomyViewerState: TaxonomyNodeViewerState }) => {
    const { taxonomyViewerState } = props;
    const explorerStore = useTaxonomyExplorerStore();

    const leadingPath = taxonomyViewerState.taxonomyNode.taxonomyPath.substring(
      0,
      taxonomyViewerState.taxonomyNode.taxonomyPath.lastIndexOf(
        taxonomyViewerState.taxonomyNode.label,
      ),
    );

    const closeTab = (): void =>
      explorerStore.setCurrentTaxonomyNodeViewerState(undefined);
    const closeTabOnMiddleClick: React.MouseEventHandler = (event): void => {
      if (event.nativeEvent.button === 1) {
        explorerStore.setCurrentTaxonomyNodeViewerState(undefined);
      }
    };

    return (
      <div className="panel taxonomy-explorer__panel">
        <div className="panel__header taxonomy-explorer__panel__header">
          <div className="taxonomy-explorer__panel__header__tabs">
            <div
              className="taxonomy-explorer__panel__header__tab taxonomy-explorer__panel__header__tab--active"
              onMouseUp={closeTabOnMiddleClick}
            >
              <div
                className="taxonomy-explorer__panel__header__tab__content"
                title={`Taxonomy Node ${taxonomyViewerState.taxonomyNode.taxonomyPath}`}
              >
                <button
                  className="taxonomy-explorer__panel__header__tab__label"
                  tabIndex={-1}
                >
                  <div className="taxonomy-explorer__panel__header__tab__label__path">
                    {leadingPath}
                  </div>
                  <div className="taxonomy-explorer__panel__header__tab__label__name">
                    {taxonomyViewerState.taxonomyNode.label}
                  </div>
                </button>
                <button
                  className="taxonomy-explorer__panel__header__tab__close-btn"
                  onClick={closeTab}
                  tabIndex={-1}
                  title="Close"
                >
                  <TimesIcon />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="panel__content taxonomy-explorer__panel__content">
          <TaxonomyNodeViewer taxonomyNodeViewerState={taxonomyViewerState} />
        </div>
      </div>
    );
  },
);

export const TaxonomySearchCommand = observer(() => {
  const explorerStore = useTaxonomyExplorerStore();
  const selectorRef = useRef<SelectComponent>(null);
  const closeModal = (): void =>
    explorerStore.searchTaxonomyNodeCommandState.close();
  const options = Array.from(explorerStore.treeData?.nodes.values() ?? [])
    .map((node) => ({
      label: node.taxonomyPath,
      value: node.taxonomyPath,
    }))
    .sort(compareLabelFn);
  const openTaxonomyNode = (val: SelectOption | null): void => {
    if (explorerStore.treeData) {
      if (val?.value) {
        const taxonomyPath = val.value;
        closeModal();
        // NOTE: since it takes time to close the modal, this will prevent any auto-focus effort when we open a new node
        // to fail as the focus is still trapped in this modal, we need to use `setTimeout` here
        setTimeout(
          () => explorerStore.openTaxonomyTreeNodeWithPath(taxonomyPath),
          0,
        );
      }
    }
  };
  const handleEnter = (): void => {
    selectorRef.current?.focus();
  };

  return (
    <NonBlockingDialog
      nonModalDialogState={explorerStore.searchTaxonomyNodeCommandState}
      onClose={closeModal}
      TransitionProps={{
        onEnter: handleEnter,
      }}
      onClickAway={closeModal}
      classes={{ container: 'search-modal__container' }}
      PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
    >
      <Modal darkMode={true} className="search-modal">
        <CustomSelectorInput
          ref={selectorRef}
          options={options}
          onChange={openTaxonomyNode}
          placeholder="Search taxonomy node by path..."
          escapeClearsValue={true}
          darkMode={true}
        />
      </Modal>
    </NonBlockingDialog>
  );
});

export const TaxonomyExplorer = withTaxonomyExplorerStore(
  observer(() => {
    const params = useParams<LegendTaxonomyPathParams>();
    const applicationStore = useLegendTaxonomyApplicationStore();
    const explorerStore = useTaxonomyExplorerStore();

    const taxonomyTreeKey =
      params[LEGEND_TAXONOMY_ROUTE_PATTERN_TOKEN.TAXONOMY_TREE_KEY];

    // layout
    const resizeSideBar = (handleProps: ResizablePanelHandlerProps): void =>
      explorerStore.sideBarDisplayState.setSize(
        (handleProps.domElement as HTMLDivElement).getBoundingClientRect()
          .width,
      );
    const sideBarCollapsiblePanelGroupProps = getCollapsiblePanelGroupProps(
      explorerStore.sideBarDisplayState.size === 0,
      {
        onStopResize: resizeSideBar,
        size: explorerStore.sideBarDisplayState.size,
      },
    );
    const toggleAssistant = (): void =>
      applicationStore.assistantService.toggleAssistant();

    useEffect(() => {
      if (taxonomyTreeKey) {
        const matchingTaxonomyTreeOption =
          applicationStore.config.taxonomyTreeOptions.find(
            (option) => taxonomyTreeKey === option.key,
          );
        if (!matchingTaxonomyTreeOption) {
          applicationStore.notificationService.notifyWarning(
            `Can't find taxonomy tree with key '${taxonomyTreeKey}'. Redirected to default tree '${applicationStore.config.defaultTaxonomyTreeOption.key}'`,
          );
          applicationStore.navigationService.navigator.updateCurrentLocation(
            generateExploreTaxonomyTreeRoute(
              applicationStore.config.defaultTaxonomyTreeOption.key,
            ),
          );
        } else {
          applicationStore.config.setCurrentTaxonomyTreeOption(
            matchingTaxonomyTreeOption,
          );
          explorerStore.taxonomyServerClient.setBaseUrl(
            matchingTaxonomyTreeOption.url,
          );
          // NOTE: since we internalize the data space path in the route, we should not re-initialize the graph
          // on the second call when we remove path from the route
          flowResult(explorerStore.initialize()).catch(
            applicationStore.alertUnhandledError,
          );
        }
      }
    }, [applicationStore, explorerStore, taxonomyTreeKey]);
    useEffect(() => {
      explorerStore.internalizeDataSpacePath(params);
    }, [explorerStore, params]);

    useCommands(explorerStore);

    if (
      taxonomyTreeKey &&
      !applicationStore.config.taxonomyTreeOptions.find(
        (option) => taxonomyTreeKey === option.key,
      )
    ) {
      return null;
    }
    return (
      <div className="app__page">
        <PanelLoadingIndicator
          isLoading={explorerStore.initState.isInProgress}
        />
        <div className="taxonomy-explorer">
          <div className="taxonomy-explorer__body">
            <TaxonomyExplorerActivityBar />
            <div className="taxonomy-explorer__content-container">
              <div className="taxonomy-explorer__content">
                <ResizablePanelGroup orientation="vertical">
                  <ResizablePanel
                    {...sideBarCollapsiblePanelGroupProps.collapsiblePanel}
                    direction={1}
                  >
                    <TaxonomyExplorerSideBar />
                  </ResizablePanel>
                  <ResizablePanelSplitter />
                  <ResizablePanel
                    {...sideBarCollapsiblePanelGroupProps.remainingPanel}
                    minSize={300}
                  >
                    {explorerStore.currentTaxonomyNodeViewerState ? (
                      <TaxonomyExplorerMainPanel
                        taxonomyViewerState={
                          explorerStore.currentTaxonomyNodeViewerState
                        }
                      />
                    ) : (
                      <TaxonomyExplorerSplashScreen />
                    )}
                  </ResizablePanel>
                </ResizablePanelGroup>
              </div>
            </div>
          </div>
          <div className="taxonomy-explorer__status-bar ">
            <div className="taxonomy-explorer__status-bar__left"></div>
            <div className="taxonomy-explorer__status-bar__right">
              <button
                className={clsx(
                  'taxonomy-explorer__status-bar__action taxonomy-explorer__status-bar__action__toggler',
                  {
                    'taxonomy-explorer__status-bar__action__toggler--active':
                      !applicationStore.assistantService.isHidden,
                  },
                )}
                onClick={toggleAssistant}
                tabIndex={-1}
                title="Toggle assistant"
              >
                <AssistantIcon />
              </button>
            </div>
          </div>
          <TaxonomySearchCommand />
        </div>
      </div>
    );
  }),
);
