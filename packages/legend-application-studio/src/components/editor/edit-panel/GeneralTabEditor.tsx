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
  useDragPreviewLayer,
  clsx,
  PanelEntryDropZonePlaceholder,
  ContextMenu,
  TimesIcon,
  FlaskIcon,
  PlayIcon,
} from '@finos/legend-art';
import { swapEntry, toSentenceCase } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { useRef, useCallback } from 'react';
import { type DropTargetMonitor, useDrop, useDrag } from 'react-dnd';
import type { EditorState } from '../../../stores/editor-state/EditorState.js';
import { ElementEditorState } from '../../../stores/editor-state/element-editor-state/ElementEditorState.js';
import {
  getMappingElementLabel,
  getMappingElementTarget,
  getMappingElementType,
} from '../../../stores/editor-state/element-editor-state/mapping/MappingEditorState.js';
import { MappingElementState } from '../../../stores/editor-state/element-editor-state/mapping/MappingElementState.js';
import { MappingExecutionState } from '../../../stores/editor-state/element-editor-state/mapping/MappingExecutionState.js';
import { MappingTestState } from '../../../stores/editor-state/element-editor-state/mapping/MappingTestState.js';
import { EntityDiffViewState } from '../../../stores/editor-state/entity-diff-editor-state/EntityDiffViewState.js';
import { useEditorStore } from '../EditorStoreProvider.js';
import { getMappingElementTargetIcon } from './mapping-editor/MappingEditor.js';

export const GeneralTabEditor = observer(
  (props: {
    //todo: remove anys and switch general state
    generalEditorState: EditorState;
    generalOpenedTabStates: any;
    DND_TYPE_NAME: string;
    currentEditorState: EditorState;
    placeholderContent: React.ReactNode;
    closeTab: any;
    openTab: any;
    closeTabOnMiddleClick: any;
    EditPanelHeaderTabContextMenu: React.ReactNode;
    nameOfTabType?: string;
    renderHeaderLabel?: (generalEditorState: EditorState) => React.ReactNode;
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    const {
      generalEditorState,
      placeholderContent,
      currentEditorState,
      DND_TYPE_NAME,
      generalOpenedTabStates,
      nameOfTabType,
      closeTab,
      openTab,
      closeTabOnMiddleClick,
      renderHeaderLabel,
      EditPanelHeaderTabContextMenu,
    } = props;

    type GeneralPanelDragSource = {
      panel: typeof generalEditorState;
    };
    const editorStore = useEditorStore();

    // Drag and Drop
    const handleHover = useCallback(
      (item: GeneralPanelDragSource, monitor: DropTargetMonitor): void => {
        const draggingTab = item.panel;
        const hoveredTab = generalEditorState;

        const dragIndex = generalOpenedTabStates.findIndex(
          (e: EditorState) => e === draggingTab,
        );
        const hoverIndex = generalOpenedTabStates.findIndex(
          (e: EditorState) => e === hoveredTab,
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

        if (renderHeaderLabel) {
          editorStore.swapTabs(draggingTab, hoveredTab);
        } else {
          //Todo: change swapping allow swapMappingTabs for action
          swapEntry(generalOpenedTabStates, draggingTab, hoveredTab);
        }
      },
      [
        editorStore,
        generalEditorState,
        generalOpenedTabStates,
        renderHeaderLabel,
      ],
    );

    const [{ isBeingDraggedEditorPanel }, dropConnector] = useDrop<
      GeneralPanelDragSource,
      void,
      { isBeingDraggedEditorPanel: EditorState | undefined }
    >(
      () => ({
        accept: [DND_TYPE_NAME],
        hover: (item, monitor) => handleHover(item, monitor),
        collect: (
          monitor,
        ): {
          isBeingDraggedEditorPanel: EditorState | undefined;
        } => ({
          isBeingDraggedEditorPanel:
            monitor.getItem<GeneralPanelDragSource | null>()?.panel,
        }),
      }),
      [handleHover],
    );
    const isBeingDragged = generalEditorState === isBeingDraggedEditorPanel;

    const [, dragConnector, dragPreviewConnector] =
      useDrag<GeneralPanelDragSource>(
        () => ({
          type: DND_TYPE_NAME,
          item: () => ({
            panel: generalEditorState,
          }),
        }),
        [generalEditorState],
      );
    dragConnector(dropConnector(ref));
    useDragPreviewLayer(dragPreviewConnector);

    return (
      <div
        ref={ref}
        key={generalEditorState.uuid}
        className={clsx(`${nameOfTabType}__header__tab`, {
          [`${nameOfTabType}__header__tab--active`]:
            generalEditorState === currentEditorState,
        })}
        onMouseUp={closeTabOnMiddleClick(generalEditorState)}
      >
        <PanelEntryDropZonePlaceholder
          showPlaceholder={isBeingDragged}
          placeholderContent={placeholderContent}
          className={`${nameOfTabType}__header__dnd__placeholder`}
        >
          <ContextMenu
            content={EditPanelHeaderTabContextMenu}
            className={`${nameOfTabType}__header__tab__content`}
          >
            {
              <>
                {generalEditorState instanceof MappingTestState && (
                  <>
                    <FlaskIcon className="mapping-editor__header__tab__icon--test" />
                    <button
                      className="mapping-editor__header__tab__element__name"
                      tabIndex={-1}
                      onClick={openTab(generalEditorState)}
                    >
                      {generalEditorState.test.name}
                    </button>
                  </>
                )}
                {generalEditorState instanceof MappingElementState && (
                  <>
                    <div
                      className={`mapping-editor__header__tab__element__type icon color--${getMappingElementType(
                        generalEditorState.mappingElement,
                      ).toLowerCase()}`}
                    >
                      {getMappingElementTargetIcon(
                        generalEditorState.mappingElement,
                      )}
                    </div>
                    <button
                      className="mapping-editor__header__tab__element__name"
                      tabIndex={-1}
                      onClick={openTab(generalEditorState)}
                      title={`${toSentenceCase(
                        getMappingElementType(
                          generalEditorState.mappingElement,
                        ),
                      ).toLowerCase()} mapping '${
                        generalEditorState.mappingElement.id.value
                      }' for '${
                        getMappingElementTarget(
                          generalEditorState.mappingElement,
                        ).name
                      }'`}
                    >
                      {
                        getMappingElementLabel(
                          generalEditorState.mappingElement,
                          editorStore,
                        ).value
                      }
                    </button>
                  </>
                )}
                {generalEditorState instanceof MappingExecutionState && (
                  <>
                    <PlayIcon className="mapping-editor__header__tab__icon--execution" />
                    <button
                      className="mapping-editor__header__tab__element__name"
                      tabIndex={-1}
                      onClick={openTab(generalEditorState)}
                    >
                      {generalEditorState.name}
                    </button>
                  </>
                )}
              </>
            }

            {renderHeaderLabel && (
              <button
                className="edit-panel__header__tab__label"
                tabIndex={-1}
                onClick={openTab(generalEditorState)}
                title={
                  generalEditorState instanceof ElementEditorState
                    ? generalEditorState.element.path
                    : generalEditorState instanceof EntityDiffViewState
                    ? generalEditorState.headerTooltip
                    : generalEditorState.headerName
                }
              >
                {renderHeaderLabel(generalEditorState)}
              </button>
            )}

            <button
              className={`${nameOfTabType}__header__tab__close-btn`}
              onClick={closeTab(generalEditorState)}
              tabIndex={-1}
              title={'Close'}
            >
              <TimesIcon />
            </button>
          </ContextMenu>
        </PanelEntryDropZonePlaceholder>
      </div>
    );
  },
);
