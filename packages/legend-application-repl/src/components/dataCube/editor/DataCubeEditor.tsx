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

import { observer } from 'mobx-react-lite';
import { DataCubeIcon, ResizableAndDraggableBox, cn } from '@finos/legend-art';
import { DATA_CUBE_EDITOR_TAB } from '../../../stores/dataCube/editor/DataCubeEditorState.js';
import { useEffect, useState } from 'react';
import { useREPLStore } from '../../REPLStoreProvider.js';
import { DataCubeEditorSortsPanel } from './DataCubeEditorSortsPanel.js';
import { DataCubeEditorGeneralPropertiesPanel } from './DataCubeEditorGeneralPropertiesPanel.js';
import { DataCubeEditorColumnsPanel } from './DataCubeEditorColumnsPanel.js';
import { DataCubeEditorVPivotsPanel } from './DataCubeEditorVPivotsPanel.js';
import { DataCubeEditorHPivotsPanel } from './DataCubeEditorHPivotsPanel.js';
import { DataCubeEditorFilterPanel } from './DataCubeEditorFilterPanel.js';
import { DataCubeEditorExtendedColumnsPanel } from './DataCubeEditorExtendedColumnsPanel.js';
import { DataCubeEditorCodePanel } from './DataCubeEditorCodePanel.js';
import { DataCubeEditorColumnPropertiesPanel } from './DataCubeEditorColumnPropertiesPanel.js';
import { DataCubeEditorDeveloperPanel } from './DataCubeEditorDeveloperPanel.js';

const __DATA_CUBE_EDITOR_HEADER_CLASS_NAME = 'data-cube__editor__header';
const PANEL_DEFAULT_OFFSET = 50;
const PANEL_DEFAULT_HEIGHT = 600;
const PANEL_DEFAULT_WIDTH = 800;
const PANEL_DEFALT_MIN_HEIGHT = 300;
const PANEL_DEFAULT_MIN_WIDTH = 300;

export const DataCubeEditor = observer(
  (props: { containerRef: React.RefObject<HTMLDivElement> }) => {
    const { containerRef } = props;
    const [windowSpec, setWindowSpec] = useState({
      x: PANEL_DEFAULT_OFFSET,
      y: PANEL_DEFAULT_OFFSET,
      width: PANEL_DEFAULT_WIDTH,
      height: PANEL_DEFAULT_HEIGHT,
    });
    const replStore = useREPLStore();
    const editor = replStore.dataCube.editor;
    const selectedTab = editor.currentTab;
    const tabs = [
      DATA_CUBE_EDITOR_TAB.GENERAL_PROPERTIES,
      DATA_CUBE_EDITOR_TAB.FILTER,
      DATA_CUBE_EDITOR_TAB.EXTENDED_COLUMNS,
      DATA_CUBE_EDITOR_TAB.COLUMNS,
      DATA_CUBE_EDITOR_TAB.COLUMN_PROPERTIES,
      DATA_CUBE_EDITOR_TAB.VERTICAL_PIVOTS,
      DATA_CUBE_EDITOR_TAB.HORIZONTAL_PIVOTS,
      DATA_CUBE_EDITOR_TAB.SORTS,
      DATA_CUBE_EDITOR_TAB.CODE,
      DATA_CUBE_EDITOR_TAB.DEVELOPER,
    ];

    useEffect(() => {
      if (containerRef.current) {
        const { width: containerWidth, height: containerHeight } =
          containerRef.current.getBoundingClientRect();
        setWindowSpec({
          x: PANEL_DEFAULT_OFFSET,
          y: PANEL_DEFAULT_OFFSET,
          width:
            PANEL_DEFAULT_WIDTH + PANEL_DEFAULT_OFFSET * 2 > containerWidth
              ? containerWidth - PANEL_DEFAULT_OFFSET * 2
              : PANEL_DEFAULT_WIDTH,
          height:
            PANEL_DEFAULT_HEIGHT + PANEL_DEFAULT_OFFSET * 2 > containerHeight
              ? containerHeight - PANEL_DEFAULT_OFFSET * 2
              : PANEL_DEFAULT_HEIGHT,
        });
      }
    }, [containerRef]);

    return (
      <ResizableAndDraggableBox
        className="absolute z-10"
        handle={`.${__DATA_CUBE_EDITOR_HEADER_CLASS_NAME}`}
        position={{ x: windowSpec.x, y: windowSpec.y }}
        size={{ width: windowSpec.width, height: windowSpec.height }}
        minWidth={PANEL_DEFAULT_MIN_WIDTH}
        minHeight={PANEL_DEFALT_MIN_HEIGHT}
        onDragStop={(event, data) => {
          setWindowSpec({ ...windowSpec, x: data.x, y: data.y });
        }}
        dragHandleClassName={__DATA_CUBE_EDITOR_HEADER_CLASS_NAME}
        onResize={(event, direction, ref, delta, position) => {
          setWindowSpec({
            ...position,
            width: ref.offsetWidth,
            height: ref.offsetHeight,
          });
        }}
        enableResizing={{
          top: true,
          right: true,
          bottom: true,
          left: true,
          topRight: true,
          bottomRight: true,
          bottomLeft: true,
          topLeft: true,
        }}
        resizeHandleStyles={{
          top: { cursor: 'ns-resize' },
          right: { cursor: 'ew-resize' },
          bottom: { cursor: 'ns-resize' },
          left: { cursor: 'ew-resize' },
          topRight: {
            cursor: 'nesw-resize',
            width: 14,
            height: 14,
            top: -7,
            right: -7,
          },
          bottomRight: {
            cursor: 'nwse-resize',
            width: 14,
            height: 14,
            bottom: -7,
            right: -7,
          },
          bottomLeft: {
            cursor: 'nesw-resize',
            width: 14,
            height: 14,
            bottom: -7,
            left: -7,
          },
          topLeft: {
            cursor: 'nwse-resize',
            width: 14,
            height: 14,
            top: -7,
            left: -7,
          },
        }}
      >
        <div className="h-full w-full border border-neutral-400 bg-neutral-200 shadow-xl">
          <div
            className={cn(
              __DATA_CUBE_EDITOR_HEADER_CLASS_NAME,
              'flex h-6 w-full select-none items-center justify-between border-b border-b-neutral-300 bg-white active:cursor-move',
            )}
          >
            <div className="px-2">Properties</div>
            <button
              className="flex h-[23px] w-6 items-center justify-center hover:bg-red-500 hover:text-white"
              onClick={() => editor.closePanel()}
            >
              <DataCubeIcon.X />
            </button>
          </div>
          <div className="relative h-[calc(100%_-_64px)] flex-1 px-2 pt-8">
            <div className="absolute top-0 flex h-9 w-[calc(100%_-_16px)] min-w-[400px] overflow-auto pt-2">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={(): void => editor.setCurrentTab(tab)}
                  className={cn(
                    'relative flex h-6 items-center justify-center whitespace-nowrap border border-b-0 border-l-0 border-neutral-300 px-2 first:border-l focus:z-10',
                    {
                      '-top-0.5 h-[27px] border-b-0 bg-white':
                        tab === selectedTab,
                    },
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="h-full w-full overflow-auto border border-neutral-300 bg-white">
              {selectedTab === DATA_CUBE_EDITOR_TAB.COLUMNS && (
                <DataCubeEditorColumnsPanel />
              )}
              {selectedTab === DATA_CUBE_EDITOR_TAB.SORTS && (
                <DataCubeEditorSortsPanel />
              )}
              {selectedTab === DATA_CUBE_EDITOR_TAB.VERTICAL_PIVOTS && (
                <DataCubeEditorVPivotsPanel />
              )}
              {selectedTab === DATA_CUBE_EDITOR_TAB.HORIZONTAL_PIVOTS && (
                <DataCubeEditorHPivotsPanel />
              )}
              {selectedTab === DATA_CUBE_EDITOR_TAB.EXTENDED_COLUMNS && (
                <DataCubeEditorExtendedColumnsPanel />
              )}
              {selectedTab === DATA_CUBE_EDITOR_TAB.FILTER && (
                <DataCubeEditorFilterPanel />
              )}
              {selectedTab === DATA_CUBE_EDITOR_TAB.GENERAL_PROPERTIES && (
                <DataCubeEditorGeneralPropertiesPanel />
              )}
              {selectedTab === DATA_CUBE_EDITOR_TAB.COLUMN_PROPERTIES && (
                <DataCubeEditorColumnPropertiesPanel />
              )}
              {selectedTab === DATA_CUBE_EDITOR_TAB.CODE && (
                <DataCubeEditorCodePanel />
              )}
              {selectedTab === DATA_CUBE_EDITOR_TAB.DEVELOPER && (
                <DataCubeEditorDeveloperPanel />
              )}
            </div>
          </div>
          <div className="flex h-10 items-center justify-end px-2">
            <button
              className="h-6 w-20 border border-neutral-400 bg-neutral-300 px-2 hover:brightness-95"
              onClick={(): void => {
                editor.applyChanges();
                editor.closePanel();
              }}
            >
              OK
            </button>
            <button
              className="ml-2 h-6 w-20 border border-neutral-400 bg-neutral-300 px-2 hover:brightness-95"
              onClick={() => editor.closePanel()}
            >
              Cancel
            </button>
            <button
              className="ml-2 h-6 w-20 border border-neutral-400 bg-neutral-300 px-2 hover:brightness-95"
              onClick={() => editor.applyChanges()}
            >
              Apply
            </button>
          </div>
        </div>
      </ResizableAndDraggableBox>
    );
  },
);
