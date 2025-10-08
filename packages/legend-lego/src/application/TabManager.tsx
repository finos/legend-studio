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
  ChevronDownIcon,
  clsx,
  ContextMenu,
  DragPreviewLayer,
  ControlledDropdownMenu,
  MenuContent,
  MenuContentItem,
  PanelEntryDropZonePlaceholder,
  TimesIcon,
  useDragPreviewLayer,
  MenuContentDivider,
  PushPinIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { useRef, useCallback } from 'react';
import { type DropTargetMonitor, useDrop, useDrag } from 'react-dnd';
import type { TabManagerState, TabState } from './TabManagerState.js';

type TabDragSource = {
  tab: TabState;
};

export const TAB_MANAGER__TAB_TEST_ID = 'tab-manager__tab';

const horizontalToVerticalScroll: React.WheelEventHandler = (event) => {
  // if scrolling is more horizontal than vertical, there's nothing much to do, the OS should handle it just fine
  // else, intercept
  if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
    return;
  }
  event.stopPropagation();
  let deltaX;
  // NOTE: only convert horizontal to vertical scroll when the scroll causes more horizontal than vertical displacement
  // let the direction of `deltaY` be the direction of the scroll, i.e.
  // - if we scroll upward, that translate to a left scroll
  // - if we scroll downward, that translates to a right scroll
  if (event.deltaY === 0) {
    deltaX = event.deltaY;
  } else if (event.deltaY < 0) {
    deltaX = -Math.abs(event.deltaY);
  } else {
    deltaX = Math.abs(event.deltaY);
  }
  event.currentTarget.scrollBy(deltaX, 0);
};

const TabContextMenu = observer(
  (props: {
    tabState: TabState;
    managerTabState: TabManagerState;
    renderExtraMenuItems?:
      | ((
          tabState: TabState,
          managerTabState: TabManagerState,
        ) => React.ReactNode)
      | undefined;
  }) => {
    const { tabState, managerTabState, renderExtraMenuItems } = props;
    const close = (): void => managerTabState.closeTab(tabState);
    const closeOthers = (): void => managerTabState.closeAllOtherTabs(tabState);
    const closeAll = (): void => managerTabState.closeAllTabs();
    const togglePin = () => {
      if (tabState.isPinned) {
        managerTabState.unpinTab(tabState);
      } else {
        managerTabState.pinTab(tabState);
      }
    };

    const extra = renderExtraMenuItems?.(tabState, managerTabState);

    return (
      <MenuContent>
        <MenuContentItem onClick={close}>Close</MenuContentItem>
        <MenuContentItem
          disabled={managerTabState.tabs.length < 2}
          onClick={closeOthers}
        >
          Close Others
        </MenuContentItem>
        <MenuContentItem onClick={closeAll}>Close All</MenuContentItem>
        <MenuContentDivider />
        <MenuContentItem onClick={togglePin}>
          {tabState.isPinned ? 'Unpin' : 'Pin'}
        </MenuContentItem>
        {extra ? (
          <>
            <MenuContentDivider />
            {extra}
          </>
        ) : null}
      </MenuContent>
    );
  },
);

const Tab = observer(
  (props: {
    tabState: TabState;
    tabManagerState: TabManagerState;
    tabRenderer?: ((editorState: TabState) => React.ReactNode) | undefined;
    renderExtraTabMenuItems?:
      | ((
          tabState: TabState,
          managerTabState: TabManagerState,
        ) => React.ReactNode)
      | undefined;
    onExternalTabDrop?: ((tab: TabState, index?: number) => void) | undefined;
    canAcceptExternalTab?: ((tab: TabState) => boolean) | undefined;
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    const {
      tabManagerState,
      tabState,
      tabRenderer,
      renderExtraTabMenuItems,
      onExternalTabDrop,
      canAcceptExternalTab,
    } = props;

    // Drag and Drop
    const handleHover = useCallback(
      (item: TabDragSource, monitor: DropTargetMonitor): void => {
        const draggingTab = item.tab;
        const hoveredTab = tabState;

        const dragIndex = tabManagerState.tabs.findIndex(
          (e) => e === draggingTab,
        );
        const hoverIndex = tabManagerState.tabs.findIndex(
          (e) => e === hoveredTab,
        );

        const hoverBoundingReact = ref.current?.getBoundingClientRect();
        const distanceThreshold =
          ((hoverBoundingReact?.left ?? 0) - (hoverBoundingReact?.right ?? 0)) /
          2;
        const dragDistance =
          (monitor.getClientOffset()?.x ?? 0) -
          (hoverBoundingReact?.right ?? 0);
        if (dragIndex < hoverIndex && dragDistance < distanceThreshold) {
          return;
        }
        if (dragIndex > hoverIndex && dragDistance > distanceThreshold) {
          return;
        }

        tabManagerState.swapTabs(draggingTab, hoveredTab);
      },
      [tabManagerState, tabState],
    );

    const closeTabOnMiddleClick =
      (currTab: TabState): React.MouseEventHandler =>
      (event): void => {
        if (event.nativeEvent.button === 1) {
          tabManagerState.closeTab(currTab);
        }
      };

    const [{ isBeingDraggedEditorPanel }, dropConnector] = useDrop<
      TabDragSource,
      void,
      { isBeingDraggedEditorPanel: TabState | undefined }
    >(
      () => ({
        accept: [tabManagerState.dndType],
        hover: (item, monitor) => handleHover(item, monitor),
        drop: (item, monitor) => {
          const draggingTab = item.tab;
          const isInternal = tabManagerState.tabs.includes(draggingTab);
          if (isInternal) {
            // Intra-strip drops are handled by reordering on hover; no action.
            return;
          }
          if (canAcceptExternalTab && !canAcceptExternalTab(draggingTab)) {
            return;
          }

          const hoverIndex = tabManagerState.tabs.findIndex(
            (e) => e === tabState,
          );
          const hoverBoundingReact = ref.current?.getBoundingClientRect();
          const midpoint =
            ((hoverBoundingReact?.left ?? 0) +
              (hoverBoundingReact?.right ?? 0)) /
            2;
          const clientX = monitor.getClientOffset()?.x ?? 0;
          const insertIndex = clientX < midpoint ? hoverIndex : hoverIndex + 1;
          onExternalTabDrop?.(draggingTab, insertIndex);
        },
        collect: (
          monitor,
        ): {
          isBeingDraggedEditorPanel: TabState | undefined;
        } => ({
          isBeingDraggedEditorPanel: monitor.getItem<TabDragSource | null>()
            ?.tab,
        }),
      }),
      [
        handleHover,
        tabManagerState,
        tabState,
        onExternalTabDrop,
        canAcceptExternalTab,
      ],
    );
    const isBeingDragged = tabState === isBeingDraggedEditorPanel;

    const [, dragConnector, dragPreviewConnector] = useDrag<TabDragSource>(
      () => ({
        type: tabManagerState.dndType,
        item: () => ({
          tab: tabState,
        }),
      }),
      [tabState, tabManagerState],
    );
    dragConnector(dropConnector(ref));
    useDragPreviewLayer(dragPreviewConnector);

    return (
      <div
        ref={ref}
        data-testid={TAB_MANAGER__TAB_TEST_ID}
        className={clsx('tab-manager__tab', {
          'tab-manager__tab--active': tabState === tabManagerState.currentTab,
          'tab-manager__tab--dragged': isBeingDragged,
        })}
        onMouseUp={closeTabOnMiddleClick(tabState)}
      >
        <PanelEntryDropZonePlaceholder
          isDragOver={false}
          className="tab-manager__tab__dnd__placeholder"
        >
          <ContextMenu
            content={
              <TabContextMenu
                tabState={tabState}
                managerTabState={tabManagerState}
                renderExtraMenuItems={renderExtraTabMenuItems}
              />
            }
            className="tab-manager__tab__content"
          >
            <button
              className="tab-manager__tab__label"
              tabIndex={-1}
              onClick={() => tabManagerState.openTab(tabState)}
              title={tabState.description}
            >
              {tabRenderer?.(tabState) ?? tabState.label}
            </button>
            {tabState.isPinned && (
              <button
                className="tab-manager__tab__pin-btn"
                onClick={() => tabManagerState.unpinTab(tabState)}
                tabIndex={-1}
                title="Unpin"
              >
                <PushPinIcon />
              </button>
            )}
            {!tabState.isPinned && (
              <button
                className="tab-manager__tab__close-btn"
                onClick={() => tabManagerState.closeTab(tabState)}
                tabIndex={-1}
                title="Close"
              >
                <TimesIcon />
              </button>
            )}
          </ContextMenu>
        </PanelEntryDropZonePlaceholder>
      </div>
    );
  },
);

const TabMenu = observer((props: { managerTabState: TabManagerState }) => {
  const { managerTabState } = props;
  return (
    <ControlledDropdownMenu
      className="tab-manager__menu__toggler"
      title="Show All Tabs"
      content={
        <MenuContent className="tab-manager__menu">
          {managerTabState.tabs.map((tabState) => (
            <MenuContentItem
              key={tabState.uuid}
              className={clsx('tab-manager__menu__item', {
                'tab-manager__menu__item--active':
                  tabState === managerTabState.currentTab,
              })}
              onClick={() => managerTabState.openTab(tabState)}
            >
              <div className="tab-manager__menu__item__label">
                {tabState.label}
              </div>
              <div
                className="tab-manager__menu__item__close-btn"
                onClick={(event) => {
                  // NOTE: prevent default action of dropdown menu
                  event.stopPropagation();
                  managerTabState.closeTab(tabState);
                }}
                tabIndex={-1}
                title="Close"
              >
                <TimesIcon />
              </div>
            </MenuContentItem>
          ))}
        </MenuContent>
      }
      menuProps={{
        anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
        transformOrigin: { vertical: 'top', horizontal: 'right' },
      }}
    >
      <ChevronDownIcon />
    </ControlledDropdownMenu>
  );
});

export const TabManager = observer(
  (props: {
    tabManagerState: TabManagerState;
    tabRenderer?: ((editorState: TabState) => React.ReactNode) | undefined;
    renderExtraTabMenuItems?:
      | ((
          tabState: TabState,
          managerTabState: TabManagerState,
        ) => React.ReactNode)
      | undefined;
    onExternalTabDrop?: ((tab: TabState, index?: number) => void) | undefined;
    canAcceptExternalTab?: ((tab: TabState) => boolean) | undefined;
  }) => {
    const {
      tabManagerState,
      tabRenderer,
      renderExtraTabMenuItems,
      onExternalTabDrop,
      canAcceptExternalTab,
    } = props;

    // Make the strip itself a drop target for appending external tabs
    const contentRef = useRef<HTMLDivElement>(null);
    const [, contentDropConnector] = useDrop<TabDragSource, void, unknown>(
      () => ({
        accept: [tabManagerState.dndType],
        drop: (item) => {
          const isInternal = tabManagerState.tabs.includes(item.tab);
          if (isInternal) {
            return;
          }
          if (canAcceptExternalTab && !canAcceptExternalTab(item.tab)) {
            return;
          }
          onExternalTabDrop?.(item.tab, tabManagerState.tabs.length);
        },
      }),
      [tabManagerState, onExternalTabDrop, canAcceptExternalTab],
    );

    return (
      <div className="tab-manager">
        <div
          className="tab-manager__content"
          onWheel={horizontalToVerticalScroll}
          ref={(el) => {
            contentRef.current = el;
            contentDropConnector(el);
          }}
        >
          {tabManagerState.tabs.map((tab) => (
            <Tab
              key={tab.uuid}
              tabState={tab}
              tabManagerState={tabManagerState}
              tabRenderer={tabRenderer}
              renderExtraTabMenuItems={renderExtraTabMenuItems}
              // enable external drop on a particular tab position
              // handled inside Tab via drop callback
              // eslint-disable-next-line react/jsx-no-undef
              onExternalTabDrop={onExternalTabDrop}
              canAcceptExternalTab={canAcceptExternalTab}
            />
          ))}
          <DragPreviewLayer
            labelGetter={(item: TabDragSource): string => item.tab.label}
            types={[tabManagerState.dndType]}
          />
        </div>
        <TabMenu managerTabState={tabManagerState} />
      </div>
    );
  },
);
