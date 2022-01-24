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
import { AppHeader, useApplicationStore } from '@finos/legend-application';
import { GlobalHotKeys } from 'react-hotkeys';
import { observer } from 'mobx-react-lite';
import { useParams } from 'react-router-dom';
import {
  type LegendTaxonomyPathParams,
  updateRouteWithNewTaxonomyServerOption,
} from '../stores/LegendTaxonomyRouter';
import { useLegendTaxonomyStore } from './LegendTaxonomyStoreProvider';
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
  WindowMaximizeIcon,
  clsx,
  getControlledResizablePanelProps,
  ListIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  buildReactHotkeysConfiguration,
  compareLabelFn,
  CustomSelectorInput,
  NonBlockingDialog,
} from '@finos/legend-art';
import { TaxonomyTree } from './TaxonomyTree';
import { TaxonomyNodeViewer } from './TaxonomyNodeViewer';
import type {
  LegendTaxonomyConfig,
  TaxonomyServerOption,
} from '../application/LegendTaxonomyConfig';
import { useResizeDetector } from 'react-resize-detector';
import type { TaxonomyNodeViewerState } from '../stores/LegendTaxonomyStore';

const TaxonomyViewerStatusBar = observer(() => {
  const taxonomyStore = useLegendTaxonomyStore();
  const toggleExpandMode = (): void =>
    taxonomyStore.setExpandedMode(!taxonomyStore.isInExpandedMode);
  return (
    <div className="taxonomy-viewer__status-bar ">
      <div className="taxonomy-viewer__status-bar__left"></div>
      <div className="taxonomy-viewer__status-bar__right">
        <button
          className={clsx(
            'taxonomy-viewer__status-bar__action taxonomy-viewer__status-bar__action__toggler',
            {
              'taxonomy-viewer__status-bar__action__toggler--active':
                taxonomyStore.isInExpandedMode,
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

const TaxonomyViewerActivityBar = observer(() => (
  <div className="taxonomy-viewer__activity-bar">
    <div className="taxonomy-viewer__activity-bar__items">
      <button
        className={clsx(
          'taxonomy-viewer__activity-bar__item',
          'taxonomy-viewer__activity-bar__item--active',
        )}
        tabIndex={-1}
        title="Explorer"
      >
        <ListIcon />
      </button>
    </div>
  </div>
));

const TaxonomyViewerSideBar = observer(() => {
  const taxonomyStore = useLegendTaxonomyStore();
  const showSearchModal = (): void =>
    taxonomyStore.searchTaxonomyNodeCommandState.open();
  const collapseTree = (): void => {
    if (taxonomyStore.treeData) {
      taxonomyStore.treeData.nodes.forEach((node) => {
        node.isOpen = false;
      });
      taxonomyStore.setTreeData({
        ...taxonomyStore.treeData,
      });
    }
  };
  return (
    <div className="taxonomy-viewer__side-bar">
      <div className="taxonomy-viewer__side-bar__view">
        <div className="panel">
          <div className="panel__header taxonomy-viewer__side-bar__header">
            <div className="panel__header__title">
              <div className="panel__header__title__content taxonomy-viewer__side-bar__header__title__content">
                EXPLORER
              </div>
            </div>
          </div>
          <div className="panel__content taxonomy-viewer__side-bar__content">
            <div className="panel">
              <div className="panel__header taxonomy-viewer__explorer__header">
                <div className="panel__header__title">
                  <div className="panel__header__title__content">Taxonomy</div>
                </div>
                <div className="panel__header__actions">
                  <button
                    className="panel__header__action taxonomy-viewer__explorer__header__action"
                    onClick={collapseTree}
                    tabIndex={-1}
                    title="Collapse all"
                  >
                    <CompressIcon />
                  </button>
                  <button
                    className="panel__header__action taxonomy-viewer__explorer__header__action"
                    disabled={!taxonomyStore.treeData}
                    tabIndex={-1}
                    onClick={showSearchModal}
                    title="Search taxnomy node... (Ctrl + P)"
                  >
                    <SearchIcon />
                  </button>
                </div>
              </div>
              <PanelLoadingIndicator
                isLoading={taxonomyStore.initState.isInProgress}
              />
              <div className="panel__content taxonomy-node-viewer__explorer-tree-container">
                {taxonomyStore.treeData && (
                  <TaxonomyTree treeData={taxonomyStore.treeData} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

const TaxonomyViewerSplashScreen: React.FC = () => {
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
    <div ref={ref} className="taxonomy-viewer__main-panel__splash-screen">
      <div
        className={clsx('taxonomy-viewer__main-panel__splash-screen__content', {
          'taxonomy-viewer__main-panel__splash-screen__content--hidden':
            !showCommandList,
        })}
      >
        <div className="taxonomy-viewer__main-panel__splash-screen__content__item">
          <div className="taxonomy-viewer__main-panel__splash-screen__content__item__label">
            Open or Search for a Taxonomy
          </div>
          <div className="taxonomy-viewer__main-panel__splash-screen__content__item__hot-keys">
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

const TaxonomyViewerMainPanel = observer(
  (props: { taxonomyViewerState: TaxonomyNodeViewerState }) => {
    const { taxonomyViewerState } = props;
    const taxonomyStore = useLegendTaxonomyStore();

    const leadingPath = taxonomyViewerState.taxonomyNode.taxonomyPath.substring(
      0,
      taxonomyViewerState.taxonomyNode.taxonomyPath.lastIndexOf(
        taxonomyViewerState.taxonomyNode.label,
      ),
    );

    const closeTab = (): void =>
      taxonomyStore.setCurrentTaxonomyNodeViewerState(undefined);
    const closeTabOnMiddleClick: React.MouseEventHandler = (event): void => {
      if (event.nativeEvent.button === 1) {
        taxonomyStore.setCurrentTaxonomyNodeViewerState(undefined);
      }
    };

    return (
      <div className="panel taxonomy-viewer__main-panel">
        <div className="panel__header taxonomy-viewer__main-panel__header">
          <div className="taxonomy-viewer__main-panel__header__tabs">
            <div
              className="taxonomy-viewer__main-panel__header__tab taxonomy-viewer__main-panel__header__tab--active"
              onMouseUp={closeTabOnMiddleClick}
            >
              <div
                className="taxonomy-viewer__main-panel__header__tab__content"
                title={`Taxonomy Node ${taxonomyViewerState.taxonomyNode.taxonomyPath}`}
              >
                <button
                  className="taxonomy-viewer__main-panel__header__tab__label"
                  tabIndex={-1}
                >
                  <div className="taxonomy-viewer__main-panel__header__tab__label__path">
                    {leadingPath}
                  </div>
                  <div className="taxonomy-viewer__main-panel__header__tab__label__name">
                    {taxonomyViewerState.taxonomyNode.label}
                  </div>
                </button>
                <button
                  className="taxonomy-viewer__main-panel__header__tab__close-btn"
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
        <div className="panel__content taxonomy-viewer__main-panel__content">
          <TaxonomyNodeViewer taxonomyNodeViewerState={taxonomyViewerState} />
        </div>
      </div>
    );
  },
);

const LegendTaxonomyAppHeaderMenu: React.FC = () => {
  const applicationStore = useApplicationStore<LegendTaxonomyConfig>();

  const [openTaxonomyServerDropdown, setOpenTaxonomyServerDropdown] =
    useState(false);
  const showTaxonomyServerDropdown = (): void =>
    setOpenTaxonomyServerDropdown(true);
  const hideTaxonomyServerDropdown = (): void =>
    setOpenTaxonomyServerDropdown(false);
  const selectTaxonomyServer =
    (option: TaxonomyServerOption): (() => void) =>
    (): void => {
      if (option !== applicationStore.config.currentTaxonomyServerOption) {
        const updatedURL = updateRouteWithNewTaxonomyServerOption(
          applicationStore.navigator.getCurrentLocationPath(),
          option,
        );
        if (updatedURL) {
          applicationStore.navigator.jumpTo(
            applicationStore.navigator.generateLocation(updatedURL),
          );
        }
      }
    };

  if (applicationStore.config.taxonomyServerOptions.length <= 1) {
    return null;
  }
  return (
    <DropdownMenu
      className={clsx('taxonomy-app__header__server-dropdown')}
      onClose={hideTaxonomyServerDropdown}
      menuProps={{ elevation: 7 }}
      content={
        <MenuContent className="taxonomy-app__header__server-dropdown__menu">
          {applicationStore.config.taxonomyServerOptions.map((option) => (
            <MenuContentItem
              key={option.key}
              className={clsx(
                'taxonomy-app__header__server-dropdown__menu__item',
                {
                  'taxonomy-app__header__server-dropdown__menu__item--active':
                    option ===
                    applicationStore.config.currentTaxonomyServerOption,
                },
              )}
              onClick={selectTaxonomyServer(option)}
            >
              {option.label}
            </MenuContentItem>
          ))}
        </MenuContent>
      }
    >
      <button
        className="taxonomy-app__header__server-dropdown__label"
        tabIndex={-1}
        onClick={showTaxonomyServerDropdown}
        title="Choose a taxonomy server..."
      >
        <div className="taxonomy-app__header__server-dropdown__label__text">
          {applicationStore.config.currentTaxonomyServerOption.label}
        </div>
        <div className="taxonomy-app__header__server-dropdown__label__icon">
          {openTaxonomyServerDropdown ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </div>
      </button>
    </DropdownMenu>
  );
};

export const TaxonomySearchCommand = observer(() => {
  const taxonomyStore = useLegendTaxonomyStore();
  const selectorRef = useRef<SelectComponent>(null);
  const closeModal = (): void =>
    taxonomyStore.searchTaxonomyNodeCommandState.close();
  const options = Array.from(taxonomyStore.treeData?.nodes.values() ?? [])
    .map((node) => ({
      label: node.taxonomyPath,
      value: node.taxonomyPath,
    }))
    .sort(compareLabelFn);
  const openTaxonomyNode = (val: SelectOption | null): void => {
    if (taxonomyStore.treeData) {
      if (val?.value) {
        const taxonomyPath = val.value;
        closeModal();
        // NOTE: since it takes time to close the modal, this will prevent any auto-focus effort when we open a new node
        // to fail as the focus is still trapped in this modal, we need to use `setTimeout` here
        setTimeout(
          () => taxonomyStore.openTaxonomyTreeNodeWithPath(taxonomyPath),
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
      nonModalDialogState={taxonomyStore.searchTaxonomyNodeCommandState}
      onClose={closeModal}
      TransitionProps={{
        onEnter: handleEnter,
      }}
      onClickAway={closeModal}
      classes={{ container: 'search-modal__container' }}
      PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
    >
      <div className="modal modal--dark search-modal">
        <CustomSelectorInput
          ref={selectorRef}
          options={options}
          onChange={openTaxonomyNode}
          placeholder="Search taxonomy node by path..."
          escapeClearsValue={true}
          darkMode={true}
        />
      </div>
    </NonBlockingDialog>
  );
});

export const TaxonomyViewer = observer(() => {
  const params = useParams<LegendTaxonomyPathParams>();
  const applicationStore = useApplicationStore();
  const taxonomyStore = useLegendTaxonomyStore();

  // Hotkeys
  const [hotkeyMapping, hotkeyHandlers] = buildReactHotkeysConfiguration(
    taxonomyStore.hotkeys,
  );

  const resizeSideBar = (handleProps: ResizablePanelHandlerProps): void =>
    taxonomyStore.sideBarDisplayState.setSize(
      (handleProps.domElement as HTMLDivElement).getBoundingClientRect().width,
    );

  useEffect(() => {
    taxonomyStore.internalizeDataSpacePath(params);
  }, [taxonomyStore, params]);

  // NOTE: since we internalize the data space path in the route, we should not re-initialize the graph
  // on the second call when we remove path from the route
  useEffect(() => {
    flowResult(taxonomyStore.initialize()).catch(
      applicationStore.alertIllegalUnhandledError,
    );
  }, [applicationStore, taxonomyStore]);

  return (
    <div className="app__page">
      <AppHeader>
        <LegendTaxonomyAppHeaderMenu />
      </AppHeader>
      <div className="app__content">
        <PanelLoadingIndicator
          isLoading={taxonomyStore.initState.isInProgress}
        />
        <div className="taxonomy-viewer">
          <GlobalHotKeys
            keyMap={hotkeyMapping}
            handlers={hotkeyHandlers}
            allowChanges={true}
          >
            <div className="taxonomy-viewer__body">
              <TaxonomyViewerActivityBar />
              <div className="taxonomy-viewer__content-container">
                <div
                  className={clsx('taxonomy-viewer__content', {
                    'taxonomy-viewer__content--expanded':
                      taxonomyStore.isInExpandedMode,
                  })}
                >
                  <ResizablePanelGroup orientation="vertical">
                    <ResizablePanel
                      {...getControlledResizablePanelProps(
                        taxonomyStore.sideBarDisplayState.size === 0,
                        {
                          onStopResize: resizeSideBar,
                        },
                      )}
                      direction={1}
                      size={taxonomyStore.sideBarDisplayState.size}
                    >
                      <TaxonomyViewerSideBar />
                    </ResizablePanel>
                    <ResizablePanelSplitter />
                    <ResizablePanel minSize={300}>
                      {taxonomyStore.currentTaxonomyNodeViewerState ? (
                        <TaxonomyViewerMainPanel
                          taxonomyViewerState={
                            taxonomyStore.currentTaxonomyNodeViewerState
                          }
                        />
                      ) : (
                        <TaxonomyViewerSplashScreen />
                      )}
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </div>
              </div>
            </div>
            <TaxonomyViewerStatusBar />
            <TaxonomySearchCommand />
          </GlobalHotKeys>
        </div>
      </div>
    </div>
  );
});
