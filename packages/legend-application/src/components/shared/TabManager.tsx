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
  DropdownMenu,
  MenuContent,
  MenuContentItem,
  PanelEntryDropZonePlaceholder,
  TimesIcon,
  useDragPreviewLayer,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { useRef, useCallback, forwardRef } from 'react';
import { type DropTargetMonitor, useDrop, useDrag } from 'react-dnd';
import type {
  TabManagerState,
  TabState,
} from '../../stores/shared/TabManagerState.js';

type TabStatePanelDragSource = {
  panel: TabState;
};

export const horizontalToVerticalScroll: React.WheelEventHandler = (event) => {
  if (event.deltaY === 0) {
    return;
  }
  event.currentTarget.scrollBy(event.deltaY, 0);
};

const GeneralPanelHeaderTabContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      tabState: TabState;
      managerTabState: TabManagerState;
      headerName: string;
    }
  >(function GeneralPanelHeaderTabContextMenu(props, ref) {
    const { tabState, managerTabState, headerName } = props;
    const close = (): void => managerTabState.closeTab(tabState);
    const closeOthers = (): void => managerTabState.closeAllOtherTabs(tabState);
    const closeAll = (): void => managerTabState.closeAllTabs();

    return (
      <div ref={ref} className={`${headerName}__header__tab__context-menu`}>
        <button
          className={`${headerName}__header__tab__context-menu__item`}
          onClick={close}
        >
          Close
        </button>
        <button
          className={`${headerName}__header__tab__context-menu__item`}
          disabled={managerTabState.tabs.length < 2}
          onClick={closeOthers}
        >
          Close Others
        </button>
        <button
          className={`${headerName}__header__tab__context-menu__item`}
          onClick={closeAll}
        >
          Close All
        </button>
      </div>
    );
  }),
);

export const GeneralTabEditor: React.FC<{
  managerTabState: TabManagerState;
  headerName: string;
  headerTitle?: string;
  DND_TYPE: string;
  tabState: TabState;
  renderHeaderButtonLabel?:
    | ((editorState: TabState) => React.ReactNode)
    | undefined;
  getTabStateHeaderName?: string;
}> = (props) => {
  const ref = useRef<HTMLDivElement>(null);
  const {
    managerTabState,
    headerName,
    headerTitle,
    DND_TYPE,
    tabState,
    renderHeaderButtonLabel,
    getTabStateHeaderName,
  } = props;

  // Drag and Drop
  const handleHover = useCallback(
    (item: TabStatePanelDragSource, monitor: DropTargetMonitor): void => {
      const draggingTab = item.panel;
      const hoveredTab = tabState;

      const dragIndex = managerTabState.tabs.findIndex(
        (e) => e === draggingTab,
      );
      const hoverIndex = managerTabState.tabs.findIndex(
        (e) => e === hoveredTab,
      );

      const hoverBoundingReact = ref.current?.getBoundingClientRect();
      const distanceThreshold =
        ((hoverBoundingReact?.left ?? 0) - (hoverBoundingReact?.right ?? 0)) /
        2;
      const dragDistance =
        (monitor.getClientOffset()?.x ?? 0) - (hoverBoundingReact?.right ?? 0);
      if (dragIndex < hoverIndex && dragDistance < distanceThreshold) {
        return;
      }
      if (dragIndex > hoverIndex && dragDistance > distanceThreshold) {
        return;
      }

      managerTabState.swapTabs(draggingTab, hoveredTab);
    },
    [managerTabState, tabState],
  );

  const closeTabOnMiddleClick =
    (currTab: TabState): React.MouseEventHandler =>
    (event): void => {
      if (event.nativeEvent.button === 1) {
        managerTabState.closeTab(currTab);
      }
    };

  const [{ isBeingDraggedEditorPanel }, dropConnector] = useDrop<
    TabStatePanelDragSource,
    void,
    { isBeingDraggedEditorPanel: TabState | undefined }
  >(
    () => ({
      accept: [DND_TYPE],
      hover: (item, monitor) => handleHover(item, monitor),
      collect: (
        monitor,
      ): {
        isBeingDraggedEditorPanel: TabState | undefined;
      } => ({
        isBeingDraggedEditorPanel:
          monitor.getItem<TabStatePanelDragSource | null>()?.panel,
      }),
    }),
    [handleHover],
  );
  const isBeingDragged = tabState === isBeingDraggedEditorPanel;

  const [, dragConnector, dragPreviewConnector] =
    useDrag<TabStatePanelDragSource>(
      () => ({
        type: DND_TYPE,
        item: () => ({
          panel: tabState,
        }),
      }),
      [tabState, managerTabState],
    );
  dragConnector(dropConnector(ref));
  useDragPreviewLayer(dragPreviewConnector);

  return (
    <div
      ref={ref}
      key={tabState.uuid}
      className={clsx(`${headerName}__header__tab`, {
        [`${headerName}__header__tab--active`]:
          tabState === managerTabState.currentTab,
      })}
      onMouseUp={closeTabOnMiddleClick(tabState)}
    >
      <PanelEntryDropZonePlaceholder
        showPlaceholder={isBeingDragged}
        label={getTabStateHeaderName ?? tabState.headerName}
        className={`${headerName}__header__dnd__placeholder`}
      >
        <ContextMenu
          content={
            <GeneralPanelHeaderTabContextMenu
              tabState={tabState}
              managerTabState={managerTabState}
              headerName={headerName}
            />
          }
          className={`${headerName}__header__tab__content`}
        >
          {renderHeaderButtonLabel && (
            <button
              className={`${headerName}__header__tab__label`}
              tabIndex={-1}
              onClick={() => managerTabState.openTab(tabState)}
              title={headerTitle ?? tabState.headerName}
            >
              {renderHeaderButtonLabel(tabState)}
            </button>
          )}
          <button
            className={`${headerName}__header__tab__close-btn`}
            onClick={() => managerTabState.closeTab(tabState)}
            tabIndex={-1}
            title={'Close'}
          >
            <TimesIcon />
          </button>
        </ContextMenu>
      </PanelEntryDropZonePlaceholder>
    </div>
  );
};

export const GeneralTabDropDown: React.FC<{
  managerTabState: TabManagerState;
  lightMode?: boolean;
}> = (props) => {
  const { managerTabState, lightMode } = props;
  return (
    <DropdownMenu
      title="Open Tabs"
      content={
        <MenuContent
          lightMode={lightMode ?? false}
          className={clsx('general__tab__dropdown')}
        >
          <div
            className={clsx(
              'general__tab__dropdown__description',
              lightMode
                ? 'general__tab__dropdown__description--light'
                : 'general__tab__dropdown__description--dark',
            )}
          >
            Open Tabs
          </div>
          {managerTabState.tabs.map((tabState) => (
            <MenuContentItem
              className={clsx(
                'general__tab__dropdown__item',
                lightMode
                  ? 'general__tab__dropdown__item--light'
                  : 'general__tab__dropdown__item--dark',
              )}
              key={tabState.uuid}
              lightMode={lightMode ?? false}
              onClick={() => managerTabState.openTab(tabState)}
            >
              <div className="general__tab__dropdown__tab">
                {tabState.headerName}
              </div>

              <div
                className={clsx(
                  'general__tab__dropdown__tab__close-btn',
                  lightMode
                    ? 'general__tab__dropdown__tab__close-btn--light'
                    : 'general__tab__dropdown__tab__close-btn--dark',
                )}
                onClick={(event) => {
                  event.stopPropagation();
                  managerTabState.closeTab(tabState);
                }}
                tabIndex={-1}
                title={'Close'}
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
      <div
        className={clsx(
          'general__tab__dropdown__toogle',
          lightMode
            ? 'general__tab__dropdown__toogle--light'
            : 'general__tab__dropdown__toogle--dark',
        )}
      >
        <ChevronDownIcon />
      </div>
    </DropdownMenu>
  );
};
