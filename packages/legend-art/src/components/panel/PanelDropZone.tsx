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

import { clsx } from 'clsx';
import { useEffect } from 'react';
import {
  type ConnectDropTarget,
  type ConnectDragPreview,
  useDragLayer,
} from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { VerticalDragHandleIcon } from '../CJS__Icon.cjs';

export const PanelDropZone: React.FC<{
  children: React.ReactNode;
  isDragOver: boolean;
  dropTargetConnector: ConnectDropTarget;
}> = (props) => {
  const { children, isDragOver, dropTargetConnector } = props;
  return (
    <div className="dnd__dropzone" ref={dropTargetConnector}>
      {isDragOver && <div className="panel__dnd__dropzone__overlay" />}
      <div className="panel__dnd__dropzone__content">{children}</div>
    </div>
  );
};

export const PanelEntryDragHandle: React.FC = () => (
  <div className="dnd__entry-drag-handle">
    <VerticalDragHandleIcon />
  </div>
);

export const PanelEntryDropZonePlaceholder: React.FC<{
  children: React.ReactNode;
  showPlaceholder: boolean;
  className?: string;
  label?: string;
}> = (props) => {
  const { children, showPlaceholder, className, label } = props;
  if (!showPlaceholder) {
    return <>{children}</>;
  }
  return (
    <div className={clsx(['dnd__entry-dropzone__placeholder', className])}>
      <div className="dnd__entry-dropzone__placeholder__content">
        {label && (
          <div className="dnd__entry-dropzone__placeholder__label">{label}</div>
        )}
      </div>
    </div>
  );
};

export const useDragPreviewLayer = (
  dragPreviewConnector: ConnectDragPreview,
): void => {
  // hide default HTML5 preview image
  useEffect(() => {
    dragPreviewConnector(getEmptyImage());
  }, [dragPreviewConnector]);
};

export function DragPreviewLayer<T>(props: {
  labelGetter: (item: T) => string;
  types: string[];
}): JSX.Element | null {
  const { labelGetter, types } = props;
  const { itemType, item, isDragging, currentPosition } = useDragLayer(
    (monitor) => ({
      itemType: monitor.getItemType(),
      item: monitor.getItem<T | null>(),
      isDragging: monitor.isDragging(),
      initialOffset: monitor.getInitialSourceClientOffset(),
      currentPosition: monitor.getClientOffset(),
    }),
  );
  if (
    !isDragging ||
    !item ||
    !itemType ||
    !types.includes(itemType.toString())
  ) {
    return null;
  }
  return (
    <div className="dnd__drag-preview-layer">
      <div
        className="dnd__drag-preview-layer__content"
        style={
          !currentPosition
            ? { display: 'none' }
            : {
                transform: `translate(${currentPosition.x / 10 + 2}rem, ${
                  currentPosition.y / 10 + 1
                }rem)`,
              }
        }
      >
        {labelGetter(item)}
      </div>
    </div>
  );
}
