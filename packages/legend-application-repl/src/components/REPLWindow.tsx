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

import { useState } from 'react';
import { DataCubeIcon, ResizableAndDraggableBox, cn } from '@finos/legend-art';

const WINDOW_DEFAULT_OFFSET = 50;
const WINDOW_DEFAULT_WIDTH = 800;
const WINDOW_DEFAULT_HEIGHT = 600;
const WINDOW_DEFAULT_MIN_WIDTH = 300;
const WINDOW_DEFAULT_MIN_HEIGHT = 300;

export type REPLWindowConfig = {
  title: string;
  uuid: string;

  x?: number | undefined;
  y?: number | undefined;
  width?: number | undefined;
  height?: number | undefined;
  minWidth?: number | undefined;
  minHeight?: number | undefined;
  center?: boolean | undefined;
};

export const REPLWindow = (props: {
  containerRef: React.RefObject<HTMLDivElement>;
  children: React.ReactNode;
  config: REPLWindowConfig;
  onClose: () => void;
}) => {
  const { containerRef, children, onClose, config } = props;

  const [windowSpec, setWindowSpec] = useState(() => {
    const x = config.x ?? WINDOW_DEFAULT_OFFSET;
    const y = config.y ?? WINDOW_DEFAULT_OFFSET;
    const width = config.width ?? WINDOW_DEFAULT_WIDTH;
    const height = config.height ?? WINDOW_DEFAULT_HEIGHT;

    if (containerRef.current) {
      const { width: containerWidth, height: containerHeight } =
        containerRef.current.getBoundingClientRect();

      if (config.center) {
        const finalWidth =
          width + WINDOW_DEFAULT_OFFSET * 2 > containerWidth
            ? containerWidth - WINDOW_DEFAULT_OFFSET * 2
            : width;
        const finalHeight =
          height + WINDOW_DEFAULT_OFFSET * 2 > containerHeight
            ? containerHeight - WINDOW_DEFAULT_OFFSET * 2
            : height;
        return {
          x: (containerWidth - finalWidth) / 2,
          y: (containerHeight - finalHeight) / 2,
          width: finalWidth,
          height: finalHeight,
        };
      }

      return {
        x,
        y,
        width:
          width + x + WINDOW_DEFAULT_OFFSET > containerWidth
            ? containerWidth - x - WINDOW_DEFAULT_OFFSET
            : width,
        height:
          height + y + WINDOW_DEFAULT_OFFSET > containerHeight
            ? containerHeight - y - WINDOW_DEFAULT_OFFSET
            : height,
      };
    }

    return {
      x,
      y,
      width,
      height,
    };
  });

  return (
    <ResizableAndDraggableBox
      className="absolute z-10"
      handle={`.data-cube__window-${config.uuid}`}
      position={{ x: windowSpec.x, y: windowSpec.y }}
      size={{ width: windowSpec.width, height: windowSpec.height }}
      minWidth={config.minWidth ?? WINDOW_DEFAULT_MIN_WIDTH}
      minHeight={config.minHeight ?? WINDOW_DEFAULT_MIN_HEIGHT}
      onDragStop={(event, data) => {
        setWindowSpec({ ...windowSpec, x: data.x, y: data.y });
      }}
      dragHandleClassName={`data-cube__window-${config.uuid}`}
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
            `data-cube__window-${config.uuid}`,
            'flex h-6 w-full select-none items-center justify-between border-b border-b-neutral-300 bg-white active:cursor-move',
          )}
        >
          <div className="px-2">{config.title}</div>
          <button
            className="flex h-[23px] w-6 items-center justify-center hover:bg-red-500 hover:text-white"
            onClick={onClose}
          >
            <DataCubeIcon.X />
          </button>
        </div>
        <div className="h-[calc(100%_-_24px)] w-full">{children}</div>
      </div>
    </ResizableAndDraggableBox>
  );
};
