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
import { DataCubeIcon, Draggable, Resizable, cn } from '@finos/legend-art';
import { DATA_CUBE_EDITOR_TAB } from '../../../stores/dataCube/editor/DataCubeEditorState.js';
import { useEffect, useRef, useState } from 'react';
import { useREPLStore } from '../../REPLStoreProvider.js';
import { DataCubeEditorSortsPanel } from './DataCubeEditorSortsPanel.js';
import { DataCubeEditorGeneralPropertiesPanel } from './DataCubeEditorGeneralPropertiesPanel.js';

const __DATA_CUBE_EDITOR_HEADER_CLASS_NAME = 'data-cube__editor__header';
const PANEL_DEFAULT_OFFSET = 50;
const PANEL_DEFAULT_HEIGHT = 600;
const PANEL_DEFAULT_WIDTH = 800;
const PANEL_DEFALT_MIN_HEIGHT = 300;
const PANEL_DEFAULT_MIN_WIDTH = 300;

export const DataCubeEditor = observer(
  (props: { containerRef: React.RefObject<HTMLDivElement> }) => {
    const { containerRef } = props;
    const [width, setWidth] = useState(PANEL_DEFAULT_WIDTH);
    const [height, setHeight] = useState(PANEL_DEFAULT_HEIGHT);
    const replStore = useREPLStore();
    const panelRef = useRef<HTMLDivElement>(null);
    const editor = replStore.dataCubeState.editor;
    const selectedTab = editor.currentTab;
    const tabs = [
      DATA_CUBE_EDITOR_TAB.COLUMNS,
      DATA_CUBE_EDITOR_TAB.VERTICAL_PIVOTS,
      DATA_CUBE_EDITOR_TAB.HORIZONTAL_PIVOTS,
      DATA_CUBE_EDITOR_TAB.SORTS,
      DATA_CUBE_EDITOR_TAB.EXTENDED_COLUMNS,
      DATA_CUBE_EDITOR_TAB.GENERAL_PROPERTIES,
      DATA_CUBE_EDITOR_TAB.COLUMN_PROPERTIES,
      DATA_CUBE_EDITOR_TAB.CODE,
    ];

    useEffect(() => {
      if (containerRef.current) {
        const { width: containerWidth, height: containerHeight } =
          containerRef.current.getBoundingClientRect();
        setWidth(
          PANEL_DEFAULT_WIDTH + PANEL_DEFAULT_OFFSET * 2 > containerWidth
            ? containerWidth - PANEL_DEFAULT_OFFSET * 2
            : PANEL_DEFAULT_WIDTH,
        );
        setHeight(
          PANEL_DEFAULT_HEIGHT + PANEL_DEFAULT_OFFSET * 2 > containerHeight
            ? containerHeight - PANEL_DEFAULT_OFFSET * 2
            : PANEL_DEFAULT_HEIGHT,
        );
      }
    }, [containerRef]);

    return (
      <Draggable
        bounds="parent"
        nodeRef={panelRef}
        defaultPosition={{ x: PANEL_DEFAULT_OFFSET, y: PANEL_DEFAULT_OFFSET }}
        handle={`.${__DATA_CUBE_EDITOR_HEADER_CLASS_NAME}`}
      >
        <Resizable
          className="absolute z-10"
          width={width}
          height={height}
          onResize={(e, data) => {
            setWidth(data.size.width);
            setHeight(data.size.height);
          }}
          minConstraints={[PANEL_DEFAULT_MIN_WIDTH, PANEL_DEFALT_MIN_HEIGHT]}
          resizeHandles={['se']}
          handle={
            <div className="absolute bottom-0 right-0 flex h-4 w-4 cursor-nwse-resize items-end justify-end">
              <DataCubeIcon.ResizeCornerSE className="text-neutral-500" />
            </div>
          }
        >
          <div
            ref={panelRef}
            style={{ width, height }}
            className="border border-neutral-400 bg-neutral-200 shadow-xl"
          >
            <div
              className={cn(
                __DATA_CUBE_EDITOR_HEADER_CLASS_NAME,
                'flex h-6 w-full select-none items-center justify-between border-b border-b-neutral-300 bg-white',
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
              <div className="absolute top-2 flex h-6 w-[calc(100%_-_16px)] overflow-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={(): void => editor.setCurrentTab(tab)}
                    className={cn(
                      'relative flex h-6 items-center justify-center whitespace-nowrap border border-b-0 border-l-0 border-neutral-300 px-2 first:border-l',
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
                {selectedTab === DATA_CUBE_EDITOR_TAB.SORTS && (
                  <DataCubeEditorSortsPanel />
                )}
                {selectedTab === DATA_CUBE_EDITOR_TAB.GENERAL_PROPERTIES && (
                  <DataCubeEditorGeneralPropertiesPanel />
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
        </Resizable>
      </Draggable>
    );
  },
);
